############################
# cluster outputs
############################

output "cluster_name" {
  description = "EKS cluster name."
  value       = aws_eks_cluster.eks.name
}

output "cluster_endpoint" {
  description = "EKS cluster API server endpoint."
  value       = aws_eks_cluster.eks.endpoint
}

output "cluster_arn" {
  description = "EKS cluster ARN."
  value       = aws_eks_cluster.eks.arn
}

############################
# network outputs
############################

output "vpc_id" {
  description = "VPC ID used by the EKS cluster."
  value       = aws_vpc.eks_vpc.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs."
  value = [
    aws_subnet.public1.id,
    aws_subnet.public2.id
  ]
}

output "private_subnet_ids" {
  description = "Private subnet IDs."
  value = [
    aws_subnet.private1.id,
    aws_subnet.private2.id
  ]
}

############################
# node group outputs
############################

output "node_group_name" {
  description = "Managed node group name."
  value       = aws_eks_node_group.node_group.node_group_name
}

output "node_role_arn" {
  description = "IAM role ARN attached to the EKS worker nodes."
  value       = aws_iam_role.worker_role.arn
}

############################
# ec2 output
############################

output "ec2_public_ip" {
  description = "Public IP of the EC2 instance created in the public subnet."
  value       = aws_instance.eks.public_ip
}

############################
# storage addon output
############################

output "ebs_csi_role_arn" {
  description = "IAM role ARN used by the EBS CSI driver."
  value       = aws_iam_role.ebs_csi_role.arn
}

############################
# cluster autoscaler outputs
############################

output "cluster_autoscaler_role_arn" {
  description = "IAM role ARN used by the Cluster Autoscaler."
  value       = aws_iam_role.cluster_autoscaler_role.arn
}

output "cluster_autoscaler_helm_release_name" {
  description = "Helm release name for the Cluster Autoscaler."
  value       = helm_release.cluster_autoscaler.name
}
