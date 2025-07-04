FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY nx.json ./
COPY tsconfig*.json ./

# Copy workspace files
COPY libs/ ./libs/
COPY apps/services/payment-service/ ./apps/services/payment-service/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Generate Prisma client
WORKDIR /app/apps/services/payment-service
RUN pnpm prisma:generate

# Build the application
WORKDIR /app
RUN pnpm nx build payment-service

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --prod --frozen-lockfile

# Copy built application
COPY --from=builder /app/dist/apps/services/payment-service ./dist
COPY --from=builder /app/apps/services/payment-service/prisma ./prisma
COPY --from=builder /app/libs/core/proto ./libs/core/proto

# Generate Prisma client in production
RUN pnpm dlx prisma generate --schema=./prisma/schema.prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose gRPC port
EXPOSE 50052

# Start the application
CMD ["node", "dist/main.js"]