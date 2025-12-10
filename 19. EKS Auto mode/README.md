## 🎥 Amazon EKS Auto Mode: Kubernetes Without the Ops Overhead  
**Why EKS Auto Mode is the Future of Kubernetes Management**

I’ve published a detailed video that explains how **Amazon EKS Auto Mode** simplifies Kubernetes by removing the operational pain of managing nodes, scaling infrastructure, and handling compute provisioning manually.

🔗 **Watch the Lecture:** https://youtu.be/gDFH9jg4fGA

---

### 📘 In This Video, You Will Learn:

#### 1️⃣ What is AWS EKS (Classic EKS Cluster)?
- Understanding the traditional EKS architecture  
- Node groups, autoscaling, and compute management  
- Challenges with manual infra operations  

#### 2️⃣ What is AWS EKS Auto Mode?
- Automated compute provisioning based on Pod needs  
- No node groups, no EC2 capacity planning  
- Pod-driven infrastructure  
- Reduced operational overhead  

#### 3️⃣ Cost Management with EKS Auto Mode
- Pay only for pod-level compute  
- Better utilization vs classic node groups  
- Cost efficiency with mixed compute options  
- Avoiding over-provisioning  

#### 4️⃣ Difference Between Classic EKS vs EKS Auto Mode
![EKS Auto Mode Diagram](https://github.com/arumullayaswanth/Kubernetes/blob/990d9d168e29fa90455176b86c83c65064bed122/19.%20EKS%20Auto%20mode/images.png?raw=1)


#### 5️⃣ How to Create an EKS Auto Mode Cluster
- Step-by-step walkthrough  
- Creating cluster  
- Enabling Auto Mode features  
- Deploying workloads  

#### 6️⃣ OpenTelemetry Kubernetes Deployment
- Adding observability to your EKS Auto Mode setup  
- Deploying OTel Collector  
- Collecting metrics & traces  
- Integrating with your preferred backend (X-Ray, Prometheus, Grafana, etc.)


## 7️⃣ eks-node-viewer — Full Guide: Real-Time EKS Node Insights & Troubleshooting

Use **eks-node-viewer** to visualize EKS nodes, pods, and resource usage in real time — extremely helpful for Auto Mode demos.

### ▶️ **Installation Guide (Windows)**

```bash
#eks-node-viewer Full Guide: Real-Time EKS Node Insights & Troubleshooting

# Go to your home directory
cd ~

# Download just the exe file (not the zip)
curl -L -o eks-node-viewer.exe https://github.com/awslabs/eks-node-viewer/releases/download/v0.7.0/eks-node-viewer_Windows_x86_64.exe

# Make sure it downloaded properly (should be several MB)
ls -lh eks-node-viewer.exe

# Run it
./eks-node-viewer.exe

```
### ▶️ Move to a Permanent Location
```bash
# Create bin directory
mkdir $HOME\bin

# Move the existing file
Move-Item .\eks-node-viewer.exe $HOME\bin\ -Force

# Add to PATH for current session
$env:PATH += ";$HOME\bin"

# Add to PATH permanently
[Environment]::SetEnvironmentVariable("Path", $env:PATH + ";$HOME\bin", [EnvironmentVariableTarget]::User)

# Now run it
eks-node-viewer
```

---
