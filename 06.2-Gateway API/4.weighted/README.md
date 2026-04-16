# Weighted Routing  No Weight Mentioned = 50/50

Namespace: `weighted`

---

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

## The Key Concept

In Gateway API HTTPRoute, if you list multiple backends and do NOT mention `weight`:

```yaml
backendRefs:
- name: paytam-svc-v1
  port: 80
- name: paytam-svc-v2
  port: 80
```

Kubernetes automatically treats them as **equal weight — 50% each**.

Compare with traffic-splitting folder where weight is explicitly set:

```yaml
backendRefs:
- name: paytam-svc-v1
  port: 80
  weight: 90      # explicit 90%
- name: paytam-svc-v2
  port: 80
  weight: 10      # explicit 10%
```

---

## Difference Between This Folder And traffic-splitting

| | traffic-splitting | weighted |
|---|---|---|
| Weight mentioned | Yes — 90/10 | No |
| Result | 90% v1, 10% v2 | 50% v1, 50% v2 |
| Use case | Canary — gradual rollout | Blue-Green — equal split |

---

## Files

| File | Purpose |
|---|---|
| `namespace.yaml` | Creates `weighted` namespace |
| `deploy-v1.yaml` | v1 deployment — 2 replicas |
| `deploy-v2.yaml` | v2 deployment — 2 replicas |
| `svc-v1.yaml` | Service for v1 |
| `svc-v2.yaml` | Service for v2 |
| `gateway.yaml` | Creates AWS ALB |
| `httproute.yaml` | No weight — automatic 50/50 split |
| `README.md` | This guide |

---

## Changes Before Deploying

**In `gateway.yaml` — replace certificate ARN:**

```yaml
alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:713939171080:certificate/abc12345-xxxx
```

**In `httproute.yaml` — replace domain:**

```yaml
- paytam.aluru.com
```

---

## Deploy

```bash
kubectl apply -f namespace.yaml
kubectl apply -f deploy-v1.yaml
kubectl apply -f deploy-v2.yaml
kubectl apply -f svc-v1.yaml
kubectl apply -f svc-v2.yaml
kubectl apply -f gateway.yaml
kubectl apply -f httproute.yaml
```

---

## Verify

```bash
# Check all pods running
kubectl get pods -n weighted

# Check services
kubectl get svc -n weighted

# Check gateway — wait 2-3 min for ALB
kubectl get gateway -n weighted

# Check httproute
kubectl get httproute -n weighted
```

---

## Test 50/50 Split

Get ALB address:

```bash
ALB=$(kubectl get gateway paytam-gateway \
  -n weighted \
  -o jsonpath='{.status.addresses[0].value}')
```

Send 10 requests:

```bash
for i in $(seq 1 10); do
  echo -n "Request $i: "
  curl -s -H "Host: paytam.yourdomain.com" http://${ALB} | head -1
done
```

Expected — roughly 5 requests go to v1 and 5 go to v2.

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
