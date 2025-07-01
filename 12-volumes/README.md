# 📦 Simplifying Persistent Storage in Amazon EKS with Amazon EBS


## 🔹 Prerequisites

* AWS account & EKS cluster running
* AWS CLI and `kubectl` installed & configured
* IAM permissions for EKS and EBS management

---
## Introduction:

* In the world of Kubernetes, managing persistent storage for applications can be challenging. However, with the integration of Amazon Elastic Block Store (EBS) and Amazon Elastic Kubernetes Service (EKS), this process becomes streamlined and efficient. In this blog, we’ll explore how to set up EBS storage classes in EKS and launch pods that utilize these volumes, ensuring data persistence and reliability for your applications.

## Understanding EBS Storage Classes:
 
* Amazon EBS provides block-level storage volumes that can be attached to EC2 instances. In Kubernetes, storage classes define the type and properties of the storage that pods can request. By configuring EBS storage classes, you can dynamically provision EBS volumes for your Kubernetes workloads based on predefined policies.

---

# Setting Up EKS and EBS Integration As Persistent Storage 👇:

```bash
sudo yum install git -y 
sudo apt update && sudo apt install git -y
```

## 1. Launching EKS Cluster:

- Begin by creating an Amazon EKS cluster using the AWS Management Console or CLI. This cluster will serve as the foundation for our Kubernetes environment. We are using eksctl tool for this.

- You can use any of the below command.

```bash
eksctl create cluster \
  --name basic-cluster \
  --region us-east-1 \
  --version 1.32 \
  --nodegroup-name ng-basic \
  --instance-types t3.medium \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 5 \
  --node-volume-size 40 \
  --node-volume-type gp2 \
  --enable-ssm \
  --ssh-access \
  --ssh-public-key us-east-1 \
  --instance-name eks-workernode \
  --managed \
  --kubeconfig Cluster1.config

```
- Get List of Clusters
```bash 
aws eks --region us-east-1 update-kubeconfig --name basic-cluster
eksctl get cluster
eksctl get cluster --region us-east-1

#Example Output:
NAME            REGION
basic-cluster   us-east-1
```
- Get Node Groups in a Cluster
```bash
#eksctl get nodegroup --cluster <cluster-name>
#eksctl get nodegroup --cluster <cluster-name> --region us-east-1
eksctl get nodegroup --cluster basic-cluster
#Example Output:
CLUSTER         NODEGROUP       STATUS
basic-cluster   ng-basic        ACTIVE
```
---

## 2. Modifying IAM Role:

- To allow EKS to manage EBS volumes on our behalf, modify an IAM role with the necessary permissions. This role ensures secure communication between EKS and EBS.

- To get the IAM role that is already been created by the eksctl, run the following command.
```bash
eksctl get nodegroup --cluster basic-cluster --region us-east-1
```

```bash 
#kubectl get configmap -n kube-system --kubeconfig Cluster1.config
kubectl get configmaps -n kube-system --kubeconfig=Cluster1.config

#example
NAME                                                   DATA   AGE
amazon-vpc-cni                                         7      12m
aws-auth                                               1      9m29s
coredns                                                1      12m
extension-apiserver-authentication                     6      15m
kube-apiserver-legacy-service-account-token-tracking   1      15m
kube-proxy                                             1      12m
kube-proxy-config                                      1      12m
kube-root-ca.crt                                       1      14m



```

```bash 
kubectl describe configmap aws-auth -n kube-system --kubeconfig Cluster1.config

# example


Name:         aws-auth
Namespace:    kube-system
Labels:       <none>
Annotations:  <none>

Data
====
mapRoles:
----
- groups:
  - system:bootstrappers
  - system:nodes
  rolearn: arn:aws:iam::421954350274:role/eksctl-basic-cluster-nodegroup-ng--NodeInstanceRole-SDYjHwi3nusK
  username: system:node:{{EC2PrivateDNSName}}



BinaryData
====

Events:  <none>
```


- Go to the IAM dashboard and select this IAM role and modify it by attaching the ec2fullaccess policy.



## ✅ Attach AmazonEC2FullAccess to EKS Node IAM Role

# 📌 Objective
Grant the EKS node group EC2 instances full access to EC2 operations by attaching the `AmazonEC2FullAccess` policy to the node IAM role created by `eksctl`.

---

# 🧭 Step-by-Step Instructions

### 1. Go to IAM Console
- Open [AWS IAM Console](https://console.aws.amazon.com/iam/)

### 2. Navigate to **Roles**
- In the left sidebar, click on **Roles**.

### 3. Search for Node Role
- Use the search bar and enter:
  ```
  eksctl-basic-cluster-nodegroup-ng--NodeInstanceRole
  ```
- You may see something like:
  ```
  eksctl-basic-cluster-nodegroup-ng--NodeInstanceRole-SDYjHwi3nusK
  ```

### 4. Select the Role
- Click on the role name to open its details page.

### 5. Add Permissions
- Click the **Add permissions** button.
- Select **Attach policies**.

### 6. Search for Policy
- In the search bar, type:
  ```
  AmazonEC2FullAccess
  ```

### 7. Attach the Policy
- Check the box for **AmazonEC2FullAccess**.
- Click **Add permissions** at the bottom.

### ✅ Done!
The EKS node group now has full EC2 access, which is often needed for working with EBS volumes, ENIs, or other EC2-level resources.

> 📌 You can always modify or restrict permissions later for more security.

---

## 3. Launching Provisioner:

- Deploy the EBS CSI driver provisioner as a Kubernetes daemon set. This provisioner dynamically creates EBS volumes in response to persistent volume claims (PVCs) from pods.

-  For this run the following command to deploy the EBS CSI driver.
- ✅ This command uses Kustomize to install the EBS CSI driver from the release-1.30 branch.

```bash
kubectl apply -k "https://github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.30" --kubeconfig Cluster1.config
```
- Verify the deployment with the following command.

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-ebs-csi-driver --kubeconfig Cluster1.config

#example output
NAME                                  READY   STATUS    RESTARTS   AGE
ebs-csi-controller-68d98c6d7d-6ksnl   6/6     Running   0          67s
ebs-csi-controller-68d98c6d7d-pvh2g   6/6     Running   0          67s
ebs-csi-node-dm5q7                    3/3     Running   0          66s
ebs-csi-node-h29cs                    3/3     Running   0          67s

```
# Deploying Pods with Persistent Storage:

## 1. Configuring Storage Class:
- 1. Define a storage class in Kubernetes that specifies the provisioner as “kubernetes.io/aws-ebs-csi.com” and includes parameters such as volume type, size, and encryption setting

### 2. Define a StorageClass

Allows dynamic provisioning of EBS volumes.

Create `ebs-sc.yaml`:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-sc
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
parameters:
  type: gp3
  fsType: ext4

```

Apply:

```bash
kubectl apply -f ebs-sc.yaml --kubeconfig Cluster1.config
```

---

### 3. Create a PersistentVolumeClaim (PVC)

- Define a PVC in Kubernetes that requests storage from the EBS storage class. This PVC specifies the desired storage capacity and access mode required by the application.

- Below is the content of the file that will create pvc resource.


Create `pvc.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ebs-sc-pvc
  namespace: default

spec:
  accessModes:
    - ReadWriteMany
  storageClassName: ebs-sc
  resources:
    requests:
      storage: 4Gi
```

Apply:

```bash
kubectl apply -f pvc.yaml --kubeconfig Cluster1.config
```

```bash
kubectl get pvc --kubeconfig Cluster1.config
```
- But it is not yet bounded because of the volume binding mode in storage class, this will only be bounded when some pod will use this.

---

### 4. Deploying Application Pods Mount PVC to a Pod

- Launch pods that require persistent storage and reference the PVC created earlier. These pods automatically mount the EBS volume and can read from or write to it as needed.

- Below are the yaml code for launching the pod.


Create `pod.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
  - name: app
    image: centos
    command: ["/bin/sh"]
    args: ["-c", "while true; do echo $(date -u) >> /data/out.txt; sleep 5; done"]
    volumeMounts:
    - name: persistent-storage
      mountPath: /data
  volumes:
  - name: persistent-storage
    persistentVolumeClaim:
      claimName: ebs-sc-pvc
```

Apply:
- Launch it with following command.

```bash
kubectl apply -f pod.yaml --kubeconfig Cluster1.config
```

---

### ✅ Verification
- And you will see that as soon as it is created the pv that is persistent volume will automatically created and pvc will be bounded to it.

```bash
kubectl get pods
kubectl get pvc

```
- Go manually to the ec2-console and see the storage of the node where this pod was launched.

---
```bash 
kubectl delete pvc ebs-sc-pvc --kubeconfig Cluster1.config
```
- Delete EKS Cluster with eksctl

```bash
eksctl delete cluster --name basic-cluster --region us-east-1
```



## 🧠 Key Concepts

* **StorageClass** defines how PVs are provisioned.
* **PVC** requests storage by referencing a StorageClass.
* **Pod** mounts the PVC, attaching EBS volume to a container.

---

## 🛡️ Best Practices

* Select the right EBS volume type (`gp2`, `gp3`, `io1`, etc.)
* Use `WaitForFirstConsumer` to ensure AZ alignment ([bytegoblin.io](https://bytegoblin.io/blog/simplifying-persistent-storage-in-amazon-eks-with-amazon-ebs?utm_source=chatgpt.com), [docs.aws.amazon.com](https://docs.aws.amazon.com/eks/latest/userguide/sample-storage-workload.html?utm_source=chatgpt.com), [deepwiki.com](https://deepwiki.com/stacksimplify/aws-eks-kubernetes-masterclass/4.1-ebs-storage-with-eks?utm_source=chatgpt.com))
* Set `ReclaimPolicy` to `Retain` for preserving data
* Use EBS snapshots for backup and data recovery ([bytegoblin.io](https://bytegoblin.io/blog/simplifying-persistent-storage-in-amazon-eks-with-amazon-ebs?utm_source=chatgpt.com))

---

## 🔗 Additional Resources

* Kubernetes dynamic provisioning docs
* AWS Pricing & EBS performance guides
* Tutorials on snapshots and backups

## Limitations of EBS as Persistent Volume:
- While EBS volumes offer numerous benefits, including reliability and scalability, they also come with certain limitations:
1. Availability Zones Bound: EBS volumes are tied to specific AWS Availability Zones, limiting their availability in multi-zone deployments.
2. Performance Variability: Performance of EBS volumes can vary based on volume type and instance type, impacting application performance.
3. Cost Considerations: EBS volumes incur costs based on usage and storage capacity, requiring careful planning to optimize costs in Kubernetes environments.
---

