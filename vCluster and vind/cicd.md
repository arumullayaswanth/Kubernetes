# Advanced vCluster / vind Features – End-to-End Guide

This guide demonstrates advanced capabilities of **vCluster** using the Docker driver (**vind**) for local Kubernetes development.

We will implement the following features step-by-step:

1. GitOps Integration with Argo CD
2. CI/CD Ephemeral Clusters
3. Resource Limits & Quotas
4. RBAC (Role-Based Access Control)
5. Cluster Snapshots (Concept & Workflow)

Tools used in this guide:

* Docker
* kubectl
* vCluster CLI
* GitHub
* Argo CD

---

# Architecture Overview

```text
Developer Laptop
      │
      │ vCluster (Docker Driver)
      │
Local Kubernetes Cluster
      │
┌───────────────┬───────────────┐
│ GitOps        │ CI/CD         │
│ ArgoCD        │ Ephemeral     │
│ Deployments   │ Clusters      │
└───────────────┴───────────────┘
```

---

# 1. Prerequisites

Ensure the following tools are installed.

```bash
docker --version
kubectl version --client
vcluster --version
```

Minimum required vCluster version:

```
v0.31+
```

---

# 2. Create Local Cluster

Enable Docker driver.

```bash
vcluster use driver docker
```

Start platform UI (optional).

```bash
vcluster platform start
```

Create a cluster.

```bash
vcluster create dev-cluster
```

Verify nodes.

```bash
kubectl get nodes
```

Expected output:

```
NAME              STATUS
vcluster-node     Ready
```

---

# 3. GitOps Integration (Argo CD)

GitOps allows Kubernetes deployments to be controlled using Git repositories.

## Install Argo CD

Create namespace.

```bash
kubectl create namespace argocd
```

Install Argo CD.

```bash
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Wait until pods are running.

```bash
kubectl get pods -n argocd
```

---

## Access Argo CD UI

Forward service port.

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Open browser.

```
https://localhost:8080
```

Get admin password.

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
-o jsonpath="{.data.password}" | base64 -d
```

Login:

```
Username: admin
Password: <generated password>
```

---

## Deploy Application Using GitOps

Example repository:

```
https://github.com/argoproj/argocd-example-apps
```

Create application.

```bash
kubectl create namespace demo
```

Apply application manifest.

```bash
kubectl apply -f https://raw.githubusercontent.com/argoproj/argocd-example-apps/master/guestbook/guestbook-ui-deployment.yaml
```

Verify:

```bash
kubectl get pods -n demo
```

---

# 4. CI/CD Ephemeral Clusters

Ephemeral clusters are temporary clusters created for testing during CI pipelines.

## Create Temporary Cluster

```bash
vcluster create ci-cluster
```

Deploy test application.

```bash
kubectl create deployment test-app --image=nginx
```

Verify pods.

```bash
kubectl get pods
```

---

## Simulate CI Pipeline

Example workflow:

```
CI pipeline starts
        │
create vCluster
        │
run integration tests
        │
destroy cluster
```

Delete cluster after tests.

```bash
vcluster delete ci-cluster
```

This keeps environments clean.

---

# 5. Resource Limits and Quotas

Resource limits protect clusters from over-consumption.

Create namespace.

```bash
kubectl create namespace team-a
```

Create resource quota.

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: team-a
spec:
  hard:
    pods: "5"
    requests.cpu: "2"
    requests.memory: 4Gi
    limits.cpu: "4"
    limits.memory: 8Gi
```

Apply quota.

```bash
kubectl apply -f quota.yaml
```

Verify quota.

```bash
kubectl get quota -n team-a
```

---

# 6. RBAC (Role-Based Access Control)

RBAC restricts access for users or teams.

## Create Service Account

```bash
kubectl create serviceaccount dev-user
```

---

## Create Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get","watch","list"]
```

Apply role.

```bash
kubectl apply -f role.yaml
```

---

## Bind Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
subjects:
- kind: ServiceAccount
  name: dev-user
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

Apply binding.

```bash
kubectl apply -f rolebinding.yaml
```

Verify permissions.

```bash
kubectl auth can-i list pods --as=system:serviceaccount:default:dev-user
```

---

# 7. Cluster Snapshots (Concept)

Cluster snapshots allow saving cluster state.

Example use cases:

* Backup cluster configuration
* Restore test environments
* Share cluster setups with teams

Future snapshot workflow:

```
snapshot create dev-cluster
snapshot store backup
snapshot restore
```

Snapshots will allow:

* environment cloning
* rapid recovery
* testing infrastructure states

---

# 8. Clean Up

Delete workloads.

```bash
kubectl delete deployment test-app
```

Delete cluster.

```bash
vcluster delete dev-cluster
```

Stop platform.

```bash
vcluster platform stop
```

---

# Conclusion

In this guide we implemented advanced vCluster capabilities:

* GitOps deployments using Argo CD
* CI/CD ephemeral clusters
* Resource management with quotas
* Secure RBAC access
* Cluster snapshot concepts

These features help build **production-grade Kubernetes development environments** using vCluster.

---

# Next Steps

You can further explore:

* Multi-cluster environments
* Hybrid clusters with external nodes
* Edge computing architectures
* Automated developer environments
