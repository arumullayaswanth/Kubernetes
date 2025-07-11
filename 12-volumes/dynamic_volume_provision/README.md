
# 🛠️ Deploy MongoDB on EKS with Dynamic EBS Volumes
- This guide walks through deploying a MongoDB StatefulSet with persistent volumes using AWS EBS CSI driver on Amazon EKS.

You can follow same procedure in the official AWS document [Getting started with Amazon EKS – eksctl](https://docs.aws.amazon.com/eks/latest/userguide/getting-started-eksctl.html)

#### Pre-requisites: 
- 🖥️ EC2 Instance (Amazon Linux / Ubuntu)
- 🌐 Internet Access
- 🧑‍💼 IAM Role attached to EC2 with the following permissions:

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
- This command will create the control plane, VPC, subnets, and managed node groups.

7. 🔗 Connect kubectl to Your EKS Cluster

      After creating the EKS cluster, you need to configure `kubectl` so it can interact with your cluster.

      Use the following command:
```sh
  aws eks --region us-east-1 update-kubeconfig --name my-cluster
```

8. Verify that `kubectl` is connected to your EKS cluster
```sh
  kubectl get nodes
```

### 📦 Step 9: Install the AWS EBS CSI Driver (if not auto-installed)  

### ✅ Manual Installation of EBS CSI Driver on EKS

#### 1. Navigate to EKS Cluster in AWS Console
- Go to the **AWS Console**.
- Select **EKS** from the services.
- Click on your **Cluster Name** to open its details.

#### 2. Add the Amazon EBS CSI Driver Add-on
- Go to the **Add-ons** tab.
- Click **Get more add-ons**.
- In the search bar, type and select **Amazon EBS CSI Driver**.
- Click **Next**.
- Click **Next** again on the configuration page.
- Click **Create** to install the driver.

#### 3. Add Necessary Permissions to Node IAM Role
- Go back to your cluster and open the **Compute** tab.
- Click on your **Node Group**.
- Go to the **Details** tab.
- Copy the **Node IAM Role** (you’ll need this for the next step).

#### 4. Attach EBS CSI Policy to the Node IAM Role
- Go to the **IAM** section of the AWS Console.
- Search for and select the IAM Role you copied earlier.
- Click **Add permissions**.
- Choose **Attach policies directly**.
- Search for and attach the policy: `AmazonEBSCSIDriverPolicy`.
- Click **Add permissions** to confirm.

✅ Done!


---
### ✅ Automation Installation of EBS CSI Driver on EKS
`or Instead of you can do this process also` 

- Add the EBS CSI Driver to EKS

```bash
eksctl create addon \
  --name aws-ebs-csi-driver \
  --cluster my-cluster \
  --region us-east-1 \
  --service-account-role-arn arn:aws:iam::421954350274:role/<EBS_CSI_ROLE> \
  --force
```
- example
```bash

eksctl create addon \
  --name aws-ebs-csi-driver \
  --cluster my-cluster \
  --region us-east-1 \
  --service-account-role-arn arn:aws:iam::421954350274:role/eksctl-my-cluster-nodegroup-ng-3e0-NodeInstanceRole-XUluZVrFkmhG /
```

- Confirm it's running:
```bash
kubectl get pods -n kube-system | grep ebs
```
### 🧱 Step 9: Create StorageClass
1. File: `sc.yml`
```yaml

apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-storage
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
parameters:
  type: gp2



```
2. Apply it:
```bash
kubectl apply -f sc.yml
```
### 🍃 Step 8: Deploy MongoDB StatefulSet
1. File: `dep.yml`
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
spec:
  serviceName: mongodb
  replicas: 3
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
        - name: mongodb
          image: mongo
          ports:
            - containerPort: 27017
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              value: admin
            - name: MONGO_INITDB_ROOT_PASSWORD
              value: testtesttest
          volumeMounts:
            - name: mongodb-data
              mountPath: /data/db
  volumeClaimTemplates:
    - metadata:
        name: mongodb-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: ebs-storage
        resources:
          requests:
            storage: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
spec:
  selector:
    app: mongodb
  ports:
    - protocol: TCP
      port: 27017
      targetPort: 27017
  clusterIP: None

```

2. Apply it:
```bash
kubectl apply -f dep.yml
```

### 🔍 Step 9: Verify the Deployment
```bash
kubectl get pods
kubectl get pvc
kubectl get pv
kubectl get statefulset

```
3. You should see:
 - Pods: `mongodb-0`, `mongodb-1`, `mongodb-2`
 - 3 PVCs and dynamically provisioned EBS volumes


### 📉 Step 10: Cleanup (Optional)

```bash
kubectl delete -f dep.yml
kubectl delete -f sc.yml
```



5. To delete the EKS clsuter 
  To delete your EKS cluster and all associated resources, use the following command:

```sh
  eksctl delete cluster --name my-cluster --region us-east-1
```
---
