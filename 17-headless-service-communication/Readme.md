# 🔍 STEP 1 — Check Cluster is Ready

```bash
kubectl get nodes
```

✅ You should see nodes in `Ready` state

---

### STEP 2 — Deploy Storage (EBS)

```bash
kubectl apply -f storage/
```

Check:

```bash
kubectl get sc
```

 You should see:

```text
ebs-sc
```

---

### STEP 3 — Deploy DATABASE (Secrets + Headless + StatefulSet)

```bash
kubectl apply -f database/
```

---

####  Verify Database

```bash
kubectl get pods
```

Wait until:

```text
mysql-0   Running
mysql-1   Running
```

---

####  Check Stateful Identity

```bash
kubectl get pods -o wide
```

👉 You’ll see:

* mysql-0
* mysql-1

---

####  Check PVC (EBS attached)

```bash
kubectl get pvc
```

 Output:

```text
mysql-data-mysql-0
mysql-data-mysql-1
```

---

###  STEP 4 — Deploy BACKEND

```bash
kubectl apply -f backend/
```

---

####  Verify Backend

```bash
kubectl get pods
```

Wait until:

```text
backend-xxxx   Running
backend-yyyy   Running
```

---

###  STEP 5 — Deploy FRONTEND

```bash
kubectl apply -f frontend/
```

---

####  Get External IP

```bash
kubectl get svc frontend-svc
```

Wait until:

```text
EXTERNAL-IP: <your-ip>
```

---

###  STEP 6 — BASIC TEST (END-TO-END)

Open browser:

```text
http://<EXTERNAL-IP>
```

 You should see:

```text
Backend Pod: backend-xxx connected to DB successfully
```

 This proves:

* Frontend → Backend → DB working

---

###  STEP 7 — WATCH LIVE TRAFFIC (COOL DEMO)

```bash
kubectl logs -l app=frontend -f
```
```bash
kubectl logs -l app=backend -f
```

---

### STEP 8 — TEST HEADLESS SERVICE 

Enter backend pod:

```bash
kubectl run debug --rm -it --image=busybox -- sh
```

Now run:

```bash
nslookup mysql-headless
```

 Output:

```text
mysql-0.mysql-headless
mysql-1.mysql-headless
```

 Say in video:

> “See — no single IP, direct pod discovery!”

---

###  STEP 9 — TEST PERSISTENCE (EBS)

##### Step 1: Enter MySQL

```bash
kubectl exec -it mysql-0 -- mysql -uroot -p
```

Password:

```text
root123
```

---

##### Step 2: Create Data

```sql
CREATE DATABASE testdb;
USE testdb;
CREATE TABLE demo (id INT, name VARCHAR(20));
INSERT INTO demo VALUES (1, 'yaswanth');
SELECT * FROM demo;
```

---

##### Step 3: Delete Pod

```bash
kubectl delete pod mysql-0
```

Wait until it comes back:

```bash
kubectl get pods
```

---

##### Step 4: Check Data Again

```bash
kubectl exec -it mysql-0 -- mysql -uroot -p
```

```sql
USE testdb;
SELECT * FROM demo;
```

 Data still exists → **EBS working**

---

###  STEP 10 — TEST CONFIGMAP

```bash
kubectl describe configmap backend-config
```

---

###  STEP 11 — TEST SECRET

```bash
kubectl describe secret backend-secret
```

---

###  Check Inside Pod

```bash
kubectl exec -it <backend-pod> -- env | grep DB
```

 You’ll see:

```text
DB_HOST=mysql-headless
DB_USER=root
```

---

