############################
# cluster settings
############################

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster and node group."
  type        = string
  default     = "1.35"
}

############################
# cluster autoscaler settings
############################

variable "cluster_autoscaler_namespace" {
  description = "Namespace where the cluster autoscaler will run."
  type        = string
  default     = "kube-system"
}

variable "cluster_autoscaler_service_account_name" {
  description = "Service account name used by the cluster autoscaler."
  type        = string
  default     = "cluster-autoscaler"
}

variable "cluster_autoscaler_chart_version" {
  description = "Helm chart version for the cluster autoscaler."
  type        = string
  default     = "9.53.0"
}

variable "cluster_autoscaler_image_tag" {
  description = "Cluster autoscaler image tag. Keep this aligned with the EKS Kubernetes minor version."
  type        = string
  default     = "v1.35.0"
}
