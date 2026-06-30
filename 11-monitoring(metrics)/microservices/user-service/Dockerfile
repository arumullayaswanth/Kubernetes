# ==============================================================================
# user-service | Node.js | Multi-stage DevSecOps Build
# Final image: ~50MB (distroless node)
# ==============================================================================

# --- Stage 1: Install production dependencies only ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts && \
    npm cache clean --force

# --- Stage 2: Final minimal runtime ---
FROM gcr.io/distroless/nodejs20-debian12:nonroot

WORKDIR /app

# Copy only production dependencies + source
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

# Security: run as non-root (distroless nonroot = UID 65532)
USER nonroot

# Metadata
LABEL maintainer="yaswanth.arumulla@gmail.com"
LABEL service="user-service"
LABEL org.opencontainers.image.source="https://github.com/arumullayaswanth/Kubernetes"

ENV NODE_ENV=production
EXPOSE 3000

# Distroless runs node directly (no shell, no npm)
CMD ["src/index.js"]
