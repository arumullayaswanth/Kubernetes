# Section 7 — Deploy Private ECR Image on Kubernetes EKS

Build your app image → Push to AWS ECR → Deploy on EKS with auto-scaling.

---

## Architecture

```
EC2 (build server)
    |
    ▼
docker build → docker push
    |
    ▼
AWS ECR (private registry)
    |
    ▼
EKS pulls image (no secret needed — node IAM role handles auth)
    |
    ▼
Deployment (2-10 pods via HPA)
    |
    ▼
LoadBalancer Service → External access
```

---

## Files

| File | Purpose |
|---|---|
| `namespace.yaml` | Creates `private-app` namespace |
| `svc_account.yaml` | ServiceAccount `private-app-sa` for the app |
| `deployment.yaml` | Deploys your ECR image with 2 replicas |
| `service.yaml` | LoadBalancer service — external access |
| `hpa.yaml` | HPA — auto scales pods 2 to 10 based on CPU/memory |
| `README.md` | This guide |

---

## HPA Scaling Rules

| Metric | Threshold | Action |
|---|---|---|
| CPU > 50% | scale up | add more pods |
| Memory > 70% | scale up | add more pods |
| CPU < 50% | scale down | remove pods |
| Min pods | 2 | never go below 2 |
| Max pods | 10 | never go above 10 |

---

## Step 1 — Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name myapp \
  --region us-east-1
```

Output gives you the repository URI:

```
713939171080.dkr.ecr.us-east-1.amazonaws.com/myapp
```

---

## Step 2 — Build Docker Image on EC2

```bash
cd /path/to/your/app
docker build -t myapp:latest .
```

---

## Step 3 — Authenticate Docker to ECR

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  713939171080.dkr.ecr.us-east-1.amazonaws.com
```

Expected:

```
Login Succeeded
```

---

## Step 4 — Tag and Push Image to ECR

```bash
docker tag myapp:latest \
  713939171080.dkr.ecr.us-east-1.amazonaws.com/myapp:latest

docker push \
  713939171080.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

---

## Step 5 — Update deployment.yaml

Open `deployment.yaml` and replace the image line:

```yaml
# BEFORE
image: YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/YOUR_REPO_NAME:latest

# AFTER — paste your real ECR image URL
image: 713939171080.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

---

## Step 6 — Deploy Everything

```bash
kubectl apply -f namespace.yaml
kubectl apply -f svc_account.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f hpa.yaml
```

---

## Step 7 — Verify

Check pods:

```bash
kubectl get pods -n private-app
```

Expected:

```
NAME                         READY   STATUS    RESTARTS
private-app-xxxx             1/1     Running   0
private-app-yyyy             1/1     Running   0
```

Check ServiceAccount:

```bash
kubectl get sa -n private-app
```

Check service and get external URL:

```bash
kubectl get svc -n private-app
```

Expected — copy the EXTERNAL-IP:

```
NAME              TYPE           CLUSTER-IP     EXTERNAL-IP                PORT(S)
private-app-svc   LoadBalancer   172.20.x.x     xxx.elb.amazonaws.com      80:xxxxx/TCP
```

Check HPA:

```bash
kubectl get hpa -n private-app
```

Expected:

```
NAME              REFERENCE                TARGETS         MINPODS   MAXPODS   REPLICAS
private-app-hpa   Deployment/private-app   10%/50%         2         10        2
```

---

## Step 8 — Access Your App

Open in browser:

```
http://xxx.elb.amazonaws.com
```

---

## Why No imagePullSecret Needed

Your EKS node role already has `AmazonEC2ContainerRegistryReadOnly` policy attached via Terraform. EKS nodes pull from ECR in the same AWS account automatically — no secret needed.

---

## Clean Up

```bash
kubectl delete -f hpa.yaml
kubectl delete -f service.yaml
kubectl delete -f deployment.yaml
kubectl delete -f svc_account.yaml
kubectl delete -f namespace.yaml
```

Delete ECR image:

```bash
aws ecr batch-delete-image \
  --repository-name myapp \
  --image-ids imageTag=latest \
  --region us-east-1
```

Delete ECR repository:

```bash
aws ecr delete-repository \
  --repository-name myapp \
  --force \
  --region us-east-1
```

---

## Troubleshooting

### ImagePullBackOff

```bash
kubectl describe pod -n private-app <pod-name> | grep -A5 Events
```

Check if `AmazonEC2ContainerRegistryReadOnly` is attached to your node role:

```bash
aws iam list-attached-role-policies --role-name eks-worker-role
```

### HPA showing unknown targets

Metrics server must be running:

```bash
kubectl get deployment metrics-server -n kube-system
```

If not installed:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```
