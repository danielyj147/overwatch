# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built files
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S hocuspocus -u 1001 -G nodejs

USER hocuspocus

# Health check - verify server is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:1234').then(() => process.exit(0)).catch(() => process.exit(1))"

EXPOSE 1234

# Note: Set NODE_ENV=production in docker-compose for production deployments
# Default to development for local testing

CMD ["node", "dist/index.js"]
