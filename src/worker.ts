// Point d'entrée Cloudflare Workers
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import api from './routes/api.d1.js';

interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware CORS
app.use('*', cors());

// Routes API
app.route('/api', api);

// Route racine - Cloudflare Assets servira automatiquement index.html
app.get('/', (c) => {
  return c.redirect('/index.html');
});

// Export pour Cloudflare Workers
export default app;
