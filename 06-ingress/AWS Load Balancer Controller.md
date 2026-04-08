# 📘 AWS Load Balancer Controller (EKS)

## 🚨 Why AWS Load Balancer Controller is Required

The AWS Load Balancer Controller is responsible for provisioning and managing AWS Application Load Balancers (ALB) for your Kubernetes Ingress resources.

Without it:

- Your Ingress object will still be created in Kubernetes  
- ❌ But no ALB will be created in AWS  
- ❌ Your application will not be accessible externally  


## 🔄 How It Works

- Kubernetes Ingress YAML  
  ↓  
- AWS Load Balancer Controller  
  ↓  
- AWS ALB is created automatically  
  ↓  
- Traffic routed to Kubernetes services/pods  
## Step 0: Check AWS Load Balancer Controller

This project uses Kubernetes Ingress with AWS ALB.
So the AWS Load Balancer Controller must exist in your EKS cluster.

Check it:

```bash
kubectl get deployment -n kube-system aws-load-balancer-controller
kubectl get pods -n kube-system | grep aws-load-balancer-controller
```

If you already see the deployment and pods, you are fine.

If it is not installed, here is an example install flow.

Set these values first:

```bash
export CLUSTER_NAME=my-eks-cluster
export AWS_REGION=us-east-1
export ACCOUNT_ID=123456789012
```

Associate IAM OIDC provider:

```bash
eksctl utils associate-iam-oidc-provider \
  --region $AWS_REGION \
  --cluster $CLUSTER_NAME \
  --approve
```

Download the IAM policy:

```bash
curl -O https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json
```

Create the IAM policy:

```bash
aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam_policy.json
```

Create the IAM service account:

```bash
eksctl create iamserviceaccount \
  --cluster $CLUSTER_NAME \
  --region $AWS_REGION \
  --namespace kube-system \
  --name aws-load-balancer-controller \
  --attach-policy-arn arn:aws:iam::$ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
  --override-existing-serviceaccounts \
  --approve
```
Get your VPC ID

```bash
aws eks describe-cluster \
  --name $CLUSTER_NAME \
  --region $AWS_REGION \
  --query "cluster.resourcesVpcConfig.vpcId" \
  --output text
```
Example output:
```bash
vpc-0abc123def456ghi
```
Install the controller with Helm:
- 👉 Replace <YOUR_VPC_ID> with

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update eks

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=$CLUSTER_NAME \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region=$AWS_REGION \
  --set vpcId=<YOUR_VPC_ID>
```

Verify again:

```bash
kubectl get deployment -n kube-system aws-load-balancer-controller
```
Delete EKS ALB Controller
- Delete Helm Release (MAIN step)
```bash
helm uninstall aws-load-balancer-controller -n kube-system
```
- Delete Service Account (Kubernetes)
```bash
kubectl delete serviceaccount aws-load-balancer-controller -n kube-system
```
- Delete IAM Service Account (EKS / CloudFormation)
```bash
eksctl delete iamserviceaccount \
  --cluster $CLUSTER_NAME \
  --region $AWS_REGION \
  --namespace kube-system \
  --name aws-load-balancer-controller
```
- Delete IAM Policy (AWS)
```bash
aws iam delete-policy \
  --policy-arn arn:aws:iam::$ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy
```
- Verify Cleanup
```bash
kubectl get deployment -n kube-system aws-load-balancer-controller
kubectl get pods -n kube-system | grep aws-load-balancer-controller
```
