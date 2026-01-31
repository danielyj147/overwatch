#!/bin/bash
#
# Health Check Script for Overwatch Services
# Built by Daniel Jeong
#

echo "=================================================="
echo "   Overwatch Health Check"
echo "   Built by Daniel Jeong"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_service() {
    local service=$1
    local url=$2

    echo -n "Checking $service... "

    if curl -s -f -o /dev/null "$url"; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Get instance IP
INSTANCE_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "localhost")

echo "Instance IP: $INSTANCE_IP"
echo ""

# Check Docker services
echo "Docker Services Status:"
echo "----------------------"
docker-compose -f docker-compose.prod.yml ps
echo ""

# Check individual services
echo "Service Health Checks:"
echo "---------------------"

# Check if services are accessible
FAILED=0

check_service "Nginx (Frontend)" "http://$INSTANCE_IP" || ((FAILED++))
check_service "Auth API" "http://$INSTANCE_IP:1235/api/auth/verify" || ((FAILED++))
check_service "Martin (Tiles)" "http://$INSTANCE_IP:3000/health" || ((FAILED++))

echo ""

# Check Docker stats
echo "Resource Usage:"
echo "---------------"
docker stats --no-stream

echo ""

# Check disk space
echo "Disk Space:"
echo "-----------"
df -h / | tail -n 1

echo ""

# Check memory
echo "Memory Usage:"
echo "-------------"
free -h | grep Mem

echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All services are healthy!${NC}"
    exit 0
else
    echo -e "${RED}$FAILED service(s) failed health check${NC}"
    echo ""
    echo "Check logs with:"
    echo "  docker-compose -f docker-compose.prod.yml logs -f"
    exit 1
fi
