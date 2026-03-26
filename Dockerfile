FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Set production mode
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start Express server
CMD ["npx", "tsx", "server.ts"]
