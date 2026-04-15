#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Installs the AWS Load Balancer Controller on EKS.
# Permissions come from the EC2 node instance profile — no OIDC needed.
# Run this script from your EC2 jump box.
# ---------------------------------------------------------------------------

CLUSTER_NAME="eksprod"
AWS_REGION="us-east-1"

echo "Connecting to cluster: ${CLUSTER_NAME}"
aws eks update-kubeconfig --region "${AWS_REGION}" --name "${CLUSTER_NAME}"

echo "Getting VPC ID..."
VPC_ID=$(aws eks describe-cluster \
  --name "${CLUSTER_NAME}" \
  --region "${AWS_REGION}" \
  --query "cluster.resourcesVpcConfig.vpcId" \
  --output text)
echo "VPC ID: ${VPC_ID}"

echo "Adding EKS Helm repo..."
helm repo add eks https://aws.github.io/eks-charts
helm repo update eks

echo "Installing AWS Load Balancer Controller..."
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName="${CLUSTER_NAME}" \
  --set serviceAccount.create=true \
  --set region="${AWS_REGION}" \
  --set vpcId="${VPC_ID}"

echo "Waiting for controller to be ready..."
kubectl rollout status deployment/aws-load-balancer-controller -n kube-system --timeout=180s

echo "Verifying..."
kubectl get deployment -n kube-system aws-load-balancer-controller
kubectl get pods -n kube-system | grep aws-load-balancer-controller

echo "AWS Load Balancer Controller installed successfully."
