# MySQL Deployment on Kubernetes Using Static HostPath

This guide explains how to deploy MySQL using a hostPath-based PersistentVolume with a hardcoded root password.

---

## 📁 Folder Structure

```
mysql-k8s/
├── pv.yml
├── pvc.yml
├── deployment.yml
└── README.md
```

---

## ✅ Prerequisites

- Kubernetes cluster (e.g., EKS, Minikube)
- `kubectl` configured (`--kubeconfig=Cluster1.config`)
- A node with `/mnt/data` directory created

---

## 🔧 Step 1: Prepare HostPath on the Node

SSH into your node and run:

```bash
sudo mkdir -p /mnt/data
sudo chmod 777 /mnt/data
```

---

## 📜 Step 2: Create PersistentVolume

**`pv.yml`**
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mysql-pv
  labels:
    type: local
spec:
  storageClassName: manual
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/mnt/data"
```

Apply it:
```bash
kubectl apply -f pv.yml 
```

---

## 📜 Step 3: Create PersistentVolumeClaim

**`pvc.yml`**
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pv-claim
spec:
  storageClassName: manual
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

Apply it:
```bash
kubectl apply -f pvc.yml 
```

---

## 📦 Step 4: Deploy MySQL

**`deployment.yml`**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
spec:
  selector:
    matchLabels:
      app: mysql
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - image: mysql:8.0
          name: mysql
          env:
            - name: MYSQL_ROOT_PASSWORD
              value: password     #your passwaord
          ports:
            - containerPort: 3306
              name: mysql
          volumeMounts:
            - name: mysql-persistent-storage
              mountPath: /var/lib/mysql
      volumes:
        - name: mysql-persistent-storage
          persistentVolumeClaim:
            claimName: mysql-pv-claim
```

Apply it:
```bash
kubectl apply -f deployment.yml
```

---

## 📋 Step 5: Verify Deployment

```bash
kubectl get pods 
kubectl get pvc,pv 
```

To check logs:
```bash
kubectl logs deployment/mysql 
```

---

## 🔌 Step 6: Connect to MySQL Locally

```bash
kubectl get pods 
kubectl exec -it <pod-name> -- /bin/bash
#kubectl exec -it mysql-xxxxx-xxxxx -- /bin/bash 
mysql -u root -ppassword

```
### ✅ Useful MySQL Commands to Interact with the Database
1. 🔍 Show all databases:
```bash
SHOW DATABASES;
```
2. ➕ Create a new database:
```bash
CREATE DATABASE testdb;
```
3. 📂 Use a specific database:
```bash
USE testdb;
```
4. 🏗 Create a new table:
```bash
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(100)
);
```
5. ➕ Insert data:
```bash
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
```
6. 🔎 Query data:   
```bash
SELECT * FROM users;
```
7.🔧 Describe a table:
```bash
DESCRIBE users;
```
8. 🗑 Delete a database:
```bash
DROP DATABASE testdb;
```

9. 🚪 Exit the MySQL shell
```bash
exit
```

   

- or


Forward port:
```bash
kubectl port-forward deployment/mysql 3306:3306 
```

Then connect with a client:
```bash
mysql -h 127.0.0.1 -P 3306 -u root -ppassword
```

---

## 🧹 Cleanup (Optional)

```bash
kubectl delete -f deployment.yml 
kubectl delete -f pvc.yml 
kubectl delete -f pv.yml 
```

---

## ✅ Done!
You now have a running MySQL deployment on Kubernetes using static volumes.
