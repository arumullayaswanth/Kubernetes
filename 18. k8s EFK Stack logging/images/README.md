## 🏗️ Project Architecture
![EFK Architecture](architecture.gif)

![Project Architecture](https://raw.githubusercontent.com/arumullayaswanth/Kubernetes/37f421dcf2869570f2d06d3036d07f6340c4c8a9/18.%20k8s%20EFK%20Stack%20logging/images/project%20architecture.png)

Here’s a clean **README.md** for your Kubernetes EFK architecture GIF, with the image properly embedded and explained 👇

---

# 📦 Kubernetes EFK Stack Logging Architecture

![EFK Architecture](https://raw.githubusercontent.com/arumullayaswanth/Kubernetes/53e15c3d0bce3035d00b7fe79829b544854a2626/18.%20k8s%20EFK%20Stack%20logging/images/architecture.gif)

---

## 📖 Overview

The **EFK Stack** (Elasticsearch, Fluentd, Kibana) is a popular solution for centralized logging in Kubernetes environments.

It helps collect, store, and visualize logs from all containers running inside a cluster.

---

## 🧱 Components of EFK Stack

### 🔍 Elasticsearch

* Distributed search and analytics engine
* Stores and indexes logs
* Enables fast querying of large datasets

---

### 🚚 Fluentd

* Log collector and forwarder
* Runs as a **DaemonSet** on each Kubernetes node
* Collects logs from containers and sends them to Elasticsearch

---

### 📊 Kibana

* Visualization and dashboard tool
* Connects to Elasticsearch
* Helps analyze logs using graphs and queries

---

## ⚙️ Architecture Flow

1. Applications generate logs inside Kubernetes Pods
2. Logs are written to container stdout/stderr
3. Fluentd collects logs from each node
4. Fluentd processes and forwards logs to Elasticsearch
5. Elasticsearch stores and indexes logs
6. Kibana provides UI for searching and visualization

---

## 🔄 How It Works

* Each node runs a Fluentd agent to collect logs
* Logs are centralized into Elasticsearch
* Kibana allows users to:

  * Search logs
  * Create dashboards
  * Debug issues in real-time

EFK provides **centralized logging**, making it easier to monitor and troubleshoot distributed systems ([Cloud4C][1])

---

## 🚀 Key Benefits

* 📌 Centralized log management
* ⚡ Real-time log analysis
* 🔍 Powerful search capabilities
* 📈 Visualization dashboards
* 🔧 Easier debugging and troubleshooting

---

## 📁 Use Cases

* Kubernetes cluster monitoring
* Application debugging
* Security auditing
* Performance analysis

---

## 🛠️ Deployment Notes

* Fluentd is typically deployed as a **DaemonSet**
* Elasticsearch runs as a **StatefulSet**
* Kibana runs as a **Deployment**
* Logs are stored centrally for easy access

