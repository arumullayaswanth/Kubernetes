# 📘 VPA (Vertical Pod Autoscaler)

##  PART 1 Install VPA

###  Step 1.1: Clone autoscaler repo

```bash
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
```

###  Step 1.2: Install VPA components

```bash
./hack/vpa-up.sh
```

##  Step 1.3: Verify installation

```bash
kubectl get pods -n kube-system
```
 You should see:

```
vpa-recommender
vpa-updater
vpa-admission-controller
```

---

#  PART 2  Deploy Application + VPA

###  Step 2.1: Deploy hamster app

```bash
kubectl apply -f hamster-deploy.yml
```

###  Step 2.2: Apply Pod Disruption Budget (PDB)

```bash
kubectl apply -f pdb.yml
```
###  Step 2.3: Apply VPA config

```bash
kubectl apply -f vpa.yml
```

##  Step 2.4: Verify VPA

```bash
kubectl get vpa
```
---

#  PART 3 Test VPA

###  Step 3.1: Check running pods

```bash
kubectl get pods -l app=hamster
```
### Step 3.2: Check CPU usage

```bash
kubectl top pods -l app=hamster
```

###  Step 3.3: Wait for VPA learning

⏳ Wait ~1–2 minutes

---

###  Step 3.4: Check VPA recommendation

```bash
kubectl describe vpa hamster-vpa
```
 Look for:

```
Recommendation:
  cpu: xxx
  memory: xxx
```

###  Step 3.5: Watch pod restart

```bash
kubectl get pods -w
```

 You’ll see:

```
Old pod TERMINATED
New pod CREATED
```

### Step 3.6: Verify updated resources

```bash
kubectl describe pod <new-pod-name>
```

 Check:

```
Requests / Limits updated
```

---

#  PART 4 — Run Test Script (Optional but PRO 💯)

###  Step 4.1: Create script

```bash
vim vpa-test.sh
```

Paste your script.

###  Step 4.2: Make executable

```bash
chmod +x vpa-test.sh
```


### Step 4.3: Run

```bash
./vpa-test.sh
```

