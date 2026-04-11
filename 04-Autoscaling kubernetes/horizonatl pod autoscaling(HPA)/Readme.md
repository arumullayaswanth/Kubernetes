# Horizontal Pod Autoscaling (HPA)

This folder demonstrates pod-level autoscaling with Kubernetes HPA.

## What This Folder Contains

- `deploy.yml` deploys a sample `php-apache` application
- `service.yml` exposes the application using a `LoadBalancer` Service
- `hpa.yml` creates a `HorizontalPodAutoscaler` based on CPU utilization
- `test.sh` generates HTTP load against the Service

## Important Note About Your Current Cluster Status

Keep these three components separate:

1. `HPA` scales Pods
2. `Cluster Autoscaler` scales worker nodes
3. `VPA` changes Pod CPU and memory requests

In your current cluster:

- the cluster is already created
- `Cluster Autoscaler` is not installed
- `VPA` is not installed

That is okay for this HPA demo.

HPA does **not** require a separate HPA controller installation because it is part of Kubernetes control-plane behavior.
However, HPA **does require** `metrics-server`.

If `metrics-server` is missing:

- `kubectl top nodes` will fail
- `kubectl top pods` will fail
- HPA will not get CPU metrics

If `Cluster Autoscaler` is missing:

- HPA can still increase Pod replicas
- but if the cluster runs out of node capacity, new Pods may stay in `Pending` state

## End-To-End Flow

1. Install `metrics-server`
2. Verify metrics are available
3. Deploy the application
4. Expose it with a Service
5. Create the HPA resource
6. Generate traffic
7. Watch HPA scale Pods up
8. Stop traffic
9. Watch HPA scale Pods down
10. Optionally install `Cluster Autoscaler` if you also want nodes to scale automatically

## Step 1: Verify Cluster Connectivity

Run:

```bash
kubectl get nodes
kubectl get pods -A
```

You should see your worker nodes in `Ready` state.

## Step 2: Install Metrics Server

Official install:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

Verify installation:

```bash
kubectl get deployment metrics-server -n kube-system
kubectl get pods -n kube-system | grep metrics-server
```

Wait until the Metrics Server Pod is `Running`.

## Step 3: Verify Metrics Server Is Working

Run:

```bash
kubectl top nodes
kubectl top pods -A
```

If both commands return CPU and memory usage, HPA can now read metrics.

## Step 4: Deploy The Demo Application

Move into this folder and apply the Deployment:

```bash
kubectl apply -f deploy.yml
```

Verify:

```bash
kubectl get deploy
kubectl get pods -l app=php-apache
```

Expected:

- Deployment `php-apache` should be created
- one Pod should start in `Running` state

## Step 5: Expose The Application

Apply the Service:

```bash
kubectl apply -f service.yml
```

Verify:

```bash
kubectl get svc php-apache
```

If you are using AWS EKS with a public subnet-backed Service, wait until the `EXTERNAL-IP` or load balancer hostname appears.

Example:

```bash
kubectl get svc php-apache -w
```

## Step 6: Create The Horizontal Pod Autoscaler

Apply the HPA:

```bash
kubectl apply -f hpa.yml
```

Verify:

```bash
kubectl get hpa
kubectl describe hpa php-apache
```

This example is configured to:

- scale target Deployment: `php-apache`
- minimum replicas: `1`
- maximum replicas: `10`
- target CPU utilization: `50%`

## Step 7: Check Baseline Before Load Testing

Run these commands in another terminal:

```bash
kubectl get hpa -w
kubectl get pods -l app=php-apache -w
```

Before load generation, you should normally see:

- `1` replica
- current CPU below the HPA threshold

## Step 8: End-To-End HPA Load Test

Make the script executable if required:

```bash
chmod +x test.sh
```

Run the load test with your Service URL:

```bash
./test.sh http://<load-balancer-url>
```

Example:

```bash
./test.sh http://a1b2c3d4e5f6.ap-south-1.elb.amazonaws.com
```

What the script does:

- sends multiple HTTP requests in batches
- increases CPU usage in the sample app
- gives HPA enough traffic to calculate higher desired replicas

## Step 9: Observe Scale-Out

While the script is running, observe:

```bash
kubectl get hpa
kubectl get deploy php-apache
kubectl get pods -l app=php-apache
kubectl top pods
```

Expected scale-out behavior:

1. CPU rises above the `50%` target
2. HPA calculates a higher desired replica count
3. Deployment creates more Pods
4. New Pods move to `Running`

You can also inspect full HPA details:

```bash
kubectl describe hpa php-apache
```

Look for:

- current CPU utilization
- desired replicas
- scaling events

## Step 10: Test Scale-In

Stop the script with `Ctrl+C`.

Now wait a few minutes and keep watching:

```bash
kubectl get hpa -w
kubectl get pods -l app=php-apache -w
```

Expected scale-in behavior:

1. traffic stops
2. CPU usage drops
3. HPA reduces desired replicas
4. extra Pods are terminated
5. Deployment returns toward the minimum replica count

## Step 11: What To Do If Pods Stay Pending

If you see new Pods created by HPA but stuck in `Pending`, the usual reason is not an HPA problem.
It means the cluster does not have enough free node capacity.

Check:

```bash
kubectl get pods
kubectl describe pod <pending-pod-name>
```

If the event message says there are insufficient resources, you have two choices:

1. manually increase the node group size
2. install `Cluster Autoscaler`

## Step 12: Optional But Recommended For Full Autoscaling On EKS

If you want **node-level autoscaling** in addition to Pod autoscaling, install `Cluster Autoscaler`.

Important:

- on Amazon EKS, the `Cluster Autoscaler` version should match your Kubernetes cluster version
- node group auto-discovery tags must exist on your Auto Scaling Groups

### 12.1 Check Your Cluster Version

```bash
aws eks describe-cluster \
  --name <cluster-name> \
  --region <region> \
  --query "cluster.version" \
  --output text
```

Use that Kubernetes minor version when selecting the Cluster Autoscaler image tag.

### 12.2 Create IAM Policy For Cluster Autoscaler

Create a file named `cluster-autoscaler-policy.json` with:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "autoscaling:SetDesiredCapacity",
        "autoscaling:TerminateInstanceInAutoScalingGroup"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:ResourceTag/k8s.io/cluster-autoscaler/enabled": "true",
          "aws:ResourceTag/k8s.io/cluster-autoscaler/<cluster-name>": "owned"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "autoscaling:DescribeAutoScalingGroups",
        "autoscaling:DescribeAutoScalingInstances",
        "autoscaling:DescribeLaunchConfigurations",
        "autoscaling:DescribeScalingActivities",
        "ec2:DescribeImages",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeLaunchTemplateVersions",
        "ec2:GetInstanceTypesFromInstanceRequirements",
        "eks:DescribeNodegroup"
      ],
      "Resource": "*"
    }
  ]
}
```

Create the IAM policy:

```bash
aws iam create-policy \
  --policy-name AmazonEKSClusterAutoscalerPolicy \
  --policy-document file://cluster-autoscaler-policy.json
```

### 12.3 Create IAM Service Account Using `eksctl`

```bash
eksctl create iamserviceaccount \
  --cluster <cluster-name> \
  --name cluster-autoscaler \
  --namespace kube-system \
  --attach-policy-arn arn:aws:iam::<account-id>:policy/AmazonEKSClusterAutoscalerPolicy \
  --override-existing-serviceaccounts \
  --approve \
  --region <region>
```

### 12.4 Install Cluster Autoscaler With Helm

```bash
helm repo add autoscaler https://kubernetes.github.io/autoscaler
helm repo update
```

Install it:

```bash
helm upgrade --install cluster-autoscaler autoscaler/cluster-autoscaler \
  --namespace kube-system \
  --set autoDiscovery.clusterName=<cluster-name> \
  --set awsRegion=<region> \
  --set cloudProvider=aws \
  --set rbac.serviceAccount.create=false \
  --set rbac.serviceAccount.name=cluster-autoscaler \
  --set image.tag=v<your-cluster-version> \
  --set extraArgs.balance-similar-node-groups=true \
  --set extraArgs.skip-nodes-with-local-storage=false
```

Example:

- if cluster version is `1.33`, use an image tag like `v1.33.x`

### 12.5 Verify Cluster Autoscaler

```bash
kubectl get deployment cluster-autoscaler -n kube-system
kubectl get pods -n kube-system | grep cluster-autoscaler
kubectl logs -n kube-system deployment/cluster-autoscaler
```

If installed correctly, HPA scale-out that cannot fit on existing nodes can trigger node scale-up as well.

## Cleanup

```bash
kubectl delete -f hpa.yml
kubectl delete -f service.yml
kubectl delete -f deploy.yml
```

If you installed Metrics Server, Cluster Autoscaler, or other add-ons only for practice, clean them up separately based on how you installed them.

## Official References

- https://github.com/kubernetes-sigs/metrics-server
- https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- https://docs.aws.amazon.com/eks/latest/best-practices/cas.html
- https://docs.aws.amazon.com/eks/latest/userguide/autoscaling.html
