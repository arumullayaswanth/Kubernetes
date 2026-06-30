# ==============================================================================
# order-service | Python FastAPI | Multi-stage DevSecOps Build
# Final image: ~50MB (distroless python3 — no shell, no pip, no OS tools)
# ==============================================================================

# --- Stage 1: Build dependencies ---
FROM python:3.12-slim AS builder

WORKDIR /build

# Install deps into a standalone directory for clean copy
COPY requirements.txt ./
RUN pip install --no-cache-dir --no-compile --target=/deps -r requirements.txt

# --- Stage 2: Final distroless runtime ---
FROM gcr.io/distroless/python3-debian12:nonroot

WORKDIR /app

# Copy installed dependencies
COPY --from=builder /deps /app/deps

# Copy application code
COPY app ./app

# Set Python path to find dependencies
ENV PYTHONPATH=/app/deps
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Metadata
LABEL maintainer="yaswanth.arumulla@gmail.com"
LABEL service="order-service"
LABEL org.opencontainers.image.source="https://github.com/arumullayaswanth/Kubernetes"

# Security: distroless nonroot = UID 65532 (already set by :nonroot tag)
USER nonroot

EXPOSE 8000

# Distroless has no shell — run Python directly
ENTRYPOINT ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
