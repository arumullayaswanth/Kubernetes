

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
- `kubectl` installed and configured : for interacting with your cluster.
- Helm v3 installed : for installing the Kagent chart.
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
Helm
```bash
helm version
```
Expected output:

* Nodes should be in **Ready** state

---

## 📁 Step 2: Installing Kagent

Kagent is installed using Helm charts.

### Step 2.1: Install Kagent CRDs
CRDs are special Kubernetes definitions required by Kagent.
Run this command:
```bash
helm install kagent-crds oci://ghcr.io/kagent-dev/kagent/helm/kagent-crds \
--namespace kagent \
--create-namespace
```
✅ This will:
    - Create a namespace called kagent
    - Install required CRDs

Verify:
```bash
kubectl get crds | grep kagent
```
---

### Step 2.2: Set OpenAI API Key (Temporary)
Kagent expects an OpenAI key by default.
*Option A: If you have OpenAI key*
```bash
export OPENAI_API_KEY="your-openai-api-key"
```
*Option B: If you DON’T have OpenAI key*
Just use a dummy value (we will use Gemini later):
```bash
export OPENAI_API_KEY="dummy-key"
```
---
## 📁 Step 3: Install Kagent

Now install the main Kagent components.

```bash
helm install kagent oci://ghcr.io/kagent-dev/kagent/helm/kagent \
--namespace kagent \
--set providers.openAI.apiKey=$OPENAI_API_KEY
```
**Check pods:**
```bash
kubectl get pods -n kagent
```
⚠️ If you used a dummy key, some pods may not work yet.
That’s expected 👍

---
# 🤖 Using Gemini with Kagent
Now we will configure Gemini as our AI model.

## 📁 Step 4: Create Kubernetes Secret for Gemini
- First, get your Gemini API key from Google AI Studio.
- Now create a secret:
```bash
kubectl create secret generic kagent-gemini \
-n kagent \
--from-literal=GOOGLE_API_KEY="<YOUR_GEMINI_API_KEY>"
```
✅ This keeps your API key safe inside Kubernetes.

Verify:
```bash
kubectl get secret kagent-gemini -n kagent
```
---

## 📁 Step 5: Create Gemini ModelConfig
- Now we tell Kagent how to use Gemini.
- 📄 Create the file
```bash
vim gemini-model.yaml
```
- Paste the content into the file
```bash
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
- Apply it:
```bash
kubectl apply -f gemini-model.yaml
```
-🎉 Expected Output:
```bash
modelconfig.kagent.dev/gemini-model-config created
```
- Verify ModelConfig is created
```bash
kubectl get modelconfig -n kagent
```



## 📁 Step 6: Check All Pods
- Make sure everything is running:
```bash
kubectl get pods -n kagent
```
- ✅ All pods should be in Running state.
  
---

## 📁 Step 7: 🌐 Access Kagent UI
- Now let’s open the Kagent dashboard.
- Port-forward the service:
```bash
kubectl port-forward -n kagent svc/kagent 8080:8080
```
- Open browser:
```
http://localhost:8080
```
🎉 Boom!
You can now explore Kagent UI and interact with your Kubernetes cluster using Gemini AI.


## 📁 Step 8: Uninstall Kagent (Optional)

If you want to remove Kagent:

```bash
helm uninstall kagent -n kagent
```

Delete namespace:

```bash
kubectl delete namespace kagent
```

---

## 📁 Step 8: 🛠 Troubleshooting

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
## 📁 Step 9 : 🌐 Access Kagent UI via LoadBalancer
- Right now, we are using port-forward.
- That means 👉 “Only my laptop can see Kagent.”
- Using a LoadBalancer means 👉
- 🧑‍🤝‍🧑 “Anyone (with the IP) can open Kagent UI in the browser.”

| Kubernetes Type             | LoadBalancer Works Automatically? |
| --------------------------- | --------------------------------- |
| EKS / GKE / AKS             | ✅ YES                             |
| Cloud K8s (AWS, GCP, Azure) | ✅ YES                             |
| Minikube                    | ❌ NO (needs extra step)           |
| Kind                        | ❌ NO                              |

### Cloud Kubernetes (EKS / GKE / AKS)
- Step 9.1: Check Kagent UI Service
```bash
kubectl get svc -n kagent
```
- You’ll see something like:
```bash
kagent-ui   ClusterIP   10.96.x.x   <none>   80/TCP
```
- Step 9.2: Edit the Service
```bash
kubectl edit svc kagent-ui -n kagent
```
- Step 9.3: Change Service Type
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
Save and exit.

- Step 9.4: Wait for External IP
Run:
```bash
kubectl get svc kagent-ui -n kagent
```
After some time (1–3 mins):
```bash
NAME        TYPE           EXTERNAL-IP
kagent-ui   LoadBalancer   35.xxx.xxx.xxx
```

- Step 9.5: Access in Browser 🌍
Open:
```bash
http://<EXTERNAL-IP>
```
🎉 BOOM! Kagent UI is live publicly.

---

## 📁 Step 10 : NGINX application Deployment 
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
You can directly paste that link into your browser 🌐








