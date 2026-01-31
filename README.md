# Overwatch

**Built by Daniel Jeong**

A real-time collaborative Common Operational Picture (COP) platform. Think of it as "Google Docs for maps" — when one operative draws, marks, or annotates the map, every connected user sees the change instantly.

![Overwatch Screenshot 1](./assets/static/overwatch1.png)
![Overwatch Screenshot 2](./assets/static/overwatch2.png)

## Features

- ✨ Real-time collaborative drawing and annotation (CRDT-based, conflict-free)
- 🗺️ High-performance vector tile rendering for large-scale deployments
- 📍 Multi-layer operational overlays (units, routes, zones, threats)
- 🔄 Offline-first architecture with sync-on-reconnect
- 🔐 Role-based access control with admin approval system
- 👥 Admin dashboard for user management
- 🎨 Modern, futuristic UI design

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

## Deployment Options

### Windows 11

Deploy on Windows 11 Mini PC:

```powershell
# Quick setup script (PowerShell)
.\scripts\windows-setup.ps1 -Mode dev

# Or see: WINDOWS-DEPLOY.md
```

**Options**:
- 🏠 **Development**: Localhost only, 5-minute setup
- 🌐 **Production**: Public access with SSL, 30-minute setup

See [Windows Deployment Guide](./WINDOWS-DEPLOY.md)

### Local Linux PC

Deploy on your local Linux machine:

```bash
# Quick setup script
./scripts/local-setup.sh

# Or see: LOCAL-DEPLOY.md
```

**Options**:
- 🏠 **Development**: Localhost only, 5-minute setup
- 🌐 **Production**: Public access with SSL, 30-minute setup

See [Local Deployment Guide](./LOCAL-DEPLOY.md)

### AWS Cloud

Deploy to AWS for **~$10-12/month** (or **~$3-5 with free tier**):

#### Quick Deploy (5 Steps)

```bash
# 1. Launch EC2 t3.micro instance (Ubuntu 22.04)
# 2. SSH and clone repository
git clone https://github.com/yourusername/overwatch.git
cd overwatch

# 3. Run automated setup
./scripts/deploy-aws.sh

# 4. Configure environment
nano .env  # Update secrets and IP

# 5. Deploy
cd client && npm install && npm run build && cd ..
docker-compose -f docker-compose.prod.yml up -d
./scripts/run-migrations.sh
```

**Complete Documentation**:
- 🚀 [Quick Start AWS](./QUICK_START_AWS.md) - 5-minute reference guide
- 📘 [AWS Deployment Guide](./AWS_DEPLOYMENT_GUIDE.md) - Detailed walkthrough
- 📝 [Deployment Summary](./AWS_DEPLOYMENT_SUMMARY.md) - What you get
- 🔧 [Setup Admin Guide](./SETUP_ADMIN.md) - Admin system setup

**Features**:
- ✅ Single EC2 instance (all services in Docker)
- ✅ Cost-effective deployment (~$10-12/month, ~$3-5 with free tier)
- ✅ Automated deployment scripts
- ✅ Health monitoring and backups
- ✅ Production-ready configuration
- ✅ Easy to scale horizontally

**Helper Scripts**:
```bash
./scripts/deploy-aws.sh      # Automated AWS EC2 setup
./scripts/run-migrations.sh  # Run database migrations
./scripts/check-health.sh    # Check service health
./scripts/update-app.sh      # Update application
~/backup.sh                  # Backup database (auto-created)
```

**Architecture**: Single EC2 instance running Nginx, Client, Hocuspocus, Martin, PostgreSQL, and Redis in Docker containers (~1GB RAM total).

### GitHub Actions (CI/CD)

Automatic deployment on every push to master:

1. **Add GitHub Secrets** (Settings → Secrets):
   - `EC2_SSH_KEY` - Your SSH private key
   - `EC2_HOST` - EC2 instance IP
   - `DOMAIN_NAME` - overwatch.danielyj.com

2. **Push to master** - Deployment starts automatically

See [GitHub Actions Setup](./.github/DEPLOY.md) for details.

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

## Admin System

Overwatch now includes a complete admin approval system:

### User Flows

**Admin Registration:**
1. Click "Register as Admin" on login screen
2. Enter credentials + admin secret key
3. Immediately logged in → Admin Dashboard

**User Registration:**
1. Sign up with email/password
2. See "Please wait for admin approval" message
3. Cannot log in until approved by admin

**Admin Approval:**
1. Admin sees pending users in dashboard
2. Reviews and approves/rejects
3. User can immediately log in after approval

See [SETUP_ADMIN.md](./SETUP_ADMIN.md) for detailed setup instructions.

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/admin/register` | POST | Admin Secret | Register admin |
| `/api/auth/signup` | POST | None | Register user (pending) |
| `/api/auth/login` | POST | None | Login (approved only) |
| `/api/auth/admin/pending-users` | GET | Admin JWT | List pending users |
| `/api/auth/admin/approve/:userId` | POST | Admin JWT | Approve user |
| `/api/auth/admin/reject/:userId` | POST | Admin JWT | Reject user |

## License

MIT

## Author

**Daniel Jeong**

A production-ready real-time collaborative mapping platform.
