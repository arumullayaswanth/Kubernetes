

# K8sGPT – AI Powered Troubleshooting for Kubernetes

Kubernetes troubleshooting can be complex and time-consuming.  
**K8sGPT** is an AI-powered tool that scans Kubernetes clusters, analyzes issues, and provides human-readable explanations with suggested fixes. :contentReference[oaicite:0]{index=0}

---

# 🎥 Video Tutorial

[![Watch the video](https://img.youtube.com/vi/ZY8PW4XgutM/maxresdefault.jpg)](https://www.youtube.com/watch?v=ZY8PW4XgutM)

Click the image above to watch the video.

Or open directly:  
https://youtu.be/ZY8PW4XgutM

---

# 📌 What is K8sGPT?

K8sGPT is an open-source AI tool designed to simplify Kubernetes troubleshooting.  
It analyzes cluster configurations, events, and logs, then converts technical errors into clear explanations and actionable recommendations. :contentReference[oaicite:1]{index=1}

In simple terms:

> K8sGPT acts like an AI assistant for your Kubernetes cluster.

It helps answer questions like:

- Why is a Pod stuck in **Pending** state?
- Why is a **Deployment failing**?
- What configuration error caused a failure?
- What commands can fix the issue?

---

# 🖼 Architecture

![K8sGPT Architecture](https://miro.medium.com/v2/resize:fit:1100/format:webp/1*E2m7q9WlH0h8dR_3gAtF1g.png)

K8sGPT architecture typically includes:

- Kubernetes Cluster
- K8sGPT Analyzer
- AI Backend (OpenAI / Gemini / others)
- CLI or Operator Interface

The tool gathers cluster data and sends sanitized information to the AI backend to generate troubleshooting insights.

---

# ⚙️ How K8sGPT Works

1. Connects to your Kubernetes cluster using **kubeconfig**
2. Scans cluster resources and events
3. Extracts important diagnostic data
4. Sends the information to an AI model
5. Returns **human-readable explanations and solutions**

This significantly reduces the time required to debug Kubernetes issues.

---

# 🚀 Installation (CLI Example)

Install using Homebrew:

```bash
brew install k8sgpt
