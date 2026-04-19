# Blue-Green Deployment Strategy

This folder demonstrates the Kubernetes Blue-Green deployment strategy.

In blue-green deployment, two versions of the application run in parallel. One version is live, and the other version is prepared separately. Traffic is switched by changing the Service selector.

## When To Use

- When you want a fast cutover
- When rollback needs to be simple and quick
- When you want to test the new version before making it live

## Files

| File | Purpose |
|---|---|
| `namespace.yaml` | Creates the `bluegreen-demo` namespace |
| `blue-green-service.yaml` | Sends traffic to either the green or blue deployment |
| `blue-green-deployment-greenreplica-v1.yaml` | Green environment with version v1 |
| `blue-green-deployment-bluereplica-v2.yaml` | Blue environment with version v2 |

## Deployment Steps

Deploy green first:

```bash
kubectl apply -f namespace.yaml
kubectl apply -f blue-green-deployment-greenreplica-v1.yaml
kubectl apply -f blue-green-service.yaml
kubectl get all -n bluegreen-demo
kubectl port-forward -n bluegreen-demo svc/blue-green-svc 8082:80
```

Open:

```text
http://localhost:8082
```

## Deploy Blue Version

```bash
kubectl apply -f blue-green-deployment-bluereplica-v2.yaml
kubectl get pods -n bluegreen-demo -l app=blue-green-app
```

## Switch Traffic To Blue

Edit `blue-green-service.yaml` and change:

```yaml
color: green
```

to:

```yaml
color: blue
```

Apply again:

```bash
kubectl apply -f blue-green-service.yaml
```

## Rollback

If the new version has an issue, change the selector back to:

```yaml
color: green
```

and apply the service file again.

## Important Point

Blue-Green gives very fast rollback because both versions exist at the same time. The traffic shift is controlled by the Service.
