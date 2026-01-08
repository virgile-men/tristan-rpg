-- Migration initiale pour Cloudflare D1
-- Créer la base de données RPG Tristan

-- Table des catégories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

-- Table des missions
CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  xp INTEGER NOT NULL,
  is_bonus INTEGER DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Table des entrées quotidiennes
CREATE TABLE IF NOT EXISTS daily_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (mission_id) REFERENCES missions(id),
  UNIQUE(date, mission_id)
);

-- Table du profil utilisateur
CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT DEFAULT 'Tristan',
  total_xp INTEGER DEFAULT 0,
  rewards_available INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Table des récompenses utilisées
CREATE TABLE IF NOT EXISTS rewards_claimed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  claimed_at TEXT DEFAULT (datetime('now'))
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_entries_date ON daily_entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_mission ON daily_entries(mission_id);
CREATE INDEX IF NOT EXISTS idx_missions_category ON missions(category_id);

-- Insérer le profil par défaut
INSERT OR IGNORE INTO user_profile (id, name) VALUES (1, 'Tristan');

-- =====================
-- CATÉGORIES
-- =====================
INSERT OR REPLACE INTO categories (id, name, color) VALUES
  ('physique', 'PHYSIQUE', '#e74c3c'),
  ('portugais', 'PORTUGAIS', '#27ae60'),
  ('maison', 'MAISON', '#f39c12'),
  ('proches', 'PROCHES', '#e91e63'),
  ('professionnel', 'PROFESSIONNEL', '#3498db'),
  ('alimentation', 'ALIMENTATION', '#9b59b6'),
  ('soins', 'SOINS', '#1abc9c'),
  ('tri', 'TRI', '#795548'),
  ('bonus', 'BONUS', '#ffd700');

-- =====================
-- MISSIONS PHYSIQUE
-- =====================
INSERT OR REPLACE INTO missions (id, category_id, name, xp, is_bonus) VALUES
  ('boxe', 'physique', 'Boxe', 60, 0),
  ('streetworkout', 'physique', 'Streetworkout', 40, 0),
  ('running', 'physique', 'Running', 50, 0),
  ('renforcement', 'physique', 'Renforcement', 40, 0),
  ('relaxation-5min', 'physique', 'Relaxation 5 minutes', 15, 0),
  ('relaxation-30min', 'physique', 'Relaxation / mobilité 30 minutes', 35, 0),
  ('marche-15min', 'physique', 'Marche 15 min après dîner', 20, 0),
  ('randonnee', 'physique', 'Randonnée organisée', 100, 0),
  ('coucher-9h', 'physique', 'Se coucher 9H avant le sommeil', 70, 0),
  ('bonus-matin', 'physique', 'Bonus si séance matin / avant travail', 15, 1),
  ('bonus-exterieur-hiver', 'physique', 'Bonus si extérieur hiver', 20, 1),
  ('bonus-decouverte-sport', 'physique', 'Bonus si Découverte sport', 45, 1),
  ('bonus-avec-quelquun', 'physique', 'Bonus si Séance avec quelqu''un', 20, 1),
  ('bonus-seul-sans-musique', 'physique', 'Bonus si Séance seul et sans musique', 15, 1),
  ('bonus-regularite-4sem', 'physique', 'Bonus si régularité 4/semaine', 50, 1);

-- =====================
-- MISSIONS PORTUGAIS
-- =====================
INSERT OR REPLACE INTO missions (id, category_id, name, xp, is_bonus) VALUES
  ('duolingo-15min', 'portugais', 'Duolingo 15 min', 20, 0),
  ('duolingo-30min', 'portugais', 'Duolingo 30 min', 45, 0),
  ('duolingo-45min', 'portugais', 'Duolingo 45 min', 75, 0),
  ('mots-avant-dormir', 'portugais', 'Apprendre 2–3 mots avant de dormir', 15, 0),
  ('exercices-ecrits', 'portugais', 'Exercices écrits', 40, 0),
  ('video-vo', 'portugais', 'Regarder une vidéo en VO', 25, 0),
  ('bonus-regularite-5j', 'portugais', 'Bonus si régularité 5 jours', 50, 1),
  ('bonus-regularite-7j', 'portugais', 'Bonus si régularité 7 jours', 80, 1);

-- =====================
-- MISSIONS MAISON
-- =====================
INSERT OR REPLACE INTO missions (id, category_id, name, xp, is_bonus) VALUES
  ('pas-vaisselle-soir', 'maison', 'Aucune vaisselle le soir', 25, 0),
  ('prep-sac-lendemain', 'maison', 'Préparation sac lendemain', 15, 0),
  ('prep-affaires-lendemain', 'maison', 'Préparation affaires lendemain', 15, 0),
  ('nettoyage-baskets', 'maison', 'Nettoyage baskets', 25, 0),
  ('rangement-rapide-15min', 'maison', 'Rangement rapide 15 minutes', 10, 0),
  ('rangement-complet', 'maison', 'Rangement complet', 40, 0),
  ('liste-courses', 'maison', 'Liste de courses', 10, 0),
  ('cuisine-plusieurs-jours', 'maison', 'Cuisine plusieurs jours', 40, 0),
  ('nouvelle-recette', 'maison', 'Nouvelle recette', 30, 0),
  ('bonus-weekend-libre', 'maison', 'Bonus si week end libre', 50, 1);

-- =====================
-- MISSIONS PROCHES
-- =====================
INSERT OR REPLACE INTO missions (id, category_id, name, xp, is_bonus) VALUES
  ('nouvelles', 'proches', 'Donner / prendre des nouvelles', 15, 0),
  ('sortie-improvisee', 'proches', 'Sortie improvisée', 30, 0),
  ('sortie-organisee', 'proches', 'Sortie organisée', 60, 0);

-- =====================
-- MISSIONS PROFESSIONNEL
-- =====================
INSERT OR REPLACE INTO missions (id, category_id, name, xp, is_bonus) VALUES
  ('revision-anatomie', 'professionnel', 'Révision anatomie / pathologies', 30, 0),
  ('vocabulaire-medical', 'professionnel', 'Réviser Vocabulaire médical', 25, 0),
  ('videos-instructives', 'professionnel', 'Vidéos / Recherches Instructives', 25, 0),
  ('recherche-scientifiques', 'professionnel', 'Recherche scientifiques', 40, 0),
  ('preparer-seances', 'professionnel', 'Préparer séances', 35, 0),
  ('projet-idee-pro', 'professionnel', 'Projet / idée pro', 50, 0);

-- =====================
-- MISSIONS ALIMENTATION
-- =====================
INSERT OR REPLACE INTO missions (id, category_id, name, xp, is_bonus) VALUES
  ('batch-cooking', 'alimentation', 'Batch cooking', 45, 0),
  ('journee-sans-grignotage', 'alimentation', 'Journée sans grignotage', 30, 0),
  ('journee-sans-ecart', 'alimentation', 'Journée sans écart', 40, 0),
  ('bonus-pas-fastfood-semaine', 'alimentation', 'Bonus si Pas de fast-food de la semaine', 60, 1);

-- =====================
-- MISSIONS SOINS
-- =====================
INSERT OR REPLACE INTO missions (id, category_id, name, xp, is_bonus) VALUES
  ('barbe', 'soins', 'Barbe', 10, 0),
  ('visage-mains', 'soins', 'Visage et mains', 10, 0),
  ('pieds', 'soins', 'Pieds', 15, 0),
  ('bonus-5j-consecutifs', 'soins', 'Bonus si 5 jours consécutifs', 30, 1),
  ('bonus-7j-consecutifs', 'soins', 'Bonus si 7 jours consécutifs', 50, 1);

-- =====================
-- MISSIONS TRI
-- =====================
INSERT OR REPLACE INTO missions (id, category_id, name, xp, is_bonus) VALUES
  ('tri-photos', 'tri', 'Photos', 20, 0),
  ('tri-mails', 'tri', 'Mails', 30, 0),
  ('tri-videos', 'tri', 'Vidéos enregistrés', 40, 0),
  ('tri-vetements', 'tri', 'Vêtements', 60, 0),
  ('tri-paperasse', 'tri', 'Paperasse', 40, 0);

-- =====================
-- MISSIONS BONUS
-- =====================
INSERT OR REPLACE INTO missions (id, category_id, name, xp, is_bonus) VALUES
  ('cadeau-anticipe', 'bonus', 'Cadeau anticipé', 50, 0),
  ('idee-amelioration-appart', 'bonus', 'Idée amélioration appartement', 30, 0),
  ('idee-vacances-roadtrip', 'bonus', 'Idée vacances / road trip', 25, 0),
  ('anecdote-jour-semaine', 'bonus', 'Anecdote jour ou semaine', 20, 0),
  ('lecture-avant-dormir', 'bonus', 'Lecture avant dormir', 20, 0);
