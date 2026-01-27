# Overwatch AWS Terraform Deployment

This directory contains Terraform configuration to deploy Overwatch to AWS for under $10/month.

## Architecture

- **EC2 Instance**: t4g.micro (ARM64, 1GB RAM, 2 vCPU)
- **Storage**: 20GB gp3 EBS volume
- **Network**: VPC with single public subnet, Elastic IP
- **DNS**: Cloudflare managed DNS
- **SSL**: Automatic via Caddy + Let's Encrypt

**Estimated Monthly Cost**: ~$5-6/month

## Prerequisites

1. **AWS Account** with credentials configured
   ```bash
   aws configure
   ```

2. **Cloudflare Account** with:
   - Domain managed in Cloudflare (e.g., danielyj.com)
   - API token with `Zone.DNS.Edit` permissions
   - Zone ID from Cloudflare dashboard

3. **SSH Key Pair**
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/overwatch-ec2 -C "overwatch-ec2"
   ```

4. **Terraform** installed (>= 1.0)
   ```bash
   brew install terraform  # macOS
   # or visit https://www.terraform.io/downloads
   ```

## Quick Start

### 1. Create terraform.tfvars

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:
```hcl
aws_region = "us-east-1"
domain_name = "overwatch.danielyj.com"
cloudflare_zone_id = "your-cloudflare-zone-id"
cloudflare_api_token = "your-cloudflare-api-token"
ssh_public_key = "ssh-ed25519 AAAAC3... your-email"
db_password = "$(openssl rand -base64 32)"
hocuspocus_jwt_secret = "$(openssl rand -hex 32)"
```

**Generate secure passwords:**
```bash
# Database password
openssl rand -base64 32

# Hocuspocus JWT secret
openssl rand -hex 32
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Review Plan

```bash
terraform plan
```

This will show you all resources that will be created:
- VPC with public subnet
- Internet Gateway
- Security Group (ports 22, 80, 443)
- EC2 t4g.micro instance
- Elastic IP
- Cloudflare DNS A record

### 4. Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted. This will take 3-5 minutes.

### 5. Wait for Instance Initialization

The EC2 instance runs a user-data script that installs Docker. Wait for it to complete:

```bash
# Get instance IP
INSTANCE_IP=$(terraform output -raw instance_public_ip)

# Wait for SSH and Docker
until ssh -i ~/.ssh/overwatch-ec2 -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP "docker ps" 2>/dev/null; do
  echo "Waiting for instance setup..."
  sleep 10
done
```

### 6. Deploy Application

```bash
cd ..
./scripts/deploy.sh
```

This script will:
- Build the frontend
- Copy all files to EC2
- Start Docker containers
- Run database migrations

### 7. Access Your Application

```bash
# Get your application URL
terraform output domain_url

# Wait 1-2 minutes for SSL certificate
# Then open in browser: https://overwatch.danielyj.com
```

## Outputs

After `terraform apply`, you'll get:

```bash
# View all outputs
terraform output

# Specific outputs
terraform output instance_public_ip
terraform output domain_url
terraform output ssh_command
```

## SSH Access

```bash
# Using Terraform output
$(terraform output -raw ssh_command)

# Or directly
ssh -i ~/.ssh/overwatch-ec2 ubuntu@<INSTANCE_IP>
```

## Updating the Deployment

To update your application:

```bash
# Make code changes, then redeploy
./scripts/deploy.sh
```

To update infrastructure:

```bash
cd terraform
terraform plan   # Review changes
terraform apply  # Apply changes
```

## Monitoring

### Check Service Status

```bash
ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
cd /home/ubuntu/overwatch
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
```

### Monitor Resources

```bash
# Container stats
docker stats

# Disk usage
df -h

# Memory usage
free -h
```

## Scaling Up

If you need more resources:

### Option 1: Upgrade Instance Type

Edit `terraform.tfvars`:
```hcl
instance_type = "t4g.small"  # 2GB RAM, ~$15/month
```

Then apply:
```bash
terraform apply
```

**Note**: This will stop and restart your instance (brief downtime).

### Option 2: Increase Storage

Edit `terraform/main.tf`, change `volume_size`:
```hcl
root_block_device {
  volume_size = 30  # Increase from 20GB
  ...
}
```

Then:
```bash
terraform apply
ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
sudo growpart /dev/xvda 1
sudo resize2fs /dev/xvda1
```

## Backup

### Manual Backup

```bash
ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)

# Backup database
cd /home/ubuntu/overwatch
docker-compose -f docker-compose.aws.yml exec postgres \
  pg_dump -U overwatch overwatch > backup-$(date +%Y%m%d).sql

# Download backup
exit
scp -i ~/.ssh/overwatch-ec2 ubuntu@<IP>:/home/ubuntu/overwatch/backup-*.sql ./
```

### Automated Backups (Optional)

Enable EBS snapshots via AWS Console:
- EC2 → Elastic Block Store → Volumes
- Select volume → Actions → Create Snapshot Schedule
- Cost: ~$1/month for 20GB with weekly backups

## Disaster Recovery

If your instance fails:

1. **Rebuild infrastructure**:
   ```bash
   cd terraform
   terraform apply
   ```

2. **Restore from backup**:
   ```bash
   ./scripts/deploy.sh
   ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
   cd /home/ubuntu/overwatch
   cat backup-YYYYMMDD.sql | docker-compose -f docker-compose.aws.yml exec -T postgres psql -U overwatch overwatch
   ```

## Troubleshooting

### Cannot connect to instance

```bash
# Check instance state
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=overwatch" \
  --query 'Reservations[0].Instances[0].State.Name'

# Check security group
terraform output security_group_id
aws ec2 describe-security-groups --group-ids <SG_ID>
```

### SSL certificate not issued

```bash
# Check Caddy logs
ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
docker-compose -f docker-compose.aws.yml logs caddy | grep -i acme

# Verify DNS
dig $(terraform output -raw domain_name) +short
# Should return your Elastic IP
```

### Out of memory

```bash
# Check memory usage
docker stats

# Add swap (temporary fix)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Permanent solution: upgrade to t4g.small
```

### Services not starting

```bash
# Check Docker daemon
sudo systemctl status docker

# Check logs
docker-compose -f docker-compose.aws.yml logs

# Restart services
docker-compose -f docker-compose.aws.yml restart
```

## Cost Management

### Current Cost Breakdown

| Resource | Monthly Cost |
|----------|--------------|
| EC2 t4g.micro | $3.37 |
| EBS gp3 20GB | $1.60 |
| Elastic IP | $0 (attached) |
| Data Transfer | $0 (first 100GB free) |
| **Total** | **~$5/month** |

### Cost Optimization

1. **Stop when not in use**:
   ```bash
   aws ec2 stop-instances --instance-ids $(terraform output -raw instance_id)
   # Saves compute cost, EBS storage still charged
   ```

2. **Use Savings Plans**: 1-year commitment saves 30%

3. **Schedule auto-shutdown**: Use AWS Lambda for off-hours shutdown

## Cleanup

To completely remove all resources:

```bash
cd terraform
terraform destroy
```

This will delete:
- EC2 instance
- Elastic IP
- Security Group
- VPC and subnet
- Cloudflare DNS record

**Warning**: This is irreversible. Backup your data first!

## Security Notes

- SSH key is required for access (password auth disabled)
- Security group allows SSH from anywhere by default (restrict in `terraform.tfvars`)
- All services run in private Docker network (not exposed to internet)
- Caddy provides automatic SSL with Let's Encrypt
- Secrets stored in `.env` file on EC2 (not in Terraform state)

## Next Steps

After deployment:

1. Test the application: `https://overwatch.danielyj.com`
2. Set up monitoring (CloudWatch, logs)
3. Configure backup schedule
4. Restrict SSH access to your IP only
5. Consider setting up a staging environment

## Support

- GitHub Issues: https://github.com/yourusername/overwatch/issues
- Documentation: See `/docs/DEPLOYMENT.md`
