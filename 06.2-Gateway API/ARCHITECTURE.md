# Gateway API — Architecture Diagrams

---

## 1. paytam-app — Basic Gateway Routing

One app, one domain, straight through routing.

```
                        ┌─────────────────────────────────────────┐
                        │           INTERNET                       │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         Route53 DNS                      │
                        │   paytam.yourdomain.com → ALB            │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         AWS ALB                          │
                        │   Port 80  → redirect to 443            │
                        │   Port 443 → HTTPS with ACM cert        │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         Gateway Resource                 │
                        │   gatewayClassName: alb                  │
                        │   namespace: paytam                      │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         HTTPRoute                        │
                        │   host: paytam.yourdomain.com           │
                        │   path: /  →  paytam-svc:80             │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         ClusterIP Service                │
                        │         paytam-svc:80                    │
                        └──────────┬────────────┬─────────────────┘
                                   │            │
                                   ▼            ▼
                             ┌──────────┐ ┌──────────┐
                             │  Pod 1   │ │  Pod 2   │
                             │  paytam  │ │  paytam  │
                             └──────────┘ └──────────┘

Concept: Single app exposed via Gateway API with HTTPS.
         User hits domain → ALB → Gateway → HTTPRoute → Service → Pods.
```

---

## 2. url-rewrite — URL Rewrite Routing

User types one URL, pod receives a different URL.

```
                        ┌─────────────────────────────────────────┐
                        │           INTERNET                       │
                        └──────────────────┬──────────────────────┘
                                           │
                              User types different paths
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                       │
                    ▼                      ▼                       ▼
             /app/dashboard          /paytam/home            /api/v1/users
                    │                      │                       │
                    └──────────────────────┼──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         AWS ALB + Gateway                │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         HTTPRoute — URL Rewrite Rules    │
                        │                                          │
                        │  /app/*       →  rewrite to  /*         │
                        │  /paytam/*    →  rewrite to  /*         │
                        │  /api/v1/*    →  rewrite to  /api/*     │
                        │  /*           →  no rewrite             │
                        └──────────────────┬──────────────────────┘
                                           │
                              Pod receives rewritten URL
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                       │
                    ▼                      ▼                       ▼
             /dashboard              /home               /api/users
                    │                      │                       │
                    └──────────────────────┼──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         paytam-svc → Pods                │
                        └─────────────────────────────────────────┘

Concept: Public URL is different from internal URL.
         Gateway rewrites the path before forwarding to the pod.
         Pod never sees /app or /paytam — it only sees /.
```

---

## 3. traffic-splitting — Canary Deployment (90% / 10%)

Gradually roll out a new version to a small percentage of users.

```
                        ┌─────────────────────────────────────────┐
                        │           INTERNET                       │
                        │         100 users visit                  │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         AWS ALB + Gateway                │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         HTTPRoute — Traffic Split        │
                        │                                          │
                        │         weight: 90    weight: 10         │
                        └──────────┬────────────────┬─────────────┘
                                   │                │
                          90 users │                │ 10 users
                                   │                │
                                   ▼                ▼
                    ┌──────────────────┐  ┌──────────────────────┐
                    │  paytam-svc-v1   │  │   paytam-svc-v2      │
                    │  (stable)        │  │   (canary)           │
                    └────────┬─────────┘  └──────────┬───────────┘
                             │                        │
                    ┌────────┴─────────┐   ┌──────────┴──────────┐
                    │                  │   │                      │
                    ▼                  ▼   ▼                      ▼
              ┌──────────┐      ┌──────────┐              ┌──────────┐
              │  Pod v1  │      │  Pod v1  │              │  Pod v2  │
              │  paytam  │      │  paytam  │              │  swiggy  │
              └──────────┘      └──────────┘              └──────────┘

Concept: New version (v2/swiggy) gets only 10% of traffic.
         If v2 has no issues → increase weight gradually.
         If v2 has issues   → set weight to 0 → instant rollback.
         No downtime. No redeployment needed to change split.
```

---

## 4. weighted — Equal Split (50% / 50%, No Weight Mentioned)

Two backends, no weight specified — Kubernetes splits equally.

```
                        ┌─────────────────────────────────────────┐
                        │           INTERNET                       │
                        │         100 users visit                  │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         AWS ALB + Gateway                │
                        └──────────────────┬──────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────┐
                        │         HTTPRoute                        │
                        │                                          │
                        │   backendRefs:                           │
                        │   - name: paytam-svc-v1  ← no weight    │
                        │   - name: paytam-svc-v2  ← no weight    │
                        │                                          │
                        │   Result: Kubernetes defaults to 50/50   │
                        └──────────┬────────────────┬─────────────┘
                                   │                │
                          50 users │                │ 50 users
                                   │                │
                                   ▼                ▼
                    ┌──────────────────┐  ┌──────────────────────┐
                    │  paytam-svc-v1   │  │   paytam-svc-v2      │
                    └────────┬─────────┘  └──────────┬───────────┘
                             │                        │
                    ┌────────┴─────────┐   ┌──────────┴──────────┐
                    │                  │   │                      │
                    ▼                  ▼   ▼                      ▼
              ┌──────────┐      ┌──────────┐              ┌──────────┐
              │  Pod v1  │      │  Pod v1  │              │  Pod v2  │
              │  paytam  │      │  paytam  │              │  swiggy  │
              └──────────┘      └──────────┘              └──────────┘

Concept: When weight is NOT mentioned, all backends get equal share.
         2 backends = 50/50.
         3 backends = 33/33/33.
         This is Kubernetes default behavior.
```

---

## Summary — All 4 Concepts At A Glance

```
┌─────────────────┬──────────────────────────────────────────────────────┐
│ Folder          │ Concept                                               │
├─────────────────┼──────────────────────────────────────────────────────┤
│ paytam-app      │ Basic routing — 1 app, 1 domain, straight through    │
├─────────────────┼──────────────────────────────────────────────────────┤
│ url-rewrite     │ Path rewriting — public URL ≠ internal URL           │
├─────────────────┼──────────────────────────────────────────────────────┤
│ traffic-        │ Canary — 90% stable, 10% new version                 │
│ splitting       │ Explicit weights. Gradual rollout with easy rollback  │
├─────────────────┼──────────────────────────────────────────────────────┤
│ weighted        │ Equal split — no weight = 50/50 by default           │
│                 │ Kubernetes default behavior when weight not set       │
└─────────────────┴──────────────────────────────────────────────────────┘
```


---

## AI Image Generation Prompts

Copy these prompts into any AI image generator like ChatGPT, Midjourney, or DALL-E to generate architecture diagrams.

---

### Prompt 1 — paytam-app (Basic Gateway Routing)

```
Create a clean technical architecture diagram with a white background.
Title: "Basic Gateway API Routing".
Show a vertical flow from top to bottom with these boxes connected by arrows:
1. "Internet / User" at the top
2. "Route53 DNS" - resolves domain to ALB
3. "AWS ALB" - handles HTTPS port 443 and redirects HTTP 80 to HTTPS
4. "Kubernetes Gateway" - gatewayClassName: alb, namespace: paytam
5. "HTTPRoute" - host: paytam.yourdomain.com, path: / → paytam-svc
6. "ClusterIP Service paytam-svc:80"
7. Two boxes side by side at the bottom: "Pod 1 paytam" and "Pod 2 paytam"
Use blue color for AWS components, green for Kubernetes components.
Add a label at the bottom: "Concept: Single app, single domain, straight through routing"
Style: professional, minimal, flat design, suitable for technical documentation.
```

---

### Prompt 2 — url-rewrite (URL Rewrite Routing)

```
Create a clean technical architecture diagram with a white background.
Title: "Gateway API URL Rewrite".
Show this flow:
At the top show three user requests side by side:
- User types "/app/dashboard"
- User types "/paytam/home"
- User types "/api/v1/users"
All three arrows merge into one "AWS ALB + Gateway" box in the middle.
Below that show a "HTTPRoute - Rewrite Rules" box with these rules listed inside:
- /app/* → rewrites to /*
- /paytam/* → rewrites to /*
- /api/v1/* → rewrites to /api/*
Below that show three arrows going down to "paytam-svc Pods" box showing the rewritten paths:
- /dashboard
- /home
- /api/users
Use orange color for the rewrite transformation arrows to highlight the change.
Add label: "Concept: Public URL is different from what the pod receives"
Style: professional, minimal, flat design, suitable for technical documentation.
```

---

### Prompt 3 — traffic-splitting (Canary Deployment)

```
Create a clean technical architecture diagram with a white background.
Title: "Traffic Splitting - Canary Deployment (90% / 10%)".
Show this flow:
At the top: "100 Users" box
Arrow down to "AWS ALB + Gateway" box
Arrow down to "HTTPRoute" box showing "weight: 90" on left side and "weight: 10" on right side
Split into two paths:
Left path (thick arrow, labeled "90 users"):
- "paytam-svc-v1 (Stable)" service box
- Two pods below: "Pod v1 paytam" and "Pod v1 paytam"
Right path (thin arrow, labeled "10 users"):
- "paytam-svc-v2 (Canary)" service box
- One pod below: "Pod v2 swiggy"
Use green color for v1 stable path and yellow/orange for v2 canary path.
Add a note box on the side: "If v2 has issues → set weight to 0 → instant rollback"
Add label: "Concept: Gradually roll out new version to small % of users"
Style: professional, minimal, flat design, suitable for technical documentation.
```

---

### Prompt 4 — weighted (Equal Split 50/50)

```
Create a clean technical architecture diagram with a white background.
Title: "Weighted Routing - No Weight = 50/50 Default".
Show this flow:
At the top: "100 Users" box
Arrow down to "AWS ALB + Gateway" box
Arrow down to "HTTPRoute" box with a code snippet inside showing:
backendRefs:
- name: paytam-svc-v1  (no weight)
- name: paytam-svc-v2  (no weight)
And a highlighted note inside: "Kubernetes Default = Equal Weight"
Split into two equal paths with equal thickness arrows:
Left path (labeled "50 users"):
- "paytam-svc-v1" service box
- Two pods: "Pod v1 paytam" and "Pod v1 paytam"
Right path (labeled "50 users"):
- "paytam-svc-v2" service box
- Two pods: "Pod v2 swiggy" and "Pod v2 swiggy"
Both paths same color and same thickness to show equal split.
Add label: "Concept: When weight is not mentioned, all backends get equal share"
Style: professional, minimal, flat design, suitable for technical documentation.
```

---

### Where To Use These Prompts

| Tool | How To Use |
|---|---|
| ChatGPT (GPT-4o) | Paste prompt → ask to generate image |
| DALL-E | Paste prompt directly |
| Midjourney | Paste prompt in Discord |
| Adobe Firefly | Paste prompt in text box |
| Canva AI | Use in AI image generator |
