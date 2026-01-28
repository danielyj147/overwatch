# Quick GitHub Actions Setup

## 1. Get EC2 Information

```bash
cd terraform
terraform output -raw instance_public_ip  # Save this
terraform output -raw domain_url         # Save this
```

## 2. Add GitHub Secrets

Go to: **GitHub → Settings → Secrets and variables → Actions**

Add these 3 secrets:

### EC2_SSH_KEY
```bash
cat ~/.ssh/overwatch-ec2
# Copy entire output
```

### EC2_HOST
```
Your EC2 IP from step 1
Example: 54.123.45.67
```

### DOMAIN_NAME
```
overwatch.danielyj.com
```

## 3. Push to GitHub

```bash
git add .
git commit -m "Add GitHub Actions deployment"
git push origin master
```

## 4. Watch Deployment

Go to: **GitHub → Actions**

Deployment takes 5-10 minutes.

## Done! 🎉

Now every push to master automatically deploys to EC2.

---

**Full docs**: See [GITHUB-ACTIONS.md](../docs/GITHUB-ACTIONS.md)
