#!/bin/bash
set -e

# Restore database from backup

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup-file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -1 "$PROJECT_ROOT/backups" 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    # Try looking in backups directory
    BACKUP_FILE="$PROJECT_ROOT/backups/$1"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "Error: Backup file not found: $1"
        exit 1
    fi
fi

cd "$PROJECT_ROOT/terraform"

if [ ! -f "terraform.tfstate" ]; then
    echo "Error: terraform.tfstate not found. Run 'terraform apply' first."
    exit 1
fi

INSTANCE_IP=$(terraform output -raw instance_public_ip 2>/dev/null)
SSH_KEY="${SSH_KEY:-$HOME/.ssh/overwatch-ec2}"

if [ -z "$INSTANCE_IP" ]; then
    echo "Error: Could not get instance IP from Terraform"
    exit 1
fi

echo "WARNING: This will replace the current database with the backup."
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Decompressing backup..."
TEMP_FILE="/tmp/overwatch-restore-$$.sql"
gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"

echo "Uploading to EC2..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$TEMP_FILE" ubuntu@$INSTANCE_IP:/tmp/restore.sql

echo "Restoring database..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'ENDSSH'
cd /home/ubuntu/overwatch
cat /tmp/restore.sql | docker-compose -f docker-compose.aws.yml exec -T postgres psql -U overwatch overwatch
rm /tmp/restore.sql
ENDSSH

rm "$TEMP_FILE"

echo ""
echo "Database restored successfully!"
