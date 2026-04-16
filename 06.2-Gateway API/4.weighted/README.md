# Section 4 :  Weighted Routing: No Weight = 50/50

Apps: `yaswanth111/paytam:latest` (v1) + `yaswanth111/swiggy:latest` (v2)
Namespace: `weighted`
Domain: `tagent.cfd`
Controller: Envoy Gateway (`gateway-api`)
TLS: cert-manager + Let's Encrypt

---

## Concept

When you list multiple backends and do NOT mention `weight` — Kubernetes splits equally:

```yaml
backendRefs:
- name: paytam-svc-v1   # no weight → 50%
  port: 80
- name: paytam-svc-v2   # no weight → 50%
  port: 80
```

- 2 backends = 50/50
- 3 backends = 33/33/33
- This is Kubernetes default behavior

---

## Difference From traffic-splitting

| | `4.weighted` | `5.traffic-splitting` |
|---|---|---|
| Weight mentioned | No | Yes (90/10) |
| Result | 50% v1, 50% v2 | 90% v1, 10% v2 |
| Use case | Blue-Green equal split | Canary gradual rollout |

---


## 4. weighted — Equal Split (50% / 50%, No Weight Mentioned)

Two backends, no weight specified — Kubernetes splits equally.

```
                        ┌─────────────────────────────────────────┐
                        │           INTERNET                       │
                        │         100 users visit                  │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │        Envoy Gateway                    │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         HTTPRoute                        │
                        │                                          │
                        │   backendRefs:                           │
                        │   - name: paytam-svc-v1  ← no weight    │
                        │   - name: paytam-svc-v2  ← no weight    │
                        │                                          │
                        │   Result: Kubernetes defaults to 50/50   │
                        └──────────┬────────────────┬─────────────┘
                                   │                │
                          50 users │                │ 50 users
                                   │                │
                                   ▼                ▼
                    ┌──────────────────┐  ┌──────────────────────┐
                    │  paytam-svc-v1   │  │   paytam-svc-v2      │
                    └────────┬─────────┘  └──────────┬───────────┘
                             │                        │
                    ┌────────┴─────────┐   ┌──────────┴──────────┐
                    │                  │   │                      │
                    ▼                  ▼   ▼                      ▼
              ┌──────────┐      ┌──────────┐              ┌──────────┐
              │  Pod v1  │      │  Pod v1  │              │  Pod v2  │
              │  paytam  │      │  paytam  │              │  swiggy  │
              └──────────┘      └──────────┘              └──────────┘

Concept: When weight is NOT mentioned, all backends get equal share.
         2 backends = 50/50.
         3 backends = 33/33/33.
         This is Kubernetes default behavior.
```


---

## Files In This Folder

| File | Purpose |
|---|---|
| `namespace.yaml` | Creates `weighted` namespace |
| `deploy-v1.yaml` | v1 — `yaswanth111/paytam:latest` (2 replicas) |
| `deploy-v2.yaml` | v2 — `yaswanth111/swiggy:latest` (2 replicas) |
| `svc-v1.yaml` | ClusterIP service for v1 pods |
| `svc-v2.yaml` | ClusterIP service for v2 pods |
| `gateway.yaml` | Gateway with HTTP 80 + HTTPS 443 |
| `httproute.yaml` | No weight — automatic 50/50 split |
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
# Step 1 — create namespace and both apps
kubectl apply -f namespace.yaml
kubectl apply -f deploy-v1.yaml
kubectl apply -f deploy-v2.yaml
kubectl apply -f svc-v1.yaml
kubectl apply -f svc-v2.yaml

# Step 2 — create gateway and route (HTTP only first)
kubectl apply -f gateway.yaml
kubectl apply -f httproute.yaml

# Step 3 — get ADDRESS and point DNS
kubectl get gateway -n weighted

# Step 4 — apply certificate after DNS is ready
kubectl apply -f certificate.yaml

# Step 5 — wait for cert READY = True
kubectl get certificate -n weighted -w

# Step 6 — reapply gateway (HTTPS now active)
kubectl apply -f gateway.yaml
```

---

## Verify

```bash
kubectl get pods -n weighted
kubectl get svc -n weighted
kubectl get gateway -n weighted
kubectl get httproute -n weighted
kubectl get certificate -n weighted
kubectl get secret cert-manager-tls -n weighted
```

Expected pods:

```
NAME                         READY   STATUS
paytam-v1-xxxx               1/1     Running
paytam-v1-yyyy               1/1     Running
paytam-v2-xxxx               1/1     Running
paytam-v2-yyyy               1/1     Running
```

---

## Test 50/50 Split

Get Gateway address:

```bash
GW=$(kubectl get gateway paytam-gateway -n weighted \
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

Expected — roughly 5 requests to paytam, 5 to swiggy.

Test with real domain:

```bash
curl https://tagent.cfd
```

Refresh multiple times — alternates between paytam and swiggy.

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

Check HTTPRoute:

```bash
kubectl describe httproute paytam-weighted -n weighted
```

### Pods not receiving traffic

Check service selectors match pod labels:

```bash
kubectl get pods -n weighted --show-labels
kubectl describe svc paytam-svc-v1 -n weighted
kubectl describe svc paytam-svc-v2 -n weighted
```
