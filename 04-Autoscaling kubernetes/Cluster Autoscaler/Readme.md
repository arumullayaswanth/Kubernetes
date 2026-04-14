# 🎬 Kubernetes Cluster Autoscaler – Setup & Test Guide

![Cluster Autoscaler Architecture](https://raw.githubusercontent.com/arumullayaswanth/Kubernetes/120cff33f91b59317e60d3915b74b4e9f58e22d4/04-Autoscaling%20kubernetes/Cluster%20Autoscaler/architecture.jpg)

## 🧱 Step 1: Verify Installation

Run the following commands to confirm that the Cluster Autoscaler is running correctly:

```bash
kubectl get pods -n kube-system | grep autoscaler
```

```bash
kubectl logs -n kube-system deployment/cluster-autoscaler
```

### ✅ Expected Output

You should see:

```text
Cluster Autoscaler initialized
```

---

## 🧪 Step 2: Test Autoscaling (IMPORTANT)

Create a high-resource pod to trigger autoscaling.

### 📄 `stress.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scale-test
spec:
  replicas: 20
  selector:
    matchLabels:
      app: scale-test
  template:
    metadata:
      labels:
        app: scale-test
    spec:
      containers:
      - name: stress
        image: nginx
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
```

### ▶️ Apply the Pod

```bash
kubectl apply -f stress.yaml
```

# Terminal 1 - watch pods
kubectl get pods -w

---

## 🔍 Step 3: Watch Autoscaling in Action

Monitor node scaling in real-time:
- Terminal 2 - watch nodes
```bash
kubectl get nodes -w
```

### 👀 What You’ll See

```text
New node joining...
```

---

## 🎯 How Autoscaling Works

| Situation          | What Happens               |
| ------------------ | -------------------------- |
| Load increases     | Pods go into Pending state |
| Autoscaler detects | Node group scales up       |
| New EC2 instance   | Node joins cluster         |
| Pod scheduled      | Workload runs successfully |
| Load decreases     | Nodes are scaled down      |

---

## 💡 Tips for Better Demo / Recording

* Start with a **small cluster (1 node)** so scaling is visible
* Use `kubectl describe pod stress-test` to show **Pending reason**
* Keep logs open:

  ```bash
  kubectl logs -f -n kube-system deployment/cluster-autoscaler
  ```
* Record terminal + explanation for a clean tutorial video

---

