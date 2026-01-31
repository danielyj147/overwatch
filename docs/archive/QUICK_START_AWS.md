# Overwatch - Quick Start AWS Deployment

**Built by Daniel Jeong**

Quick reference guide for deploying Overwatch to AWS. For detailed instructions, see `AWS_DEPLOYMENT_GUIDE.md`.

## Prerequisites

- AWS Account (free tier eligible recommended)
- SSH key pair for EC2
- Basic Linux/terminal knowledge

## Cost Estimate

**~$10-12/month** (or ~$3-5 with free tier)
- EC2 t3.micro: ~$7.50/month (free tier: 750 hours/month)
- EBS 30GB: ~$3/month
- Elastic IP: Free (while instance running)

## Quick Deploy (5 Steps)

### 1. Launch EC2 Instance

**Via AWS Console:**
- AMI: Ubuntu 22.04 LTS
- Instance Type: t3.micro
- Storage: 30GB gp3
- Security Group: Allow ports 22, 80, 443, 1234, 1235
- Create/select SSH key pair

**Via AWS CLI:**
```bash
# Set your key pair name
KEY_NAME="your-key-pair"

# Create security group
aws ec2 create-security-group \
  --group-name overwatch-sg \
  --description "Overwatch application"

# Get security group ID
SG_ID=$(aws ec2 describe-security-groups \
  --group-names overwatch-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# Add rules
aws ec2 authorize-security-group-ingress --group-id $SG_ID \
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
  --key-name $KEY_NAME \
  --security-group-ids $SG_ID \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=overwatch-production}]'
```

### 2. Connect and Run Setup Script

```bash
# SSH into instance (replace with your IP and key)
ssh -i your-key.pem ubuntu@YOUR_INSTANCE_IP

# Clone repository
git clone https://github.com/yourusername/overwatch.git
cd overwatch

# Run automated setup
./scripts/deploy-aws.sh
```

The script will:
- Install Docker & Docker Compose
- Install Node.js
- Setup swap space
- Configure firewall
- Create backup scripts
- Setup environment template

### 3. Configure Environment

```bash
# Generate secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For ADMIN_SECRET

# Edit .env file
nano .env

# Update these values:
# - POSTGRES_PASSWORD (strong password)
# - HOCUSPOCUS_SECRET (JWT secret from above)
# - ADMIN_REGISTRATION_SECRET (admin secret from above)
# - Replace YOUR_DOMAIN_OR_IP with your EC2 public IP
```

### 4. Build and Start

```bash
# Build frontend
cd client
npm install
npm run build
cd ..

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start (30 seconds)
sleep 30

# Run database migrations
./scripts/run-migrations.sh

# Check health
./scripts/check-health.sh
```

### 5. Register Admin Account

1. Open browser: `http://YOUR_INSTANCE_IP`
2. Click "Register as Admin"
3. Enter:
   - Display Name: Daniel Jeong
   - Email: your@email.com
   - Password: (strong password)
   - Admin Secret: (from .env file)
4. Click "Register as Admin"

**Done!** You now have a running Overwatch instance.

---

## Useful Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f hocuspocus
```

### Check Status
```bash
./scripts/check-health.sh
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Stop Services
```bash
docker-compose -f docker-compose.prod.yml stop
```

### Update Application
```bash
./scripts/update-app.sh
```

### Backup Database
```bash
~/backup.sh
```

---

## Access URLs

Replace `YOUR_IP` with your EC2 instance public IP:

- **Main Application**: `http://YOUR_IP`
- **Admin Dashboard**: `http://YOUR_IP` (login as admin)
- **Auth API**: `http://YOUR_IP:1235`
- **WebSocket**: `ws://YOUR_IP:1234`
- **Vector Tiles**: `http://YOUR_IP:3000`

---

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check resources
free -h
df -h

# Restart Docker
sudo systemctl restart docker
```

### Can't connect from browser
```bash
# Check security group
aws ec2 describe-security-groups --group-ids YOUR_SG_ID

# Check if instance is running
docker-compose -f docker-compose.prod.yml ps
```

### Out of memory
```bash
# Add swap (already done by deploy script)
sudo swapon --show

# Check memory
free -h
docker stats
```

---

## Cost Optimization

### Stop Instance When Not Using
```bash
# On your local machine
aws ec2 stop-instances --instance-ids i-YOUR_INSTANCE_ID

# Start when needed
aws ec2 start-instances --instance-ids i-YOUR_INSTANCE_ID
```

**Note**: Elastic IP charges ~$0.005/hour when instance is stopped

### Monitor Costs
```bash
# Set billing alarm (local machine)
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

---

## Next Steps

1. **Setup Domain** (Optional)
   - Point domain to Elastic IP
   - Update `.env` with domain
   - Install SSL with Let's Encrypt

2. **Enable HTTPS** (Optional)
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

3. **Custom Branding**
   - All pages show "Built by Daniel Jeong"
   - Customize colors in `client/src/styles/globals.css`

4. **Test Features**
   - Register test users
   - Approve users via admin dashboard
   - Test collaborative mapping

---

## Support

For detailed documentation:
- Full deployment guide: `AWS_DEPLOYMENT_GUIDE.md`
- Admin setup: `SETUP_ADMIN.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`

Check logs for issues:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

---

**Built by Daniel Jeong** | Portfolio Showcase

---

## Cleanup

When decommissioning:

```bash
# On instance
docker-compose -f docker-compose.prod.yml down -v

# On local machine
aws ec2 terminate-instances --instance-ids i-YOUR_INSTANCE_ID
aws ec2 release-address --allocation-id eipalloc-YOUR_ALLOCATION_ID
aws ec2 delete-security-group --group-id sg-YOUR_SG_ID
```

---

## Architecture

Single EC2 instance running:
- Nginx (reverse proxy + frontend)
- React Client (built static files)
- Hocuspocus (WebSocket + Auth API)
- Martin (vector tiles)
- PostgreSQL + PostGIS
- Redis

All in Docker containers with ~1GB RAM total usage.
