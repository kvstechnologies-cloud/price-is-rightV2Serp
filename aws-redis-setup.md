# AWS Redis Setup for Price-is-Right Application

## 🚀 Option 1: AWS ElastiCache Redis (Recommended for Production)

### Prerequisites
- AWS CLI installed and configured
- Proper IAM permissions for ElastiCache
- VPC and security groups configured

### Step 1: Create ElastiCache Subnet Group
```bash
aws elasticache create-cache-subnet-group \
    --cache-subnet-group-name price-is-right-subnet-group \
    --cache-subnet-group-description "Subnet group for Price-is-Right Redis" \
    --subnet-ids subnet-12345678 subnet-87654321
```

### Step 2: Create Security Group for Redis
```bash
aws ec2 create-security-group \
    --group-name price-is-right-redis-sg \
    --description "Security group for Price-is-Right Redis cluster" \
    --vpc-id vpc-12345678

# Get the security group ID from the output, then add inbound rule
aws ec2 authorize-security-group-ingress \
    --group-id sg-your-redis-sg-id \
    --protocol tcp \
    --port 6379 \
    --source-group sg-your-app-runner-sg-id
```

### Step 3: Create ElastiCache Redis Cluster
```bash
aws elasticache create-cache-cluster \
    --cache-cluster-id price-is-right-redis \
    --cache-node-type cache.t3.micro \
    --engine redis \
    --engine-version 7.0 \
    --num-cache-nodes 1 \
    --port 6379 \
    --cache-subnet-group-name price-is-right-subnet-group \
    --security-group-ids sg-your-redis-sg-id \
    --preferred-availability-zone us-east-1a
```

### Step 4: Get Redis Endpoint
```bash
aws elasticache describe-cache-clusters \
    --cache-cluster-id price-is-right-redis \
    --show-cache-node-info
```

### Step 5: Update App Runner Configuration
Update your `apprunner.yaml` with the actual Redis endpoint:
```yaml
- name: REDIS_URL
  value: "redis://price-is-right-redis.xxxxxx.cache.amazonaws.com:6379"
```

## 🔄 Option 2: Redis Cloud (Managed Service)

### Step 1: Sign up for Redis Cloud
1. Go to https://redis.com/redis-enterprise-cloud/
2. Create a free account
3. Create a new database

### Step 2: Get Connection Details
- Copy the Redis endpoint and password
- Update your environment variables

### Step 3: Update App Runner Configuration
```yaml
- name: REDIS_URL
  value: "redis://:password@redis-endpoint:port"
```

## 🐳 Option 3: Redis on EC2 (Self-Managed)

### Step 1: Launch EC2 Instance
```bash
aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1d0 \
    --count 1 \
    --instance-type t3.micro \
    --key-name your-key-pair \
    --security-group-ids sg-your-redis-sg-id \
    --subnet-id subnet-12345678
```

### Step 2: Install Redis on EC2
```bash
# SSH into the instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Redis
sudo yum update -y
sudo yum install -y redis
sudo systemctl start redis
sudo systemctl enable redis

# Configure Redis for remote access
sudo sed -i 's/bind 127.0.0.1/bind 0.0.0.0/' /etc/redis.conf
sudo systemctl restart redis
```

## 📊 Cost Comparison

| Option | Monthly Cost (approx.) | Pros | Cons |
|--------|----------------------|------|------|
| ElastiCache t3.micro | $15-20 | Managed, scalable, backups | More expensive |
| Redis Cloud (free tier) | $0-5 | Easy setup, managed | Limited free tier |
| EC2 t3.micro | $8-12 | Full control, cheaper | Self-managed, no backups |

## 🔧 Testing Your Redis Connection

After setup, test your Redis connection:

```bash
# Test from your local machine (if security groups allow)
redis-cli -h your-redis-endpoint -p 6379 ping

# Test from your application
curl -X POST http://localhost:5000/api/redis/restart
curl http://localhost:5000/health/redis
```

## 🚨 Security Considerations

1. **Never expose Redis to the public internet**
2. **Use security groups to restrict access**
3. **Consider enabling Redis AUTH for additional security**
4. **Use VPC endpoints for better security**

## 📝 Environment Variables Summary

Add these to your `apprunner.yaml`:
```yaml
- name: REDIS_URL
  value: "redis://your-actual-endpoint:6379"
- name: REDIS_ENABLED
  value: "true"
- name: REDIS_HOST
  value: "your-actual-endpoint"
- name: REDIS_PORT
  value: "6379"
```

## 🔍 Troubleshooting

### Common Issues:
1. **Connection timeout**: Check security groups and VPC configuration
2. **Permission denied**: Verify IAM permissions for ElastiCache
3. **DNS resolution**: Ensure your App Runner can resolve the Redis endpoint

### Debug Commands:
```bash
# Check cluster status
aws elasticache describe-cache-clusters --cache-cluster-id price-is-right-redis

# Check security groups
aws ec2 describe-security-groups --group-ids sg-your-redis-sg-id

# Test network connectivity (from EC2 in same VPC)
telnet your-redis-endpoint 6379
```
