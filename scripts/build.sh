#!/bin/bash
# Build script for production deployment

set -e

echo "=== Overwatch Production Build ==="

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Build client
echo "Building client..."
cd client
npm install
npm run build
cd ..

# Build Docker images
echo "Building Docker images..."
docker-compose -f docker-compose.prod.yml build

echo ""
echo "=== Build Complete ==="
echo ""
echo "To start the production stack:"
echo "  docker-compose -f docker-compose.prod.yml up -d"
echo ""
