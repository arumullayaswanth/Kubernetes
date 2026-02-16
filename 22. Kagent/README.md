# 🚀 Kagent Installation Guide (Kubernetes)

This guide explains **how to install Kagent in a Kubernetes cluster step by step**.  
Kagent is an AI-powered SRE / DevOps agent designed to run inside Kubernetes and help with operations, observability, and automation.

## 📌 Prerequisites

Before starting, ensure you have:

- A running Kubernetes cluster (Minikube, Kind, EKS, GKE, or AKS)
- `kubectl` installed and configured
- Helm v3 installed
- Internet access from the cluster

Verify tools:

```bash
kubectl version --client
helm version
```
--- 

## 📁 Step 1: Verify Kubernetes Cluster

Check if your cluster is running:

```bash
kubectl get nodes
```
---

## 📁 Step 2: Create Kagent Namespace

```bash
kubectl create namespace kagent
```

Verify:

```bash
kubectl get ns
```
---
## 📁 Step 3: Install Kagent CRDs

Install the Custom Resource Definitions required by Kagent:

```bash
helm install kagent-crds oci://ghcr.io/kagent-dev/kagent/helm/kagent-crds \
  --namespace kagent
```

Verify CRDs are installed:

```bash
kubectl get crds | grep kagent
```
## 📁 Step 4: Create kagent-values.yaml File

Create the Helm values configuration file:

```bash
vim kagent-values.yaml
```
- Kagent expects an OpenAI key by default.
- Set OpenAI API Key (Temporary)
- If you DON’T have OpenAI key
- Just use a dummy value (we will use Gemini later)

Paste the following content into the file:

```yaml
providers:
  openAI:
    apiKey: "dummy-key"

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

Save and exit (`:wq` in vim).

---

## 📁 Step 5: Install Kagent with Values File

Install Kagent using the values file you just created:

```bash
helm install kagent oci://ghcr.io/kagent-dev/kagent/helm/kagent \
  --namespace kagent \
  --values kagent-values.yaml
```

Check the installation:

```bash
kubectl get pods -n kagent
```

⚠️ Note: Pods may not be fully running yet since we're using a dummy OpenAI key. We'll configure Gemini next.

---



## 📁 Step 6: Configure Gemini AI

### Step 6.1: Create Gemini API Secret

Replace `YOUR_GEMINI_API_KEY` with your actual Gemini API key from Google AI Studio:

```bash
kubectl create secret generic kagent-gemini \
  -n kagent \
  --from-literal=GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
```

Verify the secret:

```bash
kubectl get secret kagent-gemini -n kagent
```

### Step 6.2: Create Gemini ModelConfig

Create the ModelConfig file:

```bash
vim gemini-model.yaml
```

Paste the following content:

```yaml
apiVersion: kagent.dev/v1alpha2
kind: ModelConfig
metadata:
  name: gemini-model-config
  namespace: kagent
spec:
  apiKeySecret: kagent-gemini
  apiKeySecretKey: GOOGLE_API_KEY
  model: gemini-2.5-pro
  provider: Gemini
  gemini: {}
```

Save and exit, then apply:

```bash
kubectl apply -f gemini-model.yaml
```

Verify ModelConfig:

```bash
kubectl get modelconfig -n kagent
```

---
## 📁 Step 7: Verify All Pods are Running


Check that all Kagent pods are running:

```bash
kubectl get pods -n kagent
```

✅ All pods should be in `Running` state.

If any pods are not running, check their logs:

```bash
kubectl logs <pod-name> -n kagent
kubectl describe pod <pod-name> -n kagent
```

---

## 📁 Step 7: Access Kagent UI

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

## 📁 Step 9: Uninstall Kagent (Optional)

If you need to remove Kagent:

```bash
helm uninstall kagent -n kagent
helm uninstall kagent-crds -n kagent
kubectl delete namespace kagent
```

Clean up the values file:

```bash
rm kagent-values.yaml gemini-model.yaml
```

---

## 🛠 Troubleshooting

### Pods not running

```bash
kubectl describe pod <pod-name> -n kagent
kubectl logs <pod-name> -n kagent
```






