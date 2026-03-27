############################
# cluster settings
############################

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster and node group."
  type        = string
  default     = "1.35"
}
