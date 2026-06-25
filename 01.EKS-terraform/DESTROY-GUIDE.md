# 🔥 How to Properly Destroy Everything (Stop AWS Bills)

## The Problem

`terraform destroy` only deletes what Terraform created.
But Kubernetes creates extra resources OUTSIDE Terraform:
- **EBS Volumes** (from PersistentVolumeClaims)
- **Load Balancers** (from LoadBalancer Services)
- **Security Groups** (from ALB Controller)
- **Elastic IPs** (from Gateway/ALB)

These orphaned resources keep billing you **$3-4/day** even after terraform destroy.

---

## ✅ Correct Destroy Order

### Step 1 — Delete Kubernetes Resources FIRST (before terraform destroy)

```bash
# Connect to cluster
aws eks update-kubeconfig --region us-east-1 --name eksprod

# Delete all Kubernetes resources that create AWS resources
kubectl delete svc --all -A
kubectl delete ingress --all -A
kubectl delete gateway --all -A
kubectl delete pvc --all -A
kubectl delete certificate --all -A

# Wait 2 minutes for AWS to release Load Balancers and EBS volumes
sleep 120
```

### Step 2 — Terraform Destroy

```bash
cd 01.EKS-terraform
terraform destroy -auto-approve
```

### Step 3 — Run Nuke Script (catches anything left behind)

```bash
chmod +x nuke-aws-resources.sh
./nuke-aws-resources.sh
```

---

## ⚡ CloudShell One-Liner (if you don't have the script)

Copy-paste this entire block into AWS CloudShell:

```bash
REGION=us-east-1 && echo "=== Deleting Load Balancers ===" && aws elbv2 describe-load-balancers --region $REGION --query 'LoadBalancers[].LoadBalancerArn' --output text | tr '\t' '\n' | while read lb; do [ -n "$lb" ] && aws elbv2 delete-load-balancer --region $REGION --load-balancer-arn $lb && echo "Deleted: $lb"; done && sleep 30 && echo "=== Terminating EC2 Instances ===" && aws ec2 describe-instances --region $REGION --filters "Name=instance-state-name,Values=running,stopped" --query 'Reservations[].Instances[].InstanceId' --output text | tr '\t' '\n' | while read inst; do [ -n "$inst" ] && aws ec2 terminate-instances --region $REGION --instance-ids $inst && echo "Terminated: $inst"; done && sleep 60 && echo "=== Deleting NAT Gateways ===" && aws ec2 describe-nat-gateways --region $REGION --filter "Name=state,Values=available" --query 'NatGateways[].NatGatewayId' --output text | tr '\t' '\n' | while read nat; do [ -n "$nat" ] && aws ec2 delete-nat-gateway --region $REGION --nat-gateway-id $nat && echo "Deleted: $nat"; done && sleep 60 && echo "=== Releasing Elastic IPs ===" && aws ec2 describe-addresses --region $REGION --query 'Addresses[].AllocationId' --output text | tr '\t' '\n' | while read eip; do [ -n "$eip" ] && aws ec2 release-address --region $REGION --allocation-id $eip && echo "Released: $eip"; done && echo "=== Deleting EBS Volumes ===" && aws ec2 describe-volumes --region $REGION --filters "Name=status,Values=available" --query 'Volumes[].VolumeId' --output text | tr '\t' '\n' | while read vol; do [ -n "$vol" ] && aws ec2 delete-volume --region $REGION --volume-id $vol && echo "Deleted: $vol"; done && echo "=== Deleting Snapshots ===" && aws ec2 describe-snapshots --region $REGION --owner-ids self --query 'Snapshots[].SnapshotId' --output text | tr '\t' '\n' | while read snap; do [ -n "$snap" ] && aws ec2 delete-snapshot --region $REGION --snapshot-id $snap && echo "Deleted: $snap"; done && echo "=== DONE! Verifying ===" && aws ec2 describe-volumes --region $REGION --filters "Name=status,Values=available" --query 'Volumes[].VolumeId' --output table && aws ec2 describe-addresses --region $REGION --output table && echo "✅ All clean!"
```

---

## 🛡️ Prevent Future Orphaned Resources

### Why resources get left behind:

| What creates it | What doesn't delete it | Result |
|---|---|---|
| `kubectl create svc type=LoadBalancer` | `terraform destroy` | ALB keeps running |
| Kubernetes PVC (storage) | `terraform destroy` | EBS volume keeps charging |
| ALB Ingress Controller | `terraform destroy` | Target groups, SGs left |
| cert-manager | `terraform destroy` | Secrets, EIPs left |

### Rule: ALWAYS delete K8s resources BEFORE terraform destroy

```bash
# This one command prevents 90% of orphaned resources:
kubectl delete svc --all -A && kubectl delete pvc --all -A && kubectl delete gateway --all -A && sleep 120
```

---

## 💰 Cost Reference

| Resource | Cost/Day | Cost/Month |
|---|---|---|
| 1 NAT Gateway | $1.08 | $32.40 |
| 1 Elastic IP (idle) | $0.12 | $3.60 |
| 100 GB EBS volume | $0.33 | $10.00 |
| t2.medium instance | $1.12 | $33.60 |
| ALB (idle) | $0.54 | $16.20 |

Your previous bill: 15 volumes × 100GB = $50/month + NAT + EIPs = ~$100/month wasted.

---

## 🔄 When You Want to Recreate

Just tell me "create EKS cluster" and I'll run:

```bash
cd 01.EKS-terraform
terraform init -backend-config=...
terraform apply -auto-approve
```

Everything comes back in ~15 minutes. No data loss because this is a learning/dev environment.
