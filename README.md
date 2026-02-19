

# 🚀 Production-Grade Kubernetes Setup on Amazon EKS

This guide walks you step-by-step through creating a **Production-Ready Amazon EKS Cluster** using `eksctl`.

Official AWS Documentation:
[https://docs.aws.amazon.com/eks/latest/userguide/getting-started-eksctl.html](https://docs.aws.amazon.com/eks/latest/userguide/getting-started-eksctl.html)

---

# 📌 Architecture Overview

```
AWS
 ├── VPC
 ├── EKS Control Plane
 ├── Managed Node Group (Auto Scaling 2–10)
 ├── Cluster Autoscaler
 ├── EBS CSI Driver
 └── IAM OIDC Provider
```

---

# 📌 Pre-Requisites

You need:

* Amazon Linux 2 EC2 instance (recommended t3.medium or higher)
* AWS CLI installed & configured
* IAM Role attached to EC2 with:

Required Policies:

* AmazonEKSClusterPolicy
* AmazonEC2FullAccess
* AmazonVPCFullAccess
* AWSCloudFormationFullAccess
* IAMFullAccess

Verify AWS:

```bash
aws sts get-caller-identity
```

---

# STEP 1 — Install kubectl

```bash
curl -LO "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
kubectl version --client
```

---

# STEP 2 — Install eksctl

```bash
curl --silent --location \
"https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" \
| tar xz -C /tmp

sudo mv /tmp/eksctl /usr/local/bin
eksctl version
```

---

# STEP 3 — Install Helm (Required for Autoscaler)

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

---

# STEP 4 — Create Production EKS Cluster

### ⚡ Recommended Instance Type

| Use Case             | Instance  |
| -------------------- | --------- |
| Dev                  | t3.large  |
| Small Production     | m5.large  |
| Medium Production    | m5.xlarge |
| AI / Heavy Workloads | c5.xlarge |

---

## 🚀 Create Cluster (Production Command)

```bash
eksctl create cluster \
  --name my-cluster \
  --region us-east-1 \
  --version 1.34 \
  --nodegroup-name my-nodegroup \
  --node-type m5.large \
  --nodes 2 \
  --nodes-min 2 \
  --nodes-max 10 \
  --managed \
  --with-oidc \
  --asg-access \
  --external-dns-access \
  --full-ecr-access \
  --appmesh-access
```

---

## 🔹 What This Command Does

* Creates VPC automatically
* Creates EKS control plane
* Creates managed node group
* Enables IAM OIDC
* Enables Auto Scaling Group permissions
* Sets scaling range (2–10 nodes)
* Production-ready IAM setup

⏳ Wait 15–20 minutes.

---

# STEP 5 — Configure kubectl

```bash
aws eks --region us-east-1 update-kubeconfig --name my-cluster
kubectl get nodes
```

You should see 2 nodes in `Ready` state.

---

# STEP 6 — Install Amazon EBS CSI Driver (IMPORTANT)

Required for dynamic PVC storage.

```bash

eksctl create addon \
  --name aws-ebs-csi-driver \
  --cluster my-cluster \
  --region us-east-1 \
  --force

```

Verify:

```bash
kubectl get pods -n kube-system | grep ebs
```

---

# STEP 7 — Install Cluster Autoscaler (Scaling Fix)

⚠️ Without this, cluster will NOT scale.

---

### Add Helm Repo

```bash
helm repo add autoscaler https://kubernetes.github.io/autoscaler
helm repo update
```

---

### Install Autoscaler

```bash
helm install cluster-autoscaler autoscaler/cluster-autoscaler \
  -n kube-system \
  --set autoDiscovery.clusterName=my-cluster \
  --set awsRegion=us-east-1 \
  --set rbac.create=true \
  --set image.tag=v1.29.0
```

---

### Verify Autoscaler

```bash
kubectl get pods -n kube-system | grep autoscaler
```

Check logs:

```bash
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-cluster-autoscaler

```

You should see:

```
Successfully discovered ASG
```
---

# STEP 9 — Verify Auto Scaling Group

Go to:

AWS Console → EC2 → Auto Scaling Groups

You will see:

```
eksctl-my-cluster-nodegroup-xxxx
```

Check:

* Min = 2
* Desired = 2
* Max = 10

---

# 🧹 DELETE Cluster (Cleanup)

⚠️ This deletes EVERYTHING.

```bash
eksctl delete cluster \
  --name my-cluster \
  --region us-east-1
```

Deletes:

* EKS Control Plane
* Node Groups
* VPC
* Load Balancers
* Security Groups
* CloudFormation stacks

---

