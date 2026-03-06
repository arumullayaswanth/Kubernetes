# CI/CD with GitHub Actions using vCluster (vind)

![vCluster and Vind Architecture](https://github.com/arumullayaswanth/Kubernetes/blob/a6b5ead6e69eccc12f1552c0a433a2698c1d80ac/vCluster%20and%20vind/images/cicd.jpg)

### Workflow

1. Developer pushes code to GitHub Repository
2. GitHub Actions workflow is triggered
3. Runner installs required tools:
   - Docker
   - kubectl
   - vCluster CLI
4. Create an ephemeral vCluster using Docker driver
5. Deploy the application into the virtual cluster
6. Run integration and end-to-end tests
7. Delete the cluster after tests complete

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
# Step 4: Kubernetes Service (LoadBalancer)
Create a simple service.yaml

File:

```text
k8s/service.yaml
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: demo-service
spec:
  type: LoadBalancer
  selector:
    app: demo
  ports:
    - port: 80
      targetPort: 80
```

# Step 5: GitHub Actions Workflow

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
      - master

jobs:
  kubernetes-test:
    runs-on: ubuntu-latest

    steps:

      # Checkout repository
      - name: Checkout Repository
        uses: actions/checkout@v3

      # Install kubectl
      - name: Install kubectl
        run: |
          curl -LO https://dl.k8s.io/release/v1.29.0/bin/linux/amd64/kubectl
          chmod +x kubectl
          sudo mv kubectl /usr/local/bin/

      # Install vCluster CLI
      - name: Install vCluster CLI
        run: |
          curl -L https://github.com/loft-sh/vcluster/releases/latest/download/vcluster-linux-amd64 -o vcluster
          chmod +x vcluster
          sudo mv vcluster /usr/local/bin/

      # Enable Docker driver
      - name: Enable Docker Driver
        run: |
          vcluster use driver docker

      # Clean any old docker resources
      - name: Clean Docker Environment
        run: |
          docker ps -a || true
          docker network prune -f || true
          docker container prune -f || true

      # Load required kernel modules
      - name: Load Kernel Modules
        run: |
          sudo modprobe overlay || true
          sudo modprobe bridge || true
          sudo modprobe br_netfilter || true

      # Create and connect vCluster
      - name: Create vCluster
        run: |
          vcluster create ci-cluster --driver docker
          vcluster connect ci-cluster

      # Verify cluster
      - name: Verify Cluster
        run: |
          kubectl cluster-info
          kubectl get pods -A

      # Deploy application
      - name: Deploy Application
        run: |
          kubectl apply -f k8s/deployment.yaml

      # Deploy service
      - name: Deploy Service
        run: |
          kubectl apply -f k8s/service.yaml

      # Wait for deployment
      - name: Wait for Pods
        run: |
          kubectl rollout status deployment/demo-app --timeout=180s

      # Show service info
      - name: Show Service
        run: |
          kubectl get svc

      # Show application URL
      - name: Show Application URL
        run: |
          echo "Application URL:"
          kubectl get svc demo-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
          echo ""

      # Debug if something fails
      - name: Debug Pods
        if: failure()
        run: |
          kubectl get pods -A
          kubectl describe pods
          kubectl get events --sort-by=.metadata.creationTimestamp

      # Delete cluster
      - name: Delete Cluster
        if: always()
        run: |
          vcluster delete ci-cluster || true
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
