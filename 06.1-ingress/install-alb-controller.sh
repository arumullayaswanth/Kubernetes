#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Installs the AWS Load Balancer Controller on EKS.
# Run this script from your EC2 jump box or any machine with:
#   - kubectl configured for your cluster
#   - helm installed
#   - aws cli configured
#1. aws eks update-kubeconfig  → connects kubectl to your cluster
#2. aws eks describe-cluster   → fetches VPC ID automatically
#3. aws eks describe-nodegroup → fetches Node IAM Role ARN automatically
#4. helm repo add              → adds the Helm repo
#5. helm upgrade --install     → installs the controller with all correct values
#6. kubectl rollout status     → waits until controller is ready
#7. kubectl get pods           → shows you the running pods

# ---------------------------------------------------------------------------

CLUSTER_NAME="eksprod"
AWS_REGION="us-east-1"
NODE_GROUP_NAME="eks-node-group"

echo "Connecting to cluster..."
aws eks update-kubeconfig --region "${AWS_REGION}" --name "${CLUSTER_NAME}"

echo "Getting VPC ID..."
VPC_ID=$(aws eks describe-cluster \
  --name "${CLUSTER_NAME}" \
  --region "${AWS_REGION}" \
  --query "cluster.resourcesVpcConfig.vpcId" \
  --output text)
echo "VPC ID: ${VPC_ID}"

echo "Getting Node IAM Role ARN..."
NODE_ROLE=$(aws eks describe-nodegroup \
  --cluster-name "${CLUSTER_NAME}" \
  --nodegroup-name "${NODE_GROUP_NAME}" \
  --region "${AWS_REGION}" \
  --query "nodegroup.nodeRole" \
  --output text)
echo "Node Role ARN: ${NODE_ROLE}"

echo "Adding EKS Helm repo..."
helm repo add eks https://aws.github.io/eks-charts
helm repo update eks

echo "Installing AWS Load Balancer Controller..."
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName="${CLUSTER_NAME}" \
  --set serviceAccount.create=true \
  --set region="${AWS_REGION}" \
  --set vpcId="${VPC_ID}" \
  --set "serviceAccount.annotations.eks\.amazonaws\.com/role-arn=${NODE_ROLE}"

echo "Waiting for controller to be ready..."
kubectl rollout status deployment/aws-load-balancer-controller -n kube-system --timeout=180s

echo "Verifying..."
kubectl get deployment -n kube-system aws-load-balancer-controller
kubectl get pods -n kube-system | grep aws-load-balancer-controller

echo "AWS Load Balancer Controller installed successfully."
