# Multi-stage build for aria-agent with shared package
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# ============================================
# Build shared package first
# ============================================
COPY shared/ ./shared/
WORKDIR /app/shared
RUN npm ci
RUN npm run build

# ============================================
# Build aria-agent
# ============================================
WORKDIR /app/aria-agent

# Copy package files first (for better caching)
COPY aria-agent/package*.json ./
COPY aria-agent/tsconfig.json ./
COPY aria-agent/nest-cli.json ./

# Install ALL dependencies (including dev dependencies for building)
RUN npm ci

# Copy Prisma schema
COPY aria-agent/prisma ./prisma

# Generate Prisma Client (MUST happen before build)
RUN npx prisma generate

# Copy source code
COPY aria-agent/src ./src

# Build the NestJS application (TypeScript → JavaScript)
RUN npx nest build

# ============================================
# Production stage (smaller image)
# ============================================
FROM node:20-alpine

# Set production environment
ENV NODE_ENV=production

WORKDIR /app

# Copy shared package dist (needed at runtime)
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/

# Copy aria-agent package files
WORKDIR /app/aria-agent
COPY aria-agent/package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production

# Copy Prisma files (needed for migrations and client)
COPY aria-agent/prisma ./prisma

# Generate Prisma Client in production image
RUN npx prisma generate

# Copy the built application from builder stage
COPY --from=builder /app/aria-agent/dist ./dist

# Expose the port your app runs on
EXPOSE 9991

# Run migrations and start the app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"] 


