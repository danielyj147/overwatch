# GitHub Actions Deployment Secrets

**Built by Daniel Jeong**

Quick reference for setting up GitHub Actions automated deployment.

## Required Secrets

Go to: **Repository → Settings → Secrets and variables → Actions**

### 1. EC2_HOST

**Description:** EC2 instance public IP address

**How to get:**
```bash
cd terraform
terraform output instance_public_ip
```

**Example:**
```
1.2.3.4
```

---

### 2. EC2_SSH_KEY

**Description:** Private SSH key for EC2 access (entire key including headers)

**How to get:**
```bash
cat ~/.ssh/overwatch-ec2
```

**Example format:**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBK... (many lines) ...
-----END OPENSSH PRIVATE KEY-----
```

**⚠️ Important:**
- Copy the ENTIRE key including BEGIN and END lines
- Don't add any extra spaces or newlines
- Keep this secret secure

---

### 3. DOMAIN_NAME

**Description:** Your full domain name

**Example:**
```
overwatch.yourdomain.com
```

**Don't include:**
- `https://` prefix
- Trailing slashes
- Port numbers

---

## Setup Instructions

### Step 1: Get Terraform Outputs

```bash
cd terraform
terraform output
```

This shows:
- `instance_public_ip` → Use for `EC2_HOST`
- `domain_url` → Extract domain for `DOMAIN_NAME`

### Step 2: Copy SSH Key

```bash
# Display the private key
cat ~/.ssh/overwatch-ec2

# Copy the ENTIRE output including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ... key content ...
# -----END OPENSSH PRIVATE KEY-----
```

### Step 3: Add to GitHub

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**
5. Add each secret:

   **First Secret:**
   - Name: `EC2_HOST`
   - Secret: `1.2.3.4` (your IP)
   - Click **Add secret**

   **Second Secret:**
   - Name: `EC2_SSH_KEY`
   - Secret: (paste entire private key)
   - Click **Add secret**

   **Third Secret:**
   - Name: `DOMAIN_NAME`
   - Secret: `overwatch.yourdomain.com`
   - Click **Add secret**

### Step 4: Verify Setup

After adding secrets:

1. Make a test commit:
   ```bash
   git add .
   git commit -m "test: trigger deployment"
   git push origin master
   ```

2. Go to **Actions** tab on GitHub
3. Watch the deployment run
4. Check for green checkmarks ✅

---

## Troubleshooting

### "Permission denied (publickey)"

**Cause:** SSH key is incorrect or incomplete

**Fix:**
1. Verify you copied the ENTIRE private key
2. Check for extra spaces or newlines
3. Regenerate key if needed:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/overwatch-ec2-new
   # Update Terraform with new public key
   # Re-add private key to GitHub secrets
   ```

### "Host key verification failed"

**Cause:** EC2 host not in known_hosts

**Fix:** This is handled automatically by the workflow. If it persists:
- Check EC2_HOST is correct
- Verify EC2 instance is running
- Check security group allows SSH

### "Connection refused" on EC2_HOST

**Cause:** Instance not accessible or wrong IP

**Fix:**
1. Verify instance is running:
   ```bash
   terraform show | grep instance_state
   ```
2. Check IP is correct:
   ```bash
   terraform output instance_public_ip
   ```
3. Test SSH manually:
   ```bash
   ssh -i ~/.ssh/overwatch-ec2 ubuntu@YOUR_IP
   ```

### Deployment succeeds but site doesn't work

**Cause:** Domain name incorrect or DNS not updated

**Fix:**
1. Verify DNS points to EC2 IP:
   ```bash
   dig overwatch.yourdomain.com
   ```
2. Check Cloudflare DNS record
3. Wait for DNS propagation (up to 5 minutes)

---

## Security Best Practices

### 1. Restrict SSH Access

Update EC2 security group to only allow SSH from GitHub Actions IPs:

```bash
# Get GitHub Actions IP ranges
curl https://api.github.com/meta | jq .actions
```

### 2. Rotate Keys Periodically

```bash
# Generate new key
ssh-keygen -t ed25519 -f ~/.ssh/overwatch-ec2-new

# Update Terraform
cd terraform
nano terraform.tfvars  # Update ssh_public_key
terraform apply

# Update GitHub secret
# Delete old key
rm ~/.ssh/overwatch-ec2
mv ~/.ssh/overwatch-ec2-new ~/.ssh/overwatch-ec2
```

### 3. Monitor Deployments

- Enable email notifications in GitHub Actions
- Check logs after each deployment
- Test the live site immediately

### 4. Use Branch Protection

1. Go to Settings → Branches
2. Add rule for `master` branch
3. Require pull request reviews
4. Require status checks to pass

---

## Testing Deployment

### Manual Test

After adding secrets:

```bash
# Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "test: trigger deployment"
git push origin master
```

### Watch Deployment

1. Go to GitHub → Actions tab
2. Click on the running workflow
3. Expand each step to see details
4. Look for errors (red ✗) or success (green ✓)

### Verify Live Site

```bash
# Check site is accessible
curl -I https://overwatch.yourdomain.com

# Check API
curl https://overwatch.yourdomain.com/api/auth/verify

# SSH and check services
ssh -i ~/.ssh/overwatch-ec2 ubuntu@YOUR_IP
cd overwatch
docker-compose -f docker-compose.aws.yml ps
```

---

## Quick Reference Card

| Secret | Description | Get From |
|--------|-------------|----------|
| **EC2_HOST** | EC2 Public IP | `terraform output instance_public_ip` |
| **EC2_SSH_KEY** | Private SSH Key | `cat ~/.ssh/overwatch-ec2` |
| **DOMAIN_NAME** | Your Domain | Your Cloudflare/DNS config |

**Add at:** GitHub → Repository → Settings → Secrets and variables → Actions

---

**Built by Daniel Jeong** | GitHub Actions Setup
