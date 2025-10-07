# AWS App Runner Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Insurance Pricing System using AWS App Runner, a fully managed service that makes it easy to deploy containerized applications.

## 🚀 Why AWS App Runner?

- **Fully Managed**: No infrastructure management required
- **Auto Scaling**: Automatically scales based on traffic
- **Cost Effective**: Pay only for what you use
- **Simple Deployment**: Deploy directly from GitHub
- **Built-in Load Balancing**: Handles traffic distribution automatically
- **HTTPS by Default**: Secure connections out of the box

## 📋 Prerequisites

### 1. AWS Account Setup
- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Access to AWS App Runner service

### 2. Required API Keys
You'll need the following API keys configured as environment variables:
- `SERPAPI_KEY` - For product search functionality
- `OPENAI_API_KEY` - For AI-powered analysis
- `GOOGLE_API_KEY` - For additional search capabilities (optional)
- `GOOGLE_SEARCH_ENGINE_ID` - For Google Custom Search (optional)
- `SCRAPER_API_KEY` - For web scraping functionality (optional)

### 3. GitHub Repository
- Code pushed to GitHub repository
- Repository accessible to AWS App Runner

## 🔧 Project Structure (Cleaned for App Runner)

```
price-is-right-V2/
├── Dockerfile                 # Container configuration
├── apprunner.yaml            # App Runner configuration
├── package.json              # Node.js dependencies
├── README.md                 # This deployment guide
├── .gitignore               # Git ignore rules
├── client/                  # Frontend application
│   ├── public/             # Static assets
│   ├── src/                # JavaScript modules
│   └── styles/             # CSS stylesheets
├── server/                 # Backend application
│   ├── index.js           # Main server file
│   ├── models/            # Data models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── utils/             # Utility functions
├── docs/                  # Documentation
└── uploads/               # File upload directory
```

## 🚀 Deployment Steps

### Step 1: Prepare Environment Variables

Create a `.env` file with your API keys (for local testing):
```bash
# Required API Keys
SERPAPI_KEY=your_serpapi_key_here
OPENAI_API_KEY=your_openai_key_here

# Optional API Keys
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
SCRAPER_API_KEY=your_scraper_api_key_here

# Server Configuration
NODE_ENV=production
PORT=5000
MAX_REQUESTS_PER_MINUTE=60
CACHE_TTL_SECONDS=3600
```

### Step 2: Test Locally with Docker

1. **Build the Docker image:**
```bash
docker build -t insurance-pricing-system .
```

2. **Run the container locally:**
```bash
docker run -p 5000:5000 --env-file .env insurance-pricing-system
```

3. **Test the application:**
- Open http://localhost:5000
- Upload a test Excel/CSV file
- Verify processing works correctly

### Step 3: Deploy to AWS App Runner

#### Detailed Console Configuration

**BEFORE YOU START**: Make sure your code is pushed to GitHub first!

1. **Source Configuration** (Already done):
   - Source type: "Source code repository" ✅
   - Repository: Your GitHub repository ✅
   - Branch: `main` ✅
   - Configuration file: `apprunner.yaml` ✅

2. **Service Configuration** (Current screen):
   
   **Service Name:**
   - Enter: `insurance-pricing-system`
   
   **Auto Scaling:**
   - Leave default settings:
     - Protocol: TCP
     - Timeout: 5 seconds
     - Interval: 10 seconds
     - Unhealthy threshold: 5 requests
     - Health threshold: 1 request

   **Security:**
   - Instance role: Leave as "Choose an instance role" (default)
   - AWS KMS key: "Use an AWS owned key" (default)
   - Web Application Firewall: Leave "Activate" unchecked (default)

   **Networking:**
   - Incoming network traffic: Select "Public endpoint" (default)
   - Outgoing network traffic: Select "Public access" (default)

   **Observability:**
   - Leave "Tracing with AWS X-Ray" unchecked (default)

   **Tags:**
   - Optional: Add tags like:
     - Key: `Environment`, Value: `Production`
     - Key: `Project`, Value: `Insurance-Pricing`

3. **Click "Next"** to proceed to Review

4. **Review and Create:**
   - Review all settings
   - **IMPORTANT**: Before clicking "Create & deploy", note that you'll need to add environment variables after creation
   - Click "Create & deploy"

5. **After Service Creation:**
   - Wait for initial deployment (5-10 minutes)
   - Go to your service in App Runner console
   - Click "Configuration" tab
   - Click "Environment variables"
   - Add these variables:
     ```
     SERPAPI_KEY = your_serpapi_key_here
     OPENAI_API_KEY = your_openai_api_key_here
     ```
   - Click "Deploy" to apply the environment variables

#### Option B: Deploy via AWS CLI

1. **Create App Runner service:**
```bash
aws apprunner create-service \
  --service-name insurance-pricing-system \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "public.ecr.aws/docker/library/node:18-alpine",
      "ImageConfiguration": {
        "Port": "5000"
      },
      "ImageRepositoryType": "ECR_PUBLIC"
    },
    "AutoDeploymentsEnabled": true
  }' \
  --instance-configuration '{
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  }'
```

2. **Configure environment variables:**
```bash
aws apprunner update-service \
  --service-arn your-service-arn \
  --source-configuration '{
    "ImageRepository": {
      "ImageConfiguration": {
        "RuntimeEnvironmentVariables": {
          "SERPAPI_KEY": "your_serpapi_key_here",
          "OPENAI_API_KEY": "your_openai_key_here"
        }
      }
    }
  }'
```

## 🔧 Configuration Details

### Dockerfile Configuration
The Dockerfile is optimized for App Runner:
- Uses Node.js 18 Alpine for smaller image size
- Installs only production dependencies
- Creates necessary directories
- Exposes port 5000
- Sets production environment

### App Runner Configuration (apprunner.yaml)
- **Runtime**: Node.js 18
- **Build**: Installs dependencies and creates upload directory
- **Port**: 5000 (configurable via environment)
- **Environment Variables**: All required API keys
- **Auto Scaling**: Handled by App Runner

## 🌐 Post-Deployment Configuration

### 1. Update Frontend API URL
After deployment, update the frontend to use the App Runner URL:

In `client/public/index.html`, update the API_BASE_URL:
```javascript
window.CONFIG = {
    API_BASE_URL: 'https://your-app-runner-url.us-east-1.awsapprunner.com/api',
    // ... other config
};
```

### 2. Configure CORS (if needed)
The server is already configured for CORS, but you may need to update allowed origins in `server/index.js`:
```javascript
app.use(cors({
  origin: ['https://your-app-runner-url.us-east-1.awsapprunner.com'],
  credentials: true
}));
```

## 📊 Monitoring and Scaling

### App Runner Metrics
Monitor your application through:
- **AWS CloudWatch**: Automatic metrics collection
- **App Runner Console**: Service health and performance
- **Application Logs**: Real-time log streaming

### Auto Scaling Configuration
App Runner automatically scales based on:
- **CPU utilization**
- **Memory usage**
- **Request volume**
- **Response time**

Default scaling:
- **Min instances**: 1
- **Max instances**: 25
- **Scale up**: When CPU > 70% for 2 minutes
- **Scale down**: When CPU < 50% for 15 minutes

## 🔍 Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Verify all required API keys are configured
   - Check App Runner environment variable settings
   - Ensure no typos in variable names

2. **Port Configuration Issues**
   - App Runner expects port 5000 (configured in apprunner.yaml)
   - Verify PORT environment variable is set correctly

3. **Build Failures**
   - Check build logs in App Runner console
   - Verify package.json dependencies are correct
   - Ensure Node.js version compatibility

4. **Application Crashes**
   - Check application logs in CloudWatch
   - Verify all required files are included in deployment
   - Check for missing environment variables

### Debugging Commands

1. **Check service status:**
```bash
aws apprunner describe-service --service-arn your-service-arn
```

2. **View logs:**
```bash
aws logs describe-log-groups --log-group-name-prefix "/aws/apprunner/insurance-pricing-system"
```

3. **Update service:**
```bash
aws apprunner start-deployment --service-arn your-service-arn
```

## 💰 Cost Optimization

### App Runner Pricing
- **vCPU**: $0.064 per vCPU per hour
- **Memory**: $0.007 per GB per hour
- **Requests**: $0.40 per million requests

### Estimated Monthly Costs
For typical usage (1 vCPU, 2 GB RAM):
- **Base cost**: ~$51/month (always running)
- **Request cost**: ~$0.40 per million requests
- **Total**: ~$51-60/month for moderate usage

### Cost Optimization Tips
1. **Right-size resources**: Start with 1 vCPU, 2 GB RAM
2. **Monitor usage**: Use CloudWatch to track actual resource usage
3. **Optimize code**: Efficient code reduces CPU/memory usage
4. **Cache responses**: Reduce API calls and processing time

## 🔐 Security Best Practices

### Environment Variables
- Store sensitive API keys in App Runner environment variables
- Never commit API keys to version control
- Use AWS Secrets Manager for additional security

### Network Security
- App Runner provides HTTPS by default
- Configure custom domain with SSL certificate
- Use AWS WAF for additional protection if needed

### Application Security
- Keep dependencies updated
- Monitor for security vulnerabilities
- Implement rate limiting (already configured)

## 📈 Performance Optimization

### Application Performance
- **Batch Processing**: Processes 25 items simultaneously
- **Optimized Timeouts**: 3-8 second API timeouts
- **Smart Caching**: Reduces redundant API calls
- **Error Handling**: Graceful fallbacks for failed requests

### Expected Performance
- **143 records**: Under 2 minutes
- **500 records**: Under 5 minutes
- **1000 records**: Under 10 minutes

## 🔄 Continuous Deployment

### Automatic Deployments
App Runner can automatically deploy when you push to GitHub:
1. Enable auto-deployment in App Runner console
2. Push changes to your main branch
3. App Runner automatically builds and deploys

### Manual Deployments
Force a new deployment:
```bash
aws apprunner start-deployment --service-arn your-service-arn
```

## 📞 Support and Maintenance

### Health Checks
- **Health endpoint**: `https://your-app-url/health`
- **API test**: `https://your-app-url/api/test`
- **AI Vision status**: `https://your-app-url/api/ai-vision-status`

### Log Monitoring
- **CloudWatch Logs**: Automatic log collection
- **Error tracking**: Monitor error rates and patterns
- **Performance metrics**: Track response times and throughput

### Updates and Maintenance
1. **Regular updates**: Keep dependencies updated
2. **Security patches**: Monitor for security updates
3. **Performance monitoring**: Track metrics and optimize as needed
4. **Backup strategy**: Ensure data persistence if needed

## 🎯 Next Steps After Deployment

1. **Test thoroughly**: Upload various file types and sizes
2. **Monitor performance**: Check CloudWatch metrics
3. **Configure custom domain**: Set up your own domain name
4. **Set up monitoring alerts**: Get notified of issues
5. **Document API endpoints**: Create API documentation for users

## 📚 Additional Resources

- [AWS App Runner Documentation](https://docs.aws.amazon.com/apprunner/)
- [App Runner Pricing](https://aws.amazon.com/apprunner/pricing/)
- [CloudWatch Monitoring](https://docs.aws.amazon.com/apprunner/latest/dg/monitor-cwlogs.html)
- [Custom Domains](https://docs.aws.amazon.com/apprunner/latest/dg/manage-custom-domains.html)

---

**Deployment Version**: V2-ENHANCED-APP-RUNNER  
**Last Updated**: August 2025  
**Maintained by**: KVS Technologies
