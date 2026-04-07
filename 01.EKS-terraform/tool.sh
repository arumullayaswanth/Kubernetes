#!/bin/bash
# Update system
yum update -y

# ----------------------------- Install kubectl -----------------------------
curl -o /tmp/kubectl https://amazon-eks.s3.us-west-2.amazonaws.com/1.19.6/2021-01-05/bin/linux/amd64/kubectl
chmod +x /tmp/kubectl
mv /tmp/kubectl /usr/local/bin/kubectl

# Verify kubectl
kubectl version --client || true

# ----------------------------- Install eksctl -------------------------------
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" \
| tar xz -C /tmp

mv /tmp/eksctl /usr/local/bin/eksctl

# Verify eksctl
eksctl version || true

# ----------------------------- Install helm ---------------------------------
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify helm
helm version || true


# Install MariaDB
sudo yum install -y mariadb105-server
sudo systemctl start mariadb
sudo systemctl enable mariadb
mysql --version 
#systemctl status mariadb


# Install PostgreSQL 
sudo yum install -y postgresql15 postgresql15-server
sudo /usr/pgsql-15/bin/postgresql-15-setup initdb
sudo systemctl enable postgresql-15
sudo systemctl start postgresql-15
psql --version

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf awscliv2.zip aws

# Install Docker
sudo yum install -y docker
sudo systemctl enable docker
sudo systemctl start docker
docker --version || true

# Install Git
sudo yum install -y git
git --version || true
