

# 🧠 NOW THE FUN PART: PROMPT-DRIVEN OPERATIONS

Everything below is **typed inside the Kagent dashboard**.

---

## 🟢 PROMPT 1: Install Prometheus Automatically

### 💬 Prompt (Say & Type This)

> **Prompt:**
> “Install Prometheus in my EKS cluster using Helm.
> Create a namespace called monitoring.
> Configure it to scrape all Kubernetes nodes and pods.”

### 🤖 What Kagent Does Internally

* Creates `monitoring` namespace
* Installs Prometheus Helm chart
* Configures scrape configs

🎥 Explain on screen:

> “I didn’t touch Helm or kubectl.
> Kagent did everything for me.”

---

## 🟢 PROMPT 2: Install Grafana Automatically

### 💬 Prompt

> “Install Grafana in the monitoring namespace.
> Connect it to Prometheus as a data source.
> Expose Grafana using a LoadBalancer.”

### 🤖 Result

* Grafana pod running
* Prometheus added as datasource
* Dashboard accessible

![Image](https://raw.githubusercontent.com/dotdc/media/main/grafana-dashboards-kubernetes/k8s-views-global.png)

---

## 🟢 PROMPT 3: Show Cluster Health

### 💬 Prompt

> “Show me the health of my entire EKS cluster.
> Include node status, pod count, and error pods.”

### 🤖 Kagent Response (Example)

* Nodes: 2 (Healthy)
* Running Pods: 38
* CrashLoopBackOff: 1
* Pending Pods: 0

---

## 🟢 PROMPT 4: Show CPU & Memory Usage (Entire Cluster)

### 💬 Prompt

> “Show me CPU and memory usage for my entire cluster.
> Highlight any pods consuming abnormal resources.”

![Image](https://raw.githubusercontent.com/instrumentisto/grafana-dashboard-kubernetes-prometheus/master/screens/total.png)

> “Instead of me reading raw metrics, Kagent summarizes it.”

---

## 🟢 PROMPT 5: Show Logs (Smart Way)

### 💬 Prompt

> “Show me error logs from all pods in the last 15 minutes.
> Group them by application.”

### 🤖 Output Example

* `payment-service`: timeout errors
* `auth-service`: token validation failed
* `frontend`: no errors

> “This saves hours during incidents.”

---

## 🟢 PROMPT 6: Detect Issues in Prometheus

### 💬 Prompt

> “Analyze Prometheus alerts and tell me if there are any critical issues.”

### 🤖 Kagent Explains

* High CPU alert on node-1
* Memory pressure on pod `checkout-service`
* No action needed for rest


> “This is alert intelligence, not alert noise.”

---

## 🟢 PROMPT 7: Auto-Fix Suggestion

### 💬 Prompt

> “Suggest remediation steps for high CPU usage in checkout-service.”

### 🤖 Kagent Response

* Increase CPU limits
* Enable autoscaling
* Investigate infinite loop

🎥 Important:

> “Kagent suggests — humans approve.”

---

