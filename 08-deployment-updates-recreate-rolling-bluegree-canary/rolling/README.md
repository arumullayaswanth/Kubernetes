# Rolling Update Deployment Strategy

This folder demonstrates the Kubernetes `RollingUpdate` deployment strategy.

Rolling update is the default deployment strategy in Kubernetes. It gradually replaces old pods with new pods, which helps keep the application available during the update.

## When To Use

- For most normal Kubernetes deployments
- When you want little or no downtime
- When old and new versions can run together safely

## Files

| File | Purpose |
|---|---|
| `namespace.yaml` | Creates the `rolling-demo` namespace |
| `rolling.yaml` | Creates the Service and Deployment using rolling update |

## Deployment Steps

```bash
kubectl apply -f namespace.yaml
kubectl apply -f rolling.yaml
kubectl get all -n rolling-demo
kubectl port-forward -n rolling-demo svc/rolling-svc 8081:80
```

Open:

```text
http://localhost:8081
```

## Update Demo

Change this line inside `rolling.yaml`:

```yaml
- "-text=Rolling update version v1"
```

to:

```yaml
- "-text=Rolling update version v2"
```

Apply again:

```bash
kubectl apply -f rolling.yaml
kubectl rollout status deployment/rolling-demo -n rolling-demo
kubectl get pods -n rolling-demo -w
```

## Important Point

Rolling update keeps part of the old version running while new pods are being created. That is why it is the most commonly used deployment strategy.
