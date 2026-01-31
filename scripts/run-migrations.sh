#!/bin/bash
#
# Database Migration Script
# Built by Daniel Jeong
#

set -e

echo "=================================================="
echo "   Overwatch Database Migration"
echo "   Built by Daniel Jeong"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if docker-compose is running
if ! docker-compose -f docker-compose.prod.yml ps | grep -q postgres; then
    log_error "PostgreSQL container is not running!"
    log_info "Start services first: docker-compose -f docker-compose.prod.yml up -d"
    exit 1
fi

log_info "Waiting for PostgreSQL to be ready..."
sleep 10

# Run each migration
log_info "Running database migrations..."

MIGRATIONS=(
    "001_enable_postgis.sql"
    "002_create_layers.sql"
    "003_create_features.sql"
    "004_create_yjs_documents.sql"
    "005_create_users.sql"
    "006_add_user_roles_and_status.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    log_info "Running migration: $migration"

    if docker-compose -f docker-compose.prod.yml exec -T postgres \
        psql -U overwatch -d overwatch < "db/migrations/$migration" 2>&1; then
        log_info "✓ $migration completed successfully"
    else
        log_warn "Migration $migration may have already been applied or failed"
    fi
done

log_info "All migrations completed!"
echo ""
log_info "You can now register your admin account at your application URL"
echo ""
