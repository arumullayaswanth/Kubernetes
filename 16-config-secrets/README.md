# 🚀 STEP 8: Deploy Everything 

## 1️⃣ ConfigMap

```bash
kubectl apply -f config.yml
```
## 2️⃣ Secret

```bash
kubectl apply -f secrets.yml
```
## 3️⃣ Storage

```bash
kubectl apply -f pv.yaml
kubectl apply -f pvc.yaml
```

## 4️⃣ Deployment (MySQL)

```bash
kubectl apply -f deploy.yml
```

## 5️⃣ Service

```bash
kubectl apply -f mysql-service.yaml
```

# 🔍 STEP 9: VERIFY EVERYTHING

---

## Check Pods

```bash
kubectl get pods
```

Wait until:

```
mysql-xxxx   Running
```

---

## Check PVC

```bash
kubectl get pvc
```

You should see:

```
Bound
```

---

## Check Service

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

---

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

🎤 Say:

> “Database is created using ConfigMap.”

---

# 🌍 STEP 11: EXPOSE MYSQL (OPTIONAL)

Update service:

```yaml
type: LoadBalancer
```

Apply:

```bash
kubectl apply -f mysql-service.yaml
```

Check:

```bash
kubectl get svc
```

Wait for:

```
EXTERNAL-IP
```

---

# 🔥 STEP 12: LIVE CONFIG CHANGE DEMO

```bash
kubectl edit configmap mysql-config
```

Restart:

```bash
kubectl rollout restart deployment mysql
```

---

# 🔐 STEP 13: SECRET CHANGE DEMO

```bash
kubectl edit secret mysql-secret
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

# 🎯 FINAL LINE (SAY THIS)

> “Now we are not just running Kubernetes…
> we are running production-grade infrastructure on AWS.”

---

# 🚀 NEXT LEVEL (IF YOU WANT)

I can help you with:

* 🔥 RDS instead of MySQL Pod (real production)
* 🔥 Helm charts
* 🔥 GitHub Actions CI/CD → auto deploy to EKS
* 🔥 Secrets Manager integration

---

If you want next:
👉 I’ll convert this into **YouTube Title + Thumbnail + Description (viral)**
