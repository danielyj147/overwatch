#!/bin/bash
#
# Local Development Deployment Script
# Built by Daniel Jeong
#
# This script sets up Overwatch for local development and testing
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
if [ ! -f "docker-compose.yml" ]; then
    log_error "Please run this script from the project root directory"
    exit 1
fi

log_section "Overwatch Local Development Setup"
echo "Built by Daniel Jeong"
echo ""

# Check prerequisites
log_info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if ! command -v node &> /dev/null; then
    log_warn "Node.js is not installed. You'll need it to run the frontend dev server."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

log_info "All prerequisites satisfied!"

# Check for .env file
if [ ! -f ".env" ]; then
    log_warn ".env file not found. Creating from .env.example..."

    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_info "Created .env file from .env.example"
    else
        log_error ".env.example not found!"
        exit 1
    fi
fi

# Generate secrets if needed
log_section "Checking Secrets Configuration"

if grep -q "change-this" .env || grep -q "your-" .env; then
    log_warn "Default secrets detected in .env file"

    read -p "Generate new secrets automatically? (recommended) (y/n) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Generating secure secrets..."

        # Generate secrets
        JWT_SECRET=$(openssl rand -base64 32 | tr -d '\n')
        ADMIN_SECRET=$(openssl rand -base64 32 | tr -d '\n')
        DB_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')

        # Update .env file
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/HOCUSPOCUS_SECRET=.*/HOCUSPOCUS_SECRET=$JWT_SECRET/" .env
            sed -i '' "s/ADMIN_REGISTRATION_SECRET=.*/ADMIN_REGISTRATION_SECRET=$ADMIN_SECRET/" .env
            sed -i '' "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$DB_PASSWORD/" .env
            sed -i '' "s/:secret@/:$DB_PASSWORD@/" .env
        else
            # Linux
            sed -i "s/HOCUSPOCUS_SECRET=.*/HOCUSPOCUS_SECRET=$JWT_SECRET/" .env
            sed -i "s/ADMIN_REGISTRATION_SECRET=.*/ADMIN_REGISTRATION_SECRET=$ADMIN_SECRET/" .env
            sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$DB_PASSWORD/" .env
            sed -i "s/:secret@/:$DB_PASSWORD@/" .env
        fi

        log_info "✓ Secrets generated and saved to .env"

        echo ""
        log_warn "IMPORTANT: Save your Admin Registration Secret:"
        echo -e "${YELLOW}$ADMIN_SECRET${NC}"
        echo ""
        read -p "Press Enter to continue..."
    fi
else
    log_info "✓ Secrets configuration looks good"
fi

# Stop any running containers
log_section "Cleaning Up Old Containers"

if docker-compose ps -q 2>/dev/null | grep -q .; then
    log_info "Stopping existing containers..."
    docker-compose down
fi

# Start backend services
log_section "Starting Backend Services"

log_info "Starting PostgreSQL, Redis, Martin..."
docker-compose up -d postgres redis martin

log_info "Waiting for database to be ready..."
sleep 10

# Check if database is ready
MAX_RETRIES=30
RETRY_COUNT=0

while ! docker-compose exec -T postgres pg_isready -U overwatch -d overwatch > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        log_error "Database failed to start after ${MAX_RETRIES} attempts"
        docker-compose logs postgres
        exit 1
    fi
    echo -n "."
    sleep 1
done

echo ""
log_info "✓ Database is ready!"

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
        docker-compose exec -T postgres psql -U overwatch -d overwatch < "db/migrations/$migration" 2>&1 | grep -v "already exists" || true
    fi
done

log_info "✓ All migrations completed!"

# Start Hocuspocus
log_section "Starting Collaboration Server"

log_info "Starting Hocuspocus (WebSocket + Auth API)..."
docker-compose up -d hocuspocus

log_info "Waiting for Hocuspocus to be ready..."
sleep 5

log_info "✓ Hocuspocus started!"

# Check service health
log_section "Checking Service Health"

SERVICES=("postgres" "redis" "martin" "hocuspocus")
ALL_HEALTHY=true

for service in "${SERVICES[@]}"; do
    if docker-compose ps | grep -q "$service.*Up"; then
        log_info "✓ $service is running"
    else
        log_error "✗ $service is not running"
        ALL_HEALTHY=false
    fi
done

if [ "$ALL_HEALTHY" = false ]; then
    log_error "Some services failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Frontend setup
log_section "Frontend Setup"

if command -v node &> /dev/null; then
    log_info "Installing frontend dependencies..."
    cd client

    if [ ! -d "node_modules" ]; then
        npm install
    else
        log_info "Dependencies already installed"
    fi

    cd ..

    log_info "Frontend ready!"

    # Instructions
    log_section "Development Environment Ready!"

    echo ""
    echo -e "${GREEN}Backend Services:${NC}"
    echo "  • PostgreSQL:  localhost:5432"
    echo "  • Redis:       localhost:6379"
    echo "  • Martin:      http://localhost:3000"
    echo "  • Hocuspocus:  ws://localhost:1234"
    echo "  • Auth API:    http://localhost:1235"
    echo ""
    echo -e "${GREEN}To start the frontend:${NC}"
    echo "  cd client"
    echo "  npm run dev"
    echo ""
    echo -e "${GREEN}Access the application:${NC}"
    echo "  http://localhost:5173"
    echo ""
    echo -e "${GREEN}Useful commands:${NC}"
    echo "  docker-compose logs -f           # View all logs"
    echo "  docker-compose logs -f postgres  # View PostgreSQL logs"
    echo "  docker-compose ps                # Check service status"
    echo "  docker-compose down              # Stop all services"
    echo "  docker-compose restart           # Restart all services"
    echo ""
    echo -e "${YELLOW}Admin Registration:${NC}"
    echo "  1. Start the frontend (npm run dev)"
    echo "  2. Navigate to http://localhost:5173"
    echo "  3. Click 'Register as Admin'"
    echo "  4. Use the Admin Secret from your .env file"
    echo ""

    read -p "Start frontend dev server now? (y/n) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Starting frontend dev server..."
        cd client
        npm run dev
    else
        log_info "You can start the frontend later with: cd client && npm run dev"
    fi
else
    log_section "Development Environment Ready!"

    echo ""
    echo -e "${YELLOW}Note: Node.js not found${NC}"
    echo "Install Node.js to run the frontend development server"
    echo ""
    echo -e "${GREEN}Backend Services:${NC}"
    echo "  • PostgreSQL:  localhost:5432"
    echo "  • Redis:       localhost:6379"
    echo "  • Martin:      http://localhost:3000"
    echo "  • Hocuspocus:  ws://localhost:1234"
    echo "  • Auth API:    http://localhost:1235"
    echo ""
fi
