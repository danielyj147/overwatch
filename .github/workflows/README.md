# GitHub Actions Workflows

**Built by Daniel Jeong**

Automated CI/CD workflows for Overwatch.

## Workflows

### 1. Deploy to AWS EC2 (`deploy.yml`)

**Triggers:**
- Push to `master` branch
- Manual trigger via GitHub Actions UI

**What it does:**
1. Builds frontend production bundle
2. Copies files to EC2 instance via SSH
3. Rebuilds Docker containers
4. Starts all services
5. Runs database migrations
6. Verifies deployment

**Required Secrets:**

Go to GitHub → Repository → Settings → Secrets and variables → Actions

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `EC2_HOST` | EC2 instance public IP | `1.2.3.4` |
| `EC2_SSH_KEY` | Private SSH key for EC2 | Contents of `~/.ssh/overwatch-ec2` |
| `DOMAIN_NAME` | Your domain | `overwatch.yourdomain.com` |

**Setup:**

```bash
# 1. Get EC2 public IP from Terraform
cd terraform
terraform output instance_public_ip

# 2. Get SSH private key
cat ~/.ssh/overwatch-ec2

# 3. Add secrets to GitHub:
# - EC2_HOST: Paste the IP
# - EC2_SSH_KEY: Paste the entire private key
# - DOMAIN_NAME: Your domain (e.g., overwatch.yourdomain.com)
```

**Manual Trigger:**

1. Go to GitHub → Actions → Deploy to AWS EC2
2. Click "Run workflow"
3. Select branch (master)
4. Click "Run workflow"

### 2. Test Build (`test.yml`)

**Triggers:**
- Pull requests to `master`
- Push to any branch except `master`

**What it does:**
1. Tests frontend build
2. Lints frontend code
3. Tests server build
4. Validates Docker Compose files

**No secrets required** - runs on GitHub Actions runners.

## Deployment Flow

```
┌─────────────────────────────────────────────────┐
│  1. Developer pushes to master                  │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  2. GitHub Actions triggered                    │
│     - Checkout code                             │
│     - Setup Node.js                             │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  3. Build frontend                              │
│     - Create .env.production                    │
│     - npm ci && npm run build                   │
│     - Verify dist/ exists                       │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  4. Setup SSH                                   │
│     - Create ~/.ssh/deploy_key                  │
│     - Add EC2 to known_hosts                    │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  5. Deploy files to EC2                         │
│     - SCP docker-compose.aws.yml                │
│     - SCP Caddyfile                             │
│     - SCP server/hocuspocus/                    │
│     - SCP martin/                               │
│     - SCP client/dist/                          │
│     - SCP db/migrations/                        │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  6. Start services on EC2                       │
│     - docker-compose pull                       │
│     - docker-compose build                      │
│     - docker-compose up -d                      │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  7. Run database migrations                     │
│     - Wait for PostgreSQL                       │
│     - Apply each migration                      │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  8. Verify deployment                           │
│     - Check service status                      │
│     - View logs                                 │
│     - Test health endpoint                      │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│  9. Deployment complete! ✅                     │
│     Application live at domain                  │
└─────────────────────────────────────────────────┘
```

## First Time Setup

### 1. Add GitHub Secrets

```bash
# Get your EC2 IP
cd terraform
terraform output instance_public_ip
# Copy the IP

# Get your SSH key
cat ~/.ssh/overwatch-ec2
# Copy the ENTIRE private key (including BEGIN/END lines)
```

Go to GitHub:
1. Repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret:
   - Name: `EC2_HOST`, Value: (paste IP)
   - Name: `EC2_SSH_KEY`, Value: (paste private key)
   - Name: `DOMAIN_NAME`, Value: `overwatch.yourdomain.com`

### 2. Test Deployment

```bash
# Make a small change and push
git add .
git commit -m "test: trigger deployment"
git push origin master

# Watch deployment
# Go to GitHub → Actions tab
```

### 3. Monitor Deployment

1. Go to GitHub → Actions
2. Click on the running workflow
3. Watch each step execute
4. Check for errors in red steps

## Troubleshooting

### Deployment fails at "Setup SSH"

**Error:** "Permission denied (publickey)"

**Fix:**
- Verify `EC2_SSH_KEY` secret contains the complete private key
- Check key has correct permissions on EC2
- Ensure key matches public key used in Terraform

### Deployment fails at "Deploy to EC2"

**Error:** "Connection refused" or "Host unreachable"

**Fix:**
- Verify `EC2_HOST` is correct
- Check EC2 security group allows SSH from GitHub Actions IPs
- Confirm EC2 instance is running

### Build succeeds but site doesn't work

**Error:** Application loads but shows errors

**Fix:**
- Check `DOMAIN_NAME` secret is correct
- Verify Caddyfile has correct domain
- Check docker-compose logs on EC2:
  ```bash
  ssh -i ~/.ssh/overwatch-ec2 ubuntu@YOUR_IP
  cd overwatch
  docker-compose -f docker-compose.aws.yml logs -f
  ```

### Migrations fail

**Error:** "relation already exists" or migration errors

**Fix:**
- This is usually OK - migrations check if tables exist
- Verify PostgreSQL is healthy:
  ```bash
  docker-compose -f docker-compose.aws.yml exec postgres \
    psql -U overwatch -d overwatch -c "SELECT version();"
  ```

## Manual Deployment

If GitHub Actions is unavailable, deploy manually:

```bash
# SSH to EC2
ssh -i ~/.ssh/overwatch-ec2 ubuntu@YOUR_IP

# Pull latest code
cd overwatch
git pull origin master

# Build frontend locally
cd client
npm install
npm run build
cd ..

# Restart services
docker-compose -f docker-compose.aws.yml build
docker-compose -f docker-compose.aws.yml up -d

# Check status
docker-compose -f docker-compose.aws.yml ps
```

## Best Practices

### 1. Use Feature Branches

```bash
# Create feature branch
git checkout -b feature/new-feature

# Push to trigger test workflow
git push origin feature/new-feature

# Create PR to trigger tests again
# Merge to master to trigger deployment
```

### 2. Monitor Deployments

- Always watch GitHub Actions while deploying
- Check EC2 logs after deployment
- Test the live site immediately

### 3. Rollback if Needed

```bash
# SSH to EC2
ssh -i ~/.ssh/overwatch-ec2 ubuntu@YOUR_IP

cd overwatch

# Revert to previous commit
git log --oneline -n 5
git checkout PREVIOUS_COMMIT_HASH

# Rebuild and restart
docker-compose -f docker-compose.aws.yml build
docker-compose -f docker-compose.aws.yml up -d
```

### 4. Use Deployment Notifications

Add Slack/Discord webhook to get notified:

```yaml
# In deploy.yml, add a final step:
- name: Notify deployment
  if: always()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"Deployment ${{ job.status }}"}'
```

## Security Notes

1. **Never commit secrets** to repository
2. **Restrict SSH access** - use specific IPs in security group
3. **Rotate SSH keys** periodically
4. **Review workflow logs** - they don't show secret values
5. **Use branch protection** - require PR reviews before merging to master

## Additional Actions (Optional)

### Add Dependency Updates

Create `.github/workflows/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/client"
    schedule:
      interval: "weekly"

  - package-ecosystem: "npm"
    directory: "/server/hocuspocus"
    schedule:
      interval: "weekly"
```

### Add Security Scanning

```yaml
- name: Run security audit
  run: |
    cd client
    npm audit --production
```

---

**Built by Daniel Jeong** | Automated Deployment
