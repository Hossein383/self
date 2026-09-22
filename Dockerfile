FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy full application code
COPY . .

# Build Vite frontend & esbuild CommonJS server
RUN npm run build

# Production runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy production dependencies and built distribution
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Environmental variables & Exposed Ports
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
