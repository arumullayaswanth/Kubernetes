
# **EKS Upgrade Process**
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
# **Step:1. Upgrade the EKS Control Plane**
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

# ## **2. Upgrade the EKS Control Plane**

You must specify the Kubernetes version you want to upgrade **to**:

```bash
eksctl upgrade cluster \
  --name eksupgrade \
  --region us-east-1 \
  --version 1.33 \
  --approve
```

Replace **1.33** with the target version you are upgrading **to**.

# ## **3. Verify Control Plane Upgrade**

```bash
aws eks describe-cluster \
  --name eksupgrade \
  --region us-east-1 \
  --query "cluster.version"
```

```bash
kubectl version
```
---
---

#  **Step: 2. Upgrade Node Groups / Worker Nodes / Fargate**

# ## **4. Upgrade Managed Node Group**

Node groups must match the cluster version.

```bash
eksctl upgrade nodegroup \
  --cluster eksupgrade \
  --name eksupgrade-ng-private \
  --region us-east-1 \
  --kubernetes-version 1.33
```

# ## **5. Verify Node Group Upgrade**

```bash
kubectl get nodes -o wide
```

# ## **6. (Optional) Roll Nodes to Apply New AMI**

If nodes still show old version, force a rolling update:

```bash
eksctl upgrade nodegroup \
  --cluster eksupgrade \
  --name eksupgrade-ng-private \
  --region us-east-1 \
  --force \
  --approve
```
---
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
---

# **Step:3. Upgrade All Core EKS Add-ons**

Replace **1.32** with your cluster version if needed.

---

# ## **7. Upgrade Amazon VPC CNI (amazon-vpc-cni)**

```bash
eksctl update addon \
  --name vpc-cni \
  --cluster eksupgrade \
  --region us-east-1 \
  --force

```
```bash
eksctl get addon \
  --name vpc-cni \
  --cluster eksupgrade \
  --region us-east-1
```
#### 1. Verify Pod version in the cluster
```bash
kubectl get ds aws-node -n kube-system -o wide
```
Check pod health
```bash
kubectl get pods -n kube-system | grep aws-node
```
---

# ## **8. Upgrade kube-proxy**
1. Check current kube-proxy addon version
```bash
eksctl get addon \
  --name kube-proxy \
  --cluster eksupgrade \
  --region us-east-1
```

This shows:

* current version
* whether an update is available


#### 2. List available versions (optional)

```bash
eksctl utils describe-addon-versions \
  --name kube-proxy \
  --region us-east-1
```

#### 3. Upgrade kube-proxy addon

```bash
eksctl update addon \
  --name kube-proxy \
  --cluster eksupgrade \
  --region us-east-1 \
  --force
```
#### 4. Verify kube-proxy upgrade

### Check addon status:

```bash
eksctl get addon \
  --name kube-proxy \
  --cluster eksupgrade \
  --region us-east-1
```

Ensure:

```
STATUS = ACTIVE
```

### Check DaemonSet version:

```bash
kubectl get ds kube-proxy -n kube-system -o wide
```

Check the image version:

```bash
kubectl describe ds kube-proxy -n kube-system | grep Image:
```

You should see the new version, like:

```
Image: 602401143452.dkr.ecr.us-east-1.amazonaws.com/eks/kube-proxy:v1.x.x
```
---

# ## **9. Upgrade CoreDNS**
#### 1. Check the Current CoreDNS Addon Version

```bash
eksctl get addon \
  --name coredns \
  --cluster eksupgrade \
  --region us-east-1
```

You will see something like:

```
NAME      VERSION   STATUS   UPDATE AVAILABLE
coredns   v1.10.x   ACTIVE   true
```

---

#### 2. View Available CoreDNS Versions

```bash
eksctl utils describe-addon-versions \
  --name coredns \
  --region us-east-1
```

This helps you choose the correct version for your Kubernetes version.

#### 3.  Upgrade CoreDNS Addon

Use this command:

```bash
eksctl update addon \
  --name coredns \
  --cluster eksupgrade \
  --region us-east-1 \
  --force
```

`--force` ensures dependencies are updated if needed.


#### ➕ Optional: Update the CoreDNS ConfigMap (if Kubernetes version changed)

If you're upgrading Kubernetes, EKS may require refreshing the CoreDNS ConfigMap:

```bash
kubectl get configmap coredns -n kube-system -o yaml
```

Let me know if the config looks outdated—I can generate the corrected version.


#### 5. Verify CoreDNS Upgrade

✔ Check addon status

```bash
eksctl get addon \
  --name coredns \
  --cluster eksupgrade \
  --region us-east-1
```

✔ Check CoreDNS deployment

```bash
kubectl get deployment coredns -n kube-system -o wide
```

You should see:

* `READY` replicas = number of nodes or more
* updated image version

✔ Check pod health

```bash
kubectl get pods -n kube-system | grep coredns
```

All pods should be in **Running** state.

---
---

# ## **10. Verify Add-on Upgrade Status**

```bash
aws eks list-addons --cluster-name eksupgrade --region us-east-1
```

```bash
aws eks describe-addon \
  --cluster-name eksupgrade \
  --addon-name coredns \
  --region us-east-1 \
  --query "addon.addonVersion"
```

---

# ## ⭐ OPTIONAL Add-ons

---

# ### **11. Upgrade EBS CSI Driver**

```bash
aws eks update-addon \
  --cluster-name eksupgrade \
  --addon-name aws-ebs-csi-driver \
  --region us-east-1 \
  --resolve-conflicts OVERWRITE
```

---

# ### **12. Upgrade EFS CSI Driver**

```bash
aws eks update-addon \
  --cluster-name eksupgrade \
  --addon-name aws-efs-csi-driver \
  --region us-east-1 \
  --resolve-conflicts OVERWRITE
```

---

# ## **13. Check Add-ons via kubectl**

```bash
kubectl get pods -n kube-system -o wide
```

---


# ## **14. Validate the Upgrade**

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




