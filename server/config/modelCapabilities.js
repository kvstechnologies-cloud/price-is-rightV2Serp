/**
 * Model Capabilities and Fallback Configuration
 * Centralized configuration for handling GPT-5's stricter parameters
 */

// Fallback chain for each model
const MODEL_FALLBACKS = {
  'gpt-5': ['gpt-5-mini', 'gpt-4o', 'gpt-4o-mini'],
  'gpt-5-mini': ['gpt-4o', 'gpt-4o-mini'],
  'gpt-5-nano': ['gpt-5-mini', 'gpt-4o', 'gpt-4o-mini'],
  'gpt-4o': ['gpt-4o-mini'],
  'gpt-4o-mini': []
};

// Allowed parameters for each model (conservative approach)
const ALLOWED_KEYS = {
  'gpt-5': ['model', 'messages', 'response_format', 'metadata'], // Conservative: no temperature/max_tokens/top_p/stop/penalties
  'gpt-5-mini': ['model', 'messages', 'response_format', 'metadata'], // Same guard
  'gpt-5-nano': ['model', 'messages', 'response_format', 'metadata'], // Same guard
  'gpt-4o': ['model', 'messages', 'temperature', 'max_tokens', 'top_p', 'stop', 'presence_penalty', 'frequency_penalty', 'response_format', 'metadata'],
  'gpt-4o-mini': ['model', 'messages', 'temperature', 'max_tokens', 'top_p', 'stop', 'presence_penalty', 'frequency_penalty', 'response_format', 'metadata']
};

// Error classification types
const ERROR_TYPES = {
  PARAM_NOT_SUPPORTED: 'PARAM_NOT_SUPPORTED',
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT',
  CONTEXT: 'CONTEXT',
  SERVER: 'SERVER'
};

/**
 * Resolve model name (keep simple for now)
 */
function resolveModel(model) {
  return model;
}

/**
 * Sanitize parameters based on model capabilities
 */
function sanitizeParams(model, params) {
  const allow = ALLOWED_KEYS[resolveModel(model)] || ALLOWED_KEYS['gpt-4o'];
  const out = {};
  
  for (const key of allow) {
    if (params[key] !== undefined) {
      out[key] = params[key];
    }
  }
  
  return out;
}

/**
 * Classify OpenAI errors for proper fallback handling
 */
function classifyOpenAIError(err) {
  const msg = String(err?.response?.data?.error?.message || err?.message || '');
  const offending = [];
  
  // Check for unsupported parameters
  const badParams = ['temperature', 'max_tokens', 'max_completion_tokens', 'top_p', 'stop', 'presence_penalty', 'frequency_penalty'];
  
  for (const param of badParams) {
    if (new RegExp(`\\b${param}\\b.*(not supported|unrecognized|unknown|is not allowed)`, 'i').test(msg)) {
      offending.push(param);
    }
    if (new RegExp(`Unrecognized (request )?argument.*\\b${param}\\b`, 'i').test(msg)) {
      offending.push(param);
    }
  }
  
  // Classify error type
  if (/model .*does not exist|unknown model|cannot find model|404/i.test(msg)) {
    return { type: ERROR_TYPES.MODEL_NOT_FOUND };
  }
  
  if (offending.length > 0) {
    return { type: ERROR_TYPES.PARAM_NOT_SUPPORTED, offending };
  }
  
  if (/rate limit|overloaded|429/i.test(msg)) {
    return { type: ERROR_TYPES.RATE_LIMIT };
  }
  
  if (/context length|too many tokens/i.test(msg)) {
    return { type: ERROR_TYPES.CONTEXT };
  }
  
  return { type: ERROR_TYPES.SERVER };
}

/**
 * Get fallback chain for a model
 */
function getFallbackChain(model) {
  return MODEL_FALLBACKS[model] || [];
}

/**
 * Check if a model is GPT-5 family
 */
function isGPT5Model(model) {
  return /^gpt-5($|-)/i.test(model);
}

module.exports = {
  MODEL_FALLBACKS,
  ALLOWED_KEYS,
  ERROR_TYPES,
  resolveModel,
  sanitizeParams,
  classifyOpenAIError,
  getFallbackChain,
  isGPT5Model
};
