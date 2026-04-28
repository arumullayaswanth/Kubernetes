# DevOps Demo Microservices Platform

Production-style demo platform with four services, containerized local development, Kubernetes manifests, Prometheus, Grafana, and Alertmanager Slack notifications.

## Project Structure

```text
.
|-- microservices
|   |-- user-service
|   |-- order-service
|   |-- payment-service
|   `-- frontend
|-- k8s
|   |-- base
|   `-- monitoring
|-- monitoring
|   |-- prometheus
|   |-- alertmanager
|   `-- grafana
|-- scripts
|   `-- load-ramp.sh
|-- docker-compose.yml
`-- README.md
```

## Services

- `user-service`: Node.js + Express + PostgreSQL CRUD API with Prometheus metrics and JSON logs.
- `order-service`: FastAPI + PostgreSQL + Redis order API with user validation, cache-backed reads, and shared metrics conventions.
- `payment-service`: Go payment API with simulated gateway, retry logic, timeout boundaries, circuit breaker behavior, and Prometheus metrics.
- `frontend`: React + Vite UI served by NGINX, with same-origin `/api/*` routing to the backend services.

## Key DevOps Decisions

- Shared correlation IDs use the `x-correlation-id` header and are propagated across services.
- Structured JSON logs are emitted by each backend for centralized logging pipelines.
- All backend services expose `/metrics` and a pair of readiness/liveness endpoints.
- Config is externalized through environment variables, Kubernetes `ConfigMap`s, and `Secret`s.
- Prometheus and Grafana use repo-managed config for repeatable bootstrap.
- Alertmanager Slack config is shipped with a webhook placeholder and environment expansion enabled.

## Local Run With Docker Compose

1. Copy `.env.example` to `.env` if you want to override defaults.
2. Start the stack:

```bash
docker compose up --build
```

3. Open the applications:

- Frontend: `http://localhost:8081`
- User API: `http://localhost:3000/api/users`
- Order API: `http://localhost:8000/api/orders`
- Payment API: `http://localhost:8080/api/payments`
- Prometheus: `http://localhost:9090`
- Alertmanager: `http://localhost:9093`
- Grafana: `http://localhost:3001`

4. Default Grafana credentials:

- Username: `admin`
- Password: `admin123`

## Kubernetes Deployment

### 1. Build Images

Build and tag the four app images so your cluster can access them:

```bash
docker build -t user-service:latest ./microservices/user-service
docker build -t order-service:latest ./microservices/order-service
docker build -t payment-service:latest ./microservices/payment-service
docker build -t frontend:latest ./microservices/frontend
```

If you use `kind`, load them with:

```bash
kind load docker-image user-service:latest order-service:latest payment-service:latest frontend:latest
```

### 2. Apply Base Workloads

```bash
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secrets.yaml
kubectl apply -f k8s/base/postgres.yaml
kubectl apply -f k8s/base/redis.yaml
kubectl apply -f k8s/base/user-service.yaml
kubectl apply -f k8s/base/order-service.yaml
kubectl apply -f k8s/base/payment-service.yaml
kubectl apply -f k8s/base/frontend.yaml
```

### 3. Apply Monitoring

```bash
kubectl apply -f k8s/monitoring/alertmanager.yaml
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl apply -f k8s/monitoring/grafana.yaml
```

### 4. Access the Stack

Then open:

- Frontend through `LoadBalancer`: `http://EXTERNAL-IP`
- Grafana through `LoadBalancer` or `kubectl port-forward -n devops-demo svc/grafana 3000:3000`
- Prometheus via `kubectl port-forward -n devops-demo svc/prometheus 9090:9090`

## Monitoring and Alerting

- Prometheus scrape config is in `monitoring/prometheus/prometheus.yml`.
- Alert rules are in `monitoring/prometheus/alerts.yml`.
- Alertmanager Slack routing is in `monitoring/alertmanager/alertmanager.yml`.
- Grafana provisioning is in `monitoring/grafana/provisioning/datasources/datasource.yml` and `monitoring/grafana/provisioning/dashboards/dashboard.yml`.
- The dashboard JSON is in `monitoring/grafana/dashboards/microservices-overview.json`.

Included alerts:

- High error rate: `> 5%`
- High p95 latency: `> 1s`
- Restart detection using process start time changes
- High CPU usage: `> 80%` of one CPU core equivalent

## Bastion Load Script

You can generate increasing traffic from your bastion server with `scripts/load-ramp.sh`.

Example:

```bash
BASE_URL="http://your-frontend-load-balancer-dns-name" ./scripts/load-ramp.sh
```

Custom example:

```bash
BASE_URL="http://your-frontend-load-balancer-dns-name" \
START_USERS=10 \
STEP_USERS=10 \
MAX_USERS=60 \
STEP_DURATION=45 \
PAUSE_BETWEEN_REQUESTS=0.15 \
./scripts/load-ramp.sh
```

What it does:

- Starts with a small number of concurrent users
- Increases load stage by stage
- Sends traffic to `/`, `/api/users`, `/api/orders`, and `/api/payments`
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

## Notes

- The payment gateway is intentionally simulated so retry and circuit breaker behavior can be exercised safely.
- PostgreSQL tables are created automatically at service startup.
- Redis is used as the order read-through cache.
- The frontend proxies `/api/*` through NGINX, which keeps browser calls same-origin in both local and Kubernetes setups.
