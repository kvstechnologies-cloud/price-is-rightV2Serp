# 🏗️ V2 Microservice Architecture - Complete Guide

## 📁 **Proper Project Structure**

```
price-is-right-V2/
├── 📁 client/                           # Frontend Application (React/Vue)
│   ├── 📁 public/                       # Static assets
│   │   ├── index.html                   # Main HTML file
│   │   └── assets/                      # Images, files, etc.
│   ├── 📁 src/                          # Source code
│   │   ├── 📁 components/               # UI components
│   │   ├── 📁 services/                 # API services
│   │   └── 📁 utils/                    # Utility functions
│   └── 📁 styles/                       # CSS files
│
├── 📁 server/                           # Local Development Server
│   ├── index.js                         # Main server file (for local dev only)
│   ├── 📁 routes/                       # API routes (local dev only)
│   ├── 📁 middleware/                   # Express middleware
│   └── 📁 models/                       # Models (copied from old app for local dev)
│
├── 📁 lambda/                           # AWS Lambda Microservices
│   ├── 📁 functions/                    # Individual Lambda functions
│   │   ├── 📁 pricing-service/          # Insurance pricing calculations
│   │   │   ├── index.js                 # Lambda handler
│   │   │   ├── 📁 models/               # Pricing models
│   │   │   │   ├── InsuranceItemPricer.js
│   │   │   │   └── ProductValidator.js
│   │   │   ├── 📁 tests/                # Unit tests
│   │   │   └── package.json             # Dependencies
│   │   │
│   │   ├── 📁 csv-processing-service/   # CSV/Excel file processing
│   │   │   ├── index.js                 # Lambda handler
│   │   │   ├── 📁 src/                  # Processing logic
│   │   │   ├── 📁 tests/                # Unit tests
│   │   │   └── package.json             # Dependencies
│   │   │
│   │   ├── 📁 ai-vision-service/        # AI Vision analysis
│   │   │   ├── index.js                 # Lambda handler
│   │   │   ├── 📁 src/                  # AI logic
│   │   │   ├── 📁 tests/                # Unit tests
│   │   │   └── package.json             # Dependencies
│   │   │
│   │   └── 📁 document-service/         # Document processing
│   │       ├── index.js                 # Lambda handler
│   │       ├── 📁 src/                  # Document logic
│   │       ├── 📁 tests/                # Unit tests
│   │       └── package.json             # Dependencies
│   │
│   ├── 📁 auth-service/                 # Authentication & authorization
│   ├── 📁 notification-service/         # Email/SMS notifications
│   ├── 📁 pricing-engine/               # Core pricing engine
│   ├── 📁 text-processing/              # Text analysis
│   ├── 📁 image-processing/             # Image processing
│   └── 📁 file-processing/              # File handling
│
├── 📁 infrastructure/                   # Infrastructure as Code
│   ├── 📁 cloudformation/               # AWS CloudFormation templates
│   │   ├── cognito-stack.yaml           # Cognito configuration
│   │   └── insurance-api-stack.yaml     # API Gateway + Lambda
│   └── 📁 serverless/                   # Serverless Framework
│
├── 📁 config/                           # Configuration Files
│   ├── aws-credentials.env              # AWS credentials
│   └── cognito-config.js                # Cognito configuration
│
├── 📁 test/                             # Centralized Testing
│   ├── 📁 unit/                         # Unit tests
│   ├── 📁 integration/                  # Integration tests
│   ├── 📁 e2e/                          # End-to-end tests
│   ├── 📁 fixtures/                     # Test data & setup
│   └── jest.config.js                   # Jest configuration
│
├── 📁 database/                         # Database scripts & schemas
├── 📁 docs/                             # Documentation
├── 📁 deployment/                       # Deployment scripts
├── 📁 amplify/                          # AWS Amplify configuration
├── 📁 aws/                              # AWS-specific resources
├── 📁 src/                              # Shared source code
└── package.json                         # Root package.json
```

## 🎯 **Microservice Architecture Benefits**

### ✅ **Service Independence**
- Each Lambda function has its own `package.json`
- Independent dependency management
- Isolated deployment and scaling
- Clear separation of concerns

### ✅ **Scalability**
- Individual services can scale independently
- Auto-scaling based on demand
- Cost optimization per service
- Performance isolation

### ✅ **Maintainability**
- Smaller, focused codebases
- Easier to understand and modify
- Independent versioning
- Reduced deployment risk

## 🚀 **Development Workflow**

### **Local Development**
```bash
# Start local development server
npm start          # Runs server/index.js for local testing

# Test individual Lambda functions locally
cd lambda/functions/pricing-service
npm install
npm run dev        # Local development with SAM CLI
```

### **Testing**
```bash
# Run all tests
npm test           # Runs tests from /test directory

# Test specific service
cd lambda/functions/pricing-service
npm test           # Unit tests for pricing service
```

### **Deployment**
```bash
# Deploy individual Lambda function
cd lambda/functions/pricing-service
npm run deploy     # Deploy to AWS

# Deploy entire infrastructure
cd infrastructure/cloudformation
aws cloudformation deploy --template-file insurance-api-stack.yaml
```

## 🔄 **Service Communication**

### **API Gateway Integration**
```
Client → API Gateway → Lambda Functions
                    ├── /api/process-item → pricing-service
                    ├── /api/process-csv → csv-processing-service
                    ├── /api/analyze-image → ai-vision-service
                    └── /api/documents → document-service
```

### **Service-to-Service Communication**
```javascript
// Example: CSV service calling pricing service
const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();

async function callPricingService(itemData) {
    const params = {
        FunctionName: 'pricing-service',
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(itemData)
    };
    
    const result = await lambda.invoke(params).promise();
    return JSON.parse(result.Payload);
}
```

## 📊 **Data Flow**

### **Single Item Pricing**
```
1. Client → API Gateway → pricing-service
2. pricing-service → InsuranceItemPricer.js
3. InsuranceItemPricer.js → SerpAPI → Product data
4. pricing-service → DynamoDB (store transaction)
5. pricing-service → Client (structured response)
```

### **CSV Processing**
```
1. Client → API Gateway → csv-processing-service
2. csv-processing-service → Parse CSV/Excel
3. csv-processing-service → pricing-service (for each item)
4. csv-processing-service → Aggregate results
5. csv-processing-service → Client (batch results)
```

### **AI Vision Analysis**
```
1. Client → API Gateway → ai-vision-service
2. ai-vision-service → OpenAI Vision API
3. ai-vision-service → Process structured data
4. ai-vision-service → Client (analysis results)
```

## 🔧 **Configuration Management**

### **Environment Variables**
```bash
# Lambda Environment Variables
SERPAPI_KEY=your_serpapi_key
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key
GOOGLE_SEARCH_ENGINE_ID=your_cse_id

# Database Configuration
TRANSACTIONS_TABLE=pricing-transactions
LOGS_TABLE=pricing-logs
AURORA_CLUSTER_ARN=your_aurora_arn
AURORA_SECRET_ARN=your_secret_arn
```

### **Service Configuration**
```javascript
// lambda/functions/pricing-service/config.js
module.exports = {
    serpApiKey: process.env.SERPAPI_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    timeout: 30000,
    retryAttempts: 3,
    priceTolerance: 50
};
```

## 🧪 **Testing Strategy**

### **Unit Tests**
```javascript
// test/unit/pricing-service.test.js
describe('Pricing Service', () => {
    test('should find price for valid item', async () => {
        const result = await pricingService.findPrice('Polar Aurora Mailbox');
        expect(result.price).toBeDefined();
        expect(result.source).toBeDefined();
    });
});
```

### **Integration Tests**
```javascript
// test/integration/api.test.js
describe('API Integration', () => {
    test('should process item through full pipeline', async () => {
        const response = await request(app)
            .post('/api/process-item')
            .send({ description: 'Test item' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
});
```

## 🚀 **Deployment Strategy**

### **Blue-Green Deployment**
1. Deploy new version to staging environment
2. Run integration tests
3. Switch traffic to new version
4. Monitor performance and errors
5. Rollback if issues detected

### **Canary Deployment**
1. Deploy to 10% of traffic
2. Monitor metrics and errors
3. Gradually increase to 50%, then 100%
4. Full deployment if successful

## 📈 **Monitoring & Observability**

### **CloudWatch Metrics**
- Lambda invocation count
- Duration and error rates
- Memory usage
- Concurrent executions

### **X-Ray Tracing**
- Service-to-service communication
- API Gateway integration
- Database queries
- External API calls

### **Custom Metrics**
- Pricing accuracy
- Processing time
- User satisfaction
- Business metrics

## 🔒 **Security**

### **Authentication**
- AWS Cognito for user authentication
- JWT tokens for API access
- IAM roles for service-to-service communication

### **Authorization**
- API Gateway authorizers
- Lambda function permissions
- Resource-based policies

### **Data Protection**
- Encryption at rest and in transit
- PII data handling
- Audit logging
- Compliance monitoring

## 💰 **Cost Optimization**

### **Lambda Optimization**
- Right-sizing memory allocation
- Optimizing cold start times
- Using provisioned concurrency
- Monitoring and adjusting

### **Storage Optimization**
- DynamoDB on-demand billing
- S3 lifecycle policies
- Data archival strategies
- Cost monitoring

## 🎯 **Success Metrics**

### **Performance**
- API response time < 2 seconds
- 99.9% uptime
- < 1% error rate
- < 100ms cold start time

### **Business**
- 85-95% pricing accuracy
- 80-95% success rate for branded items
- User satisfaction > 4.5/5
- Processing time < 30 seconds for batch

### **Technical**
- Code coverage > 80%
- Test automation > 90%
- Deployment frequency > daily
- Mean time to recovery < 1 hour

---

**This architecture ensures scalability, maintainability, and proper separation of concerns while leveraging the sophisticated pricing logic from your old app.**
