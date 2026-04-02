
## 🎬 Kubernetes DaemonSet Explained

📌 This video covers:
- What is a DaemonSet  
- Real-world use cases  
- Step-by-step explanation  

👉 Click the thumbnail below to watch on YouTube:

[![Watch the video](https://img.youtube.com/vi/QgauXUBdxCc/0.jpg)](https://youtu.be/QgauXUBdxCc?si=PPEOfDjjihL69zs-)
# 📘 Kubernetes DaemonSet + Prometheus Setup

---

## 📌 What is DaemonSet?

A **DaemonSet** ensures that **one pod runs on every node** in the Kubernetes cluster.

* When a **new node joins**, a pod is automatically created
* When a **node is removed**, the pod is deleted

---

## 🧠 Simple Definition

A **DaemonSet** is a Kubernetes workload used to run the same pod on **all nodes** (or selected nodes).

---

## ❓ Why We Use DaemonSet

| Workload    | Purpose                  |
| ----------- | ------------------------ |
| Deployment  | Fixed number of replicas |
| StatefulSet | Stateful applications    |
| DaemonSet   | One pod per node         |

👉 Use DaemonSet when **every node needs a copy of a service**

---

## 🌍 Real-Time Use Cases

* Log collection → Fluentd / Fluent Bit
* Monitoring → Node Exporter
* Security agents
* Storage agents
* Network plugins

---

## ⚙️ How DaemonSet Works

Example:

If your cluster has **3 nodes**:

* Node 1 → 1 pod
* Node 2 → 1 pod
* Node 3 → 1 pod

👉 Total Pods = 3

If a new node is added → **1 more pod is created automatically**

---

## 🔄 DaemonSet vs Deployment

### Deployment

* You define replica count
* Example: 3, 5, 10 pods

### DaemonSet

* Kubernetes decides pod count
* One pod per node

---

# 🚀 Prometheus Deployment (Step-by-Step)

## 📁 Project Structure

```
k8s/
 ├── prometheus/
 │    ├── prometheus-daemonset.yaml
 │    ├── prometheus-configmap.yaml
 │    └── service.yaml
```

---

## ⚙️ Step 1: Navigate to Folder

```bash
cd k8s/prometheus
```

---

## 📄 Step 2: Apply ConfigMap

```bash
kubectl apply -f prometheus-configmap.yaml
```

Check:

```bash
kubectl get configmap
```

---

## 📦 Step 3: Deploy DaemonSet

```bash
kubectl apply -f prometheus-daemonset.yaml
```

Check Pods:

```bash
kubectl get pods -l app=prometheus -o wide
```

👉 You should see **1 pod per node**

---

## 🌐 Step 4: Create Service

```bash
kubectl apply -f service.yaml
```

Check:

```bash
kubectl get svc prometheus-service
```

---

## 🔍 Step 5: Get Node IP

```bash
kubectl get nodes -o wide
```

---

## 🌍 Step 6: Access Prometheus UI

```
http://<NODE-IP>:30090
```

Example:

```
http://192.168.1.10:30090
```

---

## 🧪 Step 7: Verify

* Open **Status → Targets**
* Ensure all targets are **UP**

---

# 🛠️ Useful Commands

### 🔍 Check All Resources

```bash
kubectl get all -l app=prometheus
```

### 📦 Check Pods

```bash
kubectl get pods -o wide
```

### 📄 Describe Pod

```bash
kubectl describe pod <pod-name>
```

### 📜 View Logs

```bash
kubectl logs <pod-name>
```

### ❌ Delete Everything

```bash
kubectl delete -f .
```

---

# 🛠️ DaemonSet Commands (Important)

### Check DaemonSet

```bash
kubectl get daemonset
```

### Describe DaemonSet

```bash
kubectl describe daemonset prometheus
```

### Delete DaemonSet

```bash
kubectl delete daemonset prometheus
```

### Delete Using YAML

```bash
kubectl delete -f prometheus-daemonset.yaml
```

### Restart DaemonSet

```bash
kubectl rollout restart daemonset prometheus
```

### Check Rollout Status

```bash
kubectl rollout status daemonset prometheus
```

---

# 🔍 How to Verify DaemonSet Concept

```bash
kubectl get nodes
kubectl get pods -o wide
```

👉 Compare:

* Number of nodes
* Number of pods

✔️ Result: **Each node has one pod**

---

# ⚠️ Notes

* NodePort range: **30000–32767**
* Open port **30090** in firewall
* Each node runs its own Prometheus instance

---

# 🎯 Interview Point

**Q: Difference between Deployment and DaemonSet?**

✔️ Answer:

* Deployment → fixed number of replicas
* DaemonSet → one pod per node

---

# 🧾 Summary

👉 **DaemonSet = One Pod Per Node**

Use DaemonSet when your application must run on **every node** in the cluster.

---
