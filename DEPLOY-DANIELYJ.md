# Deploying Overwatch to overwatch.danielyj.com

Quick deployment guide for your Windows machine.

## Prerequisites

1. **Docker Desktop** - Must be running
2. **Node.js** - Installed and working
3. **Domain** - overwatch.danielyj.com DNS configured

---

## Step 1: Configure DNS

Point your domain to your home IP address:

### Get Your Public IP
```powershell
Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing | Select-Object -ExpandProperty Content
```

### Configure DNS (Choose one method):

#### Option A: Cloudflare DNS
1. Go to https://dash.cloudflare.com
2. Select `danielyj.com` domain
3. Click **DNS** → **Records**
4. Add A Record:
   - **Type**: A
   - **Name**: overwatch
   - **IPv4 address**: [Your public IP from above]
   - **Proxy status**: DNS only (gray cloud) ← IMPORTANT!
   - **TTL**: Auto
5. Click **Save**

#### Option B: Direct Domain Registrar
1. Log into your domain registrar (where you bought danielyj.com)
2. Find DNS settings
3. Add A Record:
   - **Host/Name**: overwatch
   - **Type**: A
   - **Value/IP**: [Your public IP]
   - **TTL**: 300 or Auto

---

## Step 2: Configure Router Port Forwarding

### Find Your PC's Local IP
```powershell
ipconfig
# Look for "IPv4 Address" under your active adapter
# Example: 192.168.1.100
```

### Configure Router
1. Access your router admin panel (usually http://192.168.1.1)
2. Find **Port Forwarding** or **Virtual Server** section
3. Add these rules:

| Service Name | External Port | Internal Port | Internal IP | Protocol |
|--------------|---------------|---------------|-------------|----------|
| HTTP | 80 | 80 | [Your PC IP] | TCP |
| HTTPS | 443 | 443 | [Your PC IP] | TCP |

4. Save and apply settings

### Test Port Forwarding
After 5 minutes (for DNS to propagate), test at:
https://www.yougetsignal.com/tools/open-ports/

Test both ports 80 and 443 with your public IP.

---

## Step 3: Run Deployment Script

Open **PowerShell** in your Overwatch directory:

```powershell
# Navigate to project
cd C:\path\to\overwatch

# Make sure Docker is running
docker ps

# Run production setup
.\scripts\windows-setup.ps1 -Mode prod
```

### When Prompted:
- **Domain**: Enter `overwatch.danielyj.com`

The script will:
- ✅ Generate secure database password
- ✅ Generate JWT secret
- ✅ Create .env file
- ✅ Build frontend with production URLs
- ✅ Configure Windows Firewall
- ✅ Start all services

**IMPORTANT**: The script will display passwords at the end. **SAVE THESE SECURELY!**

---

## Step 4: Wait for SSL Certificate

Caddy will automatically get SSL certificate from Let's Encrypt.

### Monitor Progress
```powershell
docker-compose -f docker-compose.aws.yml logs -f caddy
```

Look for messages like:
```
successfully downloaded available certificate chains
certificate obtained successfully
```

This usually takes **1-2 minutes**.

Press `Ctrl+C` to stop watching logs.

---

## Step 5: Verify Deployment

### Check Services
```powershell
docker-compose -f docker-compose.aws.yml ps
```

All services should show "Up" or "healthy".

### Test Locally
```powershell
Invoke-WebRequest -Uri "http://localhost/health"
# Should return: OK
```

### Test Externally
Open browser: **https://overwatch.danielyj.com**

You should see:
- ✅ Valid SSL certificate (green padlock)
- ✅ Overwatch login/signup page
- ✅ No certificate warnings

---

## Step 6: Create Your Account

1. Go to https://overwatch.danielyj.com
2. Click **Sign Up**
3. Enter:
   - Email
   - Password
   - Name
4. Click **Create Account**

Your account is created and you're ready to use Overwatch!

---

## Troubleshooting

### "Connection Refused" or "Cannot Connect"

**Check Docker:**
```powershell
docker ps
```

**Check Logs:**
```powershell
docker-compose -f docker-compose.aws.yml logs
```

### "Certificate Error" or "Not Secure"

**Wait 2-3 minutes** - Caddy might still be getting the certificate.

**Check Caddy logs:**
```powershell
docker-compose -f docker-compose.aws.yml logs caddy | Select-String -Pattern "acme"
```

**Common issues:**
- Port 80 not forwarded (Caddy needs port 80 for verification)
- Cloudflare proxy enabled (must be DNS only - gray cloud)
- Domain not pointing to your IP yet (check DNS with `nslookup overwatch.danielyj.com`)

### "Cannot Signup" / Auth Errors

**Check Hocuspocus:**
```powershell
docker-compose -f docker-compose.aws.yml logs hocuspocus
```

**Restart services:**
```powershell
docker-compose -f docker-compose.aws.yml restart
```

### Check DNS Propagation
```powershell
nslookup overwatch.danielyj.com
# Should show your public IP
```

Or check online: https://dnschecker.org

---

## Maintenance

### View Logs
```powershell
# All services
docker-compose -f docker-compose.aws.yml logs -f

# Specific service
docker-compose -f docker-compose.aws.yml logs -f caddy
docker-compose -f docker-compose.aws.yml logs -f hocuspocus
```

### Restart Services
```powershell
docker-compose -f docker-compose.aws.yml restart
```

### Stop Everything
```powershell
docker-compose -f docker-compose.aws.yml down
```

### Start Everything
```powershell
docker-compose -f docker-compose.aws.yml up -d
```

### Update Application
```powershell
# Pull latest code
git pull origin master

# Rebuild frontend
cd client
npm install
npm run build
cd ..

# Restart
docker-compose -f docker-compose.aws.yml restart
```

---

## Auto-Start on Windows Boot

### Method 1: Docker Desktop Setting (Easiest)
1. Open Docker Desktop
2. Settings → General
3. ✅ Start Docker Desktop when you log in

### Method 2: Task Scheduler
Create `C:\overwatch\start.ps1`:
```powershell
Set-Location "C:\path\to\overwatch"
docker-compose -f docker-compose.aws.yml up -d
```

Then:
1. Open **Task Scheduler**
2. Create Task:
   - Name: Overwatch Auto-Start
   - Trigger: At startup
   - Action: `powershell.exe -ExecutionPolicy Bypass -File "C:\overwatch\start.ps1"`
   - ✅ Run with highest privileges

---

## Backup

### Manual Backup
```powershell
# Create backup directory
New-Item -ItemType Directory -Force -Path C:\overwatch\backups

# Backup database
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
docker-compose -f docker-compose.aws.yml exec -T postgres pg_dump -U overwatch overwatch > "C:\overwatch\backups\backup-$timestamp.sql"
```

### Automated Daily Backup
See: `docs\WINDOWS-DEPLOYMENT.md` → Backup and Restore section

---

## Important Notes

1. **Keep Docker Desktop running** - Your app won't work if Docker stops
2. **Keep Windows powered on** - This is a server now
3. **Disable sleep mode** - Settings → Power & sleep → Never
4. **Save passwords** - Store the DB password and JWT secret shown during setup
5. **Update regularly** - `git pull` and rebuild to get latest features
6. **Monitor disk space** - Run `docker system prune` periodically

---

## Next Steps

After successful deployment:

- [ ] Set up automated backups (Task Scheduler)
- [ ] Configure auto-start on boot
- [ ] Test from external network (mobile data)
- [ ] Share URL with team members
- [ ] Set up monitoring (optional)

---

## Getting Help

**Check documentation:**
- Main guide: `docs\WINDOWS-DEPLOYMENT.md`
- Project info: `CLAUDE.md`

**Check logs:**
```powershell
docker-compose -f docker-compose.aws.yml logs -f
```

**Common Issues:**
- DNS not pointing to your IP
- Router ports not forwarded
- Windows Firewall blocking
- Docker not running
- Cloudflare proxy enabled (must be DNS only)

---

**Your Deployment:**
- Domain: https://overwatch.danielyj.com
- Services: Caddy (SSL), Hocuspocus (Auth + Collab), Martin (Maps), PostgreSQL, Redis
- Auto SSL: Yes (Let's Encrypt via Caddy)
- Platform: Windows 11 + Docker Desktop + WSL2

🎉 **Happy mapping!**
