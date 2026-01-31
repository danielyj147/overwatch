#!/bin/bash
set -e

# Log all output
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "Starting Overwatch EC2 setup..."

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu

# Install Docker Compose
DOCKER_COMPOSE_VERSION="2.24.0"
curl -L "https://github.com/docker/compose/releases/download/v$${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Enable Docker to start on boot
systemctl enable docker
systemctl start docker

# Install helpful utilities
apt-get install -y wget curl vim htop git

# Create application directory
mkdir -p /home/ubuntu/overwatch
chown -R ubuntu:ubuntu /home/ubuntu/overwatch

# Create .env file with secrets
cat > /home/ubuntu/overwatch/.env << 'ENVEOF'
DATABASE_URL=postgresql://overwatch:${db_password}@postgres:5432/overwatch
POSTGRES_USER=overwatch
POSTGRES_PASSWORD=${db_password}
POSTGRES_DB=overwatch
REDIS_URL=redis://redis:6379
HOCUSPOCUS_SECRET=${hocuspocus_jwt_secret}
HOCUSPOCUS_PORT=1234
HOCUSPOCUS_HTTP_PORT=1235
ADMIN_REGISTRATION_SECRET=${admin_registration_secret}
NODE_ENV=production
DOMAIN_NAME=${domain_name}
ENVEOF

chown ubuntu:ubuntu /home/ubuntu/overwatch/.env
chmod 600 /home/ubuntu/overwatch/.env

# Setup log rotation
cat > /etc/logrotate.d/docker-containers << 'EOF'
/var/lib/docker/containers/*/*.log {
  rotate 7
  daily
  compress
  size=10M
  missingok
  delaycompress
  copytruncate
}
EOF

# Enable automatic security updates
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# Setup Docker log size limits
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

systemctl restart docker

# Create a systemd service to start docker-compose on boot
cat > /etc/systemd/system/overwatch.service << 'EOF'
[Unit]
Description=Overwatch Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/overwatch
ExecStart=/usr/local/bin/docker-compose -f docker-compose.aws.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.aws.yml down
User=ubuntu

[Install]
WantedBy=multi-user.target
EOF

# Don't enable the service yet - wait for deployment
# systemctl enable overwatch

echo "EC2 setup complete! Waiting for application deployment..."
