# Deploy on Local Linux PC

Two deployment options for your local Linux PC.

## Option 1: Development (Quick - 5 minutes)

For local testing, no public access:

```bash
# 1. Install Docker (if not installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Log out and back in

# 2. Start services
cp .env.example .env
docker-compose up -d

# 3. Start frontend
cd client
npm install
npm run dev
```

**Access**: http://localhost:5173

✅ Fast setup
✅ No domain needed
✅ No SSL needed
✅ Perfect for development
❌ Not accessible from internet

---

## Option 2: Production (30 minutes)

For public access with domain and SSL:

### Quick Setup Script

```bash
# Run automated setup
./scripts/local-setup.sh

# Follow the prompts
```

### Manual Setup

#### 1. Prerequisites

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

#### 2. Configure Domain

**Option A: Free Subdomain**
- DuckDNS: https://www.duckdns.org
- Get: `overwatch.duckdns.org`

**Option B: Your Domain**
- Point `overwatch.danielyj.com` to your home IP
- Use Cloudflare DNS (recommended)

#### 3. Router Setup

Forward these ports to your Linux PC:
- Port 80 → 80
- Port 443 → 443

#### 4. Deploy

```bash
# Create .env
cat > .env << 'EOF'
DATABASE_URL=postgresql://overwatch:CHANGE_ME@postgres:5432/overwatch
POSTGRES_USER=overwatch
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=overwatch
REDIS_URL=redis://redis:6379
HOCUSPOCUS_SECRET=CHANGE_ME
NODE_ENV=production
DOMAIN_NAME=overwatch.danielyj.com
EOF

# Generate passwords
echo "DB_PASSWORD=$(openssl rand -base64 32)"
echo "HOCUSPOCUS_SECRET=$(openssl rand -hex 32)"
# Update .env with these values

# Update Caddyfile with your domain
nano Caddyfile

# Build frontend
cd client
cat > .env.production << EOF
VITE_HOCUSPOCUS_URL=wss://overwatch.danielyj.com/ws
VITE_API_URL=https://overwatch.danielyj.com/api
VITE_MARTIN_URL=https://overwatch.danielyj.com/tiles
EOF
npm install
npm run build

# Start production services
cd ..
docker-compose -f docker-compose.aws.yml up -d

# Wait for SSL (1-2 minutes)
docker-compose -f docker-compose.aws.yml logs -f caddy
```

**Access**: https://overwatch.danielyj.com

#### 5. Enable Autostart (Optional)

```bash
# Create systemd service
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

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable overwatch
sudo systemctl start overwatch
```

---

## Management Commands

```bash
# Check status
docker-compose -f docker-compose.aws.yml ps

# View logs
docker-compose -f docker-compose.aws.yml logs -f

# Restart services
docker-compose -f docker-compose.aws.yml restart

# Stop services
docker-compose -f docker-compose.aws.yml down

# Backup database
docker-compose -f docker-compose.aws.yml exec -T postgres \
  pg_dump -U overwatch overwatch > backup-$(date +%Y%m%d).sql
```

---

## Troubleshooting

### Services won't start
```bash
docker-compose -f docker-compose.aws.yml logs
sudo systemctl status docker
```

### Can't access from internet
- Check port forwarding on router
- Verify firewall: `sudo ufw status`
- Test ports: https://www.yougetsignal.com/tools/open-ports/

### SSL certificate fails
```bash
# Check Caddy logs
docker-compose -f docker-compose.aws.yml logs caddy | grep -i acme

# Verify:
# 1. Port 80 is forwarded
# 2. Domain points to your IP
# 3. Cloudflare proxy is OFF (DNS only)
```

### Out of memory
```bash
# Add swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Full Documentation

See [docs/LOCAL-DEPLOYMENT.md](./docs/LOCAL-DEPLOYMENT.md) for:
- Dynamic DNS setup
- Router configuration details
- Systemd service setup
- Backup automation
- Security hardening
- Performance optimization

---

## Local vs AWS Comparison

| Feature | Local PC | AWS EC2 |
|---------|----------|---------|
| **Cost** | Free | $5/month |
| **Setup Time** | 30 min | 30 min |
| **Uptime** | When PC is on | 24/7 |
| **IP Address** | Need DDNS | Static |
| **Bandwidth** | Home internet | Professional |
| **Scaling** | Hardware limited | Easy |

**Choose Local if**:
- You have spare Linux PC
- Want zero hosting cost
- OK with home internet bandwidth
- PC runs 24/7

**Choose AWS if**:
- Need guaranteed uptime
- Want professional infrastructure
- Need consistent performance
- Don't want to manage hardware

---

**Quick Start**: Run `./scripts/local-setup.sh` and follow prompts!
