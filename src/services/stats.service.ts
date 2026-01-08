import { getDb } from './db.service.js';

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  color: string;
  totalXp: number;
  missionCount: number;
}

export interface PeriodStats {
  period: string;
  startDate: string;
  endDate: string;
  totalXp: number;
  byCategory: CategoryStats[];
  dailyAverage: number;
  daysWithEntries: number;
}

/**
 * Récupère les stats d'une semaine (format: YYYY-Www)
 */
export function getWeeklyStats(weekStr?: string): PeriodStats {
  const db = getDb();
  
  // Si pas de semaine spécifiée, prendre la semaine courante
  const now = new Date();
  if (!weekStr) {
    const year = now.getFullYear();
    const week = getWeekNumber(now);
    weekStr = `${year}-W${week.toString().padStart(2, '0')}`;
  }
  
  // Calculer les dates de début et fin de semaine
  const { startDate, endDate } = getWeekDates(weekStr);
  
  return getPeriodStats(startDate, endDate, weekStr);
}

/**
 * Récupère les stats d'un mois (format: YYYY-MM)
 */
export function getMonthlyStats(monthStr?: string): PeriodStats {
  const db = getDb();
  
  // Si pas de mois spécifié, prendre le mois courant
  const now = new Date();
  if (!monthStr) {
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    monthStr = `${year}-${month}`;
  }
  
  // Calculer les dates de début et fin de mois
  const [year, month] = monthStr.split('-').map(Number);
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
  
  return getPeriodStats(startDate, endDate, monthStr);
}

/**
 * Récupère les stats pour une période donnée
 */
function getPeriodStats(startDate: string, endDate: string, period: string): PeriodStats {
  const db = getDb();
  
  // Stats totales
  const totalResult = db.prepare(`
    SELECT 
      COALESCE(SUM(m.xp * de.count), 0) as total_xp,
      COUNT(DISTINCT de.date) as days_with_entries
    FROM daily_entries de
    JOIN missions m ON de.mission_id = m.id
    WHERE de.date >= ? AND de.date <= ?
  `).get(startDate, endDate) as { total_xp: number; days_with_entries: number };
  
  // Stats par catégorie
  const categoryResults = db.prepare(`
    SELECT 
      c.id as category_id,
      c.name as category_name,
      c.color,
      COALESCE(SUM(m.xp * de.count), 0) as total_xp,
      COUNT(de.id) as mission_count
    FROM categories c
    LEFT JOIN missions m ON m.category_id = c.id
    LEFT JOIN daily_entries de ON de.mission_id = m.id AND de.date >= ? AND de.date <= ?
    GROUP BY c.id
    ORDER BY c.name
  `).all(startDate, endDate) as Array<{
    category_id: string;
    category_name: string;
    color: string;
    total_xp: number;
    mission_count: number;
  }>;
  
  // Calculer le nombre de jours dans la période
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  return {
    period,
    startDate,
    endDate,
    totalXp: totalResult.total_xp,
    byCategory: categoryResults.map(r => ({
      categoryId: r.category_id,
      categoryName: r.category_name,
      color: r.color,
      totalXp: r.total_xp,
      missionCount: r.mission_count
    })),
    dailyAverage: totalResult.days_with_entries > 0 
      ? Math.round(totalResult.total_xp / totalResult.days_with_entries) 
      : 0,
    daysWithEntries: totalResult.days_with_entries
  };
}

/**
 * Récupère l'historique des XP quotidiens
 */
export function getDailyHistory(days: number = 30): Array<{ date: string; totalXp: number }> {
  const db = getDb();
  
  const results = db.prepare(`
    SELECT 
      de.date,
      COALESCE(SUM(m.xp * de.count), 0) as total_xp
    FROM daily_entries de
    JOIN missions m ON de.mission_id = m.id
    WHERE de.date >= date('now', '-' || ? || ' days')
    GROUP BY de.date
    ORDER BY de.date DESC
  `).all(days) as Array<{ date: string; total_xp: number }>;
  
  return results.map(r => ({
    date: r.date,
    totalXp: r.total_xp
  }));
}

/**
 * Calcule le numéro de semaine ISO
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Calcule les dates de début et fin d'une semaine ISO
 */
function getWeekDates(weekStr: string): { startDate: string; endDate: string } {
  const [year, week] = weekStr.split('-W').map(Number);
  
  // Premier jour de l'année
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay() || 7;
  
  // Premier lundi de la semaine 1
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() + (1 - jan1Day) + (jan1Day > 4 ? 7 : 0));
  
  // Lundi de la semaine demandée
  const monday = new Date(firstMonday);
  monday.setDate(firstMonday.getDate() + (week - 1) * 7);
  
  // Dimanche de la semaine
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  return {
    startDate: formatDate(monday),
    endDate: formatDate(sunday)
  };
}
