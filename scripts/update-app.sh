#!/bin/bash
#
# Update Application Script
# Built by Daniel Jeong
#

set -e

echo "=================================================="
echo "   Overwatch Application Update"
echo "   Built by Daniel Jeong"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Backup current state
log_info "Creating backup before update..."
./scripts/backup.sh || true

# Pull latest changes
log_info "Pulling latest changes from Git..."
git pull origin master

# Rebuild and restart services
log_info "Rebuilding containers..."
docker-compose -f docker-compose.prod.yml build

log_info "Restarting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
log_info "Waiting for services to start..."
sleep 15

# Check health
log_info "Running health check..."
./scripts/check-health.sh

log_info "Update completed successfully!"
echo ""
log_warn "Check logs if you notice any issues:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
