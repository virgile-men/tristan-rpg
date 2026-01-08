import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './services/db.service.js';
import api from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer le dossier data s'il n'existe pas
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialiser la base de données
initializeDatabase();

// Créer l'application Hono
const app = new Hono();

// Middleware CORS
app.use('*', cors());

// Routes API
app.route('/api', api);

// Servir les fichiers statiques
app.use('/css/*', serveStatic({ root: './src/public' }));
app.use('/js/*', serveStatic({ root: './src/public' }));

// Route principale - servir index.html
app.get('/', (c) => {
  const htmlPath = path.join(__dirname, 'public/index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  return c.html(html);
});

// Démarrer le serveur
const port = 3000;
console.log(`
🎮 ═══════════════════════════════════════════════════
   TRISTAN RPG - Devenir une meilleure version de soi
═══════════════════════════════════════════════════════

   🌐 Application disponible sur: http://localhost:${port}
   
   📋 Objectif: Niveau 100 avant le 20 juin 2026
   💪 XP requis: 32 500 XP
   
   Bonne chance dans ta quête ! 🚀
═══════════════════════════════════════════════════════
`);

serve({
  fetch: app.fetch,
  port
});
