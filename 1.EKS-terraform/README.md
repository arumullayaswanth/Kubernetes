# EKS Terraform Deployment Guide

This folder contains the Terraform code to create, update, and delete your Amazon EKS cluster.

## Workflow Trigger Rules

The GitHub Actions workflow file is:

`/.github/workflows/eks-terraform.yml`

This workflow works exactly like this:

1. Pull request trigger
   If you create or update a pull request with changes inside `1.EKS-terraform`, the pipeline runs automatically.

2. Manual trigger
   You can go to GitHub Actions and manually run the workflow whenever you want.

Important:

- It does not auto-trigger on `main`
- It does not auto-trigger on `master`
- It only auto-triggers on pull requests

## Manual Workflow Options

When you run the workflow manually, you can choose:

- `plan`
- `apply`
- `destroy`

If you select `destroy`, then you must set:

`confirm_destroy = yes`

That will delete the entire Terraform-managed cluster and its related resources.

## GitHub Repository Secrets

Open:

`GitHub Repository -> Settings -> Secrets and variables -> Actions`

Add these repository secrets:

1. `AWS_ACCESS_KEY_ID`
   Your AWS access key ID

2. `AWS_SECRET_ACCESS_KEY`
   Your AWS secret access key

3. `AWS_REGION`
   Example:
   `us-east-1`

4. `TF_STATE_BUCKET`
   The S3 bucket name used to store Terraform state

## How To Create The S3 Bucket For Terraform State

Use a globally unique bucket name.

Example:

```bash
aws s3api create-bucket --bucket my-eks-terraform-state-bucket --region us-east-1
```

Enable versioning:

```bash
aws s3api put-bucket-versioning \
  --bucket my-eks-terraform-state-bucket \
  --versioning-configuration Status=Enabled
```

Enable default encryption:

```bash
aws s3api put-bucket-encryption \
  --bucket my-eks-terraform-state-bucket \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

Block public access:

```bash
aws s3api put-public-access-block \
  --bucket my-eks-terraform-state-bucket \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

Then store the bucket name inside GitHub as:

`TF_STATE_BUCKET`

Terraform state key used by the workflow:

`eks/terraform.tfstate`

## How Terraform State Is Stored

This Terraform configuration now includes an S3 backend block.

GitHub Actions runs Terraform with:

- S3 bucket from `TF_STATE_BUCKET`
- region from `AWS_REGION`
- state key `eks/terraform.tfstate`
- encryption enabled

This means the state file is stored remotely in S3, not inside the GitHub runner.

## How To Run The Workflow Manually

Go to:

`GitHub Repository -> Actions -> EKS Terraform -> Run workflow`

Then choose:

- `plan` to see changes
- `apply` to deploy the cluster
- `destroy` to delete the cluster

If you choose `destroy`, set:

`confirm_destroy = yes`

## How To Deploy The Cluster Through GitHub Actions

1. Push your code to GitHub
2. Open `Actions`
3. Select `EKS Terraform`
4. Click `Run workflow`
5. Choose `apply`
6. Run the workflow

The workflow will:

- check Terraform formatting
- initialize the S3 backend
- validate Terraform
- apply the EKS Terraform code

## How To Delete The Entire Cluster Through GitHub Actions

1. Open `Actions`
2. Select `EKS Terraform`
3. Click `Run workflow`
4. Choose `destroy`
5. Set `confirm_destroy` to `yes`
6. Run the workflow

Terraform will destroy all resources managed by this folder.

## How To Run Terraform Locally

Open terminal inside:

`1.EKS-terraform`

Run init:

```bash
terraform init \
  -backend-config="bucket=my-eks-terraform-state-bucket" \
  -backend-config="key=eks/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="encrypt=true"
```

Validate:

```bash
terraform validate
```

Plan:

```bash
terraform plan
```

Apply:

```bash
terraform apply
```

Destroy:

```bash
terraform destroy
```

## How To Connect To Your Cluster After Deployment

Your current cluster name in this Terraform is:

`eksprod`

Your current region in this Terraform is:

`us-east-1`

Update kubeconfig:

```bash
aws eks update-kubeconfig --region us-east-1 --name eksprod
```

Check nodes:

```bash
kubectl get nodes
```

Check all pods:

```bash
kubectl get pods -A
```

Check services:

```bash
kubectl get svc -A
```

Check Helm releases:

```bash
helm list -A
```

## Useful AWS And Kubernetes Commands

Describe cluster:

```bash
aws eks describe-cluster --name eksprod --region us-east-1
```

List node groups:

```bash
aws eks list-nodegroups --cluster-name eksprod --region us-east-1
```

Check autoscaler pod:

```bash
kubectl get pods -n kube-system | grep autoscaler
```

Check EBS CSI driver:

```bash
kubectl get pods -n kube-system | grep ebs
```

Check cluster info:

```bash
kubectl cluster-info
```

## Notes

- Pull requests trigger the pipeline automatically
- Push to `main` or `master` does not trigger the workflow
- Manual workflow run is required for actual deployment or deletion
- The S3 bucket must exist before running the workflow
- Your AWS credentials must have permissions for EKS, EC2, VPC, IAM, Auto Scaling, and S3
