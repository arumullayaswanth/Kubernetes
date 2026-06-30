# ==============================================================================
# order-service | Python FastAPI | Multi-stage DevSecOps Build
# Final image: ~80MB (python slim — pydantic needs glibc for compiled modules)
# ==============================================================================

# --- Stage 1: Build dependencies ---
FROM python:3.12-slim AS builder

WORKDIR /build

# Install deps into a virtual env for clean copy
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt ./
RUN pip install --no-cache-dir --no-compile -r requirements.txt

# --- Stage 2: Final minimal runtime ---
FROM python:3.12-slim

# Security: remove unnecessary packages and create non-root user
RUN apt-get purge -y --auto-remove && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser

WORKDIR /app

# Copy only the virtual env (no pip, no build tools)
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY app ./app

# Security: non-root user
USER appuser

# Security: no Python bytecode, unbuffered output for logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Metadata
LABEL maintainer="yaswanth.arumulla@gmail.com"
LABEL service="order-service"
LABEL org.opencontainers.image.source="https://github.com/arumullayaswanth/Kubernetes"

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/ready')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
