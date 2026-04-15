# Ingress on EKS — Production Setup Guide

App: `yaswanth111/paytam:latest`
Ingress type: AWS ALB (Application Load Balancer)
Access: HTTPS only with your real domain

---

## What You Will Have After This Setup

```
User types https://paytam.yourdomain.com in browser
        |
        ▼
Route53 DNS → resolves to ALB
        |
        ▼
AWS ALB → HTTPS 443 with your SSL certificate
        |        (HTTP 80 automatically redirects to HTTPS)
        ▼
Kubernetes Ingress Rule → matches host: paytam.yourdomain.com
        |
        ▼
ClusterIP Service → paytam-svc:80
        |
        ▼
Pods running yaswanth111/paytam:latest
```

---

## Files In This Folder

| File | What It Does | Do You Need To Edit It? |
|---|---|---|
| `deployment.yaml` | Runs your paytam app with 2 pods | No — ready to use |
| `service.yaml` | Internal service connecting ingress to pods | No — ready to use |
| `ingress.yaml` | Creates the ALB with HTTPS and your domain | YES — 2 values to change |
| `install-alb-controller.sh` | Installs AWS Load Balancer Controller | No — ready to use |
| `README.md` | This guide | No |

---

## Pre-Requirements Checklist

Before starting, make sure you have all of these:

- [ ] EKS cluster `eksprod` is running
- [ ] You are connected to the cluster (`kubectl get nodes` works)
- [ ] You have a registered domain (example: `aluru.com`)
- [ ] Your domain is added to Route53 as a Hosted Zone
- [ ] You have an ACM SSL certificate for your domain

If you are missing the last two, follow the sections below first.

---

## How To Add Your Domain To Route53

Skip this if your domain is already in Route53.

**Step 1 — Create a Hosted Zone**

```
AWS Console → Route53 → Hosted Zones → Create Hosted Zone
```

| Field | Value |
|---|---|
| Domain name | yourdomain.com |
| Type | Public hosted zone |

Click Create.

**Step 2 — Copy the NS records**

After creating, Route53 gives you 4 NS (nameserver) records like:

```
ns-123.awsdns-45.com
ns-456.awsdns-67.net
ns-789.awsdns-89.org
ns-012.awsdns-34.co.uk
```

**Step 3 — Update nameservers at your domain registrar**

Go to wherever you bought your domain (GoDaddy, Namecheap, etc.)
Find DNS settings → replace the nameservers with the 4 NS records from Route53.

Wait 10-30 minutes for propagation.

---

## How To Create An ACM SSL Certificate

Skip this if you already have a certificate.

**Step 1 — Request certificate**

```
AWS Console → Certificate Manager → Request Certificate → Request a public certificate
```

**Step 2 — Enter domain names**

Add both of these:

```
yourdomain.com
*.yourdomain.com
```

The `*` wildcard covers all subdomains like `paytam.yourdomain.com`, `app.yourdomain.com` etc.

**Step 3 — Choose DNS validation**

Select `DNS validation` and click Request.

**Step 4 — Validate the certificate**

Click on your certificate → click `Create records in Route53`.
AWS automatically adds the validation DNS records.

Wait 2-5 minutes. Status changes from `Pending validation` to `Issued`.

**Step 5 — Copy the certificate ARN**

```
AWS Console → Certificate Manager → your certificate → copy the ARN
```

It looks like this:

```
arn:aws:acm:us-east-1:713939171080:certificate/abc12345-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Save this — you need it in the next step.

---

## Changes You Must Make In ingress.yaml

Open `ingress.yaml`. You need to change exactly 2 lines.

**Change 1 — Certificate ARN (line 22)**

Find this line:

```yaml
alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:YOUR_ACCOUNT_ID:certificate/YOUR_CERTIFICATE_ID
```

Replace with your real ARN:

```yaml
alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:713939171080:certificate/abc12345-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Change 2 — Your domain (line 44)**

Find this line:

```yaml
- host: YOUR_SUBDOMAIN.YOUR_DOMAIN.com
```

Replace with your real subdomain:

```yaml
- host: paytam.aluru.com
```

Use whatever subdomain you want. Examples:
- `paytam.aluru.com`
- `app.aluru.com`
- `www.aluru.com`

That is all. No other changes needed.

---

## Step 1 — Connect To Your Cluster

Run this on your EC2 jump box:

```bash
aws eks update-kubeconfig --region us-east-1 --name eksprod
```

Verify:

```bash
kubectl get nodes
```

Expected — 3 nodes in Ready state:

```
NAME                         STATUS   ROLES    AGE
ip-10-0-3-177.ec2.internal   Ready    <none>   10m
ip-10-0-3-55.ec2.internal    Ready    <none>   10m
ip-10-0-4-233.ec2.internal   Ready    <none>   10m
```

---

## Step 2 — Install AWS Load Balancer Controller

This is required. Without it, no ALB will be created in AWS.

```bash
bash install-alb-controller.sh
```

Verify both pods are Running:

```bash
kubectl get pods -n kube-system | grep aws-load-balancer-controller
```

Expected:

```
aws-load-balancer-controller-xxxx   1/1   Running   0
aws-load-balancer-controller-yyyy   1/1   Running   0
```

Do NOT continue until both pods show Running.

---

## Step 3 — Deploy The Application

```bash
kubectl apply -f deployment.yaml
```

Verify:

```bash
kubectl get pods
```

Expected:

```
NAME                      READY   STATUS    RESTARTS
paytam-xxxx               1/1     Running   0
paytam-yyyy               1/1     Running   0
```

---

## Step 4 — Create The Service

```bash
kubectl apply -f service.yaml
```

Verify:

```bash
kubectl get svc paytam-svc
```

Expected:

```
NAME         TYPE        CLUSTER-IP     PORT(S)
paytam-svc   ClusterIP   10.100.x.x     80/TCP
```

---

## Step 5 — Apply The Ingress

Make sure you have already changed the 2 values in `ingress.yaml` (certificate ARN and domain).

```bash
kubectl apply -f ingress.yaml
```

Check ingress:

```bash
kubectl get ingress paytam-ingress
```

Wait 2-3 minutes. The ADDRESS column will fill in:

```
NAME             CLASS   HOSTS               ADDRESS                                          PORTS
paytam-ingress   alb     paytam.aluru.com    k8s-default-paytamin-xxxx.us-east-1.elb.amazonaws.com   80,443
```

Copy that ALB address — you need it for the next step.

---

## Step 6 — Create Route53 DNS Record

```
AWS Console → Route53 → Hosted Zones → click your domain → Create Record
```

Fill in exactly like this:

| Field | Value |
|---|---|
| Record name | `paytam` (just the subdomain part, not the full domain) |
| Record type | `A` |
| Alias | Toggle ON |
| Route traffic to | Alias to Application and Classic Load Balancer |
| Region | US East (N. Virginia) |
| Load balancer | select your ALB from the dropdown |

Click Create records.

DNS propagates in 1-5 minutes.

---

## Step 7 — Test In Browser

Open your browser and go to:

```
https://paytam.yourdomain.com
```

You should see your paytam application.

Also verify HTTPS is working — the browser should show a padlock icon.

Test HTTP redirect:

```
http://paytam.yourdomain.com
```

This should automatically redirect to `https://paytam.yourdomain.com`.

---

## Step 8 — Verify Everything

Check ingress is healthy:

```bash
kubectl describe ingress paytam-ingress
```

Check pods are running:

```bash
kubectl get pods
kubectl get svc
kubectl get ingress
```

Check ALB in AWS:

```
AWS Console → EC2 → Load Balancers → find k8s-default-paytamin-xxxx
```

Check target group health:

```
AWS Console → EC2 → Target Groups → select your TG → Targets tab
```

All targets should show `healthy`.

---

## Useful Debug Commands

ALB controller logs:

```bash
kubectl logs -n kube-system deployment/aws-load-balancer-controller --tail=50
```

Ingress events:

```bash
kubectl get events --field-selector involvedObject.name=paytam-ingress --sort-by='.lastTimestamp'
```

Check service has endpoints (pods registered):

```bash
kubectl get endpoints paytam-svc
```

---

## Clean Up

```bash
# Delete ingress first — this deletes the ALB in AWS automatically
kubectl delete -f ingress.yaml

# Wait 2 minutes for ALB to be deleted in AWS, then:
kubectl delete -f service.yaml
kubectl delete -f deployment.yaml
```

Uninstall ALB controller:

```bash
helm uninstall aws-load-balancer-controller -n kube-system
```

---

## Troubleshooting

### ADDRESS is empty after 5 minutes

Check controller logs:

```bash
kubectl logs -n kube-system deployment/aws-load-balancer-controller --tail=100
```

### Browser shows "Your connection is not private"

Certificate is not matching the domain. Make sure:
- ACM certificate covers your domain (wildcard `*.yourdomain.com` recommended)
- Certificate status is `Issued` not `Pending`
- Certificate ARN in `ingress.yaml` is correct

### 503 Service Unavailable

ALB is up but no healthy pods. Check:

```bash
kubectl get pods
kubectl get endpoints paytam-svc
```

### DNS not resolving

Check Route53 record was created correctly and NS records at your registrar match Route53.

```bash
nslookup paytam.yourdomain.com
```
