

---

# **1. Check Current Cluster Version (Before Upgrade)**

```bash
aws eks describe-cluster \
  --name eksupgrade \
  --region us-east-1 \
  --query "cluster.version"
```

```bash
kubectl version --short
```


# **5. Validate Node Versions**

```bash
kubectl get nodes -o wide
```

You should see updated **Kubernetes versions** for each node.

---



# **7. Validate Add-on Versions**

```bash
kubectl get pods -n kube-system
```

You should see:

* coredns pods recreated
* kube-proxy DaemonSet updated
* aws-node updated

---

# **8. Final Verification Test**

### Test cluster health:

```bash
kubectl get componentstatuses
```

### Test workload scheduling:

```bash
kubectl run nginx-test \
  --image=nginx \
  --restart=Never
```

Check pod:

```bash
kubectl get pod nginx-test -o wide
```

Delete test pod:

```bash
kubectl delete pod nginx-test
```

---

# **9. (Optional) Delete Cluster After Testing**

```bash
eksctl delete cluster \
  --name eksupgrade \
  --region us-east-1
```

---

