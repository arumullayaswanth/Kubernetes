#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Installs cert-manager on EKS for automatic TLS certificate management.
# cert-manager issues free SSL certificates from Let's Encrypt automatically.
# ---------------------------------------------------------------------------

echo "Installing cert-manager..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

echo "Waiting for cert-manager pods to be ready..."
kubectl rollout status deployment/cert-manager -n cert-manager --timeout=120s
kubectl rollout status deployment/cert-manager-webhook -n cert-manager --timeout=120s
kubectl rollout status deployment/cert-manager-cainjector -n cert-manager --timeout=120s

echo "Verifying cert-manager pods..."
kubectl get pods -n cert-manager

echo "cert-manager installed successfully."
