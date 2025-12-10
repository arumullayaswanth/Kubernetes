Got it — you want to **add one more file/section** for **Kubernetes Cluster Upgrade** in your README.md (or create a separate `.md` file for upgrade steps).

Below is a clean, ready-to-use **upgrade guide Markdown file**.

If you want this placed inside the existing README or exported as a new file, tell me — I can generate the file in canvas.

---

# ✅ **Kubernetes Cluster Upgrade Guide (Markdown File)**

```markdown
# 🔄 Kubernetes Cluster Upgrade Guide

Upgrading a Kubernetes cluster ensures you stay secure, stable, and compatible with the latest API features.  
This guide explains the recommended upgrade steps for **EKS**, **Kubeadm**, and general best practices.

---

## 🚀 1. Pre-Upgrade Checklist

Before upgrading:

- Check **Kubernetes version skew policy**
- Verify **node groups**, **addons**, **CNI**, and **Ingress** compatibility
- Backup:
  - etcd (if Kubeadm cluster)
  - Helm release configurations
  - CRDs and manifests
- Review deprecated APIs for your next version:
```

kubectl get --raw /openapi/v2 | jq '.definitions | keys[]' | grep -i deprecated

```
- Ensure workloads are healthy:
```

kubectl get pods -A

````

---

## 🟦 2. Upgrade Steps for Amazon EKS

### Step 1: Check Available Versions
```bash
aws eks describe-cluster --name <cluster-name> --query "cluster.version"
````

### Step 2: Upgrade EKS Control Plane

```bash
aws eks update-cluster-version \
  --name <cluster-name> \
  --kubernetes-version <target-version>
```

### Step 3: Update Managed Node Groups

```bash
aws eks update-nodegroup-version \
  --cluster-name <cluster-name> \
  --nodegroup-name <nodegroup> \
  --version <target-version>
```

### Step 4: Update Add-ons

```bash
aws eks update-addon \
  --cluster-name <cluster-name> \
  --addon-name vpc-cni \
  --addon-version latest
```

Repeat for:

* kube-proxy
* coredns
* aws-ebs-csi-driver

---

## 🟧 3. Upgrade Steps for Kubeadm Clusters

### Step 1: Upgrade Kubeadm

```bash
sudo apt-get update
sudo apt-get install -y kubeadm=<version>
```

### Step 2: Plan the Upgrade

```bash
sudo kubeadm upgrade plan
```

### Step 3: Apply Control Plane Upgrade

```bash
sudo kubeadm upgrade apply <version>
```

### Step 4: Upgrade Kubelet & Kubectl

```bash
sudo apt-get install -y kubelet=<version> kubectl=<version>
sudo systemctl restart kubelet
```

### Step 5: Upgrade Worker Nodes

* Drain node
* Upgrade kubeadm
* Upgrade kubelet
* Uncordon

```bash
kubectl drain <node> --ignore-daemonsets
sudo kubeadm upgrade node
kubectl uncordon <node>
```

---

## 🟩 4. Post-Upgrade Validation

* Check node versions:

  ```bash
  kubectl get nodes
  ```
* Check cluster health:

  ```bash
  kubectl get cs
  ```
* Validate workloads:

  ```bash
  kubectl get pods -A
  ```

---

## 🧪 5. Rollback Strategy

* For EKS:

  * Roll back node groups
  * Restore add-ons to previous version
* For Kubeadm:

  * Restore etcd backup
  * Re-install previous kubelet/kubectl versions

---

## ✔️ Conclusion

You successfully upgraded your Kubernetes cluster using best practices.
Cluster upgrades should always be tested first in a staging or dev environment.

```

---

If you'd like, I can:

✅ Add this as **Section #8** in your existing README  
OR  
✅ Create a **new file** named `Kubernetes-Cluster-Upgrade.md` inside the canvas  

Tell me which option you prefer!
```
