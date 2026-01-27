#!/bin/bash
set -e

# Quick SSH connection to EC2 instance

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

echo "Connecting to $INSTANCE_IP..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP
