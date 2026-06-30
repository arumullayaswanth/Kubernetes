# ==============================================================================
# frontend | React + Vite + NGINX | Multi-stage DevSecOps Build
# Final image: ~25MB (distroless nginx — no shell, no apt, no OS tools)
# ==============================================================================

# --- Stage 1: Build React app ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (separate layer for caching)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts && npm cache clean --force

# Copy source and build
COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY src ./src

RUN npm run build

# --- Stage 2: Serve with distroless NGINX ---
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Copy custom config and built files
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# Security: run as non-root (nginx-unprivileged already runs as UID 101)
USER 101

# Metadata
LABEL maintainer="yaswanth.arumulla@gmail.com"
LABEL service="frontend"
LABEL org.opencontainers.image.source="https://github.com/arumullayaswanth/Kubernetes"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/health/ready || exit 1

CMD ["nginx", "-g", "daemon off;"]
