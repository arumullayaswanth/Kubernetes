############################
# cluster settings
############################

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster and node group."
  type        = string
  default     = "1.35"
}

variable "eks_admin_principal_arn" {
  description = "IAM principal ARN that should receive EKS cluster admin access. Leave empty to use the currently authenticated AWS principal."
  type        = string
  default     = ""
}
