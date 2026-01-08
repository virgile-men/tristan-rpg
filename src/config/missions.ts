// Configuration des missions RPG par catégorie
// XP définis selon le fichier explication.md - NE PAS MODIFIER les valeurs XP

export interface Mission {
  id: string;
  name: string;
  xp: number;
  isBonus: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  missions: Mission[];
}

export const categories: Category[] = [
  {
    id: 'physique',
    name: 'PHYSIQUE',
    color: '#e74c3c', // Rouge
    missions: [
      { id: 'boxe', name: 'Boxe', xp: 60, isBonus: false },
      { id: 'streetworkout', name: 'Streetworkout', xp: 40, isBonus: false },
      { id: 'running', name: 'Running', xp: 50, isBonus: false },
      { id: 'renforcement', name: 'Renforcement', xp: 40, isBonus: false },
      { id: 'relaxation-5min', name: 'Relaxation 5 minutes', xp: 15, isBonus: false },
      { id: 'relaxation-30min', name: 'Relaxation / mobilité 30 minutes', xp: 35, isBonus: false },
      { id: 'marche-15min', name: 'Marche 15 min après dîner', xp: 20, isBonus: false },
      { id: 'randonnee', name: 'Randonnée organisée', xp: 100, isBonus: false },
      { id: 'coucher-9h', name: 'Se coucher 9H avant le sommeil', xp: 70, isBonus: false },
      { id: 'bonus-matin', name: 'Bonus si séance matin / avant travail', xp: 15, isBonus: true },
      { id: 'bonus-exterieur-hiver', name: 'Bonus si extérieur hiver', xp: 20, isBonus: true },
      { id: 'bonus-decouverte-sport', name: 'Bonus si Découverte sport', xp: 45, isBonus: true },
      { id: 'bonus-avec-quelquun', name: 'Bonus si Séance avec quelqu\'un', xp: 20, isBonus: true },
      { id: 'bonus-seul-sans-musique', name: 'Bonus si Séance seul et sans musique', xp: 15, isBonus: true },
      { id: 'bonus-regularite-4sem', name: 'Bonus si régularité 4/semaine', xp: 50, isBonus: true },
    ]
  },
  {
    id: 'portugais',
    name: 'PORTUGAIS',
    color: '#27ae60', // Vert
    missions: [
      { id: 'duolingo-15min', name: 'Duolingo 15 min', xp: 20, isBonus: false },
      { id: 'duolingo-30min', name: 'Duolingo 30 min', xp: 45, isBonus: false },
      { id: 'duolingo-45min', name: 'Duolingo 45 min', xp: 75, isBonus: false },
      { id: 'mots-avant-dormir', name: 'Apprendre 2–3 mots avant de dormir', xp: 15, isBonus: false },
      { id: 'exercices-ecrits', name: 'Exercices écrits', xp: 40, isBonus: false },
      { id: 'video-vo', name: 'Regarder une vidéo en VO', xp: 25, isBonus: false },
      { id: 'bonus-regularite-5j', name: 'Bonus si régularité 5 jours', xp: 50, isBonus: true },
      { id: 'bonus-regularite-7j', name: 'Bonus si régularité 7 jours', xp: 80, isBonus: true },
    ]
  },
  {
    id: 'maison',
    name: 'MAISON',
    color: '#f39c12', // Orange
    missions: [
      { id: 'pas-vaisselle-soir', name: 'Aucune vaisselle le soir', xp: 25, isBonus: false },
      { id: 'prep-sac-lendemain', name: 'Préparation sac lendemain', xp: 15, isBonus: false },
      { id: 'prep-affaires-lendemain', name: 'Préparation affaires lendemain', xp: 15, isBonus: false },
      { id: 'nettoyage-baskets', name: 'Nettoyage baskets', xp: 25, isBonus: false },
      { id: 'rangement-rapide-15min', name: 'Rangement rapide 15 minutes', xp: 10, isBonus: false },
      { id: 'rangement-complet', name: 'Rangement complet', xp: 40, isBonus: false },
      { id: 'liste-courses', name: 'Liste de courses', xp: 10, isBonus: false },
      { id: 'cuisine-plusieurs-jours', name: 'Cuisine plusieurs jours', xp: 40, isBonus: false },
      { id: 'nouvelle-recette', name: 'Nouvelle recette', xp: 30, isBonus: false },
      { id: 'bonus-weekend-libre', name: 'Bonus si week end libre', xp: 50, isBonus: true },
    ]
  },
  {
    id: 'proches',
    name: 'PROCHES',
    color: '#e91e63', // Rose
    missions: [
      { id: 'nouvelles', name: 'Donner / prendre des nouvelles', xp: 15, isBonus: false },
      { id: 'sortie-improvisee', name: 'Sortie improvisée', xp: 30, isBonus: false },
      { id: 'sortie-organisee', name: 'Sortie organisée', xp: 60, isBonus: false },
    ]
  },
  {
    id: 'professionnel',
    name: 'PROFESSIONNEL',
    color: '#3498db', // Bleu
    missions: [
      { id: 'revision-anatomie', name: 'Révision anatomie / pathologies', xp: 30, isBonus: false },
      { id: 'vocabulaire-medical', name: 'Réviser Vocabulaire médical', xp: 25, isBonus: false },
      { id: 'videos-instructives', name: 'Vidéos / Recherches Instructives', xp: 25, isBonus: false },
      { id: 'recherche-scientifiques', name: 'Recherche scientifiques', xp: 40, isBonus: false },
      { id: 'preparer-seances', name: 'Préparer séances', xp: 35, isBonus: false },
      { id: 'projet-idee-pro', name: 'Projet / idée pro', xp: 50, isBonus: false },
    ]
  },
  {
    id: 'alimentation',
    name: 'ALIMENTATION',
    color: '#9b59b6', // Violet
    missions: [
      { id: 'batch-cooking', name: 'Batch cooking', xp: 45, isBonus: false },
      { id: 'journee-sans-grignotage', name: 'Journée sans grignotage', xp: 30, isBonus: false },
      { id: 'journee-sans-ecart', name: 'Journée sans écart', xp: 40, isBonus: false },
      { id: 'bonus-pas-fastfood-semaine', name: 'Bonus si Pas de fast-food de la semaine', xp: 60, isBonus: true },
    ]
  },
  {
    id: 'soins',
    name: 'SOINS',
    color: '#1abc9c', // Turquoise
    missions: [
      { id: 'barbe', name: 'Barbe', xp: 10, isBonus: false },
      { id: 'visage-mains', name: 'Visage et mains', xp: 10, isBonus: false },
      { id: 'pieds', name: 'Pieds', xp: 15, isBonus: false },
      { id: 'bonus-5j-consecutifs', name: 'Bonus si 5 jours consécutifs', xp: 30, isBonus: true },
      { id: 'bonus-7j-consecutifs', name: 'Bonus si 7 jours consécutifs', xp: 50, isBonus: true },
    ]
  },
  {
    id: 'tri',
    name: 'TRI',
    color: '#795548', // Marron
    missions: [
      { id: 'tri-photos', name: 'Photos', xp: 20, isBonus: false },
      { id: 'tri-mails', name: 'Mails', xp: 30, isBonus: false },
      { id: 'tri-videos', name: 'Vidéos enregistrés', xp: 40, isBonus: false },
      { id: 'tri-vetements', name: 'Vêtements', xp: 60, isBonus: false },
      { id: 'tri-paperasse', name: 'Paperasse', xp: 40, isBonus: false },
    ]
  },
  {
    id: 'bonus',
    name: 'BONUS',
    color: '#ffd700', // Or
    missions: [
      { id: 'cadeau-anticipe', name: 'Cadeau anticipé', xp: 50, isBonus: false },
      { id: 'idee-amelioration-appart', name: 'Idée amélioration appartement', xp: 30, isBonus: false },
      { id: 'idee-vacances-roadtrip', name: 'Idée vacances / road trip', xp: 25, isBonus: false },
      { id: 'anecdote-jour-semaine', name: 'Anecdote jour ou semaine', xp: 20, isBonus: false },
      { id: 'lecture-avant-dormir', name: 'Lecture avant dormir', xp: 20, isBonus: false },
    ]
  },
];

// Map rapide pour accéder aux missions par ID
export const missionsMap = new Map<string, Mission & { categoryId: string }>();
categories.forEach(cat => {
  cat.missions.forEach(mission => {
    missionsMap.set(mission.id, { ...mission, categoryId: cat.id });
  });
});

// Map rapide pour accéder aux catégories par ID
export const categoriesMap = new Map<string, Category>();
categories.forEach(cat => {
  categoriesMap.set(cat.id, cat);
});
