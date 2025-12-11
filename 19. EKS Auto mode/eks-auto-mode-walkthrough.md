Here’s a clean, copy-paste **Markdown** runbook—**no environment variables**—that walks you through creating an **EKS Auto Mode** cluster, enabling Auto Mode features (if you have an existing cluster), and deploying a sample workload.

---

# How to Create an EKS Auto Mode Cluster

*A step-by-step walkthrough (no env vars). Works on macOS/Linux/CloudShell.*

## 1) Prerequisites

```bash
aws --version
kubectl version --client --output=yaml
eksctl version
```

If `eksctl` is missing:

**macOS**

```bash
brew install eksctl
```

**Linux**

```bash
curl -sSL "https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" \
 | tar xz && sudo mv eksctl /usr/local/bin/
```

---

## 2) Creating the Cluster (recommended: `eksctl`)

```bash
# Creates control plane and enables Auto Mode features
eksctl create cluster \
  --name my-eks-auto \
  --region us-west-2 \
  --enable-auto-mode
```

Configure `kubectl`:

```bash
aws eks update-kubeconfig \
  --name my-eks-auto \
  --region us-west-2
```

Confirm access:

```bash
kubectl get ns
```

> Auto Mode provisions worker capacity when workloads are scheduled, so you may not see nodes until you deploy something.

---

## 3) Creating the Cluster (explicit: AWS CLI only)

Use this path if you want to control **IAM roles** and **subnets** yourself.

### 3.1 Pick subnets (choose at least two across AZs)

```bash
aws ec2 describe-subnets --query 'Subnets[*].{SubnetId:SubnetId,AZ:AvailabilityZone}' --output table
```

> Note the `SubnetId` values you want to use.

### 3.2 Create the cluster IAM role

```bash
cat > trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "eks.amazonaws.com" },
    "Action": ["sts:AssumeRole","sts:TagSession"]
  }]
}
EOF

aws iam create-role \
  --role-name AmazonEKSAutoClusterRole \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy --role-name AmazonEKSAutoClusterRole --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy
aws iam attach-role-policy --role-name AmazonEKSAutoClusterRole --policy-arn arn:aws:iam::aws:policy/AmazonEKSComputePolicy
aws iam attach-role-policy --role-name AmazonEKSAutoClusterRole --policy-arn arn:aws:iam::aws:policy/AmazonEKSBlockStoragePolicy
aws iam attach-role-policy --role-name AmazonEKSAutoClusterRole --policy-arn arn:aws:iam::aws:policy/AmazonEKSLoadBalancingPolicy
aws iam attach-role-policy --role-name AmazonEKSAutoClusterRole --policy-arn arn:aws:iam::aws:policy/AmazonEKSNetworkingPolicy

aws iam get-role --role-name AmazonEKSAutoClusterRole --query "Role.Arn" --output text
```

> Copy the printed **Role ARN** for the cluster (you’ll paste it below).

### 3.3 Create the node IAM role

```bash
cat > node-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ec2.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --role-name AmazonEKSAutoNodeRole \
  --assume-role-policy-document file://node-trust-policy.json

aws iam attach-role-policy --role-name AmazonEKSAutoNodeRole --policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodeMinimalPolicy
aws iam attach-role-policy --role-name AmazonEKSAutoNodeRole --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly

aws iam get-role --role-name AmazonEKSAutoNodeRole --query "Role.Arn" --output text
```

> Copy the printed **Role ARN** for nodes (paste it below).

