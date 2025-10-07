# GPT-5 Upgrade Implementation

## Overview
This document outlines the upgrade from GPT-4o/GPT-4o-mini to GPT-5 models, including the feature flag system for safe rollout and rollback capabilities.

## What Was Upgraded

### Model Mappings
- **GPT-4o** → **GPT-5-main** (unified model with strong vision capabilities)
- **GPT-4o-mini** → **GPT-5-main-mini** (cost/speed optimized tier)
- **New**: **GPT-5-thinking** (for heavy reasoning tasks)

### Files Updated
1. `server/config/gpt5Config.js` - New configuration utility
2. `server/utils/visionExtractor.js` - Vision model selection
3. `server/models/InsuranceItemPricer.js` - Text model selection
4. `server/index.js` - Main server model configuration
5. `server/routes/enhancedProcessingRoutes.js` - Enhanced processing models
6. `server/routes/csvProcessingRoutes.js` - CSV processing models
7. `client/src/services/OpenAIService.js` - Client-side model selection

## Feature Flag System

### Environment Variables
```bash
# Enable/disable GPT-5 models
USE_GPT5=true|false

# Enable GPT-5 thinking mode for heavy reasoning
USE_GPT5_THINKING=true|false

# Client-side flag (React)
REACT_APP_USE_GPT5=true|false
```

### Configuration Logic
```javascript
// Vision Models
if (USE_GPT5 === 'true') {
  if (USE_GPT5_THINKING === 'true') {
    return 'gpt-5-thinking';  // Heavy reasoning
  }
  return 'gpt-5-main';        // Standard vision
}
return 'gpt-4o';              // Fallback

// Text Models
if (USE_GPT5 === 'true') {
  if (USE_GPT5_THINKING === 'true') {
    return 'gpt-5-thinking';  // Heavy reasoning
  }
  return 'gpt-5-main-mini';   // Standard text
}
return 'gpt-4o-mini';         // Fallback
```

## Deployment Strategy

### Development Environment
```bash
# .env.development
USE_GPT5=true
USE_GPT5_THINKING=false
NODE_ENV=development
```

### Production Environment
```bash
# .env.production
USE_GPT5=false
USE_GPT5_THINKING=false
NODE_ENV=production
```

### Staging/Testing
```bash
# .env.staging
USE_GPT5=true
USE_GPT5_THINKING=true
NODE_ENV=staging
```

## Usage Examples

### Basic GPT-5 Usage
```javascript
const gpt5Config = require('./config/gpt5Config');

// Get appropriate model based on feature flags
const visionModel = gpt5Config.getVisionModel();
const textModel = gpt5Config.getTextModel();

// Check if GPT-5 is enabled
if (gpt5Config.isGPT5Enabled()) {
  console.log('Using GPT-5 models');
}
```

### Heavy Reasoning Tasks
```javascript
// For complex product matching/validation
if (gpt5Config.isGPT5ThinkingEnabled()) {
  // Use gpt-5-thinking for better reasoning
  const model = gpt5Config.getTextModel(); // Returns 'gpt-5-thinking'
} else {
  // Use standard model
  const model = gpt5Config.getTextModel(); // Returns 'gpt-5-main-mini' or 'gpt-4o-mini'
}
```

## Testing

### Run Configuration Test
```bash
node test-gpt5-config.js
```

### Expected Output
```
🧪 Testing GPT-5 Configuration...

📋 Environment Variables:
   USE_GPT5: true
   USE_GPT5_THINKING: false
   NODE_ENV: development

✅ GPT5Config loaded successfully

🤖 Model Configuration:
   GPT-5 Enabled: ✅ YES
   GPT-5 Thinking: ❌ NO
   Vision Model: gpt-5-main
   Text Model: gpt-5-main-mini
   Environment: development
```

## Rollback Procedure

### Quick Rollback to GPT-4
```bash
# Set environment variable
export USE_GPT5=false

# Restart server
npm start
```

### Gradual Rollback
```bash
# Disable GPT-5 thinking first
export USE_GPT5_THINKING=false

# Then disable GPT-5 entirely
export USE_GPT5=false
```

## Monitoring and Validation

### Server Startup Logs
```
🤖 GPT-5 Configuration:
   Environment: Development
   GPT-5 Enabled: ✅ YES
   GPT-5 Thinking: ❌ NO
   Vision Model: gpt-5-main
   Text Model: gpt-5-main-mini
```

### Configuration Validation
- ✅ Checks for valid feature flag combinations
- ⚠️ Warns about GPT-5 in production
- ❌ Errors for invalid configurations

## Performance Considerations

### GPT-5-main vs GPT-5-main-mini
- **GPT-5-main**: Better quality, higher cost, slower
- **GPT-5-main-mini**: Good quality, lower cost, faster
- **GPT-5-thinking**: Best reasoning, highest cost, slowest

### Cost Optimization
```javascript
// Use thinking mode only for critical tasks
if (isComplexReasoningTask) {
  // Enable thinking mode temporarily
  process.env.USE_GPT5_THINKING = 'true';
  const result = await processWithAI();
  process.env.USE_GPT5_THINKING = 'false';
}
```

## Troubleshooting

### Common Issues
1. **Model not found**: Ensure OpenAI API supports the model
2. **Feature flags not working**: Check environment variable names
3. **Client/server mismatch**: Verify both sides use same flags

### Debug Commands
```bash
# Check current configuration
node test-gpt5-config.js

# Verify environment variables
echo $USE_GPT5
echo $USE_GPT5_THINKING

# Test specific model selection
node -e "const config = require('./server/config/gpt5Config'); console.log(config.getModelInfo());"
```

## Future Enhancements

### Planned Features
1. **Dynamic model switching** based on task complexity
2. **Cost monitoring** and automatic fallback
3. **A/B testing** framework for model comparison
4. **Performance metrics** collection

### Model Updates
When new GPT models are released:
1. Update `gpt5Config.js` with new model names
2. Add new feature flags if needed
3. Update documentation
4. Test with existing prompts

## Support

For questions or issues with the GPT-5 upgrade:
1. Check this README
2. Run `test-gpt5-config.js`
3. Review server startup logs
4. Verify environment variables
5. Check OpenAI API documentation for model availability
