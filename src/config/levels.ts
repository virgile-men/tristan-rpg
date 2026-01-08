// Configuration des paliers de niveaux
// Système par paliers de 10 niveaux avec XP croissant

export interface LevelTier {
  tier: number;
  minLevel: number;
  maxLevel: number;
  xpPerLevel: number;
  totalXpForTier: number;
}

// Table des paliers selon explication.md
export const levelTiers: LevelTier[] = [
  { tier: 1, minLevel: 1, maxLevel: 10, xpPerLevel: 100, totalXpForTier: 1000 },
  { tier: 2, minLevel: 11, maxLevel: 20, xpPerLevel: 150, totalXpForTier: 1500 },
  { tier: 3, minLevel: 21, maxLevel: 30, xpPerLevel: 200, totalXpForTier: 2000 },
  { tier: 4, minLevel: 31, maxLevel: 40, xpPerLevel: 250, totalXpForTier: 2500 },
  { tier: 5, minLevel: 41, maxLevel: 50, xpPerLevel: 300, totalXpForTier: 3000 },
  { tier: 6, minLevel: 51, maxLevel: 60, xpPerLevel: 350, totalXpForTier: 3500 },
  { tier: 7, minLevel: 61, maxLevel: 70, xpPerLevel: 400, totalXpForTier: 4000 },
  { tier: 8, minLevel: 71, maxLevel: 80, xpPerLevel: 450, totalXpForTier: 4500 },
  { tier: 9, minLevel: 81, maxLevel: 90, xpPerLevel: 500, totalXpForTier: 5000 },
  { tier: 10, minLevel: 91, maxLevel: 100, xpPerLevel: 550, totalXpForTier: 5500 },
];

// XP cumulé pour atteindre chaque palier
export const cumulativeXpByTier: number[] = [];
let cumulative = 0;
levelTiers.forEach((tier, index) => {
  cumulativeXpByTier[index] = cumulative;
  cumulative += tier.totalXpForTier;
});

// XP total pour atteindre niveau 100 = 32 500 XP
export const XP_FOR_LEVEL_100 = 32500;

// Objectif final
export const TARGET_DATE = new Date('2026-06-20');
export const TARGET_LEVEL = 100;

// Récompenses disponibles par niveau
export const rewards = [
  { id: 'console', name: '🎮 Jouer à la console', tier: 'standard' },
  { id: 'new-game', name: '🕹️ Acheter un nouveau jeu', tier: 'major' },
  { id: 'series', name: '📺 Regarder une série ou un manga', tier: 'standard' },
  { id: 'rest', name: '😌 2 jours de repos tranquille', tier: 'major' },
  { id: 'activity', name: '🎬 Activité extérieure (ciné, bowling…)', tier: 'standard' },
];

/**
 * Calcule le niveau à partir de l'XP total
 */
export function calculateLevel(totalXp: number): { level: number; currentTierXp: number; xpForNextLevel: number; progressPercent: number } {
  if (totalXp < 0) totalXp = 0;
  
  let remainingXp = totalXp;
  let level = 1;
  
  for (const tier of levelTiers) {
    const levelsInTier = tier.maxLevel - tier.minLevel + 1;
    const xpNeededForTier = levelsInTier * tier.xpPerLevel;
    
    if (remainingXp >= xpNeededForTier) {
      remainingXp -= xpNeededForTier;
      level = tier.maxLevel + 1;
    } else {
      // On est dans ce palier
      const levelsGained = Math.floor(remainingXp / tier.xpPerLevel);
      level = tier.minLevel + levelsGained;
      const currentTierXp = remainingXp % tier.xpPerLevel;
      const progressPercent = (currentTierXp / tier.xpPerLevel) * 100;
      
      return {
        level,
        currentTierXp,
        xpForNextLevel: tier.xpPerLevel,
        progressPercent
      };
    }
  }
  
  // Au-delà du niveau 100, progression continue
  // Niveau 101-110: 600 XP, 111-120: 650 XP, etc.
  const baseTier = Math.floor((level - 101) / 10);
  const xpPerLevel = 600 + (baseTier * 50);
  const currentTierXp = remainingXp % xpPerLevel;
  const additionalLevels = Math.floor(remainingXp / xpPerLevel);
  
  return {
    level: level + additionalLevels,
    currentTierXp,
    xpForNextLevel: xpPerLevel,
    progressPercent: (currentTierXp / xpPerLevel) * 100
  };
}

/**
 * Calcule l'XP nécessaire pour atteindre un niveau donné
 */
export function xpRequiredForLevel(targetLevel: number): number {
  if (targetLevel <= 1) return 0;
  
  let totalXp = 0;
  
  for (const tier of levelTiers) {
    if (targetLevel > tier.maxLevel) {
      totalXp += tier.totalXpForTier;
    } else if (targetLevel >= tier.minLevel) {
      const levelsInTier = targetLevel - tier.minLevel;
      totalXp += levelsInTier * tier.xpPerLevel;
      break;
    }
  }
  
  // Au-delà du niveau 100
  if (targetLevel > 100) {
    totalXp = XP_FOR_LEVEL_100;
    let currentLevel = 101;
    while (currentLevel <= targetLevel) {
      const baseTier = Math.floor((currentLevel - 101) / 10);
      const xpPerLevel = 600 + (baseTier * 50);
      totalXp += xpPerLevel;
      currentLevel++;
    }
  }
  
  return totalXp;
}

/**
 * Calcule les jours restants jusqu'à l'objectif
 */
export function daysUntilTarget(): number {
  const now = new Date();
  const diff = TARGET_DATE.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calcule l'XP moyen nécessaire par jour pour atteindre l'objectif
 */
export function xpPerDayRequired(currentXp: number): number {
  const remaining = XP_FOR_LEVEL_100 - currentXp;
  const days = daysUntilTarget();
  if (days <= 0) return 0;
  return Math.ceil(remaining / days);
}
