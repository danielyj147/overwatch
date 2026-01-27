# Overwatch AWS Deployment Guide

Complete guide for deploying Overwatch to AWS for under $10/month.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step-by-Step Deployment](#step-by-step-deployment)
- [Post-Deployment](#post-deployment)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)
- [Scaling Guide](#scaling-guide)

## Prerequisites

### Required Tools

1. **AWS CLI** with credentials configured
   ```bash
   # Install
   brew install awscli  # macOS
   # or: pip install awscli

   # Configure
   aws configure
   # Enter: Access Key ID, Secret Key, Region (us-east-1), Output format (json)
   ```

2. **Terraform** (>= 1.0)
   ```bash
   # macOS
   brew install terraform

   # Linux
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/

   # Verify
   terraform version
   ```

3. **Node.js & npm** (for frontend build)
   ```bash
   node --version  # Should be >= 20.x
   npm --version
   ```

4. **SSH Key Pair**
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/overwatch-ec2 -C "overwatch-ec2"
   # Leave passphrase empty or set one (you'll need to enter it on each SSH)
   ```

### Cloudflare Setup

1. **Add domain to Cloudflare**
   - Go to Cloudflare Dashboard
   - Add your domain (danielyj.com)
   - Update nameservers at your domain registrar

2. **Get Zone ID**
   - Cloudflare Dashboard → Select domain
   - Right sidebar → Zone ID (copy this)

3. **Create API Token**
   - Cloudflare Dashboard → My Profile → API Tokens
   - Create Token → Edit Zone DNS (use template)
   - Permissions: Zone.DNS.Edit for your zone
   - Copy the token (shown only once)

## Step-by-Step Deployment

### Phase 1: Infrastructure Setup (10 minutes)

#### 1.1 Create terraform.tfvars

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
# AWS Configuration
aws_region = "us-east-1"
instance_type = "t4g.micro"

# Domain Configuration
domain_name = "overwatch.danielyj.com"
cloudflare_subdomain = "overwatch"
cloudflare_zone_id = "YOUR_ZONE_ID_FROM_CLOUDFLARE"
cloudflare_api_token = "YOUR_API_TOKEN_FROM_CLOUDFLARE"

# SSH Configuration
ssh_public_key = "PASTE_CONTENTS_OF_~/.ssh/overwatch-ec2.pub"
ssh_allowed_cidrs = ["0.0.0.0/0"]  # Or restrict to your IP

# Application Secrets
db_password = "PASTE_OUTPUT_OF_openssl_rand_-base64_32"
hocuspocus_jwt_secret = "PASTE_OUTPUT_OF_openssl_rand_-hex_32"
```

**Generate secrets:**
```bash
echo "db_password = \"$(openssl rand -base64 32)\""
echo "hocuspocus_jwt_secret = \"$(openssl rand -hex 32)\""
```

#### 1.2 Initialize Terraform

```bash
terraform init
```

Expected output:
```
Initializing the backend...
Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 5.0"...
- Finding cloudflare/cloudflare versions matching "~> 4.0"...
Terraform has been successfully initialized!
```

#### 1.3 Review Infrastructure Plan

```bash
terraform plan
```

This will show:
- 12 resources to be created
- Estimated cost breakdown
- Review carefully before proceeding

#### 1.4 Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted.

Deployment takes 3-5 minutes. You'll see:
```
aws_vpc.main: Creating...
aws_internet_gateway.main: Creating...
...
Apply complete! Resources: 12 added, 0 changed, 0 destroyed.

Outputs:
instance_public_ip = "1.2.3.4"
domain_url = "https://overwatch.danielyj.com"
ssh_command = "ssh -i ~/.ssh/overwatch-ec2 ubuntu@1.2.3.4"
```

**Save these outputs!**

#### 1.5 Wait for Instance Initialization

The EC2 instance is installing Docker. Wait for completion:

```bash
INSTANCE_IP=$(terraform output -raw instance_public_ip)

# This will retry until Docker is ready
until ssh -i ~/.ssh/overwatch-ec2 -o StrictHostKeyChecking=no -o ConnectTimeout=5 ubuntu@$INSTANCE_IP "docker ps" 2>/dev/null; do
  echo "Waiting for instance setup... (this can take 2-3 minutes)"
  sleep 10
done

echo "Instance is ready!"
```

### Phase 2: Application Deployment (15 minutes)

#### 2.1 Build Frontend

```bash
cd ../client

# Create production environment file
cat > .env.production << EOF
VITE_HOCUSPOCUS_URL=wss://overwatch.danielyj.com/ws
VITE_API_URL=https://overwatch.danielyj.com/api
VITE_MARTIN_URL=https://overwatch.danielyj.com/tiles
EOF

# Install dependencies and build
npm install
npm run build
```

Expected output:
```
vite v5.0.0 building for production...
✓ 1234 modules transformed.
dist/index.html                  0.45 kB
dist/assets/index-a1b2c3d4.js    123.45 kB
✓ built in 12.34s
```

#### 2.2 Deploy Using Script

```bash
cd ..
./scripts/deploy.sh
```

The script will:
1. ✓ Build frontend
2. ✓ Copy files to EC2
3. ✓ Start Docker containers
4. ✓ Wait for services to be healthy
5. ✓ Run database migrations

Expected output:
```
=== Overwatch AWS Deployment ===

Step 1/5: Building frontend...
✓ Frontend build complete

Step 2/5: Copying files to EC2...
...
✓ Files copied successfully

Step 3/5: Starting Docker containers...
✓ Docker containers started

Step 4/5: Waiting for services to be healthy...
Healthy services: 5 / 5
✓ Services are ready

Step 5/5: Running database migrations...
✓ Database migrations complete

=== Deployment Summary ===
✓ Frontend built and deployed
✓ Backend services running
✓ Database migrations applied

Application URL: https://overwatch.danielyj.com
```

#### 2.3 Verify Deployment

Wait 1-2 minutes for Caddy to obtain SSL certificate, then:

```bash
# Check if SSL is ready
curl -I https://overwatch.danielyj.com

# Should return: HTTP/2 200
```

Open in browser: **https://overwatch.danielyj.com**

### Phase 3: Verification (5 minutes)

#### 3.1 Check All Services

```bash
ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)

cd /home/ubuntu/overwatch
docker-compose -f docker-compose.aws.yml ps
```

Expected output:
```
NAME                    STATUS              PORTS
overwatch-caddy         Up (healthy)        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
overwatch-hocuspocus    Up (healthy)
overwatch-martin        Up (healthy)
overwatch-postgres      Up (healthy)
overwatch-redis         Up (healthy)
```

All services should show `Up (healthy)`.

#### 3.2 Test Endpoints

```bash
# Health check
curl https://overwatch.danielyj.com/health
# Expected: OK

# Martin tiles (vector tiles endpoint)
curl -I https://overwatch.danielyj.com/tiles/public.features/0/0/0.pbf
# Expected: HTTP/2 200

# Frontend
curl -I https://overwatch.danielyj.com/
# Expected: HTTP/2 200
```

#### 3.3 Test WebSocket

```bash
# Install wscat if needed
npm install -g wscat

# Test WebSocket connection
wscat -c wss://overwatch.danielyj.com/ws
# Should connect successfully
# Press Ctrl+C to exit
```

#### 3.4 Check SSL Certificate

```bash
echo | openssl s_client -connect overwatch.danielyj.com:443 2>/dev/null | openssl x509 -noout -dates
```

Expected output:
```
notBefore=Jan 27 12:00:00 2026 GMT
notAfter=Apr 27 12:00:00 2026 GMT
```

Certificate should be issued by Let's Encrypt and valid for 90 days.

## Post-Deployment

### Enable Automatic Deployment

Add systemd service to start containers on boot:

```bash
ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)

sudo systemctl enable overwatch
sudo systemctl start overwatch
```

### Setup Log Rotation

Already configured in user-data script. Verify:

```bash
cat /etc/logrotate.d/docker-containers
```

### Configure Backups

#### Manual Backup Script

Create `/home/ubuntu/backup.sh`:

```bash
#!/bin/bash
cd /home/ubuntu/overwatch
BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql"
docker-compose -f docker-compose.aws.yml exec -T postgres \
  pg_dump -U overwatch overwatch > "/home/ubuntu/backups/$BACKUP_FILE"
gzip "/home/ubuntu/backups/$BACKUP_FILE"
# Keep only last 7 backups
find /home/ubuntu/backups -name "backup-*.sql.gz" -mtime +7 -delete
```

Schedule with cron:
```bash
mkdir -p /home/ubuntu/backups
chmod +x /home/ubuntu/backup.sh
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup.sh
```

#### Download Backups

```bash
# From your local machine
scp -i ~/.ssh/overwatch-ec2 ubuntu@<IP>:/home/ubuntu/backups/*.sql.gz ./local-backups/
```

### Monitoring Setup

#### CloudWatch Logs (Optional, +$1/month)

```bash
# Install CloudWatch agent
ssh -i ~/.ssh/overwatch-ec2 ubuntu@<IP>
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/arm64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb
```

#### Uptime Monitoring

Use free services:
- **UptimeRobot**: https://uptimerobot.com (free tier)
- **StatusCake**: https://www.statuscake.com (free tier)

Monitor: `https://overwatch.danielyj.com/health`

## Maintenance

### Updating the Application

#### Update Code Only

```bash
# Make changes to code
git pull

# Redeploy
./scripts/deploy.sh
```

#### Update Dependencies

```bash
# Update client dependencies
cd client
npm update
npm run build

# Update server dependencies
cd ../server/hocuspocus
npm update

# Redeploy
cd ../..
./scripts/deploy.sh
```

#### Update Docker Images

```bash
ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
cd /home/ubuntu/overwatch

# Pull latest images
docker-compose -f docker-compose.aws.yml pull

# Recreate containers
docker-compose -f docker-compose.aws.yml up -d
```

### Viewing Logs

```bash
ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
cd /home/ubuntu/overwatch

# All services (follow mode)
docker-compose -f docker-compose.aws.yml logs -f

# Specific service
docker-compose -f docker-compose.aws.yml logs -f hocuspocus

# Last 100 lines
docker-compose -f docker-compose.aws.yml logs --tail=100

# Search logs
docker-compose -f docker-compose.aws.yml logs | grep ERROR
```

### Restarting Services

```bash
# Restart all services
docker-compose -f docker-compose.aws.yml restart

# Restart specific service
docker-compose -f docker-compose.aws.yml restart hocuspocus

# Hard restart (recreate containers)
docker-compose -f docker-compose.aws.yml down
docker-compose -f docker-compose.aws.yml up -d
```

### Database Operations

#### Backup Database

```bash
docker-compose -f docker-compose.aws.yml exec postgres \
  pg_dump -U overwatch overwatch > backup-$(date +%Y%m%d).sql
```

#### Restore Database

```bash
cat backup-20260127.sql | docker-compose -f docker-compose.aws.yml exec -T postgres \
  psql -U overwatch overwatch
```

#### Connect to Database

```bash
docker-compose -f docker-compose.aws.yml exec postgres \
  psql -U overwatch overwatch
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.aws.yml logs <service-name>

# Check container status
docker ps -a

# Check memory
docker stats --no-stream

# Check disk space
df -h

# Restart Docker daemon
sudo systemctl restart docker
```

### Out of Memory

```bash
# Check memory usage
free -h

# Check container memory
docker stats

# Add swap file (temporary fix)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Long-term solution: upgrade instance
cd terraform
# Edit terraform.tfvars: instance_type = "t4g.small"
terraform apply
```

### SSL Certificate Issues

```bash
# Check Caddy logs
docker-compose -f docker-compose.aws.yml logs caddy | grep -i acme

# Common issues:
# 1. Port 80 blocked (check security group)
# 2. DNS not pointing to correct IP
# 3. Rate limit (5 certs/week for same domain)

# Verify DNS
dig overwatch.danielyj.com +short
# Should return your Elastic IP

# Test Let's Encrypt connectivity
curl http://overwatch.danielyj.com/.well-known/acme-challenge/test
```

### Database Connection Errors

```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.aws.yml ps postgres

# Test connection
docker-compose -f docker-compose.aws.yml exec postgres \
  pg_isready -U overwatch -d overwatch

# Check DATABASE_URL
cat /home/ubuntu/overwatch/.env

# Restart PostgreSQL
docker-compose -f docker-compose.aws.yml restart postgres
```

## Scaling Guide

### When to Scale

Scale up when experiencing:
- High memory usage (>80% consistently)
- Slow response times
- More than 5-10 concurrent users
- Database query slowness

### Vertical Scaling (Upgrade Instance)

#### To t4g.small (2GB RAM, ~$15/month)

```bash
cd terraform

# Edit terraform.tfvars
# Change: instance_type = "t4g.small"

terraform plan   # Review changes
terraform apply  # Apply changes
```

**Note**: Instance will stop and restart (1-2 minutes downtime).

After upgrade:
```bash
./scripts/deploy.sh  # Redeploy application
```

#### To t4g.medium (4GB RAM, ~$30/month)

Same process, change to `instance_type = "t4g.medium"`.

### Horizontal Scaling (Multiple Instances)

For high availability and load balancing, see advanced architecture:
- Multiple EC2 instances behind Application Load Balancer
- RDS PostgreSQL instead of containerized database
- ElastiCache Redis
- S3 + CloudFront for frontend

**Cost**: ~$150-200/month (not covered in this guide).

## Cost Optimization

### Current Costs

```
EC2 t4g.micro:     $3.37/month
EBS gp3 20GB:      $1.60/month
Elastic IP:        $0 (attached)
Data Transfer:     $0 (first 100GB free)
──────────────────────────────
Total:             ~$5/month
```

### Save Money

1. **Stop when not in use** (dev/testing only):
   ```bash
   aws ec2 stop-instances --instance-ids $(terraform output -raw instance_id)
   # Compute cost stops, storage still charged
   # To start: aws ec2 start-instances --instance-ids <ID>
   ```

2. **Use Savings Plans**: Commit 1 year, save 30%

3. **Schedule auto-shutdown**: Lambda function for off-hours

4. **Monitor data transfer**: First 100GB/month free

5. **Optimize images**: Use multi-stage Docker builds (already done)

## Cleanup

### Temporary Shutdown

```bash
# Stop instance (keeps data, stops compute charges)
aws ec2 stop-instances --instance-ids $(terraform output -raw instance_id)

# Start again later
aws ec2 start-instances --instance-ids $(terraform output -raw instance_id)
```

### Complete Removal

**Warning**: This deletes everything. Backup first!

```bash
# Backup database
ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
cd /home/ubuntu/overwatch
docker-compose -f docker-compose.aws.yml exec postgres pg_dump -U overwatch overwatch > backup-final.sql
exit

# Download backup
scp -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip):/home/ubuntu/overwatch/backup-final.sql ./

# Destroy infrastructure
cd terraform
terraform destroy
# Type: yes
```

This removes:
- EC2 instance and all data
- EBS volume
- Elastic IP
- VPC, subnet, security group
- Cloudflare DNS record

## Next Steps

After successful deployment:

1. **Security Hardening**
   - Restrict SSH to your IP only (edit `terraform.tfvars`)
   - Set up fail2ban for SSH brute-force protection
   - Review Caddy logs regularly

2. **Monitoring**
   - Set up UptimeRobot or StatusCake
   - Configure email alerts for downtime
   - Optional: CloudWatch for detailed metrics

3. **Backups**
   - Set up automated daily backups
   - Test restore procedure
   - Store backups off-instance (S3 or local)

4. **Documentation**
   - Document your specific configuration
   - Keep terraform.tfvars backed up (securely)
   - Document any custom changes

5. **Testing**
   - Load test with expected user count
   - Test failure scenarios
   - Verify backup/restore procedure

## Support

- **GitHub Issues**: Report bugs and request features
- **Terraform Docs**: https://www.terraform.io/docs
- **AWS Docs**: https://docs.aws.amazon.com
- **Caddy Docs**: https://caddyserver.com/docs
