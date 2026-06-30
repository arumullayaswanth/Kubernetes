# ==============================================================================
# payment-service | Go | Multi-stage DevSecOps Build
# Final image: ~7MB (distroless static — no OS, no shell, nothing extra)
# ==============================================================================

# --- Stage 1: Build the binary ---
FROM golang:1.23-alpine AS builder

WORKDIR /src

# Copy go.mod and generate go.sum (go.sum not committed to repo)
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal

RUN go mod tidy && go mod download && go mod verify

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /bin/payment-service \
    ./cmd/server

# --- Stage 2: Distroless static (empty image + CA certs built-in) ---
FROM gcr.io/distroless/static-debian12:nonroot

# Copy the binary
COPY --from=builder /bin/payment-service /payment-service

# Metadata
LABEL maintainer="yaswanth.arumulla@gmail.com"
LABEL service="payment-service"
LABEL org.opencontainers.image.source="https://github.com/arumullayaswanth/Kubernetes"

# Security: distroless nonroot = UID 65532
USER nonroot

EXPOSE 8080

ENTRYPOINT ["/payment-service"]
