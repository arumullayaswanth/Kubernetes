# Deploy Monitoring App on EKS

Your EKS cluster is already created using GitHub Actions (01.EKS-terraform).

This guide deploys the monitoring app on top of it.

Follow step by step. If one step fails, stop and fix it first.

---

## What You Are Deploying

```
Your EKS Cluster (already running)
    │
    ├── user-service     (Node.js API)
    ├── order-service    (Python FastAPI)
    ├── payment-service  (Go API)
    ├── frontend         (React app) ← you open this in browser
    ├── postgres         (database)
    ├── redis            (cache)
    ├── prometheus       (collects metrics)
    ├── grafana          (shows dashboards) ← you open this in browser
    └── alertmanager     (sends alerts to Slack)
```

Everything goes into one namespace: `devops-demo`

---

## Step 1: Connect to Your Cluster

```bash
aws eks update-kubeconfig --region us-east-1 --name eksprod
```

Check it works:

```bash
kubectl get nodes
```

You should see 3 nodes with status `Ready`. If not, stop here.

---

## Step 2: Check Storage Class Exists

```bash
kubectl get storageclass
```

You should see `gp2` with `(default)` next to it.

If `gp2` exists but does NOT show `(default)`, run this:

```bash
kubectl annotate storageclass gp2 storageclass.kubernetes.io/is-default-class=true
```

Verify it's now default:

```bash
kubectl get storageclass
```

You should see:
```
NAME            PROVISIONER             AGE
gp2 (default)  kubernetes.io/aws-ebs   5m
```

---

## Step 3: Set Your Variables

```bash
export AWS_REGION="us-east-1"
export CLUSTER_NAME="eksprod"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
```

Check:

```bash
echo "Account: $AWS_ACCOUNT_ID"
echo "Registry: $ECR_REGISTRY"
```

---

## Step 4: Create ECR Repositories

```bash
aws ecr create-repository --repository-name devops-demo/user-service --region $AWS_REGION
aws ecr create-repository --repository-name devops-demo/order-service --region $AWS_REGION
aws ecr create-repository --repository-name devops-demo/payment-service --region $AWS_REGION
aws ecr create-repository --repository-name devops-demo/frontend --region $AWS_REGION
```

If it says "already exists" — that's fine, move on.

---

## Step 5: Login Docker to ECR

```bash
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
```

You should see: `Login Succeeded`

---

## Step 6: Build Docker Images

Run from inside the `11-monitoring(metrics)` folder:

```bash
docker build -t user-service:latest ./microservices/user-service
docker build -t order-service:latest ./microservices/order-service
docker build -t payment-service:latest ./microservices/payment-service
docker build -t frontend:latest ./microservices/frontend
```

Check:

```bash
docker images | grep -E "service|frontend"
```

---

## Step 7: Tag Images for ECR

```bash
docker tag user-service:latest "$ECR_REGISTRY/devops-demo/user-service:latest"
docker tag order-service:latest "$ECR_REGISTRY/devops-demo/order-service:latest"
docker tag payment-service:latest "$ECR_REGISTRY/devops-demo/payment-service:latest"
docker tag frontend:latest "$ECR_REGISTRY/devops-demo/frontend:latest"
```

---

## Step 8: Push Images to ECR

```bash
docker push "$ECR_REGISTRY/devops-demo/user-service:latest"
docker push "$ECR_REGISTRY/devops-demo/order-service:latest"
docker push "$ECR_REGISTRY/devops-demo/payment-service:latest"
docker push "$ECR_REGISTRY/devops-demo/frontend:latest"
```

Wait for all 4 to finish uploading.

---

## Step 9: Update Image Names in YAML Files

Open these 4 files and change the `image:` line:

**`k8s/base/user-service.yaml`**
```yaml
image: <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/devops-demo/user-service:latest
```

**`k8s/base/order-service.yaml`**
```yaml
image: <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/devops-demo/order-service:latest
```

**`k8s/base/payment-service.yaml`**
```yaml
image: <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/devops-demo/payment-service:latest
```

**`k8s/base/frontend.yaml`**
```yaml
image: <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/devops-demo/frontend:latest
```

Replace `<YOUR_ACCOUNT_ID>` with your actual number (like `123456789012`).

---

## Step 10: Deploy the App

One command — deploys everything:

```bash
kubectl apply -k k8s/base/
```

This applies all files in order: namespace → configmap → secrets → postgres → redis → all services.

---

## Step 11: Wait for Pods to Be Ready

```bash
kubectl get pods -n devops-demo -w
```

Wait until ALL pods show `Running` and `1/1` Ready.

Press `Ctrl+C` to stop watching.

If a pod is stuck, check why:

```bash
kubectl describe pod <pod-name> -n devops-demo
kubectl logs <pod-name> -n devops-demo
```

---

## Step 12: Deploy Monitoring (Prometheus + Grafana + Alertmanager)

```bash
kubectl apply -k k8s/monitoring/
```

Check:

```bash
kubectl get pods -n devops-demo
```

All should be `Running`.

---

## Step 12.1: Import Grafana Dashboards

After Grafana is running, open it in browser and import these dashboards:

1. Go to Grafana → **+** (left sidebar) → **Import**
2. Enter the Dashboard ID and click **Load**
3. Select **Prometheus** as the data source
4. Click **Import**

Repeat for each dashboard:

| Dashboard | ID | What it shows |
|---|---|---|
| Kubernetes Cluster Monitoring | `315` | Overall cluster health, CPU, memory |
| Kubernetes Pods/Containers | `3662` | Per-pod CPU, memory, restarts |
| Kubernetes Deployments | `1621` | Deployment replicas, rollouts |
| Kubernetes API Server | `12006` | API request latency, errors |
| Kubernetes Nodes | `6417` | Node CPU, memory, disk, network |
| Kubernetes Namespace Monitoring | `10000` | Per-namespace resource usage |
| Kubernetes Persistent Volumes | `13602` | PV/PVC capacity and usage |
| Kubernetes Networking | `15758` | Pod-to-pod traffic, DNS |
| NGINX Ingress Controller | `9614` | Request rate, errors, latency |

**Note:** Some dashboards need `kube-state-metrics` and `node-exporter` running. Install them:

```bash
# Install kube-state-metrics
kubectl apply -f https://github.com/kubernetes/kube-state-metrics/tree/main/examples/standard

# Or use Helm (easier):
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install kube-state-metrics prometheus-community/kube-state-metrics -n kube-system
helm install node-exporter prometheus-community/prometheus-node-exporter -n kube-system
```

Verify they're running:

```bash
kubectl get pods -n kube-system | grep -E "kube-state|node-exporter"
```

---

## Step 13: Get Your App URL

```bash
kubectl get svc frontend -n devops-demo
```

Look at the `EXTERNAL-IP` column. It will show something like:

```
a1b2c3d4e5f6.us-east-1.elb.amazonaws.com
```

If it says `<pending>`, wait 2-3 minutes and try again.

Open in browser:

```
http://<EXTERNAL-IP>
```

---

## Step 14: Get Grafana URL

```bash
kubectl get svc grafana -n devops-demo
```

Open in browser:

```
http://<GRAFANA-EXTERNAL-IP>:3000
```

Login:
- Username: `admin`
- Password: `admin123`

---

## Step 15: Access Prometheus (port-forward)

```bash
kubectl port-forward -n devops-demo svc/prometheus 9090:9090
```

Open: `http://localhost:9090`

---

## Step 16: Test the APIs

```
http://<FRONTEND-EXTERNAL-IP>/
http://<FRONTEND-EXTERNAL-IP>/api/users
http://<FRONTEND-EXTERNAL-IP>/api/orders
http://<FRONTEND-EXTERNAL-IP>/api/payments
```

All should return data (JSON responses).

---

## Step 17: Run Load Test (Optional)

SSH into your EC2 jump box or run from a Linux machine:

```bash
BASE_URL="http://<FRONTEND-EXTERNAL-IP>" ./scripts/load-ramp.sh
```

This sends traffic for ~2.5 minutes. Watch Grafana dashboards while it runs.

---

## Step 18: Check Everything is Working

```bash
kubectl get all -n devops-demo
kubectl get pvc -n devops-demo
kubectl get svc -n devops-demo
```

---

## Clean Up (Delete the App)

When you're done:

```bash
kubectl delete -k k8s/monitoring/
kubectl delete -k k8s/base/
```

This deletes everything (pods, services, PVCs, Load Balancers).

Wait 2 minutes for AWS to release the Load Balancers, then destroy the cluster from GitHub Actions if needed.

---

## Common Problems

| Problem | Cause | Fix |
|---|---|---|
| `ImagePullBackOff` | Wrong image URL or not pushed | Check `kubectl describe pod <name> -n devops-demo` |
| PVC stuck `Pending` | No EBS CSI driver or no default storage class | Do Step 2 again |
| Frontend EXTERNAL-IP empty | AWS still creating Load Balancer | Wait 2-3 minutes |
| Pods keep restarting | App crash | Run `kubectl logs <pod> -n devops-demo` |
| Grafana won't load | Service not ready yet | Wait for pod to be Running |

---

## Summary

```
Step 1:  Connect kubectl to EKS
Step 2:  Check storage class exists
Step 3:  Set variables (region, account ID)
Step 4:  Create ECR repos
Step 5:  Login Docker to ECR
Step 6:  Build 4 Docker images
Step 7:  Tag images for ECR
Step 8:  Push images to ECR
Step 9:  Update YAML files with ECR image URLs
Step 10: Apply base K8s manifests
Step 11: Wait for pods to be Ready
Step 12: Apply monitoring manifests
Step 13: Get frontend URL → open in browser
Step 14: Get Grafana URL → open in browser
Step 15: Port-forward Prometheus → open localhost:9090
Step 16: Test API endpoints
Step 17: Run load test (optional)
Step 18: Verify everything

Done! Your monitoring app is live.
```
