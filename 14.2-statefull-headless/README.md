Got it — let’s build a **complete end-to-end production-style MySQL StatefulSet guide** in a clean `.md` format, with:

* ✅ Step-by-step setup
* ✅ Fully commented YAML
* ✅ Testing steps
* ✅ Replication setup
* ✅ Verification

---

# 📘 `mysql-statefulset-production.md`

---

## 🚀 1. Prerequisites

* Kubernetes cluster (EKS or local)
* `kubectl` configured
* Default StorageClass available (gp2/gp3 in AWS)

Check:

```bash
kubectl get storageclass
```

---

## 🔐 2. Create Secret (for MySQL password)

```yaml
# mysql-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-secret
type: Opaque
stringData:
  ROOT_PASSWORD: MyStrongPassword123  # change this
```

Apply:

```bash
kubectl apply -f mysql-secret.yaml
```

---

## 🌐 3. Headless Service (for stable DNS)

```yaml
# -------------------------------
# Headless Service (for DNS)
# -------------------------------
apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  clusterIP: None   # REQUIRED for StatefulSet stable DNS
  selector:
    app: mysql
  ports:
    - port: 3306

---
```

Apply:

```bash
kubectl apply -f mysql-headless-service.yaml
```

---

## ⚙️ 4. ConfigMap (MySQL config)

```yaml
# mysql-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-config
data:
  my.cnf: |
    [mysqld]
    log-bin=mysql-bin        # Enable binary logs (needed for replication)
    binlog-format=ROW        # Safer replication format
```

Apply:

```bash
kubectl apply -f mysql-config.yaml
```

---

## 🗄️ 5. StatefulSet (PRODUCTION VERSION)

```yaml
# -------------------------------
# MySQL StatefulSet
# -------------------------------
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql   # Must match headless service
  replicas: 3          # Number of MySQL pods

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

        # 🔐 Use Kubernetes Secret for password
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: ROOT_PASSWORD

        # 🧠 Dynamic server-id for replication
        command:
        - sh
        - -c
        - |
          ordinal=$(hostname | awk -F'-' '{print $NF}')
          echo "[mysqld]" > /etc/mysql/conf.d/server-id.cnf
          echo "server-id=$((100 + ordinal))" >> /etc/mysql/conf.d/server-id.cnf
          echo "log-bin=mysql-bin" >> /etc/mysql/conf.d/server-id.cnf
          exec docker-entrypoint.sh mysqld

        # 📦 Mount volumes
        volumeMounts:
        - name: mysql-data
          mountPath: /var/lib/mysql   # MySQL data directory
        - name: mysql-config
          mountPath: /etc/mysql/conf.d  # MySQL config

        # ❤️ Health checks
        readinessProbe:
          exec:
            command: ["mysqladmin", "ping", "-h", "127.0.0.1"]
          initialDelaySeconds: 10
          periodSeconds: 5

        livenessProbe:
          exec:
            command: ["mysqladmin", "ping", "-h", "127.0.0.1"]
          initialDelaySeconds: 30
          periodSeconds: 10

        # ⚙️ Resource limits
        resources:
          requests:
            cpu: "250m"
            memory: "512Mi"
          limits:
            cpu: "500m"
            memory: "1Gi"

      # 🔥 FIX: Define ConfigMap volume (this was missing!)
      volumes:
      - name: mysql-config
        configMap:
          name: mysql-config

  # 💾 Each pod gets its OWN EBS volume
  volumeClaimTemplates:
  - metadata:
      name: mysql-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp2   # your storageclass
      resources:
        requests:
          storage: 5Gi
```

Apply:

```bash
kubectl apply -f mysql-statefulset.yaml
```

---

## 🔍 6. Verify Deployment

```bash
kubectl get pods
```

Expected:

```text
mysql-0   Running
mysql-1   Running
mysql-2   Running
```

---

## 🧪 7. Test MySQL

### Connect to mysql-0 (master)

```bash
kubectl exec -it mysql-0 -- mysql -uroot -p
```

---

### Create DB & table

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

## 🔁 8. Setup Replication (IMPORTANT)

### Step 1: Create replication user (on mysql-0)

```sql
CREATE USER 'repl'@'%' IDENTIFIED BY 'replpass';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
FLUSH PRIVILEGES;
```

---

### Step 2: Get master log info

```sql
SHOW MASTER STATUS;
```

Example output:

```text
File: mysql-bin.000001
Position: 157
```

---

### Step 3: Configure replica (mysql-1)

```bash
kubectl exec -it mysql-1 -- mysql -uroot -p
```

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='mysql-0.mysql',
  SOURCE_USER='repl',
  SOURCE_PASSWORD='replpass',
  SOURCE_LOG_FILE='mysql-bin.000001',
  SOURCE_LOG_POS=157;

START REPLICA;
```

---

### Step 4: Verify replication

```sql
SHOW REPLICA STATUS\G;
```

Look for:

```text
Replica_IO_Running: Yes
Replica_SQL_Running: Yes
```

---

## 🧪 9. Test Replication

### Insert in master

```bash
kubectl exec -it mysql-0 -- mysql -uroot -p
```

```sql
USE prod;
INSERT INTO users VALUES (2, 'replication-test');
```

---

### Check in replica

```bash
kubectl exec -it mysql-1 -- mysql -uroot -p
```

```sql
SELECT * FROM users;
```

✅ You should see:

```text
1 stateful
2 replication-test
```

---

## 🌐 10. Test DNS (StatefulSet feature)

```bash
kubectl run test --image=busybox:1.28 -it --rm -- sh
```

Inside:

```sh
nslookup mysql-0.mysql
nslookup mysql-1.mysql
```

---

## 🧹 11. Cleanup

```bash
kubectl delete -f .
```

---

# 🎯 Final Summary

You now have:

* ✅ Stateful MySQL cluster
* ✅ Persistent storage (EBS)
* ✅ Stable DNS
* ✅ Replication (master → replica)
* ✅ Production-ready config

---

# 🚀 Next Steps (optional)

If you want to go further:

* 🔄 Auto failover (MySQL Operator)
* 📊 Monitoring (Prometheus + Grafana)
* 💾 Automated backups (CronJob)
* 🌐 External access (LoadBalancer)

---

If you want, I can next give you:
👉 **Helm-based production MySQL (1 command setup)**
👉 **Auto replication YAML (no manual SQL)**
