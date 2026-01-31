#!/bin/bash
#
# Local Production Build Script
# Built by Daniel Jeong
#
# This script builds and runs Overwatch in production mode locally
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

# Check if running from project root
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "Please run this script from the project root directory"
    exit 1
fi

log_section "Overwatch Local Production Build"
echo "Built by Daniel Jeong"
echo ""

# Check prerequisites
log_info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
fi

if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
fi

log_info "✓ All prerequisites satisfied"

# Check for .env file
if [ ! -f ".env" ]; then
    log_error ".env file not found. Run ./scripts/local-dev.sh first"
    exit 1
fi

# Build frontend
log_section "Building Frontend"

cd client
log_info "Installing dependencies..."
npm install

log_info "Building production bundle..."
npm run build

if [ ! -d "dist" ]; then
    log_error "Frontend build failed - dist directory not found"
    exit 1
fi

log_info "✓ Frontend built successfully!"
cd ..

# Stop any running containers
log_section "Preparing Environment"

if docker-compose -f docker-compose.prod.yml ps -q 2>/dev/null | grep -q .; then
    log_info "Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down
fi

# Start services
log_section "Starting Production Services"

log_info "Starting all services..."
docker-compose -f docker-compose.prod.yml up -d

log_info "Waiting for services to be ready..."
sleep 15

# Run migrations
log_section "Running Database Migrations"

MIGRATIONS=(
    "001_enable_postgis.sql"
    "002_create_layers.sql"
    "003_create_features.sql"
    "004_create_yjs_documents.sql"
    "005_create_users.sql"
    "006_add_user_roles_and_status.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    if [ -f "db/migrations/$migration" ]; then
        log_info "Running migration: $migration"
        docker-compose -f docker-compose.prod.yml exec -T postgres \
            psql -U overwatch -d overwatch < "db/migrations/$migration" 2>&1 | \
            grep -v "already exists" || true
    fi
done

log_info "✓ All migrations completed!"

# Check service health
log_section "Checking Service Health"

SERVICES=("postgres" "redis" "martin" "hocuspocus" "nginx")
ALL_HEALTHY=true

for service in "${SERVICES[@]}"; do
    if docker-compose -f docker-compose.prod.yml ps | grep -q "$service.*Up"; then
        log_info "✓ $service is running"
    else
        log_error "✗ $service is not running"
        ALL_HEALTHY=false
    fi
done

if [ "$ALL_HEALTHY" = false ]; then
    log_error "Some services failed to start"
    docker-compose -f docker-compose.prod.yml logs --tail=50
    exit 1
fi

# Success
log_section "Production Environment Ready!"

echo ""
echo -e "${GREEN}Application is running at:${NC}"
echo "  http://localhost"
echo ""
echo -e "${GREEN}Services:${NC}"
echo "  • Frontend:     http://localhost"
echo "  • Auth API:     http://localhost:1235"
echo "  • WebSocket:    ws://localhost:1234"
echo "  • Vector Tiles: http://localhost:3000"
echo ""
echo -e "${GREEN}Useful commands:${NC}"
echo "  docker-compose -f docker-compose.prod.yml logs -f    # View logs"
echo "  docker-compose -f docker-compose.prod.yml ps         # Check status"
echo "  docker-compose -f docker-compose.prod.yml restart    # Restart"
echo "  docker-compose -f docker-compose.prod.yml down       # Stop"
echo ""
echo -e "${YELLOW}Admin Registration:${NC}"
echo "  1. Navigate to http://localhost"
echo "  2. Click 'Register as Admin'"
echo "  3. Use the Admin Secret from your .env file"
echo ""
echo -e "${GREEN}✓ Production build complete!${NC}"
echo ""
