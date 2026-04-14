#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Installs the Cluster Autoscaler via Helm after terraform apply.
# Called by the GitHub Actions workflow with these env vars already set:
#   CLUSTER_NAME   - EKS cluster name
#   CA_ROLE_ARN    - IAM role ARN for the autoscaler pod identity
#   AWS_REGION     - AWS region
# ---------------------------------------------------------------------------

echo "Configuring kubectl for cluster: ${CLUSTER_NAME}"
aws eks update-kubeconfig --region "${AWS_REGION}" --name "${CLUSTER_NAME}"

echo "Waiting for all nodes to be Ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=300s

echo "Adding autoscaler Helm repo..."
helm repo add autoscaler https://kubernetes.github.io/autoscaler
helm repo update

echo "Installing Cluster Autoscaler..."
helm upgrade --install cluster-autoscaler autoscaler/cluster-autoscaler \
  --namespace kube-system \
  --set autoDiscovery.clusterName="${CLUSTER_NAME}" \
  --set awsRegion="${AWS_REGION}" \
  --set rbac.serviceAccount.name="cluster-autoscaler" \
  --set rbac.serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="${CA_ROLE_ARN}" \
  --set extraArgs.balance-similar-node-groups=true \
  --set extraArgs.skip-nodes-with-system-pods=false \
  --set extraArgs.scale-down-delay-after-add=2m \
  --set extraArgs.scale-down-unneeded-time=2m

echo "Waiting for Cluster Autoscaler deployment to be available..."
kubectl rollout status deployment/cluster-autoscaler-aws-cluster-autoscaler \
  -n kube-system --timeout=300s

echo "Verifying Cluster Autoscaler..."
kubectl get deployment -n kube-system cluster-autoscaler-aws-cluster-autoscaler
kubectl get pods -n kube-system | grep cluster-autoscaler

echo "Cluster Autoscaler installed successfully."
