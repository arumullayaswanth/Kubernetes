## Distributed Tracing on Amazon EKS

![Distributed Tracing on Amazon EKS](https://raw.githubusercontent.com/arumullayaswanth/Kubernetes/250881d4f59d81cbe55f7b812cdd2007811acaad/18.1%20eks-jaeger-observability(traces)/images/distributed%20tracing%20on%20Amazon%20EKS.jpg)

## Architecture Diagram for Distributed Tracing

![Architecture Diagram for Distributed Tracing](https://raw.githubusercontent.com/arumullayaswanth/Kubernetes/250881d4f59d81cbe55f7b812cdd2007811acaad/18.1%20eks-jaeger-observability(traces)/images/architecture%20diagram%20for%20distributed%20tracing.png)


## Components 

- Users
- Amazon Route 53
- AWS Certificate Manager (ACM)
- AWS Application Load Balancer (ALB)
- AWS Load Balancer Controller
- Amazon EKS
- Kubernetes worker nodes
- Sample Go application pods
- OpenTelemetry Collector
- Jaeger Collector
- Jaeger Query / Jaeger UI
- Elasticsearch StatefulSet
- Amazon EBS

## Traffic And Trace Flow

Show arrows in this order:

1. Users -> Route 53
2. Route 53 -> ALB
3. ACM connected to ALB for HTTPS
4. ALB -> Kubernetes Ingress in EKS
5. Ingress -> Jaeger Query / UI
6. Ingress -> Sample Go App
7. Sample Go App -> OpenTelemetry Collector using OTLP
8. OpenTelemetry Collector -> Jaeger Collector
9. Jaeger Collector -> Elasticsearch
10. Jaeger Query -> Elasticsearch
11. Elasticsearch -> Amazon EBS

## EKS View

Inside the EKS cluster, show:

- one `observability` namespace
- 2 to 3 worker nodes
- sample app pods on nodes
- OpenTelemetry Collector pods
- Jaeger components
- Elasticsearch StatefulSet pods

Keep this simple, like a block diagram, not a very deep technical wiring diagram.

## Labels To Add

Add readable labels for:

- Route 53
- ACM
- ALB
- EKS
- Sample Go App
- OpenTelemetry Collector
- Jaeger
- Elasticsearch
- EBS
- OTLP
- HTTPS

## Dashboard Elements

Add small dashboard-style visual hints:

- Jaeger UI icon or small browser panel
- trace search/dashboard style box near Jaeger Query
- optional small metrics/log style badge if needed
- but keep tracing as the main focus

## Best Practice Notes

Add short side labels or callouts:

- Multi-AZ EKS cluster
- HTTPS termination at ALB
- ClusterIP services inside cluster
- Distributed tracing with OpenTelemetry
- Trace storage in Elasticsearch
- Persistent storage on EBS

## Visual Layout

Make the layout top-to-bottom or left-to-right like this:

- top: users and DNS
- middle: ALB and EKS cluster
- lower-middle: Jaeger and OpenTelemetry components
- bottom: Elasticsearch and EBS

## Output Goal

The final image should look suitable for:

- college project presentation
- final year project report
- DevOps documentation
- architecture review slide

