# Manual EC2 Deployment Guide

**Use this guide when you're already SSH'd into the EC2 instance.**

The `scripts/deploy.sh` is meant to run from your **local machine** with Terraform context. Since you're already on the EC2 instance, follow these steps:

---

## Prerequisites

You should be SSH'd into your EC2 instance:
```bash
ssh -i ~/.ssh/overwatch-ec2 ubuntu@YOUR_EC2_IP
cd ~/overwatch
```

---

## Step 1: Verify Environment File

Check if Terraform's user-data script created the `.env` file:

```bash
ls -la /home/ubuntu/overwatch/.env
```

If it doesn't exist, create it manually:

```bash
cat > /home/ubuntu/overwatch/.env << 'EOF'
# Database
DATABASE_URL=postgresql://overwatch:YOUR_DB_PASSWORD@postgres:5432/overwatch

# Redis
REDIS_URL=redis://redis:6379

# Hocuspocus
HOCUSPOCUS_SECRET=YOUR_JWT_SECRET
HOCUSPOCUS_PORT=1234
HOCUSPOCUS_HTTP_PORT=1235

# Admin Registration
ADMIN_REGISTRATION_SECRET=YOUR_ADMIN_SECRET

# Martin
MARTIN_PORT=3000

# Domain
DOMAIN=your-domain.com
EOF
```

**Replace the placeholders with your actual values from terraform.tfvars**

---

## Step 2: Build Frontend

You have two options:

### Option A: Build on EC2 (Requires Node.js)

```bash
cd /home/ubuntu/overwatch/client

# Create production environment
cat > .env.production << 'EOF'
VITE_MAP_STYLE_URL=https://YOUR_DOMAIN/tiles/style.json
VITE_HOCUSPOCUS_URL=wss://YOUR_DOMAIN/ws
VITE_API_URL=https://YOUR_DOMAIN/api
VITE_MARTIN_URL=https://YOUR_DOMAIN/tiles
EOF

# Install Node.js if not present
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Build
npm ci
npm run build

# Verify
ls -la dist/
```

### Option B: Copy from Local Machine (Recommended)

Build on your local machine and copy:

```bash
# On your LOCAL machine:
cd ~/Projects/overwatch/client
npm ci
npm run build

# Copy to EC2
scp -i ~/.ssh/overwatch-ec2 -r dist ubuntu@YOUR_EC2_IP:/home/ubuntu/overwatch/client/
```

---

## Step 3: Start Docker Services

```bash
cd /home/ubuntu/overwatch

# Pull latest images
docker-compose -f docker-compose.aws.yml pull

# Build custom images (Hocuspocus)
docker-compose -f docker-compose.aws.yml build --no-cache

# Start all services
docker-compose -f docker-compose.aws.yml up -d

# Check status
docker-compose -f docker-compose.aws.yml ps
```

Wait 30 seconds for services to initialize:
```bash
sleep 30
docker-compose -f docker-compose.aws.yml ps
```

All services should show "Up" and some should show "(healthy)".

---

## Step 4: Run Database Migrations

```bash
cd /home/ubuntu/overwatch

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
sleep 10

# Run each migration
for migration in db/migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "Running: $(basename $migration)"
        docker-compose -f docker-compose.aws.yml exec -T postgres \
            psql -U overwatch -d overwatch < "$migration" 2>/dev/null || echo "Already applied or failed"
    fi
done

echo "Migrations complete"
```

---

## Step 5: Verify Deployment

### Check Service Status
```bash
docker-compose -f docker-compose.aws.yml ps
```

You should see all services running:
- caddy
- postgres
- redis
- martin
- hocuspocus

### Check Logs
```bash
# All logs
docker-compose -f docker-compose.aws.yml logs

# Specific service
docker-compose -f docker-compose.aws.yml logs caddy
docker-compose -f docker-compose.aws.yml logs hocuspocus

# Follow logs
docker-compose -f docker-compose.aws.yml logs -f
```

### Test Endpoints

```bash
# Health check (from EC2)
curl http://localhost:1235/health

# Check if Caddy is serving (from EC2)
curl -I http://localhost:80

# Test from outside (from your local machine)
curl https://YOUR_DOMAIN
```

---

## Step 6: Access Your Application

1. **Wait 1-2 minutes** for Caddy to obtain SSL certificate
2. Visit **https://YOUR_DOMAIN** in browser
3. Click **"Register as Admin"**
4. Use your `ADMIN_REGISTRATION_SECRET` from the `.env` file
5. Create your admin account

---

## Troubleshooting

### Services Not Starting

```bash
# Check logs for errors
docker-compose -f docker-compose.aws.yml logs

# Restart specific service
docker-compose -f docker-compose.aws.yml restart hocuspocus

# Rebuild and restart
docker-compose -f docker-compose.aws.yml down
docker-compose -f docker-compose.aws.yml up -d --build
```

### Database Connection Issues

```bash
# Check if PostgreSQL is ready
docker-compose -f docker-compose.aws.yml exec postgres \
    psql -U overwatch -d overwatch -c "SELECT version();"

# Check environment variables
docker-compose -f docker-compose.aws.yml exec hocuspocus printenv | grep DATABASE
```

### Frontend Not Loading

```bash
# Verify dist directory exists
ls -la /home/ubuntu/overwatch/client/dist/

# Check Caddy logs
docker-compose -f docker-compose.aws.yml logs caddy

# Rebuild Caddy
docker-compose -f docker-compose.aws.yml restart caddy
```

### SSL Certificate Issues

```bash
# Check Caddy logs
docker-compose -f docker-compose.aws.yml logs caddy | grep -i cert

# Verify DNS points to EC2
dig YOUR_DOMAIN

# Check Cloudflare proxy status (should be DNS only, not proxied)
```

---

## Quick Commands Reference

```bash
# Check all services
docker-compose -f docker-compose.aws.yml ps

# View logs
docker-compose -f docker-compose.aws.yml logs -f

# Restart all
docker-compose -f docker-compose.aws.yml restart

# Stop all
docker-compose -f docker-compose.aws.yml down

# Start all
docker-compose -f docker-compose.aws.yml up -d

# Rebuild and restart
docker-compose -f docker-compose.aws.yml up -d --build

# Check resource usage
docker stats
```

---

## Updating Application

When you make code changes:

```bash
# 1. SSH to EC2
ssh -i ~/.ssh/overwatch-ec2 ubuntu@YOUR_EC2_IP

# 2. Pull latest code
cd /home/ubuntu/overwatch
git pull origin master

# 3. Rebuild frontend (if client changed)
cd client && npm ci && npm run build && cd ..

# 4. Restart services
docker-compose -f docker-compose.aws.yml up -d --build

# 5. Run new migrations (if any)
for migration in db/migrations/*.sql; do
    docker-compose -f docker-compose.aws.yml exec -T postgres \
        psql -U overwatch -d overwatch < "$migration" 2>/dev/null || true
done
```

---

## Need Automated Deployment?

For automated deployments, use **GitHub Actions** from your local machine:

1. Add secrets to GitHub repository (see `.github/DEPLOYMENT_SECRETS.md`)
2. Push to master branch
3. GitHub Actions will automatically deploy

Or use the deployment script from your **local machine**:
```bash
cd ~/Projects/overwatch
./scripts/deploy.sh
```

**Built by Daniel Jeong**
