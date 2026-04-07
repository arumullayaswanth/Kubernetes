## EFK Stack Architecture

![EFK Stack](https://raw.githubusercontent.com/arumullayaswanth/Kubernetes/cc5499e40e9eb064675dc560b76fe6f5df02be4f/18.%20k8s%20EFK%20Stack%20logging/images/efk.png)

# Fluent Bit Kubernetes Logging Configuration


<table style="width: 100%; margin-bottom: 20px;">
  <tr>
    <td align="center" style="padding: 10px; background-color: #e9f7f5; border-radius: 8px;">
      <img src="https://github.com/arumullayaswanth/Kubernetes/blob/8fa8f8961a264819dab364f88ff575b363522e0b/18.%20k8s%20EFK%20Stack%20logging/project%20architecture.png" width="1000%" style="border: 2px solid #ddd; border-radius: 10px;">
      <br><b> Deploy the EFK Stack</b>
    </td>
  </tr>
</table>

## 📌 Overview

This ConfigMap configures **Fluent Bit** to collect logs from Kubernetes containers, enrich them with metadata, and forward them to Elasticsearch for storage and analysis.

### 🔄 Log Processing Flow

```
Container Logs → INPUT → FILTER → OUTPUT → Elasticsearch
```

---

## ⚙️ Components

### 1. SERVICE

Controls the overall behavior of Fluent Bit.

* **Flush 1**: Sends logs every second
* **Log_Level info**: Sets logging level to informational
* **HTTP_Server On**: Enables HTTP endpoint for health and metrics (port 2020)
* **Parsers_File parsers.conf**: Loads custom parsers

---

### 2. INPUT (Log Collection)

Responsible for collecting logs from Kubernetes containers.

* **Plugin**: `tail`
* **Path**: `/var/log/containers/*.log`
* **Tag**: `kube.*` (used for routing logs)
* **Parser**: `docker` (parses JSON logs)
* **DB**: Tracks file read positions to avoid duplicate logs
* **Mem_Buf_Limit**: 5MB buffer per input
* **Skip_Long_Lines**: Prevents issues from large log lines
* **Refresh_Interval**: Scans for new log files every 10 seconds

👉 At this stage, logs are collected as raw data.

---

### 3. FILTER (Log Enrichment)

Enhances logs with Kubernetes metadata.

* **Plugin**: `kubernetes`
* **Match**: `kube.*`

#### Adds Metadata:

* Pod Name
* Namespace
* Container Name
* Labels

#### Key Features:

* **Merge_Log On**: Merges JSON log content into structured fields
* **Merge_Log_Key log_processed**: Stores processed logs under this key
* **K8S-Logging.Parser On**: Enables parsing via pod annotations

👉 Logs become structured and enriched for better querying.

---

### 4. OUTPUT (Log Forwarding)

Sends processed logs to Elasticsearch.

* **Plugin**: `es`
* **Match**: `*` (all logs)
* **Host/Port**: Configured via environment variables
* **Logstash_Format On**: Creates daily indices

  * Example: `logstash-YYYY.MM.DD`
* **Replace_Dots On**: Ensures compatibility with Elasticsearch field naming
* **Retry_Limit False**: Retries indefinitely if Elasticsearch is unavailable

👉 Final destination: Elasticsearch (visualized using Kibana).

---

### 5. PARSER (Log Processing)

Defines how logs are parsed.

* **Name**: `docker`
* **Format**: JSON

#### Configuration:

* **Time_Key**: `time` (extracts timestamp)
* **Time_Format**: `%Y-%m-%dT%H:%M:%S.%L`
* **Time_Keep On**: Retains original timestamp field

#### Example Log:

```json
{"log":"Hello","time":"2026-03-22T10:00:00.123"}
```

👉 Converts raw logs into structured JSON format.

---

## 🧾 Summary

| Component | Purpose                                |
| --------- | -------------------------------------- |
| SERVICE   | Controls Fluent Bit behavior           |
| INPUT     | Collects logs from containers          |
| FILTER    | Enriches logs with Kubernetes metadata |
| OUTPUT    | Sends logs to Elasticsearch            |
| PARSER    | Parses Docker JSON logs                |

---

## 🚀 Conclusion

This configuration enables centralized logging by transforming raw Kubernetes container logs into structured, enriched data stored in Elasticsearch for analysis and visualization.

---

## ✅ Prerequisites

* Kubernetes cluster
* Fluent Bit deployed (DaemonSet recommended)
* Elasticsearch endpoint configured
* Proper RBAC permissions for Kubernetes API access

---

###  STEP 0  Connect to your cluster

Make sure Kubernetes is working:

```bash
kubectl get nodes
```

####  STEP 1  Create Namespace

```bash
kubectl apply -f namespace.yaml
```
---

#### STEP 2  Create StorageClass (AWS EBS)

```bash
kubectl apply -f storageclass.yaml
```
---

#### STEP 3  Deploy Elasticsearch

##### 3.1 Service (Headless)

```bash
kubectl apply -f elasticsearch-service.yaml
```

##### 3.2 StatefulSet

```bash
kubectl apply -f elasticsearch-statefulset.yaml
```


## ⏳ Wait for Elasticsearch pods

```bash
kubectl get pods -n kube-logging
```

Wait until you see:

```
es-cluster-0   Running
es-cluster-1   Running
es-cluster-2   Running
```

####  Check logs (important)

```bash
kubectl logs es-cluster-0 -n kube-logging
```

Look for:

```
started
```

---

####  STEP 4  Deploy Kibana
##### 4.1 Deployment

```bash
kubectl apply -f kibana-deployment.yaml
```

##### 4.2 Service

```bash
kubectl apply -f kibana-service.yaml
```

#####  Get External IP

```bash
kubectl get svc -n kube-logging
```

Find:

```
kibana   LoadBalancer   EXTERNAL-IP
```

 Open in browser:

```
http://<EXTERNAL-IP>
```

 You should see Kibana UI

---

####  STEP 5  Deploy Fluent Bit

##### 5.1 RBAC

```bash
kubectl apply -f fluentbit-serviceaccount.yaml
kubectl apply -f fluentbit-clusterrole.yaml
kubectl apply -f fluentbit-clusterrolebinding.yaml
```

##### 5.2 Config

```bash
kubectl apply -f fluentbit-configmap.yaml
```

##### 5.3 DaemonSet

```bash
kubectl apply -f fluentbit-daemonset.yaml
```

```bash
kubectl get pods -n kube-logging
```

You should see:

```
fluent-bit-xxxxx   Running (on every node)
```

---
