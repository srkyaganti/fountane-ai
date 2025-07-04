# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./

# Copy workspace files
COPY apps/services/feature-service ./apps/services/feature-service
COPY libs ./libs

# Install dependencies
RUN npm ci --legacy-peer-deps

# Build the feature service
RUN npx nx build feature-service --prod

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist/apps/services/feature-service ./dist

# Copy proto files
COPY libs/core/proto ./libs/core/proto

# Expose gRPC port
EXPOSE 50053

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "const net = require('net'); const client = net.connect({port: 50053}, () => { client.end(); process.exit(0); }); client.on('error', () => { process.exit(1); });"

# Run the application
CMD ["node", "dist/main.js"]