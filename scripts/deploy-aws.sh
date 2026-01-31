#!/bin/bash
#
# AWS Deployment Script for Overwatch
# Built by Daniel Jeong
#
# This script automates the deployment of Overwatch on a fresh Ubuntu EC2 instance
#

set -e

echo "=================================================="
echo "   Overwatch AWS Deployment Script"
echo "   Built by Daniel Jeong"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on Ubuntu
if [ ! -f /etc/lsb-release ]; then
    log_error "This script is designed for Ubuntu systems"
    exit 1
fi

log_info "Starting deployment process..."

# 1. Update system
log_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
if ! command -v docker &> /dev/null; then
    log_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    log_info "Docker already installed"
fi

# 3. Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    log_info "Installing Docker Compose..."
    sudo apt install -y docker-compose
else
    log_info "Docker Compose already installed"
fi

# 4. Install Node.js (for building frontend)
if ! command -v node &> /dev/null; then
    log_info "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    log_info "Node.js already installed"
fi

# 5. Install other utilities
log_info "Installing utilities..."
sudo apt install -y git curl wget nano htop

# 6. Setup firewall (optional)
read -p "Do you want to setup UFW firewall? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Configuring UFW firewall..."
    sudo ufw allow 22/tcp   # SSH
    sudo ufw allow 80/tcp   # HTTP
    sudo ufw allow 443/tcp  # HTTPS
    sudo ufw allow 1234/tcp # WebSocket
    sudo ufw allow 1235/tcp # Auth API
    sudo ufw --force enable
    log_info "Firewall configured"
fi

# 7. Setup swap space (for low memory instances)
if [ ! -f /swapfile ]; then
    log_info "Setting up swap space (2GB)..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    log_info "Swap space configured"
else
    log_info "Swap space already exists"
fi

# 8. Setup directories
log_info "Creating application directories..."
mkdir -p ~/overwatch
mkdir -p ~/backups

# 9. Configure environment variables
log_info "Setting up environment variables..."
cat > ~/overwatch/.env << 'EOF'
# Database
DATABASE_URL=postgresql://overwatch:CHANGE_THIS_PASSWORD@postgres:5432/overwatch
POSTGRES_USER=overwatch
POSTGRES_PASSWORD=CHANGE_THIS_PASSWORD
POSTGRES_DB=overwatch

# Redis
REDIS_URL=redis://redis:6379

# Hocuspocus
HOCUSPOCUS_PORT=1234
HOCUSPOCUS_HTTP_PORT=1235
HOCUSPOCUS_SECRET=CHANGE_THIS_JWT_SECRET
ADMIN_REGISTRATION_SECRET=CHANGE_THIS_ADMIN_SECRET

# Martin
MARTIN_PORT=3000

# Client - UPDATE WITH YOUR DOMAIN OR IP
VITE_MAP_STYLE_URL=http://YOUR_DOMAIN_OR_IP:3000/style.json
VITE_HOCUSPOCUS_URL=ws://YOUR_DOMAIN_OR_IP:1234
VITE_API_URL=http://YOUR_DOMAIN_OR_IP:1235
VITE_MARTIN_URL=http://YOUR_DOMAIN_OR_IP:3000
EOF

log_warn "IMPORTANT: Edit ~/overwatch/.env and update the following:"
log_warn "  1. Database password"
log_warn "  2. JWT secret (run: openssl rand -base64 32)"
log_warn "  3. Admin secret (run: openssl rand -base64 32)"
log_warn "  4. Replace YOUR_DOMAIN_OR_IP with your actual domain or EC2 IP"
echo ""

# 10. Setup backup script
log_info "Creating backup script..."
cat > ~/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=~/backups

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker-compose -f ~/overwatch/docker-compose.prod.yml exec -T postgres \
  pg_dump -U overwatch overwatch > $BACKUP_DIR/postgres_$DATE.sql

# Backup volumes
docker run --rm \
  -v overwatch_postgres_data:/data \
  -v $BACKUP_DIR:/backup \
  ubuntu tar czf /backup/postgres_data_$DATE.tar.gz /data

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x ~/backup.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup.sh >> ~/backup.log 2>&1") | crontab -

log_info "Backup script created and scheduled (daily at 2 AM)"

# 11. Setup log rotation for Docker
log_info "Configuring Docker log rotation..."
sudo mkdir -p /etc/docker
cat | sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker || true

# 12. Generate secrets helper
log_info "Creating secret generation helper..."
cat > ~/generate-secrets.sh << 'EOF'
#!/bin/bash
echo "JWT Secret:"
openssl rand -base64 32
echo ""
echo "Admin Secret:"
openssl rand -base64 32
EOF

chmod +x ~/generate-secrets.sh

echo ""
echo "=================================================="
log_info "Initial setup complete!"
echo "=================================================="
echo ""
log_warn "Next steps:"
echo "  1. Clone your repository to ~/overwatch/"
echo "     cd ~/overwatch && git clone https://github.com/yourusername/overwatch.git ."
echo ""
echo "  2. Generate secrets:"
echo "     ~/generate-secrets.sh"
echo ""
echo "  3. Edit environment variables:"
echo "     nano ~/overwatch/.env"
echo ""
echo "  4. Build frontend:"
echo "     cd ~/overwatch/client && npm install && npm run build"
echo ""
echo "  5. Start services:"
echo "     cd ~/overwatch && docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "  6. Run database migrations:"
echo "     ./scripts/run-migrations.sh"
echo ""
echo "  7. Register admin account at http://YOUR_IP"
echo ""
log_warn "If you added yourself to the docker group, please log out and back in"
echo ""
