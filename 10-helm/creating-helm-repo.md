
# Creating Helm Repository for Payments and Shipping 

## 🧠 What We Are Doing

Imagine you have **two small apps**:

* 💳 Payments Service
* 📦 Shipping Service

We want to:

1. Create Helm charts for both
2. Package them
3. Put them in GitHub
4. Use them in Kubernetes

We will use a simple BusyBox container (just prints a message and sleeps).

---

# ✅ Before You Start

Make sure you have:

* Helm installed → `helm version`
* Kubernetes cluster running → `kubectl get nodes`
* kubectl configured
* Git installed → `git --version`
* GitHub account

---

# 🏗️ STEP 1 — Create Project Folder

First, create a main folder.

```bash
mkdir helm-repo
cd helm-repo
```

Now create two Helm charts.

```bash
helm create payments
helm create shipping
```

Now your folder looks like this:

```
helm-repo/
  ├── payments/
  └── shipping/
```

---

# ⚙️ STEP 2 — Clean Default Files (Important)

Helm creates many extra files.
We only need Deployment.

Go inside payments:

```bash
cd payments/templates
```

Delete everything except `deployment.yaml`:

```bash
rm hpa.yaml ingress.yaml service.yaml serviceaccount.yaml tests -rf
```

Do same for shipping:

```bash
cd ../../shipping/templates
rm hpa.yaml ingress.yaml service.yaml serviceaccount.yaml tests -rf
```

---

# 📝 STEP 3 — Update Payments Chart

Go to:

```
payments/values.yaml
```

Replace everything with:

```yaml
image:
  repository: busybox
  tag: latest
  pullPolicy: IfNotPresent

appMessage: "Payments Service Running 🚀"
```

---

Now open:

```
payments/templates/deployment.yaml
```

Replace it with:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-payments
spec:
  replicas: 1
  selector:
    matchLabels:
      app: payments
  template:
    metadata:
      labels:
        app: payments
    spec:
      containers:
        - name: payments
          image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
          command: ["sh", "-c", "echo {{ .Values.appMessage }}; sleep 3600"]
          imagePullPolicy: {{ .Values.image.pullPolicy }}
```

---

# 📦 STEP 4 — Update Shipping Chart

Go to:

```
shipping/values.yaml
```

Replace with:

```yaml
image:
  repository: busybox
  tag: latest
  pullPolicy: IfNotPresent

appMessage: "Shipping Service Running 🚚"
```

---

Now open:

```
shipping/templates/deployment.yaml
```

Replace with:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-shipping
spec:
  replicas: 1
  selector:
    matchLabels:
      app: shipping
  template:
    metadata:
      labels:
        app: shipping
    spec:
      containers:
        - name: shipping
          image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
          command: ["sh", "-c", "echo {{ .Values.appMessage }}; sleep 3600"]
          imagePullPolicy: {{ .Values.image.pullPolicy }}
```

---

# 📦 STEP 5 — Package the Charts

Go back to main folder:

```bash
cd ../../
```

Package both charts:

```bash
helm package payments
helm package shipping
```

Now you will see:

```
payments-0.1.0.tgz
shipping-0.1.0.tgz
```

---

# 📑 STEP 6 — Create Helm Index File

This creates repo metadata.

```bash
helm repo index .
```

Now you will see:

```
index.yaml
```

---

# 🌍 STEP 7 — Push to GitHub

## 1️⃣ Create GitHub Repo

Go to GitHub
Create new repo:

```
helm-repo
```

---

## 2️⃣ Initialize Git

Inside your folder:

```bash
git init
git add .
git commit -m "Add payments and shipping helm charts"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/helm-repo.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

---

## 3️⃣ Enable GitHub Pages

Go to:

GitHub Repo → Settings → Pages

Select:

* Source: Deploy from branch
* Branch: main
* Folder: root

Save.

Your Helm repo URL will be:

```
https://YOUR-USERNAME.github.io/helm-repo
```

---

# 🚀 STEP 8 — Use Your Helm Repository

Add repo:

```bash
helm repo add myrepo https://YOUR-USERNAME.github.io/helm-repo
helm repo update
```

Check charts:

```bash
helm search repo myrepo
```

You will see:

* myrepo/payments
* myrepo/shipping

---

# 🎉 STEP 9 — Install Payments

```bash
helm install payments-service myrepo/payments
```

Check pod:

```bash
kubectl get pods
```

Check logs:

```bash
kubectl logs <pod-name>
```

You should see:

```
Payments Service Running 🚀
```

---

# 🚚 Install Shipping

```bash
helm install shipping-service myrepo/shipping
```

Check logs:

```bash
kubectl logs <shipping-pod-name>
```

You should see:

```
Shipping Service Running 🚚
```

---

# 🧼 Optional — Uninstall

```bash
helm uninstall payments-service
helm uninstall shipping-service
```

---

