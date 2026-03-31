

# 🚀 1. Prerequisites

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

# 🔐 2. Create Secret (MySQL root password)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-secret  # Name of the secret
type: Opaque
data:
  MYSQL_ROOT_PASSWORD: cGFzc3dvcmQ=  # Base64 encoded value of "password"

```

```bash
kubectl apply -f mysql-secret.yaml
```

---

# 🌐 3. Headless Service (VERY IMPORTANT for DNS)

```yaml
# mysql-headless-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  clusterIP: None              # 🔥 REQUIRED for StatefulSet DNS
  selector:
    app: mysql
  ports:
    - port: 3306
```

```bash
kubectl apply -f mysql-headless-service.yaml
```

---

# ⚙️ 4. ConfigMap (MySQL config)

```yaml
# mysql-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-config
data:
  my.cnf: |
    [mysqld]
    log-bin=mysql-bin        # Enable binary logging (required for replication)
    binlog-format=ROW        # Safer replication format
```

```bash
kubectl apply -f mysql-config.yaml
```

---

# 🗄️ 5. StatefulSet (FULL PRODUCTION VERSION)

```yaml
# mysql-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql            # Must match headless service
  replicas: 3                   # 3 MySQL pods

  selector:
    matchLabels:
      app: mysql

  template:
    metadata:
      labels:
        app: mysql

    spec:
      containers:
      - name: mysql
        image: mysql:8.0

        ports:
        - containerPort: 3306

        # 🔐 Inject password from Secret
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: ROOT_PASSWORD

        # 🧠 Dynamic server-id (CRITICAL for replication)
        command:
        - sh
        - -c
        - |
          ordinal=$(hostname | awk -F'-' '{print $NF}')
          SERVER_ID=$((100 + ordinal))

          echo "[mysqld]" > /etc/mysql/conf.d/server-id.cnf
          echo "server-id=${SERVER_ID}" >> /etc/mysql/conf.d/server-id.cnf
          echo "log-bin=mysql-bin" >> /etc/mysql/conf.d/server-id.cnf
          echo "binlog-format=ROW" >> /etc/mysql/conf.d/server-id.cnf

          echo "===== GENERATED CONFIG ====="
          cat /etc/mysql/conf.d/server-id.cnf

          exec docker-entrypoint.sh mysqld

        # 📦 Mount storage + config
        volumeMounts:
        - name: mysql-data
          mountPath: /var/lib/mysql
        - name: mysql-config
          mountPath: /etc/mysql/conf.d

        # ❤️ Health checks
        readinessProbe:
          exec:
            command: ["mysqladmin", "ping", "-h", "127.0.0.1"]
          initialDelaySeconds: 10

        livenessProbe:
          exec:
            command: ["mysqladmin", "ping", "-h", "127.0.0.1"]
          initialDelaySeconds: 30

      # 🔥 Mount ConfigMap (FIXED ISSUE)
      volumes:
      - name: mysql-config
        configMap:
          name: mysql-config

  # 💾 Each pod gets its own EBS volume
  volumeClaimTemplates:
  - metadata:
      name: mysql-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp2
      resources:
        requests:
          storage: 5Gi
```

---

## ▶️ Apply StatefulSet

```bash
kubectl apply -f mysql-statefulset.yaml
```

---

# 🔍 6. Verify Pods

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

# 🧪 7. Verify server-id (CRITICAL)

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

# 🧪 8. Test DNS

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

# 🧪 9. Create Database (MASTER)

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

# 🔁 10. Setup Replication

---

## Step 1 — Create replication user

```sql
CREATE USER 'repl'@'%' IDENTIFIED WITH mysql_native_password BY 'replpass';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
FLUSH PRIVILEGES;
```

---

## Step 2 — Get master log

```sql
SHOW MASTER STATUS;
```

Example:

```text
mysql-bin.000001
157
```

---

## Step 3 — Configure replica

```bash
kubectl exec -it mysql-1 -- mysql -uroot -p
```

```sql
STOP REPLICA;
RESET REPLICA ALL;

CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='mysql-0.mysql',
  SOURCE_USER='repl',
  SOURCE_PASSWORD='replpass',
  SOURCE_LOG_FILE='mysql-bin.000001',
  SOURCE_LOG_POS=157;

START REPLICA;
```

---

# 🔍 11. Verify Replication

```sql
SHOW REPLICA STATUS\G;
```

Expected:

```text
Replica_IO_Running: Yes
Replica_SQL_Running: Yes
```

---

# 🧪 12. Final Data Test

---

## Insert in master

```bash
kubectl exec -it mysql-0 -- mysql -uroot -p
```

```sql
INSERT INTO prod.users VALUES (2, 'replication-test');
```

---

## Check in replica

```bash
kubectl exec -it mysql-1 -- mysql -uroot -p
```

```sql
SELECT * FROM prod.users;
```

---

## ✅ Expected

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

