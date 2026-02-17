
* ✅ AWS EC2
* ✅ Kubernetes cluster
* ✅ kagent deployed
* ❌ External API quota issue
* 🎯 Now you want → **Fully Local LLM using Ollama**

This is the BEST decision. No 429 errors. No billing stress.

---

# 🏗️ Architecture We Will Build

```
Kubernetes (EKS or self-managed)
        │
        │
   kagent pods
        │
        │ (HTTP)
        ▼
   Ollama Server (inside cluster)
        │
        ▼
   Local Model (llama3 / mistral / phi3)
```

Everything runs inside your cluster 🚀

---

# 🚀 STEP 1 — Install Ollama Inside Kubernetes

We will deploy Ollama as a pod.

---

## 🟢 Create Ollama Deployment

Create file:

```bash
nano ollama-deployment.yaml
```

Paste this:

```yaml
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
          emptyDir: {}
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

## 🟢 Apply It

```bash
kubectl apply -f ollama-deployment.yaml
```

Check:

```bash
kubectl get pods -n kagent
```
- Wait 5 mins And then cheque it
Wait until:

```
ollama-xxxx    Running
```

- 🚀 If You Want To Check Image Pull Progress
Run:
```bash
kubectl describe pod ollama-6747f4c5f4-k7kbg | grep -A5 Events
```
If it changes to:
```bash
Pulled
Created
Started
```
Then it's done.


```bash
kubectl get pods
```
```
ollama-xxxx    Running
```


---

## STEP 4 — Test Internal Connection
- From kagent namespace:
```bash
kubectl exec -it -n kagent deploy/kagent-controller -- curl http://ollama:11434
```
- If it returns something → networking OK.

## STEP 5 — Restart kagent Controller
```bash
kubectl rollout restart deployment kagent-controller -n kagent
```
Wait until all pods Running again.

## Now Refresh UI

Go to kagent UI → Create Agent.

Now you should see:
```bash
Local / Ollama
```
---
---

# Leave it everything This is everything Backup plan


# 🚀 STEP 1 — Test Ollama From Cluster

Run:

```bash
kubectl exec -it deploy/ollama -- ollama run phi3
```

Type:

```
hello
```

If it responds → ✅ Ollama working


# 🚀 STEP 2 — Configure kagent To Use Ollama

Now we must tell kagent:

❌ Don’t use OpenAI
❌ Don’t use Gemini
✅ Use Ollama

---

## 🔎 Find kagent config

Check:

```bash
kubectl get configmap
kubectl get secrets
```

Look for something like:

```
kagent-config
```

## 🟢 Update Environment Variables

Edit kagent deployment:

```bash
kubectl edit deployment my-first-k8s-agent
```

Inside container section, add:

```yaml
env:
  - name: MODEL_PROVIDER
    value: "ollama"
  - name: OLLAMA_BASE_URL
    value: "http://ollama:11434"
  - name: OLLAMA_MODEL
    value: "phi3"
```

Save and exit.


# 🚀 STEP 3 — Restart kagent

```bash
kubectl rollout restart deployment my-first-k8s-agent
```

Check logs:

```bash
kubectl logs -f deploy/my-first-k8s-agent
```

If no more 429 errors → SUCCESS 🎉

---

