# Hybrid Kubernetes: Adding an External AWS EC2 Node to a Local vCluster (vind)

This guide demonstrates how to connect an external cloud node (AWS EC2) to a **local Kubernetes cluster running with vCluster using the Docker driver (vind)**.

## Architecture Diagram

![EC2 to Local Architecture](https://raw.githubusercontent.com/arumullayaswanth/Kubernetes/c2a0db6fe870908b82d9a2a30513c21c9e09029e/vCluster%20and%20vind/images/ec2%20to%20local.jpg)

# 1. Prerequisites

Ensure the following tools are installed on your laptop.

* Docker
* kubectl
* vCluster CLI (>= v0.31)
Required accounts:
* AWS account

---

# 2. Install Required Tools

## Install Docker

Verify Docker is installed and running:

```bash
docker --version
docker ps
```

---

## Install vCluster CLI

Download the latest release:

```bash
curl -L https://github.com/loft-sh/vcluster/releases/latest/download/vcluster-linux-amd64 -o vcluster
chmod +x vcluster
sudo mv vcluster /usr/local/bin/
```

Verify installation:

```bash
vcluster --version
```

---

# 3. Enable Docker Driver (vind)

Switch the vCluster driver to Docker.

```bash
vcluster use driver docker
```

This enables **vind (vCluster in Docker)** which runs Kubernetes clusters directly as Docker containers.

---

# 4. Start the vCluster Platform UI

Start the local management dashboard.

```bash
vcluster platform start
```

Open the UI in your browser:

```
https://d294dx4.loft.host/projects/default/vclusters
```

Accept the self-signed certificate warning if prompted.

---

# 5. Create Local Kubernetes Cluster

Create a new cluster:

```bash
vcluster create hybrid-cluster
```

Verify nodes:

```bash
kubectl get nodes
```

Example output:

```
NAME                STATUS   ROLES
vcluster-node       Ready    control-plane
```

Your **local Kubernetes cluster is now running**.

---

# 6. Launch AWS EC2 Instance

Open the AWS console and create a new instance.

Recommended configuration:

```
AMI: Ubuntu 22.04
Instance Type: t3.medium
Storage: 20 GB
Security Group: Allow SSH (port 22)
```

Connect to the instance:

```bash
ssh ubuntu@<EC2_PUBLIC_IP>
```

---

# 7. Prepare the EC2 Node

Update the system:

```bash
sudo apt update
sudo apt upgrade -y
```

Install Docker:

```bash
sudo apt install docker.io -y
sudo systemctl enable docker
sudo systemctl start docker
```

Verify Docker:

```bash
docker --version
```

---

# 8. Join EC2 Node to the Cluster

On your **local machine**, generate a join command:

```bash
vcluster node join hybrid-cluster
```

This prints a command similar to:

```
curl https://join-command.sh | sudo bash
```

Copy that command.

Run it on the **EC2 instance**:

```bash
curl https://join-command.sh | sudo bash
```

This installs the node agent and connects the EC2 instance to your local cluster.

---

# 9. Verify Node Registration

Back on your laptop, run:

```bash
kubectl get nodes
```

Example output:

```
NAME                STATUS   ROLES
vcluster-node       Ready    control-plane
ec2-node            Ready    worker
```

Your EC2 instance is now a worker node in the cluster.

---

# 10. Deploy Workload

Create a test deployment.

```bash
kubectl create deployment nginx --image=nginx
```

Scale the deployment:

```bash
kubectl scale deployment nginx --replicas=5
```

Check pod placement:

```bash
kubectl get pods -o wide
```

Some pods should now run on the EC2 node.

---

# 11. Force Pods to Run on EC2 Node (Optional)

Label the EC2 node.

```
kubectl label node ec2-node type=external
```

Create a deployment that targets this node.

Example pod spec:

```yaml
nodeSelector:
  type: external
```

Now Kubernetes schedules workloads specifically on the EC2 node.

---

# 12. Cleanup

Delete workloads:

```bash
kubectl delete deployment nginx
```

Remove node:

```bash
kubectl delete node ec2-node
```

Delete the cluster:

```bash
vcluster delete hybrid-cluster
```

Stop the platform:

```bash
vcluster platform stop
```

---

# Result

You successfully created a **hybrid Kubernetes cluster**:

* Local control plane
* Local Docker node
* AWS EC2 external worker node

This architecture is useful for:

* Hybrid cloud development
* Edge computing experiments
* Testing distributed Kubernetes clusters
* CI/CD testing environments
