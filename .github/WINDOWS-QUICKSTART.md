# Windows 11 Quick Start

## 1. Install Prerequisites (5 minutes)

**Docker Desktop**: https://www.docker.com/products/docker-desktop/
- Enable WSL 2
- Restart Windows
- Start Docker Desktop

**Node.js 20**: https://nodejs.org/

## 2. Clone Repository

Open **PowerShell**:
```powershell
git clone https://github.com/danielyj147/overwatch.git
cd overwatch
```

## 3. Choose Deployment Mode

### Development (Local Only)
```powershell
.\scripts\windows-setup.ps1 -Mode dev
cd client
npm run dev
```
**Access**: http://localhost:5173

### Production (Public Access)
```powershell
.\scripts\windows-setup.ps1 -Mode prod
# Follow prompts for domain name
```
**Access**: https://your-domain.com

## Need Help?

See [WINDOWS-DEPLOY.md](../WINDOWS-DEPLOY.md) for full guide.
