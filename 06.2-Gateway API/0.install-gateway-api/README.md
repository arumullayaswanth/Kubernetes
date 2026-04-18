# Section 0 — Install Gateway API on EKS using Envoy Gateway
https://gateway.envoyproxy.io/docs/tasks/quickstart/

---

## What Is Gateway API

Gateway API is the next generation of Kubernetes traffic routing.
It replaces Ingress with a more powerful and flexible set of resources.

| Resource | Purpose |
|---|---|
| `GatewayClass` | Defines which controller handles the Gateway (Envoy, ALB, NGINX) |
| `Gateway` | Creates the actual load balancer / proxy |
| `HTTPRoute` | Defines routing rules — which path goes to which service |

---

## What Is Envoy Gateway

Envoy Gateway is an open source Gateway API controller built on Envoy Proxy.
It is the simplest way to get Gateway API working on EKS — no OIDC or IAM complexity needed.

---

## Architecture

```
Internet
    |
    ▼
AWS NLB (created automatically by Envoy Gateway)
    |
    ▼
Envoy Proxy pods (running in gateway-system namespace)
    |
    ▼
GatewayClass: gateway-api
    |
    ▼
Gateway resource (in your app namespace)
    |
    ▼
HTTPRoute (routing rules)
    |
    ▼
Your app pods
```

---

## Step 1 — Connect To Cluster

```bash
aws eks update-kubeconfig --region us-east-1 --name eksprod
kubectl get nodes
```

Expected — 3 nodes Ready.

---

## Step 2 — Install Gateway API CRDs

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/experimental-install.yaml
```

Verify:

```bash
kubectl get crd | grep gateway
```

Expected — at least these 4:

```
gatewayclasses.gateway.networking.k8s.io
gateways.gateway.networking.k8s.io
httproutes.gateway.networking.k8s.io
referencegrants.gateway.networking.k8s.io
```

---

## Step 3 — Install Envoy Gateway

- Install the Gateway API CRDs and Envoy Gateway:

```bash
helm install eg oci://docker.io/envoyproxy/gateway-helm \
  --version v1.7.2 \
  -n gateway-system \
  --create-namespace
```
- Wait for Envoy Gateway to become available:

```bash
kubectl wait --timeout=5m -n gateway-system deployment/envoy-gateway --for=condition=Available
```

Verify pod is running:

```bash
kubectl get pods -n gateway-system
```

Expected:

```
NAME                             READY   STATUS    RESTARTS
envoy-gateway-xxxx               1/1     Running   0
```

---

## Step 4 — Create GatewayClass

```bash
kubectl apply -f https://github.com/envoyproxy/gateway/releases/download/v1.7.2/quickstart.yaml -n default
```

Verify:

```bash
kubectl get gatewayclass
```

Expected:

```
NAME          CONTROLLER                                       ACCEPTED
gateway-api   gateway.envoyproxy.io/gatewayclass-controller   True
```

`ACCEPTED = True` — Envoy Gateway is ready.

---

## Step 5 — Verify Everything

```bash
kubectl get crd | grep gateway
kubectl get pods -n gateway-system
kubectl get gatewayclass
kubectl logs -n gateway-system deployment/envoy-gateway --tail=5
```

All checks passing = ready to deploy apps.

---

## Uninstall

When you are done with ALL apps and want to remove Gateway API completely from the cluster:

```bash
# Step 1 — delete all app resources first
kubectl delete gatewayclass gateway-api

# Step 2 — uninstall Envoy Gateway
helm uninstall eg -n gateway-system
kubectl delete namespace gateway-system

# Step 3 — remove Gateway API CRDs
kubectl delete -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/experimental-install.yaml
```

