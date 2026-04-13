# 📘 AWS Load Balancer Controller (EKS)

## 🚨 Why AWS Load Balancer Controller is Required

The AWS Load Balancer Controller is responsible for provisioning and managing AWS Application Load Balancers (ALB) for your Kubernetes Ingress resources.

Without it:

- Your Ingress object will still be created in Kubernetes  
- ❌ But no ALB will be created in AWS  
- ❌ Your application will not be accessible externally  

## 🏗 Architecture

![Architecture Diagram](https://raw.githubusercontent.com/arumullayaswanth/Kubernetes/36a708a46f5055aac97986f8efad289697346def/06-ingress/images/architecture.png)

## 🔄 How It Works

- Kubernetes Ingress YAML  
  ↓  
- AWS Load Balancer Controller  
  ↓  
- AWS ALB is created automatically  
  ↓  
- Traffic routed to Kubernetes services/pods  
 

 ## Step 3: Check AWS Load Balancer Controller

This project uses ALB ingress.
So the AWS Load Balancer Controller must be running.

Check it:

```bash
kubectl get deployment -n kube-system aws-load-balancer-controller
kubectl get pods -n kube-system | grep aws-load-balancer-controller
```

Good result:

- the deployment exists
- the pods are in `Running` state

If it is not installed, install it first.
Do not continue with ingress until this is ready.

Set these values first:

```bash
export CLUSTER_NAME=eksprod
export AWS_REGION=us-east-1
```

Get your VPC ID:

```bash
aws eks describe-cluster \
  --name $CLUSTER_NAME \
  --region $AWS_REGION \
  --query "cluster.resourcesVpcConfig.vpcId" \
  --output text
```

Example output:

```text
vpc-0abc123def456ghi
```

Install the controller with Helm.

Replace `<your-vpc-id>` with your real VPC ID:

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update eks

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=$CLUSTER_NAME \
  --set serviceAccount.create=true \
  --set region=$AWS_REGION \
  --set vpcId=<your-vpc-id>
```

Verify again:

```bash
kubectl get deployment -n kube-system aws-load-balancer-controller
kubectl get pods -n kube-system | grep aws-load-balancer-controller
```

Delete EKS ALB Controller

```bash
helm uninstall aws-load-balancer-controller -n kube-system
kubectl get deployment -n kube-system aws-load-balancer-controller
kubectl get pods -n kube-system | grep aws-load-balancer-controller
```
