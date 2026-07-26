# ==========================================
# STAGE 1: Build the application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including devDependencies for building)
COPY package*.json ./
RUN npm ci

# Copy source code and build the TypeScript code
COPY . .
RUN npm run build

# ==========================================
# STAGE 2: Production Image
# ==========================================
FROM node:20-alpine AS production

WORKDIR /app

# Set NODE_ENV to production for better performance and security
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies (smaller, faster, more secure)
RUN npm ci --only=production

# Copy the compiled JavaScript from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]