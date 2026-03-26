FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDeps for vite build)
RUN npm ci

# Copy source
COPY . .

# Build frontend (Vite)
RUN npm run build

# Set production mode
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start Express server (tsx stays as dep for runtime)
CMD ["npx", "tsx", "server.ts"]
