# CI/CD with GitHub Actions using vCluster (vind)

This guide demonstrates how to create **ephemeral Kubernetes clusters during CI/CD pipelines using GitHub Actions and vCluster**.

The cluster is created temporarily, tests run against it, and then the cluster is destroyed.

---

# Architecture

```text
GitHub Repository
       │
       │ Push Code
       │
GitHub Actions Runner
       │
Install vCluster CLI
       │
Create vCluster (Docker Driver)
       │
Deploy Application
       │
Run Tests
       │
Delete Cluster
```

This workflow allows developers to test applications in **real Kubernetes environments automatically**.

---

# Prerequisites

You need:

* GitHub repository
* Docker support in GitHub runner
* vCluster CLI
* kubectl

---

# Step 1: Repository Structure

Example repository structure:

```text
repo/
│
├── .github/
│   └── workflows/
│       └── vcluster-ci.yaml
│
├── k8s/
│   └── deployment.yaml
│
└── README.md
```

---

# Step 2: Kubernetes Deployment Example

Create a simple deployment.

File:

```text
k8s/deployment.yaml
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: demo
  template:
    metadata:
      labels:
        app: demo
    spec:
      containers:
        - name: demo
          image: nginx
          ports:
            - containerPort: 80
```

---

# Step 3: GitHub Actions Workflow

Create the workflow file.

Path:

```text
.github/workflows/vcluster-ci.yaml
```

---

## GitHub Action Pipeline

```yaml
name: vCluster CI Pipeline

on:
  push:
    branches:
      - main

jobs:
  kubernetes-test:
    runs-on: ubuntu-latest

    steps:

      - name: Checkout Repository
        uses: actions/checkout@v3

      - name: Install kubectl
        run: |
          curl -LO https://dl.k8s.io/release/v1.29.0/bin/linux/amd64/kubectl
          chmod +x kubectl
          sudo mv kubectl /usr/local/bin/

      - name: Install vCluster CLI
        run: |
          curl -L https://github.com/loft-sh/vcluster/releases/latest/download/vcluster-linux-amd64 -o vcluster
          chmod +x vcluster
          sudo mv vcluster /usr/local/bin/

      - name: Enable Docker Driver
        run: |
          vcluster use driver docker

      - name: Create vCluster
        run: |
          vcluster create ci-cluster --connect=false
          vcluster connect ci-cluster

      - name: Verify Cluster
        run: |
          kubectl get nodes

      - name: Deploy Application
        run: |
          kubectl apply -f k8s/deployment.yaml

      - name: Verify Pods
        run: |
          kubectl get pods

      - name: Run Tests
        run: |
          kubectl rollout status deployment/demo-app

      - name: Delete Cluster
        run: |
          vcluster delete ci-cluster
```

---

# Step 4: Trigger the Pipeline

Commit and push code:

```bash
git add .
git commit -m "Add CI pipeline"
git push origin main
```

GitHub Actions will automatically start the workflow.

---

# Step 5: Observe Workflow Execution

In GitHub:

```text
Repository → Actions → vCluster CI Pipeline
```

You will see stages:

1. Checkout code
2. Install tools
3. Create cluster
4. Deploy application
5. Run tests
6. Delete cluster

---

# Step 6: Verify Cluster Creation

During the workflow:

```bash
kubectl get nodes
```

Example output:

```text
NAME             STATUS
vcluster-node    Ready
```

This confirms Kubernetes cluster creation inside the CI runner.

---

# Step 7: Ephemeral Cluster Behavior

Each pipeline execution:

```text
Pipeline Start
      │
Create vCluster
      │
Deploy Application
      │
Run Tests
      │
Delete Cluster
```

Advantages:

* Clean environments for each build
* No leftover infrastructure
* Faster test cycles
* Real Kubernetes environment

---

# Benefits of vCluster in CI/CD

Key advantages:

* lightweight Kubernetes clusters
* fast cluster creation
* isolated test environments
* reduced infrastructure cost
* reproducible CI pipelines

---

# Example CI/CD Workflow Diagram

```text
Developer Push
      │
GitHub Actions
      │
Create vCluster
      │
Deploy App
      │
Run Tests
      │
Delete Cluster
```

This workflow ensures applications are always tested in **real Kubernetes environments before deployment**.

---

# Cleanup

The pipeline automatically removes the cluster:

```bash
vcluster delete ci-cluster
```

This prevents resource waste.

---

# Conclusion

Using GitHub Actions with vCluster allows teams to create **ephemeral Kubernetes environments for CI/CD pipelines**.

This approach enables:

* automated testing
* isolated environments
* cloud-native development workflows

It is especially useful for **DevOps teams building Kubernetes-based applications**.
