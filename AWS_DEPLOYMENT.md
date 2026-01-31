# AWS Deployment Guide

**Built by Daniel Jeong**

Complete guide for deploying Overwatch to AWS with Terraform. Cost-effective single-instance architecture optimized for production use.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Cost Estimate](#cost-estimate)
4. [Architecture](#architecture)
5. [Quick Start](#quick-start)
6. [Detailed Setup](#detailed-setup)
7. [Post-Deployment](#post-deployment)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This guide deploys Overwatch on a single EC2 instance with all services running in Docker containers. Perfect for production deployments with moderate traffic.

**What You Get:**
- ✅ Production-ready application on AWS
- ✅ Automatic SSL certificates via Let's Encrypt
- ✅ Custom domain with Cloudflare DNS
- ✅ All services (PostgreSQL, Redis, Hocuspocus, Martin)
- ✅ Automated backups and monitoring
- ✅ Cost: ~$10-12/month (or $3-5 with free tier)

**Deployment Time:** 30-45 minutes

---

## Prerequisites

### 1. AWS Account

- Active AWS account with credentials configured
- AWS CLI installed (optional but recommended)

```bash
# Configure AWS credentials
aws configure
```

### 2. Cloudflare Account (Recommended)

- Domain managed in Cloudflare
- API token with `Zone.DNS.Edit` permissions
- Zone ID from Cloudflare dashboard

**To create API token:**
1. Go to Cloudflare Dashboard → My Profile → API Tokens
2. Create Token → Edit Zone DNS template
3. Select your zone → Continue to Summary → Create Token

### 3. SSH Key Pair

Generate a new SSH key for EC2 access:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/overwatch-ec2 -C "overwatch-aws"
cat ~/.ssh/overwatch-ec2.pub  # Copy this for terraform.tfvars
```

### 4. Terraform

Install Terraform (>= 1.0):

```bash
# macOS
brew install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Verify
terraform --version
```

### 5. Git

Clone the Overwatch repository:

```bash
git clone https://github.com/yourusername/overwatch.git
cd overwatch
```

---

## Cost Estimate

### Monthly Costs

| Resource | Type | Monthly Cost | Free Tier |
|----------|------|--------------|-----------|
| EC2 Instance | t3.micro | $7.50 | 750 hrs/month |
| EBS Storage | 20GB gp3 | $2.00 | 30GB included |
| Elastic IP | 1 IP | Free | While attached |
| Data Transfer | ~10GB | $0.90 | 100GB/month |
| **Total** | | **~$10-12** | **~$3-5** |

**With AWS Free Tier (first 12 months):** ~$3-5/month

### Cost Optimization Tips

1. **Use Free Tier** - First 12 months includes 750 hours/month of t3.micro
2. **Reserved Instances** - Save 40% with 1-year commitment
3. **Stop When Not Needed** - Stop instance (EIP charges $0.005/hr when stopped)
4. **Monitor Usage** - Set up AWS Budgets with alerts

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Internet / Users                      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
┌────────────────────────────────────────────────────────┐
│               Cloudflare DNS                            │
│     overwatch.yourdomain.com → EC2 IP                   │
└────────────────────────┬───────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  AWS VPC (10.0.0.0/16)                   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Public Subnet (10.0.1.0/24)                       │ │
│  │                                                     │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │  EC2 t3.micro Instance                       │  │ │
│  │  │  ┌────────────────────────────────────────┐  │  │ │
│  │  │  │  Docker Containers:                    │  │  │ │
│  │  │  │  • Caddy (SSL + Reverse Proxy)         │  │  │ │
│  │  │  │  • React Frontend (Static)             │  │  │ │
│  │  │  │  • Hocuspocus (WebSocket + Auth API)   │  │  │ │
│  │  │  │  • Martin (Vector Tiles)               │  │  │ │
│  │  │  │  • PostgreSQL + PostGIS                │  │  │ │
│  │  │  │  • Redis                               │  │  │ │
│  │  │  └────────────────────────────────────────┘  │  │ │
│  │  │                                              │  │ │
│  │  │  Elastic IP: Static Public IP               │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  │                                                     │ │
│  │  Security Group: Ports 22, 80, 443                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Internet Gateway → Routes traffic to internet          │
└─────────────────────────────────────────────────────────┘
```

**Resource Allocation (1GB RAM):**
- Caddy: 64MB
- PostgreSQL: 256MB
- Redis: 64MB
- Martin: 256MB
- Hocuspocus: 256MB
- System: ~128MB

---

## Quick Start

### 5-Minute Deployment

```bash
# 1. Navigate to terraform directory
cd terraform

# 2. Copy example configuration
cp terraform.tfvars.example terraform.tfvars

# 3. Generate secrets
echo "db_password = \"$(openssl rand -base64 32)\""
echo "hocuspocus_jwt_secret = \"$(openssl rand -hex 32)\""
echo "admin_registration_secret = \"$(openssl rand -base64 32)\""

# 4. Edit terraform.tfvars with your values
nano terraform.tfvars

# 5. Deploy infrastructure
terraform init
terraform apply

# 6. Get instance IP
terraform output instance_public_ip

# 7. Wait 5 minutes for user-data script to complete

# 8. SSH to instance
ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)

# 9. Deploy application
git clone https://github.com/yourusername/overwatch.git
cd overwatch
./scripts/deploy.sh

# 10. Register admin at https://overwatch.yourdomain.com
```

---

## Detailed Setup

### Step 1: Configure Terraform Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
```

**Required Configuration:**

```hcl
# AWS Configuration
aws_region    = "us-east-1"          # Your preferred region
instance_type = "t3.micro"           # t3.micro or t4g.micro (ARM, cheaper)

# Domain Configuration
domain_name = "overwatch.yourdomain.com"

# Cloudflare Configuration
cloudflare_zone_id    = "your-zone-id-here"
cloudflare_subdomain  = "overwatch"
cloudflare_api_token  = "your-api-token-here"

# SSH Configuration
ssh_public_key = "ssh-ed25519 AAAAC3... your@email.com"
ssh_allowed_cidrs = ["YOUR_IP/32"]   # Restrict to your IP for security

# Application Secrets (generate with openssl)
db_password               = "PASTE_GENERATED_SECRET"
hocuspocus_jwt_secret     = "PASTE_GENERATED_SECRET"
admin_registration_secret = "PASTE_GENERATED_SECRET"
```

### Step 2: Generate Secure Secrets

```bash
# Database password
openssl rand -base64 32

# JWT secret for authentication
openssl rand -hex 32

# Admin registration secret (SAVE THIS!)
openssl rand -base64 32
```

**⚠️ IMPORTANT:** Save the admin registration secret - you'll need it to create your admin account.

### Step 3: Initialize Terraform

```bash
terraform init
```

This downloads required providers (AWS, Cloudflare).

### Step 4: Preview Infrastructure

```bash
terraform plan
```

Review what will be created:
- VPC and networking
- EC2 instance
- Security group
- Elastic IP
- Cloudflare DNS record

### Step 5: Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted. This takes ~5 minutes.

**Terraform will create:**
1. ✅ VPC with public subnet
2. ✅ Security group (ports 22, 80, 443)
3. ✅ EC2 t3.micro instance
4. ✅ Elastic IP (static public IP)
5. ✅ Cloudflare DNS record
6. ✅ SSH key pair

**Outputs:**
```
instance_public_ip = "1.2.3.4"
domain_url = "https://overwatch.yourdomain.com"
ssh_command = "ssh -i ~/.ssh/overwatch-ec2 ubuntu@1.2.3.4"
```

### Step 6: Wait for Initialization

The EC2 instance runs a user-data script that:
- Installs Docker and Docker Compose
- Sets up swap space (2GB)
- Configures log rotation
- Creates .env file with secrets
- Enables automatic security updates

**Wait 5 minutes** for this to complete.

### Step 7: SSH to Instance

```bash
# Use the output from terraform
ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)

# Or use the shown ssh_command
ssh -i ~/.ssh/overwatch-ec2 ubuntu@1.2.3.4
```

### Step 8: Deploy Application

```bash
# Clone repository
git clone https://github.com/yourusername/overwatch.git
cd overwatch

# Build frontend
cd client
npm install
npm run build
cd ..

# Start services
docker-compose -f docker-compose.aws.yml up -d

# Wait for services to start
sleep 30

# Check status
docker-compose -f docker-compose.aws.yml ps
```

**Or use the deployment script:**

```bash
./scripts/deploy.sh
```

### Step 9: Verify Deployment

```bash
# Check all services are running
docker-compose -f docker-compose.aws.yml ps

# View logs
docker-compose -f docker-compose.aws.yml logs -f

# Check service health
curl http://localhost:1235/health
```

All services should show "Up" status.

---

## Post-Deployment

### Register Admin Account

1. **Navigate to your domain:**
   ```
   https://overwatch.yourdomain.com
   ```

2. **Click "Register as Admin"**

3. **Enter details:**
   - Display Name: Daniel Jeong
   - Email: your@email.com
   - Password: (strong password)
   - Admin Secret: (from terraform.tfvars)

4. **Submit** - You'll be logged into the Admin Dashboard

### Create First User (Testing)

1. Open incognito/private window
2. Go to your domain
3. Click "Sign up"
4. Register as regular user
5. Switch back to admin
6. Approve the user
7. Test user login

### Setup Monitoring (Optional)

```bash
# View resource usage
docker stats

# Check disk space
df -h

# Check memory
free -h

# View application logs
docker-compose -f ~/overwatch/docker-compose.aws.yml logs -f
```

### Enable Automated Backups

Backups are automatically configured by user-data script:

```bash
# Manual backup
~/backup.sh

# Check backup logs
tail -f ~/backup.log

# View backups
ls -lh ~/backups/
```

Automated backups run daily at 2 AM.

---

## Maintenance

### Update Application

```bash
# SSH to instance
ssh -i ~/.ssh/overwatch-ec2 ubuntu@YOUR_IP

cd overwatch
git pull origin master

# Rebuild containers
docker-compose -f docker-compose.aws.yml build

# Restart with zero downtime
docker-compose -f docker-compose.aws.yml up -d

# Check status
docker-compose -f docker-compose.aws.yml ps
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.aws.yml logs -f

# Specific service
docker-compose -f docker-compose.aws.yml logs -f hocuspocus

# Last 100 lines
docker-compose -f docker-compose.aws.yml logs --tail=100

# System logs
tail -f /var/log/user-data.log
```

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.aws.yml restart

# Restart specific service
docker-compose -f docker-compose.aws.yml restart hocuspocus

# Stop all
docker-compose -f docker-compose.aws.yml down

# Start all
docker-compose -f docker-compose.aws.yml up -d
```

### Database Backup & Restore

**Backup:**
```bash
# Create backup
docker-compose -f docker-compose.aws.yml exec -T postgres \
  pg_dump -U overwatch overwatch > backup_$(date +%Y%m%d_%H%M%S).sql

# Compress
gzip backup_*.sql

# Download to local machine
scp -i ~/.ssh/overwatch-ec2 ubuntu@YOUR_IP:~/overwatch/backup_*.sql.gz .
```

**Restore:**
```bash
# Upload backup
scp -i ~/.ssh/overwatch-ec2 backup.sql.gz ubuntu@YOUR_IP:~/overwatch/

# Restore
gunzip backup.sql.gz
docker-compose -f docker-compose.aws.yml exec -T postgres \
  psql -U overwatch overwatch < backup.sql
```

### Update Terraform Infrastructure

```bash
# On your local machine
cd terraform

# Make changes to terraform.tfvars or main.tf
nano terraform.tfvars

# Preview changes
terraform plan

# Apply changes
terraform apply
```

### Upgrade Instance Type

```bash
cd terraform
nano terraform.tfvars
# Change: instance_type = "t3.small"

terraform apply
# Existing data is preserved
```

---

## Troubleshooting

### Terraform Issues

**Error: No valid credential sources found**

```bash
# Configure AWS credentials
aws configure

# Or export credentials
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
```

**Error: Cloudflare authentication failed**

- Verify API token has Zone.DNS.Edit permissions
- Check zone ID is correct
- Ensure token hasn't expired

**Error: Instance limit exceeded**

- Check AWS service quotas
- Request limit increase in AWS console
- Try different region

### Application Issues

**Services won't start**

```bash
# Check logs
docker-compose -f docker-compose.aws.yml logs

# Check Docker is running
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker
docker-compose -f docker-compose.aws.yml up -d
```

**Out of memory**

```bash
# Check memory usage
free -h
docker stats

# Restart services to free memory
docker-compose -f docker-compose.aws.yml restart

# Check swap is active
swapon --show

# If needed, add more swap
sudo fallocate -l 2G /swapfile2
sudo chmod 600 /swapfile2
sudo mkswap /swapfile2
sudo swapon /swapfile2
```

**Database connection errors**

```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.aws.yml ps postgres

# Test connection
docker-compose -f docker-compose.aws.yml exec postgres \
  psql -U overwatch -d overwatch -c "SELECT version();"

# Restart PostgreSQL
docker-compose -f docker-compose.aws.yml restart postgres
```

**Can't access application**

```bash
# Check security group allows traffic
aws ec2 describe-security-groups --group-ids $(terraform output -raw security_group_id)

# Check Caddy is running
docker-compose -f docker-compose.aws.yml logs caddy

# Test locally
curl -I http://localhost

# Check DNS
dig overwatch.yourdomain.com
```

**SSL certificate issues**

```bash
# Check Caddy logs
docker-compose -f docker-compose.aws.yml logs caddy

# Ensure ports 80/443 are open
sudo netstat -tlnp | grep -E '80|443'

# Restart Caddy
docker-compose -f docker-compose.aws.yml restart caddy
```

### SSH Access Issues

**Permission denied (publickey)**

```bash
# Ensure correct key
ssh -i ~/.ssh/overwatch-ec2 ubuntu@YOUR_IP

# Check key permissions
chmod 600 ~/.ssh/overwatch-ec2

# Verify key matches
cat ~/.ssh/overwatch-ec2.pub
# Compare with terraform.tfvars ssh_public_key
```

**Connection timeout**

- Check security group allows your IP on port 22
- Verify instance is running: `terraform show`
- Check your IP hasn't changed

### Performance Issues

**Application slow**

```bash
# Check resource usage
htop
docker stats

# Upgrade instance type
cd terraform
# Change instance_type to "t3.small" in terraform.tfvars
terraform apply
```

**Database slow**

- Check PostgreSQL logs for slow queries
- Consider upgrading to t3.small (2GB RAM)
- Optimize database with `VACUUM ANALYZE`

---

## Advanced Configuration

### Custom Domain Without Cloudflare

If not using Cloudflare, manually create DNS A record:

```bash
# Get Elastic IP
terraform output instance_public_ip

# Create A record at your DNS provider
# overwatch.yourdomain.com → YOUR_ELASTIC_IP
```

Then remove Cloudflare provider from `terraform/main.tf`:

```hcl
# Comment out or remove Cloudflare sections
# provider "cloudflare" { ... }
# resource "cloudflare_record" "overwatch" { ... }
```

### Multiple Environments

Create separate `.tfvars` files:

```bash
# Production
cp terraform.tfvars terraform-prod.tfvars

# Staging
cp terraform.tfvars terraform-staging.tfvars

# Deploy staging
terraform apply -var-file="terraform-staging.tfvars"
```

### Add Custom SSL Certificate

If you have your own SSL certificate:

1. Upload cert to instance
2. Modify Caddyfile to use custom cert
3. Restart Caddy

### Horizontal Scaling

For production with high traffic:

1. Add Application Load Balancer
2. Use Auto Scaling Group
3. Separate RDS database
4. ElastiCache for Redis
5. S3 for static assets

---

## Security Best Practices

### 1. Restrict SSH Access

In `terraform.tfvars`:
```hcl
ssh_allowed_cidrs = ["YOUR_PUBLIC_IP/32"]  # Only your IP
```

### 2. Use Strong Secrets

```bash
# Generate strong secrets (32+ characters)
openssl rand -base64 32
```

### 3. Enable MFA

Enable MFA on your AWS account:
- Go to IAM → Your user → Security credentials → MFA

### 4. Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d
```

### 5. Monitor Access

```bash
# View SSH login attempts
sudo tail -f /var/log/auth.log

# View application access
docker-compose logs caddy | grep -E "GET|POST"
```

### 6. Enable AWS CloudTrail

Track all AWS API calls for audit purposes.

---

## Cleanup / Teardown

### Destroy Infrastructure

```bash
cd terraform
terraform destroy
```

This will:
- Terminate EC2 instance
- Delete Elastic IP
- Remove Cloudflare DNS record
- Delete VPC and networking
- Delete security group

**⚠️ WARNING:** This is permanent. Back up data first!

### Before Destroying

```bash
# Backup database
ssh -i ~/.ssh/overwatch-ec2 ubuntu@YOUR_IP
cd overwatch
~/backup.sh

# Download backup
exit
scp -i ~/.ssh/overwatch-ec2 ubuntu@YOUR_IP:~/backups/*.sql.gz .
```

---

## Cost Monitoring

### Set Up Billing Alerts

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name overwatch-billing \
  --alarm-description "Alert when charges exceed $15" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 15 \
  --comparison-operator GreaterThanThreshold
```

### View Current Costs

```bash
# View current month charges
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost
```

---

## Support & Resources

### Documentation

- **This Guide**: Complete AWS deployment
- **README.md**: Project overview
- **SETUP_ADMIN.md**: Admin system setup
- **terraform/README.md**: Terraform reference

### Useful Commands

```bash
# SSH to instance
terraform output ssh_command

# Get instance IP
terraform output instance_public_ip

# View all outputs
terraform output

# Check service status
docker-compose -f ~/overwatch/docker-compose.aws.yml ps

# View logs
docker-compose -f ~/overwatch/docker-compose.aws.yml logs -f

# Restart services
docker-compose -f ~/overwatch/docker-compose.aws.yml restart
```

### External Resources

- [AWS Free Tier](https://aws.amazon.com/free/)
- [Terraform Documentation](https://www.terraform.io/docs)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Cloudflare API](https://developers.cloudflare.com/)

---

## Summary

You've successfully deployed Overwatch to AWS with:

- ✅ Production-ready infrastructure
- ✅ Automatic SSL via Let's Encrypt
- ✅ Custom domain with DNS
- ✅ All services containerized
- ✅ Automated backups
- ✅ Cost: ~$10-12/month

**Next Steps:**
1. Register admin account
2. Create test users
3. Configure monitoring
4. Setup alerts
5. Share with team

---

**Built by Daniel Jeong** | Production AWS Deployment

For issues, check logs first:
```bash
docker-compose -f ~/overwatch/docker-compose.aws.yml logs -f
```
