
 **EKS Upgrade Process**
1. Upgrading the **EKS Control Plane**
2. Upgrading **Node Groups / Worker Nodes / Fargate**
3. Upgrading **EKS Add-ons**



---

# **EKS Upgrade Process – Commands Guide**

This document provides commands for upgrading:

* EKS Control Plane
* Managed Node Groups / Worker Nodes / Fargate
* EKS Add-ons

---

# ## **1. Check Current Cluster and Node Versions (Before Upgrade)**

```bash
aws eks describe-cluster \
  --name eksupgrade \
  --region us-east-1 \
  --query "cluster.version"
```

```bash
kubectl version
```

```bash
eksctl get nodegroup --cluster eksupgrade --region us-east-1
```

---

# ## **2. Upgrade the EKS Control Plane**

You must specify the Kubernetes version you want to upgrade **to**:

```bash
eksctl upgrade cluster \
  --name eksupgrade \
  --region us-east-1 \
  --version 1.30 \
  --approve
```

Replace **1.30** with the target version you are upgrading **to**.

---

# ## **3. Verify Control Plane Upgrade**

```bash
aws eks describe-cluster \
  --name eksupgrade \
  --region us-east-1 \
  --query "cluster.version"
```

```bash
kubectl version --short
```


---
---

## ## **2. Upgrade Node Groups / Worker Nodes / Fargate**

### List node groups:

```bash
eksctl get nodegroup --cluster eksupgrade --region us-east-1
```

```bash
kubectl get nodes -o wide
```

### Upgrade a Managed Node Group:

```bash
eksctl upgrade nodegroup \
  --cluster eksupgrade \
  --region us-east-1 \
  --name observability-ng-private \
  --kubernetes-version 1.31 \
  --approve
```

### For Self-Managed Worker Nodes (If applicable)

**Drain the node:**

```bash
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
```

**Upgrade AMI in Launch Template**
(Example for Amazon Linux 2)

```bash
aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=amazon-eks-node-1.31-*" \
  --region us-east-1
```

Then update Launch Template and perform a rolling update of the ASG.

**Uncordon the node:**

```bash
kubectl uncordon <node-name>
```

---

## ## **3. Upgrade EKS Add-ons**

### **CoreDNS**

```bash
eksctl utils update-coredns \
  --cluster eksupgrade \
  --region us-east-1 \
  --approve
```

### **kube-proxy**

```bash
eksctl utils update-kube-proxy \
  --cluster eksupgrade \
  --region us-east-1 \
  --approve
```

### **VPC CNI (aws-node)**

```bash
eksctl utils update-aws-node \
  --cluster eksupgrade \
  --region us-east-1 \
  --approve
```

### **Cluster Autoscaler (If installed via Helm)**

Get the recommended version first:

```bash
kubectl get deployment cluster-autoscaler -n kube-system -o yaml | grep image
```

Upgrade using Helm:

```bash
helm upgrade cluster-autoscaler \
  autoscaler/cluster-autoscaler-chart \
  --namespace kube-system
```

### **Metrics Server (If using Helm)**

```bash
helm upgrade metrics-server \
  metrics-server/metrics-server \
  --namespace kube-system
```

# **4. Validate Add-on Versions**

```bash
kubectl get pods -n kube-system
```

You should see:

* coredns pods recreated
* kube-proxy DaemonSet updated
* aws-node updated


# ## **5. Validate the Upgrade**

### Check node versions:

```bash
kubectl get nodes
```

### Check system pods:

```bash
kubectl get pods -n kube-system
```

### Check API server:

```bash
kubectl version --short
```
---

# **6. Final Verification Test**

### Test cluster health:

```bash
kubectl get componentstatuses
```

### Test workload scheduling:

```bash
kubectl run nginx-test \
  --image=nginx \
  --restart=Never
```

Check pod:

```bash
kubectl get pod nginx-test -o wide
```

Delete test pod:

```bash
kubectl delete pod nginx-test
```

---

# **7. (Optional) Delete Cluster After Testing**

```bash
eksctl delete cluster \
  --name eksupgrade \
  --region us-east-1
```

---




