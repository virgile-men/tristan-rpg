import { Hono } from 'hono';
import { categories, categoriesMap, missionsMap } from '../config/missions.js';
import { getUserProfile, addMissionEntry, removeMissionEntry, getEntriesForDate, getDayTotalXp, isDateLocked } from '../services/xp.service.js';
import { getWeeklyStats, getMonthlyStats, getDailyHistory } from '../services/stats.service.js';
import { getDb } from '../services/db.service.js';
import { rewards } from '../config/levels.js';

const api = new Hono();

// ============ PROFIL ============

// GET /api/profile - Récupérer le profil utilisateur
api.get('/profile', (c) => {
  const profile = getUserProfile();
  return c.json(profile);
});

// ============ CATÉGORIES & MISSIONS ============

// GET /api/categories - Liste des catégories avec leurs missions
api.get('/categories', (c) => {
  return c.json(categories);
});

// GET /api/missions - Liste plate de toutes les missions
api.get('/missions', (c) => {
  const missions = Array.from(missionsMap.values());
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
  if (!categoriesMap.has(categoryId)) {
    return c.json({ error: 'Catégorie inconnue' }, 400);
  }
  
  // Générer un ID unique
  const id = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  
  const db = getDb();
  
  try {
    db.prepare(
      'INSERT INTO missions (id, category_id, name, xp, is_bonus) VALUES (?, ?, ?, ?, ?)'
    ).run(id, categoryId, name, xp, isBonus ? 1 : 0);
    
    // Mettre à jour le cache en mémoire
    const newMission = { id, name, xp, isBonus, categoryId };
    missionsMap.set(id, newMission);
    
    const category = categoriesMap.get(categoryId);
    if (category) {
      category.missions.push({ id, name, xp, isBonus });
    }
    
    return c.json({ success: true, mission: newMission });
  } catch (error) {
    return c.json({ error: 'Erreur lors de l\'ajout' }, 500);
  }
});

// PUT /api/missions/:id - Modifier une mission (nom, XP, bonus)
api.put('/missions/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, xp, isBonus } = body;
  
  if (xp === undefined && isBonus === undefined && name === undefined) {
    return c.json({ error: 'name, xp ou isBonus requis' }, 400);
  }
  
  const mission = missionsMap.get(id);
  if (!mission) {
    return c.json({ error: 'Mission inconnue' }, 404);
  }
  
  const db = getDb();
  
  try {
    if (name !== undefined && name.trim()) {
      db.prepare('UPDATE missions SET name = ? WHERE id = ?').run(name.trim(), id);
      mission.name = name.trim();
    }
    
    if (xp !== undefined) {
      db.prepare('UPDATE missions SET xp = ? WHERE id = ?').run(xp, id);
      mission.xp = xp;
    }
    
    if (isBonus !== undefined) {
      db.prepare('UPDATE missions SET is_bonus = ? WHERE id = ?').run(isBonus ? 1 : 0, id);
      mission.isBonus = isBonus;
    }
    
    // Mettre à jour dans la catégorie aussi
    const category = categoriesMap.get(mission.categoryId);
    if (category) {
      const catMission = category.missions.find(m => m.id === id);
      if (catMission) {
        if (name !== undefined && name.trim()) catMission.name = name.trim();
        if (xp !== undefined) catMission.xp = xp;
        if (isBonus !== undefined) catMission.isBonus = isBonus;
      }
    }
    
    return c.json({ success: true, mission });
  } catch (error) {
    return c.json({ error: 'Erreur lors de la modification' }, 500);
  }
});

// DELETE /api/missions/:id - Supprimer une mission
api.delete('/missions/:id', (c) => {
  const id = c.req.param('id');
  
  const mission = missionsMap.get(id);
  if (!mission) {
    return c.json({ error: 'Mission inconnue' }, 404);
  }
  
  const db = getDb();
  
  try {
    // Supprimer les entrées associées
    db.prepare('DELETE FROM daily_entries WHERE mission_id = ?').run(id);
    // Supprimer la mission
    db.prepare('DELETE FROM missions WHERE id = ?').run(id);
    
    // Mettre à jour le cache
    missionsMap.delete(id);
    
    const category = categoriesMap.get(mission.categoryId);
    if (category) {
      category.missions = category.missions.filter(m => m.id !== id);
    }
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Erreur lors de la suppression' }, 500);
  }
});

// ============ ENTRÉES QUOTIDIENNES ============

// GET /api/entries/:date - Récupérer les entrées d'une date
api.get('/entries/:date', (c) => {
  const date = c.req.param('date');
  const entries = getEntriesForDate(date);
  const totalXp = getDayTotalXp(date);
  const locked = isDateLocked(date);
  
  return c.json({
    date,
    entries,
    totalXp,
    locked
  });
});

// POST /api/entries - Ajouter/mettre à jour une entrée
api.post('/entries', async (c) => {
  const body = await c.req.json();
  const { date, missionId, count = 1 } = body;
  
  if (!date || !missionId) {
    return c.json({ error: 'date et missionId requis' }, 400);
  }
  
  const result = addMissionEntry(date, missionId, count);
  
  if (!result.success) {
    return c.json({ error: result.message }, 400);
  }
  
  // Retourner le profil mis à jour
  const profile = getUserProfile();
  
  return c.json({
    success: true,
    xpGained: result.xpGained,
    profile
  });
});

// DELETE /api/entries/:date/:missionId - Supprimer une entrée
api.delete('/entries/:date/:missionId', (c) => {
  const date = c.req.param('date');
  const missionId = c.req.param('missionId');
  
  const result = removeMissionEntry(date, missionId);
  
  if (!result.success) {
    return c.json({ error: result.message }, 400);
  }
  
  const profile = getUserProfile();
  
  return c.json({
    success: true,
    profile
  });
});

// ============ STATISTIQUES ============

// GET /api/stats/weekly?week=YYYY-Www - Stats hebdomadaires
api.get('/stats/weekly', (c) => {
  const week = c.req.query('week');
  const stats = getWeeklyStats(week);
  return c.json(stats);
});

// GET /api/stats/monthly?month=YYYY-MM - Stats mensuelles
api.get('/stats/monthly', (c) => {
  const month = c.req.query('month');
  const stats = getMonthlyStats(month);
  return c.json(stats);
});

// GET /api/stats/history?days=30 - Historique quotidien
api.get('/stats/history', (c) => {
  const days = parseInt(c.req.query('days') || '30');
  const history = getDailyHistory(days);
  return c.json(history);
});

// ============ RÉCOMPENSES ============

// GET /api/rewards - Liste des récompenses disponibles
api.get('/rewards', (c) => {
  const db = getDb();
  const profile = getUserProfile();
  
  // Récupérer les récompenses déjà réclamées
  const claimed = db.prepare(`
    SELECT level, reward_type, claimed_at 
    FROM rewards_claimed 
    ORDER BY claimed_at DESC
  `).all() as Array<{ level: number; reward_type: string; claimed_at: string }>;
  
  return c.json({
    available: profile.rewardsAvailable,
    currentLevel: profile.level,
    rewardTypes: rewards,
    claimed
  });
});

// POST /api/rewards/claim - Réclamer une récompense
api.post('/rewards/claim', async (c) => {
  const body = await c.req.json();
  const { rewardType } = body;
  
  const profile = getUserProfile();
  
  if (profile.rewardsAvailable <= 0) {
    return c.json({ error: 'Aucune récompense disponible' }, 400);
  }
  
  // Trouver le prochain niveau non réclamé
  const db = getDb();
  const claimedLevels = db.prepare('SELECT level FROM rewards_claimed').all() as Array<{ level: number }>;
  const claimedSet = new Set(claimedLevels.map(r => r.level));
  
  let nextLevel = 1;
  for (let i = 1; i < profile.level; i++) {
    if (!claimedSet.has(i)) {
      nextLevel = i;
      break;
    }
  }
  
  // Enregistrer la récompense
  db.prepare('INSERT INTO rewards_claimed (level, reward_type) VALUES (?, ?)').run(nextLevel, rewardType);
  
  const updatedProfile = getUserProfile();
  
  return c.json({
    success: true,
    level: nextLevel,
    rewardType,
    remainingRewards: updatedProfile.rewardsAvailable
  });
});

export default api;
