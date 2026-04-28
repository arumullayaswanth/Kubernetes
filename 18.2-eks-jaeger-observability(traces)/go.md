Perfect — you’re now setting up **full auto-scaling (production-style)** 👍
I’ll give you a **clean end-to-end setup using Helm + AWS autoscaling**, step by step.

---

# 🚀 Goal

👉 When load increases:

* Pods go **Pending**
* Autoscaler detects it
* **New EC2 nodes are added automatically**
* Your app scales smoothly ✅

---

# 🧱 STEP 0: Your variables (use these)

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=123456789012
export CLUSTER_NAME=eksprod
```

---

# 🧱 STEP 1: Tag your Node Group (VERY IMPORTANT)

👉 Without this → autoscaler will NOT work ❌

In Terraform:

```hcl
tags = {
  "k8s.io/cluster-autoscaler/enabled" = "true"
  "k8s.io/cluster-autoscaler/${var.cluster_name}" = "owned"
}
```

Apply:

```bash
terraform apply
```

---

# 🧱 STEP 2: IAM Policy (for scaling EC2)

Create policy:

```bash
cat <<EOF > cluster-autoscaler-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "autoscaling:DescribeAutoScalingGroups",
        "autoscaling:DescribeAutoScalingInstances",
        "autoscaling:DescribeTags",
        "autoscaling:SetDesiredCapacity",
        "autoscaling:TerminateInstanceInAutoScalingGroup"
      ],
      "Resource": "*"
    }
  ]
}
EOF
```

Create it:

```bash
aws iam create-policy \
  --policy-name AmazonEKSClusterAutoscalerPolicy \
  --policy-document file://cluster-autoscaler-policy.json
```

---

# 🧱 STEP 3: Attach policy to node role

```bash
aws iam attach-role-policy \
  --role-name <YOUR-NODE-ROLE> \
  --policy-arn arn:aws:iam::$AWS_ACCOUNT_ID:policy/AmazonEKSClusterAutoscalerPolicy
```

---

# 🧱 STEP 4: Install using Helm (MAIN STEP)

Using Helm

```bash
helm repo add autoscaler https://kubernetes.github.io/autoscaler
helm repo update
```

---

## 🚀 Install autoscaler

```bash
helm install cluster-autoscaler autoscaler/cluster-autoscaler \
  --namespace kube-system \
  --set autoDiscovery.clusterName=$CLUSTER_NAME \
  --set awsRegion=$AWS_REGION \
  --set rbac.serviceAccount.create=true \
  --set rbac.serviceAccount.name=cluster-autoscaler \
  --set extraArgs.balance-similar-node-groups=true \
  --set extraArgs.skip-nodes-with-local-storage=false \
  --set extraArgs.skip-nodes-with-system-pods=false
```

---

# 🧱 STEP 5: Verify installation

```bash
kubectl get pods -n kube-system | grep autoscaler
```

```bash
kubectl logs -n kube-system deployment/cluster-autoscaler
```

👉 You should see:

```text
Cluster Autoscaler initialized
```

---

# 🧪 STEP 6: TEST autoscaling (IMPORTANT)

Create a heavy pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: stress-test
spec:
  containers:
  - name: stress
    image: nginx
    resources:
      requests:
        memory: "2Gi"
        cpu: "1"
```

Apply:

```bash
kubectl apply -f stress.yaml
```

---

# 🔍 Watch autoscaling happen

```bash
kubectl get nodes -w
```

👉 You will see:

```text
New node joining...
```

---

# 🎯 What happens automatically

| Situation          | Result            |
| ------------------ | ----------------- |
| Load increases     | Pods Pending      |
| Autoscaler detects | Node group scales |
| New EC2 starts     | Pod scheduled     |
| Load decreases     | Nodes removed     |

---

# ⚠️ Common mistakes (avoid these)

❌ Missing node group tags
❌ IAM policy not attached
❌ Wrong cluster name
❌ Region mismatch

---

# 🟢 Final Result

👉 YES — after this setup:

> ✅ When load increases → nodes increase automatically
> ✅ When load decreases → nodes scale down

---

# 💬 Pro-level next step

If you want:

* I can set up **HPA (Horizontal Pod Autoscaler)** also
  👉 So both **pods + nodes scale automatically**

---

Just tell me 👍
