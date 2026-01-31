# Terraform & Local Deployment Guide

**Built by Daniel Jeong**

This document summarizes the Terraform AWS deployment and local development setup for Overwatch.

## What Was Updated

### 1. ✅ Terraform Configuration

**Files Modified:**
- `terraform/variables.tf` - Added `admin_registration_secret` variable
- `terraform/main.tf` - Added admin secret to user-data template
- `terraform/user-data.sh` - Includes admin secret in .env file
- `terraform/terraform.tfvars.example` - Updated with admin secret
- `terraform/README.md` - Updated documentation

**New Environment Variable:**
```hcl
variable "admin_registration_secret" {
  description = "Secret key required for admin registration"
  type        = string
  sensitive   = true
}
```

### 2. ✅ Docker Compose AWS

**File Modified:**
- `docker-compose.aws.yml` - Added `ADMIN_REGISTRATION_SECRET` to Hocuspocus service

### 3. ✅ Local Development Scripts

**New Files Created:**
- `scripts/local-dev.sh` - Local development setup
- `scripts/local-prod.sh` - Local production build

---

## Terraform AWS Deployment

### Quick Start

```bash
# 1. Configure
cd terraform
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Edit with your values

# 2. Generate secrets
openssl rand -base64 32  # For db_password
openssl rand -hex 32     # For hocuspocus_jwt_secret
openssl rand -base64 32  # For admin_registration_secret

# 3. Deploy infrastructure
terraform init
terraform plan
terraform apply

# 4. SSH to instance
ssh -i ~/.ssh/your-key ubuntu@$(terraform output -raw instance_public_ip)

# 5. Deploy application
git clone https://github.com/yourusername/overwatch.git
cd overwatch
./scripts/deploy.sh
```

### terraform.tfvars Example

```hcl
# AWS Configuration
aws_region    = "us-east-1"
instance_type = "t3.micro"

# Domain Configuration
domain_name = "overwatch.yourdomain.com"

# Cloudflare Configuration
cloudflare_zone_id    = "your-zone-id"
cloudflare_subdomain  = "overwatch"
cloudflare_api_token  = "your-api-token"

# SSH Configuration
ssh_public_key = "ssh-ed25519 AAAAC3... your@email.com"
ssh_allowed_cidrs = ["YOUR_IP/32"]

# Application Secrets (generated with openssl)
db_password               = "generated-secret"
hocuspocus_jwt_secret     = "generated-secret"
admin_registration_secret = "generated-secret"
```

### Cost Estimate

| Resource | Cost/Month |
|----------|------------|
| EC2 t3.micro | $7.50 (free tier: 750 hrs) |
| EBS 20GB | $2.00 |
| Elastic IP | Free (while attached) |
| Data Transfer | $0.90 |
| **Total** | **~$10-12** |

*With AWS Free Tier: ~$3-5/month*

---

## Local Development Setup

### Quick Start

```bash
# Run the development setup script
./scripts/local-dev.sh
```

This script will:
1. ✅ Check prerequisites (Docker, Node.js)
2. ✅ Create/validate .env file
3. ✅ Generate secrets automatically (optional)
4. ✅ Start backend services (PostgreSQL, Redis, Martin, Hocuspocus)
5. ✅ Run database migrations
6. ✅ Install frontend dependencies
7. ✅ Optionally start frontend dev server

### Manual Setup

```bash
# 1. Setup environment
cp .env.example .env
nano .env  # Edit secrets

# 2. Start backend services
docker-compose up -d postgres redis martin hocuspocus

# 3. Run migrations
./scripts/run-migrations.sh

# 4. Start frontend
cd client
npm install
npm run dev
```

### Access Points

- **Frontend**: http://localhost:5173
- **Auth API**: http://localhost:1235
- **WebSocket**: ws://localhost:1234
- **Vector Tiles**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## Local Production Build

### Quick Start

```bash
# Run the production build script
./scripts/local-prod.sh
```

This script will:
1. ✅ Build frontend production bundle
2. ✅ Start all services with production configuration
3. ✅ Run database migrations
4. ✅ Verify service health

### Manual Build

```bash
# 1. Build frontend
cd client
npm install
npm run build
cd ..

# 2. Start production services
docker-compose -f docker-compose.prod.yml up -d

# 3. Run migrations
./scripts/run-migrations.sh
```

### Access

- **Application**: http://localhost
- **All services** via Nginx reverse proxy

---

## Deployment Comparison

| Feature | Local Dev | Local Prod | AWS Terraform |
|---------|-----------|------------|---------------|
| **Purpose** | Development | Testing | Production |
| **Frontend** | Vite dev server | Built static files | Built static files |
| **Backend** | Docker Compose | Docker Compose | Docker Compose |
| **SSL** | No | No (or self-signed) | Yes (Let's Encrypt) |
| **Domain** | localhost | localhost | Custom domain |
| **Cost** | $0 | $0 | ~$10/month |
| **Setup Time** | 5 min | 10 min | 30 min |

---

## Admin Registration

### For All Deployments

1. Navigate to application URL:
   - Local Dev: http://localhost:5173
   - Local Prod: http://localhost
   - AWS: https://overwatch.yourdomain.com

2. Click "Register as Admin"

3. Enter:
   - Display Name: Your Name
   - Email: your@email.com
   - Password: (strong password)
   - Admin Secret: (from .env or terraform.tfvars)

4. Click "Register as Admin"

5. You'll be logged in to the Admin Dashboard

---

## Useful Commands

### Local Development

```bash
# Start backend services
./scripts/local-dev.sh

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Reset database
docker-compose down -v
docker-compose up -d postgres
./scripts/run-migrations.sh
```

### Local Production

```bash
# Build and run
./scripts/local-prod.sh

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### Terraform AWS

```bash
# Deploy infrastructure
cd terraform
terraform apply

# Get instance IP
terraform output instance_public_ip

# SSH to instance
ssh -i ~/.ssh/your-key ubuntu@$(terraform output -raw instance_public_ip)

# Destroy infrastructure
terraform destroy
```

---

## Environment Variables

### Required for All Deployments

```bash
# Database
DATABASE_URL=postgresql://overwatch:PASSWORD@localhost:5432/overwatch
POSTGRES_USER=overwatch
POSTGRES_PASSWORD=your-password
POSTGRES_DB=overwatch

# Redis
REDIS_URL=redis://localhost:6379

# Hocuspocus
HOCUSPOCUS_PORT=1234
HOCUSPOCUS_HTTP_PORT=1235
HOCUSPOCUS_SECRET=your-jwt-secret
ADMIN_REGISTRATION_SECRET=your-admin-secret

# Martin
MARTIN_PORT=3000
```

### Additional for AWS

```bash
NODE_ENV=production
DOMAIN_NAME=overwatch.yourdomain.com
```

---

## Troubleshooting

### Local Development

**Services won't start:**
```bash
docker-compose logs
docker-compose restart
```

**Database connection errors:**
```bash
docker-compose exec postgres psql -U overwatch -d overwatch
```

**Frontend won't start:**
```bash
cd client
rm -rf node_modules
npm install
npm run dev
```

### AWS Terraform

**Terraform apply fails:**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check Terraform state
terraform show
```

**Application not accessible:**
```bash
# SSH to instance
ssh -i ~/.ssh/your-key ubuntu@YOUR_IP

# Check Docker services
docker-compose -f docker-compose.aws.yml ps

# View logs
docker-compose -f docker-compose.aws.yml logs -f
```

### Common Issues

**"Admin secret is invalid"**
- Check ADMIN_REGISTRATION_SECRET in .env or terraform.tfvars
- Ensure no extra spaces or quotes
- Restart services after changing .env

**"Database not ready"**
- Wait 30 seconds after starting PostgreSQL
- Check: `docker-compose exec postgres pg_isready`

**"Out of memory"**
- Local: Increase Docker memory in settings
- AWS: Upgrade to t3.small (2GB RAM)

---

## Next Steps

### After Local Setup

1. ✅ Register admin account
2. ✅ Test user registration flow
3. ✅ Verify admin can approve users
4. ✅ Test collaborative mapping features

### After AWS Deployment

1. ✅ Register admin account
2. ✅ Test from external network
3. ✅ Setup monitoring (optional)
4. ✅ Configure backups (automated via user-data.sh)
5. ✅ Add custom branding (optional)

---

## Documentation

- **Main README**: `/README.md`
- **Terraform Guide**: `/terraform/README.md`
- **AWS Deployment**: `/AWS_DEPLOYMENT_GUIDE.md`
- **Admin Setup**: `/SETUP_ADMIN.md`
- **Quick Start AWS**: `/QUICK_START_AWS.md`

---

**Built by Daniel Jeong** | Production-Ready Deployment

All scripts are tested and ready for use!
