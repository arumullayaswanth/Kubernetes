
# Setup Kubernetes on Amazon EKS

You can follow the same procedure in the official AWS documentation:  
[Getting started with Amazon EKS – eksctl](https://docs.aws.amazon.com/eks/latest/userguide/getting-started-eksctl.html)

---

## 📌 Pre-requisites

- An EC2 instance (Amazon Linux 2 recommended)
- AWS CLI configured (`aws configure`)
- IAM permissions:
  - IAM
  - EC2
  - VPC
  - CloudFormation
  - EKS

> ⚠️ Note: If your bootstrap system is outside AWS, create an IAM user with **programmatic access**.

---

# Step 1: Install kubectl

### 1. Download kubectl

```sh
curl -LO "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
````

### 2. Make it executable

```sh
chmod +x ./kubectl
```

### 3. Move to PATH

```sh
sudo mv ./kubectl /usr/local/bin
```

### 4. Verify installation

```sh
kubectl version --client
```

- or
```bash
curl -LO "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" 
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin
kubectl version --client
```
---

# Step 2: Install eksctl

### 1. Download and extract latest release

```sh
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
```

### 2. Move binary to PATH

```sh
sudo mv /tmp/eksctl /usr/local/bin
```

### 3. Verify installation

```sh
eksctl version
```
- Or
```bash
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
eksctl version
```
---
# Install Helm (Optional)

### Install Helm 3

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Verify installation

```bash
helm version
```

---

# Step 3: Create IAM Role for EC2

1. Go to **AWS Console → IAM**
2. Create a new **IAM Role**
3. Attach policies:

   * AmazonEKSClusterPolicy
   * AmazonEC2FullAccess
   * AmazonVPCFullAccess
   * AWSCloudFormationFullAccess
   * IAMFullAccess
4. Attach this role to your EC2 instance

---

# Step 4: Create EKS Cluster and Node Group

Create the cluster in `us-east-1`:

```sh
eksctl create cluster \
  --name my-cluster \
  --region us-east-1 \
  --nodegroup-name my-nodegroup \
  --node-type t3.large \
  --nodes 2 \
  --nodes-min 2 \
  --nodes-max 10 \
  --managed
```

### 🔹 What this does:

* Creates EKS control plane
* Creates node group
* Enables auto scaling (2–10 nodes)
* Sets up networking
* Configures CloudFormation stack

> ⏳ Cluster creation may take 10–20 minutes.

---

# Step 4.1: Verify Auto Scaling Group

1. Go to **AWS Console → EC2 → Auto Scaling Groups**
2. Look for:

```
eksctl-my-cluster-nodegroup-<random-string>
```

3. Verify:

   * Desired Capacity = 2
   * Min Capacity = 2
   * Max Capacity = 10

---

# Step 5: Configure kubectl to Connect to EKS

After cluster creation, update kubeconfig:

```sh
aws eks --region us-east-1 update-kubeconfig --name my-cluster
```

Check node groups:

```sh
eksctl get nodegroup --cluster my-cluster --region us-east-1
```

---

# Step 6: Verify Cluster Connection

```sh
kubectl get nodes
```

✅ If successful, you should see 2 worker nodes in `Ready` state.

---

# Step 7: Delete EKS Cluster (Cleanup)

To delete cluster and all associated resources:

```sh
eksctl delete cluster --name my-cluster --region us-east-1
```

> ⚠️ This will delete:
>
> * EKS cluster
> * Worker nodes
> * VPC resources created by eksctl
> * CloudFormation stacks

---

