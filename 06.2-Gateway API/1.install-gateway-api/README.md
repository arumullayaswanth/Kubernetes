# How To Install Gateway API on EKS using Envoy Gateway

---

## What Is Gateway API

Gateway API is the next generation of Kubernetes traffic routing.
It replaces Ingress with a more powerful and flexible set of resources.

Instead of one Ingress resource, Gateway API uses:
- `s (whichGatewayClass` — defines the type of controller (Envoy, ALB, NGINX, etc.)
- `Gateway` — creates the actual load balancer / proxy
- `HTTPRoute` — defines the routing rule path goes to which service)

---

## What Is Envoy Gateway

Envoy Gateway is an open source Gateway API controller built on top of Envoy Proxy.
It is the simplest way to get Gateway API working on EKS without OIDC or IAM complexity.

---

## Architecture

```
Internet
    |
    ▼
AWS Network Load Balancer (created automatically by Envoy Gateway)
    |
    ▼
Envoy Proxy pods (running in gateway-system namespace)
    |
    ▼
GatewayClass: eg
    |
    ▼
Gateway resource
    |
    ▼
HTTPRoute (routing rules)
    |
    ▼
Your app pods
```

---

## Step 1 — Install Gateway API CRDs

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

## Step 2 — Install Envoy Gateway

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

## Step 3 — Create GatewayClass

Envoy Gateway does not create the GatewayClass automatically.
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
gateway-api   gateway.envoyproxy.io/gatewayclass-controller    True
```

`ACCEPTED = True` means Envoy Gateway is ready to handle Gateway resources.

---

## Step 4 — Verify Everything Is Ready

```bash
# Check CRDs
kubectl get crd | grep gateway

# Check Envoy Gateway pod
kubectl get pods -n gateway-system

# Check GatewayClass
kubectl get gatewayclass

# Check logs for any errors
kubectl logs -n gateway-system deployment/envoy-gateway --tail=10
```

---

## Step 5 — Deploy Your App With Gateway API

Go to the `2.paytam-app` folder and update `gateway.yaml`:

Change `gatewayClassName` from `alb` to `gateway-api`:

```yaml
spec:
  gatewayClassName: gateway-api    # use gateway-api for Envoy Gateway
```

Then deploy:

```bash
cd ../2.paytam-app
kubectl apply -f namespace.yaml
kubectl apply -f svc_account.yaml
kubectl apply -f deploy.yaml
kubectl apply -f svc.yaml
kubectl apply -f gateway_class.yaml
kubectl apply -f gateway.yaml
kubectl apply -f httproute.yaml
```

Check Gateway status:

```bash
kubectl get gateway -n paytam
```

Expected:

```
NAME             CLASS   ADDRESS         PROGRAMMED
paytam-gateway   eg      <NLB-address>   True
```

---

## Uninstall

Remove GatewayClass:

```bash
kubectl delete gatewayclass eg
```

Uninstall Envoy Gateway:

```bash
helm uninstall eg -n gateway-system
kubectl delete namespace gateway-system
```

Remove Gateway API CRDs:

```bash
kubectl delete -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/experimental-install.yaml
```

---

## Troubleshooting

### GatewayClass ACCEPTED = False or Unknown

Check Envoy Gateway logs:

```bash
kubectl logs -n gateway-system deployment/envoy-gateway --tail=30
```

### no accepted gatewayclass in logs

You forgot to create the GatewayClass. Run Step 3 again.

### Gateway ADDRESS is empty

Check if Envoy proxy pods are created:

```bash
kubectl get pods -n paytam
```

Envoy Gateway creates proxy pods in the same namespace as the Gateway resource.

### Pod stuck in Pending after Gateway created

Check events:

```bash
kubectl get events -n paytam --sort-by='.lastTimestamp'
```
