# AWS Deployment Guide - Cost-Effective Setup

**Built by Daniel Jeong**

This guide will help you deploy Overwatch on AWS with a cost-effective single-instance architecture.

## Cost Estimate (Monthly)

**Option 1: Single EC2 Instance (Recommended for Small Teams)**
- EC2 t3.micro (1 vCPU, 1GB RAM): ~$7.50/month (or free tier eligible)
- EBS Storage (30GB): ~$3/month
- Elastic IP: Free (while instance is running)
- Data Transfer: ~$1-2/month (minimal usage)
- **Total: ~$10-12/month** (or $3-5 if using free tier)

**Option 2: Separate Services (Better Performance)**
- EC2 t3.micro: ~$7.50/month
- RDS db.t3.micro (PostgreSQL): ~$15/month
- ElastiCache t3.micro (Redis): ~$11/month
- Data Transfer: ~$2/month
- **Total: ~$35/month**

**For small to medium deployments, Option 1 provides excellent cost efficiency.**

---

## Prerequisites

- AWS Account with free tier eligible (if applicable)
- Domain name (optional, can use EC2 public IP)
- Basic knowledge of SSH and Linux
- AWS CLI installed (optional but recommended)

---

## Architecture (Option 1: Single Instance)

```
┌─────────────────────────────────────────────────────┐
│                    Internet                          │
└────────────────────┬────────────────────────────────┘
                     │
                     │ HTTP/HTTPS
                     ↓
          ┌──────────────────────┐
          │   Elastic IP (Free)  │
          └──────────┬───────────┘
                     │
          ┌──────────┴───────────┐
          │   EC2 t3.micro       │
          │   (1 vCPU, 1GB RAM)  │
          │                      │
          │  ┌────────────────┐  │
          │  │  Docker Engine │  │
          │  │                │  │
          │  │  ┌──────────┐  │  │
          │  │  │  Nginx   │  │  │ ← Frontend + Reverse Proxy
          │  │  ├──────────┤  │  │
          │  │  │  Client  │  │  │ ← React App
          │  │  ├──────────┤  │  │
          │  │  │Hocuspocus│  │  │ ← WebSocket + Auth API
          │  │  ├──────────┤  │  │
          │  │  │  Martin  │  │  │ ← Vector Tiles
          │  │  ├──────────┤  │  │
          │  │  │PostgreSQL│  │  │ ← Database
          │  │  ├──────────┤  │  │
          │  │  │  Redis   │  │  │ ← Cache
          │  │  └──────────┘  │  │
          │  └────────────────┘  │
          └──────────────────────┘
```

All services run in Docker containers on a single EC2 instance.

---

## Step-by-Step Deployment

### 1. Launch EC2 Instance

#### Using AWS Console:

1. **Go to EC2 Dashboard**
   - Navigate to AWS Console → EC2 → Launch Instance

2. **Configure Instance**
   - **Name**: `overwatch-production`
   - **AMI**: Ubuntu 22.04 LTS (free tier eligible)
   - **Instance Type**: t3.micro (1 vCPU, 1GB RAM)
     - If no free tier: t4g.micro is slightly cheaper but ARM-based
   - **Key Pair**: Create new or select existing SSH key
   - **Network Settings**:
     - Allow SSH (22) from your IP
     - Allow HTTP (80) from anywhere (0.0.0.0/0)
     - Allow HTTPS (443) from anywhere (0.0.0.0/0)
     - Allow Custom TCP (1234) from anywhere - WebSocket
     - Allow Custom TCP (1235) from anywhere - Auth API
   - **Storage**: 30GB gp3 (balanced performance/cost)

3. **Launch Instance**

#### Using AWS CLI:

```bash
# Create security group
aws ec2 create-security-group \
  --group-name overwatch-production-sg \
  --description "Security group for Overwatch application"

# Add inbound rules
SECURITY_GROUP_ID=$(aws ec2 describe-security-groups \
  --group-names overwatch-production-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --ip-permissions \
    IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges='[{CidrIp=0.0.0.0/0}]' \
    IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges='[{CidrIp=0.0.0.0/0}]' \
    IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges='[{CidrIp=0.0.0.0/0}]' \
    IpProtocol=tcp,FromPort=1234,ToPort=1234,IpRanges='[{CidrIp=0.0.0.0/0}]' \
    IpProtocol=tcp,FromPort=1235,ToPort=1235,IpRanges='[{CidrIp=0.0.0.0/0}]'

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.micro \
  --key-name your-key-pair \
  --security-group-ids $SECURITY_GROUP_ID \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=overwatch-production}]'
```

### 2. Allocate Elastic IP (Optional but Recommended)

This gives you a permanent IP address:

```bash
# Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# Associate with instance (replace with your instance ID)
aws ec2 associate-address \
  --instance-id i-1234567890abcdef0 \
  --allocation-id eipalloc-1234567890abcdef0
```

Or via Console: EC2 → Elastic IPs → Allocate → Associate with instance

### 3. Connect to Instance

```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y
```

### 4. Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version

# Log out and back in for group changes to take effect
exit
ssh -i your-key.pem ubuntu@your-instance-ip
```

### 5. Clone and Setup Application

```bash
# Clone your repository
git clone https://github.com/yourusername/overwatch.git
cd overwatch

# Or upload files via SCP if not using Git
# scp -i your-key.pem -r ./overwatch ubuntu@your-instance-ip:~/
```

### 6. Configure Environment Variables

```bash
# Create production .env file
nano .env

# Add the following (update with your values):
```

```bash
# Database
DATABASE_URL=postgresql://overwatch:YOUR_STRONG_PASSWORD@postgres:5432/overwatch
POSTGRES_USER=overwatch
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD
POSTGRES_DB=overwatch

# Redis
REDIS_URL=redis://redis:6379

# Hocuspocus
HOCUSPOCUS_PORT=1234
HOCUSPOCUS_HTTP_PORT=1235
HOCUSPOCUS_SECRET=YOUR_JWT_SECRET_HERE
ADMIN_REGISTRATION_SECRET=YOUR_ADMIN_SECRET_HERE

# Martin
MARTIN_PORT=3000

# Client (replace YOUR_DOMAIN with your domain or EC2 IP)
VITE_MAP_STYLE_URL=http://YOUR_DOMAIN:3000/style.json
VITE_HOCUSPOCUS_URL=ws://YOUR_DOMAIN:1234
VITE_API_URL=http://YOUR_DOMAIN:1235
VITE_MARTIN_URL=http://YOUR_DOMAIN:3000
```

**Generate secure secrets:**

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate admin secret
openssl rand -base64 32
```

### 7. Build Frontend

```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Build frontend
cd client
npm install
npm run build
cd ..
```

### 8. Start Services

```bash
# Start all services with docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 9. Run Database Migrations

```bash
# Wait for PostgreSQL to be ready (about 30 seconds)
sleep 30

# Run migrations
docker-compose -f docker-compose.prod.yml exec postgres psql -U overwatch -d overwatch -f /docker-entrypoint-initdb.d/006_add_user_roles_and_status.sql
```

### 10. Configure Nginx (Optional: SSL with Let's Encrypt)

If you have a domain name:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Update nginx config to use SSL
sudo nano /etc/nginx/sites-available/overwatch

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### 11. Test Deployment

```bash
# Check if services are running
docker-compose -f docker-compose.prod.yml ps

# Test HTTP endpoints
curl http://your-instance-ip
curl http://your-instance-ip:1235/api/auth/verify

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs --tail=50
```

### 12. Access Your Application

Open in browser:
- **Main App**: `http://your-instance-ip` or `http://yourdomain.com`
- **WebSocket**: `ws://your-instance-ip:1234`
- **Auth API**: `http://your-instance-ip:1235`

---

## Post-Deployment Steps

### 1. Register Admin Account

1. Navigate to your application URL
2. Click "Register as Admin"
3. Use the `ADMIN_REGISTRATION_SECRET` from your `.env` file
4. Create your admin account

### 2. Setup Monitoring (Optional)

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Monitor resource usage
docker stats

# Setup log rotation
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
sudo systemctl restart docker
docker-compose -f docker-compose.prod.yml restart
```

### 3. Backup Strategy

```bash
# Create backup script
nano ~/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=~/backups

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker-compose -f ~/overwatch/docker-compose.prod.yml exec -T postgres \
  pg_dump -U overwatch overwatch > $BACKUP_DIR/postgres_$DATE.sql

# Backup volumes
docker run --rm \
  -v overwatch_postgres_data:/data \
  -v $BACKUP_DIR:/backup \
  ubuntu tar czf /backup/postgres_data_$DATE.tar.gz /data

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
chmod +x ~/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * ~/backup.sh
```

---

## Cost Optimization Tips

### 1. Use t3.micro Instance
- Burstable performance is suitable for moderate workloads
- Free tier eligible for first 12 months (750 hours/month)

### 2. Use gp3 EBS Volumes
- Cheaper than gp2
- Better performance baseline
- 20% cost savings

### 3. Stop Instance When Not in Use
```bash
# Stop instance (data persists, no EC2 charges)
aws ec2 stop-instances --instance-ids i-1234567890abcdef0

# Start when needed
aws ec2 start-instances --instance-ids i-1234567890abcdef0
```

**Note**: Elastic IP charges apply when instance is stopped (~$0.005/hour)

### 4. Use CloudWatch Alarms
Set up billing alerts:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name billing-alarm \
  --alarm-description "Alert when charges exceed $15" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 15 \
  --comparison-operator GreaterThanThreshold
```

### 5. Cleanup Unused Resources
```bash
# Delete old snapshots
aws ec2 describe-snapshots --owner-ids self \
  --query 'Snapshots[?StartTime<=`2024-01-01`].[SnapshotId]' \
  --output text | xargs -n 1 aws ec2 delete-snapshot --snapshot-id

# Release unassociated Elastic IPs
aws ec2 describe-addresses \
  --query 'Addresses[?AssociationId==null].[AllocationId]' \
  --output text | xargs -n 1 aws ec2 release-address --allocation-id
```

---

## Troubleshooting

### Issue: Out of Memory

**Solution**: Add swap space

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Issue: Docker Build Fails

**Solution**: Increase Docker build memory

```bash
# Edit docker daemon config
sudo nano /etc/docker/daemon.json
```

```json
{
  "default-ulimits": {
    "nofile": {
      "Hard": 64000,
      "Name": "nofile",
      "Soft": 64000
    }
  }
}
```

### Issue: Services Won't Start

**Solution**: Check logs and resources

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs

# Check disk space
df -h

# Check memory
free -h

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Issue: Can't Access from Browser

**Solution**: Check security groups

```bash
# Verify security group rules
aws ec2 describe-security-groups \
  --group-ids sg-xxxxxxxxx

# Check if instance is running
aws ec2 describe-instances \
  --instance-ids i-xxxxxxxxx \
  --query 'Reservations[0].Instances[0].State.Name'
```

---

## Maintenance

### Update Application

```bash
cd ~/overwatch

# Pull latest changes
git pull origin master

# Rebuild
docker-compose -f docker-compose.prod.yml build

# Restart with zero downtime
docker-compose -f docker-compose.prod.yml up -d
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f hocuspocus

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### Database Maintenance

```bash
# Backup database
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U overwatch overwatch > backup.sql

# Restore database
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U overwatch overwatch < backup.sql

# Vacuum database (optimize)
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U overwatch -d overwatch -c "VACUUM ANALYZE;"
```

---

## Cleanup / Teardown

When decommissioning:

```bash
# Stop and remove containers
docker-compose -f docker-compose.prod.yml down -v

# Remove images
docker system prune -a

# On AWS, terminate instance
aws ec2 terminate-instances --instance-ids i-xxxxxxxxx

# Release Elastic IP
aws ec2 release-address --allocation-id eipalloc-xxxxxxxxx
```

---

## Alternative: AWS Free Tier Maximization

If you're within the first 12 months of AWS account:

- **EC2**: 750 hours/month t2.micro or t3.micro (free)
- **EBS**: 30GB gp2 or gp3 (free)
- **Data Transfer**: 100GB outbound (free)
- **RDS** (if using): 750 hours/month db.t2.micro (free)

With free tier, you can run Overwatch essentially **free for 12 months**!

---

## Production Checklist

- [ ] Strong passwords in `.env`
- [ ] Secure JWT and admin secrets generated
- [ ] Security groups configured (minimal open ports)
- [ ] SSH key access only (no password auth)
- [ ] SSL certificate installed (if using domain)
- [ ] Firewall rules configured
- [ ] Log rotation enabled
- [ ] Backup script created
- [ ] Monitoring/alerts set up
- [ ] Elastic IP allocated (if needed)
- [ ] Admin account created
- [ ] Test all features work
- [ ] Document access URLs

---

## Support & Resources

- **AWS Free Tier**: https://aws.amazon.com/free/
- **Docker Documentation**: https://docs.docker.com/
- **PostgreSQL on Docker**: https://hub.docker.com/_/postgres
- **Let's Encrypt**: https://letsencrypt.org/

---

**Built by Daniel Jeong**

For issues or questions, check the logs first:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```
