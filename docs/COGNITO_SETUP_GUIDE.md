# AWS Cognito Setup Guide

## Prerequisites

### 1. AWS Account Setup
- [ ] AWS Account with billing enabled
- [ ] AWS CLI installed and configured
- [ ] Appropriate IAM permissions for:
  - Cognito
  - CloudFormation
  - IAM
  - API Gateway
  - Lambda
  - S3

### 2. Local Development Setup
- [ ] Node.js installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

## Step-by-Step Implementation

### Step 1: AWS CLI Configuration

1. **Install AWS CLI** (if not already installed):
   ```bash
   # Download from: https://aws.amazon.com/cli/
   ```

2. **Configure AWS CLI**:
   ```bash
   aws configure
   ```
   Enter your:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region (e.g., us-east-1)
   - Default output format (json)

3. **Verify configuration**:
   ```bash
   aws sts get-caller-identity
   ```

### Step 2: Deploy Cognito Infrastructure

1. **Run the deployment script**:
   ```powershell
   .\deploy-cognito.ps1
   ```

2. **Alternative: Manual deployment**:
   ```bash
   aws cloudformation deploy \
     --template-file infrastructure/cloudformation/cognito-stack.yaml \
     --stack-name insurance-pricing-cognito \
     --parameter-overrides Environment=dev \
     --capabilities CAPABILITY_NAMED_IAM \
     --region us-east-1
   ```

3. **Get the output values**:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name insurance-pricing-cognito \
     --region us-east-1 \
     --query 'Stacks[0].Outputs'
   ```

### Step 3: Update Application Configuration

1. **Update `src/config/amplify-config.js`** with the values from Step 2:
   ```javascript
   export const amplifyConfig = {
       Auth: {
           region: 'us-east-1', // Your AWS region
           userPoolId: 'us-east-1_XXXXXXXXX', // From CloudFormation output
           userPoolWebClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX', // From CloudFormation output
           identityPoolId: 'us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX', // From CloudFormation output
           mandatorySignIn: true,
           authenticationFlowType: 'USER_SRP_AUTH'
       }
   };
   ```

### Step 4: Initialize Amplify in Your App

1. **Update `js/app.js`** to initialize Amplify:
   ```javascript
   import { amplifyConfig } from '../src/config/amplify-config.js';
   
   // Initialize Amplify at the beginning of your app
   if (window.aws_amplify) {
       window.aws_amplify.Amplify.configure(amplifyConfig);
   }
   ```

### Step 5: Integrate Authentication UI

1. **Add authentication state management**
2. **Create login/logout components**
3. **Protect routes that require authentication**

### Step 6: Test the Implementation

1. **Create a test user** in AWS Cognito Console
2. **Test login flow** in your application
3. **Verify token handling** and API calls

## Configuration Values You'll Need

After deployment, you'll get these values from CloudFormation outputs:

- **UserPoolId**: `us-east-1_XXXXXXXXX`
- **UserPoolClientId**: `XXXXXXXXXXXXXXXXXXXXXXXXXX`
- **IdentityPoolId**: `us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure your callback URLs include `http://localhost:5000`
2. **Invalid Client**: Verify UserPoolClientId is correct
3. **Token Expired**: Implement token refresh logic
4. **Permission Denied**: Check IAM roles and policies

### Useful Commands:

```bash
# Check stack status
aws cloudformation describe-stacks --stack-name insurance-pricing-cognito

# Delete stack if needed
aws cloudformation delete-stack --stack-name insurance-pricing-cognito

# List Cognito User Pools
aws cognito-idp list-user-pools --max-items 10

# Create test user
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username test@example.com \
  --temporary-password TempPass123! \
  --user-attributes Name=email,Value=test@example.com
```

## Next Steps

After completing this setup:

1. **Add user registration flow**
2. **Implement password reset**
3. **Add social login providers** (Google, Facebook, etc.)
4. **Set up user groups and permissions**
5. **Implement MFA** (Multi-Factor Authentication)

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for sensitive data
3. **Implement proper error handling**
4. **Add logging and monitoring**
5. **Regular security audits**

## Support

If you encounter issues:
1. Check AWS CloudFormation console for deployment errors
2. Review AWS Cognito console for configuration issues
3. Check browser console for JavaScript errors
4. Verify network requests in browser dev tools 