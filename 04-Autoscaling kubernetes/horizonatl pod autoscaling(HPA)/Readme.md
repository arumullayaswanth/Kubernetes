

## ✅ Step 0.1 — Check cluster

```bash
kubectl get nodes
```

👉 If nodes are visible → ✅ good

---

# ⚙️ PART 1 — INSTALL METRICS SERVER (MANDATORY FOR HPA)

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

---

## ✅ Verify

```bash
kubectl get pods -n kube-system
```

👉 Look for:

```
metrics-server-xxxxx   Running
```

---

## ✅ Test metrics

```bash
kubectl top nodes
kubectl top pods
```

👉 If data comes → 🎉 HPA will work

---

# 🚀 PART 2 — DEPLOY HPA APPLICATION

---

## 🪜 Step 2.1 — Create Deployment

```bash
kubectl apply -f deploy.yml
```

---

## ✅ Check

```bash
kubectl get pods
kubectl get deployment nginx-hpa
```

👉 You should see:

```
1 pod running
```

---

## 🪜 Step 2.2 — Create Service (LoadBalancer)

```bash
kubectl apply -f service.yml
```

---

## ✅ Get URL

```bash
kubectl get svc
```

👉 Wait until:

```
EXTERNAL-IP appears
```

Copy it:

```
http://<your-loadbalancer>
```

---

## 🪜 Step 2.3 — Create HPA

```bash
kubectl apply -f hpa.yml
```

---

## ✅ Verify

```bash
kubectl get hpa
```

👉 You will see:

```
TARGETS   0%/50%
```

---

# 🔥 PART 3 — TEST HPA (MOST IMPORTANT DEMO)

---

## 🪜 Step 3.1 — Watch pods live

```bash
kubectl get pods -w
```

(Keep this running in one terminal)

---

## 🪜 Step 3.2 — Run load test

Open another terminal:

```bash
chmod +x test.sh
./test.sh
```

---

## 👀 What happens

👉 Initially:

```
1 pod
```

👉 After load:

```
2 pods → 3 → 4 → ...
```

---

## 🪜 Step 3.3 — Watch HPA scaling

```bash
kubectl get hpa -w
```

👉 You’ll see:

```
CPU increasing → replicas increasing
```

