#!/bin/bash
set -e

# Backup database from EC2 instance

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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

BACKUP_DIR="$PROJECT_ROOT/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="overwatch-backup-$TIMESTAMP.sql"

echo "Creating database backup..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP \
    "cd /home/ubuntu/overwatch && docker-compose -f docker-compose.aws.yml exec -T postgres pg_dump -U overwatch overwatch" > "$BACKUP_DIR/$BACKUP_FILE"

echo "Compressing backup..."
gzip "$BACKUP_DIR/$BACKUP_FILE"

echo ""
echo "Backup complete: $BACKUP_DIR/$BACKUP_FILE.gz"
echo ""

# Show backup size
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE.gz" | cut -f1)
echo "Backup size: $BACKUP_SIZE"

# List recent backups
echo ""
echo "Recent backups:"
ls -lh "$BACKUP_DIR" | tail -5
