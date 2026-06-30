# ==============================================================================
# payment-service | Go | Multi-stage DevSecOps Build
# Final image: ~7MB (scratch — no OS, no shell, nothing extra)
# ==============================================================================

# --- Stage 1: Build the binary ---
FROM golang:1.23-alpine AS builder

WORKDIR /src

# Cache dependencies
COPY go.mod ./
RUN go mod download && go mod verify

# Copy source and build a fully static binary
COPY cmd ./cmd
COPY internal ./internal

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /bin/payment-service \
    ./cmd/server

# --- Stage 2: Scratch (empty image — smallest possible) ---
FROM scratch

# Security: copy CA certificates for HTTPS calls
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the binary
COPY --from=builder /bin/payment-service /payment-service

# Metadata
LABEL maintainer="yaswanth.arumulla@gmail.com"
LABEL service="payment-service"
LABEL org.opencontainers.image.source="https://github.com/arumullayaswanth/Kubernetes"

# Security: run as non-root (UID 65534 = nobody)
USER 65534:65534

EXPOSE 8080

ENTRYPOINT ["/payment-service"]
