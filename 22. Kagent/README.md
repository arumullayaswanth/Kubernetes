

# 🚀 Kagent Installation Guide (Kubernetes)

This guide explains **how to install Kagent in a Kubernetes cluster step by step**.  
Kagent is an AI-powered SRE / DevOps agent designed to run inside Kubernetes and help with operations, observability, and automation.

---

## 📌 Prerequisites

Before installing Kagent, make sure you have:

- A running Kubernetes cluster (any one):
  - Minikube
  - Kind
  - EKS / GKE / AKS
- `kubectl` installed and configured
- Helm v3 installed
- Internet access from the cluster

Verify tools:

```bash
kubectl version --client
helm version
````

---

## 📁 Step 1: Verify Kubernetes Cluster

Check if your cluster is running:

```bash
kubectl get nodes
```

Expected output:

* Nodes should be in **Ready** state

---

## 📁 Step 2: Create a Namespace for Kagent

Create a dedicated namespace:

```bash
kubectl create namespace kagent
```

Verify:

```bash
kubectl get namespaces
```

---

## 📁 Step 3: Add Kagent Helm Repository

Add the official Kagent Helm repository:

```bash
helm repo add kagent https://kagent.dev/helm
```

Update Helm repositories:

```bash
helm repo update
```

Verify repo:

```bash
helm search repo kagent
```

---

## 📁 Step 4: Create Values File (Optional but Recommended)

Create a custom values file:

```bash
vi values.yaml
```

Example `values.yaml`:

```yaml
replicaCount: 1

image:
  repository: kagent/kagent
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8080

resources:
  limits:
    cpu: "500m"
    memory: "512Mi"
  requests:
    cpu: "250m"
    memory: "256Mi"

env:
  LOG_LEVEL: info
```

Save and exit.

---

## 📁 Step 5: Install Kagent Using Helm

Install Kagent into the cluster:

```bash
helm install kagent kagent/kagent \
  --namespace kagent \
  -f values.yaml
```

If you don’t want a custom file, you can install directly:

```bash
helm install kagent kagent/kagent --namespace kagent
```

---

## 📁 Step 6: Verify Installation

Check pods:

```bash
kubectl get pods -n kagent
```

Expected:

* Pod status should be **Running**

Check services:

```bash
kubectl get svc -n kagent
```

---

## 📁 Step 7: Check Kagent Logs

To verify Kagent is working:

```bash
kubectl logs -n kagent deployment/kagent
```

You should see logs showing:

* Agent startup
* Cluster connection
* Controller initialization

---

## 📁 Step 8: Access Kagent UI (If Enabled)

Port-forward the service:

```bash
kubectl port-forward -n kagent svc/kagent 8080:8080
```

Open browser:

```
http://localhost:8080
```

---

## 📁 Step 9: Uninstall Kagent (Optional)

If you want to remove Kagent:

```bash
helm uninstall kagent -n kagent
```

Delete namespace:

```bash
kubectl delete namespace kagent
```

---

## 🛠 Troubleshooting

* Pod not running:

  ```bash
  kubectl describe pod -n kagent
  ```
* Image pull error:

  * Check internet access
  * Verify image name and tag
* Permission issues:

  * Ensure cluster-admin or required RBAC permissions

---

## 📚 Next Steps

* Connect Kagent with observability tools
* Enable AI-based incident analysis
* Integrate with CI/CD pipelines
* Customize policies and automation rules

---

## ⭐ Contribute

If you like Kagent:

* Star the repository ⭐
* Raise issues 🐛
* Submit PRs 🚀

Happy Kubernetes Automation! 🎉

```

---

If you want next:
- 🔹 **EKS-specific installation**
- 🔹 **RBAC deep dive**
- 🔹 **Kagent architecture diagram**
- 🔹 **YouTube video script from this README**

Just tell me 👌
```
