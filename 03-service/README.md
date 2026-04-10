# ✅ End-to-End Kubernetes on AWS EKS with Service Verification


## 🧱 Step 4: Deploy Kubernetes Services

### 4.1 ClusterIP Service

File: `clusterip.yml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-container
        image: nginx:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: my-app-svc
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: my-app
```

```bash
kubectl apply -f clusterip.yml
```

### 4.2 NodePort Service

File: `nodeport.yml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment-np
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app-np
  template:
    metadata:
      labels:
        app: my-app-np
    spec:
      containers:
      - name: my-container
        image: nginx:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: NodePort
  selector:
    app: my-app-np
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30007
```

```bash
kubectl apply -f nodeport.yml
```

### 4.3 LoadBalancer Service

File: `loadbalancer.yml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment-lb
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app-lb
  template:
    metadata:
      labels:
        app: my-app-lb
    spec:
      containers:
      - name: my-container
        image: nginx:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: my-app-lb
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
  selector:
    app: my-app-lb
```

```bash
kubectl apply -f loadbalancer.yml
```

---

## 🔍 Step 5: Verify Everything

### 5.1 From Terminal

```bash
kubectl get nodes
kubectl get pods
kubectl get svc
kubectl get deployments
```


```bash
Expected output (example):
NAME            TYPE           CLUSTER-IP     EXTERNAL-IP       PORT(S)          AGE
my-app-svc      ClusterIP      10.0.171.47    <none>            80/TCP           1m
my-service      NodePort       10.0.95.144    <none>            80:30007/TCP     1m
my-app-lb       LoadBalancer   10.0.125.66    a1b2c3d4.elb...   80:xxxxx/TCP     1m
```
## 🌍 Step 4: Test Services
 ### 📡 ClusterIP
- This is internal only. Use a temporary pod to test:
 ```bash
 kubectl run test-pod --image=busybox --rm -it -- /bin/sh
```
- Then inside the shell:
 ```bash
 wget -qO- http://my-app-svc
```
### 🌐 NodePort
- Use your EC2 public IP and the nodePort (30007):
```bash
curl http://<EC2_PUBLIC_IP>:30007
```
- Or open http://<EC2_PUBLIC_IP>:30007 in a browser.

###🌐 LoadBalancer

- Wait 1–2 minutes for AWS to assign an EXTERNAL-IP.


```bash
kubectl get svc

http://<EXTERNAL-IP>

```

### 5.2 From AWS Console

* Go to **EKS > my-cluster > Workloads**
* Check **Deployments** and **Pods**
* Go to **EC2 > Load Balancers**

  * Copy DNS of LoadBalancer
  * Open in browser: `http://<DNS>` → NGINX page

---




## 🧹 Step 6: Cleanup

```bash
kubectl delete -f clusterip.yml
kubectl delete -f nodeport.yml
kubectl delete -f loadbalancer.yml
eksctl delete cluster --name my-cluster --region us-east-1
```

---

🎉 You're Done! You've now deployed and verified services on Amazon EKS using ClusterIP, NodePort, and LoadBalancer.
