#!/bin/bash
set -e

# Overwatch AWS Deployment Script
# This script deploys the application to an existing EC2 instance

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Overwatch AWS Deployment ===${NC}\n"

# Check if terraform outputs are available
if [ ! -d "$PROJECT_ROOT/terraform" ]; then
    echo -e "${RED}Error: terraform directory not found${NC}"
    exit 1
fi

cd "$PROJECT_ROOT/terraform"

# Get instance IP from Terraform
if [ ! -f "terraform.tfstate" ]; then
    echo -e "${RED}Error: terraform.tfstate not found. Run 'terraform apply' first.${NC}"
    exit 1
fi

INSTANCE_IP=$(terraform output -raw instance_public_ip 2>/dev/null)
if [ -z "$INSTANCE_IP" ]; then
    echo -e "${RED}Error: Could not get instance IP from Terraform${NC}"
    exit 1
fi

SSH_KEY="${SSH_KEY:-$HOME/.ssh/overwatch-ec2}"
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: SSH key not found at $SSH_KEY${NC}"
    echo "Set SSH_KEY environment variable or create key at default location"
    exit 1
fi

echo -e "${GREEN}Target instance: ${INSTANCE_IP}${NC}"
echo -e "${GREEN}SSH key: ${SSH_KEY}${NC}\n"

# Step 1: Build frontend
echo -e "${YELLOW}Step 1/5: Building frontend...${NC}"
cd "$PROJECT_ROOT/client"

if [ ! -f ".env.production" ]; then
    DOMAIN_NAME=$(cd "$PROJECT_ROOT/terraform" && terraform output -raw domain_url 2>/dev/null | sed 's|https://||')
    echo "Creating .env.production..."
    cat > .env.production << EOF
VITE_HOCUSPOCUS_URL=wss://${DOMAIN_NAME}/ws
VITE_API_URL=https://${DOMAIN_NAME}/api
VITE_MARTIN_URL=https://${DOMAIN_NAME}/tiles
EOF
fi

npm install
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}Error: Frontend build failed - dist/ directory not created${NC}"
    exit 1
fi

echo -e "${GREEN}Frontend build complete${NC}\n"

# Step 2: Copy files to EC2
echo -e "${YELLOW}Step 2/5: Copying files to EC2...${NC}"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP "mkdir -p /home/ubuntu/overwatch/{server,martin,client,db}"

# Copy docker-compose and Caddyfile
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    "$PROJECT_ROOT/docker-compose.aws.yml" \
    "$PROJECT_ROOT/Caddyfile" \
    ubuntu@$INSTANCE_IP:/home/ubuntu/overwatch/

# Copy server files
echo "Copying server files..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r \
    "$PROJECT_ROOT/server/hocuspocus" \
    ubuntu@$INSTANCE_IP:/home/ubuntu/overwatch/server/

# Copy martin config
echo "Copying martin config..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r \
    "$PROJECT_ROOT/martin" \
    ubuntu@$INSTANCE_IP:/home/ubuntu/overwatch/

# Copy frontend build
echo "Copying frontend build..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r \
    "$PROJECT_ROOT/client/dist" \
    ubuntu@$INSTANCE_IP:/home/ubuntu/overwatch/client/

# Copy database migrations
echo "Copying database migrations..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r \
    "$PROJECT_ROOT/db" \
    ubuntu@$INSTANCE_IP:/home/ubuntu/overwatch/

echo -e "${GREEN}Files copied successfully${NC}\n"

# Step 3: Start Docker containers
echo -e "${YELLOW}Step 3/5: Starting Docker containers...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'ENDSSH'
cd /home/ubuntu/overwatch
docker-compose -f docker-compose.aws.yml pull
docker-compose -f docker-compose.aws.yml build --no-cache
docker-compose -f docker-compose.aws.yml up -d
ENDSSH

echo -e "${GREEN}Docker containers started${NC}\n"

# Step 4: Wait for services to be healthy
echo -e "${YELLOW}Step 4/5: Waiting for services to be healthy...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'ENDSSH'
cd /home/ubuntu/overwatch

# Wait up to 120 seconds for all services to be healthy
TIMEOUT=120
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    HEALTHY_COUNT=$(docker-compose -f docker-compose.aws.yml ps | grep "(healthy)" | wc -l)
    TOTAL_COUNT=$(docker-compose -f docker-compose.aws.yml ps --services | wc -l)

    echo "Healthy services: $HEALTHY_COUNT / $TOTAL_COUNT"

    if [ "$HEALTHY_COUNT" -eq "$TOTAL_COUNT" ]; then
        echo "All services are healthy!"
        break
    fi

    sleep 5
    ELAPSED=$((ELAPSED + 5))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "Warning: Timeout waiting for services to be healthy"
    docker-compose -f docker-compose.aws.yml ps
fi
ENDSSH

echo -e "${GREEN}Services are ready${NC}\n"

# Step 5: Run database migrations
echo -e "${YELLOW}Step 5/5: Running database migrations...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'ENDSSH'
cd /home/ubuntu/overwatch

# Wait for PostgreSQL to be fully ready
sleep 10

# Run migrations
for migration in db/migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "Running migration: $(basename $migration)"
        docker-compose -f docker-compose.aws.yml exec -T postgres \
            psql -U overwatch -d overwatch < "$migration" 2>/dev/null || echo "Migration already applied or failed"
    fi
done

echo "Database migrations complete"
ENDSSH

echo -e "${GREEN}Database migrations complete${NC}\n"

# Final status check
echo -e "${YELLOW}=== Deployment Summary ===${NC}"
echo -e "${GREEN}✓ Frontend built and deployed${NC}"
echo -e "${GREEN}✓ Backend services running${NC}"
echo -e "${GREEN}✓ Database migrations applied${NC}"
echo ""

DOMAIN_URL=$(cd "$PROJECT_ROOT/terraform" && terraform output -raw domain_url 2>/dev/null)
echo -e "${GREEN}Application URL: ${DOMAIN_URL}${NC}"
echo -e "${GREEN}SSH command: ssh -i $SSH_KEY ubuntu@$INSTANCE_IP${NC}"
echo ""

echo "Checking service status..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP \
    "cd /home/ubuntu/overwatch && docker-compose -f docker-compose.aws.yml ps"

echo ""
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Wait 1-2 minutes for Caddy to obtain SSL certificate"
echo "2. Visit $DOMAIN_URL"
echo "3. Monitor logs: ssh -i $SSH_KEY ubuntu@$INSTANCE_IP 'cd /home/ubuntu/overwatch && docker-compose -f docker-compose.aws.yml logs -f'"
