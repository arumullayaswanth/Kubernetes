# Go Sample App

## Current Two-Service Layout

The app is now split into 2 Go microservices.

Use this section for the current code.

Services:

1. `checkout-service`
   Public service. This is the service behind ingress.
2. `inventory-service`
   Internal service. `checkout-service` calls this service during `/work`.

Folder layout:

- `checkout-service/main.go`
  Main code for the public checkout microservice.

- `checkout-service/Dockerfile`
  Docker build for the checkout microservice.

- `checkout-service/go.mod`
  Go module file used when building checkout-service directly from its folder.

- `inventory-service/main.go`
  Main code for the internal inventory microservice.

- `inventory-service/Dockerfile`
  Docker build for the inventory microservice.

- `inventory-service/go.mod`
  Go module file used when building inventory-service directly from its folder.

- `internal/observability/telemetry.go`
  Shared tracing, logger, and request middleware helpers.

- `go.mod`
  Shared Go module for both services.

Current flow:

1. user calls `checkout-service`
2. `checkout-service` calls `inventory-service`
3. both services send traces to OpenTelemetry Collector
4. OpenTelemetry Collector sends traces to Jaeger
5. Jaeger stores traces in Elasticsearch

### Checkout Service Endpoints

`GET /healthz`

Returns:

```json
{
  "status": "ok"
}
```

`GET /readyz`

Returns:

```json
{
  "status": "ready"
}
```

`GET /`

Returns a small checkout-service response and trace ID.

`GET /work`

This is the main business flow.

What it does:

- starts a checkout span
- calls `inventory-service`
- receives reservation data
- returns one response that contains cross-service trace data

Example:

```json
{
  "status": "completed",
  "service": "checkout-service",
  "traceId": "example-trace-id",
  "reservation": {
    "status": "reserved",
    "service": "inventory-service",
    "itemId": "sku-demo-1001",
    "reservedQty": 2,
    "availableQty": 18,
    "warehouse": "warehouse-east-1",
    "traceId": "example-trace-id"
  }
}
```

### Inventory Service Endpoints

`GET /healthz`

Returns:

```json
{
  "status": "ok"
}
```

`GET /readyz`

Returns:

```json
{
  "status": "ready"
}
```

`GET /`

Returns a basic service response.

`GET /reserve`

Returns reservation data used by `checkout-service`.

Example:

```json
{
  "status": "reserved",
  "service": "inventory-service",
  "itemId": "sku-demo-1001",
  "reservedQty": 2,
  "availableQty": 18,
  "warehouse": "warehouse-east-1",
  "traceId": "example-trace-id"
}
```

### Build Both Services

Build checkout-service:

```bash
cd checkout-service
docker build -t <your-checkout-ecr-image> .
cd ..
```

Build inventory-service:

```bash
cd inventory-service
docker build -t <your-inventory-ecr-image> .
cd ..
```

### Test Both Services Locally

Run checkout-service:

```bash
go run ./checkout-service
```

Run inventory-service in another terminal:

```bash
PORT=8081 go run ./inventory-service
```

Then test:

```bash
curl http://localhost:8080/
curl http://localhost:8080/work
curl http://localhost:8081/
curl http://localhost:8081/reserve
```

Important:

- the older single-service explanation below is now old
- use this section for the current app structure

This folder contains the sample Go application used to demonstrate distributed tracing with OpenTelemetry and Jaeger on AWS EKS.

## Purpose

The app is a small HTTP service built with Gin. It is intentionally simple, but it includes the same runtime behavior we usually want in a production microservice demo:

- health and readiness endpoints
- structured JSON logs
- OpenTelemetry tracing
- graceful shutdown
- a small business flow with nested spans

The application sends traces to the OpenTelemetry Collector using OTLP over HTTP. The collector then forwards those traces to Jaeger.

## Main Files

- `main.go`
  The active application code. It starts the Gin server, initializes OpenTelemetry, defines the routes, creates spans, and writes log messages.

- `go.mod`
  The Go module file. It declares the framework and tracing dependencies such as Gin and OpenTelemetry.

- `Dockerfile`
  A multi-stage image build. It compiles the Go binary in a builder image and then runs it in a small distroless runtime image.

- `.dockerignore`
  Prevents unnecessary files from being copied into the image build context.

- `package.json`
  Deprecated placeholder from the earlier Node.js sample. It is not used by the current Go build.

## Endpoints

### `GET /healthz`

Basic health endpoint used by Kubernetes liveness probes.

Response:

```json
{
  "status": "ok"
}
```

### `GET /readyz`

Readiness endpoint used by Kubernetes readiness probes.

Response when ready:

```json
{
  "status": "ready"
}
```

Response during shutdown:

```json
{
  "status": "not-ready"
}
```

### `GET /`

Simple root endpoint to generate an application span and return a trace-aware response.

What it does:

- starts a span named `business.root`
- simulates small processing delay
- adds span attributes
- logs the request with the trace ID

Example response:

```json
{
  "message": "Distributed tracing is active",
  "service": "otel-sample-app",
  "traceId": "4f3c2d1a9b8e7c6d5f4a3b2c1d0e9f8a",
  "syntheticDelayMs": 143
}
```

### `GET /work`

This endpoint simulates a small business workflow.

What it does:

- starts a parent span named `simulate.checkout.flow`
- creates a child span `inventory.lookup`
- creates a child span `payment.authorization`
- writes structured logs for each step

Example response:

```json
{
  "status": "completed",
  "traceId": "4f3c2d1a9b8e7c6d5f4a3b2c1d0e9f8a"
}
```

## Tracing Flow

The app exports traces to:

`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector.observability.svc.cluster.local:4318/v1/traces`

The tracing pipeline is:

1. Go app creates spans.
2. App sends spans to OpenTelemetry Collector.
3. Collector forwards spans to Jaeger.
4. Jaeger stores them in Elasticsearch.
5. You view traces in Jaeger UI.

## Log Output

The application uses Go `slog` with JSON output.

Example log:

```json
{
  "time": "2026-04-07T11:30:00Z",
  "level": "INFO",
  "msg": "request handled",
  "service": "otel-sample-app",
  "method": "GET",
  "path": "/work",
  "status": 200,
  "latency_ms": 132,
  "client_ip": "10.0.1.15",
  "trace_id": "4f3c2d1a9b8e7c6d5f4a3b2c1d0e9f8a"
}
```

These logs make it easier to correlate logs with traces in observability tooling.

## Important Environment Variables

- `PORT`
  HTTP port for the app. Default is `8080`.

- `OTEL_SERVICE_NAME`
  Service name shown in traces. Default is `otel-sample-app`.

- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
  OTLP HTTP endpoint for the OpenTelemetry Collector.

- `OTEL_TRACES_SAMPLER_ARG`
  Trace sampling ratio. Example: `0.2`.

- `APP_ENV`
  Environment tag added to telemetry. Example: `production`.

- `GIN_MODE`
  Gin runtime mode. Usually `release`.

## Build Locally

If Go is installed:

```bash
go mod tidy
go run main.go
```

Then test:

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/
curl http://localhost:8080/work
```

## Build Container Image

```bash
docker build -t otel-sample-app:1.0.0 .
```

## Kubernetes Usage

This app is deployed by:

- `../manifests/app/`

That manifest sets:

- service account
- readiness and liveness probes
- resource requests and limits
- OTEL environment variables
- replica count and HPA support

## Summary

This sample app is a realistic tracing demo service written in Go. It shows:

- how an app creates spans
- how trace IDs flow through request handling
- how to emit structured logs
- how to expose health endpoints for Kubernetes
- how to forward telemetry into an EKS observability stack
