# Recreate Deployment Strategy

This folder demonstrates the Kubernetes `Recreate` deployment strategy.

In recreate strategy, Kubernetes removes all old pods first and only then creates the new pods. This is simple to understand, but it can cause downtime during the update.

## When To Use

- When short downtime is acceptable
- When old and new versions cannot run together
- When the application needs a full restart before the new version starts

## Files

| File | Purpose |
|---|---|
| `namespace.yaml` | Creates the `recreate-demo` namespace |
| `recreate.yaml` | Creates the Service and Deployment using `Recreate` strategy |

## Deployment Steps

```bash
kubectl apply -f namespace.yaml
kubectl apply -f recreate.yaml
kubectl get all -n recreate-demo
kubectl port-forward -n recreate-demo svc/recreate-svc 8080:80
```

Open:

```text
http://localhost:8080
```

## Update Demo

Change this line inside `recreate.yaml`:

```yaml
- "-text=Recreate deployment version v1"
```

to:

```yaml
- "-text=Recreate deployment version v2"
```

Apply again:

```bash
kubectl apply -f recreate.yaml
kubectl rollout status deployment/recreate-demo -n recreate-demo
```

## Important Point

During the update, old pods are terminated before new pods become ready. That is why recreate is simple but not zero-downtime.
