import { Hocuspocus } from '@hocuspocus/server';
import { PostgresExtension } from './extensions/postgres.js';
import { AuthExtension } from './extensions/auth.js';
import { onLoadDocument } from './hooks/onLoadDocument.js';

const port = parseInt(process.env.PORT || '1234', 10);
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.HOCUSPOCUS_SECRET || 'development-secret';

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

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

// Start the server
hocuspocus.listen().then(() => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Overwatch Collaboration Server                   ║
╠═══════════════════════════════════════════════════════════╣
║  WebSocket:  ws://localhost:${port}                          ║
║  Health:     http://localhost:${port}/health                 ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  await hocuspocus.destroy();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
