# Traffic Splitting — Gateway API

Namespace: `traffic-splitting`

Traffic splitting sends a percentage of requests to different versions of your app.
This is the foundation of canary deployments.

---

## 3. traffic-splitting — Canary Deployment (90% / 10%)

Gradually roll out a new version to a small percentage of users.

```
                        ┌─────────────────────────────────────────┐
                        │           INTERNET                       │
                        │         100 users visit                  │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         AWS ALB + Gateway                │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         HTTPRoute — Traffic Split        │
                        │                                          │
                        │         weight: 90    weight: 10         │
                        └──────────┬────────────────┬─────────────┘
                                   │                │
                          90 users │                │ 10 users
                                   │                │
                                   ▼                ▼
                    ┌──────────────────┐  ┌──────────────────────┐
                    │  paytam-svc-v1   │  │   paytam-svc-v2      │
                    │  (stable)        │  │   (canary)           │
                    └────────┬─────────┘  └──────────┬───────────┘
                             │                        │
                    ┌────────┴─────────┐   ┌──────────┴──────────┐
                    │                  │   │                      │
                    ▼                  ▼   ▼                      ▼
              ┌──────────┐      ┌──────────┐              ┌──────────┐
              │  Pod v1  │      │  Pod v1  │              │  Pod v2  │
              │  paytam  │      │  paytam  │              │  swiggy  │
              └──────────┘      └──────────┘              └──────────┘

Concept: New version (v2/swiggy) gets only 10% of traffic.
         If v2 has no issues → increase weight gradually.
         If v2 has issues   → set weight to 0 → instant rollback.
         No downtime. No redeployment needed to change split.
```

---

## What Is Traffic Splitting

Without traffic splitting — all users get the same version:

```
100% users → v1
```

With traffic splitting — you gradually roll out a new version:

```
90% users → v1 (stable)
10% users → v2 (canary — new version being tested)
```

If v2 has no issues, you increase its weight:

```
Week 1:  90% v1 / 10% v2
Week 2:  70% v1 / 30% v2
Week 3:  50% v1 / 50% v2
Week 4:   0% v1 / 100% v2  → full rollout complete
```

If v2 has issues, you set its weight back to 0 — instant rollback.

---

## Architecture

```
Internet
    |
    ▼
AWS ALB
    |
    ▼
Gateway → paytam-gateway
    |
    ▼
HTTPRoute → weight: 90 / weight: 10
    |              |
    ▼              ▼
paytam-svc-v1   paytam-svc-v2
    |              |
    ▼              ▼
paytam-v1 pods  paytam-v2 pods
```

---

## Files

| File | Purpose |
|---|---|
| `namespace.yaml` | Creates `traffic-splitting` namespace |
| `deploy-v1.yaml` | v1 deployment — stable version (2 replicas) |
| `deploy-v2.yaml` | v2 deployment — canary version (1 replica) |
| `svc-v1.yaml` | Service for v1 pods |
| `svc-v2.yaml` | Service for v2 pods |
| `gateway.yaml` | Creates AWS ALB |
| `httproute.yaml` | Traffic split — 90% v1, 10% v2 |
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

**In `deploy-v2.yaml` — v2 image is already set:**

```yaml
image: yaswanth111/swiggy:latest
```

---

## Deploy

```bash
# 1. Create namespace
kubectl apply -f namespace.yaml

# 2. Deploy both versions
kubectl apply -f deploy-v1.yaml
kubectl apply -f deploy-v2.yaml

# 3. Create services for both versions
kubectl apply -f svc-v1.yaml
kubectl apply -f svc-v2.yaml

# 4. Create Gateway
kubectl apply -f gateway.yaml

# 5. Create HTTPRoute with traffic split
kubectl apply -f httproute.yaml
```

---

## Verify Deployment

Check pods — both versions running:

```bash
kubectl get pods -n traffic-splitting
```

Expected:

```
NAME                         READY   STATUS    RESTARTS
paytam-v1-xxxx               1/1     Running   0
paytam-v1-yyyy               1/1     Running   0
paytam-v2-xxxx               1/1     Running   0
```

Check services:

```bash
kubectl get svc -n traffic-splitting
```

Expected:

```
NAME             TYPE        CLUSTER-IP     PORT(S)
paytam-svc-v1   ClusterIP   10.100.x.x     80/TCP
paytam-svc-v2   ClusterIP   10.100.x.x     80/TCP
```

Check Gateway — wait 2-3 minutes:

```bash
kubectl get gateway -n traffic-splitting
```

Expected:

```
NAME             CLASS   ADDRESS                                        PROGRAMMED
paytam-gateway   alb     k8s-default-paytamga-xxxx.elb.amazonaws.com   True
```

Check HTTPRoute:

```bash
kubectl get httproute -n traffic-splitting
```

---

## Test Traffic Splitting

Get ALB address:

```bash
ALB=$(kubectl get gateway paytam-gateway \
  -n traffic-splitting \
  -o jsonpath='{.status.addresses[0].value}')

echo "ALB: ${ALB}"
```

Send 10 requests and observe which version responds:

```bash
for i in $(seq 1 10); do
  curl -s -H "Host: paytam.yourdomain.com" http://${ALB} | grep -i "version\|v1\|v2" || echo "request $i done"
done
```

Expected result — roughly 9 requests go to v1 and 1 goes to v2.

Test from browser (after Route53 DNS record):

```
https://paytam.yourdomain.com
```

Refresh multiple times — 90% of the time you get v1, 10% you get v2.

---

## How To Change Traffic Split

Edit `httproute.yaml` and change the weights:

**50/50 split:**

```yaml
backendRefs:
- name: paytam-svc-v1
  port: 80
  weight: 50
- name: paytam-svc-v2
  port: 80
  weight: 50
```

**Full rollout to v2:**

```yaml
backendRefs:
- name: paytam-svc-v1
  port: 80
  weight: 0
- name: paytam-svc-v2
  port: 80
  weight: 100
```

**Rollback — send all traffic back to v1:**

```yaml
backendRefs:
- name: paytam-svc-v1
  port: 80
  weight: 100
- name: paytam-svc-v2
  port: 80
  weight: 0
```

Apply the change:

```bash
kubectl apply -f httproute.yaml
```

Change takes effect immediately — no downtime.

---

## Gradual Rollout Plan

| Week | v1 Weight | v2 Weight | Action |
|---|---|---|---|
| Week 1 | 90 | 10 | Deploy v2 as canary |
| Week 2 | 70 | 30 | Increase if no issues |
| Week 3 | 50 | 50 | Half traffic on v2 |
| Week 4 | 0 | 100 | Full rollout to v2 |

If any issues found → set v2 weight to 0 immediately → instant rollback.

---

## Clean Up

```bash
kubectl delete -f httproute.yaml
kubectl delete -f gateway.yaml
kubectl delete -f svc-v1.yaml
kubectl delete -f svc-v2.yaml
kubectl delete -f deploy-v1.yaml
kubectl delete -f deploy-v2.yaml
kubectl delete -f namespace.yaml
```

---

## Troubleshooting

### All traffic going to one version

Weights must add up to 100. Check:

```bash
kubectl describe httproute paytam-traffic-split -n traffic-splitting
```

### v2 pods not receiving any traffic

Check v2 service selector matches v2 pod labels:

```bash
kubectl get pods -n traffic-splitting --show-labels
kubectl describe svc paytam-svc-v2 -n traffic-splitting
```

The `version: v2` label must match in both.

### Want to verify which pod handled the request

Check pod logs:

```bash
kubectl logs -n traffic-splitting deployment/paytam-v1 -f
kubectl logs -n traffic-splitting deployment/paytam-v2 -f
```

Send a request and see which pod log shows the hit.
