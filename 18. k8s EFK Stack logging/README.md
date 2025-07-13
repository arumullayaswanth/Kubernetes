# Step-by-Step Guide to Deploy the EFK Stack

## 🏠 Architecture

<table style="width: 100%; margin-bottom: 20px;">
  <tr>
    <td align="center" style="padding: 10px; background-color: #e9f7f5; border-radius: 8px;">
      <img src="https://github.com/arumullayaswanth/Kubernetes/blob/8fa8f8961a264819dab364f88ff575b363522e0b/18.%20k8s%20EFK%20Stack%20logging/project%20architecture.png" width="1000%" style="border: 2px solid #ddd; border-radius: 10px;">
      <br><b> Deploy the EFK Stack</b>
    </td>
  </tr>
</table>

## Step-1 : EFK stands for Elasticsearch, Fluent bit, and Kibana.

### Elasticsearch :
- Elasticsearch is a scalable and distributed search engine that is commonly used to store large amounts of log data. It is a NoSQL database. Its primary function is to store and retrieve logs from fluent bit.

### Fluent Bit:
- **Fluent Bit** is a logging and metrics processor and forwarder that is extremely fast, lightweight, and highly scalable. Because of its performance-oriented design, it is simple to collect events from various sources and ship them to various destinations without complexity.
### Kibana :
 - **Kibana** is a graphical user interface (GUI) tool for data visualization, querying, and dashboards. It is a query engine that lets you explore your log data through a web interface, create visualizations for event logs, and filter data to detect problems. Kibana is being used to query elasticsearch indexed data.

## Step-2: Why do we need EFK Stack? 
- Using the EFK stack in your Kubernetes cluster can make it much easier to collect, store, and analyze log data from all the pods and nodes in your cluster, making it more manageable and more accessible for different users.

- The kubectl logs command is useful for looking at logs from individual pods, but it can quickly become unwieldy when you have a large number of pods running in your cluster.

- With the EFK stack, you can collect logs from all the nodes and pods in your cluster and store them in a central location. It allows you to quickly troubleshoot issues and identify patterns in your log data.

- It also enables people who are not familiar with using the command line to check logs and keep track of the Kubernetes cluster and the applications that are deployed on it.

- It also allows you to easily create alerts, dashboards, and create monitoring and reporting capabilities that can give you an overview of your system’s health and performance, and It will notify you in real-time if something goes wrong.

- we will be deploying EFK components as follows:

1. **Elasticsearch** is deployed as statefulset as it stores the log data.
2. **Kibana** is deployed as deployment and connects to elasticsearch service endpoint.
3. **Fluent-bit** is deployed as a daemonset to gather the container logs from every node. It connects to the Elasticsearch service endpoint to forward the logs.

## Prerequisites
1. Create an EC2 instance with `t2.medium`.
2. Install `kubectl` and `eksctl` on your system.

### Install `kubectl`
```bash
# 1. Download kubectl
curl -LO "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# 2. Make it executable
chmod +x ./kubectl

# 3. Move it to a directory in your PATH
sudo mv ./kubectl /usr/local/bin

# 4. Verify the installation  
kubectl version --client

```

### Install `eksctl`
```bash
   curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
   sudo mv /tmp/eksctl /usr/local/bin
   eksctl version
```
### Create an IAM Role and attache it to EC2 instance 
**NOTE :** create IAM user with programmatic access if your bootstrap system is outside of AWS IAM user should have access to
- IAM
- EC2
- VPC
- CloudFormation

## Step 1: Create an EKS Cluster
Create a `clusterconfig.yaml` file with the following content:
```bash
vim eks-cluster-config.yaml
```
```yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: "uat-dev"
  region: "us-east-1"
  version: "1.33"

nodeGroups:
  - name: ng-1
    instanceType: t3.medium
    desiredCapacity: 3     # Cluster starts with 3 nodes
    minSize: 2             # Minimum nodes: 2
    maxSize: 10            # Maximum nodes: 10 (Auto Scales up to this)
    volumeSize: 30
    ssh:
      allow : true
      publicKeyName: us-east-1   # 🔁 Replace with your actual EC2 key pair name


```
Run the command:
```bash
eksctl create cluster -f eks-cluster-config.yaml
```
```bash
 aws eks --region us-east-1 update-kubeconfig --name uat-dev
```
- example output:
```bash
Updated context arn:aws:eks:us-east-1:421954350274:cluster/uat-dev in /root/.kube/config
```
```bash
eksctl get nodegroup --cluster uat-dev --region us-east-1
```
- example output:
```bash
CLUSTER NODEGROUP : `uat-dev`
STATUS : `ng-1 `
CREATED:  `CREATE_COMPLETE 2025-07-12T10:20:58Z`
MIN SIZE : `2`
MAX SIZE : `10`
DESIRED CAPACITY : `3`
INSTANCE TYPE : `t3.medium` 
IMAGE ID : `ami-0e26ca27395ce58ad`
ASG NAME : `eksctl-uat-dev-nodegroup-ng-1-NodeGroup-IbEoN15Va2Mt`
TYPE : `unmanaged`
```
```bash
  kubectl get nodes
```
- output
```bash
NAME                             STATUS   ROLES    AGE   VERSION
ip-192-168-10-32.ec2.internal    Ready    <none>   21m   v1.33.0-eks-802817d
ip-192-168-47-2.ec2.internal     Ready    <none>   21m   v1.33.0-eks-802817d
ip-192-168-63-193.ec2.internal   Ready    <none>   21m   v1.33.0-eks-802817d
``` 
---

## Step-3 : Give the cluster Administrator access / EBS access.

#### 1. Add Necessary Permissions to Node IAM Role
- Go back to your cluster and open the **Compute** tab.
- Click on your **Node Group**.
- Go to the **Details** tab.
- Copy the **Node IAM Role** (you’ll need this for the next step).

#### 2. Attach EBS CSI Policy to the Node IAM Role
- Go to the **IAM** section of the AWS Console.
- Search for and select the IAM Role you copied earlier.
- Click **Add permissions**.
- Choose **Attach policies directly**.
- Search for and attach the policy: `AmazonEBSCSIDriverPolicy`.
- Click **Add permissions** to confirm.

✅ Done!

---

## Step-3: Configure cluster with dynamic volume provisioning by installing EBS CSI driver.
This guide explains how to install the Amazon EBS CSI Driver manually using the AWS Console.
#### 📌 Prerequisites
- A running EKS cluster
- kubectl configured to connect to your cluster
- Give the cluster Administrator access / EBS access.


#### 1. Navigate to EKS Cluster in AWS Console
- Go to the **AWS Console**.
- Select **EKS** from the services.
- Click on your **Cluster Name** to open its details.

#### 2. Add the Amazon EBS CSI Driver Add-on
- Go to the **Add-ons** tab.
- Click **Get more add-ons**.
- In the search bar, type and select **Amazon EBS CSI Driver**.
- Click **Next**.
- Click **Next** again on the configuration page.
- Click **Create** to install the driver.


## 🧪 (Optional) Verify Installation via kubectl

```bash
kubectl get pods -n kube-system -l "app.kubernetes.io/name=aws-ebs-csi-driver"
```
```bash
NAME                                  READY   STATUS    RESTARTS   AGE
ebs-csi-controller-5fb545bdd9-28frd   5/6     Running   0          18s
ebs-csi-controller-5fb545bdd9-z5d9x   5/6     Running   0          18s
ebs-csi-node-2fk5l                    3/3     Running   0          19s
ebs-csi-node-9vwgj                    3/3     Running   0          19s
ebs-csi-node-jk5kt                    3/3     Running   0          19s
```
- example outupt
---

## Step 4: Create a Namespace
Create a `custom-namespace.yaml` file:
```bash
vim custom-namespace.yaml
```
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kube-logging
  labels:
    name: kube-logging

```
Apply the namespace:
```bash
kubectl apply -f custom-namespace.yaml
```
```bash
kubectl get namespace kube-logging
```
- example output:
```bash
NAME           STATUS   AGE
kube-logging   Active   12s
```

## Step 5: Create StorageClass named “ebs-storage“
Create a `storage-cls.yaml` file:
```bash
vim storage-cls.yaml
```
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-storage
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Retain
parameters:
  type: gp2
```
Apply the StorageClass:
```bash
kubectl apply -f storage-cls.yaml
```
```bash
kubectl get storageclass
```
- example output
```bash
NAME          PROVISIONER             RECLAIMPOLICY   VOLUMEBINDINGMODE      ALLOWVOLUMEEXPANSION   AGE
ebs-storage   ebs.csi.aws.com         Retain          WaitForFirstConsumer   false                  25s
gp2           kubernetes.io/aws-ebs   Delete          WaitForFirstConsumer   false                  30m

```

## Step 6: Set Up Elasticsearch
1. Creating the Elasticsearch StatefulSet
    - Deploying Elasticsearch as a StatefulSets pods are created and deleted in a specific order,ensuring that your data is not lost. 
    - This is especially useful for Elasticsearch, as it helps ensure that data is not lost during deployments and scaling events.

2. Create a `elasticsearch-sts.yaml` file for the StatefulSet.
```bash
vim elasticsearch-sts.yaml
```
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: es-cluster
  namespace: kube-logging
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      initContainers:
        - name: fix-permissions
          image: busybox
          command: ["sh", "-c", "chown -R 1000:1000 /usr/share/elasticsearch/data"]
          securityContext:
            runAsUser: 0
            privileged: true
          volumeMounts:
            - name: data
              mountPath: /usr/share/elasticsearch/data
        - name: increase-vm-max-map
          image: busybox
          command: ["sh", "-c", "sysctl -w vm.max_map_count=262144"]
          securityContext:
            runAsUser: 0
            privileged: true
        - name: increase-fd-ulimit
          image: busybox
          command: ["sh", "-c", "ulimit -n 65536"]
          securityContext:
            runAsUser: 0
            privileged: true

      containers:
        - name: elasticsearch
          image: docker.elastic.co/elasticsearch/elasticsearch:7.2.0
          resources:
            limits:
              cpu: "1000m"
              memory: 2Gi
            requests:
              cpu: "500m"
              memory: 1Gi
          ports:
            - containerPort: 9200
              name: rest
              protocol: TCP
            - containerPort: 9300
              name: inter-node
              protocol: TCP
          env:
            - name: cluster.name
              value: k8s-logs
            - name: node.name
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: discovery.seed_hosts
              value: "es-cluster-0.elasticsearch,es-cluster-1.elasticsearch,es-cluster-2.elasticsearch"
            - name: cluster.initial_master_nodes
              value: "es-cluster-0,es-cluster-1,es-cluster-2"
            - name: ES_JAVA_OPTS
              value: "-Xms512m -Xmx512m"
          volumeMounts:
            - name: data
              mountPath: /usr/share/elasticsearch/data

  volumeClaimTemplates:
    - metadata:
        name: data
        labels:
          app: elasticsearch
      spec:
        accessModes: [ "ReadWriteOnce" ]
        storageClassName: ebs-storage
        resources:
          requests:
            storage: 10Gi

```
3. Apply the configurations:
```bash
kubectl apply -f elasticsearch-sts.yaml
```
```bash
#Check if the StatefulSet is created
kubectl get statefulset -n kube-logging
```
- output
```bash
NAME          READY   AGE
es-cluster    3/3     2m
```
```bash
#Check pod status
kubectl get pods -n kube-logging -l app=elasticsearch
```
- output
```bash
NAME            READY   STATUS    RESTARTS   AGE
es-cluster-0    1/1     Running   0          2m
es-cluster-1    1/1     Running   0          1m
es-cluster-2    1/1     Running   0          50s
```
```bash
#Describe the pods (for troubleshooting)
kubectl describe pod es-cluster-0 -n kube-logging
```
```bash
#Check pod logs
kubectl logs es-cluster-0 -n kube-logging
```

4. **what is headless service ?**
    - A headless Service is a type of Kubernetes Service that does not allocate a cluster IP address.
    - Instead, a headless Service uses DNS to expose the IP addresses of the Pods that are associated with the Service. 
    - This allows you to connect directly to the Pods, instead of going through a proxy.

5. **Creating the Headless Service**
    - Now Let’s set up elasticsearch, a Kubernetes headless service that will define a DNS domain for pods.
    - A headless service lacks load balancing and has no static IP address.
    - Let’s create a Headless Service for an elasticsearch


7. Create a `elasticsearch-svc.yaml` file for the headless service.
```bash
vim elasticsearch-svc.yaml
```
```yaml
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  namespace: kube-logging
  labels:
    app: elasticsearch
spec:
  selector:
    app: elasticsearch
  clusterIP: None  # Headless service for StatefulSet
  ports:
    - name: rest
      port: 9200
      targetPort: 9200
    - name: inter-node
      port: 9300
      targetPort: 9300


```
8. Apply the configurations:
```bash
kubectl apply -f elasticsearch-svc.yaml
```
9. verify the pods related to StatefulSet got created and verify the replication enabled.
```bash
kubectl get pod -n kube-logging
kubectl get svc elasticsearch -n kube-logging
kubectl describe svc elasticsearch -n kube-logging

```

## Step 7: Set Up Kibana
1. **Creating the Kibana Deployment**
- Kibana can be set up as a simple Kubernetes deployment. 
- If you look at the Kibana deployment manifest file, 
you’ll notice that we have an env variable ELASTICSEARCH_URL defined to configure the Elasticsearch cluster endpoint.
- Kibana communicates to elasticsearch via the endpoint URL.

2. Create a `kibana-deploy.yaml` file for the deployment.
```bash
vim kibana-deploy.yaml
```
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kibana
  namespace: kube-logging
  labels:
    app: kibana
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kibana
  template:
    metadata:
      labels:
        app: kibana
    spec:
      containers:
        - name: kibana
          image: docker.elastic.co/kibana/kibana:7.2.0
          resources:
            limits:
              cpu: 1000m
              memory: 1Gi
            requests:
              cpu: 700m
              memory: 1Gi
          env:
            - name: ELASTICSEARCH_HOSTS
              value: "http://elasticsearch:9200"  # ✅ Correct env var name for Kibana 7.x+
          ports:
            - containerPort: 5601
              name: http


```
3. Apply the configurations:
```bash
kubectl apply -f kibana-deploy.yaml
```
- 🧪 To Check:
```bash
kubectl get pods -n kube-logging -l app=kibana
kubectl logs -n kube-logging deployment/kibana
```

4. **Creating the Kibana Service**
    - Let’s make a NodePort service to access the Kibana UI via the node IP address.
    - For demonstration purposes or testing, however, 
    it’s not considered a best practice for actual production use. 
    - The Kubernetes ingress with a ClusterIP service is a more secure and way to expose the Kibana UI.

5. Create a `kibana-svc.yaml` file for the service.
```bash
vim kibana-svc.yaml
```
```yaml
apiVersion: v1
kind: Service
metadata:
  name: kibana
  namespace: kube-logging
  labels:
    app: kibana
spec:
  type: NodePort
  ports:
    - port: 5601             # Port exposed inside the cluster
      targetPort: 5601       # Port on the container
      nodePort: 30856        # Optional: Custom NodePort (range 30000-32767)
      protocol: TCP
  selector:
    app: kibana

```    
6. Apply the configurations:
```bash
kubectl apply -f kibana-svc.yaml
```
5. Access Kibana
- Get the external IP or public IP of any node in your EKS cluster:
```bash
kubectl get nodes -o wide
```
```bash
kubectl get svc kibana -n kube-logging
```
- output:
```bash
NAME     TYPE       CLUSTER-IP    EXTERNAL-IP   PORT(S)          AGE
kibana   NodePort   10.100.4.19   <none>        5601:30838/TCP   43s
```
- Open your browser and go to:
```cpp
http://<EC2-node-public-IP>:30601
http://<any-worker-node-public-ip>:30856

```
**OR**

---

7. ✅ Notes
- If you're using a LoadBalancer type (e.g., for public access), replace `type: NodePort` with `type: LoadBalancer`.
- example code
```yaml
apiVersion: v1
kind: Service
metadata:
  name: kibana
  namespace: kube-logging
  labels:
    app: kibana
spec:
  type: LoadBalancer
  ports:
    - port: 5601
      targetPort: 5601
  selector:
    app: kibana
```
- Apply the Service
```bash
kubectl apply -f kibana-lb-service.yaml
```
- Check the External LoadBalancer IP
```bash
kubectl get svc kibana -n kube-logging
```
- Output will look like:
```bash
NAME     TYPE           CLUSTER-IP     EXTERNAL-IP       PORT(S)          AGE
kibana   LoadBalancer   10.100.0.123   a1b2c3d4e5f6.elb.amazonaws.com   5601:31234/TCP   2m

```
- Access Kibana
- Open your browser:
```bash
http://<EXTERNAL-IP>:5601
```
or
```cpp
http://<ELB-DNS>:5601
```
---


## Step 8: Set Up Fluent Bit
1. `fluentbit-cr.yaml` for ClusterRole.
```bash
vim fluentbit-cr.yaml
```
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: fluent-bit
  labels:
    app: fluent-bit
rules:
  - apiGroups: [""]
    resources:
      - pods
      - namespaces
    verbs: ["get", "list", "watch"]
```
- Apply the configurations:

```bash
kubectl apply -f fluentbit-cr.yaml
```
2. **Creating the Fluent-bit Role Binding**
    - ClusterRoleBinding to bind this ClusterRole to Service Account, which will give that ServiceAccount the permissions defined in the ClusterRole.
    -  `fluentbit-crb.yaml` for ClusterRoleBinding.
```bash
vim fluentbit-crb.yaml
```
```yaml
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: fluent-bit
roleRef:
  kind: ClusterRole
  name: fluent-bit
  apiGroup: rbac.authorization.k8s.io
subjects:
  - kind: ServiceAccount
    name: fluent-bit
    namespace: kube-logging
```
- Apply the configurations:
```bash
kubectl apply -f fluentbit-crb.yaml
```
3. Creating the Fluent-bit Service Account
 - A Service Account is a Kubernetes resource that allows you to control access to the Kubernetes API for a set of pods, which determines what the pods are allowed to do.
 - You can attach roles and role bindings to the service account, 
 to give it specific permissions to access the Kubernetes API, 
 this is done through Kubernetes Role and Rolebinding resources.
 - `fluentbit-sa.yaml` for ServiceAccount.
```bash
vim fluentbit-sa.yaml
```
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: fluent-bit
  namespace: kube-logging
  labels:
    app: fluent-bit
```
- Apply the configurations:
```bash
kubectl apply -f fluentbit-sa.yaml
```
4. **Creating the Fluent-bit ConfigMap**
    - This ConfigMap is used to configure a Fluent-bit pod, by specifying the ConfigMap field in the pod definition.
    - This way when the pod starts it will use the configurations defined in the configmap. 
    ConfigMap can be updates and changes, 
    it will reflect in the pod without the need to recreate the pod itself.
    - `fluentbit-cm.yaml` for ConfigMap.
```bash
vim fluentbit-cm.yaml
```
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: kube-logging
  labels:
    k8s-app: fluent-bit
data:
  # Configuration files: server, input, filters and output
  # ======================================================
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level     info
        Daemon        off
        Parsers_File  parsers.conf
        HTTP_Server   On
        HTTP_Listen   0.0.0.0
        HTTP_Port     2020
    @INCLUDE input-kubernetes.conf
    @INCLUDE filter-kubernetes.conf
    @INCLUDE output-elasticsearch.conf
  input-kubernetes.conf: |
    [INPUT]
        Name              tail
        Tag               kube.*
        Path              /var/log/containers/*.log
        Parser            docker
        DB                /var/log/flb_kube.db
        Mem_Buf_Limit     5MB
        Skip_Long_Lines   On
        Refresh_Interval  10
  filter-kubernetes.conf: |
    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Kube_Tag_Prefix     kube.var.log.containers.
        Merge_Log           On
        Merge_Log_Key       log_processed
        K8S-Logging.Parser  On
        K8S-Logging.Exclude Off
  output-elasticsearch.conf: |
    [OUTPUT]
        Name            es
        Match           *
        Host            ${FLUENT_ELASTICSEARCH_HOST}
        Port            ${FLUENT_ELASTICSEARCH_PORT}
        Logstash_Format On
        Replace_Dots    On
        Retry_Limit     False
  parsers.conf: |
    [PARSER]
        Name   apache
        Format regex
        Regex  ^(?<host>[^ ]*) [^ ]* (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")?$
        Time_Key time
        Time_Format %d/%b/%Y:%H:%M:%S %z
    [PARSER]
        Name   apache2
        Format regex
        Regex  ^(?<host>[^ ]*) [^ ]* (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^ ]*) +\S*)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")?$
        Time_Key time
        Time_Format %d/%b/%Y:%H:%M:%S %z
    [PARSER]
        Name   apache_error
        Format regex
        Regex  ^\[[^ ]* (?<time>[^\]]*)\] \[(?<level>[^\]]*)\](?: \[pid (?<pid>[^\]]*)\])?( \[client (?<client>[^\]]*)\])? (?<message>.*)$
    [PARSER]
        Name   nginx
        Format regex
        Regex ^(?<remote>[^ ]*) (?<host>[^ ]*) (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")?$
        Time_Key time
        Time_Format %d/%b/%Y:%H:%M:%S %z
    [PARSER]
        Name   json
        Format json
        Time_Key time
        Time_Format %d/%b/%Y:%H:%M:%S %z
    [PARSER]
        Name        docker
        Format      json
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L
        Time_Keep   On
    [PARSER]
        Name        syslog
        Format      regex
        Regex       ^\<(?<pri>[0-9]+)\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\/\.\-]*)(?:\[(?<pid>[0-9]+)\])?(?:[^\:]*\:)? *(?<message>.*)$
        Time_Key    time
        Time_Format %b %d %H:%M:%S
```
- Apply the configurations:
```bash
kubectl apply -f fluentbit-cm.yaml
```

## Step 9: Daemon set
```bash
vim fluentbit-ds.yaml
```
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: kube-logging
  labels:
    k8s-app: fluent-bit-logging
    version: v1
    kubernetes.io/cluster-service: "true"
spec:
  selector:
    matchLabels:
      k8s-app: fluent-bit-logging
  template:
    metadata:
      labels:
        k8s-app: fluent-bit-logging
        version: v1
        kubernetes.io/cluster-service: "true"
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "2020"
        prometheus.io/path: /api/v1/metrics/prometheus
    spec:
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:1.3.11
          imagePullPolicy: Always
          ports:
            - containerPort: 2020
          env:
            - name: FLUENT_ELASTICSEARCH_HOST
              value: "elasticsearch"
            - name: FLUENT_ELASTICSEARCH_PORT
              value: "9200"
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
            - name: fluent-bit-config
              mountPath: /fluent-bit/etc/
      terminationGracePeriodSeconds: 10
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
        - name: fluent-bit-config
          configMap:
            name: fluent-bit-config
      serviceAccountName: fluent-bit
      tolerations:
        - key: node-role.kubernetes.io/master
          operator: Exists
          effect: NoSchedule
        - operator: "Exists"
          effect: "NoExecute"
        - operator: "Exists"
          effect: "NoSchedule"
```
```bash
kubectl apply -f fluentbit-ds.yaml
```
```bash
kubectl get daemonset fluent-bit -n kube-logging
```

## Step 10: Access Kibana
1. Get the Node IP and NodePort of the Kibana service:
```bash
kubectl get svc -n kube-logging
```
2. Access Kibana using `http://<NodeIP>:<NodePort>`.

## Step 10: Create an Index Pattern in Kibana
1. Open the Kibana dashboard.
2. Create an index pattern to view logs.

You can now deploy applications and monitor logs in Kibana.


## step 11: Delete Everything with One Command (if all resources were in YAML files
1. Identify the pod on the node:
```bash
kubectl get pods --all-namespaces -o wide 
```
2. Delete the pod forcefully:
```bash
kubectl delete pod <pod-name> -n <namespace> --grace-period=0 --force
```
- example
  ```bash
kubectl delete daemonset aws-node -n kube-system
kubectl delete daemonset kube-proxy -n kube-system
kubectl delete daemonset ebs-csi-node -n kube-system
kubectl delete daemonset fluent-bit -n kube-logging
```
3.
```bah
eksctl delete cluster --name uat-dev --disable-nodegroup-eviction
```
```bash
kubectl delete -f eks-cluster-config.yaml

```
