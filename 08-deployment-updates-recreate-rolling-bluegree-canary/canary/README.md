# Canary Deployment Strategy

This folder demonstrates the Kubernetes Canary deployment strategy.

Canary deployment releases a new version to a small portion of traffic first. If the new version works well, traffic is gradually increased.

## When To Use

- When you want safer production releases
- When you want to limit the risk of a new version
- When you want gradual rollout instead of a full cutover

## Files

| File | Purpose |
|---|---|
| `namespace.yaml` | Creates the `canary-demo` namespace |
| `canary-service.yaml` | Shared Service that sends traffic to both versions |
| `canary-v1-deployment.yaml` | Stable version deployment |
| `canary-v2-deployment.yaml` | Canary version deployment |

## Deployment Steps

```bash
kubectl apply -f namespace.yaml
kubectl apply -f canary-service.yaml
kubectl apply -f canary-v1-deployment.yaml
kubectl apply -f canary-v2-deployment.yaml
kubectl get all -n canary-demo
kubectl port-forward -n canary-demo svc/canary-svc 8083:80
```

Open:

```text
http://localhost:8083
```

Refresh the page multiple times. Most traffic will go to v1 first, while a smaller amount reaches v2 because of the replica count difference.

## Gradual Rollout

Increase canary traffic:

```bash
kubectl scale deployment canary-v2 --replicas=2 -n canary-demo
kubectl scale deployment canary-v1 --replicas=3 -n canary-demo
```

Promote v2 fully:

```bash
kubectl scale deployment canary-v2 --replicas=5 -n canary-demo
kubectl scale deployment canary-v1 --replicas=0 -n canary-demo
```

## Rollback

```bash
kubectl scale deployment canary-v2 --replicas=0 -n canary-demo
kubectl scale deployment canary-v1 --replicas=5 -n canary-demo
```

## Important Point

This example uses replica-based traffic distribution through one Service. It is simple for learning, but advanced canary traffic control in production is usually done with Ingress controllers, service mesh, or rollout tools.
