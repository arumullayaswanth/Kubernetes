# Section 1 — cert-manager: Automatic TLS for Envoy Gateway

cert-manager automatically issues and renews free SSL certificates from Let's Encrypt.
No manual certificate management. No expiry worries.

---

## How It Works

```
cert-manager installed on EKS (bash install-cert-manager.sh)
        |
        ▼
ClusterIssuer: letsencrypt-prod (connects to Let's Encrypt) (kubectl apply -f cluster-issuer.yaml)
ClusterIssuer is cluster-wide — one issuer works for all namespaces.
        |
        ▼
Certificate resource created in each app namespace
        |
        ▼
cert-manager calls Let's Encrypt API
        |
        ▼
Let's Encrypt sends HTTP challenge to tagent.cfd
        |
        ▼
cert-manager answers the challenge via a temporary HTTPRoute
        |
        ▼
Let's Encrypt verifies you own tagent.cfd
        |
        ▼
Issues free SSL certificate (valid 90 days) ['tls.crt' — the certificate file `tls.key` — the private key]
        |
        ▼
Stored as Kubernetes Secret "cert-manager-tls" in each namespace
        |
        ▼
Envoy Gateway uses that Secret for HTTPS on port 443 (gateway.yaml)`tls`
        |
        ▼
Auto-renews at 60 days
```

---

## Files In This Folder

| File | Purpose |
|---|---|
| `install-cert-manager.sh` | Installs cert-manager on EKS |
| `cluster-issuer.yaml` | Connects cert-manager to Let's Encrypt |
| `README.md` | This guide |

Each app folder has its own `certificate.yaml`:

| Folder | Namespace | Domain |
|---|---|---|
| `2.paytam-app/certificate.yaml` | paytam | tagent.cfd |
| `3.url-rewrite/certificate.yaml` | url-rewrite | tagent.cfd |
| `4.weighted/certificate.yaml` | weighted | tagent.cfd |
| `5.traffic-splitting/certificate.yaml` | traffic-splitting | tagent.cfd |

---


## Step 1 — Install cert-manager

```bash
bash install-cert-manager.sh
```

Verify all 3 pods are Running:

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

Do NOT continue until all 3 are Running.

---

## Step 2 — Apply ClusterIssuer

The `cluster-issuer.yaml` already has the email `yaswanth.arumulla@gmail.com`.
Update it if you want a different email:

```bash
kubectl apply -f cluster-issuer.yaml
```

Verify:

```bash
kubectl get clusterissuer letsencrypt-prod
```

Expected:

```
NAME               READY
letsencrypt-prod   True
```

---

## Step 3 — Apply All Certificates

After all app namespaces exist and DNS is pointing to Gateway ADDRESS:

```bash
kubectl apply -f ../2.paytam-app/certificate.yaml
kubectl apply -f ../3.url-rewrite/certificate.yaml
kubectl apply -f ../4.weighted/certificate.yaml
kubectl apply -f ../5.traffic-splitting/certificate.yaml
```

Watch all certificates:

```bash
kubectl get certificate -A -w
```

Expected — all READY = True:

```
NAMESPACE          NAME               READY   SECRET
paytam             cert-manager-tls   True    cert-manager-tls
url-rewrite        cert-manager-tls   True    cert-manager-tls
weighted           cert-manager-tls   True    cert-manager-tls
traffic-splitting  cert-manager-tls   True    cert-manager-tls
```

---

## Step 4 — Verify Secrets Created

```bash
kubectl get secret cert-manager-tls -n paytam
kubectl get secret cert-manager-tls -n url-rewrite
kubectl get secret cert-manager-tls -n weighted
kubectl get secret cert-manager-tls -n traffic-splitting
```

All should show `kubernetes.io/tls` type.

---

## Uninstall

```bash
kubectl delete certificate cert-manager-tls -n paytam
kubectl delete certificate cert-manager-tls -n url-rewrite
kubectl delete certificate cert-manager-tls -n weighted
kubectl delete certificate cert-manager-tls -n traffic-splitting
kubectl delete -f cluster-issuer.yaml
kubectl delete -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```

