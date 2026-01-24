# Overwatch

A real-time collaborative Common Operational Picture (COP) platform. Think of it as "Google Docs for maps" — when one operative draws, marks, or annotates the map, every connected user sees the change instantly.

## Features

- Real-time collaborative drawing and annotation (CRDT-based, conflict-free)
- High-performance vector tile rendering for large-scale deployments
- Multi-layer operational overlays (units, routes, zones, threats)
- Offline-first architecture with sync-on-reconnect
- Role-based access control for sensitive operational data

## Technology Stack

### Frontend
- **MapLibre GL JS** - Core map rendering (WebGL-based)
- **Deck.gl** - High-performance data visualization layers
- **Yjs** - CRDT library for real-time collaboration
- **React** - UI framework
- **Vite** - Build tooling

### Backend
- **Hocuspocus** - Yjs WebSocket server with persistence
- **Martin** - Rust-based vector tile server
- **PostgreSQL + PostGIS** - Spatial database
- **Redis** - Pub/sub and caching

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- pnpm (recommended) or npm

## Quick Start

### 1. Clone and setup

```bash
git clone <repo-url> overwatch
cd overwatch
cp .env.example .env
```

### 2. Start infrastructure services

```bash
docker-compose up -d postgres redis martin
```

Wait for services to be healthy:

```bash
docker-compose ps
```

### 3. Start the collaboration server

```bash
docker-compose up -d hocuspocus
```

### 4. Start the frontend development server

```bash
cd client
pnpm install
pnpm dev
```

The application will be available at `http://localhost:5173`.

## Development

### Project Structure

```
overwatch/
├── client/          # React frontend application
├── server/
│   ├── hocuspocus/  # Yjs collaboration server
│   └── api/         # REST API server
├── martin/          # Vector tile server config
├── db/
│   ├── migrations/  # Database migrations
│   └── seeds/       # Sample data
├── nginx/           # Reverse proxy config
└── scripts/         # Utility scripts
```

### Running Services Individually

```bash
# Database only
docker-compose up -d postgres

# Vector tiles
docker-compose up -d martin

# Collaboration server
docker-compose up -d hocuspocus

# View logs
docker-compose logs -f <service-name>
```

### Database Migrations

Migrations run automatically when the PostgreSQL container starts. To add a new migration:

1. Create a new SQL file in `db/migrations/` with the next sequence number
2. Restart the postgres container or run manually:

```bash
docker-compose exec postgres psql -U overwatch -d overwatch -f /docker-entrypoint-initdb.d/XXX_migration.sql
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://overwatch:secret@localhost:5432/overwatch` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `HOCUSPOCUS_PORT` | Collaboration server port | `1234` |
| `HOCUSPOCUS_SECRET` | JWT secret for auth | - |
| `MARTIN_PORT` | Vector tile server port | `3000` |
| `VITE_MAP_STYLE_URL` | Martin style endpoint | `http://localhost:3000/style.json` |
| `VITE_HOCUSPOCUS_URL` | WebSocket endpoint | `ws://localhost:1234` |

## Architecture

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation.

## License

MIT
