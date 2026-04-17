# Section 3 — URL Rewrite: Gateway API

URL Rewrite means the URL the user types in the browser is different from the URL the pod receives.


## 2. url-rewrite URL Rewrite Routing

User types one URL, pod receives a different URL.

```
                        ┌─────────────────────────────────────────┐
                        │ INTERNET (User → https://tagent.cfd/app/home)  │
                        └──────────────────┬──────────────────────┘
                                           │
                              User types different paths
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                       │
                    ▼                      ▼                       ▼
             /app/dashboard          /paytam/home            /api/v1/users
                    │                      │                       │
                    └──────────────────────┼──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         Envoy Gateway                   │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         HTTPRoute — URL Rewrite Rules    │
                        │                                          │
                        │  /app/*       →  rewrite to  /*         │
                        │  /paytam/*    →  rewrite to  /*         │
                        │  /api/v1/*    →  rewrite to  /api/*     │
                        │  /*           →  no rewrite             │
                        └──────────────────┬──────────────────────┘
                                           │
                              Pod receives rewritten URL
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                       │
                    ▼                      ▼                       ▼
             /dashboard              /home               /api/users
                    │                      │                       │
                    └──────────────────────┼──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         paytam-svc → Pods                │
                        └─────────────────────────────────────────┘

Concept: Public URL is different from internal URL.
         Gateway rewrites the path before forwarding to the pod.
         Pod never sees /app or /paytam — it only sees /.
```

---

## What Is URL Rewrite

Without rewrite:
```
User hits  → /app/home
Pod gets   → /app/home   (same)
```

With rewrite:
```
User hits  → /app/home
Pod gets   → /home       (prefix /app is stripped)
```

This is useful when:
- Your app runs at `/` but you want to expose it at `/app`
- You are versioning your API — users hit `/api/v1` but your app only knows `/api`
- You want clean public URLs that map to different internal paths

---

## Rewrite Rules In This Setup

| User Hits | Pod Receives | Rule |
|---|---|---|
| `/app` or `/app/anything` | `/` or `/anything` | strip `/app` prefix |
| `/paytam` or `/paytam/anything` | `/` or `/anything` | strip `/paytam` prefix |
| `/api/v1/users` | `/api/users` | replace `/api/v1` with `/api` |
| `/anything` | `/anything` | no rewrite — pass through |

---

## Files In This Folder

| File | Purpose |
|---|---|
| `namespace.yaml` | Creates `url-rewrite` namespace |
| `svc_account.yaml` | ServiceAccount `paytam-sa` for the app |
| `deploy.yaml` | Deploys `yaswanth111/paytam:latest` with 2 replicas |
| `svc.yaml` | ClusterIP service `paytam-svc` on port 80 |
| `gateway.yaml` | Gateway with HTTP 80 + HTTPS 443 |
| `httproute.yaml` | URL rewrite routing rules |
| `certificate.yaml` | cert-manager Certificate for `tagent.cfd` |
| `README.md` | This guide |

---
## Pre-Requirements

- [ ] Envoy Gateway installed — `0.install-gateway-api/README.md`
- [ ] GatewayClass `gateway-api` ACCEPTED = True
- [ ] cert-manager installed — `1.cert-manager/README.md`
- [ ] ClusterIssuer `letsencrypt-prod` READY = True
- [ ] DNS pointing to Gateway ADDRESS

---

## Changes Before Deploying
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

## Deploy
```bash
# Step 1 — create namespace and app
kubectl apply -f namespace.yaml
kubectl apply -f svc_account.yaml
kubectl apply -f deploy.yaml
kubectl apply -f svc.yaml

# Step 2 — create gateway and route (HTTP only first)
kubectl apply -f gateway.yaml
kubectl apply -f httproute.yaml

# Step 3 — get ADDRESS and point DNS
kubectl get gateway -n url-rewrite

# Step 4 — apply certificate after DNS is ready
kubectl apply -f certificate.yaml

# Step 5 — wait for cert READY = True
kubectl get certificate -n url-rewrite -w

# Step 6 — reapply gateway (HTTPS now active)
kubectl apply -f gateway.yaml
```

---

## Verify

```bash
kubectl get pods -n url-rewrite
kubectl get sa -n url-rewrite
kubectl get svc -n url-rewrite
kubectl get gateway -n url-rewrite
kubectl get httproute -n url-rewrite
kubectl get certificate -n url-rewrite
kubectl get secret cert-manager-tls -n url-rewrite
```

## Test URL Rewrite


Get Gateway address:

```bash
GW=$(kubectl get gateway paytam-gateway -n url-rewrite \
  -o jsonpath='{.status.addresses[0].value}')
echo "Gateway: ${GW}"
```

Test each rewrite rule:

```bash
# Rule 1: /app → pod gets /
curl -H "Host: tagent.cfd" http://${GW}/app

# Rule 2: /paytam → pod gets /
curl -H "Host: tagent.cfd" http://${GW}/paytam

# Rule 3: /api/v1/users → pod gets /api/users
curl -H "Host: tagent.cfd" http://${GW}/api/v1/users

# Rule 4: /health → pod gets /health (no rewrite)
curl -H "Host: tagent.cfd" http://${GW}/health
```

Test with real domain (after DNS + cert):

```bash
curl https://tagent.cfd/app
curl https://tagent.cfd/paytam
curl https://tagent.cfd/api/v1/users
curl https://tagent.cfd/health
```

Verify pod receives rewritten URL — check pod logs:

```bash
kubectl logs deployment/paytam -n url-rewrite -f
```

When you hit `/app` — log shows `/` not `/app`.

---

## Clean Up

> Note: Do NOT delete `gateway_class.yaml` here — it is cluster-wide and shared by all apps.
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

---

## Troubleshooting

### Rewrite not working

```bash
kubectl describe httproute paytam-url-rewrite -n url-rewrite
```

Look for `Accepted: True` in status.

### 404 after rewrite

The rewritten path does not exist in your app.
Example: rewrote `/app` to `/` but app has no route at `/`.
Check your app routes match the rewritten paths.

### Rules not matching

Gateway API processes rules top to bottom.
More specific paths must come before less specific ones.
`/api/v1` must be before `/api` which must be before `/`.
