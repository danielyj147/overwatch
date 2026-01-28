# Windows 11 Deployment Guide

Deploy Overwatch on your Windows 11 Mini PC with full production features.

## Table of Contents

- [Quick Start (Development)](#quick-start-development)
- [Production Deployment](#production-deployment)
- [Domain Configuration](#domain-configuration)
- [Windows Service Setup](#windows-service-setup)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Quick Start (Development)

For local development without public access.

### 1. Install Prerequisites

#### Install Docker Desktop

1. **Download Docker Desktop**: https://www.docker.com/products/docker-desktop/
2. **Run installer**: Double-click `Docker Desktop Installer.exe`
3. **Enable WSL 2**: During installation, ensure "Use WSL 2 instead of Hyper-V" is checked
4. **Restart Windows**
5. **Launch Docker Desktop**: Wait for it to start (whale icon in system tray)

#### Install Node.js

1. **Download Node.js 20**: https://nodejs.org/en/download/
2. **Run installer**: `node-v20.x.x-x64.msi`
3. **Verify installation**:
   ```powershell
   node --version
   npm --version
   ```

#### Install Git (if not installed)

1. **Download Git**: https://git-scm.com/download/win
2. **Run installer**: Accept defaults
3. **Verify**:
   ```powershell
   git --version
   ```

### 2. Clone and Setup

Open **PowerShell** (right-click Start → Windows PowerShell):

```powershell
# Clone repository
git clone https://github.com/danielyj147/overwatch.git
cd overwatch

# Copy environment file
Copy-Item .env.example .env

# Edit .env if needed (optional)
notepad .env
```

### 3. Start Services

```powershell
# Start all backend services
docker-compose up -d

# Wait for services to be healthy
docker-compose ps

# Check logs
docker-compose logs -f
```

### 4. Start Frontend

Open a **new PowerShell window**:

```powershell
cd overwatch\client

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

Press `Ctrl+C` in both PowerShell windows to stop.

---

## Production Deployment

Make Overwatch accessible from the internet with SSL.

### Architecture

```
Internet
   ↓
Your Router (Port Forwarding: 80, 443)
   ↓
Windows 11 Mini PC (192.168.1.x)
   ↓
Docker Desktop (WSL2)
   ↓
Caddy (Reverse Proxy + SSL)
   ├─→ Frontend (Static Files)
   ├─→ Hocuspocus (WebSocket)
   └─→ Martin (Vector Tiles)
```

### 1. Setup Dynamic DNS (If No Static IP)

#### Option A: DuckDNS (Free)

1. **Create account**: https://www.duckdns.org
2. **Choose subdomain**: `overwatch` (full domain: `overwatch.duckdns.org`)
3. **Get your token** from the dashboard

**Install DuckDNS updater**:

Create `C:\overwatch\update-duckdns.ps1`:

```powershell
# DuckDNS Update Script
$domain = "overwatch"
$token = "YOUR_DUCKDNS_TOKEN"

$url = "https://www.duckdns.org/update?domains=$domain&token=$token&ip="
try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $response" | Out-File -Append C:\overwatch\duckdns.log
} catch {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - Error: $_" | Out-File -Append C:\overwatch\duckdns.log
}
```

**Schedule automatic updates**:

1. Open **Task Scheduler** (search in Start menu)
2. **Create Basic Task**
   - Name: `DuckDNS Update`
   - Trigger: Daily, repeat every 5 minutes
   - Action: Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\overwatch\update-duckdns.ps1"`
3. **Finish**

#### Option B: No-IP (Free)

1. **Create account**: https://www.noip.com
2. **Choose hostname**: `overwatch.ddns.net`
3. **Download DUC**: https://www.noip.com/download
4. **Install and configure** with your credentials
5. **Start service**: No-IP runs automatically

### 2. Router Port Forwarding

Configure your router to forward ports to your Windows PC:

| External Port | Internal Port | Internal IP | Protocol |
|--------------|---------------|-------------|----------|
| 80 | 80 | 192.168.1.x | TCP |
| 443 | 443 | 192.168.1.x | TCP |

**Find your PC's local IP**:
```powershell
ipconfig
# Look for "IPv4 Address" under your active network adapter
# Example: 192.168.1.100
```

**Router configuration steps** (varies by router):
1. Access router admin (usually http://192.168.1.1 or http://192.168.0.1)
2. Navigate to **Port Forwarding** / **Virtual Servers** / **NAT**
3. Add rules above
4. Save and reboot router

### 3. Windows Firewall Configuration

Open **PowerShell as Administrator**:

```powershell
# Allow HTTP and HTTPS through Windows Firewall
New-NetFirewallRule -DisplayName "Overwatch HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Overwatch HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow

# Verify rules
Get-NetFirewallRule -DisplayName "Overwatch*"
```

### 4. Configure Cloudflare (Optional but Recommended)

If using your own domain (danielyj.com):

1. **Cloudflare Dashboard** → DNS
2. **Add A Record**:
   - Type: A
   - Name: overwatch
   - Content: YOUR_HOME_IP (get from https://whatismyip.com)
   - Proxy status: **DNS only (gray cloud)** ← Important!
   - TTL: Auto

### 5. Setup Environment Files

Open PowerShell in your overwatch directory:

```powershell
# Generate secure passwords
$dbPassword = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# Create .env file
@"
# Database
DATABASE_URL=postgresql://overwatch:${dbPassword}@postgres:5432/overwatch
POSTGRES_USER=overwatch
POSTGRES_PASSWORD=${dbPassword}
POSTGRES_DB=overwatch

# Redis
REDIS_URL=redis://redis:6379

# Hocuspocus
HOCUSPOCUS_SECRET=${jwtSecret}
NODE_ENV=production

# Domain (change to your actual domain)
DOMAIN_NAME=overwatch.danielyj.com
"@ | Out-File -Encoding UTF8 .env

# Display passwords (save these!)
Write-Host "Save these passwords securely:" -ForegroundColor Yellow
Write-Host "DB Password: $dbPassword"
Write-Host "JWT Secret: $jwtSecret"

# Update Caddyfile with your domain
$domain = "overwatch.danielyj.com"  # Change this
(Get-Content Caddyfile) -replace '\{\$DOMAIN_NAME\}', $domain | Set-Content Caddyfile
```

### 6. Build Frontend

```powershell
cd client

# Create production environment
$domain = "overwatch.danielyj.com"  # Change this
@"
VITE_HOCUSPOCUS_URL=wss://${domain}/ws
VITE_API_URL=https://${domain}/api
VITE_MARTIN_URL=https://${domain}/tiles
"@ | Out-File -Encoding UTF8 .env.production

# Build
npm install
npm run build

# Verify build
dir dist
```

### 7. Start Production Stack

```powershell
cd ..

# Start with production compose file
docker-compose -f docker-compose.aws.yml up -d

# Check status
docker-compose -f docker-compose.aws.yml ps

# View logs
docker-compose -f docker-compose.aws.yml logs -f
```

### 8. Wait for SSL Certificate

Caddy will automatically obtain SSL certificate from Let's Encrypt.

**Check progress**:
```powershell
docker-compose -f docker-compose.aws.yml logs caddy | Select-String -Pattern "acme"
```

**Takes 1-2 minutes on first run**

### 9. Verify Deployment

```powershell
# Test health endpoint
Invoke-WebRequest -Uri "https://overwatch.danielyj.com/health"

# Should return: OK
```

**Open in browser**: https://overwatch.danielyj.com

---

## Windows Service Setup

Run Overwatch as a Windows service (starts on boot).

### Option 1: Docker Desktop Auto-Start (Easiest)

1. **Docker Desktop Settings** → General
2. ✅ Check "Start Docker Desktop when you log in"
3. ✅ Check "Start containers automatically"

**Configure compose to start automatically**:

Create `C:\ProgramData\Docker\config\daemon.json`:
```json
{
  "compose-files": [
    "C:\\path\\to\\overwatch\\docker-compose.aws.yml"
  ]
}
```

### Option 2: Task Scheduler (Recommended)

**Create startup script** `C:\overwatch\start-overwatch.ps1`:

```powershell
# Start Overwatch
Set-Location "C:\path\to\overwatch"
docker-compose -f docker-compose.aws.yml up -d
```

**Schedule with Task Scheduler**:

1. Open **Task Scheduler**
2. **Create Task** (not Basic Task)
3. **General** tab:
   - Name: `Overwatch Auto-Start`
   - ✅ Run whether user is logged on or not
   - ✅ Run with highest privileges
4. **Triggers** tab:
   - New → Begin the task: At startup
5. **Actions** tab:
   - New → Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\overwatch\start-overwatch.ps1"`
6. **Conditions** tab:
   - ✅ Start only if computer is on AC power (uncheck for mini PC)
7. **OK** and enter your password

### Option 3: NSSM (Advanced)

**Install NSSM** (Non-Sucking Service Manager):

1. Download: https://nssm.cc/download
2. Extract to `C:\nssm`
3. Open PowerShell as Administrator:

```powershell
cd C:\nssm\win64

# Install service
.\nssm.exe install Overwatch powershell.exe "-ExecutionPolicy Bypass -NoProfile -File C:\overwatch\start-overwatch.ps1"

# Configure service
.\nssm.exe set Overwatch AppDirectory "C:\overwatch"
.\nssm.exe set Overwatch DisplayName "Overwatch Application"
.\nssm.exe set Overwatch Description "Overwatch COP Platform"
.\nssm.exe set Overwatch Start SERVICE_AUTO_START

# Start service
.\nssm.exe start Overwatch

# Check status
.\nssm.exe status Overwatch
```

**Manage service**:
```powershell
# Stop
.\nssm.exe stop Overwatch

# Restart
.\nssm.exe restart Overwatch

# Remove
.\nssm.exe remove Overwatch confirm
```

---

## Monitoring

### PowerShell Commands

```powershell
# Check service status
docker-compose -f docker-compose.aws.yml ps

# View logs (all services)
docker-compose -f docker-compose.aws.yml logs -f

# View logs (specific service)
docker-compose -f docker-compose.aws.yml logs -f caddy

# Last 100 lines
docker-compose -f docker-compose.aws.yml logs --tail=100

# Resource usage
docker stats

# Disk usage
docker system df
```

### Windows Performance Monitor

1. Open **Task Manager** (`Ctrl+Shift+Esc`)
2. **Performance** tab
3. Monitor CPU, Memory, Disk, Network

### Docker Desktop Dashboard

1. **Open Docker Desktop**
2. **Containers** tab shows all running containers
3. Click container to see logs and stats
4. Built-in monitoring and management

---

## Backup and Restore

### Backup Database

Create `C:\overwatch\backup.ps1`:

```powershell
# Backup Overwatch Database
$backupDir = "C:\overwatch\backups"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = "$backupDir\backup-$timestamp.sql"

# Create backup directory
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# Run backup
Set-Location "C:\path\to\overwatch"
docker-compose -f docker-compose.aws.yml exec -T postgres pg_dump -U overwatch overwatch > $backupFile

# Compress
Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip"
Remove-Item $backupFile

# Delete old backups (keep last 7 days)
Get-ChildItem $backupDir -Filter "backup-*.sql.zip" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
    Remove-Item

Write-Host "Backup complete: $backupFile.zip" -ForegroundColor Green
```

**Schedule daily backup**:

1. **Task Scheduler** → Create Basic Task
2. Name: `Overwatch Daily Backup`
3. Trigger: Daily at 2:00 AM
4. Action: Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\overwatch\backup.ps1"`

### Restore Database

```powershell
# Stop application
cd C:\path\to\overwatch
docker-compose -f docker-compose.aws.yml down

# Start only database
docker-compose -f docker-compose.aws.yml up -d postgres
Start-Sleep -Seconds 10

# Restore (replace with your backup file)
$backupFile = "C:\overwatch\backups\backup-20260127-020000.sql"
if (Test-Path "$backupFile.zip") {
    Expand-Archive -Path "$backupFile.zip" -DestinationPath "C:\temp" -Force
    $backupFile = "C:\temp\backup-20260127-020000.sql"
}

Get-Content $backupFile | docker-compose -f docker-compose.aws.yml exec -T postgres psql -U overwatch overwatch

# Start all services
docker-compose -f docker-compose.aws.yml up -d

Write-Host "Restore complete" -ForegroundColor Green
```

---

## Updating

### Update Application Code

```powershell
cd C:\path\to\overwatch

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

```powershell
cd C:\path\to\overwatch

# Pull latest images
docker-compose -f docker-compose.aws.yml pull

# Recreate containers
docker-compose -f docker-compose.aws.yml up -d

# Remove old images
docker image prune -a
```

### Update Docker Desktop

1. **Docker Desktop** → Settings → Software updates
2. Download and install updates
3. Restart Docker Desktop

---

## Troubleshooting

### Docker Desktop Won't Start

**Check WSL 2**:
```powershell
# Open PowerShell as Administrator
wsl --list --verbose

# If not installed:
wsl --install
# Restart Windows
```

**Check Hyper-V** (if using Hyper-V backend):
1. Open **Control Panel** → Programs → Turn Windows features on or off
2. ✅ Hyper-V
3. ✅ Virtual Machine Platform
4. ✅ Windows Subsystem for Linux
5. Restart Windows

### Services Won't Start

```powershell
# Check logs
docker-compose -f docker-compose.aws.yml logs

# Check Docker
docker ps -a

# Restart Docker Desktop
# Right-click Docker icon → Restart Docker Desktop

# Check ports
netstat -ano | findstr ":80"
netstat -ano | findstr ":443"
```

### SSL Certificate Issues

```powershell
# Check Caddy logs
docker-compose -f docker-compose.aws.yml logs caddy | Select-String -Pattern "acme"

# Common issues:
# 1. Port 80 not forwarded from router
# 2. Windows Firewall blocking port 80
# 3. Domain not pointing to your IP
# 4. Cloudflare proxy enabled (must be DNS only)

# Test port 80 from outside
# Use: https://www.yougetsignal.com/tools/open-ports/
```

### Cannot Access from Internet

```powershell
# Test locally first
Invoke-WebRequest -Uri "http://localhost"

# Check your public IP
Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing | Select-Object -ExpandProperty Content

# Verify firewall rules
Get-NetFirewallRule -DisplayName "Overwatch*"

# Test ports externally
# Visit: https://www.yougetsignal.com/tools/open-ports/
# Test ports: 80, 443
```

### High Memory Usage

```powershell
# Check Docker usage
docker stats --no-stream

# Check system resources
Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 10

# Adjust Docker Desktop memory
# Docker Desktop → Settings → Resources
# Reduce Memory limit if needed
```

### Disk Space Issues

```powershell
# Check Docker disk usage
docker system df

# Clean up
docker system prune -a --volumes

# Check Windows disk space
Get-PSDrive C

# Clean up Docker Desktop
# Docker Desktop → Troubleshoot → Clean / Purge data
```

### Database Connection Errors

```powershell
# Check PostgreSQL
docker-compose -f docker-compose.aws.yml exec postgres pg_isready

# Check .env file
Get-Content .env

# Restart database
docker-compose -f docker-compose.aws.yml restart postgres

# View database logs
docker-compose -f docker-compose.aws.yml logs postgres
```

---

## Performance Optimization

### Docker Desktop Settings

1. **Docker Desktop** → Settings → Resources
2. **CPUs**: Allocate 2-4 CPUs
3. **Memory**: Allocate 4-8 GB
4. **Disk image size**: 64 GB or more
5. **File sharing**: Only share necessary directories

### Windows Power Settings

1. **Control Panel** → Power Options
2. Select **High performance**
3. **Change plan settings** → **Change advanced power settings**
4. **Sleep** → **Allow hybrid sleep**: Off
5. **USB settings** → **USB selective suspend**: Disabled
6. **PCI Express** → **Link State Power Management**: Off

### Network Optimization

```powershell
# Disable network throttling
Set-NetAdapterAdvancedProperty -Name "Ethernet" -DisplayName "Flow Control" -DisplayValue "Disabled"

# Optimize TCP settings (PowerShell as Admin)
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global chimney=enabled
netsh int tcp set global dca=enabled
netsh int tcp set global netdma=enabled
```

---

## Security

### Windows Defender Firewall

Firewall rules already created in setup. Verify:

```powershell
# List Overwatch rules
Get-NetFirewallRule -DisplayName "Overwatch*"

# Block if needed
Set-NetFirewallRule -DisplayName "Overwatch HTTP" -Enabled False
```

### Windows Updates

Keep Windows updated but configure to not restart during deployment:

1. **Settings** → Windows Update
2. **Advanced options**
3. **Active hours**: Set your working hours
4. ✅ Notify me when a restart is required

### BitLocker (Optional)

Encrypt your disk for additional security:

1. **Control Panel** → BitLocker Drive Encryption
2. Turn on BitLocker for C: drive
3. Save recovery key securely

---

## Windows-Specific Tips

### Terminal Alternatives

**Windows Terminal** (Recommended):
1. Install from Microsoft Store
2. Modern, tabbed terminal
3. Better PowerShell experience

**PowerShell 7**:
```powershell
# Install PowerShell 7
winget install Microsoft.PowerShell
```

### Path Configuration

Add Docker to PATH (usually automatic):

1. **System Properties** → Environment Variables
2. Edit **Path** under User variables
3. Add: `C:\Program Files\Docker\Docker\resources\bin`

### VSCode Integration

```powershell
# Install VSCode
winget install Microsoft.VisualStudioCode

# Install Docker extension
code --install-extension ms-azuretools.vscode-docker
```

### Mini PC Specific

**Keep Mini PC Cool**:
- Ensure good ventilation
- Monitor temps: Use HWMonitor or similar
- Consider external cooling if needed

**Power Settings**:
- Disable sleep mode
- Disable hibernate
- Set to never turn off display when plugged in

---

## Comparison: Windows vs Linux

| Feature | Windows 11 | Linux |
|---------|------------|-------|
| **Setup** | Docker Desktop (GUI) | Docker Engine (CLI) |
| **Performance** | WSL2 layer overhead | Native |
| **Management** | GUI + PowerShell | CLI |
| **Service** | Task Scheduler/NSSM | systemd |
| **Updates** | Windows Update | apt/yum |
| **Ease of Use** | ★★★★★ | ★★★☆☆ |
| **Performance** | ★★★★☆ | ★★★★★ |

---

## Next Steps

After deployment:

1. ✅ Set up automated backups
2. ✅ Configure Task Scheduler for auto-start
3. ✅ Enable Windows Firewall
4. ✅ Set up monitoring
5. ✅ Test from external network
6. ✅ Configure power settings

---

**Last Updated**: January 2026
