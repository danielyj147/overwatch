#!/bin/bash
set -e

# View logs from EC2 instance

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

SERVICE="${1:-}"

if [ -z "$SERVICE" ]; then
    echo "Viewing all logs (follow mode)..."
    echo "Press Ctrl+C to exit"
    echo ""
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP \
        "cd /home/ubuntu/overwatch && docker-compose -f docker-compose.aws.yml logs -f"
else
    echo "Viewing logs for service: $SERVICE (follow mode)..."
    echo "Press Ctrl+C to exit"
    echo ""
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP \
        "cd /home/ubuntu/overwatch && docker-compose -f docker-compose.aws.yml logs -f $SERVICE"
fi
