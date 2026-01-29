# Overwatch Windows Setup Script
# Run this in PowerShell

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "prod")]
    [string]$Mode = "dev"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Overwatch Windows Setup ===" -ForegroundColor Green
Write-Host ""

# Check if Docker is running
try {
    docker ps | Out-Null
} catch {
    Write-Host "Error: Docker is not running" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again" -ForegroundColor Yellow
    exit 1
}

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed" -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

Write-Host "Prerequisites OK" -ForegroundColor Green
Write-Host ""

if ($Mode -eq "dev") {
    Write-Host "=== Development Mode Setup ===" -ForegroundColor Cyan
    Write-Host ""

    # Create .env if it doesn't exist
    if (-not (Test-Path ".env")) {
        Write-Host "Creating .env file..." -ForegroundColor Yellow
        Copy-Item .env.example .env
        Write-Host ".env created" -ForegroundColor Green
    }

    # Create client .env if it doesn't exist
    if (-not (Test-Path "client\.env")) {
        Write-Host "Creating client .env file..." -ForegroundColor Yellow
        @"
# Development environment variables
VITE_MAP_STYLE_URL=http://localhost:3000/style.json
VITE_HOCUSPOCUS_URL=ws://localhost:1234
VITE_API_URL=http://localhost:1235
VITE_MARTIN_URL=http://localhost:3000
"@ | Out-File -Encoding UTF8 client\.env
        Write-Host "client\.env created" -ForegroundColor Green
    }

    # Start services
    Write-Host ""
    Write-Host "Starting services..." -ForegroundColor Yellow
    docker-compose up -d

    Write-Host ""
    Write-Host "Waiting for services to be healthy..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    # Show status
    docker-compose ps

    # Setup frontend
    Write-Host ""
    Write-Host "Setting up frontend..." -ForegroundColor Yellow
    Set-Location client
    if (-not (Test-Path "node_modules")) {
        npm install
    }

    Write-Host ""
    Write-Host "=== Setup Complete! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Start frontend with:" -ForegroundColor Yellow
    Write-Host "  cd client" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "Access at: http://localhost:5173" -ForegroundColor Cyan

} elseif ($Mode -eq "prod") {
    Write-Host "=== Production Mode Setup ===" -ForegroundColor Cyan
    Write-Host ""

    # Get domain
    $domain = Read-Host "Enter your domain name (e.g., overwatch.example.com)"

    # Generate passwords
    Write-Host ""
    Write-Host "Generating secure passwords..." -ForegroundColor Yellow
    $dbPassword = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
    $jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})

    # Create .env
    Write-Host "Creating production .env..." -ForegroundColor Yellow
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

# Domain
DOMAIN_NAME=${domain}
"@ | Out-File -Encoding UTF8 .env

    Write-Host ".env created" -ForegroundColor Green

    # Build frontend
    Write-Host ""
    Write-Host "Building frontend..." -ForegroundColor Yellow
    Set-Location client

    @"
VITE_HOCUSPOCUS_URL=wss://${domain}/ws
VITE_API_URL=https://${domain}/api
VITE_MARTIN_URL=https://${domain}/tiles
"@ | Out-File -Encoding UTF8 .env.production

    npm install
    npm run build

    Set-Location ..

    # Configure Windows Firewall
    Write-Host ""
    Write-Host "Configuring Windows Firewall..." -ForegroundColor Yellow
    try {
        New-NetFirewallRule -DisplayName "Overwatch HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
        New-NetFirewallRule -DisplayName "Overwatch HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
        Write-Host "Firewall rules added" -ForegroundColor Green
    } catch {
        Write-Host "Warning: Could not add firewall rules (may need admin privileges)" -ForegroundColor Yellow
    }

    # Start services
    Write-Host ""
    Write-Host "Starting production services..." -ForegroundColor Yellow
    docker-compose -f docker-compose.aws.yml up -d

    Write-Host ""
    Write-Host "Waiting for services to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15

    # Show status
    docker-compose -f docker-compose.aws.yml ps

    Write-Host ""
    Write-Host "=== Production Deployment Complete! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: Save these credentials securely!" -ForegroundColor Yellow
    Write-Host "  DB Password: $dbPassword" -ForegroundColor White
    Write-Host "  JWT Secret: $jwtSecret" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Forward ports 80 and 443 on your router to this PC" -ForegroundColor White
    Write-Host "  2. Point domain $domain to your public IP" -ForegroundColor White
    Write-Host "  3. Wait 1-2 minutes for SSL certificate" -ForegroundColor White
    Write-Host "  4. Access at: https://${domain}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Check logs:" -ForegroundColor Yellow
    Write-Host "  docker-compose -f docker-compose.aws.yml logs -f" -ForegroundColor White
}

Write-Host ""
Write-Host "For more information, see: docs\WINDOWS-DEPLOYMENT.md" -ForegroundColor Blue
