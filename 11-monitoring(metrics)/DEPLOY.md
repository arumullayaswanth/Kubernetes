# EKS Deployment Guide

This guide is for **this project**.

You already did **Step 0**: you created the EKS cluster.

Now we will do the rest, one small step at a time.

If one step fails, **stop there and fix it first**. Do not jump to the next step.

## What This Project Deploys

This repo deploys:

1. `user-service` - Node.js API
2. `order-service` - FastAPI API
3. `payment-service` - Go API
4. `frontend` - React app served by NGINX
5. `postgres` - database
6. `redis` - cache
7. `prometheus` - metrics
8. `grafana` - dashboards
9. `alertmanager` - alerts

## Big Picture

After creating the EKS cluster, the flow is:

1. Connect `kubectl` to your cluster
2. Make sure your cluster has worker nodes
3. Make sure persistent storage works for PostgreSQL
4. Create ECR repositories
5. Build Docker images
6. Push Docker images to ECR
7. Update Kubernetes YAML files with ECR image URLs
8. Apply Kubernetes manifests
9. Check pods, services, and load balancers
10. Open the app and monitoring tools

## Before You Start

Run all commands from the project root:

```powershell
cd "C:\Users\Yaswanth Reddy\OneDrive - vitap.ac.in\Desktop\metrics"
```

You need these tools installed:

1. `aws`
2. `kubectl`
3. `docker`
4. `eksctl`

Quick check:

```powershell
aws --version
kubectl version --client
docker --version
eksctl version
```

## Step 1: Set Your Values

Replace the values below with your real cluster details.

```powershell
$AWS_REGION = "<your-aws-region>"
$CLUSTER_NAME = "<your-eks-cluster-name>"
$AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$ECR_REGISTRY = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
```

Example:

```powershell
$AWS_REGION = "ap-south-1"
$CLUSTER_NAME = "my-eks-cluster"
$AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$ECR_REGISTRY = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
```

Check that the account ID was found:

```powershell
Write-Host $AWS_ACCOUNT_ID
Write-Host $ECR_REGISTRY
```

## Step 2: Connect `kubectl` To Your EKS Cluster

```powershell
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
kubectl config current-context
kubectl get nodes
```

What you want to see:

1. Your EKS context becomes active
2. At least one node shows `Ready`

If `kubectl get nodes` shows nothing useful, do not continue yet.

## Step 3: Make Sure Your Cluster Can Run This App

This app needs:

1. **EC2 worker nodes**
2. **Persistent storage** for PostgreSQL

This guide assumes a **normal EKS cluster with EC2 worker nodes**.

If you created an **EKS Auto Mode** cluster, the storage provisioner is different and you should use the AWS Auto Mode storage docs instead of Step 3A and Step 3B below.

Check your nodes:

```powershell
kubectl get nodes -o wide
```

Check storage classes:

```powershell
kubectl get storageclass
```

If you already see a **default** storage class, you can move to Step 4.

If you **do not** see a default storage class, do this step now.

## Step 3A: Install Amazon EBS CSI Driver

This is usually needed when PostgreSQL storage is not ready.

First, connect OIDC to the cluster:

```powershell
eksctl utils associate-iam-oidc-provider --region $AWS_REGION --cluster $CLUSTER_NAME --approve
```

Create the IAM role for the EBS CSI driver:

```powershell
eksctl create iamserviceaccount `
  --name ebs-csi-controller-sa `
  --namespace kube-system `
  --cluster $CLUSTER_NAME `
  --region $AWS_REGION `
  --role-name AmazonEKS_EBS_CSI_DriverRole `
  --role-only `
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy `
  --approve
```

Get the role ARN:

```powershell
$EBS_ROLE_ARN = aws iam get-role --role-name AmazonEKS_EBS_CSI_DriverRole --query "Role.Arn" --output text
Write-Host $EBS_ROLE_ARN
```

Install the add-on:

```powershell
eksctl create addon `
  --cluster $CLUSTER_NAME `
  --region $AWS_REGION `
  --name aws-ebs-csi-driver `
  --version latest `
  --service-account-role-arn $EBS_ROLE_ARN `
  --force
```

Check it:

```powershell
kubectl get pods -n kube-system
```

Look for EBS CSI driver pods running.

## Step 3B: If You Still Have No Default Storage Class

Create a file named `storage-class.yaml` with this content:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
parameters:
  type: gp3
  encrypted: "true"
```

Apply it:

```powershell
kubectl apply -f storage-class.yaml
kubectl get storageclass
```

Now you should see a default storage class.

## Step 4: Create ECR Repositories

This project has four app images to push:

1. `devops-demo/user-service`
2. `devops-demo/order-service`
3. `devops-demo/payment-service`
4. `devops-demo/frontend`

Create them:

```powershell
aws ecr create-repository --repository-name devops-demo/user-service --region $AWS_REGION
aws ecr create-repository --repository-name devops-demo/order-service --region $AWS_REGION
aws ecr create-repository --repository-name devops-demo/payment-service --region $AWS_REGION
aws ecr create-repository --repository-name devops-demo/frontend --region $AWS_REGION
```

If a repository already exists, AWS will say so. That is okay.

## Step 5: Log Docker In To ECR

```powershell
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
```

If login works, continue.

## Step 6: Build Docker Images

Build all four application images:

```powershell
docker build -t user-service:latest .\microservices\user-service
docker build -t order-service:latest .\microservices\order-service
docker build -t payment-service:latest .\microservices\payment-service
docker build -t frontend:latest .\microservices\frontend
```

Check them:

```powershell
docker images
```

## Step 7: Tag Docker Images For ECR

```powershell
docker tag user-service:latest "$ECR_REGISTRY/devops-demo/user-service:latest"
docker tag order-service:latest "$ECR_REGISTRY/devops-demo/order-service:latest"
docker tag payment-service:latest "$ECR_REGISTRY/devops-demo/payment-service:latest"
docker tag frontend:latest "$ECR_REGISTRY/devops-demo/frontend:latest"
```

## Step 8: Push Docker Images To ECR

```powershell
docker push "$ECR_REGISTRY/devops-demo/user-service:latest"
docker push "$ECR_REGISTRY/devops-demo/order-service:latest"
docker push "$ECR_REGISTRY/devops-demo/payment-service:latest"
docker push "$ECR_REGISTRY/devops-demo/frontend:latest"
```

## Step 9: Update The Kubernetes Image Names

Open these files:

1. `k8s/base/user-service.yaml`
2. `k8s/base/order-service.yaml`
3. `k8s/base/payment-service.yaml`
4. `k8s/base/frontend.yaml`

Replace the `image:` line in each file.

Use these values:

`k8s/base/user-service.yaml`

```yaml
image: <account-id>.dkr.ecr.<region>.amazonaws.com/devops-demo/user-service:latest
```

`k8s/base/order-service.yaml`

```yaml
image: <account-id>.dkr.ecr.<region>.amazonaws.com/devops-demo/order-service:latest
```

`k8s/base/payment-service.yaml`

```yaml
image: <account-id>.dkr.ecr.<region>.amazonaws.com/devops-demo/payment-service:latest
```

`k8s/base/frontend.yaml`

```yaml
image: <account-id>.dkr.ecr.<region>.amazonaws.com/devops-demo/frontend:latest
```

Real example:

```yaml
image: 123456789012.dkr.ecr.ap-south-1.amazonaws.com/devops-demo/user-service:latest
```

## Step 10: Check Secrets Before Deploying

Open `k8s/base/secrets.yaml`.

It currently has demo values:

1. PostgreSQL username
2. PostgreSQL password
3. Grafana password
4. Slack webhook placeholder

For a demo, you can keep the database values.

But you should at least check:

1. `POSTGRES_PASSWORD`
2. `GRAFANA_ADMIN_PASSWORD`
3. `SLACK_WEBHOOK_URL`

If you do not want Slack alerts now, you can leave the placeholder value and still continue.

## Step 11: Deploy The Base Application

Apply the base manifests in this order:

```powershell
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secrets.yaml
kubectl apply -f k8s/base/postgres.yaml
kubectl apply -f k8s/base/redis.yaml
kubectl apply -f k8s/base/user-service.yaml
kubectl apply -f k8s/base/order-service.yaml
kubectl apply -f k8s/base/payment-service.yaml
kubectl apply -f k8s/base/frontend.yaml
```

Watch what gets created:

```powershell
kubectl get all -n devops-demo
kubectl get pvc -n devops-demo
```

## Step 12: Wait For Everything To Become Ready

Check pod status:

```powershell
kubectl get pods -n devops-demo -w
```

You want pods to become:

1. `Running`
2. `READY 1/1`

You can stop the watch with `Ctrl + C`.

If something is not starting, describe it:

```powershell
kubectl describe pod <pod-name> -n devops-demo
kubectl logs <pod-name> -n devops-demo
```

## Step 13: Deploy Monitoring

After the app is healthy, deploy monitoring:

```powershell
kubectl apply -f k8s/monitoring/alertmanager.yaml
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl apply -f k8s/monitoring/grafana.yaml
```

Check again:

```powershell
kubectl get pods -n devops-demo
kubectl get svc -n devops-demo
```

## Step 14: Get The Frontend URL

The frontend service is `LoadBalancer`, so AWS will create a public load balancer.

Check it:

```powershell
kubectl get svc frontend -n devops-demo
```

You can also print only the hostname:

```powershell
kubectl get svc frontend -n devops-demo -o jsonpath="{.status.loadBalancer.ingress[0].hostname}"
```

Important:

1. At first it may be empty
2. Wait 2 to 5 minutes
3. Run the command again

When the hostname appears, open:

```text
http://<frontend-load-balancer-hostname>
```

## Step 15: Access Grafana And Prometheus

Grafana is also a `LoadBalancer` service in your manifests.

Get the Grafana hostname:

```powershell
kubectl get svc grafana -n devops-demo -o jsonpath="{.status.loadBalancer.ingress[0].hostname}"
```

Open it in the browser:

```text
http://<grafana-load-balancer-hostname>:3000
```

Default Grafana login from this repo:

1. Username: `admin`
2. Password: value from `k8s/base/secrets.yaml`

Prometheus is ClusterIP only, so use port-forward:

```powershell
kubectl port-forward -n devops-demo svc/prometheus 9090:9090
```

Then open:

```text
http://localhost:9090
```

Alertmanager is also ClusterIP, so use port-forward if needed:

```powershell
kubectl port-forward -n devops-demo svc/alertmanager 9093:9093
```

Then open:

```text
http://localhost:9093
```

## Step 16: Test The APIs

Once the frontend is up, test these paths:

1. `/`
2. `/api/users`
3. `/api/orders`
4. `/api/payments`

Example:

```text
http://<frontend-load-balancer-hostname>/
http://<frontend-load-balancer-hostname>/api/users
http://<frontend-load-balancer-hostname>/api/orders
http://<frontend-load-balancer-hostname>/api/payments
```

## Step 17: Run The Load Script

This repo already has a load script at `scripts/load-ramp.sh`.

Run it from a machine that has `bash` and `curl`.

Example:

```bash
BASE_URL="http://your-frontend-load-balancer-hostname" ./scripts/load-ramp.sh
```

This sends traffic to:

1. `/`
2. `/api/users`
3. `/api/orders`
4. `/api/payments`

Then you can watch:

1. Prometheus metrics
2. Grafana dashboards
3. Alertmanager alerts

## Step 18: Useful Check Commands

These commands help a lot:

```powershell
kubectl get all -n devops-demo
kubectl get pods -n devops-demo
kubectl get svc -n devops-demo
kubectl get pvc -n devops-demo
kubectl describe pvc postgres-data -n devops-demo
kubectl logs deployment/user-service -n devops-demo
kubectl logs deployment/order-service -n devops-demo
kubectl logs deployment/payment-service -n devops-demo
kubectl logs deployment/frontend -n devops-demo
```

## Common Problems

### Problem 1: `ImagePullBackOff`

Usually means:

1. ECR image URL is wrong
2. Image was not pushed
3. Node role cannot pull from ECR

Check:

```powershell
kubectl describe pod <pod-name> -n devops-demo
```

### Problem 2: PostgreSQL Pod Stuck Because PVC Is Pending

Usually means:

1. No EBS CSI driver
2. No default storage class

Check:

```powershell
kubectl get pvc -n devops-demo
kubectl describe pvc postgres-data -n devops-demo
kubectl get storageclass
```

### Problem 3: Frontend LoadBalancer Hostname Is Empty

Usually means:

1. AWS is still creating it
2. Your subnets or cluster permissions are not ready for load balancers

Wait a few minutes first:

```powershell
kubectl get svc frontend -n devops-demo
```

### Problem 4: Pods Keep Restarting

Check logs:

```powershell
kubectl logs <pod-name> -n devops-demo
kubectl describe pod <pod-name> -n devops-demo
```

## Order To Follow Without Thinking Too Much

If you want the short version, do this exact order:

1. Connect `kubectl` to EKS
2. Check `kubectl get nodes`
3. Check `kubectl get storageclass`
4. Fix storage if needed
5. Create ECR repos
6. Login Docker to ECR
7. Build images
8. Tag images
9. Push images
10. Replace image names in `k8s/base/*.yaml`
11. Apply `k8s/base/*`
12. Wait for pods
13. Apply `k8s/monitoring/*`
14. Get frontend load balancer URL
15. Open the app
16. Open Grafana and Prometheus

## Official AWS References

These are the AWS docs I matched this guide against:

1. `aws eks update-kubeconfig`
2. ECR image push guide
3. EKS add-ons guide
4. EBS CSI driver guide

Links:

1. https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
2. https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html
3. https://docs.aws.amazon.com/eks/latest/userguide/creating-an-add-on.html
4. https://docs.aws.amazon.com/eks/latest/userguide/workloads-add-ons-available-eks.html
5. https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
