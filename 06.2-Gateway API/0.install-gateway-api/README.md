# Section 0 — Install Gateway API on EKS using Envoy Gateway

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

```bash
helm install eg oci://docker.io/envoyproxy/gateway-helm \
  --version v1.6.1 \
  -n gateway-system \
  --create-namespace
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

Envoy Gateway does NOT create the GatewayClass automatically.
You must create it manually:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: gateway-api
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
EOF
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

```bash
kubectl delete gatewayclass gateway-api
helm uninstall eg -n gateway-system
kubectl delete namespace gateway-system
kubectl delete -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/experimental-install.yaml
```

---

## Troubleshooting

### GatewayClass ACCEPTED = False

Check Envoy Gateway logs:

```bash
kubectl logs -n gateway-system deployment/envoy-gateway --tail=30
```

### no accepted gatewayclass in logs

You forgot Step 4. Create the GatewayClass manually.

### Gateway ADDRESS is empty after deploying app

Check Envoy proxy pods in your app namespace:

```bash
kubectl get pods -n paytam
kubectl get events -n paytam --sort-by='.lastTimestamp'
```
