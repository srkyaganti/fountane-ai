# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml nx.json tsconfig.base.json ./
COPY libs libs/
COPY apps/services/auth-service apps/services/auth-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd apps/services/auth-service && npx prisma generate --schema=./prisma/schema.prisma

# Build the auth service
RUN pnpm nx build auth-service

# Runtime stage
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist/apps/services/auth-service ./
COPY --from=builder --chown=nodejs:nodejs /app/libs/core/proto ./libs/core/proto
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER nodejs

# Expose gRPC port
EXPOSE 50051

# Set environment variables
ENV NODE_ENV=production
ENV PORT=50051

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('net').createConnection({port: 50051, timeout: 2000}, () => process.exit(0)).on('error', () => process.exit(1))"

# Start the service
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "main.js"]