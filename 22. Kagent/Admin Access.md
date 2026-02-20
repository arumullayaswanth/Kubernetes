
# 🚀 Granting Admin Access to Kagent in EKS (Full Mutation Mode)

This guide explains how to give **Kagent full administrative access** to your EKS cluster.

By default, Kagent agents are often deployed in **read-only mode** for safety.

This guide enables:

* ✅ Create resources
* ✅ Patch resources
* ✅ Delete resources
* ✅ Apply manifests
* ✅ Full Kubernetes automation

⚠️ Use this only in **lab or controlled environments**.

---

# 📌 Architecture Overview

```
User (Kagent UI)
        │
        ▼
Kagent Controller
        │
        ▼
Kubernetes API Server
        │
        ▼
EKS Cluster Resources
```

Granting admin access means:

* The **Kagent Controller ServiceAccount** gets elevated RBAC permissions
* The **Agent definition** allows mutation tools
* The **System prompt** allows modification actions

---

# 🟢 STEP 1 — Identify Kagent ServiceAccount

Check which ServiceAccount Kagent uses:

```bash
kubectl get sa -n kagent
```

You should see:

```
kagent-controller
```

---

# 🟢 STEP 2 — Create Cluster Admin Role

Create file:

```bash
nano kagent-admin-role.yaml
```

Paste:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kagent-admin-role
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

Apply:

```bash
kubectl apply -f kagent-admin-role.yaml
```

---

# 🟢 STEP 3 — Bind Role to Kagent Controller

Create file:

```bash
nano kagent-admin-binding.yaml
```

Paste:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kagent-admin-binding
subjects:
- kind: ServiceAccount
  name: kagent-controller
  namespace: kagent
roleRef:
  kind: ClusterRole
  name: kagent-admin-role
  apiGroup: rbac.authorization.k8s.io
```

Apply:

```bash
kubectl apply -f kagent-admin-binding.yaml
```

---

# 🟢 STEP 4 — Verify Mutation Tools Are Enabled

Check agent:

```bash
kubectl edit agent k8s-agent -n kagent
```

Ensure this section exists:

```yaml
toolNames:
  - k8s_apply_manifest
  - k8s_create_resource
  - k8s_patch_resource
  - k8s_delete_resource
  - k8s_get_resources
```

delete 2 line
- k8s_get_available_api_resources
- k8s_get_resources

If missing, add them.

Save and exit.

---

# 🟢 STEP 5 — Update System Message

Inside the same agent file, replace `systemMessage` with:

```yaml
systemMessage: |
  You are a Kubernetes DevOps automation assistant.

  You are allowed to:
  - Create Kubernetes resources
  - Patch existing resources
  - Delete resources
  - Apply YAML manifests

  Before performing destructive operations:
  - Explain the action
  - Describe impact
  - Then proceed

  Avoid modifying:
  - kube-system namespace
  - Core cluster components
```

Save and exit.

---

# 🟢 STEP 6 — Restart Controller

```bash
kubectl rollout restart deployment kagent-controller -n kagent
```

---

# 🟢 STEP 7 — Test Admin Access

In Kagent UI, try:

```
Create a namespace called ai-lab
```

Then verify:

```bash
kubectl get namespaces
```

If `ai-lab` exists → Admin mode is working.

---

# 🔐 Optional (Safer Alternative)

Instead of full cluster admin, restrict to only `kagent` namespace:

Replace `ClusterRole` with:

```yaml
kind: Role
```

And bind with:

```yaml
kind: RoleBinding
```

This limits damage scope.

---

# ⚠️ Security Warning

Granting cluster-wide admin access allows:

* Deleting system services
* Removing storage classes
* Modifying network policies
* Upgrading Helm releases

Only use in:

* Lab environments
* Sandbox clusters
* Controlled training setups

Never expose publicly.

---

