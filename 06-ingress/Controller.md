

Without it:
- your ingress object may exist in Kubernetes
- but no AWS ALB will be created


Simple flow:
- Kubernetes ingress file -> AWS Load Balancer Controller -> ALB created in AWS

How to check if it is installed:
```bash
kubectl get deployment -n kube-system aws-load-balancer-controller
```

If installed, you should see a deployment.

Also check:
```bash
kubectl get pods -n kube-system
```

Look for pods named like:
- `aws-load-balancer-controller-...`

