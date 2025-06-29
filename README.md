
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
