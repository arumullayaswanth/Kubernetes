# Section 5 — Traffic Splitting: Canary Deployment (90% / 10%)

Apps: `yaswanth111/paytam:latest` (v1 stable) + `yaswanth111/swiggy:latest` (v2 canary)
Namespace: `traffic-splitting`
Domain: `tagent.cfd`
Controller: Envoy Gateway (`gateway-api`)
TLS: cert-manager + Let's Encrypt

---

## Concept

Send 90% of traffic to stable v1 and 10% to new canary v2.
If v2 has issues — set weight to 0 for instant rollback.

```yaml
backendRefs:
- name: paytam-svc-v1
  port: 80
  weight: 90    # 90% → stable paytam
- name: paytam-svc-v2
  port: 80
  weight: 10    # 10% → canary swiggy
```

---

## Gradual Rollout Plan

| Week | v1 (paytam) | v2 (swiggy) | Action |
|---|---|---|---|
| Week 1 | 90% | 10% | Deploy canary — test with small traffic |
| Week 2 | 70% | 30% | Increase if no issues |
| Week 3 | 50% | 50% | Half traffic on v2 |
| Week 4 | 0% | 100% | Full rollout complete |

If issues found at any week → set v2 weight to 0 → instant rollback → no downtime.

---

## Architecture

```
100 users → tagent.cfd
    |
    ▼
Envoy Gateway
    |
    ▼
HTTPRoute (weight: 90 / weight: 10)
    |                    |
  90 users             10 users
    |                    |
paytam-svc-v1       paytam-svc-v2
(stable)            (canary)
    |                    |
paytam pods         swiggy pods
```

---

## Files In This Folder

| File | Purpose |
|---|---|
| `namespace.yaml` | Creates `traffic-splitting` namespace |
| `svc_account.yaml` | ServiceAccount `paytam-sa` for the app |
| `deploy-v1.yaml` | v1 — `yaswanth111/paytam:latest` (2 replicas, stable) |
| `deploy-v2.yaml` | v2 — `yaswanth111/swiggy:latest` (1 replica, canary) |
| `svc-v1.yaml` | ClusterIP service for v1 pods |
| `svc-v2.yaml` | ClusterIP service for v2 pods |
| `gateway.yaml` | Gateway with HTTP 80 + HTTPS 443 |
| `httproute.yaml` | 90% v1 / 10% v2 traffic split |
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

## Deploy

```bash
# Step 1 — create namespace and both versions
kubectl apply -f namespace.yaml
kubectl apply -f svc_account.yaml
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
kubectl get sa -n traffic-splitting
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

---

## Change Traffic Split

Edit `httproute.yaml` and change weights, then apply:

```bash
kubectl apply -f httproute.yaml
```

Takes effect immediately — no downtime.

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
kubectl delete -f svc_account.yaml
kubectl delete -f namespace.yaml
```

---

## Troubleshooting

### All traffic going to one version

```bash
kubectl describe httproute paytam-traffic-split -n traffic-splitting
```

### v2 not receiving traffic

```bash
kubectl get pods -n traffic-splitting --show-labels
kubectl describe svc paytam-svc-v2 -n traffic-splitting
```
