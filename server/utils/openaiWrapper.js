/**
 * Robust OpenAI Wrapper with Automatic Fallback
 * Handles GPT-5's stricter parameters and model fallbacks automatically
 */

const OpenAI = require('openai');
const { 
  sanitizeParams, 
  classifyOpenAIError, 
  getFallbackChain,
  ERROR_TYPES 
} = require('../config/modelCapabilities');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Chat completion with automatic fallback and parameter sanitization
 */
async function chatWithFallback({ model, messages, ...opts }) {
  let currentModel = model;
  let tried = [];
  let params = { model: currentModel, messages, ...opts };
  let strippedParams = [];

  // Maximum attempts to prevent infinite loops
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      console.log(`🔍 Attempt ${attempt + 1}: Using model ${currentModel}`);
      
      // Sanitize parameters for current model
      const payload = sanitizeParams(currentModel, params);
      
      // Log what we're sending (debug level)
      if (process.env.NODE_ENV === 'development') {
        console.log(`📤 Sending to ${currentModel}:`, {
          model: payload.model,
          messagesCount: payload.messages?.length,
          strippedParams: strippedParams.length > 0 ? strippedParams : 'none'
        });
      }
      
      const response = await openai.chat.completions.create(payload);
      
      // Success! Log the final result
      console.log(`✅ Success with ${currentModel} (attempt ${attempt + 1})`);
      if (strippedParams.length > 0) {
        console.log(`🔧 Stripped parameters: ${strippedParams.join(', ')}`);
      }
      
      return { 
        model: currentModel, 
        response,
        attempt: attempt + 1,
        strippedParams,
        fallbackUsed: attempt > 0
      };
      
    } catch (err) {
      const errorClass = classifyOpenAIError(err);
      const errorMsg = err?.response?.data?.error?.message || err.message;
      
      tried.push({ 
        model: currentModel, 
        type: errorClass.type, 
        message: errorMsg.substring(0, 60) + (errorMsg.length > 60 ? '...' : ''),
        attempt: attempt + 1
      });
      
      console.log(`❌ Attempt ${attempt + 1} failed with ${currentModel}: ${errorClass.type}`);
      console.log(`   Error: ${errorMsg.substring(0, 100)}...`);
      
      if (errorClass.type === ERROR_TYPES.PARAM_NOT_SUPPORTED && errorClass.offending?.length) {
        // Remove bad parameters and retry same model once
        console.log(`🔧 Stripping unsupported parameters: ${errorClass.offending.join(', ')}`);
        
        for (const param of errorClass.offending) {
          delete params[param];
          if (!strippedParams.includes(param)) {
            strippedParams.push(param);
          }
        }
        
        // Continue to retry with same model (stripped params)
        continue;
      }
      
      // For other errors, fallback to next model
      const fallbackChain = getFallbackChain(currentModel);
      const nextModel = fallbackChain.shift();
      
      if (!nextModel) {
        console.log(`🚨 No more fallbacks available for ${currentModel}`);
        throw new Error(`All fallbacks failed: ${JSON.stringify(tried)}`);
      }
      
      console.log(`🔄 Falling back from ${currentModel} to ${nextModel}`);
      currentModel = nextModel;
      params.model = currentModel;
      
      // Reset stripped params for new model
      strippedParams = [];
    }
  }
  
  throw new Error(`Exhausted all attempts: ${JSON.stringify(tried)}`);
}

/**
 * Vision completion with automatic fallback (specialized for image processing)
 */
async function visionWithFallback({ model, messages, ...opts }) {
  // For vision, we might need to handle image-specific parameters
  const visionParams = {
    ...opts,
    // Ensure we don't send unsupported parameters for GPT-5
    ...(model.startsWith('gpt-5') ? {} : { temperature: 0.1 })
  };
  
  return chatWithFallback({ model, messages, ...visionParams });
}

/**
 * Simple chat completion (backward compatibility)
 */
async function simpleChat({ model, messages, ...opts }) {
  try {
    const payload = sanitizeParams(model, { model, messages, ...opts });
    return await openai.chat.completions.create(payload);
  } catch (err) {
    console.error('❌ Simple chat failed:', err.message);
    throw err;
  }
}

module.exports = {
  chatWithFallback,
  visionWithFallback,
  simpleChat,
  openai
};
