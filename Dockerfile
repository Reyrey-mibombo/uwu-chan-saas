FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies mostly for node-gyp if needed (bcrypt, canvas, etc.)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev) for building
RUN npm ci

# Copy source code
COPY . .

# Remove devDependencies for production image size reduction
RUN npm prune --production

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy isolated production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Expose the API port if express is used
EXPOSE 3000

# Start the bot
CMD ["npm", "start"]
