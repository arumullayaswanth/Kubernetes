
# 🐣 Kubernetes on AWS EKS – Step-by-Step for Beginners

This guide shows how to set up Kubernetes using **Amazon EKS** on an **EC2 instance** from scratch.

---

## 🧱 PART 1: SET UP EC2 AS MANAGEMENT MACHINE

### ✅ Step 1. Launch EC2

- OS: Ubuntu 22.04
- Instance type: t2.medium
- IAM Role with permissions:
  - AmazonEKSFullAccess
  - AmazonEC2FullAccess
  - IAMFullAccess
  - CloudFormationFullAccess

---

### ✅ Step 2. Connect to EC2

```bash
ssh -i your-key.pem ubuntu@<your-ec2-public-ip>
```

---

## 🛠️ PART 2: INSTALL REQUIRED TOOLS

### ✅ Step 3. Install AWS CLI

```bash
sudo apt update
sudo apt install -y awscli
aws --version
```

---

### ✅ Step 4. Install `kubectl`

```bash
curl -LO "https://dl.k8s.io/release/$(curl -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin/
kubectl version --client
```

---

### ✅ Step 5. Install `eksctl`

```bash
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz"   | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
eksctl version
```

---

### ✅ Step 6. Configure AWS CLI

```bash
aws configure
```

Enter:
- Access Key ID
- Secret Key
- Region: `us-east-1`
- Output: `json`

---

## ☁️ PART 3: CREATE EKS CLUSTER

### ✅ Step 7. Create Kubernetes Cluster

```bash
eksctl create cluster   --name my-cluster   --region us-east-1   --node-type t2.small   --nodes 2   --zones us-east-1a,us-east-1b
```

⏱️ Wait 10–15 minutes

---

### ✅ Step 8. Connect `kubectl` to Cluster

```bash
aws eks --region us-east-1 update-kubeconfig --name my-cluster
```

Verify:

```bash
kubectl get nodes
```

---

## 🚀 PART 4: DEPLOY YOUR APP

### ✅ Step 9. Create YAML Files

#### 9.1 `pod.yml`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    app: webapp
    type: front-end
spec:
  containers:
  - name: nginx-container
    image: nginx
```

---

#### 9.2 `replicaset.yml`

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: web-rs
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      name: myapp-pod
      labels:
        app: webapp
        type: front-end
    spec:
      containers:
      - name: nginx-container
        image: nginx
```

---

#### 9.3 `deployment.yml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80
```

---

### ✅ Step 10. Deploy YAML Files

```bash
kubectl apply -f pod.yml
kubectl apply -f replicaset.yml
kubectl apply -f deployment.yml
```

---

### ✅ Step 11. Check Status

```bash
kubectl get pods
kubectl get rs
kubectl get deployments
```

---

### ✅ Step 12. Expose Deployment to Internet

```bash
kubectl expose deployment nginx-deployment --type=LoadBalancer --port=80
kubectl get svc
```

➡️ Visit the `EXTERNAL-IP` in a browser — NGINX welcome page should appear! 🎉

---

## 🧼 PART 5: CLEANUP

```bash
kubectl delete -f pod.yml
kubectl delete -f replicaset.yml
kubectl delete -f deployment.yml
eksctl delete cluster --name my-cluster --region us-east-1
```

---

## 🧠 Summary

| Step      | Task                                |
|-----------|-------------------------------------|
| EC2       | Control machine                     |
| CLI Tools | AWS CLI, kubectl, eksctl            |
| Cluster   | Created via eksctl                  |
| Deploy    | Pod, ReplicaSet, Deployment via YAML|
| Expose    | Accessed NGINX using LoadBalancer   |

---

> 🧾 Need more help? Want to deploy a real app (Node.js, Python, etc.)? Let me know!



## ✅ Step-by-Step: Verify Kubernetes Deployment on EKS
- 🎯 1. Check if Nodes Are Ready
```bash
kubectl get nodes
```

- 📦 2. Check if Pods Are Running
```bash
kubectl get pods
```

- 🧠 3. Check ReplicaSet
 ```bash
kubectl get rs

#You should see something like:
NAME      DESIRED   CURRENT   READY   AGE
web-rs    3         3         3       1m

```

 - 🏗 4. Check Deployment
```bash
kubectl get deployments

#Expected output:
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   3/3     3            3           1m

```

- 🌍 5. Check Service (LoadBalancer)
```bash

kubectl get svc

#You should see something like:
NAME               TYPE           CLUSTER-IP      EXTERNAL-IP       PORT(S)        AGE
nginx-deployment   LoadBalancer   10.100.x.x      a1b2c3d4e5.us...   80:xxxxx/TCP   1m

#🧪 Copy the EXTERNAL-IP, paste it in your browser — you should see the NGINX welcome page! 🎉
```
- 🔍 6. Describe Resources (Optional but Helpful)
```bash
kubectl describe pod myapp
kubectl describe deployment nginx-deployment
kubectl describe service nginx-deployment
```

- 🧹 7. Delete Everything (Optional Cleanup)
```bash
kubectl delete -f pod.yml
kubectl delete -f replicaset.yml
kubectl delete -f deployment.yml
eksctl delete cluster --name my-cluster --region us-east-1
```


---
# ✅ PART 1: Verify in AWS Console

---

## 🖥️ 1. Go to the AWS Console

- ➡️ [https://console.aws.amazon.com](https://console.aws.amazon.com)

---

## 🔍 2. Check EKS Cluster

- Search **"EKS"** in the top search bar  
- Click **Elastic Kubernetes Service**  
- You should see your cluster:  
  - ✅ `my-cluster` in **Active** state  
- Click on the cluster name:  
  - View **Nodes**, **Networking**, and **Add-ons**

---

## 🧱 3. Check EC2 Instances

- Go to **EC2** service  
- On the left menu, click **Instances**  
- You should see:  
  - Control EC2 instance (used to run `kubectl`)  
  - **2 EC2 instances** as EKS worker nodes  
- They should be in **running** state

---

## 🌐 4. Check Load Balancer

- In the EC2 menu, go to **Load Balancers**  
- You should see a new **Load Balancer** for your exposed service (`nginx-deployment`)  
- **Copy the DNS name**  
- Open it in a browser  
  - ➡️ You should see the **NGINX welcome page!**

---

## 🗂 5. Check CloudFormation (Optional)

- Go to **CloudFormation**  
- You’ll see stacks like:  
  - `eksctl-my-cluster-cluster`  
  - `eksctl-my-cluster-nodegroup`  
- These show that `eksctl` used templates to create everything

---
