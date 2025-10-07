#!/bin/bash

# AWS Redis Setup Script for Price-is-Right Application
# This script sets up ElastiCache Redis for the application

set -e  # Exit on any error

echo "🚀 Setting up AWS ElastiCache Redis for Price-is-Right Application"

# Configuration variables
CLUSTER_ID="price-is-right-redis"
SUBNET_GROUP_NAME="price-is-right-subnet-group"
SECURITY_GROUP_NAME="price-is-right-redis-sg"
NODE_TYPE="cache.t3.micro"
ENGINE_VERSION="7.0"
REGION="us-east-1"
AZ="us-east-1a"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI is configured"

# Get default VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text --region $REGION)
if [ "$VPC_ID" = "None" ]; then
    echo "❌ No default VPC found. Please create a VPC first."
    exit 1
fi
echo "✅ Using VPC: $VPC_ID"

# Get subnet IDs from the default VPC
SUBNET_IDS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query "Subnets[].SubnetId" \
    --output text --region $REGION)

if [ -z "$SUBNET_IDS" ]; then
    echo "❌ No subnets found in VPC $VPC_ID"
    exit 1
fi

# Convert to array
SUBNET_ARRAY=($SUBNET_IDS)
echo "✅ Found subnets: ${SUBNET_ARRAY[@]}"

# Step 1: Create cache subnet group
echo "📡 Creating cache subnet group..."
if aws elasticache describe-cache-subnet-groups --cache-subnet-group-name $SUBNET_GROUP_NAME --region $REGION &> /dev/null; then
    echo "⚠️ Subnet group $SUBNET_GROUP_NAME already exists"
else
    aws elasticache create-cache-subnet-group \
        --cache-subnet-group-name $SUBNET_GROUP_NAME \
        --cache-subnet-group-description "Subnet group for Price-is-Right Redis" \
        --subnet-ids ${SUBNET_ARRAY[@]} \
        --region $REGION
    echo "✅ Cache subnet group created: $SUBNET_GROUP_NAME"
fi

# Step 2: Create security group for Redis
echo "🔒 Creating security group for Redis..."
SECURITY_GROUP_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" "Name=vpc-id,Values=$VPC_ID" \
    --query "SecurityGroups[0].GroupId" \
    --output text --region $REGION 2>/dev/null)

if [ "$SECURITY_GROUP_ID" != "None" ] && [ -n "$SECURITY_GROUP_ID" ]; then
    echo "⚠️ Security group $SECURITY_GROUP_NAME already exists: $SECURITY_GROUP_ID"
else
    SECURITY_GROUP_ID=$(aws ec2 create-security-group \
        --group-name $SECURITY_GROUP_NAME \
        --description "Security group for Price-is-Right Redis cluster" \
        --vpc-id $VPC_ID \
        --query "GroupId" \
        --output text --region $REGION)
    echo "✅ Security group created: $SECURITY_GROUP_ID"
    
    # Add inbound rule for Redis port (6379) from anywhere in VPC
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP_ID \
        --protocol tcp \
        --port 6379 \
        --cidr 10.0.0.0/8 \
        --region $REGION
    echo "✅ Added inbound rule for Redis port 6379"
fi

# Step 3: Create ElastiCache Redis cluster
echo "🗄️ Creating ElastiCache Redis cluster..."
if aws elasticache describe-cache-clusters --cache-cluster-id $CLUSTER_ID --region $REGION &> /dev/null; then
    echo "⚠️ Redis cluster $CLUSTER_ID already exists"
else
    aws elasticache create-cache-cluster \
        --cache-cluster-id $CLUSTER_ID \
        --cache-node-type $NODE_TYPE \
        --engine redis \
        --engine-version $ENGINE_VERSION \
        --num-cache-nodes 1 \
        --port 6379 \
        --cache-subnet-group-name $SUBNET_GROUP_NAME \
        --security-group-ids $SECURITY_GROUP_ID \
        --preferred-availability-zone $AZ \
        --region $REGION
    echo "✅ Redis cluster creation initiated: $CLUSTER_ID"
fi

# Step 4: Wait for cluster to be available and get endpoint
echo "⏳ Waiting for Redis cluster to be available..."
aws elasticache wait cache-cluster-available --cache-cluster-ids $CLUSTER_ID --region $REGION

# Get the Redis endpoint
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
    --cache-cluster-id $CLUSTER_ID \
    --show-cache-node-info \
    --query "CacheClusters[0].CacheNodes[0].Endpoint.Address" \
    --output text --region $REGION)

echo ""
echo "🎉 Redis setup completed successfully!"
echo ""
echo "📋 Configuration Details:"
echo "  Cluster ID: $CLUSTER_ID"
echo "  Endpoint: $REDIS_ENDPOINT"
echo "  Port: 6379"
echo "  Security Group: $SECURITY_GROUP_ID"
echo "  Subnet Group: $SUBNET_GROUP_NAME"
echo ""
echo "🔧 Update your apprunner.yaml with:"
echo "  REDIS_URL: redis://$REDIS_ENDPOINT:6379"
echo "  REDIS_HOST: $REDIS_ENDPOINT"
echo ""
echo "🚀 Next steps:"
echo "  1. Update apprunner.yaml with the Redis endpoint"
echo "  2. Deploy your application"
echo "  3. Test Redis connection: curl http://localhost:5000/health/redis"
echo ""
