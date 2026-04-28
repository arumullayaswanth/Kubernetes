# Deploy Guide

## Current Two-Service Deployment

Use this section for the current codebase.

The current app has 2 microservices:

1. `checkout-service`
   Public service behind ingress.
2. `inventory-service`
   Internal service called by `checkout-service`.

Current trace flow:

1. browser -> `checkout-service`
2. `checkout-service` -> `inventory-service`
3. both services -> OpenTelemetry Collector
4. OpenTelemetry Collector -> Jaeger
5. Jaeger -> Elasticsearch -> EBS

Important:

- this is the active deployment flow
- this repo uses `Elasticsearch + EBS`
- this repo does not use OpenSearch
- this repo does not require IAM role annotations for the current app flow

## Quick Flow

If you want the short version, remember this order:

1. check cluster tools
2. check ALB controller
3. check EBS CSI driver
4. check ACM certificate
5. build and push 2 images
6. update app images and ingress values
7. create namespace
8. deploy Elasticsearch
9. install Jaeger
10. deploy OTel Collector
11. deploy both microservices
12. deploy ingress
13. point DNS to ALB
14. test app, logs, and traces

## Before You Start

You need these things ready first:

- one working AWS EKS cluster
- `kubectl` working for that cluster
- `helm` installed
- Docker installed
- AWS CLI configured
- two ECR repositories
- AWS Load Balancer Controller already installed in EKS, or install it in Step 3
- one ACM certificate already in `ISSUED` state
- Amazon EBS CSI driver already installed in the EKS cluster, or install it in Step 4
- DNS access in Route 53 or another DNS provider

## Step 1: Open The Project Folder

Run:

```bash
cd "c:\Users\Yaswanth Reddy\OneDrive - vitap.ac.in\Desktop\Distributed Tracing with Jaeger\eks-jaeger-observability"
```

## Step 2: Check The Basic Tools

Run:

```bash
kubectl config current-context
kubectl get nodes
helm version
docker version
aws sts get-caller-identity
```

Good result:

- `kubectl` points to the correct EKS cluster
- nodes are visible
- `helm`, `docker`, and `aws` commands work

If one of these fails, fix it first, then continue.

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

## Step 4: Check Amazon EBS CSI Driver

Elasticsearch stores data on EBS.
So the EBS CSI driver must be running.

Check it:

```bash
kubectl get pods -n kube-system | grep ebs-csi
```

Good result:

- EBS CSI controller pods are running
- EBS CSI node pods are running

If it is missing, install it:

```bash
eksctl create addon \
  --name aws-ebs-csi-driver \
  --cluster <your-cluster-name> \
  --region <your-region> \
  --force
```

Verify again:

```bash
kubectl get pods -n kube-system | grep ebs-csi
```

## Step 5: Check The ACM Certificate

Your ingress uses HTTPS.
So the certificate must already exist and be in `ISSUED` state.

Check it:

```bash
aws acm list-certificates --region <your-region>
aws acm describe-certificate \
  --region <your-region> \
  --certificate-arn <your-acm-certificate-arn>
```

Good result:

- certificate status is `ISSUED`
- the certificate includes your Jaeger domain
- the certificate includes your app domain

Example:

- Jaeger domain: `jaeger.mydomain.com`
- app domain: `tracing-demo.mydomain.com`

## Step 6: Log In To ECR

Set these values first:

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=123456789012
```

Check you are using the expected AWS account:

```bash
aws sts get-caller-identity
```

Optional: create repositories if they do not exist yet:

```bash
aws ecr create-repository --repository-name checkout-service --region $AWS_REGION
aws ecr create-repository --repository-name inventory-service --region $AWS_REGION
```

Login to ECR:

```bash
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

If this works, Docker can push your images to ECR.

## Step 7: Build And Push Checkout-Service Image

Set checkout image tag:

```bash
export CHECKOUT_IMAGE=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/checkout-service:1.0.0
```

Build and push:

```bash
cd app/checkout-service
docker build -t $CHECKOUT_IMAGE .
docker push $CHECKOUT_IMAGE
cd ../..
```

Quick verify:

```bash
aws ecr describe-images \
  --repository-name checkout-service \
  --region $AWS_REGION \
  --query 'imageDetails[].imageTags' \
  --output table
```

## Step 8: Build And Push Inventory-Service Image

Run:

```bash
cd app/inventory-service
docker build -t <your-inventory-ecr-image> .
docker push <your-inventory-ecr-image>
cd ../..
```

Example:

```bash
cd app/inventory-service
docker build -t 123456789012.dkr.ecr.us-east-1.amazonaws.com/inventory-service:1.0.0 .
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/inventory-service:1.0.0
cd ../..
```

## Step 9: Update The Files Before Deployment

You must update these files before you deploy:

1. `manifests/app/checkout-service-deployment.yaml`
2. `manifests/app/inventory-service-deployment.yaml`
3. `manifests/ingress/ingress.yaml`

### Step 9.1: Update Checkout Image

Open:

`manifests/app/checkout-service-deployment.yaml`

Replace:

```yaml
image: "<your-checkout-ecr-image>"
```

With your real image.

Example:

```yaml
image: "123456789012.dkr.ecr.us-east-1.amazonaws.com/checkout-service:1.0.0"
```

### Step 9.2: Update Inventory Image

Open:

`manifests/app/inventory-service-deployment.yaml`

Replace:

```yaml
image: "<your-inventory-ecr-image>"
```

With your real image.

Example:

```yaml
image: "123456789012.dkr.ecr.us-east-1.amazonaws.com/inventory-service:1.0.0"
```

### Step 9.3: Update Ingress Values

Open:

`manifests/ingress/ingress.yaml`

Replace:

```yaml
alb.ingress.kubernetes.io/certificate-arn: "<your-acm-certificate-arn>"
```

Replace:

```yaml
- host: "<your-jaeger-domain>"
```

Replace:

```yaml
- host: "<your-app-domain>"
```

Example:

```yaml
alb.ingress.kubernetes.io/certificate-arn: "arn:aws:acm:us-east-1:123456789012:certificate/abcd-1234"
```

```yaml
- host: "jaeger.mydomain.com"
```

```yaml
- host: "tracing-demo.mydomain.com"
```

## Step 10: Optional Elasticsearch Size Change

If you want to change storage size, update:

`manifests/elasticsearch/statefulset.yaml`

Look for:

```yaml
resources:
  requests:
    storage: 100Gi
```

Change it only if you need to.

Current storage settings:

- StorageClass name: `jaeger-elasticsearch-gp2`
- EBS type: `gp2`

## Step 11: Create The Namespace

Run:

```bash
kubectl apply -f manifests/base/namespace.yaml
```

Check:

```bash
kubectl get ns observability
```

Good result:

- `observability` namespace exists

## Step 12: Deploy Elasticsearch

Apply these files in this exact order:

```bash
kubectl apply -f manifests/elasticsearch/storageclass.yaml
kubectl apply -f manifests/elasticsearch/headless-service.yaml
kubectl apply -f manifests/elasticsearch/service.yaml
kubectl apply -f manifests/elasticsearch/pdb.yaml
kubectl apply -f manifests/elasticsearch/statefulset.yaml
```

Check Elasticsearch:

```bash
kubectl get sts -A | grep elasticsearch
kubectl -n observability get svc elasticsearch
kubectl -n observability get pvc
kubectl -n observability get pods -l app.kubernetes.io/name=elasticsearch
```

Wait until:

- the PVCs are `Bound`
- Elasticsearch pods are `Running`

If pods stay in `Pending`, check the EBS CSI driver first.

## Step 13: Install Jaeger

Add the repo:

```bash
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo update
```

Install Jaeger:
```bash
cd helm
```
```bash
helm upgrade --install jaeger jaegertracing/jaeger \
  --namespace observability \
  --create-namespace \
  --version 3.4.1 \
  -f jaeger-values.yaml
```

Check Jaeger:

```bash
kubectl -n observability get pods
kubectl -n observability get svc
```

Good result:

- Jaeger collector pods are running
- Jaeger query pods are running
- Jaeger services are present

## Step 14: Deploy OpenTelemetry Collector
Install metrics server

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```
Verify installation

```bash
kubectl get pods -n kube-system
```
youe will see this
```
metrics-server-xxxxx   Running
```
Test metrics

```bash
kubectl top nodes
kubectl top pods
```
 If you see CPU/memory values →  ready for HPA



Run:

```bash
kubectl apply -f manifests/otel-collector/
```

Check:

```bash
kubectl -n observability rollout status deployment/otel-collector
kubectl -n observability get svc otel-collector
kubectl -n observability get hpa otel-collector
```

Good result:

- the collector deployment becomes ready
- the service exists

## Step 15: Deploy Both Microservices

Run:

```bash
kubectl apply -f manifests/app/
```

Check the rollout:

```bash
kubectl -n observability rollout status deployment/checkout-service
kubectl -n observability rollout status deployment/inventory-service
```

Check services and HPA:

```bash
kubectl -n observability get svc checkout-service
kubectl -n observability get svc inventory-service
kubectl -n observability get hpa
kubectl -n observability get pods -l app.kubernetes.io/component=application
```

Good result:

- both deployments are ready
- both services exist

## Step 16: Deploy The Ingress

Run:

```bash
kubectl apply -f manifests/ingress/ingress.yaml
```

Check:

```bash
kubectl -n observability get ingress
kubectl -n observability describe ingress observability-alb
```

Wait until the ingress shows an address.

That address is the ALB DNS name.

## Step 17: Point DNS To The ALB

After the ingress is created, get the ALB hostname:

```bash
kubectl -n observability get ingress observability-alb
```

Now create DNS records.

If your real domain is `mydomain.com`, create:

1. `jaeger.mydomain.com`
2. `tracing-demo.mydomain.com`

In Route 53:

- create an `A` record for `jaeger`
- create an `A` record for `tracing-demo`
- set `Alias = Yes`
- point both records to the same ALB

Final result:

- `jaeger.mydomain.com` -> ALB
- `tracing-demo.mydomain.com` -> ALB

Do not test browser URLs until DNS resolves correctly.

## Step 18: First Test Inside The Cluster

Before browser testing, first test both services with port-forward.

### Step 18.1: Test Checkout-Service

Run:

```bash
kubectl -n observability port-forward svc/checkout-service 8080:80
```

Open another terminal and run:

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/readyz
curl http://localhost:8080/
curl http://localhost:8080/work
```

Expected:

- `/healthz` returns `{"status":"ok"}`
- `/readyz` returns `{"status":"ready"}`
- `/` returns checkout-service JSON
- `/work` returns order JSON and includes inventory data

### Step 18.2: Test Inventory-Service

Run:

```bash
kubectl -n observability port-forward svc/inventory-service 8081:80
```

Open another terminal and run:

```bash
curl http://localhost:8081/healthz
curl http://localhost:8081/readyz
curl http://localhost:8081/
curl http://localhost:8081/reserve
```

Expected:

- `/healthz` returns `{"status":"ok"}`
- `/readyz` returns `{"status":"ready"}`
- `/` returns inventory-service JSON
- `/reserve` returns reservation JSON

If these internal tests fail, fix them before testing the ALB URL.

## Step 19: Test Through The Browser

Open:

```text
curl -I https://tracing.tagent.cfd/
curl -I https://tracing.tagent.cfd/work
https://tracing.tagent.cfd/
https://tracing.tagent.cfd/work

curl -I https://jaeger.tagent.cfd/
https://jaeger.tagent.cfd/
```

Expected:

- app root opens
- app `/work` opens
- Jaeger UI opens

The most important path is:

```text
https://tracing.tagent.cfd/work
```

Because it creates a distributed trace across both microservices.

## Step 20: Generate More Trace Traffic

Run these commands a few times:

```bash
curl https://tracing.tagent.cfd/
curl https://tracing.tagent.cfd/work
curl https://tracing.tagent.cfd/work
curl https://tracing.tagent.cfd/work
```
or
```bash
# 1) Generate traffic to create traces
for i in {1..20}; do curl -sk https://tracing.tagent.cfd/work > /dev/null; done
for i in {1..20}; do curl -sk https://tracing.tagent.cfd/ > /dev/null; done
```
Why this matters:

1. request enters `checkout-service`
2. `checkout-service` calls `inventory-service`
3. both services send spans to OTel Collector
4. collector exports traces to Jaeger
5. Jaeger stores traces in Elasticsearch

## Step 21: Verify Traces In Jaeger

Open:

```text
https://jaeger.tagent.cfd/
```

Then do this:

1. choose service `checkout-service`
2. click `Find Traces`
3. open one trace
4. go back
5. choose service `inventory-service`
6. click `Find Traces`

Good result:

- traces exist for both services
- one request chain shows both services in the same distributed trace

## Step 22: Check Logs

Check checkout-service logs:

```bash
kubectl -n observability logs deployment/checkout-service
```

Check inventory-service logs:

```bash
kubectl -n observability logs deployment/inventory-service
```

Check collector logs:

```bash
kubectl -n observability logs deployment/otel-collector
```

Check Jaeger logs:

```bash
kubectl -n observability logs deployment/jaeger-query
kubectl -n observability logs deployment/jaeger-collector
```

Good result:

- app logs are printing JSON logs
- collector does not show exporter errors
- Jaeger does not show Elasticsearch storage errors

## Step 23: If Something Does Not Work

Use these commands one by one.

Check all pods:

```bash
kubectl -n observability get pods
```

Describe the failing pod:

```bash
kubectl -n observability describe pod <pod-name>
```

Check recent events:

```bash
kubectl -n observability get events --sort-by=.metadata.creationTimestamp
```

Check services:

```bash
kubectl -n observability get svc
```

Check ingress:

```bash
kubectl -n observability describe ingress observability-alb
```

Check Elasticsearch:

```bash
kubectl -n observability get pvc
kubectl -n observability logs -l app.kubernetes.io/name=elasticsearch --tail=100
```

Most common issues:

- wrong image name or wrong image tag
- ACM certificate ARN is wrong
- DNS record is wrong
- ALB controller is missing
- EBS CSI driver is missing
- Elasticsearch is not ready yet

## Step 24: Final Success Checklist

Your deployment is correct when all of these are true:

- namespace `observability` exists
- Elasticsearch pods are running
- Elasticsearch PVCs are bound
- Jaeger is running
- OTel Collector is running
- `checkout-service` is running
- `inventory-service` is running
- ingress has an ALB address
- DNS points to the ALB
- `https://<your-app-domain>/work` works
- Jaeger UI opens
- traces are visible for both services

## Step 25: Full Deploy Commands Together

Use this order:

```bash
kubectl apply -f manifests/base/namespace.yaml
kubectl apply -f manifests/elasticsearch/storageclass.yaml
kubectl apply -f manifests/elasticsearch/headless-service.yaml
kubectl apply -f manifests/elasticsearch/service.yaml
kubectl apply -f manifests/elasticsearch/pdb.yaml
kubectl apply -f manifests/elasticsearch/statefulset.yaml
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo update
helm upgrade --install jaeger jaegertracing/jaeger --namespace observability --version 3.4.1 -f helm/jaeger-values.yaml
kubectl apply -f manifests/otel-collector/
kubectl apply -f manifests/app/
kubectl apply -f manifests/ingress/ingress.yaml
kubectl -n observability get pods
kubectl -n observability get ingress
```

## Step 26: Remove Everything Later

If you want to remove this setup later:

```bash
kubectl delete -f manifests/ingress/ingress.yaml
kubectl delete -f manifests/app/
kubectl delete -f manifests/otel-collector/
helm uninstall jaeger -n observability
kubectl delete -f manifests/elasticsearch/statefulset.yaml
kubectl delete -f manifests/elasticsearch/pdb.yaml
kubectl delete -f manifests/elasticsearch/service.yaml
kubectl delete -f manifests/elasticsearch/headless-service.yaml
kubectl delete -f manifests/elasticsearch/storageclass.yaml
kubectl delete -f manifests/base/namespace.yaml
```
