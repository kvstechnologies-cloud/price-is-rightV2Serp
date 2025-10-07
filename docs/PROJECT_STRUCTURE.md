# 🏗️ Project Structure - Microservice Architecture

## 📁 **Root Directory Structure**

```
price-is-right-V2/
├── 📁 client/                    # Frontend Application
│   ├── 📁 public/               # Static assets
│   │   ├── index.html           # Main HTML file
│   │   └── assets/              # Images, files, etc.
│   ├── 📁 src/                  # Source code
│   │   ├── 📁 components/       # React/Vue components
│   │   ├── 📁 services/         # API services
│   │   └── 📁 utils/            # Utility functions
│   └── 📁 styles/               # CSS files
├── 📁 server/                   # Backend API Server
│   ├── index.js                 # Main server file
│   ├── 📁 routes/               # API routes
│   ├── 📁 middleware/           # Express middleware
│   ├── 📁 controllers/          # Route controllers
│   └── 📁 services/             # Business logic
├── 📁 lambda/                   # AWS Lambda Microservices
│   ├── 📁 pricing-service/      # Insurance pricing calculations
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   ├── 📁 auth-service/         # Authentication & authorization
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   ├── 📁 notification-service/ # Email/SMS notifications
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   └── 📁 document-service/     # Document processing
├── 📁 config/                   # Configuration Files
│   ├── aws-credentials.env      # AWS credentials
│   └── cognito-config.js        # Cognito configuration
├── 📁 test/                     # Centralized Testing
│   ├── 📁 unit/                 # Unit tests
│   ├── 📁 integration/          # Integration tests
│   ├── 📁 e2e/                  # End-to-end tests
│   ├── 📁 fixtures/             # Test data & setup
│   └── jest.config.js           # Jest configuration
├── 📁 infrastructure/           # Infrastructure as Code
│   ├── 📁 cloudformation/       # AWS CloudFormation
│   └── 📁 serverless/           # Serverless Framework
├── 📁 database/                 # Database scripts & schemas
├── 📁 docs/                     # Documentation
├── 📁 deployment/               # Deployment scripts
├── 📁 amplify/                  # AWS Amplify configuration
├── 📁 aws/                      # AWS-specific resources
├── 📁 src/                      # Shared source code
└── package.json                 # Root package.json
```

## 🎯 **Microservice Architecture Benefits**

### ✅ **Individual Service Folders**
- Each Lambda service has its own `package.json`
- Independent dependency management
- Isolated deployment and scaling
- Clear separation of concerns

### ✅ **Centralized Testing**
- All tests in one location
- Shared test utilities and fixtures
- Consistent testing patterns
- Easy to run all tests together

### ✅ **Clean Separation**
- **Client**: Frontend application
- **Server**: Backend API
- **Lambda**: Microservices
- **Config**: Environment configuration
- **Infrastructure**: IaC templates

## 🚀 **Development Workflow**

### **Starting the Application**
```bash
npm start          # Start the main server
npm run dev        # Start with nodemon (development)
```

### **Testing**
```bash
npm test           # Run all tests
npm run test:unit  # Run unit tests only
npm run test:e2e   # Run E2E tests only
```

### **Lambda Services**
```bash
cd lambda/pricing-service
npm install
npm run dev        # Local development
npm run deploy     # Deploy to AWS
```

## 📋 **File Organization Rules**

### ✅ **Do's**
- Put all frontend code in `client/`
- Put all backend code in `server/`
- Put all Lambda functions in `lambda/`
- Put all tests in `test/`
- Put all config files in `config/`

### ❌ **Don'ts**
- Don't put files in the root directory
- Don't mix frontend and backend code
- Don't create files outside their designated folders
- Don't duplicate configuration files

## 🔧 **Next Steps**

1. **Update import paths** in all JavaScript files
2. **Create individual README files** for each service
3. **Set up CI/CD pipelines** for each microservice
4. **Configure environment variables** for each service
5. **Set up monitoring and logging** for each service

## 📊 **Current Status**

- ✅ **Folder structure created**
- ✅ **Files moved to appropriate locations**
- ✅ **Server updated with new paths**
- ✅ **Package.json updated**
- ✅ **Lambda services configured**
- ✅ **Testing structure set up**
- 🔄 **Import paths need updating**
- 🔄 **Documentation needs completion**
