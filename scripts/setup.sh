#!/bin/bash
set -e

echo "=== Overwatch Setup ==="

# Check for required tools
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || command -v "docker compose" >/dev/null 2>&1 || { echo "Docker Compose is required but not installed. Aborting." >&2; exit 1; }

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please review and update .env with your configuration"
fi

# Start infrastructure
echo "Starting infrastructure services..."
docker-compose up -d postgres redis

# Wait for postgres to be ready
echo "Waiting for PostgreSQL to be ready..."
until docker-compose exec -T postgres pg_isready -U overwatch -d overwatch > /dev/null 2>&1; do
    sleep 2
done
echo "PostgreSQL is ready!"

# Start Martin
echo "Starting Martin vector tile server..."
docker-compose up -d martin

# Wait for Martin to be ready
echo "Waiting for Martin to be ready..."
sleep 5

# Build and start Hocuspocus
echo "Building and starting Hocuspocus..."
docker-compose up -d --build hocuspocus

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Services running:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - Martin: localhost:3000"
echo "  - Hocuspocus: localhost:1234"
echo ""
echo "To start the frontend development server:"
echo "  cd client && pnpm install && pnpm dev"
echo ""
