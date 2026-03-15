

# Kubernetes RBAC Hands-On Lab

# ClusterRole + ClusterRoleBinding

# Architecture Flow

Explain like this to viewers.

```
ServiceAccount
      │
      │
ClusterRoleBinding
      │
      │
ClusterRole
      │
Permissions
(list pods, get nodes)
      │
Cluster resources
```

This allows **cluster-wide access**.

---

# Step 1 — Check Cluster

First confirm Kubernetes is working.

```bash
kubectl cluster-info
```

Check nodes:

```bash
kubectl get nodes
```

Example output:

```
NAME       STATUS   ROLES           AGE
minikube   Ready    control-plane   3d
```

---

# Step 2 — Create Test Namespaces

We create two namespaces to show **cluster-wide access**.

```bash
kubectl create namespace team-a
kubectl create namespace team-b
```

Verify:

```bash
kubectl get ns
```

Expected:

```
team-a
team-b
default
kube-system
```

---

# Step 3 — Deploy Test Applications

Create pods in both namespaces.

### Deployment in team-a

```bash
kubectl create deployment nginx \
--image=nginx \
-n team-a
```

---

### Deployment in team-b

```bash
kubectl create deployment apache \
--image=httpd \
-n team-b
```

Verify pods:

```bash
kubectl get pods -A
```

You should see pods in **multiple namespaces**.

---

# Step 4 — Create Service Account


```bash
kubectl create serviceaccount cluster-viewer
```

Check:

```bash
kubectl get sa
```

Expected:

```
cluster-viewer
```

---

# Step 5 — Create ClusterRole

```
vim clusterrole-pod-viewer.yaml
```

Content:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pod-node-viewer
rules:
- apiGroups: [""]
  resources: ["pods","nodes"]
  verbs: ["get","list","watch"]
```

---

# Step 6 — Apply ClusterRole

```bash
kubectl apply -f clusterrole-pod-viewer.yaml
```

Verify:

```bash
kubectl get clusterroles
```

You should see:

```
pod-node-viewer
```

---

# Step 7 — Create ClusterRoleBinding

```
vim clusterrolebinding-viewer.yaml
```

Content:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-viewer-binding
subjects:
- kind: ServiceAccount
  name: cluster-viewer
  namespace: default
roleRef:
  kind: ClusterRole
  name: pod-node-viewer
  apiGroup: rbac.authorization.k8s.io
```

---

# Step 8 — Apply ClusterRoleBinding

```bash
kubectl apply -f clusterrolebinding-viewer.yaml
```

Verify:

```bash
kubectl get clusterrolebindings
```

Expected:

```
cluster-viewer-binding
```

---

# Step 9 — Test Permissions

---

## Test 1 — Can view pods everywhere

```bash
kubectl auth can-i list pods \
--as system:serviceaccount:default:cluster-viewer \
--all-namespaces
```

Expected:

```
yes
```

---

## Test 2 — Can view nodes

```bash
kubectl auth can-i get nodes \
--as system:serviceaccount:default:cluster-viewer
```

Expected:

```
yes
```

---

## Test 3 — Try deleting pods

```bash
kubectl auth can-i delete pods \
--as system:serviceaccount:default:cluster-viewer
```

Expected:

```
no
```

That proves RBAC is working.

---

# Step 10 — Show Resources

For your video show these commands.

### ClusterRoles

```bash
kubectl get clusterroles
```

---

### ClusterRoleBindings

```bash
kubectl get clusterrolebindings
```

---

### Pods in all namespaces

```bash
kubectl get pods -A
```

---



