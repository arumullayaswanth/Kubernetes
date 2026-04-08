# EKS Jaeger Observability Stack

This repository contains a production-oriented distributed tracing setup for AWS EKS using:

- Jaeger as the trace backend and UI
- OpenTelemetry Collector as the OTLP gateway
- AWS Application Load Balancer ingress for north-south access
- A sample Go microservice instrumented with OpenTelemetry

The manifests are organized by component so each area can be applied and maintained independently:

- `ClusterIP` services only for in-cluster traffic
- ALB Ingress with HTTPS redirection and ACM TLS termination
- Replica-based workloads, health probes, HPAs, PDBs, and topology spread
- IRSA-ready service accounts
- Elasticsearch persistence backed by Amazon EBS
- Resource requests and limits on every workload

## Current Structure

- `manifests/base` contains the namespace manifest.
- `manifests/elasticsearch` contains the self-hosted Elasticsearch cluster and EBS storage class.
- `manifests/jaeger` contains the optional Grafana datasource and Jaeger-related support files.
- `manifests/otel-collector` contains the OpenTelemetry Collector resources.
- `manifests/app` contains the sample application resources.
- `manifests/ingress` contains the ALB ingress manifest.
- `manifests/kustomization.yaml` applies the full stack in one command.

## Layout

```text
eks-jaeger-observability/
├── README.md
├── values.yaml
├── helm/
│   └── jaeger-values.yaml
├── manifests/
│   ├── namespace.yaml
│   ├── elasticsearch/
│   ├── otel-collector/
│   │   ├── clusterrole.yaml
│   │   ├── clusterrolebinding.yaml
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   ├── hpa.yaml
│   │   ├── kustomization.yaml
│   │   ├── pdb.yaml
│   │   ├── service.yaml
│   │   └── serviceaccount.yaml
│   ├── app/
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   ├── hpa.yaml
│   │   ├── kustomization.yaml
│   │   ├── pdb.yaml
│   │   ├── service.yaml
│   │   └── serviceaccount.yaml
│   ├── ingress.yaml
│   ├── grafana-datasource-jaeger.yaml
│   └── iam/
│       └── sample-app-policy.json
└── app/
    ├── .dockerignore
    ├── Dockerfile
    ├── go.mod
    ├── main.go
    └── package.json      # deprecated placeholder pending deletion after file lock is released
```

## Prerequisites

- An existing production EKS cluster spanning multiple Availability Zones
- AWS Load Balancer Controller already installed in the cluster with its own IRSA role
- An ACM certificate for the public hostnames
- Amazon EBS CSI driver installed in the EKS cluster
- `kubectl`, `helm`, `docker`, and AWS CLI configured

## Deployment Order

1. Apply the namespace.
2. Deploy Elasticsearch with EBS-backed persistence.
3. Install Jaeger with the pinned Helm values.
4. Build and push the sample app image to ECR.
5. Apply the OpenTelemetry Collector, sample app, and ingress manifests.

## Helm Commands

Add the Jaeger chart repository and pin the release to the classic chart that still exposes the requested `collector`, `query`, and `agent` components:

```bash
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo update
```

Create the namespace:

```bash
kubectl apply -k manifests/base
```

Deploy the Elasticsearch storage layer first:

```bash
kubectl apply -f manifests/elasticsearch/
```

Install Jaeger:

```bash
helm upgrade --install jaeger jaegertracing/jaeger \
  --namespace observability \
  --version 3.4.1 \
  -f helm/jaeger-values.yaml
```

Why `3.4.1`:

- The current `jaegertracing/jaeger` chart line has moved toward the v2 single-binary layout.
- This stack intentionally pins chart `3.4.1` because it cleanly supports the production topology requested here: `collector`, `query`, and `agent`.

## Build And Push The Sample App

Update the image reference in `manifests/app/deployment.yaml`, then build and push:

```bash
docker build -t <aws-account-id>.dkr.ecr.<region>.amazonaws.com/otel-sample-app:1.0.0 app
docker push <aws-account-id>.dkr.ecr.<region>.amazonaws.com/otel-sample-app:1.0.0
```

## Apply The Remaining Manifests

```bash
kubectl apply -k manifests
```

Or apply by component:

```bash
kubectl apply -k manifests/otel-collector
kubectl apply -k manifests/app
kubectl apply -k manifests/ingress
```

Optional Grafana datasource manifest:

```bash
kubectl apply -f manifests/jaeger/grafana-datasource.yaml
```

## Verification Commands

Check rollout status:

```bash
kubectl -n observability rollout status deployment/otel-collector
kubectl -n observability rollout status deployment/otel-sample-app
kubectl -n observability get pods -o wide
kubectl -n observability get hpa
kubectl -n observability get ingress
```

Confirm the Jaeger collector is reachable from inside the cluster:

```bash
kubectl -n observability get svc jaeger-collector
kubectl -n observability get svc otel-collector
```

Inspect logs:

```bash
kubectl -n observability logs deployment/otel-collector
kubectl -n observability logs deployment/otel-sample-app
```

## Recommended Production Hardening

- Replace the placeholder role ARNs with real IRSA roles created for the sample app and any workload that needs AWS APIs.
- Consider dedicated hot/warm Elasticsearch node groups if your trace retention grows significantly.
- Restrict ingress CIDRs or change the ALB scheme to `internal` if the Jaeger UI is only for private operators.
- Add network policies once you know the namespace-to-namespace traffic requirements.
- Use Argo CD or Flux for GitOps and keep image tags immutable.
- Add canary or blue/green deployment controls for the sample app through Argo Rollouts or your service mesh.

## CI/CD Hints

- Lint YAML with `yamllint` and validate manifests with `kubeconform`.
- Scan images before promotion and sign them with Cosign.
- Render Helm templates in CI with `helm template` to catch schema drift.
- Gate production rollout on `kubectl diff`, synthetic trace generation, and a short smoke test against the Jaeger API/UI.

## Optional Integrations

Grafana:

- Apply `manifests/jaeger/grafana-datasource.yaml` if your Grafana deployment uses the sidecar datasource loader pattern.

Istio:

- Point Istio mesh tracing to `otel-collector.observability.svc.cluster.local:4317`.
- Keep application SDK tracing enabled only where you explicitly want business spans beyond Envoy-generated spans.

## Notes

- The sample app exports OTLP traces to the OpenTelemetry Collector over HTTP/protobuf.
- The OpenTelemetry Collector forwards traces to the Jaeger collector over OTLP gRPC.
- Jaeger stores spans in self-hosted Elasticsearch running in EKS.
- Elasticsearch persists trace data on Amazon EBS volumes through the EBS CSI driver.
- The active sample application is the Go service in `app/main.go`.
- Some old root-level YAML files remain as redirect stubs because the original files were locked by the editor or OneDrive during this refactor.
