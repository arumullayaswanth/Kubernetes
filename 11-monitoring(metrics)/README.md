# DevOps Demo Microservices Platform

Production-style demo platform with four services deployed on EKS with Prometheus, Grafana, and Alertmanager.

## Project Structure

```text
.
|-- microservices
|   |-- user-service      (Node.js + distroless)
|   |-- order-service     (Python FastAPI)
|   |-- payment-service   (Go + distroless)
|   `-- frontend          (React + NGINX)
|-- k8s
|   |-- base              (app manifests + kustomization.yaml)
|   `-- monitoring        (prometheus, grafana, alertmanager)
|-- scripts
|   `-- load-ramp.sh
|-- DEPLOY.md
`-- README.md
```

## Services

- `user-service`: Node.js + Express + PostgreSQL CRUD API with Prometheus metrics and JSON logs.
- `order-service`: FastAPI + PostgreSQL + Redis order API with user validation, cache-backed reads, and shared metrics conventions.
- `payment-service`: Go payment API with simulated gateway, retry logic, timeout boundaries, circuit breaker behavior, and Prometheus metrics.
- `frontend`: React + Vite UI served by NGINX, with same-origin `/api/*` routing to the backend services.

## Key DevOps Decisions

- Multi-stage Dockerfiles with distroless/minimal final images (7MB–80MB)
- Non-root containers across all services
- Shared correlation IDs use the `x-correlation-id` header and are propagated across services
- Structured JSON logs are emitted by each backend for centralized logging pipelines
- All backend services expose `/metrics` and readiness/liveness endpoints
- Config is externalized through Kubernetes `ConfigMap`s and `Secret`s
- Prometheus and Grafana use repo-managed config for repeatable bootstrap
- Alertmanager Slack config uses `--config.expand-env` for secret injection

## Deployment (EKS)

See **[DEPLOY.md](DEPLOY.md)** for full step-by-step guide.

Quick version:

```bash
# Deploy app
kubectl apply -k k8s/base/

# Deploy monitoring
kubectl apply -k k8s/monitoring/

# Get URLs
kubectl get svc -n devops-demo
```

## Access the Stack

- Frontend: `http://<frontend-EXTERNAL-IP>`
- Grafana: `http://<grafana-EXTERNAL-IP>:3000` (admin / admin123)
- Prometheus: `kubectl port-forward -n devops-demo svc/prometheus 9090:9090`
- Alertmanager: `kubectl port-forward -n devops-demo svc/alertmanager 9093:9093`

## Monitoring and Alerting

All monitoring config is embedded in `k8s/monitoring/` manifests:

- Prometheus scrape config + alert rules → `k8s/monitoring/prometheus.yaml`
- Alertmanager Slack routing → `k8s/monitoring/alertmanager.yaml`
- Grafana datasource + dashboard → `k8s/monitoring/grafana.yaml`

Included alerts:

- High error rate: `> 5%`
- High p95 latency: `> 1s`
- Restart detection using process start time changes
- High CPU usage: `> 80%` of one CPU core equivalent

## Load Test

Generate traffic from your EC2 bastion:

```bash
BASE_URL="http://<frontend-EXTERNAL-IP>" ./scripts/load-ramp.sh
```

What it does:

- Starts with 5 concurrent users, increases by 5 every 30 seconds up to 25
- Sends traffic to `/`, `/api/users`, `/api/orders`, `/api/payments`
- Prints status-code summaries after each stage

## API Summary

### User Service

- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /metrics`

### Order Service

- `GET /api/orders`
- `GET /api/orders/{id}`
- `POST /api/orders`
- `GET /metrics`

### Payment Service

- `GET /api/payments`
- `GET /api/payments/{id}`
- `POST /api/payments`
- `GET /metrics`

## Example Payloads

Create a user:

```json
{
  "name": "Ava Stone",
  "email": "ava@example.com"
}
```

Create an order:

```json
{
  "user_id": "USER_UUID",
  "item": "Laptop Stand",
  "quantity": 1,
  "amount": 59.99
}
```

Create a payment:

```json
{
  "orderId": "ORDER_UUID",
  "amount": 59.99,
  "method": "card"
}
```

## Clean Up

```bash
kubectl delete -k k8s/monitoring/
kubectl delete -k k8s/base/
```

## Notes

- The payment gateway is intentionally simulated so retry and circuit breaker behavior can be exercised safely.
- PostgreSQL tables are created automatically at service startup.
- Redis is used as the order read-through cache.
- The frontend proxies `/api/*` through NGINX, which keeps browser calls same-origin.
