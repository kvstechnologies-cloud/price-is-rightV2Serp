# AWS Redis Setup Script for Price-is-Right Application (PowerShell)
# This script sets up ElastiCache Redis for the application

param(
    [string]$Region = "us-east-1",
    [string]$ClusterId = "price-is-right-redis",
    [string]$NodeType = "cache.t3.micro"
)

Write-Host "🚀 Setting up AWS ElastiCache Redis for Price-is-Right Application" -ForegroundColor Green

# Configuration variables
$SubnetGroupName = "price-is-right-subnet-group"
$SecurityGroupName = "price-is-right-redis-sg"
$EngineVersion = "7.0"
$AZ = "$Region" + "a"

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
    Write-Host "✅ AWS CLI is available" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

# Check if AWS CLI is configured
try {
    aws sts get-caller-identity | Out-Null
    Write-Host "✅ AWS CLI is configured" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not configured. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Get default VPC ID
Write-Host "🔍 Finding default VPC..." -ForegroundColor Yellow
$VpcId = aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text --region $Region

if ($VpcId -eq "None" -or [string]::IsNullOrEmpty($VpcId)) {
    Write-Host "❌ No default VPC found. Please create a VPC first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Using VPC: $VpcId" -ForegroundColor Green

# Get subnet IDs from the default VPC
Write-Host "🔍 Finding subnets..." -ForegroundColor Yellow
$SubnetIds = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VpcId" --query "Subnets[].SubnetId" --output text --region $Region

if ([string]::IsNullOrEmpty($SubnetIds)) {
    Write-Host "❌ No subnets found in VPC $VpcId" -ForegroundColor Red
    exit 1
}

$SubnetArray = $SubnetIds -split '\s+'
Write-Host "✅ Found subnets: $($SubnetArray -join ', ')" -ForegroundColor Green

# Step 1: Create cache subnet group
Write-Host "📡 Creating cache subnet group..." -ForegroundColor Yellow
try {
    aws elasticache describe-cache-subnet-groups --cache-subnet-group-name $SubnetGroupName --region $Region | Out-Null
    Write-Host "⚠️ Subnet group $SubnetGroupName already exists" -ForegroundColor Yellow
} catch {
    $SubnetIdsParam = $SubnetArray -join ' '
    aws elasticache create-cache-subnet-group --cache-subnet-group-name $SubnetGroupName --cache-subnet-group-description "Subnet group for Price-is-Right Redis" --subnet-ids $SubnetIdsParam --region $Region
    Write-Host "✅ Cache subnet group created: $SubnetGroupName" -ForegroundColor Green
}

# Step 2: Create security group for Redis
Write-Host "🔒 Creating security group for Redis..." -ForegroundColor Yellow
$SecurityGroupId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$SecurityGroupName" "Name=vpc-id,Values=$VpcId" --query "SecurityGroups[0].GroupId" --output text --region $Region 2>$null

if ($SecurityGroupId -ne "None" -and ![string]::IsNullOrEmpty($SecurityGroupId)) {
    Write-Host "⚠️ Security group $SecurityGroupName already exists: $SecurityGroupId" -ForegroundColor Yellow
} else {
    $SecurityGroupId = aws ec2 create-security-group --group-name $SecurityGroupName --description "Security group for Price-is-Right Redis cluster" --vpc-id $VpcId --query "GroupId" --output text --region $Region
    Write-Host "✅ Security group created: $SecurityGroupId" -ForegroundColor Green
    
    # Add inbound rule for Redis port (6379) from anywhere in VPC
    aws ec2 authorize-security-group-ingress --group-id $SecurityGroupId --protocol tcp --port 6379 --cidr "10.0.0.0/8" --region $Region
    Write-Host "✅ Added inbound rule for Redis port 6379" -ForegroundColor Green
}

# Step 3: Create ElastiCache Redis cluster
Write-Host "🗄️ Creating ElastiCache Redis cluster..." -ForegroundColor Yellow
try {
    aws elasticache describe-cache-clusters --cache-cluster-id $ClusterId --region $Region | Out-Null
    Write-Host "⚠️ Redis cluster $ClusterId already exists" -ForegroundColor Yellow
} catch {
    aws elasticache create-cache-cluster --cache-cluster-id $ClusterId --cache-node-type $NodeType --engine redis --engine-version $EngineVersion --num-cache-nodes 1 --port 6379 --cache-subnet-group-name $SubnetGroupName --security-group-ids $SecurityGroupId --preferred-availability-zone $AZ --region $Region
    Write-Host "✅ Redis cluster creation initiated: $ClusterId" -ForegroundColor Green
}

# Step 4: Wait for cluster to be available and get endpoint
Write-Host "⏳ Waiting for Redis cluster to be available..." -ForegroundColor Yellow
aws elasticache wait cache-cluster-available --cache-cluster-ids $ClusterId --region $Region

# Get the Redis endpoint
$RedisEndpoint = aws elasticache describe-cache-clusters --cache-cluster-id $ClusterId --show-cache-node-info --query "CacheClusters[0].CacheNodes[0].Endpoint.Address" --output text --region $Region

Write-Host ""
Write-Host "🎉 Redis setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Configuration Details:" -ForegroundColor Cyan
Write-Host "  Cluster ID: $ClusterId" -ForegroundColor White
Write-Host "  Endpoint: $RedisEndpoint" -ForegroundColor White
Write-Host "  Port: 6379" -ForegroundColor White
Write-Host "  Security Group: $SecurityGroupId" -ForegroundColor White
Write-Host "  Subnet Group: $SubnetGroupName" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Update your apprunner.yaml with:" -ForegroundColor Cyan
Write-Host "  REDIS_URL: redis://$RedisEndpoint:6379" -ForegroundColor Yellow
Write-Host "  REDIS_HOST: $RedisEndpoint" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Update apprunner.yaml with the Redis endpoint" -ForegroundColor White
Write-Host "  2. Deploy your application" -ForegroundColor White
Write-Host "  3. Test Redis connection: curl http://localhost:5000/health/redis" -ForegroundColor White
Write-Host ""

# Update the apprunner.yaml file automatically if it exists
if (Test-Path "apprunner.yaml") {
    Write-Host "🔧 Updating apprunner.yaml with Redis endpoint..." -ForegroundColor Yellow
    
    $content = Get-Content "apprunner.yaml" -Raw
    $updatedContent = $content -replace 'value: "redis://price-is-right-redis\.cache\.amazonaws\.com:6379"', "value: `"redis://$RedisEndpoint:6379`""
    $updatedContent = $updatedContent -replace 'value: "price-is-right-redis\.cache\.amazonaws\.com"', "value: `"$RedisEndpoint`""
    
    Set-Content "apprunner.yaml" $updatedContent
    Write-Host "✅ apprunner.yaml updated with Redis endpoint" -ForegroundColor Green
}
