
#  Kubernetes Autoscaling (HPA vs VPA)

“If traffic increases → Kubernetes adds more pods.”

👉 Kubernetes watches CPU usage, and when load increases, it automatically creates more pods so users never feel downtime.

“If pod is weak → Kubernetes increases CPU & memory.”

👉 Instead of creating new pods, Kubernetes makes the existing pod stronger by increasing CPU and memory.

---

#  FULL DEMO FLOW 

## 🔹 Step-by-Step Flow

1. Intro 
2. Setup Metrics Server
3. Deploy Application
4. Expose Service
5. Apply HPA
6. Run Load Test 
7. Show Scaling (Highlight Moment)
8. Install VPA
9. Deploy Hamster App
10. Show Recommendation
11. Show Restart
12. Compare HPA vs VPA

---

#  HPA (Horizontal Pod Autoscaler)


* Watches CPU / traffic
* Automatically increases/decreases pods

“When load increases, Kubernetes automatically creates more pods, ensuring high availability and zero downtime.”

---

#  VPA (Vertical Pod Autoscaler)

* Adjusts CPU & memory of existing pod

“Instead of adding more pods, Kubernetes increases CPU and memory of the existing pod to handle the load.”

---

# ⚔️ KEY CONCEPT (Interview Ready)

##  HPA vs VPA

| Feature | HPA                 | VPA                   |
| ------- | ------------------- | ---------------------- |
| Scaling | Horizontal (Pods ↑) | Vertical (Resources ↑) |
| Trigger | CPU / Traffic spike | Usage trends           |
| Speed   | Fast                | Slow (Learning-based)  |
| Restart | ❌ No                | ✅ Yes                  |



#  SUMMARY

* **HPA → Scale OUT (More Pods)**
* **VPA → Scale UP (More Power per Pod)**

w explanation script**
