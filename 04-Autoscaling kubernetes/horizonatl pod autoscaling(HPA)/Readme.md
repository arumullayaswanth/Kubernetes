
# HPA (Horizontal Pod Autoscaler) 

##  PART 0  Verify Cluster

###  Step 0.1: Check cluster

```bash
kubectl get nodes
```
If nodes are visible → cluster is ready


##  PART 1 Install Metrics Server (MANDATORY)

HPA depends on metrics  without this, it **won’t work**.

###  Step 1.1: Install metrics server

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

##  Step 1.2: Verify installation

```bash
kubectl get pods -n kube-system
```

```
metrics-server-xxxxx   Running
```


##  Step 1.3: Test metrics

```bash
kubectl top nodes
kubectl top pods
```
 If you see CPU/memory values →  ready for HPA

---

##  PART 2 Deploy Application

###  Step 2.1: Create Deployment

```bash
kubectl apply -f deploy.yml
```

### Step 2.2: Create Service (LoadBalancer)

```bash
kubectl apply -f service.yml
```

### Get external URL

```bash
kubectl get svc
```
```
http://<your-loadbalancer>
```
###  Step 2.3: Create HPA

```bash
kubectl apply -f hpa.yml
```


####  Verify HPA

```bash
kubectl get hpa
```
 Example:

```
TARGETS   0%/50%
```
 Meaning:

* Current CPU = 0%
* Target CPU = 50%

---

#  PART 3 Test HPA 


###  Step 3.1: Watch pods (Terminal 1)

```bash
kubectl get pods -w
```

###  Step 3.2: Run load test (Terminal 2)
- Test.sh file update your load balancer
```bash
chmod +x test.sh
./test.sh
```


