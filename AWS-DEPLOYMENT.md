# AWS Deployment - Getting Started

Deploy Overwatch to AWS for **~$5/month** with automatic SSL certificates.

## 🚀 Quick Start (30 minutes)

### Step 1: Prerequisites (5 minutes)

Install required tools:
```bash
# macOS
brew install terraform awscli

# Verify installations
terraform version  # Should be >= 1.0
aws --version
node --version     # Should be >= 20.x
```

Configure AWS:
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key
# Region: us-east-1
# Output format: json
```

Generate SSH key:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/overwatch-ec2 -C "overwatch-ec2"
```

Get Cloudflare credentials:
- **Zone ID**: Cloudflare Dashboard → Your Domain → Right sidebar
- **API Token**: My Profile → API Tokens → Create Token (Zone.DNS.Edit)

### Step 2: Configure Terraform (5 minutes)

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
aws_region = "us-east-1"
domain_name = "overwatch.danielyj.com"
cloudflare_zone_id = "your-zone-id-here"
cloudflare_api_token = "your-api-token-here"
ssh_public_key = "ssh-ed25519 AAAA..."  # Paste contents of ~/.ssh/overwatch-ec2.pub
db_password = "PASTE_OUTPUT_BELOW"
hocuspocus_jwt_secret = "PASTE_OUTPUT_BELOW"
```

Generate secure passwords:
```bash
# Generate and copy these values to terraform.tfvars
echo "db_password = \"$(openssl rand -base64 32)\""
echo "hocuspocus_jwt_secret = \"$(openssl rand -hex 32)\""
```

### Step 3: Deploy Infrastructure (5 minutes)

```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Deploy (will take 3-5 minutes)
terraform apply
# Type: yes when prompted
```

Wait for instance to initialize:
```bash
INSTANCE_IP=$(terraform output -raw instance_public_ip)
until ssh -i ~/.ssh/overwatch-ec2 -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP "docker ps" 2>/dev/null; do
  echo "Waiting for instance initialization..."
  sleep 10
done
echo "✓ Instance ready!"
```

### Step 4: Deploy Application (15 minutes)

```bash
cd ..
./scripts/deploy.sh
```

This will:
- Build the frontend
- Copy files to EC2
- Start all Docker containers
- Run database migrations

### Step 5: Access Your Application (2 minutes)

Wait 1-2 minutes for SSL certificate, then:

```bash
# Get your URL
terraform output domain_url

# Check status
./scripts/status.sh
```

Open in browser: **https://overwatch.danielyj.com**

---

## 📚 Documentation

- **Quick Start**: [docs/AWS-QUICKSTART.md](./docs/AWS-QUICKSTART.md)
- **Full Guide**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- **Checklist**: [docs/DEPLOYMENT-CHECKLIST.md](./docs/DEPLOYMENT-CHECKLIST.md)
- **Cost Analysis**: [docs/COST-ANALYSIS.md](./docs/COST-ANALYSIS.md)
- **Terraform**: [terraform/README.md](./terraform/README.md)

## 🛠️ Common Operations

```bash
# Check service status
./scripts/status.sh

# View logs
./scripts/logs.sh              # All services
./scripts/logs.sh hocuspocus   # Specific service

# SSH to instance
./scripts/ssh-connect.sh

# Backup database
./scripts/backup.sh

# Restore database
./scripts/restore.sh <backup-file>

# Redeploy after code changes
./scripts/deploy.sh
```

## 💰 Cost

**Monthly**: ~$5
- EC2 t4g.micro: $3.37
- EBS 20GB: $1.60
- Elastic IP: $0 (free when attached)
- Data transfer: $0 (first 100GB free)

## 🔧 Troubleshooting

### Services not starting
```bash
./scripts/logs.sh
./scripts/status.sh
```

### SSL certificate not ready
Wait 2 minutes after deployment, then check:
```bash
./scripts/logs.sh caddy | grep -i acme
```

### Out of memory
Upgrade instance:
```bash
cd terraform
# Edit terraform.tfvars: instance_type = "t4g.small"
terraform apply
cd .. && ./scripts/deploy.sh
```

### DNS not resolving
```bash
dig overwatch.danielyj.com +short
# Should return your Elastic IP
```

## 📈 Scaling

Need more resources? Easy upgrade:

```bash
cd terraform
# Edit terraform.tfvars
instance_type = "t4g.small"  # 2GB RAM, ~$15/month
# or: "t4g.medium"  # 4GB RAM, ~$30/month

terraform apply
cd .. && ./scripts/deploy.sh
```

## 🧹 Cleanup

To remove everything:
```bash
cd terraform
terraform destroy
# Type: yes
```

## 🆘 Support

- **Documentation**: [docs/README.md](./docs/README.md)
- **Architecture**: [CLAUDE.md](./CLAUDE.md)
- **Issues**: Check logs first with `./scripts/logs.sh`

---

## What You Get

✅ **Full-featured mapping platform** for $5/month
✅ **Automatic SSL certificates** via Let's Encrypt
✅ **Real-time collaboration** with Yjs
✅ **Vector tile rendering** with Martin
✅ **Spatial database** (PostgreSQL + PostGIS)
✅ **Easy to scale** as you grow
✅ **Complete control** over infrastructure

---

**Ready to deploy?** Start with Step 1 above! 🚀
