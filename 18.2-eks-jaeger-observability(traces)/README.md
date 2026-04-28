# EKS Jaeger Observability Stack

This repository contains a production-style distributed tracing setup for AWS EKS using:

- Jaeger as the trace backend and UI
- OpenTelemetry Collector as the trace collector and gateway
- self-hosted Elasticsearch on EKS as Jaeger storage
- Amazon EBS for Elasticsearch persistence
- AWS ALB ingress for external access
- two Go microservices instrumented with OpenTelemetry

## Current Architecture

The active application is now split into 2 microservices:

1. `checkout-service`
   Public service behind ALB ingress.
2. `inventory-service`
   Internal service called by `checkout-service`.

Current trace flow:

1. browser -> `checkout-service`
2. `checkout-service` -> `inventory-service`
3. both services -> OpenTelemetry Collector
4. OpenTelemetry Collector -> Jaeger
5. Jaeger -> Elasticsearch -> EBS

## What This Repo Includes

- `manifests/base`
  Namespace manifest.

- `manifests/elasticsearch`
  Self-hosted Elasticsearch StatefulSet, Service, PDB, and EBS StorageClass.

- `helm/jaeger-values.yaml`
  Production-style Jaeger Helm values for `collector`, `query`, and `agent`.

- `manifests/otel-collector`
  OpenTelemetry Collector deployment, RBAC, service, HPA, and config.

- `manifests/app`
  Kubernetes manifests for both microservices.

- `manifests/ingress`
  ALB ingress that exposes Jaeger UI and `checkout-service`.

- `app`
  Two Go services plus shared observability helpers.

- `deploy.md`
  Full step-by-step deployment and testing guide.

## Current Layout

```text
eks-jaeger-observability/
|-- README.md
|-- deploy.md
|-- helm/
|   `-- jaeger-values.yaml
|-- app/
|   |-- .dockerignore
|   |-- go.mod
|   |-- README.md
|   |-- checkout-service/
|   |   |-- Dockerfile
|   |   |-- go.mod
|   |   `-- main.go
|   |-- inventory-service/
|   |   |-- Dockerfile
|   |   |-- go.mod
|   |   `-- main.go
|   `-- internal/
|       `-- observability/
|           |-- README.md
|           `-- telemetry.go
`-- manifests/
    |-- base/
    |   `-- namespace.yaml
    |-- elasticsearch/
    |   |-- headless-service.yaml
    |   |-- pdb.yaml
    |   |-- service.yaml
    |   |-- statefulset.yaml
    |   `-- storageclass.yaml
    |-- ingress/
    |   `-- ingress.yaml
    |-- jaeger/
    |   `-- grafana-datasource.yaml
    |-- otel-collector/
    |   |-- clusterrole.yaml
    |   |-- clusterrolebinding.yaml
    |   |-- configmap.yaml
    |   |-- deployment.yaml
    |   |-- hpa.yaml
    |   |-- pdb.yaml
    |   |-- service.yaml
    |   `-- serviceaccount.yaml
    `-- app/
        |-- checkout-service-configmap.yaml
        |-- checkout-service-deployment.yaml
        |-- checkout-service-hpa.yaml
        |-- checkout-service-pdb.yaml
        |-- checkout-service-service.yaml
        |-- inventory-service-configmap.yaml
        |-- inventory-service-deployment.yaml
        |-- inventory-service-hpa.yaml
        |-- inventory-service-pdb.yaml
        |-- inventory-service-service.yaml
        `-- microservices-serviceaccount.yaml
```

## Prerequisites

You need:

- one working EKS cluster
- `kubectl` connected to the cluster
- `helm`
- Docker
- AWS CLI configured
- AWS Load Balancer Controller already installed
- Amazon EBS CSI driver already installed
- one ACM certificate in `ISSUED` state
- two ECR repositories for the app images
- DNS access for your domain

## Deployment Order

Deploy in this order:

1. create namespace
2. deploy Elasticsearch
3. install Jaeger with Helm
4. deploy OpenTelemetry Collector
5. build and push both microservice images
6. update image names and ingress placeholders
7. deploy app manifests
8. deploy ingress
9. point DNS to the ALB
10. test app, logs, and traces

Use [deploy.md](c:\Users\Yaswanth Reddy\OneDrive - vitap.ac.in\Desktop\Distributed Tracing with Jaeger\eks-jaeger-observability\deploy.md) for the full detailed steps.

## Main Commands

Create the namespace:

```bash
kubectl apply -f manifests/base/namespace.yaml
```

Deploy Elasticsearch:

```bash
kubectl apply -f manifests/elasticsearch/storageclass.yaml
kubectl apply -f manifests/elasticsearch/headless-service.yaml
kubectl apply -f manifests/elasticsearch/service.yaml
kubectl apply -f manifests/elasticsearch/pdb.yaml
kubectl apply -f manifests/elasticsearch/statefulset.yaml
```

Install Jaeger:

```bash
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo update
helm upgrade --install jaeger jaegertracing/jaeger \
  --namespace observability \
  --version 3.4.1 \
  -f helm/jaeger-values.yaml
```

Deploy OpenTelemetry Collector:

```bash
kubectl apply -f manifests/otel-collector/
```

Deploy the microservices:

```bash
kubectl apply -f manifests/app/
```

Deploy ingress:

```bash
kubectl apply -f manifests/ingress/ingress.yaml
```

## Build The Two App Images

Build and push `checkout-service`:

```bash
cd app/checkout-service
docker build -t <your-checkout-ecr-image> .
docker push <your-checkout-ecr-image>
cd ../..
```

Build and push `inventory-service`:

```bash
cd app/inventory-service
docker build -t <your-inventory-ecr-image> .
docker push <your-inventory-ecr-image>
cd ../..
```

Before you deploy the app manifests, update:

- `manifests/app/checkout-service-deployment.yaml`
- `manifests/app/inventory-service-deployment.yaml`
- `manifests/ingress/ingress.yaml`

## Verification Commands

Check core workloads:

```bash
kubectl -n observability get pods
kubectl -n observability get svc
kubectl -n observability get hpa
kubectl -n observability get ingress
```

Check app rollouts:

```bash
kubectl -n observability rollout status deployment/checkout-service
kubectl -n observability rollout status deployment/inventory-service
kubectl -n observability rollout status deployment/otel-collector
```

Check app logs:

```bash
kubectl -n observability logs deployment/checkout-service
kubectl -n observability logs deployment/inventory-service
kubectl -n observability logs deployment/otel-collector
```

## Optional Files

- `manifests/jaeger/grafana-datasource.yaml`
  Use this only if your Grafana setup supports datasource sidecar loading.

## Production Notes

- all application traffic inside the cluster uses `ClusterIP` services
- ingress exposes only Jaeger UI and `checkout-service`
- Jaeger stores traces in self-hosted Elasticsearch
- Elasticsearch persists data on EBS volumes
- both microservices use structured JSON logs
- both microservices export traces to OTel Collector by OTLP HTTP

## CI/CD Hints

- run YAML linting before deployment
- validate Kubernetes manifests with `kubeconform`
- keep image tags immutable
- render the Jaeger chart in CI with `helm template`
- add a smoke test that hits `/work` and checks Jaeger for traces

## Important Notes

- this repo does not use OpenSearch now
- this repo does not require IAM role annotations for the current app flow
- the active app code is no longer a single service
- the active services are:
  - `app/checkout-service`
  - `app/inventory-service`

For the app code details, read [app/README.md](c:\Users\Yaswanth Reddy\OneDrive - vitap.ac.in\Desktop\Distributed Tracing with Jaeger\eks-jaeger-observability\app\README.md).
