## 🎬 Kubernetes DaemonSet Explained

📌 This video covers:
- What is a DaemonSet  
- Real-world use cases  
- Step-by-step explanation  

👉 Click the thumbnail below to watch on YouTube:

[![Watch the video](https://img.youtube.com/vi/QgauXUBdxCc/0.jpg)](https://youtu.be/QgauXUBdxCc?si=PPEOfDjjihL69zs-)

![Deployment Image](https://raw.githubusercontent.com/arumullayaswanth/Kubernetes/0d5649ba5541ee4ee50c26607673254452abca43/14.2-statefull-headless/Stateless%20Deployment/deployment%20images.png)

### ▶️ Command:

```bash
kubectl apply -f mysql-deployment.yml
```

##  **Step 2 — Check Pod**

```bash
kubectl get pods
```

Example:

```bash
mysql-deploy-7d9f8c6b5-xk92a
```


##  **Step 3 — Insert Data (Important Proof)**

### ▶️ Command:

```bash
kubectl exec -it <pod-name> -- mysql -uroot -ppassword
```

Output:

```
1 | yaswanth
```


##  **Step 4 — Break the Pod**

```bash
kubectl delete pod <pod-name>
```

##  **Step 5 — Check New Pod**

```bash
kubectl get pods
```

New pod:

```bash
mysql-deploy-xxxxx-new
```

##  **Step 6 — Check Data Again**

```bash
kubectl exec -it <new-pod> -- mysql -uroot -ppassword
```

```sql
SHOW DATABASES;
```

- Our database is gone
- Our table is gone
- Our data is gone

This is exactly why Deployments fail for databases.”
