# Deploy on Windows 11

Quick guide to deploy Overwatch on Windows 11 Mini PC.

## Option 1: Development (Quick - 5 minutes)

For local testing, no public access:

### Prerequisites

1. **Install Docker Desktop**: https://www.docker.com/products/docker-desktop/
   - Enable WSL 2 during installation
   - Restart Windows
   - Start Docker Desktop

2. **Install Node.js 20**: https://nodejs.org/

### Setup

Open **PowerShell**:

```powershell
# Clone repository
git clone https://github.com/danielyj147/overwatch.git
cd overwatch

# Run setup script
.\scripts\windows-setup.ps1 -Mode dev

# Start frontend (in new PowerShell window)
cd client
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

### Prerequisites

Same as Option 1, plus:
- **Domain name** (free: duckdns.org or your own)
- **Port forwarding** on router (80, 443)

### Automated Setup

Open **PowerShell**:

```powershell
cd overwatch

# Run production setup
.\scripts\windows-setup.ps1 -Mode prod

# Follow the prompts
```

### Manual Setup

#### 1. Configure Environment

```powershell
# Generate passwords
$dbPassword = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# Create .env
@"
DATABASE_URL=postgresql://overwatch:${dbPassword}@postgres:5432/overwatch
POSTGRES_USER=overwatch
POSTGRES_PASSWORD=${dbPassword}
POSTGRES_DB=overwatch
REDIS_URL=redis://redis:6379
HOCUSPOCUS_SECRET=${jwtSecret}
NODE_ENV=production
DOMAIN_NAME=overwatch.danielyj.com
"@ | Out-File -Encoding UTF8 .env

# Display passwords (save these!)
Write-Host "DB Password: $dbPassword"
Write-Host "JWT Secret: $jwtSecret"
```

#### 2. Update Caddyfile

```powershell
# Replace domain in Caddyfile
$domain = "overwatch.danielyj.com"
(Get-Content Caddyfile) -replace '\{\$DOMAIN_NAME\}', $domain | Set-Content Caddyfile
```

#### 3. Build Frontend

```powershell
cd client

# Create production config
$domain = "overwatch.danielyj.com"
@"
VITE_HOCUSPOCUS_URL=wss://${domain}/ws
VITE_API_URL=https://${domain}/api
VITE_MARTIN_URL=https://${domain}/tiles
"@ | Out-File -Encoding UTF8 .env.production

# Build
npm install
npm run build
```

#### 4. Configure Firewall

Open **PowerShell as Administrator**:

```powershell
# Allow HTTP and HTTPS
New-NetFirewallRule -DisplayName "Overwatch HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Overwatch HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

#### 5. Configure Router

Forward these ports to your Windows PC:
- **Port 80** → 80 (HTTP)
- **Port 443** → 443 (HTTPS)

**Find your PC's IP**:
```powershell
ipconfig
# Look for "IPv4 Address" (e.g., 192.168.1.100)
```

#### 6. Setup Domain

**Option A: Free (DuckDNS)**
1. Create account: https://www.duckdns.org
2. Choose subdomain: `overwatch`
3. Full domain: `overwatch.duckdns.org`

**Option B: Your Domain**
- Point domain to your home IP
- Use Cloudflare (recommended)
- Set to **DNS only** (gray cloud)

#### 7. Start Services

```powershell
cd ..
docker-compose -f docker-compose.aws.yml up -d

# Wait for SSL (1-2 minutes)
docker-compose -f docker-compose.aws.yml logs -f caddy
```

**Access**: https://overwatch.danielyj.com

---

## Management

### Start Services

```powershell
docker-compose -f docker-compose.aws.yml up -d
```

### Stop Services

```powershell
docker-compose -f docker-compose.aws.yml down
```

### View Logs

```powershell
# All services
docker-compose -f docker-compose.aws.yml logs -f

# Specific service
docker-compose -f docker-compose.aws.yml logs -f caddy
```

### Check Status

```powershell
docker-compose -f docker-compose.aws.yml ps
docker stats
```

### Backup Database

```powershell
# Run backup script
.\scripts\windows-backup.ps1

# Backups saved to: .\backups\
```

---

## Auto-Start on Boot

### Method 1: Docker Desktop (Easiest)

1. **Docker Desktop** → Settings → General
2. ✅ Start Docker Desktop when you log in
3. Docker will auto-start containers

### Method 2: Task Scheduler

1. Open **Task Scheduler**
2. Create Task:
   - Name: `Overwatch Auto-Start`
   - Trigger: At startup
   - Action: Start program
   - Program: `powershell.exe`
   - Arguments: `-File "C:\path\to\overwatch\scripts\windows-setup.ps1" -Mode prod`

---

## Troubleshooting

### Docker not starting

**Check WSL 2**:
```powershell
wsl --list --verbose
# If not installed:
wsl --install
# Restart Windows
```

### Can't access from internet

1. **Check port forwarding** on router
2. **Check Windows Firewall**:
   ```powershell
   Get-NetFirewallRule -DisplayName "Overwatch*"
   ```
3. **Test ports**: https://www.yougetsignal.com/tools/open-ports/
4. **Check your public IP**:
   ```powershell
   Invoke-WebRequest -Uri "https://api.ipify.org" | Select-Object -ExpandProperty Content
   ```

### SSL not working

```powershell
# Check Caddy logs
docker-compose -f docker-compose.aws.yml logs caddy | Select-String "acme"

# Verify:
# 1. Port 80 is forwarded
# 2. Domain points to your IP
# 3. Cloudflare proxy is OFF
```

### Services crashing

```powershell
# Check logs
docker-compose -f docker-compose.aws.yml logs

# Check resources
docker stats

# Increase Docker memory:
# Docker Desktop → Settings → Resources → Memory
```

---

## Performance Tips

### Docker Desktop Settings

1. **Docker Desktop** → Settings → Resources
2. **CPUs**: 2-4 cores
3. **Memory**: 4-8 GB
4. **Disk**: 64 GB

### Windows Power Settings

1. **Control Panel** → Power Options
2. Select **High performance**
3. Advanced settings:
   - Sleep: Never
   - USB suspend: Disabled
   - Display: Never turn off

### Keep Mini PC Cool

- Ensure good ventilation
- Monitor temperatures
- Consider external cooling

---

## Full Documentation

See [docs/WINDOWS-DEPLOYMENT.md](./docs/WINDOWS-DEPLOYMENT.md) for:
- Complete step-by-step guide
- Dynamic DNS setup (DuckDNS, No-IP)
- Windows Service configuration
- Automated backup setup
- Security hardening
- Advanced troubleshooting

---

## Quick Reference

### Common Commands

```powershell
# Start
docker-compose -f docker-compose.aws.yml up -d

# Stop
docker-compose -f docker-compose.aws.yml down

# Restart
docker-compose -f docker-compose.aws.yml restart

# Logs
docker-compose -f docker-compose.aws.yml logs -f

# Status
docker-compose -f docker-compose.aws.yml ps

# Backup
.\scripts\windows-backup.ps1
```

### Useful Tools

- **Docker Desktop**: Container management GUI
- **Windows Terminal**: Better PowerShell experience
- **VSCode**: Code editing with Docker extension

---

**Ready to deploy?** Run `.\scripts\windows-setup.ps1` and follow the prompts! 🚀
