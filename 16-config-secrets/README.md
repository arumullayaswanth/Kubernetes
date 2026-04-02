# 🚀 STEP 8: Deploy Everything 

## 1️⃣ storage comes from EBS (Elastic Block Store)
```bash
kubectl apply -f storage-class.yaml
```

## 2️⃣ Secret

```bash
kubectl apply -f secrets.yml
```
```bash
kubectl get secrets
```
## 3️⃣ ConfigMap

```bash
kubectl apply -f config.yml
```
```bash
kubectl get configmap
```
## 4️⃣ Storage

```bash
kubectl apply -f pvc.yaml
```
```bash
kubectl get pvc
```

## 5️⃣ Deployment (MySQL)

```bash
kubectl apply -f deploy.yml
```
```bash
kubectl get pods
```

##  Service

```bash
kubectl apply -f mysql-service.yaml
```
```bash
kubectl get svc
```

---

# 🧪 STEP 10: TEST MYSQL (REAL PROOF 🔥)

---

## Enter Pod

```bash
kubectl exec -it <mysql-pod> -- bash
```

## Login

```bash
mysql -u root -p
```

Password:

```
password
```

---

## Check DB

```sql
SHOW DATABASES;
```
```bash
mydb
```
---

# STEP 12: TEST CONFIG CHANGE 

```bash
kubectl edit configmap mysql-config
```
Change DB name.
Restart:

```bash
kubectl rollout restart deployment mysql
```
#### VERIFY CHANGE
```bash
kubectl exec -it <new-pod> -- bash
```
```bash
mysql -u root -p
```
```bash
SHOW DATABASES;
```
```bash
newdb
```
---

# 🔐 STEP 13: SECRET CHANGE 

```bash
kubectl edit secret mysql-secret
```
change password:
```bash
kubectl rollout restart deployment mysql
```

---

# 🚨 COMMON ERRORS (VERY IMPORTANT)

---

## ❌ PVC stuck in Pending

👉 Fix:

```bash
kubectl get storageclass
```

---

## ❌ Pod CrashLoopBackOff

👉 Check:

```bash
kubectl logs <pod>
```

---

## ❌ Cannot connect to DB

👉 Service issue

---

