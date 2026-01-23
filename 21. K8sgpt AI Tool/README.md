https://platform.openai.com/docs/overview
https://platform.openai.com/settings/organization/api-keys

# K8sGPT End-to-End Command Guide

This document provides a complete end-to-end workflow for installing, configuring, and using K8sGPT to analyze Kubernetes cluster errors.

---

## 1. Prerequisites

- Kubernetes cluster (minikube, kind, EKS, AKS, GKE, etc.)
- kubectl installed and configured
- Helm (optional but recommended)
- Internet access for AI backend

---

## 2. Install K8sGPT

### Option A: Using Brew (Mac/Linux)
```bash
brew tap k8sgpt-ai/k8sgpt
brew install k8sgpt
````

### Option B: Using Binary (Linux)

```bash
curl -LO https://github.com/k8sgpt-ai/k8sgpt/releases/latest/download/k8sgpt_Linux_x86_64.tar.gz
tar -xvf k8sgpt_Linux_x86_64.tar.gz
sudo mv k8sgpt /usr/local/bin/
```

### Verify Installation

```bash
k8sgpt version
```

---

## 3. Install K8sGPT Operator (Optional but Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

```bash
helm repo add k8sgpt https://charts.k8sgpt.ai
helm repo update

helm install k8sgpt-operator k8sgpt/k8sgpt-operator \
  --namespace k8sgpt \
  --create-namespace
```

---

## 4. Configure AI Backend

### List Available Backends

```bash
k8sgpt auth list
```

#### Step 1 — Remove Existing OpenAI Backend
```bash
k8sgpt auth remove -b openai
```
#### Step 2 — Add OpenAI Again (Interactive)
```bash
k8sgpt auth add -b openai
```
It will prompt:
```bash
Enter OpenAI API Key:
```
➡️ Paste your real OpenAI key (sk-...)

#### Step 3 — Verify
```bash
k8sgpt auth list
```
#### Step 4 — Test
```bash
k8sgpt analyze --explain
```
---

## 5. Deploy Error Test Manifests

```bash
kubectl apply -f imagepull-error.yaml
kubectl apply -f configmap-missing.yaml
kubectl apply -f secret-missing.yaml
kubectl apply -f invalid-resources.yaml
kubectl apply -f crashloop.yaml
kubectl apply -f pvc-missing.yaml
kubectl apply -f service-selector-error.yaml
```

---

## 6. Run K8sGPT Analysis

### Basic Analysis

```bash
k8sgpt analyze
```

### With AI Explanation

```bash
k8sgpt analyze --explain
```

### Specify Backend

```bash
k8sgpt analyze --backend openai
```

---

## 7. Filter by Resource Type

```bash
k8sgpt analyze --filter Pod
k8sgpt analyze --filter Service
k8sgpt analyze --filter Deployment
```

---

## 8. Show Only Critical Issues

```bash
k8sgpt analyze --severity Critical
```

---

## 9. Export Results (for Reports)

```bash
k8sgpt analyze --output json > k8sgpt-report.json
k8sgpt analyze --output yaml > k8sgpt-report.yaml
```

---

## 10. Fix Issues (Manual + Guided by K8sGPT)

Examples:

### Fix ImagePullBackOff

```bash
kubectl edit pod imagepull-error-pod
# Change image to nginx:latest
```

### Create Missing ConfigMap

```bash
kubectl create configmap missing-configmap --from-literal=key=value
```

### Create Missing Secret

```bash
kubectl create secret generic missing-secret --from-literal=password=admin123
```

### Create Missing PVC

```bash
kubectl apply -f pvc.yaml
```

---

## 11. Re-Run Analysis After Fix

```bash
k8sgpt analyze
```

---

## 12. Cleanup Test Resources

```bash
kubectl delete pod imagepull-error-pod
kubectl delete pod configmap-missing-pod
kubectl delete pod secret-missing-pod
kubectl delete pod invalid-resources-pod
kubectl delete pod crashloop-pod
kubectl delete pod pvc-missing-pod
kubectl delete service bad-service
```
---

## 14. Useful Commands Cheat Sheet

```bash
k8sgpt version
k8sgpt analyze
k8sgpt analyze --explain
k8sgpt analyze --filter Pod
k8sgpt auth list
k8sgpt auth default openai
```

---

## End of Guide

```

---

If you want, I can also generate:  
✅ A **PDF version**  
✅ A **README.md for GitHub repo**  
✅ A **YouTube voice-over script** for this K8sGPT demo  
✅ A **hands-on lab style workshop document**
```
