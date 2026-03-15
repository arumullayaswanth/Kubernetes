
# Kubernetes RBAC Hands-On Lab


# Step 1 — Start Your Kubernetes Cluster

Make sure your cluster is running.

You can use:

* Minikube
* Kind
* EKS
* AKS
* GKE

Check cluster:

```bash
kubectl cluster-info
```

Check nodes:

```bash
kubectl get nodes
```

Expected output:

```
NAME           STATUS   ROLES           AGE
minikube       Ready    control-plane   2d
```


# Step 0 — Visualize the Flow

What we created:

```
ServiceAccount
      │
      │
RoleBinding
      │
      │
Role
      │
Permissions
(get pods, list pods)
```

RBAC allows only **specific actions**.

---

# Step 2 — Create a Namespace

We will create a namespace called **dev-team**.

```bash
kubectl create namespace dev-team
```

Verify:

```bash
kubectl get namespaces
```

Expected output:

```
dev-team
default
kube-system
```
---

# Step 3 — Create a Sample Deployment

We need some pods to test RBAC.

Run:

```bash
kubectl create deployment nginx \
--image=nginx \
--namespace=dev-team
```

Check pods:

```bash
kubectl get pods -n dev-team
```

Expected output:

```
nginx-xxxxx
```

---

# Step 4 — Create a Role


```
vim role-pod-reader.yaml
```

Content:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: dev-team
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
```
---

Apply it:

```bash
kubectl apply -f role-pod-reader.yaml
```

Verify:

```bash
kubectl get roles -n dev-team
```

Expected:

```
pod-reader
```

---

# Step 5 — Create a ServiceAccount


```bash
kubectl create serviceaccount dev-user -n dev-team
```

Verify:

```bash
kubectl get serviceaccounts -n dev-team
```

Expected:

```
dev-user
```

---

# Step 6 — Create RoleBinding


```
vim rolebinding-dev.yaml
```

Content:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-user-binding
  namespace: dev-team
subjects:
- kind: ServiceAccount
  name: dev-user
  namespace: dev-team
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

---

Apply:

```bash
kubectl apply -f rolebinding-dev.yaml
```

Verify:

```bash
kubectl get rolebindings -n dev-team
```

Expected:

```
dev-user-binding
```

---

# Step 7 — Test RBAC Permissions


Use:

```bash
kubectl auth can-i
```

---

### Test 1 — Can read pods

```bash
kubectl auth can-i get pods \
--as system:serviceaccount:dev-team:dev-user \
-n dev-team
```

Expected output:

```
yes
```

---

### Test 2 — Can list pods

```bash
kubectl auth can-i list pods \
--as system:serviceaccount:dev-team:dev-user \
-n dev-team
```

Expected:

```
yes
```

---

### Test 3 — Can delete pods

```bash
kubectl auth can-i delete pods \
--as system:serviceaccount:dev-team:dev-user \
-n dev-team
```

Expected:

```
no
```

This means RBAC is working correctly.

---

---

# Step 9 — Check Everything


```bash
kubectl get roles -n dev-team
```

```
pod-reader
```

---

```bash
kubectl get rolebindings -n dev-team
```

```
dev-user-binding
```

---

```bash
kubectl get serviceaccounts -n dev-team
```

```
dev-user
```

---

# Step 11 — Cleanup (Optional)

Delete everything:

```bash
kubectl delete namespace dev-team
```



These will make your RBAC video **much stronger and more practical**.

