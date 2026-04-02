# DEPLOYMENT STEPS 


## STEP 1: Start cluster

```bash
minikube start
```

👉 Run:

```bash
kubectl apply -f .
```

## STEP 3: Check everything

```bash
kubectl get all
```

```bash
kubectl get pv
kubectl get pvc
```

## STEP 4: Check pod

```bash
kubectl get pods
```

You should see:

```
mysql-xxxxx   Running
```

---

# TESTING 

---

## 🔍 Check logs

```bash
kubectl logs <mysql-pod-name>
```
## 🔐 Login inside MySQL

```bash
kubectl exec -it <mysql-pod-name> -- bash
```

Inside container:

```bash
mysql -u root -p
```

Password:

```
password
```


## Verify database

```sql
SHOW DATABASES;
```

You should see:

```
mydb
```


# PROVE CONFIGMAP WORKING

Change ConfigMap:

```bash
kubectl edit configmap mysql-config
```

Change:

```
mydb → testdb
```

Restart:

```bash
kubectl rollout restart deployment mysql
```


# PROVE SECRET WORKING

Change Secret:

```bash
kubectl edit secret mysql-secret
```

Restart:

```bash
kubectl rollout restart deployment mysql
```


