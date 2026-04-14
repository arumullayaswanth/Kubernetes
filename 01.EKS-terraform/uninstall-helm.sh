#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Uninstalls all Helm releases before terraform destroy.
# Called by the GitHub Actions workflow with these env vars already set:
#   CLUSTER_NAME   - EKS cluster name
#   AWS_REGION     - AWS region
# ---------------------------------------------------------------------------

echo "Checking if cluster exists: ${CLUSTER_NAME}"
if ! aws eks describe-cluster --name "${CLUSTER_NAME}" --region "${AWS_REGION}" >/dev/null 2>&1; then
  echo "Cluster ${CLUSTER_NAME} not found. Skipping Helm uninstall."
  exit 0
fi

echo "Configuring kubectl for cluster: ${CLUSTER_NAME}"
aws eks update-kubeconfig --region "${AWS_REGION}" --name "${CLUSTER_NAME}"

echo "Uninstalling cluster-autoscaler..."
helm uninstall cluster-autoscaler --namespace kube-system --ignore-not-found || true

echo "Uninstalling all other Helm releases..."
helm list -A -o json 2>/dev/null \
  | jq -r '.[] | .name + " " + .namespace' \
  | while read -r RELEASE NS; do
      [ -z "${RELEASE}" ] && continue
      echo "Uninstalling: ${RELEASE} in namespace: ${NS}"
      helm uninstall "${RELEASE}" --namespace "${NS}" --ignore-not-found || true
    done || true

echo "Helm uninstall complete."
