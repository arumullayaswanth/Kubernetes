## 🪜 Step 1.1 — Install VPA

```bash
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler

./hack/vpa-up.sh
```

---

## ✅ Verify

```bash
kubectl get pods -n kube-system
```

👉 Look for:

```
vpa-recommender
vpa-updater
vpa-admission-controller
```

---

# 🐹 PART 2 — DEPLOY VPA APPLICATION



## 🪜 Step 2.1 — Deploy hamster app

```bash
kubectl apply -f hamster-deploy.yml
```



## 🪜 Step 2.2 — Apply PDB

```bash
kubectl apply -f pdb.yml
```



## 🪜 Step 2.3 — Apply VPA

```bash
kubectl apply -f vpa.yml
```



## ✅ Verify

```bash
kubectl get vpa
```


# 🧪 PART 3 — TEST VPA


## 🪜 Step 3.1 — Check pods

```bash
kubectl get pods -l app=hamster
```


## 🪜 Step 3.2 — Check CPU usage

```bash
kubectl top pods -l app=hamster
```


## 🪜 Step 3.4 — See recommendation

```bash
kubectl describe vpa hamster-vpa
```

👉 Look:

```
Recommendation:
  cpu: xxx
  memory: xxx
```


## 🪜 Step 3.5 — Watch restart (IMPORTANT)

```bash
kubectl get pods -w
```

👉 You will see:

```
Old pod TERMINATED
New pod CREATED
```


## 🪜 Step 3.6 — Verify new resources

```bash
kubectl describe pod <new-pod-name>
```

👉 Check:

```
Requests changed
```
