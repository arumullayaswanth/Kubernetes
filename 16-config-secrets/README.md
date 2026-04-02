# 🚀 PART 4: DEPLOY APPLICATION

## STEP 1: Apply ConfigMap

```bash
kubectl apply -f configmap.yaml
```

---

## STEP 2: Apply Secret

```bash
kubectl apply -f secret.yaml
```

---

## STEP 3: Apply Storage

```bash
kubectl apply -f pv.yaml
kubectl apply -f pvc.yaml
```

Check:

```bash
kubectl get pvc
```

---

## STEP 4: Deploy MySQL

```bash
kubectl apply -f mysql-deployment.yaml
```

Check:

```bash
kubectl get pods
```


---

## STEP 5: Create Service

```bash
kubectl apply -f mysql-service.yaml
```

---

# 🧪 PART 5: TESTING 

---

## STEP 1: Check Pod

```bash
kubectl get pods
```

Wait until:

```bash
Running
```

---

## STEP 2: Check Logs

```bash
kubectl logs <mysql-pod>
```

---

## STEP 3: Connect to MySQL

```bash
kubectl exec -it <mysql-pod> -- bash
```

Inside:

```bash
mysql -u root -p
```

Password:

```bash
password
```

---

## STEP 4: Verify DB

```sql
SHOW DATABASES;
```


# 🔥 PART 6: PROVE CONFIGMAP WORKS

```bash
kubectl edit configmap mysql-config
```

Change DB name → restart:

```bash
kubectl rollout restart deployment mysql
```

---

# 🔐 PART 7: PROVE SECRET WORKS

```bash
kubectl edit secret mysql-secret
```

Restart:

```bash
kubectl rollout restart deployment mysql
```

---

