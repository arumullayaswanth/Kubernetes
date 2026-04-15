# AWS Load Balancer Controller

## What Is It

The AWS Load Balancer Controller is a Kubernetes controller that runs inside your EKS cluster.
It watches for Ingress resources and automatically creates and manages AWS ALBs.

## Why It Is Required

Without it:
- Ingress object gets created in Kubernetes
- But NO ALB is created in AWS
- Your app is not accessible from the internet

With it:
- Every Ingress you create → ALB is automatically created in AWS
- Every Ingress you delete → ALB is automatically deleted in AWS

## How It Works

```
You apply ingress.yaml
        |
        ▼
AWS Load Balancer Controller detects the new Ingress
        |
        ▼
Controller calls AWS API → creates ALB in your VPC
        |
        ▼
ALB is attached to your public subnets
        |
        ▼
Traffic flows: Internet → ALB → Pods
```

## Install With Single Script

The easiest way — just run:

```bash
bash install-alb-controller.sh
```

The script automatically:
- Fetches your VPC ID from the cluster (no manual input needed)
- Adds the Helm repo
- Installs the controller
- Waits for it to be ready
- Verifies it is running

## Install Manually

If you want to install manually:

```bash
CLUSTER_NAME="eksprod"
AWS_REGION="us-east-1"

# VPC ID is fetched automatically from your cluster
VPC_ID=$(aws eks describe-cluster \
  --name "${CLUSTER_NAME}" \
  --region "${AWS_REGION}" \
  --query "cluster.resourcesVpcConfig.vpcId" \
  --output text)

echo "VPC ID: ${VPC_ID}"

helm repo add eks https://aws.github.io/eks-charts
helm repo update eks

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName="${CLUSTER_NAME}" \
  --set serviceAccount.create=true \
  --set region="${AWS_REGION}" \
  --set vpcId="${VPC_ID}"
```

## Verify Installation

```bash
kubectl get deployment -n kube-system aws-load-balancer-controller
kubectl get pods -n kube-system | grep aws-load-balancer-controller
```

Expected — 2 pods Running:

```
aws-load-balancer-controller-xxxx   1/1   Running   0
aws-load-balancer-controller-yyyy   1/1   Running   0
```

## Uninstall

```bash
helm uninstall aws-load-balancer-controller -n kube-system
```

Verify it is gone:

```bash
kubectl get pods -n kube-system | grep aws-load-balancer-controller
```

No output = uninstalled successfully.
