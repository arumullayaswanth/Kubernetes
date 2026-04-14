## ✅ Kubernetes Deployment Steps (Namespace: dev)

### Apply LimitRange

```bash
kubectl apply -f limitrange.yaml
```

### Verify LimitRange

```bash
kubectl get limitrange -n dev
kubectl describe limitrange dev-limit-range -n dev
```

### Apply Deployment

```bash
kubectl apply -f deployment.yaml
```

### Check Pods

```bash
kubectl get pods -n dev
kubectl describe pod -n dev
```

### Apply Service

```bash
kubectl apply -f service.yaml
```

### Verify Service

```bash
kubectl get svc -n dev
kubectl describe svc paytam-service -n dev
```
- Access Application
