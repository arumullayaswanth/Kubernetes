# Verify EKS Install

Use this checklist after `terraform apply` finishes. These commands verify that the cluster, node group, and add-ons are actually running.

## 1) Configure kubectl

```bash
aws eks update-kubeconfig --region us-east-1 --name eksprod
```

## 2) Basic Cluster Health

```bash
kubectl cluster-info
kubectl get nodes -o wide
kubectl get pods -A
```

Expected:
- Nodes are `Ready`.
- Core system pods are `Running` or `Completed`.

## 3) EKS Add-ons

```bash
kubectl get pods -n kube-system | grep -E "coredns|kube-proxy|aws-node|eks-pod-identity-agent"
```

Expected:
- `coredns`, `kube-proxy`, `aws-node` (vpc-cni), and `eks-pod-identity-agent` are running.

## 4) EBS CSI Driver

```bash
kubectl get pods -n kube-system | grep ebs
kubectl get csidriver | grep ebs
```

Expected:
- `ebs-csi-controller` and `ebs-csi-node` pods are running.
- `ebs.csi.aws.com` appears in `csidriver`.

## 5) Cluster Autoscaler

```bash
kubectl get deployment -n kube-system cluster-autoscaler
kubectl get pods -n kube-system | grep cluster-autoscaler
kubectl logs -n kube-system deployment/cluster-autoscaler --tail=50
```

Expected:
- `cluster-autoscaler` deployment is `Available`.
- Pod is `Running`.
- Logs show `Starting main loop` and no errors.

To test scaling, create a deployment that requests more resources than available nodes can handle. Pending pods should trigger new nodes within 1-2 minutes.

## 6) AWS Load Balancer Controller

```bash
kubectl get deployment -n kube-system aws-load-balancer-controller
kubectl get pods -n kube-system | grep aws-load-balancer-controller
```

Expected:
- Deployment is `Available`.
- Controller pods are `Running`.

## 7) Node Group Verification (AWS)

```bash
aws eks list-nodegroups --cluster-name eksprod --region us-east-1
aws eks describe-nodegroup --cluster-name eksprod --nodegroup-name eks-node-group --region us-east-1
```

Expected:
- Node group status shows `ACTIVE`.

## 8) Optional: Test an Ingress (creates an ALB)

If you want to confirm the Load Balancer Controller is working end-to-end, apply a simple Ingress and check for a new ALB.

```bash
kubectl get ingress -A
aws elbv2 describe-load-balancers --region us-east-1
```

Expected:
- An ALB appears that matches your Ingress.

## Notes

- If any pods are stuck in `Pending`, check node capacity and subnet routing.
- If the controller pods crash, confirm the IAM role and OIDC provider were created.
