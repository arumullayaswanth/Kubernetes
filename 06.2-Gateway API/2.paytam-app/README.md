# Paytam App — Gateway API Deployment Guide

App image: `yaswanth111/paytam:latest`
Routing: AWS ALB via Kubernetes Gateway API

---

## Files In This Folder

| File | What It Does |
|---|---|
| `svc_account.yaml` | Creates a ServiceAccount for the app / A Service Account is like an ID card given to a Pod so it can talk to Kubernetes securely|
| `deploy.yaml` | Deploys paytam app with 2 pods |
| `svc.yaml` | ClusterIP service — connects Gateway to pods |
| `gateway_class.yaml` | Tells Kubernetes to use AWS ALB as the Gateway controller |
| `gateway.yaml` | Creates the actual AWS ALB with HTTPS |
| `httproute.yaml` | Defines routing rules — which domain goes to which service |
| `README.md` | This guide |

---
When you create a Service Account:

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


## Changes You Must Make Before Deploying

Open `gateway.yaml` and replace line with certificate ARN:

```yaml
# BEFORE
alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:YOUR_ACCOUNT_ID:certificate/YOUR_CERTIFICATE_ID

# AFTER — paste your real ACM certificate ARN
alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:713939171080:certificate/abc12345-xxxx-xxxx
```

Open `httproute.yaml` and replace the domain:

```yaml
# BEFORE
- YOUR_SUBDOMAIN.YOUR_DOMAIN.com

# AFTER — your real domain
- paytam.aluru.com
```

That is all. No other changes needed.

---

## Pre-Requirements

Before deploying, make sure these are done:

- [ ] EKS cluster `eksprod` is running
- [ ] Connected to cluster — `kubectl get nodes` shows Ready nodes
- [ ] Gateway API CRDs installed (see install-gateway-api folder)
- [ ] AWS Load Balancer Controller installed with `enableGatewayAPI=true`
- [ ] ACM certificate is in `Issued` state
- [ ] Domain is in Route53

---

## Step 1 — Connect To Your Cluster

```bash
aws eks update-kubeconfig --region us-east-1 --name eksprod
```

Verify nodes are ready:

```bash
kubectl get nodes
```

Expected:

```
NAME                         STATUS   ROLES    AGE
ip-10-0-3-177.ec2.internal   Ready    <none>   10m
ip-10-0-3-55.ec2.internal    Ready    <none>   10m
ip-10-0-4-233.ec2.internal   Ready    <none>   10m
```

---

## Step 2 — Verify Gateway API CRDs Are Installed

```bash
kubectl get crd | grep gateway
```

Expected — must see these 4:

```
gatewayclasses.gateway.networking.k8s.io
gateways.gateway.networking.k8s.io
httproutes.gateway.networking.k8s.io
referencegrants.gateway.networking.k8s.io
```

If missing, install them:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/standard-install.yaml
```

---

## Step 3 — Verify AWS Load Balancer Controller Is Running

```bash
kubectl get pods -n kube-system | grep aws-load-balancer-controller
```

Expected — 2 pods Running:

```
aws-load-balancer-controller-xxxx   1/1   Running   0
aws-load-balancer-controller-yyyy   1/1   Running   0
```

If not installed, go to `../install-gateway-api/README.md` and follow the steps.

---

## Step 4 — Deploy Everything

Apply in this exact order:

```bash
# 1. Create paytam namespace
kubectl apply -f namespace.yaml

# 2. Create ServiceAccount
kubectl apply -f svc_account.yaml

# 3. Deploy the app
kubectl apply -f deploy.yaml

# 4. Create the service
kubectl apply -f svc.yaml

# 5. Create GatewayClass
kubectl apply -f gateway_class.yaml

# 6. Create Gateway (this triggers ALB creation in AWS)
kubectl apply -f gateway.yaml

# 7. Create HTTPRoute (this attaches routing rules to the Gateway)
kubectl apply -f httproute.yaml
```

---

## Step 5 — Verify All Resources Are Created

Check ServiceAccount:

```bash
kubectl get serviceaccount paytam-sa
```

Check pods:

```bash
kubectl get pods
```

Expected:

```
NAME                      READY   STATUS    RESTARTS
paytam-xxxx               1/1     Running   0
paytam-yyyy               1/1     Running   0
```

Check service:

```bash
kubectl get svc paytam-svc
```

Expected:

```
NAME         TYPE        CLUSTER-IP     PORT(S)
paytam-svc   ClusterIP   10.100.x.x     80/TCP
```

Check GatewayClass:

```bash
kubectl get gatewayclass
```

Expected:

```
NAME   CONTROLLER                  ACCEPTED
alb    ingress.k8s.aws/alb         True
```

Check Gateway — wait 2-3 minutes for ALB to be created:

```bash
kubectl get gateway paytam-gateway
```

Expected:

```
NAME             CLASS   ADDRESS                                          PROGRAMMED
paytam-gateway   alb     k8s-default-paytamga-xxxx.elb.amazonaws.com     True
```

`PROGRAMMED = True` means ALB is created in AWS successfully.

Check HTTPRoute:

```bash
kubectl get httproute paytam-route
```

Expected:

```
NAME            HOSTNAMES                    AGE
paytam-route    ["paytam.aluru.com"]         2m
```

---

## Step 6 — Create Route53 DNS Record

Get your ALB address:

```bash
ALB_ADDRESS=$(kubectl get gateway paytam-gateway \
  -o jsonpath='{.status.addresses[0].value}')

echo "ALB Address: ${ALB_ADDRESS}"
```

Go to:

```
AWS Console → Route53 → Hosted Zones → your domain → Create Record
```

Fill in:

| Field | Value |
|---|---|
| Record name | `paytam` (just the subdomain part) |
| Record type | `A` |
| Alias | Toggle ON |
| Route traffic to | Alias to Application and Classic Load Balancer |
| Region | US East (N. Virginia) |
| Load balancer | select your ALB from dropdown |

Click Create records. DNS propagates in 1-5 minutes.

---

## Step 7 — Test Outside The Cluster (From Browser or Your Machine)

Open browser and go to:

```
https://paytam.yourdomain.com
```

Expected: Your paytam application loads with a padlock (HTTPS).

Test HTTP redirect — open:

```
http://paytam.yourdomain.com
```

Expected: Automatically redirects to `https://paytam.yourdomain.com`.

Test with curl from your local machine:

```bash
curl -v https://paytam.yourdomain.com
```

Expected: HTTP 200 response with your app HTML.

---

## Step 8 — Test Inside The Cluster

Run a temporary pod inside the cluster and test:

```bash
# Test via service directly (bypasses Gateway — pure internal test)
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl http://paytam-svc

# Test via ALB with Host header from inside cluster
ALB_ADDRESS=$(kubectl get gateway paytam-gateway \
  -o jsonpath='{.status.addresses[0].value}')

kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -H "Host: paytam.yourdomain.com" http://${ALB_ADDRESS}
```

Expected: Your paytam app HTML response.

Check service endpoints — confirms pods are registered:

```bash
kubectl get endpoints paytam-svc
```

Expected — shows pod IPs:

```
NAME         ENDPOINTS                     AGE
paytam-svc   10.0.3.x:80,10.0.4.x:80      5m
```

---

## Step 9 — Verify In AWS Console

Check ALB was created:

```
AWS Console → EC2 → Load Balancers
```

Find ALB named `k8s-default-paytamga-xxxx`. It should be `Active`.

Check target group health:

```
AWS Console → EC2 → Target Groups → select your TG → Targets tab
```

All targets should show `healthy`. If any show `unhealthy`, check your pods are running.

---

## Full Verification Checklist

Run all these commands and confirm each one:

```bash
# 1. Nodes ready
kubectl get nodes

# 2. Pods running
kubectl get pods

# 3. Service exists
kubectl get svc paytam-svc

# 4. Endpoints registered
kubectl get endpoints paytam-svc

# 5. GatewayClass accepted
kubectl get gatewayclass

# 6. Gateway programmed with ALB address
kubectl get gateway paytam-gateway

# 7. HTTPRoute attached
kubectl get httproute paytam-route

# 8. Controller running
kubectl get pods -n kube-system | grep aws-load-balancer-controller
```

All 8 checks passing = everything is working correctly.

---

## Useful Debug Commands

Describe Gateway — shows events and errors:

```bash
kubectl describe gateway paytam-gateway
```

Describe HTTPRoute:

```bash
kubectl describe httproute paytam-route
```

ALB controller logs — most useful for debugging:

```bash
kubectl logs -n kube-system deployment/aws-load-balancer-controller --tail=50
```

Check all events sorted by time:

```bash
kubectl get events --sort-by='.lastTimestamp'
```

Check pod logs:

```bash
kubectl logs deployment/paytam
```

---

## Clean Up

Delete in reverse order:

```bash
kubectl delete -f httproute.yaml
kubectl delete -f gateway.yaml
kubectl delete -f gateway_class.yaml
kubectl delete -f svc.yaml
kubectl delete -f deploy.yaml
kubectl delete -f svc_account.yaml
kubectl delete -f namespace.yaml
```

Verify ALB is deleted in AWS:

```
AWS Console → EC2 → Load Balancers
```

The ALB should be gone.

---

## Troubleshooting

### Gateway PROGRAMMED = False or Unknown

Check controller logs:

```bash
kubectl logs -n kube-system deployment/aws-load-balancer-controller --tail=100
```

Common causes:
- `enableGatewayAPI=true` was not set when installing the controller
- GatewayClass not created
- ACM certificate ARN is wrong or certificate is not Issued

### HTTPRoute not attaching to Gateway

Check the `parentRefs` in `httproute.yaml` matches the Gateway name exactly:

```yaml
parentRefs:
- name: paytam-gateway   # must match gateway.yaml metadata.name
  namespace: default
```

### 503 from browser

ALB is up but no healthy targets. Check:

```bash
kubectl get pods
kubectl get endpoints paytam-svc
```

If endpoints are empty — pods are not matching the service selector.

### DNS not resolving

Check Route53 record was created. Test DNS:

```bash
nslookup paytam.yourdomain.com
```

Should return the ALB IP address.

### Certificate error in browser

ACM certificate does not cover your domain. Make sure you requested a wildcard:
`*.yourdomain.com`
