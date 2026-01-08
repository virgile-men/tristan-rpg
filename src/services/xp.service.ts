import { getDb } from './db.service.js';
import { calculateLevel, xpRequiredForLevel, daysUntilTarget, xpPerDayRequired, XP_FOR_LEVEL_100 } from '../config/levels.js';
import { missionsMap } from '../config/missions.js';

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
export function getUserProfile(): UserProfile {
  const db = getDb();
  
  // Calculer le total XP depuis les entrées
  const xpResult = db.prepare(`
    SELECT COALESCE(SUM(m.xp * de.count), 0) as total_xp
    FROM daily_entries de
    JOIN missions m ON de.mission_id = m.id
  `).get() as { total_xp: number };
  
  const totalXp = xpResult.total_xp;
  
  // Calculer le niveau et la progression
  const levelInfo = calculateLevel(totalXp);
  
  // Récupérer le profil pour les récompenses
  const profile = db.prepare('SELECT name, rewards_available FROM user_profile WHERE id = 1').get() as {
    name: string;
    rewards_available: number;
  };
  
  // Calculer les récompenses disponibles (1 par niveau atteint - celles déjà réclamées)
  const claimedCount = db.prepare('SELECT COUNT(*) as count FROM rewards_claimed').get() as { count: number };
  const rewardsAvailable = Math.max(0, levelInfo.level - 1 - claimedCount.count);
  
  return {
    name: profile.name,
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
 * Ajoute de l'XP via une mission accomplie
 */
export function addMissionEntry(date: string, missionId: string, count: number = 1): { success: boolean; xpGained: number; message?: string } {
  const db = getDb();
  
  // Vérifier si la date est verrouillée (plus de 2 jours)
  if (isDateLocked(date)) {
    return { success: false, xpGained: 0, message: 'Cette date est verrouillée (plus de 2 jours)' };
  }
  
  // Vérifier que la mission existe
  const mission = missionsMap.get(missionId);
  if (!mission) {
    return { success: false, xpGained: 0, message: 'Mission inconnue' };
  }
  
  try {
    // Insérer ou mettre à jour l'entrée
    const existing = db.prepare(
      'SELECT id, count FROM daily_entries WHERE date = ? AND mission_id = ?'
    ).get(date, missionId) as { id: number; count: number } | undefined;
    
    if (existing) {
      db.prepare('UPDATE daily_entries SET count = ? WHERE id = ?').run(count, existing.id);
    } else {
      db.prepare('INSERT INTO daily_entries (date, mission_id, count) VALUES (?, ?, ?)').run(date, missionId, count);
    }
    
    return { success: true, xpGained: mission.xp * count };
  } catch (error) {
    return { success: false, xpGained: 0, message: 'Erreur lors de l\'enregistrement' };
  }
}

/**
 * Supprime une entrée de mission
 */
export function removeMissionEntry(date: string, missionId: string): { success: boolean; message?: string } {
  const db = getDb();
  
  if (isDateLocked(date)) {
    return { success: false, message: 'Cette date est verrouillée (plus de 2 jours)' };
  }
  
  db.prepare('DELETE FROM daily_entries WHERE date = ? AND mission_id = ?').run(date, missionId);
  return { success: true };
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
 * Récupère les entrées d'une date
 */
export function getEntriesForDate(date: string): Array<{ missionId: string; missionName: string; categoryId: string; count: number; xp: number; totalXp: number; locked: boolean }> {
  const db = getDb();
  
  const entries = db.prepare(`
    SELECT de.mission_id, de.count, m.name as mission_name, m.xp, m.category_id
    FROM daily_entries de
    JOIN missions m ON de.mission_id = m.id
    WHERE de.date = ?
  `).all(date) as Array<{ mission_id: string; count: number; mission_name: string; xp: number; category_id: string }>;
  
  const locked = isDateLocked(date);
  
  return entries.map(e => ({
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
export function getDayTotalXp(date: string): number {
  const db = getDb();
  
  const result = db.prepare(`
    SELECT COALESCE(SUM(m.xp * de.count), 0) as total
    FROM daily_entries de
    JOIN missions m ON de.mission_id = m.id
    WHERE de.date = ?
  `).get(date) as { total: number };
  
  return result.total;
}
