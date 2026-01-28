# GitHub Actions Deployment Setup

Automatic deployment to AWS EC2 on every push to the master branch.

## Overview

The GitHub Actions workflow automatically:
1. ✅ Builds the frontend
2. ✅ Copies files to EC2
3. ✅ Rebuilds Docker containers
4. ✅ Runs database migrations
5. ✅ Verifies deployment

**Triggers**:
- Automatic: Push to `master` branch
- Manual: Workflow dispatch (from GitHub Actions tab)

## Setup Instructions

### Step 1: Get Your EC2 Information

From your local machine:

```bash
cd terraform

# Get EC2 IP address
terraform output -raw instance_public_ip

# Get your domain name
terraform output -raw domain_url
```

Save these values for Step 2.

### Step 2: Add GitHub Secrets

Go to your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

Add the following secrets:

#### 1. EC2_SSH_KEY

Your SSH private key for accessing EC2:

```bash
# Display your private key
cat ~/.ssh/overwatch-ec2

# Copy the entire output (including BEGIN and END lines)
```

- **Name**: `EC2_SSH_KEY`
- **Value**: Paste the entire private key

#### 2. EC2_HOST

Your EC2 instance IP address:

- **Name**: `EC2_HOST`
- **Value**: `YOUR_INSTANCE_IP` (from Step 1)
- **Example**: `54.123.45.67`

#### 3. DOMAIN_NAME

Your domain name:

- **Name**: `DOMAIN_NAME`
- **Value**: `overwatch.danielyj.com`

### Step 3: Test the Workflow

#### Option A: Push to Master

```bash
git add .
git commit -m "Setup GitHub Actions deployment"
git push origin master
```

#### Option B: Manual Trigger

1. Go to GitHub → Actions tab
2. Select "Deploy to AWS EC2" workflow
3. Click "Run workflow"
4. Select branch: `master`
5. Click "Run workflow"

### Step 4: Monitor Deployment

1. Go to **GitHub → Actions**
2. Click on the running workflow
3. Watch the deployment progress in real-time

Expected duration: **5-10 minutes**

## Workflow Details

### Main Workflow: `deploy.yml`

**Triggered by**: Push to master, manual dispatch

**Steps**:
1. **Checkout code** - Get latest code
2. **Setup Node.js** - Install Node.js 20
3. **Build frontend** - Create production build
4. **Setup SSH** - Configure SSH access to EC2
5. **Deploy to EC2** - Copy files to server
6. **Start services** - Rebuild and restart containers
7. **Run migrations** - Apply database migrations
8. **Verify deployment** - Check service health

### Test Workflow: `test.yml`

**Triggered by**: Pull requests, pushes to non-master branches

**Tests**:
- Frontend build
- Server build
- Docker Compose validation

## Deployment Process

### What Happens During Deployment

```
┌─────────────────────────────────────────────┐
│  GitHub Actions Runner                      │
│  1. Build frontend (npm run build)          │
│  2. Create deployment package               │
└─────────────────┬───────────────────────────┘
                  │
                  ↓ SCP over SSH
┌─────────────────────────────────────────────┐
│  EC2 Instance (overwatch)                   │
│  3. Receive files                           │
│  4. Pull Docker images                      │
│  5. Build custom images                     │
│  6. Start containers                        │
│  7. Run migrations                          │
│  8. Health check                            │
└─────────────────────────────────────────────┘
```

### Files Deployed

- `docker-compose.aws.yml` - Container orchestration
- `Caddyfile` - Reverse proxy config
- `server/hocuspocus/` - Backend server
- `martin/` - Vector tile config
- `client/dist/` - Frontend build
- `db/migrations/` - Database migrations

## Monitoring Deployments

### View Deployment Logs

GitHub → Actions → Select workflow run → Click on job

### Check Deployment Status on EC2

After deployment completes:

```bash
# From your local machine
./scripts/status.sh

# View recent logs
./scripts/logs.sh --tail=50
```

### Verify Application

Visit: https://overwatch.danielyj.com

Check:
- [ ] Site loads without errors
- [ ] SSL certificate valid
- [ ] Map displays correctly
- [ ] Drawing tools work
- [ ] Real-time collaboration works

## Troubleshooting

### Deployment Fails at "Setup SSH"

**Error**: `Permission denied (publickey)`

**Solution**:
1. Verify `EC2_SSH_KEY` secret contains correct private key
2. Check key format (should start with `-----BEGIN OPENSSH PRIVATE KEY-----`)
3. Ensure key has correct permissions on EC2

### Deployment Fails at "Deploy to EC2"

**Error**: `Host key verification failed`

**Solution**:
- The workflow automatically adds host keys
- If persists, check `EC2_HOST` secret is correct IP

### Services Don't Start

**Error**: Containers exit immediately

**Solution**:
1. Check logs on EC2:
   ```bash
   ./scripts/ssh-connect.sh
   docker-compose -f docker-compose.aws.yml logs
   ```
2. Verify `.env` file exists on EC2
3. Check memory usage (may need to upgrade instance)

### Frontend Build Fails

**Error**: `npm run build` fails

**Solution**:
1. Test build locally first:
   ```bash
   cd client
   npm ci
   npm run build
   ```
2. Fix any build errors
3. Commit and push again

### Health Check Fails

**Warning**: `Health check failed`

**Note**: This is often normal on first deploy (SSL certificate generation takes time)

**Check**:
1. Wait 2-3 minutes
2. Visit https://overwatch.danielyj.com manually
3. Run: `./scripts/logs.sh caddy`

## Advanced Configuration

### Deploy on Tag

To deploy only on version tags:

```yaml
# .github/workflows/deploy.yml
on:
  push:
    tags:
      - 'v*'
```

### Add Slack Notifications

```yaml
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Deployment ${{ job.status }}: ${{ github.event.head_commit.message }}"
      }
```

### Deploy to Multiple Environments

Create separate workflows:
- `deploy-staging.yml` - Deploy to staging EC2
- `deploy-production.yml` - Deploy to production EC2

Use different secrets:
- `STAGING_EC2_HOST`, `STAGING_SSH_KEY`
- `PRODUCTION_EC2_HOST`, `PRODUCTION_SSH_KEY`

### Rollback Strategy

Manual rollback:

```bash
# SSH to EC2
./scripts/ssh-connect.sh

# View previous images
docker images

# Rollback to previous version
cd /home/ubuntu/overwatch
docker-compose -f docker-compose.aws.yml down
docker-compose -f docker-compose.aws.yml up -d

# Or restore from backup
./scripts/restore.sh /home/ubuntu/backups/backup-YYYYMMDD.sql.gz
```

## Security Best Practices

### Secrets Management

✅ **DO**:
- Store all sensitive data in GitHub Secrets
- Use separate SSH keys for CI/CD
- Rotate SSH keys regularly
- Use least-privilege access

❌ **DON'T**:
- Commit secrets to repository
- Share SSH keys between environments
- Use personal SSH keys for CI/CD

### SSH Key Security

Create a dedicated deployment key:

```bash
# Generate dedicated key for CI/CD
ssh-keygen -t ed25519 -f ~/.ssh/github-actions-deploy -C "github-actions"

# Add to EC2
ssh-copy-id -i ~/.ssh/github-actions-deploy ubuntu@$EC2_HOST

# Add to GitHub Secrets (EC2_SSH_KEY)
cat ~/.ssh/github-actions-deploy
```

### Audit Deployments

View deployment history:
- GitHub → Actions tab
- Filter by workflow: "Deploy to AWS EC2"
- Review logs for each deployment

## Workflow Customization

### Change Deployment Branch

```yaml
# Deploy on pushes to 'production' branch
on:
  push:
    branches:
      - production
```

### Add Pre-deployment Tests

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run tests
        run: |
          cd client
          npm ci
          npm test

  deploy:
    needs: test  # Only deploy if tests pass
    runs-on: ubuntu-latest
    # ... rest of deploy job
```

### Deploy Specific Services Only

```yaml
# Only rebuild and restart hocuspocus
- name: Deploy backend only
  run: |
    ssh -i ~/.ssh/deploy_key $EC2_USER@$EC2_HOST << 'ENDSSH'
      cd /home/ubuntu/overwatch
      docker-compose -f docker-compose.aws.yml up -d --build hocuspocus
    ENDSSH
```

## Performance Optimization

### Cache Dependencies

Already configured:
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'  # Caches node_modules
```

### Parallel Uploads

For faster deployment, use rsync:

```bash
# Install rsync on EC2 first
ssh -i ~/.ssh/deploy_key $EC2_USER@$EC2_HOST "sudo apt-get install -y rsync"

# In workflow, use rsync instead of scp
rsync -avz -e "ssh -i ~/.ssh/deploy_key" \
  --exclude 'node_modules' \
  --exclude '.git' \
  . $EC2_USER@$EC2_HOST:/home/ubuntu/overwatch/
```

## Cost Considerations

**GitHub Actions free tier**:
- 2,000 minutes/month (public repos: unlimited)
- Linux runners: 1x multiplier

**Average deployment**:
- Duration: ~5-10 minutes
- Cost: Free (well within limits)

**Tip**: Use `workflow_dispatch` for manual deploys to avoid unnecessary runs.

## Monitoring & Alerts

### Email Notifications

GitHub automatically sends emails on workflow failures to:
- Repository owner
- Commit author

### Status Badge

Add to README.md:

```markdown
[![Deploy Status](https://github.com/danielyj147/overwatch/actions/workflows/deploy.yml/badge.svg)](https://github.com/danielyj147/overwatch/actions/workflows/deploy.yml)
```

### Uptime Monitoring

Set up external monitoring:
1. [UptimeRobot](https://uptimerobot.com) - Free tier
2. Monitor: `https://overwatch.danielyj.com/health`
3. Alert on downtime

## Comparison: Manual vs Automated

| Aspect | Manual Deploy | GitHub Actions |
|--------|--------------|----------------|
| Time | 15-20 min | 5-10 min |
| Consistency | Variable | Always same |
| Human Error | Possible | Eliminated |
| Rollback | Manual | Automated |
| Audit Trail | None | Full logs |
| Cost | Free | Free |

## Next Steps

After setting up GitHub Actions:

1. **Test deployment**: Push a small change
2. **Monitor first deploy**: Watch logs carefully
3. **Document process**: Update team wiki
4. **Set up staging**: Create staging environment
5. **Add monitoring**: Configure uptime checks

## Support

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Workflow Logs**: GitHub → Actions → Select run
- **EC2 Logs**: `./scripts/logs.sh`
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Last Updated**: January 2026

**Workflow Files**:
- `.github/workflows/deploy.yml` - Main deployment
- `.github/workflows/test.yml` - Testing and validation
