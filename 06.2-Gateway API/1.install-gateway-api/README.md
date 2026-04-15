# How To Install Gateway API on EKS

---

## What Is Gateway API

Gateway API is the next generation of Kubernetes traffic routing.
It replaces Ingress with a more powerful and flexible set of resources.

Instead of one Ingress resource, Gateway API uses:
- `GatewayClass` — defines the type of load balancer (ALB, NGINX, etc.)
- `Gateway` — creates the actual load balancer
- `HTTPRoute` — defines the routing rules (which path goes to which service)

---

## Pre-Requirements

Before installing, make sure you have:

- EKS cluster running (`kubectl get nodes` works)
- Helm installed
- AWS CLI configured
- AWS Load Balancer Controller installed (see step 2)

---

## Step 1 — Install Gateway API CRDs

Gateway API is not built into Kubernetes by default.
You must install the Custom Resource Definitions (CRDs) first.

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/standard-install.yaml
```

Verify CRDs are installed:

```bash
kubectl get crd | grep gateway
```

Expected output:

```
gatewayclasses.gateway.networking.k8s.io
gateways.gateway.networking.k8s.io
httproutes.gateway.networking.k8s.io
referencegrants.gateway.networking.k8s.io
```

If you see these 4 CRDs — Gateway API is installed successfully.

---

## Step 2 — Install AWS Load Balancer Controller With Gateway API Enabled

The AWS Load Balancer Controller must be installed with Gateway API support enabled.
Permissions come from the EC2 node instance profile — no OIDC or service account annotation needed.

```bash
CLUSTER_NAME="eksprod"
AWS_REGION="us-east-1"

# Connect to cluster
aws eks update-kubeconfig --region "${AWS_REGION}" --name "${CLUSTER_NAME}"

# Fetch VPC ID automatically from your cluster
VPC_ID=$(aws eks describe-cluster \
  --name "${CLUSTER_NAME}" \
  --region "${AWS_REGION}" \
  --query "cluster.resourcesVpcConfig.vpcId" \
  --output text)
echo "VPC ID: ${VPC_ID}"

# Add Helm repo
helm repo add eks https://aws.github.io/eks-charts
helm repo update eks

# Install controller with Gateway API enabled
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName="${CLUSTER_NAME}" \
  --set serviceAccount.create=true \
  --set region="${AWS_REGION}" \
  --set vpcId="${VPC_ID}" \
  --set enableGatewayAPI=true
```

Verify controller is running:

```bash
kubectl get pods -n kube-system | grep aws-load-balancer-controller
```

Expected — 2 pods Running:

```
aws-load-balancer-controller-xxxx   1/1   Running   0
aws-load-balancer-controller-yyyy   1/1   Running   0
```

Do NOT continue until both pods are Running.

---

## Step 3 — Verify GatewayClass Is Created

After the controller starts, it automatically creates a GatewayClass named `alb`.

```bash
kubectl get gatewayclass
```

Expected:

```
NAME   CONTROLLER                            ACCEPTED
alb    ingress.k8s.aws/alb                   True
```

If `ACCEPTED` shows `True` — the controller is ready to handle Gateway resources.

---

## Step 4 — Verify Everything Is Ready

Run all these checks:

```bash
# Check CRDs
kubectl get crd | grep gateway

# Check controller pods
kubectl get pods -n kube-system | grep aws-load-balancer-controller

# Check GatewayClass
kubectl get gatewayclass

# Check controller logs for any errors
kubectl logs -n kube-system deployment/aws-load-balancer-controller --tail=20
```

If all checks pass — Gateway API is fully installed and ready to use.

---

## Step 5 — Test With A Simple Gateway

Apply the Gateway and HTTPRoute from the parent folder:

```bash
kubectl apply -f ../deployment.yaml
kubectl apply -f ../service.yaml
kubectl apply -f ../gateway.yaml
kubectl apply -f ../httproute.yaml
```

Check Gateway status:

```bash
kubectl get gateway paytam-gateway
```

Wait 2-3 minutes. Expected:

```
NAME             CLASS   ADDRESS                                          PROGRAMMED
paytam-gateway   alb     k8s-default-paytamga-xxxx.elb.amazonaws.com     True
```

`PROGRAMMED = True` means the ALB was created successfully in AWS.

---

## Uninstall Gateway API

Remove all Gateway API resources first:

```bash
kubectl delete httproute --all
kubectl delete gateway --all
```

Uninstall the controller:

```bash
helm uninstall aws-load-balancer-controller -n kube-system
```

Remove Gateway API CRDs:

```bash
kubectl delete -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/standard-install.yaml
```

---

## Troubleshooting

### GatewayClass not showing ACCEPTED = True

Controller is not running or Gateway API flag was not set.
Reinstall with `--set enableGatewayAPI=true`.

### Gateway ADDRESS is empty after 5 minutes

Check controller logs:

```bash
kubectl logs -n kube-system deployment/aws-load-balancer-controller --tail=100
```

### no EC2 IMDS role found — failed to refresh cached credentials

The worker role does not have ALB permissions.
Make sure `ElasticLoadBalancingFullAccess` and `AmazonEC2FullAccess` are attached to `eks-worker-role` in Terraform and terraform apply has been run.

### AccessDenied — not authorized to perform sts:AssumeRoleWithWebIdentity

Same fix — attach the policies to the worker role and rerun terraform apply.
No OIDC or service account annotation needed.

### CRDs not found error when applying gateway.yaml

You skipped Step 1. Install the CRDs first:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/standard-install.yaml
```
