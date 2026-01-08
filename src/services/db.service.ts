import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { categories } from '../config/missions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin de la base de données
const dbPath = path.join(__dirname, '../../data/rpg.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initializeDatabase(): void {
  const database = getDb();
  
  // Créer les tables
  database.exec(`
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
  `);

  // Insérer le profil par défaut s'il n'existe pas
  const profile = database.prepare('SELECT id FROM user_profile WHERE id = 1').get();
  if (!profile) {
    database.prepare('INSERT INTO user_profile (id) VALUES (1)').run();
  }

  // Insérer les catégories et missions depuis la config
  const insertCategory = database.prepare(
    'INSERT OR REPLACE INTO categories (id, name, color) VALUES (?, ?, ?)'
  );
  const insertMission = database.prepare(
    'INSERT OR REPLACE INTO missions (id, category_id, name, xp, is_bonus) VALUES (?, ?, ?, ?, ?)'
  );

  const transaction = database.transaction(() => {
    for (const category of categories) {
      insertCategory.run(category.id, category.name, category.color);
      for (const mission of category.missions) {
        insertMission.run(mission.id, category.id, mission.name, mission.xp, mission.isBonus ? 1 : 0);
      }
    }
  });

  transaction();
  
  console.log('✅ Base de données initialisée avec succès');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
