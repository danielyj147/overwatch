# Overwatch Documentation

Complete documentation for deploying and operating Overwatch.

## Getting Started

### Local Development
- See main [README.md](../README.md) for local development setup
- See [CLAUDE.md](../CLAUDE.md) for architecture and development guidelines

### AWS Deployment

Deploy to AWS for under $10/month with automatic SSL and managed DNS.

#### Quick Links

| Document | Purpose | Time Required |
|----------|---------|---------------|
| [AWS Quick Start](./AWS-QUICKSTART.md) | Fast deployment guide | 30 minutes |
| [Full Deployment Guide](./DEPLOYMENT.md) | Comprehensive instructions | 1 hour |
| [Deployment Checklist](./DEPLOYMENT-CHECKLIST.md) | Step-by-step checklist | - |
| [Cost Analysis](./COST-ANALYSIS.md) | Cost breakdown & optimization | - |
| [Terraform README](../terraform/README.md) | Infrastructure documentation | - |

## Deployment Guides

### [AWS Quick Start](./AWS-QUICKSTART.md)

The fastest way to get Overwatch running on AWS. Perfect for:
- First-time deployments
- Quick demos
- Development/testing environments

**What you'll get**: Fully functional Overwatch instance in 30 minutes for ~$5/month.

### [Full Deployment Guide](./DEPLOYMENT.md)

Comprehensive guide covering:
- Prerequisites and setup
- Step-by-step deployment
- Post-deployment configuration
- Maintenance procedures
- Troubleshooting
- Scaling strategies

**Best for**: Production deployments and complete understanding.

### [Deployment Checklist](./DEPLOYMENT-CHECKLIST.md)

Interactive checklist to ensure nothing is missed:
- ☑️ Pre-deployment checks
- ☑️ Infrastructure deployment steps
- ☑️ Application deployment steps
- ☑️ Verification procedures
- ☑️ Post-deployment tasks

**Best for**: First-time deployers and ensuring completeness.

## Reference Documentation

### [Cost Analysis](./COST-ANALYSIS.md)

Detailed breakdown of AWS costs:
- Base configuration ($5/month)
- Scaling tiers ($5 → $15 → $30 → $150)
- Optimization strategies
- Cost monitoring setup
- Comparison with other providers

**Best for**: Budget planning and cost optimization.

### [Terraform Documentation](../terraform/README.md)

Infrastructure-as-code documentation:
- Terraform configuration details
- Resource specifications
- Variables and outputs
- Updating infrastructure
- Troubleshooting Terraform issues

**Best for**: Understanding and modifying infrastructure.

### [GitHub Actions Setup](./GITHUB-ACTIONS.md)

Automatic deployment with CI/CD:
- Setup instructions (3 secrets needed)
- Workflow details
- Monitoring deployments
- Troubleshooting CI/CD
- Security best practices

**Best for**: Setting up automatic deployments.

Infrastructure-as-code documentation:
- Terraform configuration details
- Resource specifications
- Variables and outputs
- Updating infrastructure
- Troubleshooting Terraform issues

**Best for**: Understanding and modifying infrastructure.

## Helper Scripts

All scripts located in `/scripts/`:

| Script | Purpose | Usage |
|--------|---------|-------|
| `deploy.sh` | Deploy application to EC2 | `./scripts/deploy.sh` |
| `status.sh` | Check service status | `./scripts/status.sh` |
| `logs.sh` | View service logs | `./scripts/logs.sh [service]` |
| `ssh-connect.sh` | SSH to EC2 instance | `./scripts/ssh-connect.sh` |
| `backup.sh` | Backup database | `./scripts/backup.sh` |
| `restore.sh` | Restore database | `./scripts/restore.sh <backup-file>` |

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        INTERNET                              │
│  Users → Cloudflare DNS → AWS Elastic IP → EC2 Instance     │
└─────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│              EC2 t4g.micro (1GB RAM, 2 vCPU)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Caddy (Reverse Proxy + SSL)                         │  │
│  │    ├─→ / (Frontend static files)                     │  │
│  │    ├─→ /ws (WebSocket → Hocuspocus)                  │  │
│  │    └─→ /tiles/* (Vector tiles → Martin)              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Application Services (Docker Compose)               │  │
│  │    ├─→ Hocuspocus (Collaboration server)             │  │
│  │    ├─→ Martin (Vector tile server)                   │  │
│  │    ├─→ PostgreSQL + PostGIS (Database)               │  │
│  │    └─→ Redis (Cache & Pub/Sub)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Storage: 20GB EBS gp3 volume                               │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend**:
- MapLibre GL JS - Map rendering
- Deck.gl - Data visualization layers
- Yjs - Real-time collaboration (CRDT)
- React - UI framework

**Backend**:
- Hocuspocus - Yjs WebSocket server
- Martin - Vector tile server (Rust)
- PostgreSQL + PostGIS - Spatial database
- Redis - Pub/sub and caching

**Infrastructure**:
- Caddy - Reverse proxy with automatic SSL
- Docker Compose - Container orchestration
- Terraform - Infrastructure as code
- Cloudflare - DNS and DDoS protection

## Deployment Options

### Option 1: Ultra-Low Cost ($5/month) ✅

**Configuration**: Single EC2 t4g.micro instance

**Best for**:
- Demos and MVPs
- Small teams (1-5 users)
- Development/testing
- Learning projects

**Pros**:
- Extremely low cost
- Simple to manage
- Easy to set up

**Cons**:
- No redundancy
- Limited to ~5 concurrent users
- Single point of failure

**Documentation**: This guide focuses on this option.

### Option 2: Small Production ($15/month)

**Configuration**: EC2 t4g.small instance (2GB RAM)

**Best for**:
- Small production deployments
- Teams of 5-15 users
- Active development projects

**Pros**:
- Better performance
- Handle more users
- Room to grow

**Cons**:
- Still single instance
- No automatic failover

**How to upgrade**:
```bash
cd terraform
# Edit terraform.tfvars: instance_type = "t4g.small"
terraform apply
```

### Option 3: High Availability ($150+/month)

**Configuration**: Multi-AZ with managed services

**Best for**:
- Production applications
- Large teams (30+ users)
- Mission-critical deployments

**Includes**:
- Multiple EC2 instances + ALB
- RDS PostgreSQL (Multi-AZ)
- ElastiCache Redis
- Auto-scaling
- Automated backups

**Note**: Not covered in this guide - requires different architecture.

## Common Operations

### Initial Deployment

```bash
# 1. Configure Terraform
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit with your values

# 2. Deploy infrastructure
terraform init
terraform apply

# 3. Deploy application
cd ..
./scripts/deploy.sh
```

### Updating Application

```bash
# After making code changes
git pull
./scripts/deploy.sh
```

### Checking Status

```bash
# Service status and resource usage
./scripts/status.sh

# View logs
./scripts/logs.sh          # All services
./scripts/logs.sh caddy    # Specific service
```

### Database Operations

```bash
# Create backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh backups/overwatch-backup-YYYYMMDD-HHMMSS.sql.gz

# Connect to database
./scripts/ssh-connect.sh
docker-compose -f docker-compose.aws.yml exec postgres psql -U overwatch overwatch
```

### Scaling Up

```bash
# Upgrade to t4g.small (2GB RAM)
cd terraform
# Edit terraform.tfvars: instance_type = "t4g.small"
terraform apply

# Redeploy application
cd ..
./scripts/deploy.sh
```

### Maintenance

```bash
# View service logs
./scripts/logs.sh [service-name]

# Restart services
./scripts/ssh-connect.sh
cd /home/ubuntu/overwatch
docker-compose -f docker-compose.aws.yml restart [service-name]

# Update Docker images
docker-compose -f docker-compose.aws.yml pull
docker-compose -f docker-compose.aws.yml up -d
```

## Troubleshooting

### Quick Diagnostics

```bash
# Check all services
./scripts/status.sh

# View recent logs
./scripts/logs.sh

# Test endpoints
curl https://overwatch.danielyj.com/health
curl -I https://overwatch.danielyj.com/
```

### Common Issues

**Services not starting**:
- Check logs: `./scripts/logs.sh`
- Verify memory: `./scripts/status.sh`
- Restart: `./scripts/ssh-connect.sh` then `docker-compose restart`

**SSL certificate not issuing**:
- Wait 2 minutes after deployment
- Check logs: `./scripts/logs.sh caddy | grep -i acme`
- Verify DNS: `dig overwatch.danielyj.com +short`

**Out of memory**:
- Check usage: `./scripts/status.sh`
- Upgrade instance: Edit terraform.tfvars, `terraform apply`
- Add swap: See [DEPLOYMENT.md](./DEPLOYMENT.md#out-of-memory)

**Database connection errors**:
- Check PostgreSQL: `./scripts/logs.sh postgres`
- Verify .env file on EC2
- Restart database: `docker-compose restart postgres`

### Getting Help

- Check logs first: `./scripts/logs.sh`
- Review [Full Deployment Guide](./DEPLOYMENT.md#troubleshooting)
- Review [Deployment Checklist](./DEPLOYMENT-CHECKLIST.md#troubleshooting-checklist)

## Security

### Recommended Practices

1. **Restrict SSH access**:
   ```hcl
   # terraform.tfvars
   ssh_allowed_cidrs = ["YOUR_IP/32"]
   ```

2. **Strong passwords**: Use generated passwords
   ```bash
   openssl rand -base64 32  # Database
   openssl rand -hex 32     # JWT secret
   ```

3. **Regular backups**: Set up automated daily backups

4. **Monitoring**: Configure uptime monitoring (UptimeRobot, etc.)

5. **Updates**: Keep system packages updated (automatic via unattended-upgrades)

### Security Checklist

- [ ] SSH restricted to known IPs
- [ ] Strong passwords used
- [ ] terraform.tfvars not in git
- [ ] Backups configured
- [ ] Uptime monitoring active
- [ ] SSL certificate valid
- [ ] Security updates enabled

## Support

### Documentation

- [AWS Quick Start](./AWS-QUICKSTART.md)
- [Full Deployment Guide](./DEPLOYMENT.md)
- [Deployment Checklist](./DEPLOYMENT-CHECKLIST.md)
- [Cost Analysis](./COST-ANALYSIS.md)
- [Terraform README](../terraform/README.md)
- [Architecture Guide](../CLAUDE.md)

### External Resources

- [Terraform Documentation](https://www.terraform.io/docs)
- [AWS Documentation](https://docs.aws.amazon.com)
- [Caddy Documentation](https://caddyserver.com/docs)
- [Docker Compose Documentation](https://docs.docker.com/compose)

---

**Last Updated**: January 2026
