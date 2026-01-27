# AWS Deployment Cost Analysis

Detailed cost breakdown and optimization strategies for Overwatch deployment.

## Base Configuration (~$5/month)

### Cost Breakdown

| Service | Configuration | Monthly Cost | Annual Cost |
|---------|--------------|--------------|-------------|
| **EC2 Instance** | t4g.micro (ARM64) | $3.37 | $40.44 |
| **EBS Volume** | 20GB gp3 | $1.60 | $19.20 |
| **Elastic IP** | 1 IP (attached) | $0.00 | $0.00 |
| **Data Transfer** | First 100GB | $0.00 | $0.00 |
| **DNS** | Cloudflare (free tier) | $0.00 | $0.00 |
| **SSL** | Let's Encrypt (free) | $0.00 | $0.00 |
| **Total** | | **$4.97** | **$59.64** |

### Assumptions

- **Usage**: 1-5 concurrent users
- **Traffic**: < 100GB/month data transfer (first 100GB free)
- **Region**: us-east-1 (cheapest)
- **Uptime**: 24/7 (730 hours/month)
- **Compute**: t4g ARM instances (30% cheaper than t3)

### What's Included

- ✅ 1GB RAM, 2 vCPU (ARM64)
- ✅ 20GB SSD storage
- ✅ Static IP address
- ✅ Automatic SSL certificates
- ✅ CDN-backed DNS (Cloudflare)
- ✅ 100GB/month bandwidth
- ✅ All required services (PostgreSQL, Redis, Caddy, etc.)

### What's NOT Included

- ❌ Backups (manual only)
- ❌ Monitoring/alerting (use free tier services)
- ❌ Multi-AZ redundancy
- ❌ Managed database (RDS)
- ❌ Load balancer
- ❌ Auto-scaling

## Scaling Tiers

### Tier 1: Small (~$15/month)

**Use when**: 5-15 concurrent users

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| EC2 Instance | t4g.small (2GB RAM) | $13.47 |
| EBS Volume | 30GB gp3 | $2.40 |
| Data Transfer | 100-200GB | $0-9.00 |
| **Total** | | **$15.87 - $24.87** |

**Changes from base**:
- 2x memory (2GB vs 1GB)
- 1.5x storage (30GB vs 20GB)
- Same CPU (2 vCPU)

**How to upgrade**:
```bash
cd terraform
# Edit terraform.tfvars
instance_type = "t4g.small"
# Optional: increase volume_size in main.tf

terraform apply
```

### Tier 2: Medium (~$30/month)

**Use when**: 15-30 concurrent users

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| EC2 Instance | t4g.medium (4GB RAM) | $26.86 |
| EBS Volume | 50GB gp3 | $4.00 |
| Data Transfer | 200-500GB | $9-36.00 |
| **Total** | | **$39.86 - $66.86** |

**Changes from small**:
- 2x memory (4GB vs 2GB)
- 1.7x storage (50GB vs 30GB)
- Same CPU (2 vCPU)

### Tier 3: Production (~$150/month)

**Use when**: 30+ concurrent users, high availability required

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| RDS PostgreSQL | db.t4g.micro (Multi-AZ) | $30.66 |
| ElastiCache Redis | cache.t4g.micro | $12.41 |
| EC2 Instances | 2x t4g.small (ASG) | $26.94 |
| Application Load Balancer | ALB | $22.77 |
| EBS Volumes | 2x 30GB gp3 | $4.80 |
| S3 + CloudFront | Frontend hosting | $5.00 |
| Data Transfer | 1TB | $72.00 |
| Route 53 | Hosted zone | $0.50 |
| **Total** | | **$175.08** |

**Features**:
- High availability (Multi-AZ)
- Automatic failover
- Managed database backups
- Auto-scaling
- CDN for frontend
- Health checks and monitoring

**Not covered in this guide** - requires different architecture.

## Cost Optimization Strategies

### Save 30% - Savings Plans (1 year)

Commit to 1-year usage:

| Tier | On-Demand | Savings Plan | Savings |
|------|-----------|--------------|---------|
| t4g.micro | $40.44/yr | $28.31/yr | $12.13 (30%) |
| t4g.small | $161.64/yr | $113.15/yr | $48.49 (30%) |
| t4g.medium | $322.32/yr | $225.62/yr | $96.70 (30%) |

**How to purchase**:
1. AWS Console → Cost Management → Savings Plans
2. Select "Compute Savings Plans"
3. Choose "1 year, No upfront"
4. Estimated hourly commitment
5. Purchase

### Save 50-70% - Spot Instances

Use spot instances for non-critical environments:

| Tier | On-Demand | Spot | Savings |
|------|-----------|------|---------|
| t4g.micro | $3.37/mo | $1.01/mo | 70% |
| t4g.small | $13.47/mo | $4.04/mo | 70% |

**⚠️ Warning**: Can be terminated with 2-minute notice.

**Use cases**:
- Development environments
- Testing deployments
- Non-critical demos

**How to use**:
```hcl
# terraform/main.tf
resource "aws_instance" "overwatch" {
  instance_market_options {
    market_type = "spot"
    spot_options {
      max_price = "0.005"  # $0.005/hour = ~$3.60/month
    }
  }
}
```

### Save on Storage

**EBS Volume Optimization**:

| Type | IOPS | Throughput | $/GB/month |
|------|------|------------|------------|
| gp3 | 3,000 | 125 MB/s | $0.08 |
| gp2 | 3,000 (20GB) | 128 MB/s | $0.10 |
| sc1 (HDD) | 250 | 250 MB/s | $0.015 |

**Recommendation**: Use gp3 (default in our config).

**Reduce size**:
- Monitor disk usage: `df -h`
- If using < 10GB, consider reducing to 15GB (save $0.40/month)

### Save on Data Transfer

**First 100GB/month is free**, then:

| Volume | Cost |
|--------|------|
| 0-100GB | $0.00 |
| 100GB-10TB | $0.09/GB |
| 10-50TB | $0.085/GB |
| 50TB+ | $0.07/GB |

**Optimization tips**:
1. **Enable compression** (already configured in Caddy)
2. **Optimize images**: Use WebP, compress PNGs
3. **Cache tiles**: Martin + Caddy caching reduces DB queries
4. **CDN for static assets** (CloudFront): First 1TB/month $0.085/GB

### Save by Stopping When Not in Use

**Dev/test environments**:
```bash
# Stop instance (keeps data, stops compute cost)
aws ec2 stop-instances --instance-ids $(terraform output -raw instance_id)

# Savings: $3.37/month per day instance is stopped (~$0.11/day)
```

**Example savings**:
- Stop nights (12hrs/day): Save ~$1.68/month (50%)
- Stop weekends (48hrs/week): Save ~$0.65/month (20%)
- Stop nights + weekends: Save ~$2.33/month (70%)

**Note**: Still charged for:
- EBS storage ($1.60/month)
- Elastic IP if not attached ($3.60/month - detach it!)

### Automated Shutdown Schedule

Use Lambda + EventBridge:
```python
# Lambda function to stop instance at night
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2')
    ec2.stop_instances(InstanceIds=['i-1234567890abcdef0'])
```

Schedule:
- Stop: 10 PM weekdays, 6 PM Friday
- Start: 8 AM weekdays, 9 AM Monday

**Savings**: ~$2/month (60% of compute cost)

## Cost Monitoring

### Set Up Billing Alerts

1. **AWS Budgets** (free):
   ```bash
   AWS Console → Billing → Budgets → Create budget
   Type: Cost budget
   Amount: $10/month
   Alert: 80% threshold
   ```

2. **CloudWatch Billing Alarm**:
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name overwatch-billing \
     --alarm-description "Alert when bill exceeds $10" \
     --metric-name EstimatedCharges \
     --namespace AWS/Billing \
     --statistic Maximum \
     --period 86400 \
     --evaluation-periods 1 \
     --threshold 10 \
     --comparison-operator GreaterThanThreshold
   ```

### Track Costs

**View current month**:
```bash
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

**Cost Explorer**:
- AWS Console → Cost Management → Cost Explorer
- Group by: Service
- Filter: overwatch tags

### Tag Resources for Tracking

All resources tagged with:
```hcl
tags = {
  Name        = "overwatch"
  Project     = "overwatch"
  Environment = "production"
  ManagedBy   = "terraform"
}
```

Cost allocation:
```bash
AWS Console → Cost Management → Cost Allocation Tags
Enable: Project, Environment, ManagedBy
```

## Hidden Costs to Watch

### Data Transfer Charges

**Free**:
- ✅ Inbound data (uploads) - always free
- ✅ Same-AZ traffic - free
- ✅ First 100GB/month outbound - free

**Charged**:
- ❌ Outbound to internet: $0.09/GB (after first 100GB)
- ❌ Cross-region: $0.02/GB
- ❌ NAT Gateway: $0.045/GB processed + $0.045/hour

**Our setup**: No NAT Gateway, single AZ → minimal charges.

### Elastic IP Charges

**Free when attached** to running instance.

**Charged**:
- ❌ Not attached: $3.60/month
- ❌ Attached to stopped instance: $3.60/month

**Our setup**: Always attached to running instance → free.

### Snapshot Costs

**Not included in base config**.

If you enable EBS snapshots:
- Storage: $0.05/GB/month
- Example: 20GB snapshot = $1.00/month

## Cost Comparison

### vs DigitalOcean

| Provider | RAM | CPU | Storage | Price |
|----------|-----|-----|---------|-------|
| AWS t4g.micro | 1GB | 2 vCPU | 20GB | $5/mo |
| DigitalOcean | 1GB | 1 vCPU | 25GB | $6/mo |
| AWS t4g.small | 2GB | 2 vCPU | 30GB | $16/mo |
| DigitalOcean | 2GB | 1 vCPU | 50GB | $12/mo |

**AWS Advantages**:
- Better CPU (2 vs 1)
- Better network (5 Gbps vs 2 Gbps)
- More services (RDS, ElastiCache, etc.)
- Better monitoring/logging

**DigitalOcean Advantages**:
- Simpler pricing
- More storage
- Easier to use

### vs Heroku

| Provider | Dynos | Add-ons | Price |
|----------|-------|---------|-------|
| Heroku Basic | 1 dyno | Postgres, Redis | $25/mo |
| Heroku Standard | 2 dynos | Postgres, Redis | $75/mo |
| AWS t4g.micro | All-in-one | Self-managed | $5/mo |

### vs Vercel + Supabase

| Provider | Compute | Database | Price |
|----------|---------|----------|-------|
| Vercel | Free tier | - | $0 |
| Supabase | - | 500MB | $0 |
| Total (free tier) | Limited | 500MB DB | $0/mo |
| Vercel Pro | Unlimited | - | $20/mo |
| Supabase Pro | - | 8GB DB | $25/mo |
| Total (pro tier) | Unlimited | 8GB DB | $45/mo |
| AWS t4g.micro | Full control | Unlimited | $5/mo |

**Trade-offs**:
- Vercel/Supabase: Easier, less control
- AWS: Cheaper, more control, more work

## Return on Investment

**Break-even analysis**:

If you value your time at $50/hour:

| Option | Setup Time | Monthly Cost | 1-Year Cost |
|--------|-----------|--------------|-------------|
| AWS (self-managed) | 2 hours | $5 | $60 + $100 setup |
| Heroku | 0.5 hours | $25 | $300 + $25 setup |
| DigitalOcean | 1 hour | $12 | $144 + $50 setup |

**AWS saves money if**:
- Project runs > 6 months
- You're comfortable with DevOps
- You need full control

**Use managed services if**:
- Time is more valuable than money
- You want guaranteed uptime
- You need enterprise support

## Recommendations

### For Development

**Best**: AWS t4g.micro ($5/month)
- Stop when not working (save 50-70%)
- Use spot instances (save 70%)
- No need for redundancy

### For Small Production (1-10 users)

**Best**: AWS t4g.micro ($5/month)
- Enable automated backups (+$1/month)
- Set up uptime monitoring (free)
- Keep it simple

### For Medium Production (10-50 users)

**Best**: AWS t4g.small ($16/month)
- Automated backups (+$2/month)
- CloudWatch monitoring (+$2/month)
- Total: ~$20/month

### For Large Production (50+ users)

**Best**: Managed services (~$150-300/month)
- RDS Multi-AZ for database
- ElastiCache for Redis
- Application Load Balancer
- Auto-scaling EC2 instances
- CloudFront for static assets
- Full monitoring and backups

## Summary

**Our AWS deployment**:
- ✅ Ultra-low cost: $5/month
- ✅ Full control over infrastructure
- ✅ Easy to scale up when needed
- ✅ Perfect for demos, small teams, MVPs

**Best for**:
- Side projects
- MVPs and prototypes
- Small teams (< 10 users)
- Learning/educational use
- Budget-conscious deployments

**Not ideal for**:
- Mission-critical production
- High-traffic applications (> 50 concurrent users)
- Enterprise requirements (SLA, compliance)
- Teams without DevOps skills

**Bottom line**: You can run a full-featured collaborative mapping platform for the cost of a coffee ☕

---

Last updated: January 2026
Prices based on: us-east-1, on-demand pricing
