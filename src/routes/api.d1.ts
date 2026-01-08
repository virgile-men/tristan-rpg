// Routes API pour Cloudflare Workers avec D1
import { Hono } from 'hono';
import { 
  getUserProfile, 
  addMissionEntry, 
  removeMissionEntry, 
  getEntriesForDate, 
  getDayTotalXp, 
  isDateLocked 
} from '../services/xp.d1.service.js';
import { 
  getWeeklyStats, 
  getMonthlyStats, 
  getDailyHistory 
} from '../services/stats.d1.service.js';
import { rewards } from '../config/levels.js';

interface Env {
  DB: D1Database;
}

const api = new Hono<{ Bindings: Env }>();

// ============ PROFIL ============

api.get('/profile', async (c) => {
  const profile = await getUserProfile(c.env.DB);
  return c.json(profile);
});

// ============ CATÉGORIES & MISSIONS ============

api.get('/categories', async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT c.id, c.name, c.color,
           json_group_array(json_object(
             'id', m.id,
             'name', m.name,
             'xp', m.xp,
             'isBonus', CASE WHEN m.is_bonus = 1 THEN json('true') ELSE json('false') END
           )) as missions
    FROM categories c
    LEFT JOIN missions m ON m.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `).all<{ id: string; name: string; color: string; missions: string }>();
  
  const categories = (result.results || []).map(cat => ({
    id: cat.id,
    name: cat.name,
    color: cat.color,
    missions: JSON.parse(cat.missions).filter((m: any) => m.id !== null).map((m: any) => ({
      ...m,
      isBonus: m.isBonus === true || m.isBonus === 'true'
    }))
  }));
  
  return c.json(categories);
});

api.get('/missions', async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT id, category_id as categoryId, name, xp, is_bonus as isBonus
    FROM missions
  `).all<{ id: string; categoryId: string; name: string; xp: number; isBonus: number }>();
  
  const missions = (result.results || []).map(m => ({
    ...m,
    isBonus: m.isBonus === 1
  }));
  
  return c.json(missions);
});

// POST /api/missions - Ajouter une nouvelle mission
api.post('/missions', async (c) => {
  const body = await c.req.json();
  const { categoryId, name, xp, isBonus = false } = body;
  
  if (!categoryId || !name || !xp) {
    return c.json({ error: 'categoryId, name et xp sont requis' }, 400);
  }
  
  // Vérifier que la catégorie existe
  const category = await c.env.DB.prepare('SELECT id FROM categories WHERE id = ?')
    .bind(categoryId)
    .first();
    
  if (!category) {
    return c.json({ error: 'Catégorie inconnue' }, 400);
  }
  
  // Générer un ID unique
  const id = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  
  try {
    await c.env.DB.prepare(
      'INSERT INTO missions (id, category_id, name, xp, is_bonus) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, categoryId, name, xp, isBonus ? 1 : 0).run();
    
    return c.json({ success: true, mission: { id, name, xp, isBonus, categoryId } });
  } catch (error) {
    return c.json({ error: 'Erreur lors de l\'ajout' }, 500);
  }
});

// PUT /api/missions/:id - Modifier une mission
api.put('/missions/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, xp, isBonus } = body;
  
  if (xp === undefined && isBonus === undefined && name === undefined) {
    return c.json({ error: 'name, xp ou isBonus requis' }, 400);
  }
  
  const mission = await c.env.DB.prepare('SELECT * FROM missions WHERE id = ?')
    .bind(id)
    .first<{ id: string; category_id: string; name: string; xp: number; is_bonus: number }>();
    
  if (!mission) {
    return c.json({ error: 'Mission inconnue' }, 404);
  }
  
  try {
    const updates: string[] = [];
    const values: any[] = [];
    
    if (name !== undefined && name.trim()) {
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (xp !== undefined) {
      updates.push('xp = ?');
      values.push(xp);
    }
    if (isBonus !== undefined) {
      updates.push('is_bonus = ?');
      values.push(isBonus ? 1 : 0);
    }
    
    values.push(id);
    
    await c.env.DB.prepare(`UPDATE missions SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
    
    return c.json({ 
      success: true, 
      mission: { 
        id, 
        name: name?.trim() ?? mission.name,
        xp: xp ?? mission.xp,
        isBonus: isBonus ?? (mission.is_bonus === 1),
        categoryId: mission.category_id
      } 
    });
  } catch (error) {
    return c.json({ error: 'Erreur lors de la modification' }, 500);
  }
});

// DELETE /api/missions/:id - Supprimer une mission
api.delete('/missions/:id', async (c) => {
  const id = c.req.param('id');
  
  const mission = await c.env.DB.prepare('SELECT id FROM missions WHERE id = ?')
    .bind(id)
    .first();
    
  if (!mission) {
    return c.json({ error: 'Mission inconnue' }, 404);
  }
  
  try {
    await c.env.DB.prepare('DELETE FROM daily_entries WHERE mission_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM missions WHERE id = ?').bind(id).run();
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Erreur lors de la suppression' }, 500);
  }
});

// ============ ENTRÉES QUOTIDIENNES ============

api.get('/entries/:date', async (c) => {
  const date = c.req.param('date');
  const entries = await getEntriesForDate(c.env.DB, date);
  const totalXp = await getDayTotalXp(c.env.DB, date);
  const locked = isDateLocked(date);
  
  return c.json({ date, entries, totalXp, locked });
});

api.post('/entries', async (c) => {
  const body = await c.req.json();
  const { date, missionId, count = 1 } = body;
  
  if (!date || !missionId) {
    return c.json({ error: 'date et missionId requis' }, 400);
  }
  
  const result = await addMissionEntry(c.env.DB, date, missionId, count);
  
  if (!result.success) {
    return c.json({ error: result.message }, 400);
  }
  
  const profile = await getUserProfile(c.env.DB);
  
  return c.json({ success: true, xpGained: result.xpGained, profile });
});

api.delete('/entries/:date/:missionId', async (c) => {
  const date = c.req.param('date');
  const missionId = c.req.param('missionId');
  
  const result = await removeMissionEntry(c.env.DB, date, missionId);
  
  if (!result.success) {
    return c.json({ error: result.message }, 400);
  }
  
  const profile = await getUserProfile(c.env.DB);
  
  return c.json({ success: true, profile });
});

// ============ STATISTIQUES ============

api.get('/stats/weekly', async (c) => {
  const week = c.req.query('week');
  const stats = await getWeeklyStats(c.env.DB, week);
  return c.json(stats);
});

api.get('/stats/monthly', async (c) => {
  const month = c.req.query('month');
  const stats = await getMonthlyStats(c.env.DB, month);
  return c.json(stats);
});

api.get('/stats/history', async (c) => {
  const days = parseInt(c.req.query('days') || '30');
  const history = await getDailyHistory(c.env.DB, days);
  return c.json(history);
});

// ============ RÉCOMPENSES ============

api.get('/rewards', async (c) => {
  const profile = await getUserProfile(c.env.DB);
  
  const claimed = await c.env.DB.prepare(`
    SELECT level, reward_type, claimed_at 
    FROM rewards_claimed 
    ORDER BY claimed_at DESC
  `).all<{ level: number; reward_type: string; claimed_at: string }>();
  
  return c.json({
    available: profile.rewardsAvailable,
    currentLevel: profile.level,
    rewardTypes: rewards,
    claimed: claimed.results || []
  });
});

api.post('/rewards/claim', async (c) => {
  const body = await c.req.json();
  const { rewardType } = body;
  
  const profile = await getUserProfile(c.env.DB);
  
  if (profile.rewardsAvailable <= 0) {
    return c.json({ error: 'Aucune récompense disponible' }, 400);
  }
  
  const claimedLevels = await c.env.DB.prepare('SELECT level FROM rewards_claimed')
    .all<{ level: number }>();
  const claimedSet = new Set((claimedLevels.results || []).map(r => r.level));
  
  let nextLevel = 1;
  for (let i = 1; i < profile.level; i++) {
    if (!claimedSet.has(i)) {
      nextLevel = i;
      break;
    }
  }
  
  await c.env.DB.prepare('INSERT INTO rewards_claimed (level, reward_type) VALUES (?, ?)')
    .bind(nextLevel, rewardType)
    .run();
  
  const updatedProfile = await getUserProfile(c.env.DB);
  
  return c.json({
    success: true,
    level: nextLevel,
    rewardType,
    remainingRewards: updatedProfile.rewardsAvailable
  });
});

export default api;
