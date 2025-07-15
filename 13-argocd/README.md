
# 🎉 ArgoCD: End-to-End Guide for Kids (Super Simple)

This guide shows you how to install ArgoCD on Kubernetes, make it do its magic, push apps with Git, and roll back if something breaks—all in easy steps.

---

# Setup Kubernetes on Amazon EKS

You can follow same procedure in the official AWS document [Getting started with Amazon EKS – eksctl](https://docs.aws.amazon.com/eks/latest/userguide/getting-started-eksctl.html)

#### Pre-requisites: 
- an EC2 Instance 

#### AWS EKS Setup 
1. Setup kubectl   
   a. Download kubectl version 1.20  
   b. Grant execution permissions to kubectl executable   
   c. Move kubectl onto /usr/local/bin   
   d. Test that your kubectl installation was successful    
```sh 
# 1. Download kubectl
curl -LO "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# 2. Make it executable
chmod +x ./kubectl

# 3. Move it to a directory in your PATH
sudo mv ./kubectl /usr/local/bin

# 4. Verify the installation  
kubectl version --client

```

2. Setup eksctl   
   a. Download and extract the latest release   
   b. Move the extracted binary to /usr/local/bin   
   c. Test that your eksclt installation was successful   
   d. Verify the installation   
   
```sh
   curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
   sudo mv /tmp/eksctl /usr/local/bin
   eksctl version
```

3. Create an IAM Role and attache it to EC2 instance    
   `Note: create IAM user with programmatic access if your bootstrap system is outside of AWS`   
   IAM user should have access to   
   - IAM   
   - EC2   
   - VPC    
   - CloudFormation

4. Create your cluster and nodes 
  Use the `eksctl` command to create the cluster in the `us-east-1` region:

```sh
eksctl create cluster \
  --name my-cluster \
  --region us-east-1 \
  --node-type t2.small \
  --nodes-min 2 \
  --nodes-max 2 \
  --zones us-east-1a,us-east-1b


```


7. Update kubeconfig to connect kubectl to your EKS cluster

      After creating the EKS cluster, you need to configure `kubectl` so it can interact with your cluster.

      Use the following command:
```sh
  aws eks --region us-east-1 update-kubeconfig --name my-cluster
```

8. Verify that `kubectl` is connected to your EKS cluster
```sh
  kubectl get nodes
```

5. To delete the EKS clsuter 
  To delete your EKS cluster and all associated resources, use the following command:

```sh
  eksctl delete cluster --name my-cluster --region us-east-1
```
---


# 🎉 ArgoCD: End-to-End Guide for Kids (Super Simple)

## What is ArgoCD?

Argo CD is a Kubernetes-native continuous delivery tool.  
Instead of pushing code, Argo CD **pulls** the latest config from Git and deploys it to your cluster.

---

## What is GitOps?

- GitOps means managing infrastructure and apps with Git.
- Your Git repo stores your cluster state (“desired state”).
- Argo CD watches for changes, then applies them to the live environment—like cruise control for infrastructure.

---

## How ArgoCD Implements GitOps

1. Developers commit Kubernetes configs to Git.
2. After testing, changes are merged to the main branch.
3. Argo CD detects the change, compares it with running state, and marks it **OutOfSync**.
4. Argo CD applies changes using Kubernetes controllers.
5. When done, your app shows up as **Synced** in the dashboard.
6. Argo CD continually monitors and restores config drift.
7. You can **roll back** to previous versions in one click because Git holds the history.

---

## Benefits of ArgoCD

1. **Boost developer productivity** — self-service deployments, less manual hand-holding.
2. **Compliance & collaboration** — everyone works from the same Git processes.
3. **Faster deployments** — automatic syncing makes changes quicker to roll out.

---




## 1. Get Ready: We need Kubernetes

- You need a Kubernetes cluster. Minikube is easy:
  ```bash
  minikube start
  ```
- Need help? Just look up "Minikube install".

---

## 2. 🎉 Install ArgoCD

1. Open your terminal.

2. Make a special spot for ArgoCD:
   ```bash
   kubectl create namespace argocd
   ```

3. Put ArgoCD in that spot:
   ```bash
   kubectl apply -n argocd \
     -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
   ```
- After installing the ArgoCD, you can run the below command to check what resources it has created.

4. Verify the deployment   
```sh 
   kubectl get pods -n argocd
```
5. Get the ArgoCD admin password
   Validate your cluster using by creating by checking nodes and by creating a pod 
```sh 
   kubectl get nodes
```

4. Check that all pods in the `argocd` namespace are running:
   ```bash
   kubectl get pods -n argocd
   kubectl get all -n argocd


          NAME                                                    READY   STATUS    RESTARTS   AGE
        pod/argocd-application-controller-0                     1/1     Running   0          106m
        pod/argocd-applicationset-controller-787bfd9669-4mxq6   1/1     Running   0          106m
        pod/argocd-dex-server-bb76f899c-slg7k                   1/1     Running   0          106m
        pod/argocd-notifications-controller-5557f7bb5b-84cjr    1/1     Running   0          106m
        pod/argocd-redis-b5d6bf5f5-482qq                        1/1     Running   0          106m
        pod/argocd-repo-server-56998dcf9c-c75wk                 1/1     Running   0          106m
        pod/argocd-server-5985b6cf6f-zzgx8                      1/1     Running   0          106m
   ```
---

4. Expose ArgoCD Server Using NodePort (Optional Alternative to Port-Forward)

- 1. Edit the Service
```bash
   kubectl edit svc argocd-server -n argocd
```
- 2. Change the Service Type
```bash
   type: ClusterIP
```   
  And change it to:
```bash  
  type: LoadBalancer
```
Then save and exit (:wq in vi).

- 3. Get the External Port
```bash
   kubectl get svc argocd-server -n argocd
```
Sample output:

```bash
NAME            TYPE           CLUSTER-IP     EXTERNAL-IP        PORT(S)                     AGE
argocd-server   LoadBalancer   172.20.1.100   a1b2c3d4e5f6.elb.amazonaws.com   80:31234/TCP,443:31356/TCP   2m
```
- This means:
- ArgoCD is now accessible at:
```bash
https://<ELB-DNS>.amazonaws.com
```
---

5. 🔐 Get Argo CD admin password

```bash
kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath="{.data.password}" | base64 -d && echo
```
- Then log in with:
   - **Username:** `admin`
   - **Password:** (the juicy secret from above)


## 7. 🚀 Create Your First App (Git → Kubernetes)

- CLI version:
  ```bash
  argocd app create my-app \
    --repo https://github.com/devopsjourney1/argo-examples.git \
    --path kustom-webapp/overlays/dev \
    --dest-server https://kubernetes.default.svc \
    --dest-namespace dev
  ```
- Or use the **Web UI**:
  1. Click **“+ New App”**
  2. Name it `my-app`
  3. Use the path and repo above
  4. Set **Manual Sync** for now
  5. Turn on **Auto-create namespace**
  6. Click **Create**

---

## 8. 🌱 Run It (Sync = Deploy)

- **In Web UI**:
  1. Click the app
  2. Click **Sync**
  3. Click **Synchronize**

- **In CLI**:
  ```bash
  argocd app sync my-app
  ```

- Check pods:
  ```bash
  kubectl get pods -n dev
  ```
  You’ll see the app is running!

---

## 9. ✍️ Make a Change & Watch It Grow

- Change replicas (dev overlay):
  - Change `replicas: 5` to `replicas: 2` in the Git repo.
- Commit & push it.
- ArgoCD (if you set **Auto Sync**) will automatically update the live app!

---

## 10. 🔄 Rollback (Go back if you made a mistake)

- In Web UI:
  1. Click the app → **History & Rollback**
  2. Choose old version
  3. Click **Rollback**

- In CLI:
  1. Run history:
     ```bash
     argocd app history my-app
     ```
  2. Run rollback:
     ```bash
     argocd app rollback my-app 0
     ```
  3. Done! Pods go back to old state.

---

## 11. ✅ Done!

### You just learned:
- How to install ArgoCD
- How to push workload from Git to Kubernetes
- How to automatically sync changes
- How to roll back if something breaks

---

## 📚 What to Explore Next

- Deploy another app using **Kustomize**
- Turn on **Auto Sync**
- Learn **Helm apps**
- Try **multi-cluster deployment**

---

🎈 **You did it — end to end, no confusing stuff!** 🎈

Want cute pictures 👶, interactive diagrams, or a printable PDF?
