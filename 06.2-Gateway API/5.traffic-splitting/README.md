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
                        │            Envoy Gateway                │
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

## Deploy

```bash
# Step 1 — create namespace and both versions
kubectl apply -f namespace.yaml
kubectl apply -f deploy-v1.yaml
kubectl apply -f deploy-v2.yaml
kubectl apply -f svc-v1.yaml
kubectl apply -f svc-v2.yaml

# Step 2 — create gateway and route (HTTP only first)
kubectl apply -f gateway.yaml
kubectl apply -f httproute.yaml

# Step 3 — get ADDRESS and point DNS
kubectl get gateway -n traffic-splitting

# Step 4 — apply certificate after DNS is ready
kubectl apply -f certificate.yaml

# Step 5 — wait for cert READY = True
kubectl get certificate -n traffic-splitting -w

# Step 6 — reapply gateway (HTTPS now active)
kubectl apply -f gateway.yaml
```

---

## Verify

```bash
kubectl get pods -n traffic-splitting
kubectl get svc -n traffic-splitting
kubectl get gateway -n traffic-splitting
kubectl get httproute -n traffic-splitting
kubectl get certificate -n traffic-splitting
kubectl get secret cert-manager-tls -n traffic-splitting
```

Expected pods:

```
NAME                         READY   STATUS
paytam-v1-xxxx               1/1     Running
paytam-v1-yyyy               1/1     Running
paytam-v2-xxxx               1/1     Running
```

---

## Test Traffic Split

Get Gateway address:

```bash
GW=$(kubectl get gateway paytam-gateway -n traffic-splitting \
  -o jsonpath='{.status.addresses[0].value}')
echo "Gateway: ${GW}"
```

Send 10 requests:

```bash
for i in $(seq 1 10); do
  echo -n "Request $i: "
  curl -s -H "Host: tagent.cfd" http://${GW} | head -1
done
```

Expected — roughly 9 requests to paytam (v1), 1 to swiggy (v2).

Test with real domain:

```bash
curl https://tagent.cfd
```

Refresh multiple times — mostly paytam, occasionally swiggy.

---

## Change Traffic Split

Edit `httproute.yaml` and change weights:

**Increase canary to 30%:**

```yaml
- name: paytam-svc-v1
  weight: 70
- name: paytam-svc-v2
  weight: 30
```

**Full rollout to v2:**

```yaml
- name: paytam-svc-v1
  weight: 0
- name: paytam-svc-v2
  weight: 100
```

**Instant rollback to v1:**

```yaml
- name: paytam-svc-v1
  weight: 100
- name: paytam-svc-v2
  weight: 0
```

Apply immediately — no downtime:

```bash
kubectl apply -f httproute.yaml
```

---

## Clean Up

```bash
kubectl delete -f certificate.yaml
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

### v2 not receiving traffic

Check v2 service selector matches v2 pod labels:

```bash
kubectl get pods -n traffic-splitting --show-labels
kubectl describe svc paytam-svc-v2 -n traffic-splitting
```

The `version: v2` label must match in both pod and service selector.

### Verify which pod handled the request

```bash
kubectl logs -n traffic-splitting deployment/paytam-v1 -f &
kubectl logs -n traffic-splitting deployment/paytam-v2 -f &
curl -H "Host: tagent.cfd" http://${GW}
```

Watch which log shows the request.
