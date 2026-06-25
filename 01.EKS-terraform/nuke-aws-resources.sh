#!/bin/bash
set -euo pipefail

# ===========================================================================
# 🔥 AWS FULL NUKE SCRIPT — Run AFTER terraform destroy
# ===========================================================================
#
# WHY THIS EXISTS:
# terraform destroy only deletes resources Terraform created.
# But Kubernetes creates EBS volumes (via PVCs), Load Balancers (via Services),
# and Security Groups (via ALB Controller) OUTSIDE of Terraform's knowledge.
# These orphaned resources keep billing you $3-4/day even after destroy.
#
# WHEN TO RUN: Every time after "terraform destroy" completes
#
# USAGE:
#   chmod +x nuke-aws-resources.sh
#   ./nuke-aws-resources.sh
#
# ===========================================================================

REGION="us-east-1"
echo "=============================================="
echo "🔥 AWS FULL NUKE — Region: ${REGION}"
echo "=============================================="
echo ""

# -----------------------------------------------
# STEP 1: Delete Load Balancers (created by K8s)
# -----------------------------------------------
echo "=== Step 1: Deleting Load Balancers ==="
LBS=$(aws elbv2 describe-load-balancers --region $REGION --query 'LoadBalancers[].LoadBalancerArn' --output text 2>/dev/null || echo "")
if [ -n "$LBS" ] && [ "$LBS" != "None" ]; then
  for lb in $LBS; do
    echo "  Deleting LB: $lb"
    # Delete listeners first
    LISTENERS=$(aws elbv2 describe-listeners --region $REGION --load-balancer-arn "$lb" --query 'Listeners[].ListenerArn' --output text 2>/dev/null || echo "")
    for lis in $LISTENERS; do
      aws elbv2 delete-listener --region $REGION --listener-arn "$lis" 2>/dev/null || true
    done
    aws elbv2 delete-load-balancer --region $REGION --load-balancer-arn "$lb" 2>/dev/null || true
  done
  echo "  Waiting 30s for LBs to drain..."
  sleep 30
else
  echo "  None found."
fi

# Delete Target Groups
echo "  Deleting Target Groups..."
TGS=$(aws elbv2 describe-target-groups --region $REGION --query 'TargetGroups[].TargetGroupArn' --output text 2>/dev/null || echo "")
if [ -n "$TGS" ] && [ "$TGS" != "None" ]; then
  for tg in $TGS; do
    aws elbv2 delete-target-group --region $REGION --target-group-arn "$tg" 2>/dev/null || true
  done
fi
echo ""

# -----------------------------------------------
# STEP 2: Terminate EC2 Instances
# -----------------------------------------------
echo "=== Step 2: Terminating EC2 Instances ==="
INSTANCES=$(aws ec2 describe-instances --region $REGION \
  --filters "Name=instance-state-name,Values=running,stopped,stopping" \
  --query 'Reservations[].Instances[].InstanceId' --output text 2>/dev/null || echo "")
if [ -n "$INSTANCES" ] && [ "$INSTANCES" != "None" ]; then
  for inst in $INSTANCES; do
    echo "  Terminating: $inst"
    aws ec2 terminate-instances --region $REGION --instance-ids "$inst" 2>/dev/null || true
  done
  echo "  Waiting 60s for instances to terminate..."
  sleep 60
else
  echo "  None found."
fi
echo ""

# -----------------------------------------------
# STEP 3: Delete NAT Gateways
# -----------------------------------------------
echo "=== Step 3: Deleting NAT Gateways ==="
NATS=$(aws ec2 describe-nat-gateways --region $REGION \
  --filter "Name=state,Values=available,pending" \
  --query 'NatGateways[].NatGatewayId' --output text 2>/dev/null || echo "")
if [ -n "$NATS" ] && [ "$NATS" != "None" ]; then
  for nat in $NATS; do
    echo "  Deleting NAT: $nat"
    aws ec2 delete-nat-gateway --region $REGION --nat-gateway-id "$nat" 2>/dev/null || true
  done
  echo "  Waiting 60s for NAT Gateways to delete..."
  sleep 60
else
  echo "  None found."
fi
echo ""

# -----------------------------------------------
# STEP 4: Release Elastic IPs
# -----------------------------------------------
echo "=== Step 4: Releasing Elastic IPs ==="
EIPS=$(aws ec2 describe-addresses --region $REGION \
  --query 'Addresses[].AllocationId' --output text 2>/dev/null || echo "")
if [ -n "$EIPS" ] && [ "$EIPS" != "None" ]; then
  for eip in $EIPS; do
    echo "  Releasing EIP: $eip"
    aws ec2 release-address --region $REGION --allocation-id "$eip" 2>/dev/null || true
  done
else
  echo "  None found."
fi
echo ""

# -----------------------------------------------
# STEP 5: Delete ALL EBS Volumes (unattached)
# -----------------------------------------------
echo "=== Step 5: Deleting Unattached EBS Volumes ==="
VOLUMES=$(aws ec2 describe-volumes --region $REGION \
  --filters "Name=status,Values=available" \
  --query 'Volumes[].VolumeId' --output text 2>/dev/null || echo "")
if [ -n "$VOLUMES" ] && [ "$VOLUMES" != "None" ]; then
  for vol in $VOLUMES; do
    echo "  Deleting volume: $vol"
    aws ec2 delete-volume --region $REGION --volume-id "$vol" 2>/dev/null || true
  done
else
  echo "  None found."
fi
echo ""

# -----------------------------------------------
# STEP 6: Delete EKS Cluster (if still exists)
# -----------------------------------------------
echo "=== Step 6: Checking for EKS Clusters ==="
CLUSTERS=$(aws eks list-clusters --region $REGION --query 'clusters[]' --output text 2>/dev/null || echo "")
if [ -n "$CLUSTERS" ] && [ "$CLUSTERS" != "None" ]; then
  for cluster in $CLUSTERS; do
    echo "  Found cluster: $cluster"
    # Delete node groups first
    NGS=$(aws eks list-nodegroups --region $REGION --cluster-name "$cluster" --query 'nodegroups[]' --output text 2>/dev/null || echo "")
    if [ -n "$NGS" ] && [ "$NGS" != "None" ]; then
      for ng in $NGS; do
        echo "    Deleting node group: $ng"
        aws eks delete-nodegroup --region $REGION --cluster-name "$cluster" --nodegroup-name "$ng" 2>/dev/null || true
      done
      echo "    Waiting 5 min for node groups to delete..."
      sleep 300
    fi
    echo "  Deleting cluster: $cluster"
    aws eks delete-cluster --region $REGION --name "$cluster" 2>/dev/null || true
  done
else
  echo "  None found."
fi
echo ""

# -----------------------------------------------
# STEP 7: Delete VPC Endpoints
# -----------------------------------------------
echo "=== Step 7: Deleting VPC Endpoints ==="
ENDPOINTS=$(aws ec2 describe-vpc-endpoints --region $REGION \
  --query 'VpcEndpoints[?VpcEndpointType!=`Gateway`].VpcEndpointId' --output text 2>/dev/null || echo "")
if [ -n "$ENDPOINTS" ] && [ "$ENDPOINTS" != "None" ]; then
  for ep in $ENDPOINTS; do
    echo "  Deleting endpoint: $ep"
    aws ec2 delete-vpc-endpoints --region $REGION --vpc-endpoint-ids "$ep" 2>/dev/null || true
  done
else
  echo "  None found."
fi
echo ""

# -----------------------------------------------
# STEP 8: Delete Non-Default Security Groups
# -----------------------------------------------
echo "=== Step 8: Deleting Non-Default Security Groups ==="
SGS=$(aws ec2 describe-security-groups --region $REGION \
  --query 'SecurityGroups[?GroupName!=`default`].GroupId' --output text 2>/dev/null || echo "")
if [ -n "$SGS" ] && [ "$SGS" != "None" ]; then
  for sg in $SGS; do
    echo "  Deleting SG: $sg"
    aws ec2 delete-security-group --region $REGION --group-id "$sg" 2>/dev/null || true
  done
else
  echo "  None found."
fi
echo ""

# -----------------------------------------------
# STEP 9: Delete VPCs (non-default)
# -----------------------------------------------
echo "=== Step 9: Deleting Non-Default VPCs ==="
VPCS=$(aws ec2 describe-vpcs --region $REGION \
  --query 'Vpcs[?IsDefault==`false`].VpcId' --output text 2>/dev/null || echo "")
if [ -n "$VPCS" ] && [ "$VPCS" != "None" ]; then
  for vpc in $VPCS; do
    echo "  Processing VPC: $vpc"
    # Delete subnets
    SUBNETS=$(aws ec2 describe-subnets --region $REGION --filters "Name=vpc-id,Values=$vpc" --query 'Subnets[].SubnetId' --output text 2>/dev/null || echo "")
    for sub in $SUBNETS; do
      aws ec2 delete-subnet --region $REGION --subnet-id "$sub" 2>/dev/null || true
    done
    # Delete internet gateways
    IGWS=$(aws ec2 describe-internet-gateways --region $REGION --filters "Name=attachment.vpc-id,Values=$vpc" --query 'InternetGateways[].InternetGatewayId' --output text 2>/dev/null || echo "")
    for igw in $IGWS; do
      aws ec2 detach-internet-gateway --region $REGION --internet-gateway-id "$igw" --vpc-id "$vpc" 2>/dev/null || true
      aws ec2 delete-internet-gateway --region $REGION --internet-gateway-id "$igw" 2>/dev/null || true
    done
    # Delete route tables (non-main)
    RTS=$(aws ec2 describe-route-tables --region $REGION --filters "Name=vpc-id,Values=$vpc" --query 'RouteTables[?Associations[0].Main!=`true`].RouteTableId' --output text 2>/dev/null || echo "")
    for rt in $RTS; do
      # Disassociate first
      ASSOCS=$(aws ec2 describe-route-tables --region $REGION --route-table-ids "$rt" --query 'RouteTables[].Associations[?!Main].RouteTableAssociationId' --output text 2>/dev/null || echo "")
      for assoc in $ASSOCS; do
        aws ec2 disassociate-route-table --region $REGION --association-id "$assoc" 2>/dev/null || true
      done
      aws ec2 delete-route-table --region $REGION --route-table-id "$rt" 2>/dev/null || true
    done
    # Delete the VPC
    aws ec2 delete-vpc --region $REGION --vpc-id "$vpc" 2>/dev/null || true
    echo "  Deleted VPC: $vpc"
  done
else
  echo "  None found."
fi
echo ""

# -----------------------------------------------
# STEP 10: Delete EBS Snapshots
# -----------------------------------------------
echo "=== Step 10: Deleting EBS Snapshots ==="
SNAPS=$(aws ec2 describe-snapshots --region $REGION --owner-ids self \
  --query 'Snapshots[].SnapshotId' --output text 2>/dev/null || echo "")
if [ -n "$SNAPS" ] && [ "$SNAPS" != "None" ]; then
  for snap in $SNAPS; do
    echo "  Deleting snapshot: $snap"
    aws ec2 delete-snapshot --region $REGION --snapshot-id "$snap" 2>/dev/null || true
  done
else
  echo "  None found."
fi
echo ""

# -----------------------------------------------
# FINAL: Verify
# -----------------------------------------------
echo "=============================================="
echo "✅ VERIFICATION — These should all be empty:"
echo "=============================================="
echo ""
echo "EC2 Instances:"
aws ec2 describe-instances --region $REGION \
  --filters "Name=instance-state-name,Values=running,stopped" \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name]' --output table 2>/dev/null || echo "  None"
echo ""
echo "EBS Volumes:"
aws ec2 describe-volumes --region $REGION \
  --query 'Volumes[].[VolumeId,Size,State]' --output table 2>/dev/null || echo "  None"
echo ""
echo "Elastic IPs:"
aws ec2 describe-addresses --region $REGION \
  --query 'Addresses[].[PublicIp,AllocationId]' --output table 2>/dev/null || echo "  None"
echo ""
echo "NAT Gateways:"
aws ec2 describe-nat-gateways --region $REGION \
  --filter "Name=state,Values=available,pending" \
  --query 'NatGateways[].[NatGatewayId,State]' --output table 2>/dev/null || echo "  None"
echo ""
echo "Load Balancers:"
aws elbv2 describe-load-balancers --region $REGION \
  --query 'LoadBalancers[].[DNSName,State.Code]' --output table 2>/dev/null || echo "  None"
echo ""
echo "EKS Clusters:"
aws eks list-clusters --region $REGION --output text 2>/dev/null || echo "  None"
echo ""
echo "=============================================="
echo "🎉 DONE! Your daily bill should be $0 now."
echo "=============================================="
