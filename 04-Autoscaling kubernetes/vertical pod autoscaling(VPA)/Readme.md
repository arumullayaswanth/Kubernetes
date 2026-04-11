# Vertical Pod Autoscaling (VPA)

This folder demonstrates vertical autoscaling for a sample Deployment using Kubernetes VPA.

## What This Folder Contains

- `deploy.yml` deploys a sample workload named `hamster`
- `pdb.yml` creates a `PodDisruptionBudget` so VPA recreations do not take down every Pod at once
- `vpa.yml` creates a `VerticalPodAutoscaler` resource for the `hamster` Deployment

## Important Note About Your Current Cluster Status

In your current cluster:

- the cluster is already created
- `Cluster Autoscaler` is not installed
- `VPA` is not installed

For this VPA demo, that means:

- you must install `metrics-server`
- you must install VPA components before applying `vpa.yml`

Without VPA components:

- `kubectl apply -f vpa.yml` will fail because the `VerticalPodAutoscaler` CRD does not exist

Without `metrics-server`:

- VPA will not have the metrics it needs to calculate recommendations correctly

Without `Cluster Autoscaler`:

- VPA may increase resource requests
- if the new Pod requests do not fit on current nodes, replacement Pods may stay pending until you manually increase node capacity

## End-To-End Flow

1. Verify cluster access
2. Install `metrics-server`
3. Install VPA components
4. Verify VPA system Pods
5. Deploy the sample application
6. Create the `PodDisruptionBudget`
7. Create the VPA resource
8. Wait for recommendations to appear
9. Observe Pod recreation and updated resource requests
10. Clean up the demo

## Step 1: Verify Cluster Connectivity

Run:

```bash
kubectl get nodes
kubectl get pods -A
```

You should see your worker nodes in `Ready` state.

## Step 2: Install Metrics Server

Install Metrics Server:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

Verify:

```bash
kubectl get deployment metrics-server -n kube-system
kubectl get pods -n kube-system | grep metrics-server
kubectl top nodes
kubectl top pods -A
```

Do not continue until `kubectl top` works.

## Step 3: Install VPA Components

VPA is not built into Kubernetes by default.
The official upstream installation method is to clone the autoscaler repository and run the install script.

```bash
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh
```

What this installs:

- VPA CRDs
- VPA recommender
- VPA updater
- VPA admission controller

## Step 4: Verify VPA Installation

Run:

```bash
kubectl get crd | grep verticalpodautoscalers
kubectl get pods -n kube-system | grep vpa
```

Expected:

- the `verticalpodautoscalers.autoscaling.k8s.io` CRD should exist
- VPA Pods should be running in `kube-system`

You can also check:

```bash
kubectl get deployment -n kube-system
```

Look for deployments related to:

- `vpa-recommender`
- `vpa-updater`
- `vpa-admission-controller`

## Step 5: Deploy The Sample Workload

Apply the Deployment:

```bash
kubectl apply -f deploy.yml
```

Verify:

```bash
kubectl get deploy hamster
kubectl get pods -l app=hamster
```

This sample continuously consumes CPU, so VPA has changing workload data to analyze.

## Step 6: Apply The PodDisruptionBudget

Apply:

```bash
kubectl apply -f pdb.yml
```

Verify:

```bash
kubectl get pdb
kubectl describe pdb hamster-pdb
```

Why this matters:

- this example uses `Recreate` mode
- VPA may evict Pods and recreate them with new resource requests
- the PDB helps keep at least one Pod available during that process

## Step 7: Create The Vertical Pod Autoscaler

Apply:

```bash
kubectl apply -f vpa.yml
```

Verify:

```bash
kubectl get vpa
kubectl describe vpa hamster-vpa
```

This VPA is configured to:

- target Deployment: `hamster`
- use `Recreate` update mode
- keep `minReplicas: 2`
- allow CPU between `100m` and `1`
- allow memory between `50Mi` and `500Mi`

## Step 8: Observe Recommendations

Wait a few minutes, then run:

```bash
kubectl get vpa
kubectl describe vpa hamster-vpa
```

You should start seeing recommendation data under the VPA status.

You can also watch the Pods:

```bash
kubectl get pods -l app=hamster -w
kubectl top pods
```

## Step 9: End-To-End VPA Testing

This example does not need a separate load-testing script because the container already runs a CPU loop:

```bash
while true; do timeout 0.5s yes >/dev/null; sleep 0.5s; done
```

That means the workload itself generates CPU usage continuously.

### 9.1 Check Initial Resource Requests

Before VPA updates anything, inspect one Pod:

```bash
kubectl describe pod <hamster-pod-name>
```

You should initially see requests close to:

- CPU: `100m`
- Memory: `50Mi`

### 9.2 Wait For VPA Recommendation

Keep checking:

```bash
kubectl describe vpa hamster-vpa
```

Look for:

- target recommendation
- lower bound
- upper bound

### 9.3 Observe Pod Recreation

Because the update mode is `Recreate`, VPA may evict and recreate Pods when it decides a meaningful resource change is needed.

Watch:

```bash
kubectl get pods -l app=hamster -w
```

Expected behavior:

1. VPA computes a recommendation
2. VPA updater decides Pods should be recreated
3. one Pod terminates and a replacement Pod starts
4. the new Pod starts with updated requests
5. because a PDB exists, the rollout is safer

### 9.4 Verify Updated Requests

After recreation, inspect the new Pod:

```bash
kubectl describe pod <new-hamster-pod-name>
```

Compare the `Requests` section before and after VPA action.

You can also check:

```bash
kubectl get pod <new-hamster-pod-name> -o yaml
```

## Step 10: Troubleshooting

### If `kubectl apply -f vpa.yml` fails

Reason:

- VPA CRD is not installed yet

Fix:

- install VPA components first using `./hack/vpa-up.sh`

### If no recommendation appears

Check:

```bash
kubectl top pods
kubectl get pods -n kube-system | grep vpa
kubectl describe vpa hamster-vpa
```

Possible causes:

- `metrics-server` is missing
- VPA Pods are not running
- not enough observation time has passed

### If recreated Pods stay pending

Reason:

- new requests may not fit on current nodes
- `Cluster Autoscaler` is not installed in your cluster

Fix:

1. manually increase worker node capacity
2. or install `Cluster Autoscaler`

## Optional: Why Cluster Autoscaler Still Matters For VPA

VPA changes Pod resource requests.
If VPA increases CPU or memory requests and the current nodes do not have enough free space, the new Pods may not schedule.

That is why in production it is common to combine:

- `HPA` for Pod count
- `VPA` for right-sizing requests
- `Cluster Autoscaler` for node capacity

## Cleanup

```bash
kubectl delete -f vpa.yml
kubectl delete -f pdb.yml
kubectl delete -f deploy.yml
```

If you installed VPA only for practice and want to remove the VPA system components too, run the upstream uninstall command from the cloned repository:

```bash
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-down.sh
```

## Official References

- https://github.com/kubernetes-sigs/metrics-server
- https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler
- https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/installation.md
- https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
