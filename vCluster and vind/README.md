
I got you 💛
This time I’m going to give you a **no-gap, no-assumption, don’t-miss-a-single-click lab**.

You will:

* Install everything from zero
* Use Docker driver (vind mode)
* Start Platform UI
* Create cluster
* Deploy app
* Test LoadBalancer
* Pause / Resume
* Multi-node
* Multiple clusters
* Verify Docker internals
* Clean up properly

You can follow this exactly as-is and even record while doing it.

---

# 🔵 PHASE 1 — Fresh Laptop Setup (Zero to Start)

## ✅ STEP 1 — Install Docker

Download Docker Desktop and install it.

After installation:

Open terminal and run:

```bash
docker --version
```

You must see a version.

Then check Docker daemon:

```bash
docker ps
```

If no error → Docker is running.

If error → start Docker Desktop manually.

Do NOT continue until Docker works.

---

## ✅ STEP 2 — Install vCluster CLI

We will use:

vCluster

Run:

```bash
curl -L https://github.com/loft-sh/vcluster/releases/latest/download/vcluster-windows-amd64.exe -o vcluster.exe
mkdir -p "$HOME/bin"
mv vcluster.exe "$HOME/bin/vcluster.exe"
echo 'export PATH=$PATH:$HOME/bin' >> "$HOME/.bashrc"
source "$HOME/.bashrc"
```

Now verify:

```bash
vcluster --version
```

Important: version must be ≥ 0.31.0

---

# 🔵 PHASE 2 — Enable Docker Driver (vind Mode)

We are now activating:

vind

Run:

```bash
vcluster use driver docker
```

You should see confirmation.

Now vCluster will run clusters directly as Docker containers.

---

# 🔵 PHASE 3 — Start Platform UI (IMPORTANT)

This starts:

vCluster Platform

Run:

```bash
vcluster platform start
```

Wait until you see:

```
Platform started successfully
```

It will show a URL like:

```
https://d294dx4.loft.host/projects/default/vclusters
```

| Image 1 | Image 2 | Image 3 |
|--------|--------|--------|
| ![](https://github.com/arumullayaswanth/Kubernetes/blob/8f999b861d7a73f4e439b08a0336f479c89441f6/vCluster%20and%20vind/images/Screenshot%202026-03-06%20165723.png) | ![](https://github.com/arumullayaswanth/Kubernetes/blob/8f999b861d7a73f4e439b08a0336f479c89441f6/vCluster%20and%20vind/images/Screenshot%202026-03-06%20165852.png) | ![](https://github.com/arumullayaswanth/Kubernetes/blob/8f999b861d7a73f4e439b08a0336f479c89441f6/vCluster%20and%20vind/images/Screenshot%202026-03-06%20165920.png) |

https://raw.githubusercontent.com/arumullayaswanth/Kubernetes/8f999b861d7a73f4e439b08a0336f479c89441f6/vCluster%20and%20vind/images/filename.png

---

# 🔵 PHASE 4 — Create First Cluster

Now create cluster:

```bash
vcluster create dev-cluster
```

Wait until:

```
Successfully created cluster
```

Now check Docker:

```bash
docker ps
```

You should see containers like:

```
vcluster.cp.dev-cluster
vcluster.node.dev-cluster
```

That means Kubernetes is running inside Docker.

---

## ✅ Verify Kubernetes Works

```bash
kubectl get nodes
```

You should see 1 node.

Then:

```bash
kubectl get namespaces
```

Everything normal.

Now refresh UI in browser.

You should see:

dev-cluster listed visually.

---

# 🔵 PHASE 5 — Deploy Application

Create deployment:

```bash
kubectl create deployment web --image=nginx
```

Check:

```bash
kubectl get pods
```

Wait until pod is Running.

---

# 🔵 PHASE 6 — Test LoadBalancer (Very Important)

Now create service:

```bash
kubectl expose deployment web --type=LoadBalancer --port=80
```

Check:

```bash
kubectl get svc
```

You should see:

```
TYPE: LoadBalancer
EXTERNAL-IP: localhost
```

If not immediately, wait 10–20 seconds.

Now test access.

Find mapped port:

```bash
kubectl get svc web
```

Look at PORT(S) column.

Example:

```
80:31567/TCP
```

Now open browser:

```
http://localhost:31567
```

You should see nginx welcome page.

✅ LoadBalancer working.
No MetalLB.
No cloud.

Docker handled it automatically.

---

# 🔵 PHASE 7 — Inspect Docker Port Mapping

Run:

```bash
docker ps
```

Copy container ID of control plane.

Then:

```bash
docker port <container-id>
```

You will see port mappings.

This proves Docker is acting like cloud provider.

---

# 🔵 PHASE 8 — Pause Cluster

Now test sleep feature.

```bash
vcluster pause dev-cluster
```

Check Docker:

```bash
docker ps
```

Containers disappear.

Cluster is paused.

Try:

```bash
kubectl get pods
```

It should fail.

---

# 🔵 PHASE 9 — Resume Cluster

```bash
vcluster resume dev-cluster
```

Check:

```bash
kubectl get pods
```

Pods come back instantly.

This is something kind cannot do.

---

# 🔵 PHASE 10 — Multi-Node Cluster

Delete current cluster:

```bash
vcluster delete dev-cluster
```

Now create multi-node:

```bash
vcluster create multi-cluster --nodes 3
```

Verify:

```bash
kubectl get nodes
```

You should see 3 nodes.

Now deploy workload and check scheduling.

---

# 🔵 PHASE 11 — Multiple Clusters (Isolation Test)

Create:

```bash
vcluster create customer-a
vcluster create customer-b
```

Switch between contexts:

```bash
kubectl config get-contexts
```

Connect to customer-a:

```bash
vcluster connect customer-a
kubectl create deployment app1 --image=nginx
```

Now connect to customer-b:

```bash
vcluster connect customer-b
kubectl get pods
```

You should NOT see app1.

Isolation confirmed.

---

# 🔵 PHASE 12 — Delete One Cluster

```bash
vcluster delete customer-a
```

Check:

```bash
vcluster list
```

customer-b still exists.

Multi-tenant simulation complete.

---

# 🔵 PHASE 13 — Stop Platform

When done:

```bash
vcluster platform stop
```

---

# 🔵 PHASE 14 — Full Cleanup

List clusters:

```bash
vcluster list
```

Delete all:

```bash
vcluster delete <cluster-name>
```

Check Docker:

```bash
docker ps
```

Should be clean.

---

# 🧠 What You Now Fully Tested

✔ Docker driver
✔ Platform UI
✔ LoadBalancer
✔ Pause / Resume
✔ Multi-node
✔ Multi-cluster isolation
✔ Docker internals
✔ Context switching
✔ Complete cleanup

Nothing skipped.

---

If something does not work while you implement, tell me the exact error and I’ll debug it with you step-by-step.

Now you’re not just reading docs.
You’re actually mastering the system. 💪
