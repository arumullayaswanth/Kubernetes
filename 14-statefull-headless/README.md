
# 🚀 MySQL StatefulSet Deployment with Static Volume and Headless Service

This project demonstrates how to deploy MySQL using Kubernetes StatefulSet, backed by a static PersistentVolume, and accessed via a headless Service. It uses Kubernetes Secret to manage the root password securely.

---

## 📁 Files Overview

| File Name         | Purpose                                   |
|-------------------|-------------------------------------------|
| `pv.yml`          | Defines static Persistent Volume          |
| `pvc.yml`         | Persistent Volume Claim                   |
| `secrets.yml`     | Kubernetes Secret for MySQL root password |
| `statefulset.yml` | MySQL StatefulSet and Headless Service    |

---

## 📦 Deployment Steps

### ✅ Step 1: Apply the Persistent Volume
```bash
kubectl apply -f pv.yml --kubeconfig Cluster1.config
```

### ✅ Step 2: Apply the Persistent Volume Claim
```bash
kubectl apply -f pvc.yml --kubeconfig Cluster1.config
```

### ✅ Step 3: Create the Secret for MySQL
```bash
kubectl apply -f secrets.yml --kubeconfig Cluster1.config
```

🔍 Inspect the secret:
```bash
kubectl get secret mysecret -o yaml --kubeconfig Cluster1.config
```

### ✅ Step 4: Deploy the StatefulSet and Headless Service
```bash
kubectl apply -f statefulset.yml --kubeconfig Cluster1.config
```

🔍 Check Pods:
```bash
kubectl get pods -l app=mysql --kubeconfig Cluster1.config
```

🔍 Check Service:
```bash
kubectl get svc mysql --kubeconfig Cluster1.config
```

---

## 🐚 Step 5: Access MySQL Pod

1. Get a pod name:
```bash
kubectl get pods -l app=mysql --kubeconfig Cluster1.config
```

2. Access the pod shell:
```bash
kubectl exec -it <pod-name> --kubeconfig Cluster1.config -- /bin/bash
```

3. Connect to MySQL:
```bash
mysql -u root -ppassword
```

---

## 🧩 Step 6: Insert Sample Data

### Create and use database:
```sql
CREATE DATABASE testdb;
USE testdb;
```

### Create table:
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100)
);
```

### Insert records:
```sql
INSERT INTO users (name, email) VALUES 
('Alice', 'alice@example.com'),
('Bob', 'bob@example.com');
```

### View data:
```sql
SELECT * FROM users;
```

### Exit:
```sql
exit
```

---

## 🧪 Step 7: Test Volume Persistence

1. Insert sample data.
2. Delete one MySQL pod:
```bash
kubectl delete pod <pod-name> --kubeconfig Cluster1.config
```
3. A new pod will start and attach the same volume. Reconnect to verify data persistence.

---

## 🧹 Cleanup Resources (Optional)

```bash
kubectl delete -f statefulset.yml --kubeconfig Cluster1.config
kubectl delete -f secrets.yml --kubeconfig Cluster1.config
kubectl delete -f pvc.yml --kubeconfig Cluster1.config
kubectl delete -f pv.yml --kubeconfig Cluster1.config
```

---

## 📝 Notes

- Password used: `password`, encoded as `cGFzc3dvcmQ=` in the secret.
- This setup uses `hostPath`, which works on local clusters (e.g., Minikube or self-managed nodes).
- For AWS EKS, consider using dynamic provisioning with EBS and `ebs.csi.aws.com` storage class.

---
