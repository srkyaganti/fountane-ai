# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml nx.json tsconfig.base.json ./

# Copy all packages and apps
COPY apps/ ./apps/
COPY libs/ ./libs/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the realtime service
RUN pnpm nx build realtime-service

# Production stage
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist/apps/services/realtime-service ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs/core/proto ./libs/core/proto

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Switch to non-root user
USER nodejs

# Expose gRPC port
EXPOSE 50054

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "require('net').createConnection({port: 50054, timeout: 2000}, () => process.exit(0)).on('error', () => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the service
CMD ["node", "main.js"]