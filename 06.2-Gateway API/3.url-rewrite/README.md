# URL Rewrite — Gateway API

URL Rewrite means the URL the user types in the browser is different from the URL the pod receives.


## 2. url-rewrite URL Rewrite Routing

User types one URL, pod receives a different URL.

```
                        ┌─────────────────────────────────────────┐
                        │           INTERNET                       │
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
                        │         AWS ALB + Gateway                │
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

## Files

| File | Purpose |
|---|---|
| `deploy.yaml` | Deploys paytam app |
| `svc.yaml` | ClusterIP service |
| `gateway.yaml` | Creates AWS ALB |
| `httproute.yaml` | URL rewrite routing rules |
| `README.md` | This guide |

---

## Changes Before Deploying

**In `gateway.yaml` — replace certificate ARN:**

```yaml
# BEFORE
alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:YOUR_ACCOUNT_ID:certificate/YOUR_CERTIFICATE_ID

# AFTER
alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:713939171080:certificate/abc12345-xxxx
```

**In `httproute.yaml` — replace domain:**

```yaml
# BEFORE
- YOUR_SUBDOMAIN.YOUR_DOMAIN.com

# AFTER
- paytam.aluru.com
```

---

## Deploy

```bash
kubectl apply -f namespace.yaml
kubectl apply -f deploy.yaml
kubectl apply -f svc.yaml
kubectl apply -f gateway.yaml
kubectl apply -f httproute.yaml
```

Wait 2-3 minutes for ALB to be created:

```bash
kubectl get gateway paytam-gateway
```

Expected:

```
NAME             CLASS   ADDRESS                                        PROGRAMMED
paytam-gateway   alb     k8s-default-paytamga-xxxx.elb.amazonaws.com   True
```

---

## Test URL Rewrite

Get your ALB address:

```bash
ALB=$(kubectl get gateway paytam-gateway \
  -o jsonpath='{.status.addresses[0].value}')
echo "ALB: ${ALB}"
```

### Test 1 — /app rewrites to /

```bash
curl -H "Host: paytam.yourdomain.com" http://${ALB}/app
```

Your pod receives `/` — the `/app` prefix is stripped.

### Test 2 — /paytam rewrites to /

```bash
curl -H "Host: paytam.yourdomain.com" http://${ALB}/paytam
```

Your pod receives `/`.

### Test 3 — /api/v1 rewrites to /api

```bash
curl -H "Host: paytam.yourdomain.com" http://${ALB}/api/v1/users
```

Your pod receives `/api/users`.

### Test 4 — default pass through

```bash
curl -H "Host: paytam.yourdomain.com" http://${ALB}/health
```

Your pod receives `/health` — no rewrite.

### Test from browser (after Route53 DNS record is created)

```
https://paytam.yourdomain.com/app      → pod gets /
https://paytam.yourdomain.com/paytam   → pod gets /
https://paytam.yourdomain.com/api/v1   → pod gets /api
https://paytam.yourdomain.com/health   → pod gets /health
```

---

## Verify Rewrite Is Working

To confirm the pod is actually receiving the rewritten URL, check pod logs:

```bash
kubectl logs deployment/paytam -f
```

When you hit `/app` — the log should show the request came in as `/` not `/app`.

---

## How URL Rewrite Works In The YAML

```yaml
filters:
- type: URLRewrite
  urlRewrite:
    path:
      type: ReplacePrefixMatch
      replacePrefixMatch: /
```

- `type: URLRewrite` — tells Gateway to rewrite the URL
- `ReplacePrefixMatch` — replaces the matched prefix with a new value
- `replacePrefixMatch: /` — replaces `/app` with `/`

So `/app/home` becomes `/home` and `/app` becomes `/`.

---

## Clean Up

```bash
kubectl delete -f httproute.yaml
kubectl delete -f gateway.yaml
kubectl delete -f svc.yaml
kubectl delete -f deploy.yaml
kubectl delete -f namespace.yaml
```

---

## Troubleshooting

### Rewrite not working — pod still receives original path

Check HTTPRoute is attached to Gateway:

```bash
kubectl describe httproute paytam-url-rewrite
```

Look for `Accepted: True` in the status.

### 404 after rewrite

The rewritten path does not exist in your app.
Example: you rewrote `/app` to `/` but your app does not have a route at `/`.
Check your app routes match the rewritten paths.

### Rules not matching in correct order

Gateway API processes rules in order from top to bottom.
More specific paths must come before less specific ones.
`/api/v1` must be before `/api` which must be before `/`.
