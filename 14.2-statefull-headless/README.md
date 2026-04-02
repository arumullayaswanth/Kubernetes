## 📺 Demo Video

<p align="center">
  <a href="https://youtu.be/WPojxRV5hWU?si=2f3YZxdNdWtYzyrk">
    <img src="https://img.shields.io/badge/▶️ Watch%20on%20YouTube-red?style=for-the-badge&logo=youtube">
  </a>
</p>

## 🚀 1. Prerequisites

```bash
# Check cluster
kubectl get nodes

# Check storage class (EBS in EKS)
kubectl get storageclass
```

Expected:

```text
gp2 / gp3 present
```

---

## 🔐 2. Create Secret (MySQL root password)

```bash
kubectl apply -f mysql-secret.yaml
```

---

## 🌐 3. Headless Service (VERY IMPORTANT for DNS)

```bash
kubectl apply -f mysql-headless-service.yaml
```

---

## 🗄️ 5. StatefulSet (FULL PRODUCTION VERSION)

#### ▶️ Apply StatefulSet

```bash
kubectl apply -f mysql-statefulset.yaml
```

---

## 🔍 6. Verify Pods

```bash
kubectl get pods -w
```

Expected:

```text
mysql-0   Running
mysql-1   Running
mysql-2   Running
```

---

## 🧪 7. Verify server-id (CRITICAL)

```bash
kubectl exec -it mysql-0 -- mysql -uroot -p -e "SHOW VARIABLES LIKE 'server_id';"
kubectl exec -it mysql-1 -- mysql -uroot -p -e "SHOW VARIABLES LIKE 'server_id';"
```

Expected:

```text
mysql-0 → 100
mysql-1 → 101
mysql-2 → 102
```

---

## 🧪 8. Test DNS

```bash
kubectl run dns-test --image=busybox:1.28 -it --rm -- sh
```

Inside:

```sh
nslookup mysql-0.mysql
```

Expected:

```text
mysql-0.mysql → pod IP
```

---

## 🧪 9. Create Database (MASTER)

```bash
kubectl exec -it mysql-0 -- mysql -uroot -p
```

```sql
CREATE DATABASE prod;
USE prod;

CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(50)
);

INSERT INTO users VALUES (1, 'stateful');
```

---

## 🔁 10. Setup Replication

---

### Step 1 — Create replication user

```sql
CREATE USER 'repl'@'%' IDENTIFIED WITH mysql_native_password BY 'replpass';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
FLUSH PRIVILEGES;
```

---

### Step 2 — Get master log

```sql
SHOW MASTER STATUS;
```

Example:
```bash
+------------------+----------+--------------+------------------+-------------------+
| File             | Position | ...                                          |
+------------------+----------+----------------------------------------------+
| mysql-bin.000007 |      157 | ...                                          |
+------------------+----------+----------------------------------------------+
```

- `SOURCE_LOG_FILE` → mysql-bin.000007
- `SOURCE_LOG_POS` → 157

### Step 3 — Configure replica

```bash
kubectl exec -it mysql-1 -- mysql -uroot -p
```
- ALWAYS use latest output from master
- `SOURCE_LOG_FILE` → mysql-bin.000007
- `SOURCE_LOG_POS` → 157
- example : **SOURCE_LOG_FILE='mysql-bin.000007', SOURCE_LOG_POS=157;**


```sql
STOP REPLICA;
RESET REPLICA ALL;

CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='mysql-0.mysql',
  SOURCE_USER='repl',
  SOURCE_PASSWORD='replpass',
  SOURCE_LOG_FILE='mysql-bin.000003',
  SOURCE_LOG_POS=1545;   

START REPLICA;
```
---

## 🔍 11. Verify Replication

```sql
SHOW REPLICA STATUS\G;
```

Expected:

```text
Replica_IO_Running: Yes
Replica_SQL_Running: Yes
```

---

### 🧪 12. Final Data Test

---

#### Insert in master

```bash
kubectl exec -it mysql-0 -- mysql -uroot -p
```

```sql
INSERT INTO prod.users VALUES (200, 'final-final');
```

---

### Check in replica

```bash
kubectl exec -it mysql-1 -- mysql -uroot -p
```
```sql
CREATE DATABASE IF NOT EXISTS prod;
USE prod;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY,
  name VARCHAR(50)
);
```
```sql
SELECT * FROM prod.users;
```

---

### ✅ Expected

```text
1 stateful
2 replication-test
```

---

# 🧹 13. Cleanup

```bash
kubectl delete -f .
```

---

