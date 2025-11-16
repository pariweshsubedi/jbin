# Combined Dockerfile for JBin (Backend + Frontend in single image)
# This builds both backend and frontend into a single container
# The backend serves the frontend static files on the same port

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build argument for API URL (not needed for combined deployment, but kept for compatibility)
ARG VITE_API_URL=/
ENV VITE_API_URL=$VITE_API_URL

# Build frontend
RUN npm run build

# Stage 2: Build Backend + Copy Frontend
FROM node:20-alpine

WORKDIR /app

# Install dependencies needed for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/dist ./public

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Expose single port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the server
CMD ["npm", "start"]
