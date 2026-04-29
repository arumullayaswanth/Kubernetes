# Section 1 — cert-manager: Automatic TLS (Per-Namespace Isolation)

cert-manager automatically issues and renews free SSL certificates from Let's Encrypt.
Each namespace is fully isolated — its own Gateway, its own Certificate, its own TLS secret.

---

## Architecture

```
1 ClusterIssuer (letsencrypt-prod)
  ├── solver: paytam      → paytam-gateway      (namespace: paytam)
  ├── solver: url-rewrite → url-rewrite-gateway  (namespace: url-rewrite)
  ├── solver: weighted    → weighted-gateway     (namespace: weighted)
  └── solver: traffic     → traffic-gateway      (namespace: traffic-splitting)
         │
         ▼ (label selector on Certificate picks the right solver)
4 Certificates (one per namespace, each labeled to match its solver)
  ├── paytam-cert          labels: solver=paytam      → paytam.tagent.cfd
  ├── url-rewrite-cert     labels: solver=url-rewrite → url-rewrite.tagent.cfd
  ├── weighted-cert        labels: solver=weighted    → weighted.tagent.cfd
  └── traffic-splitting-cert labels: solver=traffic  → traffic-splitting.tagent.cfd
         │
         ▼
4 TLS Secrets (auto-created by cert-manager in each namespace)
  ├── paytam-tls           (namespace: paytam)
  ├── url-rewrite-tls      (namespace: url-rewrite)
  ├── weighted-tls         (namespace: weighted)
  └── traffic-splitting-tls (namespace: traffic-splitting)
         │
         ▼
4 Gateways (each terminates TLS using its own secret)
  ├── paytam-gateway       allowedRoutes: Same
  ├── url-rewrite-gateway  allowedRoutes: Same
  ├── weighted-gateway     allowedRoutes: Same
  └── traffic-gateway      allowedRoutes: Same
```

### Why selector-based solvers?

Without selectors, cert-manager picks a solver arbitrarily when multiple solvers exist.
This causes the HTTP-01 challenge HTTPRoute to be created on the wrong Gateway
(different namespace), resulting in 404s from Let's Encrypt.

With `selector.matchLabels`, cert-manager deterministically picks the solver whose
label matches the Certificate's label — guaranteeing the challenge always routes
through the correct namespace's Gateway.

---

## File Map

| File | Purpose |
|---|---|
| `install-cert-manager.sh` | Installs cert-manager on EKS |
| `cluster-issuer.yaml` | ClusterIssuer with 4 selector-based solvers |
| `cleanup-and-reapply.sh` | Full cleanup + reapply script |
| `README.md` | This guide |

Per-namespace resources:

| Namespace | Gateway | Certificate | Secret | Domain |
|---|---|---|---|---|
| paytam | paytam-gateway | paytam-cert (solver=paytam) | paytam-tls | paytam.tagent.cfd |
| url-rewrite | url-rewrite-gateway | url-rewrite-cert (solver=url-rewrite) | url-rewrite-tls | url-rewrite.tagent.cfd |
| weighted | weighted-gateway | weighted-cert (solver=weighted) | weighted-tls | weighted.tagent.cfd |
| traffic-splitting | traffic-gateway | traffic-splitting-cert (solver=traffic) | traffic-splitting-tls | traffic-splitting.tagent.cfd |

---

## Step 1 — Install cert-manager

```bash
bash install-cert-manager.sh
```

Verify all 3 pods are Running before continuing:

```bash
kubectl get pods -n cert-manager
```

Expected:
```
NAME                                      READY   STATUS
cert-manager-xxxx                         1/1     Running
cert-manager-webhook-xxxx                 1/1     Running
cert-manager-cainjector-xxxx              1/1     Running
```

---

## Step 2 — Apply ClusterIssuer

```bash
kubectl apply -f cluster-issuer.yaml
kubectl get clusterissuer letsencrypt-prod
```

Expected: `READY = True`

---

## Step 3 — Apply Gateways

```bash
kubectl apply -f ../2.paytam-app/gateway.yaml
kubectl apply -f ../3.url-rewrite/gateway.yaml
kubectl apply -f ../4.weighted/gateway.yaml
kubectl apply -f ../5.traffic-splitting/gateway.yaml
```

Verify each Gateway gets an external ADDRESS (this is the IP you point DNS to):

```bash
kubectl get gateway -A
```

---

## Step 4 — Point DNS

Before applying Certificates, create DNS A records for all 4 subdomains pointing
to the Gateway's external load balancer IP/hostname:

| Record | Target |
|---|---|
| paytam.tagent.cfd | Gateway ADDRESS |
| url-rewrite.tagent.cfd | Gateway ADDRESS |
| weighted.tagent.cfd | Gateway ADDRESS |
| traffic-splitting.tagent.cfd | Gateway ADDRESS |

---

## Step 5 — Apply Certificates

```bash
kubectl apply -f ../2.paytam-app/certificate.yaml
kubectl apply -f ../3.url-rewrite/certificate.yaml
kubectl apply -f ../4.weighted/certificate.yaml
kubectl apply -f ../5.traffic-splitting/certificate.yaml
```

Watch status:

```bash
kubectl get certificate -A -w
```

Expected — all READY = True:
```
NAMESPACE          NAME                    READY   SECRET
paytam             paytam-cert             True    paytam-tls
url-rewrite        url-rewrite-cert        True    url-rewrite-tls
weighted           weighted-cert           True    weighted-tls
traffic-splitting  traffic-splitting-cert  True    traffic-splitting-tls
```

---

## Troubleshooting

**Certificates stuck / challenge failing:**

```bash
# See which solver was selected and why it failed
kubectl describe challenge -A

# Check certificate events
kubectl describe certificate -A

# Full cleanup and reapply
bash cleanup-and-reapply.sh
```

**Common causes:**
- DNS not propagated yet → wait and retry
- Label on Certificate doesn't match solver selector → check `labels.solver` value
- Gateway name/namespace in solver doesn't match actual Gateway → check cluster-issuer.yaml

**Verify solver selection is correct:**
```bash
# The challenge should show the correct Gateway namespace
kubectl describe challenge -A | grep -A5 "Solver"
```

---

## Uninstall

```bash
kubectl delete certificate paytam-cert -n paytam
kubectl delete certificate url-rewrite-cert -n url-rewrite
kubectl delete certificate weighted-cert -n weighted
kubectl delete certificate traffic-splitting-cert -n traffic-splitting
kubectl delete -f cluster-issuer.yaml
kubectl delete -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```
