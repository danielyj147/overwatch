# AWS Deployment Checklist

Use this checklist to ensure a smooth deployment.

## Pre-Deployment Checklist

### Prerequisites

- [ ] AWS account created and credentials configured
  ```bash
  aws configure
  aws sts get-caller-identity  # Verify credentials
  ```

- [ ] Cloudflare account with domain added
  - [ ] Domain nameservers updated to Cloudflare
  - [ ] Zone ID copied from dashboard
  - [ ] API token created with Zone.DNS.Edit permissions

- [ ] SSH key pair generated
  ```bash
  ssh-keygen -t ed25519 -f ~/.ssh/overwatch-ec2 -C "overwatch-ec2"
  ```

- [ ] Terraform installed (>= 1.0)
  ```bash
  terraform version
  ```

- [ ] Node.js installed (>= 20.x)
  ```bash
  node --version
  npm --version
  ```

### Configuration

- [ ] Created `terraform/terraform.tfvars` from example
- [ ] Generated strong passwords
  ```bash
  openssl rand -base64 32  # For db_password
  openssl rand -hex 32     # For hocuspocus_jwt_secret
  ```
- [ ] Updated all variables in terraform.tfvars:
  - [ ] aws_region
  - [ ] domain_name
  - [ ] cloudflare_zone_id
  - [ ] cloudflare_api_token
  - [ ] ssh_public_key (paste contents of ~/.ssh/overwatch-ec2.pub)
  - [ ] db_password
  - [ ] hocuspocus_jwt_secret
- [ ] Added terraform.tfvars to .gitignore (verify)

## Infrastructure Deployment

### Terraform Apply

- [ ] Initialize Terraform
  ```bash
  cd terraform
  terraform init
  ```

- [ ] Review plan
  ```bash
  terraform plan
  # Verify: Should create ~12 resources
  ```

- [ ] Apply infrastructure
  ```bash
  terraform apply
  # Type: yes
  # Wait: 3-5 minutes
  ```

- [ ] Save outputs
  ```bash
  terraform output > ../terraform-outputs.txt
  ```

### Instance Initialization

- [ ] Wait for instance initialization (2-3 minutes)
  ```bash
  INSTANCE_IP=$(terraform output -raw instance_public_ip)
  until ssh -i ~/.ssh/overwatch-ec2 -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP "docker ps" 2>/dev/null; do
    echo "Waiting..."; sleep 10
  done
  ```

- [ ] Verify Docker is running
  ```bash
  ssh -i ~/.ssh/overwatch-ec2 ubuntu@$INSTANCE_IP "docker ps"
  # Should show: CONTAINER ID   IMAGE   ...
  ```

## Application Deployment

### Build & Deploy

- [ ] Create frontend .env.production
  ```bash
  cd client
  cat > .env.production << EOF
  VITE_HOCUSPOCUS_URL=wss://overwatch.danielyj.com/ws
  VITE_API_URL=https://overwatch.danielyj.com/api
  VITE_MARTIN_URL=https://overwatch.danielyj.com/tiles
  EOF
  ```

- [ ] Build frontend
  ```bash
  npm install
  npm run build
  # Verify: dist/ directory created
  ```

- [ ] Run deployment script
  ```bash
  cd ..
  ./scripts/deploy.sh
  # Wait: 5-10 minutes
  ```

- [ ] Verify all services running
  ```bash
  ./scripts/status.sh
  # All services should show: Up (healthy)
  ```

## Verification

### Service Health

- [ ] Check container status
  ```bash
  ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
  cd /home/ubuntu/overwatch
  docker-compose -f docker-compose.aws.yml ps
  # All should show: Up (healthy)
  ```

- [ ] Check logs for errors
  ```bash
  docker-compose -f docker-compose.aws.yml logs --tail=50
  # Look for: ERROR, FATAL, panic, exception
  ```

### Endpoint Testing

- [ ] Test health endpoint
  ```bash
  curl https://overwatch.danielyj.com/health
  # Expected: OK
  ```

- [ ] Test vector tiles
  ```bash
  curl -I https://overwatch.danielyj.com/tiles/public.features/0/0/0.pbf
  # Expected: HTTP/2 200
  ```

- [ ] Test frontend
  ```bash
  curl -I https://overwatch.danielyj.com/
  # Expected: HTTP/2 200
  ```

- [ ] Test WebSocket
  ```bash
  npm install -g wscat
  wscat -c wss://overwatch.danielyj.com/ws
  # Should connect, press Ctrl+C to exit
  ```

### SSL Certificate

- [ ] Wait for SSL certificate (1-2 minutes after deployment)
  ```bash
  curl -I https://overwatch.danielyj.com
  # Should return: HTTP/2 200 (not HTTP/1.1)
  ```

- [ ] Verify certificate details
  ```bash
  echo | openssl s_client -connect overwatch.danielyj.com:443 2>/dev/null | openssl x509 -noout -text | grep -A2 "Issuer:"
  # Should show: Let's Encrypt
  ```

### Browser Testing

- [ ] Open in browser: https://overwatch.danielyj.com
- [ ] Verify no SSL warnings
- [ ] Check browser console for errors (F12)
- [ ] Test basic functionality:
  - [ ] Map loads
  - [ ] Can zoom/pan
  - [ ] Drawing tools work
  - [ ] Real-time collaboration works (open in 2 tabs)

## Post-Deployment

### Security

- [ ] Restrict SSH access (optional but recommended)
  ```bash
  # Edit terraform/terraform.tfvars
  ssh_allowed_cidrs = ["YOUR_IP/32"]
  # Run: terraform apply
  ```

- [ ] Review security group rules
  ```bash
  terraform output security_group_id
  aws ec2 describe-security-groups --group-ids <SG_ID>
  ```

- [ ] Verify automatic security updates enabled
  ```bash
  ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
  sudo systemctl status unattended-upgrades
  ```

### Backups

- [ ] Test manual backup
  ```bash
  ./scripts/backup.sh
  # Verify: backups/overwatch-backup-*.sql.gz created
  ```

- [ ] Set up automated backups (optional)
  ```bash
  ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
  # See: docs/DEPLOYMENT.md "Configure Backups" section
  ```

- [ ] Test restore process
  ```bash
  ./scripts/restore.sh backups/overwatch-backup-*.sql.gz
  ```

### Monitoring

- [ ] Set up uptime monitoring
  - [ ] Create UptimeRobot account: https://uptimerobot.com
  - [ ] Add monitor: https://overwatch.danielyj.com/health
  - [ ] Configure email alerts

- [ ] Set up log rotation (already configured, verify)
  ```bash
  ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
  cat /etc/logrotate.d/docker-containers
  ```

- [ ] Monitor resource usage for first week
  ```bash
  ./scripts/status.sh
  # Check: CPU%, Memory%, Disk usage
  ```

### Documentation

- [ ] Document your specific configuration
  - [ ] Instance IP address
  - [ ] Domain name
  - [ ] Any customizations made

- [ ] Store terraform.tfvars securely
  - [ ] Do NOT commit to git
  - [ ] Back up to secure location (password manager, encrypted drive)

- [ ] Save deployment outputs
  ```bash
  cd terraform
  terraform output > deployment-info.txt
  # Store securely with terraform.tfvars
  ```

### Enable Auto-Start

- [ ] Enable overwatch systemd service
  ```bash
  ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
  sudo systemctl enable overwatch
  sudo systemctl status overwatch
  ```

## Validation Tests

### Load Testing (Optional)

- [ ] Test with multiple concurrent users
  ```bash
  # Open 5-10 browser tabs to https://overwatch.danielyj.com
  # Monitor: ./scripts/status.sh
  ```

- [ ] Monitor memory usage under load
  ```bash
  ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
  watch -n 1 "docker stats --no-stream"
  ```

### Failure Recovery

- [ ] Test container restart
  ```bash
  ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
  cd /home/ubuntu/overwatch
  docker-compose -f docker-compose.aws.yml restart hocuspocus
  # Verify: Service recovers and becomes healthy
  ```

- [ ] Test instance reboot
  ```bash
  aws ec2 reboot-instances --instance-ids $(terraform output -raw instance_id)
  # Wait 2-3 minutes
  ./scripts/status.sh
  # Verify: All services come back up
  ```

## Troubleshooting Checklist

If something doesn't work, check:

### Infrastructure Issues

- [ ] AWS credentials valid
  ```bash
  aws sts get-caller-identity
  ```

- [ ] Terraform state is clean
  ```bash
  cd terraform
  terraform plan
  # Should show: No changes
  ```

- [ ] Security group allows traffic
  ```bash
  aws ec2 describe-security-groups --group-ids $(terraform output -raw security_group_id)
  ```

- [ ] Elastic IP attached to instance
  ```bash
  aws ec2 describe-addresses
  ```

### DNS/SSL Issues

- [ ] DNS resolves correctly
  ```bash
  dig overwatch.danielyj.com +short
  # Should return: Elastic IP
  ```

- [ ] Cloudflare proxy is OFF
  ```bash
  # In Cloudflare dashboard
  # DNS record should show gray cloud (not orange)
  ```

- [ ] Port 80 accessible (for Let's Encrypt)
  ```bash
  curl -I http://overwatch.danielyj.com
  # Should redirect to HTTPS
  ```

- [ ] Check Caddy logs
  ```bash
  ./scripts/logs.sh caddy
  # Look for: ACME, certificate, error
  ```

### Application Issues

- [ ] All containers running
  ```bash
  ./scripts/status.sh
  ```

- [ ] No memory/disk issues
  ```bash
  ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
  free -h  # Check memory
  df -h    # Check disk
  ```

- [ ] Database accessible
  ```bash
  ssh -i ~/.ssh/overwatch-ec2 ubuntu@$(terraform output -raw instance_public_ip)
  cd /home/ubuntu/overwatch
  docker-compose -f docker-compose.aws.yml exec postgres pg_isready
  ```

- [ ] Check application logs
  ```bash
  ./scripts/logs.sh
  # Look for: errors, connection failures
  ```

## Success Criteria

Your deployment is successful when:

- ✅ All 5 Docker containers show `Up (healthy)`
- ✅ https://overwatch.danielyj.com loads without SSL warnings
- ✅ Map displays and is interactive
- ✅ Drawing tools function correctly
- ✅ Real-time collaboration works (test with 2 browser tabs)
- ✅ WebSocket connection establishes successfully
- ✅ All health checks return 200 OK
- ✅ Resource usage is normal (< 80% memory, < 50% CPU)
- ✅ Logs show no errors or warnings

## Next Steps

After successful deployment:

1. **Monitor for 24-48 hours**
   - Check status multiple times per day
   - Watch for memory leaks or errors
   - Verify SSL certificate auto-renewal works

2. **Set up regular maintenance**
   - Weekly: Check logs, resource usage
   - Monthly: Review security updates, backup storage
   - Quarterly: Review costs, consider scaling

3. **Plan for scaling**
   - Document when to scale (user count, resource usage)
   - Consider upgrade path (t4g.small, then t4g.medium)
   - Plan for high availability if needed

4. **Team onboarding**
   - Document access procedures
   - Train team on deployment process
   - Establish incident response plan

## Notes

Use this space for deployment-specific notes:

```
Date deployed: ___________
Deployed by: ___________
Instance IP: ___________
Domain: ___________
Instance size: ___________
Issues encountered: ___________
Customizations: ___________
```

---

**Deployment Guide**: See `docs/DEPLOYMENT.md` for detailed instructions.
**Terraform README**: See `terraform/README.md` for infrastructure details.
