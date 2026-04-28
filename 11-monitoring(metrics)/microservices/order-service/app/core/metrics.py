from prometheus_client import (
    CONTENT_TYPE_LATEST,
    GCCollector,
    PlatformCollector,
    ProcessCollector,
    CollectorRegistry,
    Counter,
    Histogram,
    generate_latest,
)

from app.core.config import settings

registry = CollectorRegistry()
ProcessCollector(registry=registry)
PlatformCollector(registry=registry)
GCCollector(registry=registry)

http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["service", "method", "route", "status_code"],
    registry=registry,
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["service", "method", "route", "status_code"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2, 5),
    registry=registry,
)


def render_metrics() -> tuple[bytes, str]:
    return generate_latest(registry), CONTENT_TYPE_LATEST


def observe_request(method: str, route: str, status_code: int, duration_seconds: float) -> None:
    labels = (settings.app_name, method, route, str(status_code))
    http_requests_total.labels(*labels).inc()
    http_request_duration_seconds.labels(*labels).observe(duration_seconds)
