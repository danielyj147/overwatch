# AWS Quick Start Guide

Deploy Overwatch to AWS in under 30 minutes for ~$5/month.

## Prerequisites (5 minutes)

1. **Install tools**:
   ```bash
   # macOS
   brew install terraform awscli

   # Verify
   terraform version  # >= 1.0
   aws --version
   node --version     # >= 20.x
   ```

2. **Configure AWS**:
   ```bash
   aws configure
   # Enter: Access Key, Secret Key, us-east-1, json
   ```

3. **Generate SSH key**:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/overwatch-ec2 -C "overwatch"
   ```

4. **Get Cloudflare info**:
   - Zone ID: Dashboard → Domain → Right sidebar
   - API Token: Profile → API Tokens → Create Token (Zone.DNS.Edit)

## Deploy (20 minutes)

### 1. Configure Terraform (2 minutes)

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:
```hcl
domain_name = "overwatch.danielyj.com"
cloudflare_zone_id = "your-zone-id"
cloudflare_api_token = "your-token"
ssh_public_key = "ssh-ed25519 AAAA..."
db_password = "$(openssl rand -base64 32)"
hocuspocus_jwt_secret = "$(openssl rand -hex 32)"
```

### 2. Deploy Infrastructure (5 minutes)

```bash
terraform init
terraform apply
# Type: yes
```

Wait for instance to initialize:
```bash
INSTANCE_IP=$(terraform output -raw instance_public_ip)
until ssh -i ~/.ssh/overwatch-ec2 ubuntu@$INSTANCE_IP "docker ps" 2>/dev/null; do
  echo "Waiting..."; sleep 10
done
```

### 3. Deploy Application (10 minutes)

```bash
cd ..
./scripts/deploy.sh
```

### 4. Verify (3 minutes)

Wait 1-2 minutes for SSL, then:
```bash
# Check status
./scripts/status.sh

# Open in browser
terraform output domain_url
```

## Common Operations

```bash
# View logs
./scripts/logs.sh [service-name]

# Check status
./scripts/status.sh

# SSH to instance
./scripts/ssh-connect.sh

# Backup database
./scripts/backup.sh

# Redeploy after code changes
./scripts/deploy.sh
```

## Troubleshooting

### SSL certificate not ready
Wait 2 minutes, check: `./scripts/logs.sh caddy`

### Services not healthy
Check logs: `./scripts/logs.sh`

### Out of memory
Upgrade instance:
```bash
cd terraform
# Edit terraform.tfvars: instance_type = "t4g.small"
terraform apply
./scripts/deploy.sh
```

### DNS not resolving
```bash
dig overwatch.danielyj.com +short
# Should return your Elastic IP
```

## Cost Optimization

**Monthly cost: ~$5**
- EC2 t4g.micro: $3.37
- EBS 20GB: $1.60
- Total: $4.97

**Stop when not in use** (dev/testing):
```bash
aws ec2 stop-instances --instance-ids $(terraform output -raw instance_id)
# To start: aws ec2 start-instances --instance-ids <id>
```

## Scaling Up

For more users or better performance:

```bash
cd terraform
# Edit terraform.tfvars
instance_type = "t4g.small"  # 2GB RAM, ~$15/month
# or: "t4g.medium"  # 4GB RAM, ~$30/month

terraform apply
cd .. && ./scripts/deploy.sh
```

## Cleanup

To remove everything:
```bash
cd terraform
terraform destroy
# Type: yes
```

## Next Steps

- ✅ Set up backups: `./scripts/backup.sh`
- ✅ Configure uptime monitoring: [UptimeRobot](https://uptimerobot.com)
- ✅ Restrict SSH access: Edit `terraform.tfvars` → `ssh_allowed_cidrs`
- ✅ Read full guide: `docs/DEPLOYMENT.md`

## Support

- Full deployment guide: `docs/DEPLOYMENT.md`
- Checklist: `docs/DEPLOYMENT-CHECKLIST.md`
- Terraform docs: `terraform/README.md`
