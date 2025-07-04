# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/services/workflow-service/package.json ./apps/services/workflow-service/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npm run prisma:generate --prefix apps/services/workflow-service

# Build the application
RUN npm run build workflow-service

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist/apps/services/workflow-service ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma/workflow-client ./node_modules/.prisma/workflow-client
COPY --from=builder --chown=nodejs:nodejs /app/apps/services/workflow-service/prisma ./prisma

# Install production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/dist/apps/services/workflow-service/package.json ./
RUN npm ci --production && npm cache clean --force

# Copy proto files
COPY --chown=nodejs:nodejs libs/core/proto/workflow.proto ./libs/core/proto/

# Switch to non-root user
USER nodejs

# Expose gRPC port
EXPOSE 50052

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('net').createConnection({port: 50052}, () => process.exit(0)).on('error', () => process.exit(1))"

# Start the service
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "main.js"]