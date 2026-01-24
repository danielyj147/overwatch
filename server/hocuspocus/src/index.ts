import { Server } from '@hocuspocus/server';
import { createServer as createHttpServer } from 'http';
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
const server = Server.configure({
  name: 'overwatch-collaboration',
  port,

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

// Create HTTP server for health checks
const httpServer = createHttpServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'hocuspocus',
      connections: server.getConnectionsCount(),
      documents: server.getDocumentsCount(),
    }));
    return;
  }

  // Upgrade to WebSocket is handled by Hocuspocus
  res.writeHead(404);
  res.end('Not Found');
});

// Attach Hocuspocus to HTTP server
server.listen(httpServer);

httpServer.listen(port, () => {
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
  await server.destroy();
  httpServer.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
