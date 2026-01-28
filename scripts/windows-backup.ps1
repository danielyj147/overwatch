# Overwatch Database Backup Script for Windows
# Run this in PowerShell from the overwatch directory

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupDir = ".\backups"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Overwatch Database Backup ===" -ForegroundColor Green
Write-Host ""

# Create backup directory
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    Write-Host "Created backup directory: $BackupDir" -ForegroundColor Yellow
}

# Generate timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = "$BackupDir\backup-$timestamp.sql"

Write-Host "Creating backup..." -ForegroundColor Yellow

# Run backup
try {
    docker-compose -f docker-compose.aws.yml exec -T postgres pg_dump -U overwatch overwatch > $backupFile

    if ($LASTEXITCODE -ne 0) {
        throw "Backup failed with exit code $LASTEXITCODE"
    }

    # Compress
    Write-Host "Compressing backup..." -ForegroundColor Yellow
    Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip" -Force
    Remove-Item $backupFile

    Write-Host ""
    Write-Host "Backup complete!" -ForegroundColor Green
    Write-Host "Location: $backupFile.zip" -ForegroundColor Cyan

    # Show file size
    $size = (Get-Item "$backupFile.zip").Length / 1MB
    Write-Host "Size: $([math]::Round($size, 2)) MB" -ForegroundColor White

    # Clean up old backups (keep last 7 days)
    Write-Host ""
    Write-Host "Cleaning up old backups..." -ForegroundColor Yellow
    $deleted = Get-ChildItem $BackupDir -Filter "backup-*.sql.zip" |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
        ForEach-Object {
            Write-Host "  Deleting: $($_.Name)" -ForegroundColor Gray
            Remove-Item $_.FullName
            return 1
        } | Measure-Object -Sum

    if ($deleted.Sum -gt 0) {
        Write-Host "Deleted $($deleted.Sum) old backup(s)" -ForegroundColor Yellow
    } else {
        Write-Host "No old backups to delete" -ForegroundColor Gray
    }

    # List recent backups
    Write-Host ""
    Write-Host "Recent backups:" -ForegroundColor Yellow
    Get-ChildItem $BackupDir -Filter "backup-*.sql.zip" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 5 |
        ForEach-Object {
            $size = $_.Length / 1MB
            Write-Host "  $($_.Name) - $([math]::Round($size, 2)) MB - $($_.LastWriteTime)" -ForegroundColor White
        }

} catch {
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
