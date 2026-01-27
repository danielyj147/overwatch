#!/bin/bash
# Example setup script - demonstrates the deployment process
# DO NOT RUN directly - this is for reference only

set -e

echo "=== Overwatch AWS Deployment - Example Setup ==="
echo ""
echo "This script shows the deployment process."
echo "Follow along manually or use it as a reference."
echo ""

# Step 1: Generate SSH key
echo "Step 1: Generate SSH key"
echo "Run: ssh-keygen -t ed25519 -f ~/.ssh/overwatch-ec2 -C 'overwatch-ec2'"
echo ""

# Step 2: Generate passwords
echo "Step 2: Generate secure passwords"
echo "Database password:"
openssl rand -base64 32
echo ""
echo "Hocuspocus JWT secret:"
openssl rand -hex 32
echo ""

# Step 3: Create terraform.tfvars
echo "Step 3: Create terraform.tfvars"
echo "Run: cp terraform.tfvars.example terraform.tfvars"
echo "Then edit with your values"
echo ""

# Step 4: Deploy infrastructure
echo "Step 4: Deploy infrastructure"
echo "Run:"
echo "  terraform init"
echo "  terraform plan"
echo "  terraform apply"
echo ""

# Step 5: Wait for initialization
echo "Step 5: Wait for instance initialization"
echo "Run:"
echo '  INSTANCE_IP=$(terraform output -raw instance_public_ip)'
echo '  until ssh -i ~/.ssh/overwatch-ec2 ubuntu@$INSTANCE_IP "docker ps" 2>/dev/null; do'
echo '    echo "Waiting..."; sleep 10'
echo '  done'
echo ""

# Step 6: Deploy application
echo "Step 6: Deploy application"
echo "Run: ../scripts/deploy.sh"
echo ""

# Step 7: Access
echo "Step 7: Access your application"
echo "Run: terraform output domain_url"
echo ""

echo "For detailed instructions, see:"
echo "  - docs/AWS-QUICKSTART.md"
echo "  - docs/DEPLOYMENT.md"
