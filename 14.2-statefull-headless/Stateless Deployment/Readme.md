

### ▶️ Command:

```bash
kubectl apply -f mysql-deployment.yml
```

## 🔍 **Step 2 — Check Pod**

```bash
kubectl get pods
```

👉 Example:

```bash
mysql-deploy-7d9f8c6b5-xk92a
```


## 🧪 **Step 3 — Insert Data (Important Proof)**

### ▶️ Command:

```bash
kubectl exec -it <pod-name> -- mysql -uroot -ppassword
```

👉 Output:

```
1 | yaswanth
```


## 💣 **Step 4 — Break the Pod**

```bash
kubectl delete pod <pod-name>
```

## 🔍 **Step 5 — Check New Pod**

```bash
kubectl get pods
```

👉 New pod:

```bash
mysql-deploy-xxxxx-new
```

## 💥 **Step 6 — Check Data Again**

```bash
kubectl exec -it <new-pod> -- mysql -uroot -ppassword
```

```sql
SHOW DATABASES;
```

👉 Our database is gone
👉 Our table is gone
👉 Our data is gone

This is exactly why Deployments fail for databases.”
