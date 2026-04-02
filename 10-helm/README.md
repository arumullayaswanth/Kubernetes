## 🛒 Kubernetes Helm Project (E-Commerce Deployment)

📌 In this video, you will learn:
- How to use Helm in Kubernetes  
- Deploy a real-world E-commerce application  
- Manage applications with Helm charts  

👉 Click the thumbnail below to watch the full video on YouTube:

[![Kubernetes Helm E-Commerce Project](https://img.youtube.com/vi/3bLc4y3AVTY/0.jpg)](https://youtu.be/3bLc4y3AVTY)

# 🌈 END-TO-END HELM PROJECT

### *Cart & Checkout Services → GitHub Helm Repo → Kubernetes*

---

## 🧠 STORY (Very Important – Read Once)

* ☁️ **AWS** = Big playground
* 🖥️ **EC2** = Computer inside playground
* 🐳 **Docker** = Container engine
* ☸️ **Minikube** = Kubernetes cluster
* 🎩 **Helm** = App package manager
* 🛒 **Cart** = Microservice 1
* 💳 **Checkout** = Microservice 2
* 🏪 **Helm repo** = Store for charts
* 🌍 **GitHub Pages / S3** = Hosting store online
---



![Image](https://docs.aws.amazon.com/images/prescriptive-guidance/latest/patterns/images/pattern-img/1dbd3db8-5819-4f30-bebd-a144a2075fcd/images/55652eb2-2e11-4b14-9ed4-0cdcf55cc3e6.png)




We will:

1. Create AWS server
2. Install Kubernetes
3. Create Helm charts
4. Put Helm repo on AWS S3 or github actions
5. Install Cart & Checkout from Helm repo

---

## 🪜 Step p-1 : Install Docker

```bash
sudo apt update
sudo apt install docker.io -y
sudo usermod -aG docker ubuntu
newgrp docker
```

## 🪜 Step p-2: Install Minikube

```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

Start Kubernetes:

```bash
minikube start --driver=docker
```
Use Minikube’s built-in kubectl:

```bash
minikube kubectl -- get nodes
```
If that works, you can create an alias so you don’t have to type that long command every time:
```bash
echo 'alias kubectl="minikube kubectl --"' >> ~/.bashrc
source ~/.bashrc
```
Check:

```bash
kubectl get nodes
```

✅ Kubernetes running!


## 🪜 Step p-3: Install Helm

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

Check:

```bash
helm version
```



# ✅ STEP 0: CHECK EVERYTHING IS READY

Open terminal and type:

```bash
helm version
kubectl version --client
kubectl get nodes
```

If nodes are **Ready** → ✅
If not → stop and start cluster (minikube / EKS)

---

# 🧸 STEP 1: CREATE MAIN FOLDER

```bash
mkdir ecommerce-helm
cd ecommerce-helm
```

This is your **project box** 📦

---

# 🧺 STEP 2: CREATE CART HELM CHART

```bash
helm create cart
```
🎉 Helm made many files for you automatically.

Helm created files for you 🧠

### 🧩 STEP 2.1: CART DEPLOYMENT (Tell Cart HOW to Run)

```bash
vim cart/templates/deployment.yaml
```


Find **containers:** section
and **Replace only this part** 👇

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-cart
  labels:
    app.kubernetes.io/name: cart
    app.kubernetes.io/instance: {{ .Release.Name }}
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: cart
      app.kubernetes.io/instance: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: cart
        app.kubernetes.io/instance: {{ .Release.Name }}
    spec:
      containers:
        - name: cart
          image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
          command: ["sh", "-c", "echo {{ .Values.appMessage }}; sleep 3600"]
          imagePullPolicy: {{ .Values.image.pullPolicy }}

```

Save & exit

### ✏️ STEP 2.2: CART VALUES (WHAT TO RUN)

```bash
vim cart/values.yaml
```

Delete everything ❌
Paste this ✅

```yaml
replicaCount: 1

image:
  repository: busybox
  tag: latest
  pullPolicy: IfNotPresent

appMessage: "Cart Service Running 🛒"

serviceAccount:
  create: true
  automount: true
  annotations: {}
  name: ""

podAnnotations: {}
podLabels: {}

podSecurityContext: {}
securityContext: {}

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: false

httpRoute:
  enabled: false

resources: {}

autoscaling:
  enabled: false

volumes: []
volumeMounts: []

nodeSelector: {}
tolerations: []
affinity: {}
```
esc → :wq → Enter
🧠 This means:

“Run a tiny BusyBox and keep saying Cart Service Running”

### STEP 2.3: Identity of chart. Contains name, version, appVersion.
```bash
vim Chart.yaml
```
- You will see in this file Description, Appversion, Name

---
# 💳 STEP 3: CREATE CHECKOUT HELM CHART (Same top, Different Name )

```bash
helm create checkout
cd checkout
```

### ✏️ STEP 3.1: Configure Checkout Service

```bash
vim checkout/values.yaml
```

Delete everything ❌
Paste 👇

```yaml
replicaCount: 1

image:
  repository: busybox
  tag: latest
  pullPolicy: IfNotPresent

appMessage: "Checkout Service Running 💳"

serviceAccount:
  create: true
  automount: true
  annotations: {}
  name: ""

podAnnotations: {}
podLabels: {}

podSecurityContext: {}
securityContext: {}

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: false

httpRoute:
  enabled: false

resources: {}

autoscaling:
  enabled: false

volumes: []
volumeMounts: []

nodeSelector: {}
tolerations: []
affinity: {}
```

Save & exit

### 🧩 STEP 3.2: CHECKOUT DEPLOYMENT 

```bash
vim checkout/templates/deployment.yaml
```

Replace **containers** section with:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-checkout
  labels:
    app.kubernetes.io/name: checkout
    app.kubernetes.io/instance: {{ .Release.Name }}
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: checkout
      app.kubernetes.io/instance: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: checkout
        app.kubernetes.io/instance: {{ .Release.Name }}
    spec:
      containers:
        - name: checkout
          image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
          command: ["sh", "-c", "echo {{ .Values.appMessage }}; sleep 3600"]
          imagePullPolicy: {{ .Values.image.pullPolicy }}

```

Save & exit

### STEP 3.4: Identity of chart. Contains name, version, appVersion.
```bash
vim Chart.yaml
```
- You will see in this file Description, Appversion, Name

---

# 📦 STEP 4: Package Charts
Go back to main folder:
```bash
cd ../../
```
```bash
helm package cart
helm package checkout
```

You will see:

```
cart-0.1.0.tgz
checkout-0.1.0.tgz
```

🎁 Boxes created

---

# 🏪 STEP 5: Create Helm Repo Index

```bash
helm repo index .
```
```bash
ls
```
Now folder looks like:

```
ecommerce-helm/
├── cart/
├── checkout/
├── cart-0.1.0.tgz
├── checkout-0.1.0.tgz
└── index.yaml
```

THIS = Helm Repo 🏪

---

# 🌍 STEP 6: HOST HELM REPO ON GitHub    (Part-1)

---

## 🔹 Step 6.1: Create GitHub Repo

* Name: `ecommerce-helm-repo`
* Public ✅
* No README ❌

---

## 🔹 Step 6.2: Push Files to GitHub

```bash
git init
git add .
git commit -m "Helm repo for cart and checkout"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ecommerce-helm-repo.git
git push -u origin main
```

---

## 🔹 Step 6.3: Enable GitHub Pages

1. Repo → **Settings**
2. **Pages**
3. Source:

   * Branch: `main`
   * Folder: `/ (root)`
4. Save

You get URL 👇

```
https://YOUR_USERNAME.github.io/ecommerce-helm-repo/
```

🏪 Your Helm shop is LIVE

---

# 🚀 STEP 11: USE THE HELM REPO  

---

## ➕ Step 11.1: Add Helm Repo

```bash
helm repo add ecommerce https://arumullayaswanth.github.io/ecommerce-helm-repo/
helm repo update
```

---

## 🔍 Step 11.2: Check Repo

```bash
helm search repo ecommerce
```

You see:

```
ecommerce/cart
ecommerce/checkout
```

---

# ☸️ STEP 12: DEPLOY TO KUBERNETES (Create Cart & Checkout in Kubernetes)

```bash
helm install cart ecommerce/cart
helm install checkout ecommerce/checkout
```

---

# 👀 STEP 13: VERIFY EVERYTHING

```bash
kubectl get pods
```

Output:

```
cart-xxxxx      Running
checkout-xxxxx  Running
```
```bash
kubectl get svc
```

---

## 👂 Logs

```bash
kubectl logs -l app.kubernetes.io/name=cart
```

```bash
kubectl logs -l app.kubernetes.io/name=checkout
```

---
## Want to Access From Browser?
Since you're using Minikube on EC2, do this:
Option 1: Port Forward
```bash
kubectl port-forward svc/cart 8080:80
```
Now open in browser:
```bash
http://EC2-PUBLIC-IP:8080
```


# 🏆 FINAL RESULT

✅ Helm charts created
✅ Helm repo built
✅ Hosted on GitHub
✅ Pulled via Helm
✅ Deployed on Kubernetes

---

# 🎤 INTERVIEW ONE-LINE ANSWER

> “I created Helm charts for cart and checkout microservices, packaged them into a Helm repository, hosted the repository on GitHub Pages, added it to Helm, and deployed both services to Kubernetes.”

---


---
---
---


# 🔹 Step-10: HOST HELM REPO ON AWS S3  (Part-01)

---

## 🪜 Step 10.1: Create S3 Bucket

Go to AWS → S3 → Create bucket

* Name: `ecommerce-helm-repo-123`
* Public access: ❌ BLOCK OFF
* Enable static website hosting

Enable **public read** for files

S3 Website URL will look like:

```
http://ecommerce-helm-repo-123.s3-website-region.amazonaws.com
```

🏪 Helm shop ready!


## 🪜 Step 10.2: Create a Folder to Host Helm Repo

Now we make a special folder for the Helm shop 🏪
```bash
mkdir ~/helm-repo
```
Copy Helm files into it: 
```bash
cp cart-0.1.0.tgz checkout-0.1.0.tgz index.yaml ~/helm-repo/
```
Go inside:

```bash
cd ~/helm-repo
```
Check again:
```bash
ls
```
Output:
```diff
cart-0.1.0.tgz
checkout-0.1.0.tgz
index.yaml
```


---

# update HELM git rep


### 📦 STEP 4 — PACKAGE AGAIN (IMPORTANT)

Go to main folder:

```bash
cd ~/ecommerce-helm
```

Re-package charts:

```bash
helm package cart
helm package checkout
```

Re-create index:

```bash
helm repo index .
```

---

### 🚀 STEP 5 — UPDATE HELM REPO

Push updated files to GitHub:

```bash
git add .
git commit -m "Fix service.port nil pointer error"
git push
```

Wait 30 seconds for GitHub Pages to refresh.

---

# 🔄 STEP 6 — UPDATE LOCAL HELM REPO CACHE

On EC2:

```bash
helm repo update
```

---

# 🚀 STEP 7 — INSTALL AGAIN

If old release exists:

```bash
helm uninstall cart
helm uninstall checkout
```

Now install fresh:

```bash
helm install cart ecommerce/cart
helm install checkout ecommerce/checkout
```

---

