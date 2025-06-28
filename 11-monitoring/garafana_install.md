# Install using Helm

## Add helm repo

`helm repo add grafana https://grafana.github.io/helm-charts`

## Update helm repo

`helm repo update`

## Install helm 

`helm install grafana grafana/grafana`

## Expose Grafana Service

`kubectl expose service grafana — type=NodePort — target-port=3000 — name=<requiredname>
(or)
edit the file-- kubectl edit svc <servicename>    now add NodePort or LoadBalancer inplace of clusterIp 
