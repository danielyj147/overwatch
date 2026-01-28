#!/bin/bash
set -e

# Overwatch Local Linux PC Setup Script
# This script helps set up Overwatch on a local Linux machine

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Overwatch Local Setup ===${NC}\n"

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${RED}Error: This script is for Linux only${NC}"
    exit 1
fi

# Check if Docker is installed
echo -e "${BLUE}Checking prerequisites...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}Docker installed${NC}"
    echo -e "${YELLOW}Please log out and back in for Docker group to take effect${NC}"
    exit 0
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Installing Node.js 20...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "${GREEN}Node.js installed${NC}"
fi

echo -e "${GREEN}Prerequisites OK${NC}\n"

# Ask deployment type
echo -e "${BLUE}Select deployment type:${NC}"
echo "1) Development (localhost only, no SSL)"
echo "2) Production (public access with domain and SSL)"
read -p "Enter choice [1-2]: " DEPLOY_TYPE

if [ "$DEPLOY_TYPE" = "1" ]; then
    echo -e "\n${GREEN}=== Development Deployment ===${NC}\n"

    # Setup .env
    if [ ! -f ".env" ]; then
        echo -e "${BLUE}Creating .env file...${NC}"
        cp .env.example .env
        echo -e "${GREEN}.env created${NC}"
    fi

    # Start services
    echo -e "\n${BLUE}Starting services...${NC}"
    docker compose up -d

    echo -e "\n${BLUE}Waiting for services to be healthy...${NC}"
    sleep 10

    # Show status
    docker compose ps

    # Start frontend
    echo -e "\n${BLUE}Setting up frontend...${NC}"
    cd client
    if [ ! -d "node_modules" ]; then
        npm install
    fi

    echo -e "\n${GREEN}=== Setup Complete! ===${NC}"
    echo -e "${YELLOW}Start frontend with:${NC}"
    echo -e "  cd client && npm run dev"
    echo -e "\n${YELLOW}Access at:${NC} http://localhost:5173"

elif [ "$DEPLOY_TYPE" = "2" ]; then
    echo -e "\n${GREEN}=== Production Deployment ===${NC}\n"

    # Get domain
    read -p "Enter your domain name (e.g., overwatch.example.com): " DOMAIN_NAME

    # Generate passwords
    DB_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -hex 32)

    # Create .env
    echo -e "${BLUE}Creating production .env...${NC}"
    cat > .env << EOF
# Database
DATABASE_URL=postgresql://overwatch:${DB_PASSWORD}@postgres:5432/overwatch
POSTGRES_USER=overwatch
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=overwatch

# Redis
REDIS_URL=redis://redis:6379

# Hocuspocus
HOCUSPOCUS_SECRET=${JWT_SECRET}
NODE_ENV=production

# Domain
DOMAIN_NAME=${DOMAIN_NAME}
EOF

    echo -e "${GREEN}.env created${NC}"

    # Update Caddyfile
    echo -e "${BLUE}Updating Caddyfile with your domain...${NC}"
    sed -i "s/{\$DOMAIN_NAME}/${DOMAIN_NAME}/g" Caddyfile

    # Build frontend
    echo -e "\n${BLUE}Building frontend...${NC}"
    cd client

    cat > .env.production << EOF
VITE_HOCUSPOCUS_URL=wss://${DOMAIN_NAME}/ws
VITE_API_URL=https://${DOMAIN_NAME}/api
VITE_MARTIN_URL=https://${DOMAIN_NAME}/tiles
EOF

    npm install
    npm run build

    cd ..

    # Start services
    echo -e "\n${BLUE}Starting production services...${NC}"
    docker compose -f docker-compose.aws.yml up -d

    echo -e "\n${BLUE}Waiting for services to start...${NC}"
    sleep 15

    # Show status
    docker compose -f docker-compose.aws.yml ps

    echo -e "\n${GREEN}=== Production Deployment Complete! ===${NC}"
    echo -e "\n${YELLOW}Important next steps:${NC}"
    echo "1. Configure your router to forward ports 80 and 443 to this machine"
    echo "2. Point your domain ${DOMAIN_NAME} to your public IP"
    echo "3. Wait 1-2 minutes for SSL certificate"
    echo "4. Access at: https://${DOMAIN_NAME}"
    echo ""
    echo -e "${YELLOW}Check logs:${NC}"
    echo "  docker-compose -f docker-compose.aws.yml logs -f"
    echo ""
    echo -e "${YELLOW}Your passwords (save these securely):${NC}"
    echo "  DB Password: ${DB_PASSWORD}"
    echo "  JWT Secret: ${JWT_SECRET}"

else
    echo -e "${RED}Invalid choice${NC}"
    exit 1
fi

echo -e "\n${BLUE}For more information, see:${NC} docs/LOCAL-DEPLOYMENT.md"
