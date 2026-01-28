# Local Linux PC Deployment Guide

Deploy Overwatch on your local Linux PC with full production features.

## Table of Contents

- [Quick Start (Development)](#quick-start-development)
- [Production Deployment](#production-deployment)
- [Domain Configuration](#domain-configuration)
- [Systemd Service Setup](#systemd-service-setup)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Quick Start (Development)

For local development without public access.

### 1. Install Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Log out and back in for Docker group to take effect
```

### 2. Clone and Setup

```bash
# Clone repository
git clone https://github.com/danielyj147/overwatch.git
cd overwatch

# Copy environment file
cp .env.example .env

# Edit .env with your preferences (optional)
nano .env
```

### 3. Start Services

```bash
# Start all backend services
docker-compose up -d

# Wait for services to be healthy
docker-compose ps

# Check logs
docker-compose logs -f
```

### 4. Start Frontend

```bash
cd client

# Install dependencies
npm install

# Start dev server
npm run dev
```

**Access**: http://localhost:5173

**Default ports**:
- Frontend: 5173
- Hocuspocus: 1234
- Martin: 3000
- PostgreSQL: 5432
- Redis: 6379

---

## Production Deployment

Make Overwatch accessible from the internet with SSL.

### Architecture

```
Internet
   ↓
Your Home Router (Port Forwarding: 80, 443)
   ↓
Linux PC (192.168.1.x)
   ↓
Caddy (Reverse Proxy + SSL)
   ├─→ Frontend (Static Files)
   ├─→ Hocuspocus (WebSocket)
   └─→ Martin (Vector Tiles)
```

### 1. Setup Dynamic DNS (If No Static IP)

#### Option A: DuckDNS (Free)

```bash
# Create account at https://www.duckdns.org
# Choose subdomain: overwatch.duckdns.org

# Install DuckDNS updater
mkdir -p ~/duckdns
cd ~/duckdns

# Create update script
cat > duck.sh << 'EOF'
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=overwatch&token=YOUR_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
EOF

chmod +x duck.sh

# Test it
./duck.sh
cat duck.log  # Should say "OK"

# Add to crontab (update every 5 minutes)
crontab -e
# Add line: */5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

#### Option B: No-IP (Free)

1. Create account at https://www.noip.com
2. Choose hostname: overwatch.ddns.net
3. Install DUC client:
   ```bash
   cd /usr/local/src
   sudo wget http://www.noip.com/client/linux/noip-duc-linux.tar.gz
   sudo tar xzf noip-duc-linux.tar.gz
   cd noip-2.1.9-1
   sudo make
   sudo make install
   sudo noip2 -C  # Configure with your credentials
   sudo noip2     # Start service
   ```

### 2. Router Port Forwarding

Configure your router to forward ports to your Linux PC:

| External Port | Internal Port | Internal IP | Protocol |
|--------------|---------------|-------------|----------|
| 80 | 80 | 192.168.1.x | TCP |
| 443 | 443 | 192.168.1.x | TCP |

**Steps** (varies by router):
1. Find your PC's local IP: `ip addr show`
2. Access router admin (usually 192.168.1.1 or 192.168.0.1)
3. Navigate to Port Forwarding / Virtual Servers
4. Add rules above
5. Save and reboot router

### 3. Configure Cloudflare (Optional but Recommended)

If using your own domain (danielyj.com):

1. **Cloudflare Dashboard** → DNS
2. **Add A Record**:
   - Type: A
   - Name: overwatch
   - Content: YOUR_HOME_IP (get from https://whatismyip.com)
   - Proxy status: **DNS only (gray cloud)** ← Important!
   - TTL: Auto

### 4. Update Environment Files

```bash
cd ~/overwatch

# Update .env
cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://overwatch:CHANGE_ME@postgres:5432/overwatch
POSTGRES_USER=overwatch
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=overwatch

# Redis
REDIS_URL=redis://redis:6379

# Hocuspocus
HOCUSPOCUS_SECRET=CHANGE_ME
NODE_ENV=production

# Domain (use your actual domain)
DOMAIN_NAME=overwatch.danielyj.com
EOF

# Generate secure passwords
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "HOCUSPOCUS_SECRET=$(openssl rand -hex 32)"
# Copy these to .env file

# Update Caddyfile domain
nano Caddyfile
# Change {$DOMAIN_NAME} to your actual domain
```

### 5. Build Frontend

```bash
cd client

# Create production environment
cat > .env.production << EOF
VITE_HOCUSPOCUS_URL=wss://overwatch.danielyj.com/ws
VITE_API_URL=https://overwatch.danielyj.com/api
VITE_MARTIN_URL=https://overwatch.danielyj.com/tiles
EOF

# Build
npm install
npm run build

# Verify build
ls -la dist/
```

### 6. Start Production Stack

```bash
cd ~/overwatch

# Start with production compose file
docker-compose -f docker-compose.aws.yml up -d

# Check status
docker-compose -f docker-compose.aws.yml ps

# View logs
docker-compose -f docker-compose.aws.yml logs -f
```

### 7. Wait for SSL Certificate

Caddy will automatically obtain SSL certificate from Let's Encrypt.

**Check progress**:
```bash
docker-compose -f docker-compose.aws.yml logs caddy | grep -i acme
```

**Common issues**:
- Port 80 not forwarded → SSL fails
- Domain not pointing to correct IP → SSL fails
- Takes 1-2 minutes on first run

### 8. Verify Deployment

```bash
# Test health endpoint
curl https://overwatch.danielyj.com/health

# Should return: OK
```

**Open in browser**: https://overwatch.danielyj.com

---

## Domain Configuration

### Option 1: Use Free Subdomain

**DuckDNS**: overwatch.duckdns.org
**No-IP**: overwatch.ddns.net

Update Caddyfile:
```
overwatch.duckdns.org {
    # ... rest of config
}
```

### Option 2: Use Your Own Domain

**Example**: overwatch.danielyj.com

1. Point domain to your home IP (via Cloudflare or DNS provider)
2. Update Caddyfile with your domain
3. Ensure port 80 is accessible for Let's Encrypt

### Option 3: Localhost Only (No Domain)

For local network access only:

```bash
# Use docker-compose.yml instead
docker-compose up -d

# Access via local IP
http://192.168.1.x:5173  # Frontend
http://192.168.1.x:1234  # Hocuspocus
http://192.168.1.x:3000  # Martin
```

---

## Systemd Service Setup

Run Overwatch as a system service (starts on boot).

### Create Service File

```bash
sudo nano /etc/systemd/system/overwatch.service
```

```ini
[Unit]
Description=Overwatch Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/YOUR_USERNAME/overwatch
ExecStart=/usr/bin/docker compose -f docker-compose.aws.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.aws.yml down
User=YOUR_USERNAME
Group=YOUR_USERNAME

[Install]
WantedBy=multi-user.target
```

**Replace**:
- `YOUR_USERNAME` with your actual username

### Enable and Start

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable overwatch

# Start service now
sudo systemctl start overwatch

# Check status
sudo systemctl status overwatch

# View logs
journalctl -u overwatch -f
```

### Service Commands

```bash
# Start
sudo systemctl start overwatch

# Stop
sudo systemctl stop overwatch

# Restart
sudo systemctl restart overwatch

# Status
sudo systemctl status overwatch

# Disable autostart
sudo systemctl disable overwatch
```

---

## Monitoring

### Check Service Status

```bash
cd ~/overwatch
docker-compose -f docker-compose.aws.yml ps
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.aws.yml logs -f

# Specific service
docker-compose -f docker-compose.aws.yml logs -f caddy

# Last 100 lines
docker-compose -f docker-compose.aws.yml logs --tail=100
```

### Resource Usage

```bash
# Real-time stats
docker stats

# Disk usage
df -h

# Memory usage
free -h

# Network connections
ss -tulpn | grep -E ':(80|443|1234|3000|5432|6379)'
```

### Health Checks

```bash
# Test endpoints
curl http://localhost/health                    # Via Caddy
curl http://localhost:1234                      # Hocuspocus
curl http://localhost:3000/health               # Martin

# Test database
docker-compose exec postgres pg_isready -U overwatch

# Test Redis
docker-compose exec redis redis-cli ping
```

---

## Backup and Restore

### Backup Database

```bash
# Create backup directory
mkdir -p ~/overwatch-backups

# Backup
cd ~/overwatch
docker-compose -f docker-compose.aws.yml exec -T postgres \
  pg_dump -U overwatch overwatch > ~/overwatch-backups/backup-$(date +%Y%m%d-%H%M%S).sql

# Compress
gzip ~/overwatch-backups/backup-*.sql
```

### Automated Backups

```bash
# Create backup script
cat > ~/backup-overwatch.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/overwatch-backups"
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

cd "$HOME/overwatch"
docker-compose -f docker-compose.aws.yml exec -T postgres \
  pg_dump -U overwatch overwatch | gzip > "$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql.gz"

# Delete old backups
find "$BACKUP_DIR" -name "backup-*.sql.gz" -mtime +$KEEP_DAYS -delete
EOF

chmod +x ~/backup-overwatch.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/YOUR_USERNAME/backup-overwatch.sh
```

### Restore Database

```bash
# Stop application
cd ~/overwatch
docker-compose -f docker-compose.aws.yml down

# Start only database
docker-compose -f docker-compose.aws.yml up -d postgres

# Restore
gunzip < ~/overwatch-backups/backup-20260127-020000.sql.gz | \
  docker-compose -f docker-compose.aws.yml exec -T postgres \
  psql -U overwatch overwatch

# Start all services
docker-compose -f docker-compose.aws.yml up -d
```

---

## Updating

### Update Application Code

```bash
cd ~/overwatch

# Pull latest code
git pull origin master

# Rebuild frontend
cd client
npm install
npm run build

# Restart services
cd ..
docker-compose -f docker-compose.aws.yml restart

# Or full rebuild
docker-compose -f docker-compose.aws.yml down
docker-compose -f docker-compose.aws.yml up -d --build
```

### Update Docker Images

```bash
cd ~/overwatch

# Pull latest images
docker-compose -f docker-compose.aws.yml pull

# Recreate containers
docker-compose -f docker-compose.aws.yml up -d

# Remove old images
docker image prune -a
```

### Update System

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Update Docker
sudo apt install docker-ce docker-ce-cli containerd.io

# Reboot if kernel updated
sudo reboot
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose -f docker-compose.aws.yml logs

# Check ports
sudo ss -tulpn | grep -E ':(80|443)'

# Check Docker
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker
```

### SSL Certificate Issues

```bash
# Check Caddy logs
docker-compose -f docker-compose.aws.yml logs caddy | grep -i acme

# Common issues:
# 1. Port 80 not accessible from internet
# 2. Domain not pointing to your IP
# 3. Cloudflare proxy enabled (must be DNS only)

# Test port 80 accessibility
curl http://overwatch.danielyj.com/.well-known/acme-challenge/test
```

### Cannot Access from Internet

```bash
# Test from inside network
curl http://localhost

# Check port forwarding
# 1. Verify router settings
# 2. Check firewall: sudo ufw status
# 3. Test external IP: curl https://whatismyip.com

# Check if ports are open (from external site)
# Visit: https://www.yougetsignal.com/tools/open-ports/
# Test ports: 80, 443
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes
docker volume prune

# Clean old backups
find ~/overwatch-backups -mtime +30 -delete

# Clean logs
sudo journalctl --vacuum-time=7d
```

### High Memory Usage

```bash
# Check usage
docker stats --no-stream

# Reduce memory limits (edit docker-compose.aws.yml)
# Restart services
docker-compose -f docker-compose.aws.yml restart

# Add swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
# Make permanent:
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Database Connection Errors

```bash
# Check PostgreSQL
docker-compose -f docker-compose.aws.yml exec postgres pg_isready

# Check connection string in .env
cat .env

# Restart database
docker-compose -f docker-compose.aws.yml restart postgres

# View database logs
docker-compose -f docker-compose.aws.yml logs postgres
```

---

## Security Hardening

### Firewall Setup

```bash
# Install UFW
sudo apt install ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (if remote access needed)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Fail2Ban (SSH Protection)

```bash
# Install
sudo apt install fail2ban

# Enable
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status sshd
```

### Docker Security

```bash
# Run as non-root user (already configured in docker-compose)

# Keep system updated
sudo apt update && sudo apt upgrade -y

# Monitor logs
docker-compose -f docker-compose.aws.yml logs | grep -i error
```

---

## Performance Optimization

### System Tweaks

```bash
# Increase file limits
echo "fs.file-max = 100000" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Optimize PostgreSQL
# Edit docker-compose.aws.yml:
# - shared_buffers=256MB (25% of RAM)
# - effective_cache_size=1GB (50-75% of RAM)
```

### Monitoring Setup

```bash
# Install htop
sudo apt install htop

# Monitor resources
htop

# Monitor network
sudo apt install iftop
sudo iftop
```

---

## Comparison: Local vs Cloud

| Aspect | Local PC | AWS EC2 |
|--------|----------|---------|
| **Cost** | Free (electricity only) | $5-15/month |
| **Setup** | 30 min | 30 min |
| **Performance** | Depends on PC | Consistent |
| **Uptime** | When PC is on | 24/7 |
| **IP Address** | Dynamic (need DDNS) | Static |
| **Bandwidth** | Home internet | AWS bandwidth |
| **Maintenance** | Your responsibility | Shared responsibility |
| **Scalability** | Hardware limited | Easy to scale |

---

## Next Steps

After deployment:

1. ✅ Set up automated backups
2. ✅ Configure systemd service
3. ✅ Enable firewall
4. ✅ Set up monitoring
5. ✅ Test from external network
6. ✅ Document your specific setup

---

**Last Updated**: January 2026
