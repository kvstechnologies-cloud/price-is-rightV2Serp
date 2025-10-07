# 🔧 Environment Setup Guide

## 🚨 **Current Issue**
Your `.env` file is missing the required API keys, which is causing the pricing functionality to fail.

## 📋 **Required Environment Variables**

Create or update your `.env` file in the root directory with these variables:

```bash
# ========================================
# V2 Insurance Pricing System - Environment Variables
# ========================================

# Server Configuration
PORT=5000
NODE_ENV=development

# API Keys (Required for full functionality)
SERPAPI_KEY=your_serpapi_key_here
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_google_cse_id_here

# Optional API Keys
SCRAPERAPI_KEY=your_scraperapi_key_here

# Database Configuration (Optional - for Lambda functions)
TRANSACTIONS_TABLE=pricing-transactions
LOGS_TABLE=pricing-logs

# AWS Configuration (for Lambda deployment)
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_DEFAULT_REGION=us-east-1

# Environment
ENVIRONMENT=dev

# Cognito Configuration (will be populated after deployment)
REACT_APP_USER_POOL_ID=
REACT_APP_USER_POOL_CLIENT_ID=
REACT_APP_IDENTITY_POOL_ID=
REACT_APP_AWS_REGION=us-east-1
```

## 🔑 **How to Get API Keys**

### **1. SERPAPI_KEY (Required for Pricing)**
- **Get from**: https://serpapi.com/
- **Purpose**: Web scraping and product search
- **Cost**: Free tier available (100 searches/month)

### **2. OPENAI_API_KEY (Required for AI Vision)**
- **Get from**: https://platform.openai.com/
- **Purpose**: AI Vision analysis and image processing
- **Cost**: Pay per use

### **3. GOOGLE_API_KEY (Optional)**
- **Get from**: https://console.cloud.google.com/
- **Purpose**: Google Custom Search Engine
- **Cost**: Free tier available

### **4. GOOGLE_SEARCH_ENGINE_ID (Optional)**
- **Get from**: https://programmablesearchengine.google.com/
- **Purpose**: Google Custom Search Engine ID
- **Cost**: Free

## 🚀 **Quick Fix for Testing**

If you want to test the application immediately, you can use these **temporary test keys**:

```bash
# Add these to your .env file for testing
SERPAPI_KEY=test_key_for_development
OPENAI_API_KEY=test_key_for_development
GOOGLE_API_KEY=test_key_for_development
GOOGLE_SEARCH_ENGINE_ID=test_id_for_development
```

**Note**: These test keys will allow the application to start, but the pricing functionality will use fallback methods.

## 🔄 **After Adding Environment Variables**

1. **Restart the server**:
   ```bash
   npm start
   ```

2. **Check the health endpoint**:
   ```bash
   curl http://localhost:5000/health
   ```

3. **Test the pricing endpoint**:
   ```bash
   curl -X POST http://localhost:5000/api/process-item \
     -H "Content-Type: application/json" \
     -d '{"description":"test item"}'
   ```

## ✅ **Expected Results**

After adding the API keys, you should see:
- ✅ **Server starts without errors**
- ✅ **Health check shows all services enabled**
- ✅ **Pricing endpoint returns actual results**
- ✅ **Frontend works without "Failed to process request" errors**

## 🎯 **Priority Order**

1. **SERPAPI_KEY** - Most important for pricing functionality
2. **OPENAI_API_KEY** - Required for AI Vision analysis
3. **GOOGLE_API_KEY** - Optional, enhances search results
4. **GOOGLE_SEARCH_ENGINE_ID** - Optional, enhances search results

## 🔒 **Security Note**

- Never commit your `.env` file to version control
- Keep your API keys secure and private
- Use environment-specific keys for development/production
