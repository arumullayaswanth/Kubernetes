
# **EKS Cluster Setup, NodeGroup Creation & Cleanup Guide**

This document provides a complete set of commands to:

1. Create an EKS cluster
2. Configure OIDC
3. Create a managed node group
4. Update kubeconfig
5. Delete the cluster

---

## ## **1. Create EKS Cluster (Without Node Group)**

```bash
eksctl create cluster --name eksupgrade \
                      --region us-east-1 \
                      --zones us-east-1a,us-east-1b \
                      --without-nodegroup
```

This creates only the EKS **control plane** without any worker nodes.

---

## ## **2. Associate IAM OIDC Provider**

```bash
eksctl utils associate-iam-oidc-provider \
    --region us-east-1 \
    --cluster eksupgrade \
    --approve
```

OIDC is required for IAM Roles for Service Accounts (IRSA).

---

## ## **3. Create a Managed Node Group**

```bash
eksctl create nodegroup --cluster eksupgrade \
                        --region us-east-1 \
                        --name observability-ng-private \
                        --node-type t3.medium \
                        --nodes-min 2 \
                        --nodes-max 3 \
                        --node-volume-size 20 \
                        --managed \
                        --asg-access \
                        --external-dns-access \
                        --full-ecr-access \
                        --appmesh-access \
                        --alb-ingress-access \
                        --node-private-networking
```

### What this node group includes:

* Managed node group
* Private networking
* IAM permissions for:

  * ASG access
  * External DNS
  * ECR access
  * AppMesh
  * ALB Ingress Controller

---

## ## **4. Update Local kubeconfig**

```bash
aws eks update-kubeconfig --name eksupgrade --region us-east-1
```

This updates `~/.kube/config` so kubectl can communicate with the cluster.

---

## ## **5. Delete the EKS Cluster**

```bash
eksctl delete cluster --name eksupgrade --region us-east-1
```

This deletes:

* Control plane
* Node groups
* CloudFormation stacks created by eksctl

---
