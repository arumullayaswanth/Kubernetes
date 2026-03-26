# Kubernetes DaemonSet

This topic is very important in Kubernetes because a `DaemonSet` makes sure one pod runs on every node.

If a new node joins the cluster, Kubernetes automatically creates the DaemonSet pod on that new node too.

If a node is removed, the pod on that node is also removed automatically.

## Simple Definition

A `DaemonSet` is a Kubernetes workload object used to run the same pod on all nodes, or on selected nodes.

## Why We Use DaemonSet

Normally:

- `Deployment` runs a fixed number of replicas
- `StatefulSet` runs stateful applications
- `DaemonSet` runs one pod per node

This is useful when every node needs the same helper service.

## Real-Time Use Cases

Common DaemonSet use cases are:

- log collection agents like Fluentd or Fluent Bit
- monitoring agents like Node Exporter
- security agents
- storage agents
- network plugins

These tools must run on every worker node, so `DaemonSet` is the correct choice.

## How DaemonSet Works

Suppose your cluster has 3 nodes.

If you create one DaemonSet:

- node 1 gets 1 pod
- node 2 gets 1 pod
- node 3 gets 1 pod

Total pods = 3

If one more node is added:

- Kubernetes automatically creates one more DaemonSet pod on that new node

So the number of pods depends on the number of nodes.

## DaemonSet vs Deployment

`Deployment`

- you decide replica count
- example: 3 replicas, 5 replicas, 10 replicas

`DaemonSet`

- Kubernetes decides pod count based on node count
- one pod per node

## YAML Used In This Example

Your file:

`daemonset.yaml`

creates:

- a DaemonSet named `nginx`
- a pod with label `app: nginx`
- one `nginx` container on each node
- mounts host system paths `/proc` and `/sys`

## Explanation Of This YAML

### apiVersion and kind

```yaml
apiVersion: apps/v1
kind: DaemonSet
```

This tells Kubernetes that we are creating a DaemonSet resource.

### metadata

```yaml
metadata:
  name: nginx
```

This is the name of the DaemonSet.

### selector

```yaml
selector:
  matchLabels:
    app: nginx
```

The selector tells Kubernetes which pods belong to this DaemonSet.

### template

```yaml
template:
  metadata:
    labels:
      app: nginx
```

The pod labels must match the selector labels.

### container

```yaml
containers:
- name: test-nginx
  image: nginx
```

This creates one container using the `nginx` image.

### resources

```yaml
resources:
  limits:
    cpu: 100m
    memory: 200Mi
  requests:
    cpu: 50m
    memory: 100Mi
```

This defines the CPU and memory required by the pod.

- `requests` means minimum needed
- `limits` means maximum allowed

### volume mounts

```yaml
volumeMounts:
- name: proc
  mountPath: /host/proc
  readOnly: true
- name: sys
  mountPath: /host/sys
  readOnly: true
```

These lines mount node-level directories inside the container.

This is commonly used by monitoring and system-agent pods.

### hostPath volumes

```yaml
volumes:
- name: proc
  hostPath:
    path: /proc
- name: sys
  hostPath:
    path: /sys
```

This means the container gets access to the node's actual `/proc` and `/sys` directories.

## Important Point

In your YAML:

```yaml
ports:
- containerPort: 8080
```

The default `nginx` container usually listens on port `80`, not `8080`.

So for real testing:

- either change `containerPort` to `80`
- or configure nginx to listen on `8080`

This does not stop DaemonSet learning, but it is good to know.

## Commands To Practice

Create the DaemonSet:

```bash
kubectl apply -f daemonset.yaml
```

Check DaemonSet:

```bash
kubectl get daemonset
```

Check pods:

```bash
kubectl get pods -o wide
```

This `-o wide` command helps you see on which node each pod is running.

Describe DaemonSet:

```bash
kubectl describe daemonset nginx
```

Delete DaemonSet:

```bash
kubectl delete -f daemonset.yaml
```

## How To Verify The Concept

After applying the DaemonSet:

1. check your node count
2. check pod count
3. compare both

Commands:

```bash
kubectl get nodes
kubectl get pods -o wide
```

You will notice:

- each node gets one DaemonSet pod

## Interview Point

A very common interview question is:

"What is the difference between Deployment and DaemonSet?"

Best short answer:

- `Deployment` is used when we want a specific number of replicas
- `DaemonSet` is used when we want one pod on every node

## Summary

Remember this one line:

`DaemonSet = one pod per node`

Use DaemonSet when your application or agent must run on all nodes in the cluster.
