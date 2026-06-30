# ==============================================================================
# frontend | React + Vite + NGINX | Multi-stage DevSecOps Build
# Final image: ~25MB (nginx alpine + static files only)
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

# --- Stage 2: Serve with minimal NGINX ---
FROM nginx:1.27-alpine

# Security: remove default nginx config and server tokens
RUN rm -rf /etc/nginx/conf.d/default.conf && \
    sed -i 's/# server_tokens off;/server_tokens off;/' /etc/nginx/nginx.conf

# Copy custom config and built files
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# Security: make html directory read-only for nginx worker
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 555 /usr/share/nginx/html

# Metadata
LABEL maintainer="yaswanth.arumulla@gmail.com"
LABEL service="frontend"
LABEL org.opencontainers.image.source="https://github.com/arumullayaswanth/Kubernetes"

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/health/ready || exit 1

CMD ["nginx", "-g", "daemon off;"]
