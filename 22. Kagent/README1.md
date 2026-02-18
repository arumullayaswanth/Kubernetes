

# 🚀 Kagent Installation Guide (Kubernetes)

This guide explains how to install **Kagent in Kubernetes** with support for:

* ✅ OpenAI
* ✅ Google Gemini
* ✅ Local Model (Ollama)

---

# 📌 Prerequisites

* Kubernetes cluster (Minikube, Kind, EKS, GKE, AKS)
* `kubectl`
* Helm v3+
* Internet access
* (Optional for local model) 4GB+ RAM node

Verify tools:

```bash
kubectl version --client
helm version
```

---

# 📁 Step 1: Verify Cluster

```bash
kubectl get nodes
```

---

# 📁 Step 2: Create Namespace

```bash
kubectl create namespace kagent
```

---

# 📁 Step 3: Install Kagent CRDs

```bash
helm install kagent-crds oci://ghcr.io/kagent-dev/kagent/helm/kagent-crds \
  --namespace kagent
```

Verify:

```bash
kubectl get crds | grep kagent
```

---

# 📁 Step 4: Create Helm Values File

```bash
vim kagent-values.yaml
```

Paste:

```yaml
providers:
  openAI:
    enabled: true
    apiKey: "dummy-key"

  gemini:
    enabled: false

  ollama:
    enabled: false

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

---

# 📁 Step 5: Install Kagent

```bash
helm install kagent oci://ghcr.io/kagent-dev/kagent/helm/kagent \
  --namespace kagent \
  --values kagent-values.yaml
```

Verify:

```bash
kubectl get pods -n kagent
```

---

# 🔹 VERSION 1: OpenAI Configuration

Create Secret:

```bash
kubectl create secret generic kagent-openai \
  -n kagent \
  --from-literal=OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
```

Create ModelConfig:

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
  # "gpt-4o-mini" is the correct ID for the cost-efficient model.
  # Use "gpt-4o" if you need higher reasoning capabilities.
  model: gpt-4o-mini
  provider: OpenAI
  openai: {} 


```

Apply:

```bash
kubectl apply -f openai-model.yaml
```
```bash
kubectl get secrets -n kagent
```
You’ll see:
```bash
kagent-openai
```

---

# 🔹 VERSION 2: Gemini Configuration

Create Secret:

```bash
kubectl create secret generic kagent-gemini \
  -n kagent \
  --from-literal=GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
```

Create ModelConfig:

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
  model: gemini-3-flash-preview
  provider: Gemini
  gemini: {}

```

Apply:

```bash
kubectl apply -f gemini-model.yaml
```

---

# 🔹 VERSION 3: Local Model (Ollama)

## Step 1: Deploy Ollama

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
  storageClassName: gp2
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

## Step 2: Pull Local Model

```bash
kubectl exec -it -n kagent deploy/ollama -- ollama pull phi3
```

Verify:

```bash
kubectl exec -it -n kagent deploy/ollama -- ollama list
```

---

## Step 3: Enable Ollama in Helm

```bash
helm upgrade kagent oci://ghcr.io/kagent-dev/kagent/helm/kagent \
  -n kagent \
  --reuse-values \
  --set providers.ollama.enabled=true \
  --set providers.ollama.baseUrl=http://ollama.kagent.svc.cluster.local:11434
```

Wait for restart:

```bash
kubectl get pods -n kagent
```

---

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


You will now see selectable models:

* GPT
* Gemini
* Ollama (phi3)

---

# 📁 Uninstall

```bash
helm uninstall kagent -n kagent
helm uninstall kagent-crds -n kagent
kubectl delete namespace kagent
kubectl create namespace kagent

```

---

# 🛠 Troubleshooting

Check logs:

```bash
kubectl logs -n kagent deploy/kagent-controller
```

Check model detection:

```bash
kubectl exec -it -n kagent deploy/ollama -- ollama list
```

---

# 🎉 Final Result

You now have a Kubernetes-native AI system supporting:

* ☁️ OpenAI
* ☁️ Gemini
* 🖥 Local LLM (Ollama)

Fully reproducible.
Helm-controlled.
GitHub-ready.
Production-safe.

---

If you want, I can now generate:

* 📄 Professional README.md version
* 📊 Architecture diagram section
* 🧠 Advanced GPU version
* 🚀 CI/CD deployment version

Tell me which level you want next.
