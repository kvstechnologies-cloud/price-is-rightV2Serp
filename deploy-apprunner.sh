#!/bin/bash

# AWS App Runner Deployment Script
# This script helps deploy the Insurance Pricing System to AWS App Runner

set -e

echo "🚀 AWS App Runner Deployment Script"
echo "=================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    echo "   Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI is installed and configured"

# Get user input
read -p "Enter your service name (default: insurance-pricing-system): " SERVICE_NAME
SERVICE_NAME=${SERVICE_NAME:-insurance-pricing-system}

read -p "Enter your GitHub repository URL: " REPO_URL
if [ -z "$REPO_URL" ]; then
    echo "❌ GitHub repository URL is required"
    exit 1
fi

read -p "Enter your GitHub branch (default: main): " BRANCH
BRANCH=${BRANCH:-main}

echo ""
echo "📋 Deployment Configuration:"
echo "   Service Name: $SERVICE_NAME"
echo "   Repository: $REPO_URL"
echo "   Branch: $BRANCH"
echo ""

read -p "Do you want to proceed with deployment? (y/N): " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo "🚀 Creating App Runner service..."

# Create service configuration file
cat > apprunner-service-config.json << EOF
{
  "ServiceName": "$SERVICE_NAME",
  "SourceConfiguration": {
    "CodeRepository": {
      "RepositoryUrl": "$REPO_URL",
      "SourceCodeVersion": {
        "Type": "BRANCH",
        "Value": "$BRANCH"
      },
      "CodeConfiguration": {
        "ConfigurationSource": "CONFIGURATION_FILE",
        "CodeConfigurationValues": {
          "Runtime": "NODEJS_18",
          "BuildCommand": "npm install --production",
          "StartCommand": "node server/index.js",
          "RuntimeEnvironmentVariables": {
            "NODE_ENV": "production",
            "PORT": "5000"
          }
        }
      }
    },
    "AutoDeploymentsEnabled": true
  },
  "InstanceConfiguration": {
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  }
}
EOF

# Create the service
echo "📦 Creating App Runner service..."
SERVICE_ARN=$(aws apprunner create-service --cli-input-json file://apprunner-service-config.json --query 'Service.ServiceArn' --output text)

if [ $? -eq 0 ]; then
    echo "✅ App Runner service created successfully!"
    echo "📋 Service ARN: $SERVICE_ARN"
    echo ""
    echo "⚠️  IMPORTANT: You still need to configure environment variables:"
    echo "   1. Go to AWS App Runner console"
    echo "   2. Select your service: $SERVICE_NAME"
    echo "   3. Go to Configuration > Environment variables"
    echo "   4. Add the following variables:"
    echo "      - SERPAPI_KEY=your_serpapi_key_here"
    echo "      - OPENAI_API_KEY=your_openai_key_here"
    echo "   5. Deploy the service"
    echo ""
    echo "🌐 Your service will be available at:"
    echo "   https://$SERVICE_NAME.region.awsapprunner.com"
    echo ""
    echo "📊 Monitor deployment progress:"
    echo "   aws apprunner describe-service --service-arn $SERVICE_ARN"
else
    echo "❌ Failed to create App Runner service"
    exit 1
fi

# Clean up temporary file
rm -f apprunner-service-config.json

echo "🎉 Deployment script completed!"
echo "📖 For detailed instructions, see: AWS_APP_RUNNER_DEPLOYMENT.md"
