# Section 2: Paytam App: Basic Gateway Routing

App: `yaswanth111/paytam:latest`
Namespace: `paytam`
Domain: `tagent.cfd`
Controller: Envoy Gateway (`gateway-api`)
TLS: cert-manager + Let's Encrypt

---

## Architecture


One app, one domain, straight through routing.

```
                        ┌─────────────────────────────────────────┐
                        │ INTERNET [User → https://tagent.cfd]    │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │    Envoy Proxy pods (gateway-system namespace) │
                        │              │
                        └──────────────────┬──────────────────────┘

                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │   GatewayClass: gateway-api             │
                        │                                         │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │ Gateway: paytam-gateway (namespace: paytam)│
                        │   Port 80  → redirect to 443               │
                        │   Port 443 → cert-manager-tls secret       │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         HTTPRoute                       │
                        │   host: tagent.cfd                      │
                        │   path: /  →  paytam-svc:80             │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         ClusterIP Service               │
                        │         paytam-svc:80                   │
                        └──────────┬────────────┬─────────────────┘
                                   │            │
                                   ▼            ▼
                             ┌──────────┐ ┌──────────┐
                             │  Pod 1   │ │  Pod 2   │
                             │  paytam  │ │  paytam  │
                             └──────────┘ └──────────┘

Concept: Single app exposed via Gateway API with HTTPS.
         User hits domain → ALB → Gateway → HTTPRoute → Service → Pods.
```

---

## Files In This Folder

| File | Purpose |
|---|---|
| `namespace.yaml` | Creates `paytam` namespace |
| `svc_account.yaml` | ServiceAccount `paytam-sa` for the app |
| `deploy.yaml` | Deploys `yaswanth111/paytam:latest` with 2 replicas |
| `svc.yaml` | ClusterIP service `paytam-svc` on port 80 |
| `gateway.yaml` | Gateway with HTTP 80 + HTTPS 443 listeners |
| `httproute.yaml` | Routes `tagent.cfd /` → `paytam-svc:80` |
| `certificate.yaml` | cert-manager Certificate for `tagent.cfd` |
| `README.md` | This guide |

---
### When you create a Service Account:
1.Kubernetes creates:

- A token
- A secret

2.That token is:

- Mounted inside the Pod automatically

3.Pod uses this token to:
- Authenticate with Kubernetes API

👉 So the flow is:
```bash
Pod → uses Service Account token → talks to API Server → gets response
```
## Pre-Requirements

- [ ] EKS cluster running — `kubectl get nodes` shows Ready nodes
- [ ] Envoy Gateway installed — `0.install-gateway-api/README.md`
- [ ] GatewayClass `gateway-api` ACCEPTED = True
- [ ] cert-manager installed — `1.cert-manager/README.md`
- [ ] ClusterIssuer `letsencrypt-prod` READY = True

---

## Change Before Deploying

Open `httproute.yaml` and replace the domain placeholder:

```yaml
# BEFORE
hostnames:
  - YOUR_SUBDOMAIN.YOUR_DOMAIN.com

# AFTER
hostnames:
  - tagent.cfd
```

---

## Step 1 : Connect To Cluster

```bash
aws eks update-kubeconfig --region us-east-1 --name eksprod
kubectl get nodes
```

---

## Step 2 : Deploy App With HTTP Only

```bash
# 1. Create paytam namespace
kubectl apply -f namespace.yaml
kubectl get ns

# 2. Create ServiceAccount
kubectl apply -f svc_account.yaml
kubectl get sa -n paytam

# 3. Deploy the app
kubectl apply -f deploy.yaml
kubectl get pods -n paytam

# 4. Create the service
kubectl apply -f svc.yaml
kubectl get svc -n paytam


# 5. Create Gateway (this triggers ALB creation in AWS)
kubectl apply -f gateway.yaml
kubectl get gateway -n paytam

# 6. Create HTTPRoute (this attaches routing rules to the Gateway)
kubectl apply -f httproute.yaml
kubectl get httproute -n paytam

```
---
## Step 3 — Apply Certificate

```bash
kubectl apply -f certificate.yaml
```

Watch certificate being issued:

```bash
kubectl get certificate -n paytam -w
```

Wait for READY = True (1-5 minutes):

```
NAME               READY   SECRET             AGE
cert-manager-tls   True    cert-manager-tls   3m
```

---

## Step 4 — Apply Gateway With HTTPS

The `gateway.yaml` already has both HTTP and HTTPS listeners.
Reapply it now that the certificate secret exists:

```bash
kubectl apply -f gateway.yaml
```

---

## Step 5 — Point DNS To Gateway

Go to Route53 or your domain registrar:

```
Create record:
  Name:  tagent.cfd
  Type:  A (or CNAME)
  Value: xxx.elb.amazonaws.com
```

Verify DNS propagated:

```bash
nslookup tagent.cfd
```

---



## Step 6 — Verify Everything

```bash
kubectl get pods -n paytam
kubectl get svc -n paytam
kubectl get gatewayclass
kubectl get gateway -n paytam
kubectl get httproute -n paytam
kubectl get certificate -n paytam
kubectl get secret cert-manager-tls -n paytam
```

All should show Ready/Running/True.

---

## Step 6 — Test

Test HTTP (redirects to HTTPS):

```bash
curl -L http://tagent.cfd
```

Test HTTPS:

```bash
curl https://tagent.cfd
```

Open in browser:

```
https://tagent.cfd
```

Expected: paytam app with padlock icon.

Test from inside cluster:

```bash
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never \
  -n paytam -- curl http://paytam-svc
```

---

## Clean Up

> Note: `gateway_class.yaml` is in `0.install-gateway-api` folder — not here.
> It is cluster-wide and shared by all apps. Do NOT delete it when cleaning up individual apps.
> Only delete it from `0.install-gateway-api` when removing Gateway API from the entire cluster.

```bash
kubectl delete -f certificate.yaml
kubectl delete -f httproute.yaml
kubectl delete -f gateway.yaml
kubectl delete -f svc.yaml
kubectl delete -f deploy.yaml
kubectl delete -f svc_account.yaml
kubectl delete -f namespace.yaml
```

