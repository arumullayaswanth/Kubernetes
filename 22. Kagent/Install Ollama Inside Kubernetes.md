
# ❌ External API Quota Issue

# 🎯 Solution → Fully Local LLM using Ollama

If you see errors like:

```
429 - insufficient_quota
```

That means:

* OpenAI quota finished
* Billing issue
* API limits reached

Instead of depending on external APIs…

👉 We switch to **Fully Local LLM using Ollama**

### Why This Is Better

* ✅ No 429 errors
* ✅ No billing stress
* ✅ No internet dependency
* ✅ Fully private
* ✅ Runs inside your cluster

---

# 🏗️ Architecture We Will Build

```
Kubernetes (EKS / Minikube / etc.)
        │
        │
   kagent pods
        │
        │  (HTTP)
        ▼
   Ollama Service (ClusterIP)
        │
        ▼
   Local Model (tinyllama / phi3)
```

Everything runs inside your Kubernetes cluster 🚀

---

# 🚀 STEP 1 — Deploy Ollama Inside Kubernetes

We deploy Ollama as a normal Kubernetes deployment.

---

## 🟢 Create Ollama Deployment

Create file:

```bash
vim ollama.yaml
```

Paste:

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

Save and exit.

---

## 🟢 Apply Ollama

```bash
kubectl apply -f ollama.yaml
```

Watch PVC:

```bash
kubectl get pvc -n kagent -w
```

It should change:

```
Pending → Bound
```

Check pod:

```bash
kubectl get pods -n kagent
```

Wait until:

```
ollama-xxxx   Running
```

---

# 🚀 STEP 2 — Pull Model (Very Important)

⚠ If your instance has 4GB RAM → use tinyllama
⚠ If your instance has 8GB+ RAM → you can use phi3

### Recommended for Students (4GB):

```bash
kubectl exec -it -n kagent deploy/ollama -- ollama pull tinyllama
```

Verify:

```bash
kubectl exec -it -n kagent deploy/ollama -- ollama list
```

You should see:

```
tinyllama:latest
```

---

# 🚀 STEP 3 — Test Ollama From Inside Cluster

Run debug pod:

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

If you see streaming JSON → Ollama is working ✅

Exit debug pod.

---

# 🚀 STEP 4 — Create Ollama ModelConfig (Correct Way)

⚠ Do NOT edit deployment manually
⚠ Do NOT set environment variables manually

We use ModelConfig.

Create file:

```bash
vim ollama-model.yaml
```

Paste:

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

# 🚀 STEP 5 — (Optional) Disable External Providers

If you want fully local mode only:

```bash
helm upgrade kagent oci://ghcr.io/kagent-dev/kagent/helm/kagent \
  -n kagent \
  --reuse-values \
  --set providers.openAI.enabled=false \
  --set providers.gemini.enabled=false
```

Restart controller again:

```bash
kubectl rollout restart deployment kagent-controller -n kagent
```

---

# 🚀 STEP 6 — Use Ollama in UI

Open UI.

Create or edit agent.

Select:

```
Ollama (tinyllama:latest)
```

Now test:

```
hi
```

It should respond normally.

No 429 errors.
No external API calls.

Fully local.

---

# 🛟 Backup Plan — If Something Fails

## Check Ollama Logs

```bash
kubectl logs -n kagent deploy/ollama
```

## Check Controller Logs

```bash
kubectl logs -n kagent deploy/kagent-controller
```

## Check Model Loaded

```bash
kubectl exec -it -n kagent deploy/ollama -- ollama list
```

---

# ⚠ Common Errors & Fixes

### Error:

```
llama runner process no longer running
```

Cause:

* Not enough RAM

Fix:

* Use tinyllama
* Or upgrade instance to 8GB+

---

### Error:

```
Ollama_chatException - /api/chat
```

Fix:

* Ensure Helm baseUrl is:

```
http://ollama:11434
```

* Restart controller

---
