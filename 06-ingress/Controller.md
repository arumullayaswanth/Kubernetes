

Without it:
- your ingress object may exist in Kubernetes
- but no AWS ALB will be created
- so `jaeger` and `tracing-demo` URLs will not open

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

If it is not installed:
- you must install it first
- then your ingress file will work

If you want, I can add one small section in [deploy.md](c:\Users\Yaswanth Reddy\OneDrive - vitap.ac.in\Desktop\Distributed Tracing with Jaeger\eks-jaeger-observability\deploy.md) called `Step 0: Check AWS Load Balancer Controller`.
