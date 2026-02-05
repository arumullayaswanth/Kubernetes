
# 🌈 END-TO-END HELM PROJECT

### *Cart & Checkout Services → GitHub Helm Repo → Kubernetes*

---

## 🧠 STORY (Very Important – Read Once)

* ☁️ **AWS** = Big playground
* 🖥️ **EC2** = Computer inside playground
* 🧺 **Cart** = one small app
* 💳 **Checkout** = another small app
* 📦 **Helm chart** = instruction box to run app
* 🏪 **Helm repo** = place where boxes live
* 🌍 **GitHub Pages** = internet shop
* ☸️ **Kubernetes** = playground where apps run

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

#### Now delete useless test stuff (to keep it clean):

```bash
rm -rf cart/templates/tests
```

Helm created files for you 🧠

---

## ✏️ STEP 3: CART VALUES (WHAT TO RUN)

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

command:
  - sh
  - -c
  - "while true; do echo Cart Service Running; sleep 5; done"

service:
  type: ClusterIP
  port: 80
```
esc → :wq → Enter
🧠 This means:

“Run a tiny BusyBox and keep saying Cart Service Running”

---

## 🧩 STEP 4: CART DEPLOYMENT (Tell Cart HOW to Run)

```bash
nano cart/templates/deployment.yaml
```

Find **containers:** section
and **Replace only this part** 👇

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "cart.fullname" . }}
  labels:
    app.kubernetes.io/name: {{ include "cart.name" . }}
    app.kubernetes.io/instance: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app.kubernetes.io/name: {{ include "cart.name" . }}
      app.kubernetes.io/instance: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: {{ include "cart.name" . }}
        app.kubernetes.io/instance: {{ .Release.Name }}
    spec:
      containers:
        - name: cart
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          command: {{ .Values.command }}

```

Save & exit

---

# 💳 STEP 5: CREATE CHECKOUT HELM CHART (Same top, Different Name )

```bash
helm create checkout
rm -rf checkout/templates/tests
```

---

## ✏️ STEP 6: CHECKOUT VALUES (Tell Checkout What to Do)

```bash
nano checkout/values.yaml
```

Delete everything ❌
Paste 👇

```yaml
replicaCount: 1

image:
  repository: busybox
  tag: latest
  pullPolicy: IfNotPresent

command:
  - sh
  - -c
  - "while true; do echo Checkout Service Running; sleep 5; done"

service:
  type: ClusterIP
  port: 80
```

Save & exit

---

## 🧩 STEP 7: CHECKOUT DEPLOYMENT (Tell Checkout HOW to Run)

```bash
nano checkout/templates/deployment.yaml
```

Replace **containers** section with:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "checkout.fullname" . }}
  labels:
    app.kubernetes.io/name: {{ include "checkout.name" . }}
    app.kubernetes.io/instance: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app.kubernetes.io/name: {{ include "checkout.name" . }}
      app.kubernetes.io/instance: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: {{ include "checkout.name" . }}
        app.kubernetes.io/instance: {{ .Release.Name }}
    spec:
      containers:
        - name: checkout
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          command: {{ .Values.command }}

```

Save & exit

---

# 📦 STEP 8: PACKAGE BOTH HELM CHARTS

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

# 🏪 STEP 9: CREATE HELM REPOSITORY FILE

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

# 🌍 STEP 10: HOST HELM REPO ON GitHub    (Part-1)

---

## 🔹 Step 10.1: Create GitHub Repo

* Name: `ecommerce-helm-repo`
* Public ✅
* No README ❌

---

## 🔹 Step 10.2: Push Files to GitHub

```bash
git init
git add .
git commit -m "Helm repo for cart and checkout"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ecommerce-helm-repo.git
git push -u origin main
```

---

## 🔹 Step 10.3: Enable GitHub Pages

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

---

## 👂 Logs

```bash
kubectl logs -l app.kubernetes.io/name=cart
```

```bash
kubectl logs -l app.kubernetes.io/name=checkout
```

---

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
