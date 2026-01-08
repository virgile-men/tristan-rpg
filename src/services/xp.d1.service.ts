// Service XP adapté pour D1 (async)
import { calculateLevel, xpRequiredForLevel, daysUntilTarget, xpPerDayRequired, XP_FOR_LEVEL_100 } from '../config/levels.js';
import type { Env } from '../types/db.js';

export interface UserProfile {
  name: string;
  totalXp: number;
  level: number;
  currentTierXp: number;
  xpForNextLevel: number;
  progressPercent: number;
  rewardsAvailable: number;
  daysRemaining: number;
  xpPerDayRequired: number;
  xpToTarget: number;
}

/**
 * Récupère le profil utilisateur complet avec calculs
 */
export async function getUserProfile(db: D1Database): Promise<UserProfile> {
  // Calculer le total XP depuis les entrées
  const xpResult = await db.prepare(`
    SELECT COALESCE(SUM(m.xp * de.count), 0) as total_xp
    FROM daily_entries de
    JOIN missions m ON de.mission_id = m.id
  `).first<{ total_xp: number }>();
  
  const totalXp = xpResult?.total_xp ?? 0;
  
  // Calculer le niveau et la progression
  const levelInfo = calculateLevel(totalXp);
  
  // Récupérer le profil pour les récompenses
  const profile = await db.prepare('SELECT name, rewards_available FROM user_profile WHERE id = 1')
    .first<{ name: string; rewards_available: number }>();
  
  // Calculer les récompenses disponibles (1 par niveau atteint - celles déjà réclamées)
  const claimedCount = await db.prepare('SELECT COUNT(*) as count FROM rewards_claimed')
    .first<{ count: number }>();
  
  const rewardsAvailable = Math.max(0, levelInfo.level - 1 - (claimedCount?.count ?? 0));
  
  return {
    name: profile?.name ?? 'Tristan',
    totalXp,
    level: levelInfo.level,
    currentTierXp: levelInfo.currentTierXp,
    xpForNextLevel: levelInfo.xpForNextLevel,
    progressPercent: levelInfo.progressPercent,
    rewardsAvailable,
    daysRemaining: daysUntilTarget(),
    xpPerDayRequired: xpPerDayRequired(totalXp),
    xpToTarget: Math.max(0, XP_FOR_LEVEL_100 - totalXp)
  };
}

/**
 * Vérifie si une date est verrouillée (plus de 2 jours)
 */
export function isDateLocked(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 2;
}

/**
 * Ajoute de l'XP via une mission accomplie
 */
export async function addMissionEntry(
  db: D1Database, 
  date: string, 
  missionId: string, 
  count: number = 1
): Promise<{ success: boolean; xpGained: number; message?: string }> {
  // Vérifier si la date est verrouillée
  if (isDateLocked(date)) {
    return { success: false, xpGained: 0, message: 'Cette date est verrouillée (plus de 2 jours)' };
  }
  
  // Vérifier que la mission existe
  const mission = await db.prepare('SELECT xp FROM missions WHERE id = ?')
    .bind(missionId)
    .first<{ xp: number }>();
    
  if (!mission) {
    return { success: false, xpGained: 0, message: 'Mission inconnue' };
  }
  
  try {
    // Insérer ou mettre à jour l'entrée
    const existing = await db.prepare(
      'SELECT id, count FROM daily_entries WHERE date = ? AND mission_id = ?'
    ).bind(date, missionId).first<{ id: number; count: number }>();
    
    if (existing) {
      await db.prepare('UPDATE daily_entries SET count = ? WHERE id = ?')
        .bind(count, existing.id)
        .run();
    } else {
      await db.prepare('INSERT INTO daily_entries (date, mission_id, count) VALUES (?, ?, ?)')
        .bind(date, missionId, count)
        .run();
    }
    
    return { success: true, xpGained: mission.xp * count };
  } catch (error) {
    return { success: false, xpGained: 0, message: 'Erreur lors de l\'enregistrement' };
  }
}

/**
 * Supprime une entrée de mission
 */
export async function removeMissionEntry(
  db: D1Database, 
  date: string, 
  missionId: string
): Promise<{ success: boolean; message?: string }> {
  if (isDateLocked(date)) {
    return { success: false, message: 'Cette date est verrouillée (plus de 2 jours)' };
  }
  
  await db.prepare('DELETE FROM daily_entries WHERE date = ? AND mission_id = ?')
    .bind(date, missionId)
    .run();
    
  return { success: true };
}

/**
 * Récupère les entrées d'une date
 */
export async function getEntriesForDate(
  db: D1Database, 
  date: string
): Promise<Array<{ 
  missionId: string; 
  missionName: string; 
  categoryId: string; 
  count: number; 
  xp: number; 
  totalXp: number; 
  locked: boolean 
}>> {
  const result = await db.prepare(`
    SELECT de.mission_id, de.count, m.name as mission_name, m.xp, m.category_id
    FROM daily_entries de
    JOIN missions m ON de.mission_id = m.id
    WHERE de.date = ?
  `).bind(date).all<{ 
    mission_id: string; 
    count: number; 
    mission_name: string; 
    xp: number; 
    category_id: string 
  }>();
  
  const locked = isDateLocked(date);
  
  return (result.results || []).map(e => ({
    missionId: e.mission_id,
    missionName: e.mission_name,
    categoryId: e.category_id,
    count: e.count,
    xp: e.xp,
    totalXp: e.xp * e.count,
    locked
  }));
}

/**
 * Récupère le total XP d'une date
 */
export async function getDayTotalXp(db: D1Database, date: string): Promise<number> {
  const result = await db.prepare(`
    SELECT COALESCE(SUM(m.xp * de.count), 0) as total
    FROM daily_entries de
    JOIN missions m ON de.mission_id = m.id
    WHERE de.date = ?
  `).bind(date).first<{ total: number }>();
  
  return result?.total ?? 0;
}
