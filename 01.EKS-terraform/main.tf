terraform {
  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = local.common_tags
  }
}

data "aws_caller_identity" "current" {}

locals {
  cluster_name        = "eksprod"
  admin_principal_arn = var.eks_admin_principal_arn != "" ? var.eks_admin_principal_arn : data.aws_caller_identity.current.arn

  common_tags = {
    Environment = "dev"
    Project     = "eks-project"
    Owner       = "yaswanth"
    ManagedBy   = "Terraform"
    Cluster     = local.cluster_name
  }
}

############################
# VPC
############################

resource "aws_vpc" "eks_vpc" {

  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "eks-vpc"
  }
}

resource "aws_internet_gateway" "igw" {

  vpc_id = aws_vpc.eks_vpc.id

  tags = {
    Name = "eks-igw"
  }
}

############################
# SUBNETS
############################

resource "aws_subnet" "public1" {

  vpc_id                  = aws_vpc.eks_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true

  tags = {
    Name                     = "eks-public-subnet-1"
    "kubernetes.io/role/elb" = "1"
  }
}

resource "aws_subnet" "public2" {

  vpc_id                  = aws_vpc.eks_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = true

  tags = {
    Name                     = "eks-public-subnet-2"
    "kubernetes.io/role/elb" = "1"
  }
}

resource "aws_subnet" "private1" {

  vpc_id            = aws_vpc.eks_vpc.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name                              = "eks-private-subnet-1"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

resource "aws_subnet" "private2" {

  vpc_id            = aws_vpc.eks_vpc.id
  cidr_block        = "10.0.4.0/24"
  availability_zone = "us-east-1b"

  tags = {
    Name                              = "eks-private-subnet-2"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

############################
# NAT GATEWAY
############################

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "eks-nat-eip"
  }
}

resource "aws_nat_gateway" "nat" {

  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public1.id

  tags = {
    Name = "eks-nat-gateway"
  }
}

############################
# ROUTE TABLES
############################

resource "aws_route_table" "public" {

  vpc_id = aws_vpc.eks_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "eks-public-route-table"
  }
}

resource "aws_route_table_association" "pub1" {

  subnet_id      = aws_subnet.public1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "pub2" {

  subnet_id      = aws_subnet.public2.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {

  vpc_id = aws_vpc.eks_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = {
    Name = "eks-private-route-table"
  }
}

resource "aws_route_table_association" "priv1" {

  subnet_id      = aws_subnet.private1.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "priv2" {

  subnet_id      = aws_subnet.private2.id
  route_table_id = aws_route_table.private.id
}

resource "aws_security_group" "allow_all" {

  name        = "allow-all-sg"
  description = "Allow all inbound and outbound traffic"
  vpc_id      = aws_vpc.eks_vpc.id

  ingress {

    description = "Allow all inbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"

    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {

    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"

    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "allow-all-sg"
  }
}
############################
# IAM ROLE - CLUSTER
############################

resource "aws_iam_role" "cluster_role" {

  name = "eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    Name = "eks-cluster-role"
  }
}

resource "aws_iam_role_policy_attachment" "cluster_policy" {

  role       = aws_iam_role.cluster_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

############################
# IAM ROLE - NODE GROUP
############################

resource "aws_iam_role" "worker_role" {

  name = "eks-worker-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    Name = "eks-worker-role"
  }
}

resource "aws_iam_role_policy_attachment" "worker_node" {

  role       = aws_iam_role.worker_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "cni" {

  role       = aws_iam_role.worker_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "ecr" {

  role       = aws_iam_role.worker_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

############################
# EKS CLUSTER
############################

resource "aws_eks_cluster" "eks" {

  name     = local.cluster_name
  role_arn = aws_iam_role.cluster_role.arn
  version  = var.cluster_version

  access_config {
    authentication_mode                         = "API_AND_CONFIG_MAP"
    bootstrap_cluster_creator_admin_permissions = true
  }

  vpc_config {

    subnet_ids = [
      aws_subnet.private1.id,
      aws_subnet.private2.id
    ]

    endpoint_public_access = true
  }

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policy
  ]

  tags = {
    Name = "eks-cluster"
  }
}

############################
# EKS ACCESS
############################

resource "aws_eks_access_entry" "cluster_admin" {
  count = var.manage_cluster_admin_access_entry ? 1 : 0

  cluster_name  = aws_eks_cluster.eks.name
  principal_arn = local.admin_principal_arn
  type          = "STANDARD"

  tags = {
    Name = "eks-cluster-admin-access-entry"
  }
}

resource "aws_eks_access_policy_association" "cluster_admin" {
  count = var.manage_cluster_admin_access_entry ? 1 : 0

  cluster_name  = aws_eks_cluster.eks.name
  principal_arn = local.admin_principal_arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [
    aws_eks_access_entry.cluster_admin
  ]
}

data "aws_eks_cluster" "eks" {
  name = aws_eks_cluster.eks.name

  depends_on = [
    aws_eks_cluster.eks
  ]
}

data "aws_eks_cluster_auth" "eks" {
  name = aws_eks_cluster.eks.name

  depends_on = [
    aws_eks_cluster.eks
  ]
}

############################
# NODE GROUP
############################

resource "aws_launch_template" "node_group" {

  name_prefix            = "eks-node-group-"
  update_default_version = true

  tag_specifications {
    resource_type = "instance"

    tags = {
      Name = "eks-cluster-node"
    }
  }

  tag_specifications {
    resource_type = "volume"

    tags = {
      Name = "eks-cluster-node-volume"
    }
  }

  tags = {
    Name = "eks-node-launch-template"
  }
}

resource "aws_eks_node_group" "node_group" {

  cluster_name    = aws_eks_cluster.eks.name
  node_group_name = "eks-node-group"

  node_role_arn = aws_iam_role.worker_role.arn
  version       = var.cluster_version

  subnet_ids = [
    aws_subnet.private1.id,
    aws_subnet.private2.id
  ]


  instance_types = ["t3.medium"]

  scaling_config {

    desired_size = 3
    max_size     = 10
    min_size     = 3
  }

  launch_template {
    id      = aws_launch_template.node_group.id
    version = aws_launch_template.node_group.latest_version
  }

  depends_on = [
    aws_iam_role_policy_attachment.worker_node,
    aws_iam_role_policy_attachment.cni,
    aws_iam_role_policy_attachment.ecr
  ]
  tags = {
    Name = "eks-node-group"
  }
}

resource "aws_autoscaling_group_tag" "node_instance_name" {

  autoscaling_group_name = aws_eks_node_group.node_group.resources[0].autoscaling_groups[0].name

  tag {
    key                 = "Name"
    value               = "eks-cluster-node"
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_group_tag" "cluster_autoscaler_owned" {

  autoscaling_group_name = aws_eks_node_group.node_group.resources[0].autoscaling_groups[0].name

  tag {
    key                 = "k8s.io/cluster-autoscaler/${local.cluster_name}"
    value               = "owned"
    propagate_at_launch = false
  }
}

resource "aws_autoscaling_group_tag" "cluster_autoscaler_enabled" {

  autoscaling_group_name = aws_eks_node_group.node_group.resources[0].autoscaling_groups[0].name

  tag {
    key                 = "k8s.io/cluster-autoscaler/enabled"
    value               = "true"
    propagate_at_launch = false
  }
}

############################
# EC2 IAM ACCESS
############################

resource "aws_iam_role" "ec2_admin_role" {

  name = "eks-ec2-admin-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    Name = "eks-ec2-admin-role"
  }
}

resource "aws_iam_role_policy_attachment" "ec2_admin_access" {

  role       = aws_iam_role.ec2_admin_role.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_instance_profile" "ec2_admin_profile" {

  name = "eks-ec2-admin-profile"
  role = aws_iam_role.ec2_admin_role.name

  tags = {
    Name = "eks-ec2-admin-profile"
  }
}

resource "aws_eks_access_entry" "ec2_admin_role" {
  cluster_name  = aws_eks_cluster.eks.name
  principal_arn = aws_iam_role.ec2_admin_role.arn
  type          = "STANDARD"

  tags = {
    Name = "eks-ec2-admin-access-entry"
  }
}

resource "aws_eks_access_policy_association" "ec2_admin_role" {
  cluster_name  = aws_eks_cluster.eks.name
  principal_arn = aws_iam_role.ec2_admin_role.arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [
    aws_eks_access_entry.ec2_admin_role
  ]
}


resource "aws_instance" "eks" {
  ami                    = "ami-02dfbd4ff395f2a1b"
  instance_type          = "t2.medium"
  subnet_id              = aws_subnet.public1.id
  iam_instance_profile   = aws_iam_instance_profile.ec2_admin_profile.name
  vpc_security_group_ids = [aws_security_group.allow_all.id]
  root_block_device {
    volume_size = "30"
  }


  tags = {
    Name = "eks"
  }

  user_data = file("${path.module}/tool.sh")

}
############################
# EKS ADDONS
############################

resource "aws_eks_addon" "vpc_cni" {

  cluster_name = aws_eks_cluster.eks.name
  addon_name   = "vpc-cni"

  resolve_conflicts_on_update = "OVERWRITE"

  depends_on = [aws_eks_node_group.node_group]
}

resource "aws_eks_addon" "coredns" {

  cluster_name = aws_eks_cluster.eks.name
  addon_name   = "coredns"

  resolve_conflicts_on_update = "OVERWRITE"

  depends_on = [aws_eks_node_group.node_group]
}

resource "aws_eks_addon" "kube_proxy" {

  cluster_name = aws_eks_cluster.eks.name
  addon_name   = "kube-proxy"

  resolve_conflicts_on_update = "OVERWRITE"

  depends_on = [aws_eks_node_group.node_group]
}

resource "aws_eks_addon" "pod_identity" {

  cluster_name = aws_eks_cluster.eks.name
  addon_name   = "eks-pod-identity-agent"

  resolve_conflicts_on_update = "OVERWRITE"

  depends_on = [aws_eks_node_group.node_group]
}


resource "aws_iam_role" "ebs_csi_role" {

  name = "AmazonEKS_EBS_CSI_DriverRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "pods.eks.amazonaws.com"
      }
      Action = [
        "sts:AssumeRole",
        "sts:TagSession"
      ]
    }]
  })

  tags = {
    Name = "eks-ebs-csi-role"
  }
}

resource "aws_iam_role_policy_attachment" "ebs_csi_policy" {

  role       = aws_iam_role.ebs_csi_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

resource "aws_eks_pod_identity_association" "ebs_csi" {
  cluster_name    = aws_eks_cluster.eks.name
  namespace       = "kube-system"
  service_account = "ebs-csi-controller-sa"

  role_arn = aws_iam_role.ebs_csi_role.arn

  depends_on = [
    aws_iam_role_policy_attachment.ebs_csi_policy
  ]
}

resource "aws_eks_addon" "ebs_csi" {

  cluster_name                = aws_eks_cluster.eks.name
  addon_name                  = "aws-ebs-csi-driver"
  resolve_conflicts_on_update = "OVERWRITE"

  depends_on = [
    aws_eks_node_group.node_group,
    aws_eks_pod_identity_association.ebs_csi
  ]
}

############################
# CLUSTER AUTOSCALER
############################

resource "aws_iam_policy" "cluster_autoscaler" {

  name        = "AmazonEKSClusterAutoscalerPolicy"
  description = "Allows Cluster Autoscaler to manage Auto Scaling Groups"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "autoscaling:DescribeAutoScalingGroups",
          "autoscaling:DescribeAutoScalingInstances",
          "autoscaling:DescribeLaunchConfigurations",
          "autoscaling:DescribeScalingActivities",
          "autoscaling:DescribeTags",
          "ec2:DescribeImages",
          "ec2:DescribeInstanceTypes",
          "ec2:DescribeLaunchTemplateVersions",
          "ec2:GetInstanceTypesFromInstanceRequirements",
          "eks:DescribeNodegroup"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "autoscaling:SetDesiredCapacity",
          "autoscaling:TerminateInstanceInAutoScalingGroup"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name = "eks-cluster-autoscaler-policy"
  }
}

resource "aws_iam_role" "cluster_autoscaler_role" {

  name = "AmazonEKSClusterAutoscalerRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "pods.eks.amazonaws.com"
      }
      Action = [
        "sts:AssumeRole",
        "sts:TagSession"
      ]
    }]
  })

  tags = {
    Name = "eks-cluster-autoscaler-role"
  }
}

resource "aws_iam_role_policy_attachment" "cluster_autoscaler" {

  role       = aws_iam_role.cluster_autoscaler_role.name
  policy_arn = aws_iam_policy.cluster_autoscaler.arn
}

resource "aws_eks_pod_identity_association" "cluster_autoscaler" {

  cluster_name    = aws_eks_cluster.eks.name
  namespace       = "kube-system"
  service_account = "cluster-autoscaler"

  role_arn = aws_iam_role.cluster_autoscaler_role.arn

  depends_on = [
    aws_iam_role_policy_attachment.cluster_autoscaler,
    aws_eks_addon.pod_identity
  ]
}
