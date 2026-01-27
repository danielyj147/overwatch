#!/bin/bash
set -e

# Check status of all services on EC2

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

echo "=== Overwatch Status ==="
echo ""
echo "Instance IP: $INSTANCE_IP"
echo ""

echo "=== Docker Containers ==="
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP \
    "cd /home/ubuntu/overwatch && docker-compose -f docker-compose.aws.yml ps"

echo ""
echo "=== Resource Usage ==="
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP \
    "docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}'"

echo ""
echo "=== Disk Usage ==="
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP "df -h /"

echo ""
echo "=== Memory Usage ==="
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP "free -h"
