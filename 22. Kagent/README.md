## 🤖 Kagent Installation on Kubernetes

This guide explains how to install **Kagent** in a Kubernetes cluster step by step.

Kagent is an AI-powered SRE / DevOps agent designed to run inside Kubernetes and help with:
- ⚙️ Operations  
- 📊 Observability  
- 🤖 Automation  

---

## 🔌 Supported AI Providers

This setup supports multiple AI backends:

- ✅ OpenAI  
- ✅ Google Gemini  
- ✅ Local Models (Ollama)  

---

## 🎥 Watch the Full Setup Video

👉 Click the thumbnail below to watch the complete step-by-step guide on YouTube:

[![Kagent Installation Guide](https://img.youtube.com/vi/QgauXUBdxCc/maxresdefault.jpg)](https://youtu.be/QgauXUBdxCc)

## 🎥 Watch the Full Demo

👉 Click the image below to watch on YouTube:

[![Kagent Installation Guide](https://img.youtube.com/vi/QgauXUBdxCc/maxresdefault.jpg)](https://youtu.be/QgauXUBdxCc)

# 📌 0. Prerequisites

You need:

* A working Kubernetes cluster (EKS, GKE, AKS, Minikube, etc.)
* `kubectl`
* `helm` (v3+)
* Internet access
* ⚠ If using local Ollama model:

  * Minimum 4GB RAM (use `tinyllama`)
  * 8GB+ recommended for larger models

Verify tools:

```bash
kubectl version --client
helm version
```

---

# 📁 1. Verify Cluster

```bash
kubectl get nodes
```

Make sure nodes are `Ready`.

---

# 📁 2. Create Namespace

```bash
kubectl create namespace kagent
```

---

# 📁 3. Install Kagent CRDs

```bash
helm install kagent-crds oci://ghcr.io/kagent-dev/kagent/helm/kagent-crds \
  --namespace kagent
```

Verify:

```bash
kubectl get crds | grep kagent
```

---

# 📁 4. Create Helm Values File

Create:

```bash
vim kagent-values.yaml
```

Paste this:

```yaml
providers:
  openAI:
    enabled: true   # Will work only if you add API key

  gemini:
    enabled: true   # Will work only if you add API key

  ollama:
    enabled: true
    baseUrl: http://ollama:11434

agents:
  helm:
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
  istio:
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
  k8s:
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
  kgateway:
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
  promql:
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
  observability:
    replicas: 2
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
```

Save and exit.

---

# 📁 5. Install Kagent

```bash
helm install kagent oci://ghcr.io/kagent-dev/kagent/helm/kagent \
  --namespace kagent \
  --values kagent-values.yaml
```

Verify:

```bash
kubectl get pods -n kagent
```

Wait until all pods are `Running`.
⚠️ Note: some time Pods may not be fully running yet since we're using a dummy OpenAI key. We'll configure Gemini next.


---

# 🔹 VERSION 1: OpenAI Configuration
# 🔹 6. Configure OpenAI

Create secret:

```bash
kubectl create secret generic kagent-openai \
  -n kagent \
  --from-literal=OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
```

Create file:

```bash
vim openai-model.yaml
```

```yaml
apiVersion: kagent.dev/v1alpha2
kind: ModelConfig
metadata:
  name: openai-model-config
  namespace: kagent
spec:
  apiKeySecret: kagent-openai
  apiKeySecretKey: OPENAI_API_KEY
  model: gpt-4o-mini
  provider: OpenAI
```

Apply:

```bash
kubectl apply -f openai-model.yaml
```

---
# 🔹 VERSION 2: Gemini Configuration
# 🔹 7. Configure Gemini

Create secret:

```bash
kubectl create secret generic kagent-gemini \
  -n kagent \
  --from-literal=GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
```

Create file:

```bash
vim gemini-model.yaml
```

```yaml
apiVersion: kagent.dev/v1alpha2
kind: ModelConfig
metadata:
  name: gemini-model-config
  namespace: kagent
spec:
  apiKeySecret: kagent-gemini
  apiKeySecretKey: GOOGLE_API_KEY
  model: gemini-2.5-flash
  provider: Gemini
```

Apply:

```bash
kubectl apply -f gemini-model.yaml
```

---
# 🔹 VERSION 3: Local Model (Ollama)
# 🔹 8. Install Ollama (Local Model)

## Step 1 – Deploy Ollama

```bash
vim ollama.yaml
```

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ollama-pvc
  namespace: kagent
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp2   # change if needed
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ollama
  namespace: kagent
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ollama
  template:
    metadata:
      labels:
        app: ollama
    spec:
      containers:
        - name: ollama
          image: ollama/ollama:latest
          ports:
            - containerPort: 11434
          volumeMounts:
            - name: ollama-data
              mountPath: /root/.ollama
      volumes:
        - name: ollama-data
          persistentVolumeClaim:
            claimName: ollama-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: ollama
  namespace: kagent
spec:
  selector:
    app: ollama
  ports:
    - port: 11434
      targetPort: 11434
  type: ClusterIP
```

Apply:

```bash
kubectl apply -f ollama.yaml
```

Wait:

```bash
kubectl get pods -n kagent
```

---

## Step 2 – Pull Model (Important)

For 4GB machines use:

```bash
kubectl exec -it -n kagent deploy/ollama -- ollama pull tinyllama
```

Verify:

```bash
kubectl exec -it -n kagent deploy/ollama -- ollama list
```

---
## Step 3 – Create Ollama ModelConfig

```bash
vim ollama-model.yaml
```

```yaml
apiVersion: kagent.dev/v1alpha2
kind: ModelConfig
metadata:
  name: ollama-model-config
  namespace: kagent
spec:
  model: tinyllama:latest
  provider: Ollama
  ollama: {}
```

Apply:

```bash
kubectl apply -f ollama-model.yaml
```

Restart controller:

```bash
kubectl rollout restart deployment kagent-controller -n kagent
```

---

# 📁 9. Access UI

# 📁 Access Kagent UI


### Option A: Using Port-Forward (Local Access)

Forward the Kagent service to your local machine:

```bash
kubectl port-forward -n kagent svc/kagent 8080:8080
```

Open your browser and navigate to:

```
http://localhost:8080
```

### Option B: Using LoadBalancer (Public Access - Cloud Only)

This works on EKS, GKE, AKS, or any cloud Kubernetes cluster.

Edit the Kagent UI service:

```bash
kubectl edit svc kagent-ui -n kagent
```

Change the service type from `ClusterIP` to `LoadBalancer`:

Find this:
```yaml
spec:
  type: ClusterIP
```
Change it to:
```yaml
spec:
  type: LoadBalancer
```

Save and exit. Wait for the external IP:

```bash
kubectl get svc kagent-ui -n kagent -w
```

Once you see an EXTERNAL-IP, access Kagent at:

```
http://<EXTERNAL-IP>
```


---

# 🎯 Final Result

You should now see:

* OpenAI (gpt-4o-mini)
* Gemini (gemini-2.5-flash)
* Ollama (tinyllama:latest)

All three models selectable.

---

# ⚠ Important Notes f

* If OpenAI shows 429 → your API quota is finished.
* If Ollama crashes → machine does not have enough RAM.
* For 4GB nodes → always use `tinyllama`
* For 8GB+ → you may try `phi3`

---

## 📁 Step 12 : NGINX application Deployment 
```less

Deploy an NGINX application in my Kubernetes cluster and give me a browser-accessible URL.

Requirements:
- Use the official nginx image
- Create a Deployment with 1 replica
- Expose the application using a NodePort service
- Use port 80
- After deployment, run kubectl commands to fetch the Node IP and NodePort
- Print the final access URL in this format:
  http://<NODE_IP>:<NODE_PORT>
- Make sure the URL is directly usable in a web browser

```
Example output you’ll get:
```bash
NGINX is accessible at:
http://192.168.49.2:32080
```
Get the access URL:

```bash
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
NODE_PORT=$(kubectl get svc nginx -o jsonpath='{.spec.ports[0].nodePort}')
echo "NGINX is accessible at: http://$NODE_IP:$NODE_PORT"
```
You can directly paste that link into your browser 🌐


---


# 🛠 Troubleshooting

Check controller logs:

```bash
kubectl logs -n kagent deploy/kagent-controller
```

Check Ollama:

```bash
kubectl exec -it -n kagent deploy/ollama -- ollama list
```

Test Ollama manually:

```bash
kubectl run debug --rm -it \
  --image=curlimages/curl \
  --namespace kagent \
  --restart=Never \
  --command -- sh
```

Inside:

```bash
curl -X POST http://ollama:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"tinyllama:latest","messages":[{"role":"user","content":"hello"}]}'
```

---

## 📁 Step 9: Uninstall Kagent


### 🔥 Step 1 — Delete Agents & ModelConfigs

```bash
kubectl delete agents --all -n kagent
kubectl delete modelconfigs --all -n kagent
```

### 🔥 Step 2 — Uninstall Kagent (Helm)

```bash
helm uninstall kagent -n kagent
```

Remove CRDs:

```bash
helm uninstall kagent-crds -n kagent
```

### 🔥 Step 3 — Delete Ollama (If Installed)

If you still have the original file:

```bash
kubectl delete -f ollama.yaml
```

If not, delete manually:

```bash
kubectl delete deployment ollama -n kagent
kubectl delete svc ollama -n kagent
kubectl delete pvc ollama-pvc -n kagent
```

### 🔥 Step 4 — Delete Namespace (Full Reset)

```bash
kubectl delete namespace kagent
```

Verify namespace removed:

```bash
kubectl get ns
```
### 🔥 Step 5 — Verify Everything Is Gone

```bash
kubectl get all -A | grep kagent
```

If nothing appears → cleanup successful ✅

### 🧹 Optional: Clean Persistent Volumes (Cloud Users)

Check for leftover volumes:

```bash
kubectl get pv
```

If needed:

```bash
kubectl delete pv <pv-name>
```

### 🚀 One-Command Full Reset (Safe Version)

```bash
helm uninstall kagent -n kagent || true
helm uninstall kagent-crds -n kagent || true
kubectl delete namespace kagent --ignore-not-found
```

---






