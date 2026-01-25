import "dotenv/config";
import { Hocuspocus } from '@hocuspocus/server';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { PostgresExtension } from './extensions/postgres.js';
import { AuthExtension } from './extensions/auth.js';
import { onLoadDocument } from './hooks/onLoadDocument.js';
import { createAuthRouter } from './routes/auth.js';

const port = parseInt(process.env.PORT || '1234', 10);
const httpPort = parseInt(process.env.HTTP_PORT || '1235', 10);
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.HOCUSPOCUS_SECRET || 'development-secret';

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Create PostgreSQL connection pool for auth routes
const pool = new Pool({ connectionString: databaseUrl });

// Create Express app for HTTP endpoints
const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'overwatch-api' });
});

// Auth routes
app.use('/api/auth', createAuthRouter(pool, jwtSecret));

// Create Hocuspocus server
const hocuspocus = new Hocuspocus({
  port,
  name: 'overwatch-collaboration',

  // Debounce document updates for performance
  debounce: 2000,
  maxDebounce: 10000,

  // Quiet mode in production
  quiet: process.env.NODE_ENV === 'production',

  // Extensions
  extensions: [
    new PostgresExtension(databaseUrl),
    new AuthExtension(jwtSecret),
  ],

  // Document initialization hook
  async onLoadDocument(data) {
    return onLoadDocument(data);
  },

  // Connection lifecycle logging
  async onConnect(data) {
    console.log(`[Connect] Client connected to document: ${data.documentName}`);
    console.log(`[Connect] Connection ID: ${data.socketId}`);
    return data;
  },

  async onDisconnect(data) {
    console.log(`[Disconnect] Client disconnected from document: ${data.documentName}`);
  },

  // Error handling
  async onStoreDocument(data) {
    console.log(`[Store] Document stored: ${data.documentName}`);
  },

});

// Start the servers
Promise.all([
  hocuspocus.listen(),
  new Promise<void>((resolve) => {
    app.listen(httpPort, () => resolve());
  }),
]).then(() => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Overwatch Collaboration Server                   ║
╠═══════════════════════════════════════════════════════════╣
║  WebSocket:  ws://localhost:${port}                          ║
║  HTTP API:   http://localhost:${httpPort}                       ║
║  Auth:       http://localhost:${httpPort}/api/auth              ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  await hocuspocus.destroy();
  await pool.end();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
