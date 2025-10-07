// Enhanced V2 Server - Integrated with sophisticated pricing logic from old app

// Polyfill for File object in Node.js environment
if (typeof File === 'undefined') {
  global.File = class File {
    constructor(bits, name, options = {}) {
      this.name = name;
      this.size = bits.length;
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs');
const gpt5Config = require('./config/gpt5Config');

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// DEPLOYMENT VERSION CHECK
// ========================================
const DEPLOYMENT_VERSION = 'V2-ENHANCED-2025-08-07';

console.log(`🚀 V2 ENHANCED DEPLOYMENT VERSION: ${DEPLOYMENT_VERSION}`);
console.log(`📅 Enhanced at: ${new Date().toISOString()}`);

// ========================================
// ENVIRONMENT DETECTION
// ========================================
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const isLocal = !isLambda;
const isProduction = process.env.NODE_ENV === 'production';
const DEBUG_LOGGING = !isProduction && isLocal;

console.log('🚀 V2 Enhanced - AI Insurance Pricing System');
console.log(`🌍 Environment: ${isLambda ? 'AWS Lambda' : 'Local'} (${process.env.NODE_ENV || 'development'})`);

// ========================================
// AUDIT SYSTEM INITIALIZATION
// ========================================
let auditSystem = null;
let auditEnabled = false;

async function initializeAuditSystem() {
  try {
    if (process.env.AUDIT_ENABLED === 'true') {
      console.log('🔍 Initializing audit system...');
      
      // Use require instead of dynamic import for CommonJS compatibility
      const auditModule = require('../src/audit/index.js');
      const { initializeAuditSystem: initAudit } = auditModule;
      
      const initialized = await initAudit();
      if (initialized && auditModule.logsRouter) {
        // Get the database connection directly from the audit instance
        const auditInstance = auditModule.Audit;
        console.log('🔍 Audit instance found:', !!auditInstance);
        console.log('🔍 Audit instance initialized:', auditInstance?.initialized);
        console.log('🔍 Audit instance dbConnection:', !!auditInstance?.dbConnection);
        
        // FIXED: Properly expose the database connection from the audit instance
        auditSystem = { 
          logsRouter: auditModule.logsRouter,
          dbConnection: auditInstance?.dbConnection || null,
          // Also expose the audit instance itself for additional methods
          auditInstance: auditInstance
        };
        auditEnabled = true;
        console.log('✅ Audit system initialized successfully');
        console.log('🔍 Database connection available:', !!auditSystem.dbConnection);
        
        // Mount audit routes
        app.use('/api/logs', auditModule.logsRouter);
        console.log('🔍 Audit routes mounted at /api/logs');
        
      } else {
        console.log('🔍 Audit system disabled - database not available');
      }
    } else {
      console.log('🔍 Audit system disabled - AUDIT_ENABLED not set to true');
    }
  } catch (error) {
    console.error('❌ Failed to initialize audit system:', error.message);
    console.log('🔍 Continuing without audit system...');
  }
}

// ========================================
// OPENAI INITIALIZATION
// ========================================
let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log(`✅ OpenAI client initialized successfully (${isLambda ? 'Lambda' : 'Local'})`);
  } catch (error) {
    console.error('❌ Failed to initialize OpenAI client:', error.message);
  }
} else {
  console.log('⚠️ OpenAI API key not found in environment variables');
}

// ========================================
// MIDDLEWARE CONFIGURATION
// ========================================
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enhanced logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  
  if (DEBUG_LOGGING) {
    if (req.url.includes('/api/analyze-image')) {
      console.log(`\n🌐 [${timestamp}] ${req.method} ${req.url}`);
      console.log('  - Has prompt:', !!(req.body && req.body.prompt));
      console.log('  - Has fileName:', !!(req.body && req.body.fileName));
      console.log('  - Image length:', req.body?.image?.length || 0);
      console.log('  - Prompt length:', req.body?.prompt?.length || 0);
      console.log('  - FileName value:', req.body?.fileName);
    } else if (req.url.includes('/api/') || req.url.includes('/health')) {
      console.log(`🌐 ${req.method} ${req.url} - ${timestamp} (${isLambda ? 'Lambda' : 'Local'})`);
    }
  }
  next();
});

// Memory cleanup middleware for CSV processing
app.use((req, res, next) => {
  // Clean up after CSV processing requests
  if (req.url.includes('/api/process-csv')) {
    res.on('finish', () => {
      // Clear any file buffers
      if (req.file && req.file.buffer) {
        req.file.buffer = null;
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    });
  }
  next();
});

// ========================================
// STATIC FILE SERVING
// ========================================
app.use('/styles', express.static(path.join(__dirname, '../client/styles'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

app.use('/js', express.static(path.join(__dirname, '../client/src'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));
app.use('/src', express.static(path.join(__dirname, '../client/src')));
app.use('/assets', express.static(path.join(__dirname, '../client/public/assets')));

// Serve the main ChatGPT-style interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/public/index.html'));
});

// Serve the test page
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, '../test-frontend.html'));
});

// Serve test files

app.get('/test/cognito-diagnostic', (req, res) => {
    res.sendFile(path.join(__dirname, '../test/cognito-diagnostic.html'));
});

app.get('/test/session-persistence', (req, res) => {
    res.sendFile(path.join(__dirname, '../test/session-persistence-test.html'));
});

// ========================================
// CACHE MANAGEMENT
// ========================================

// Cache clearing route
app.post('/api/clear-cache', async (req, res) => {
  try {
    console.log('🧹 Cache clearing request received');
    
    // Clear any global caches
    if (global.gc) {
      global.gc();
      console.log('✅ Global garbage collection triggered');
    }
    
    res.json({ 
      success: true, 
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Cache clearing error:', error);
    res.status(500).json({ 
      error: 'Failed to clear cache',
      message: error.message 
    });
  }
});

// ========================================
// AI VISION INTEGRATION
// ========================================

// AI Vision Status Check
app.get('/api/ai-vision-status', (req, res) => {
  if (DEBUG_LOGGING) console.log('🤖 AI Vision status endpoint called');

  const hasApiKey = !!process.env.OPENAI_API_KEY;

  res.json({
    aiVisionEnabled: hasApiKey,
    openaiClientReady: !!openai,
    status: hasApiKey ? 'ready' : 'missing_api_key',
    message: hasApiKey ?
      `AI Vision is ready for use (${isLambda ? 'Lambda' : 'Local'})` : 
      'OpenAI API key not configured. Add OPENAI_API_KEY to your environment variables.',
    timestamp: new Date().toISOString(),
    supportedFormats: ['JPEG', 'PNG', 'GIF', 'WebP'],
    maxFileSize: '10MB',
            visionModel: gpt5Config.getVisionModel(),
    environment: isLambda ? 'AWS Lambda' : (process.env.NODE_ENV || 'development'),
    deploymentVersion: DEPLOYMENT_VERSION
  });
});

// AI Vision Analysis - Enhanced Implementation with Pricing Integration
app.post('/api/analyze-image', async (req, res) => {
  try {
    if (DEBUG_LOGGING) {
      console.log('🔍 AI Vision analyze endpoint called');
      console.log('📦 Request body keys:', Object.keys(req.body || {}));
      console.log('📦 Request details:', {
        hasImage: !!req.body?.image,
        hasPrompt: !!req.body?.prompt,
        hasFileName: !!req.body?.fileName,
        imageLength: req.body?.image?.length || 0,
        promptLength: req.body?.prompt?.length || 0
      });
    }

    const { image, prompt, fileName } = req.body;

    if (!image) {
      console.error('❌ No image provided in request');
      return res.status(400).json({
        success: false,
        error: 'Image data is required'
      });
    }

    if (!prompt) {
      console.error('❌ No prompt provided in request');
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.'
      });
    }

    if (!openai) {
      console.error('❌ OpenAI client not initialized');
      return res.status(500).json({
        success: false,
        error: 'OpenAI client not initialized'
      });
    }

    console.log('🔍 Processing image with AI Vision...');
    console.log(`📄 File name: ${fileName || 'unnamed'}`);
    console.log(`📝 Prompt: ${prompt}`);

    // Enhanced AI Vision processing with pricing-focused analysis
    const visionResponse = await openai.chat.completions.create({
              model: gpt5Config.getVisionModel(),
      messages: [
        {
          role: 'system',
          content: `You are an expert insurance claims adjuster and product identification specialist. 
          Analyze the provided image and extract detailed product information for insurance pricing purposes.
          
          Focus on:
          - Product name and brand (be specific and detailed)
          - Model number if visible
          - Material and construction details
          - Size/dimensions if apparent
          - Condition assessment
          - Any damage or wear visible
          - Estimated replacement cost based on similar products
          
          Return a structured JSON response with the following format:
          {
            "productName": "Detailed product name with brand and model",
            "brand": "Brand name if identifiable",
            "model": "Model number if visible",
            "description": "Detailed description including materials, size, features",
            "condition": "Good/Fair/Poor based on visible condition",
            "damage": "Any visible damage or wear",
            "estimatedValue": "MUST provide a numerical price estimate in USD (e.g., 150.00, 299.99). This is critical for insurance pricing.",
            "confidence": "High/Medium/Low based on image clarity",
            "category": "Product category (e.g., Furniture, Electronics, Home Decor)",
            "subCategory": "Product subcategory (e.g., Chairs, Lighting, Kitchen Appliances)"
          }`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    const aiResponse = visionResponse.choices[0].message.content;
    console.log('✅ AI Vision analysis completed');

    // Try to parse JSON response
    let structuredData;
    try {
      // First, try to extract JSON from markdown code blocks if present
      let jsonString = aiResponse;
      const codeBlockMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
        console.log('🔍 Extracted JSON from code block');
      }
      
      structuredData = JSON.parse(jsonString);
      console.log('✅ Successfully parsed JSON response');
    } catch (parseError) {
      console.log('⚠️ AI response is not valid JSON, using as text');
      console.log('🔍 Raw AI response:', aiResponse);
      structuredData = {
        productName: aiResponse,
        description: aiResponse,
        estimatedValue: 'AI parsing failed - using market search',
        confidence: 'Medium',
        category: 'HSW',
        subCategory: 'General'
      };
    }

    // Now integrate with pricing system like CSV processing
    let pricingResult = null;
    let searchQuery = '';
    
    try {
      // Import the InsuranceItemPricer from shared service
      const { getInsuranceItemPricer } = require('./services/sharedServices');
      const pricer = getInsuranceItemPricer();
      
      if (!pricer) {
        throw new Error('Failed to get shared InsuranceItemPricer instance');
      }
      
      // Clear cache before processing to ensure fresh results
      pricer.clearAllCaches();
      
      // Build search query from AI analysis
      if (structuredData.productName) {
        searchQuery = structuredData.productName;
      } else if (structuredData.description) {
        searchQuery = structuredData.description;
      } else {
        searchQuery = aiResponse.substring(0, 200); // Fallback to raw response
      }
      
      // Normalize search query for common brand typos
      const { normalizeSearchQuery } = require('./utils/TextNormalization');
      // Clean user chatter (sizes/prices) and normalize brand typos
      const { normalizeBrandTerms } = require('./utils/TextNormalization');
      searchQuery = searchQuery
        .replace(/\b(size|number|cost|price|usd|dollars?)\b/gi, ' ')
        .replace(/\b\$?\d+(?:\.\d+)?\b/g, ' ') // remove numbers like 8.5, 100
        .replace(/\s+/g, ' ')
        .trim();
      searchQuery = normalizeBrandTerms(searchQuery);
      console.log(`🔍 Searching for pricing: ${searchQuery}`);
      
      // REMOVED: Condition-based pricing adjustments - always price for NEW products as requested
      let pricingAdjustment = 1.0; // No adjustments - always price for NEW items
      let conditionNote = ' (priced for NEW replacement item - no condition adjustments)';
      
        let pricingResult;
        try {
          pricingResult = await pricer.findBestPrice(searchQuery);
          console.log(`🔍 Raw pricing result for "${searchQuery}":`, pricingResult);
        } catch (pricingError) {
          console.error(`❌ Pricing search failed for "${searchQuery}":`, pricingError.message);
          pricingResult = {
            price: 'Not found',
            source: 'Market Search',
            category: 'HSW',
            subcategory: 'General',
            url: null,
            isEstimated: true,
            matchQuality: 'Search Failed'
          };
        }
        
        // REMOVED: Condition-based pricing adjustment - always use original price for NEW items
        let adjustedPrice = pricingResult.price; // No adjustments - use original market price
        console.log(`🔍 No price adjustments applied: using original market price $${pricingResult.price} for NEW replacement item`);
      
      console.log(`✅ Pricing result: ${adjustedPrice} from ${pricingResult.source}`);
      
    } catch (pricingError) {
      console.error('❌ Pricing integration error:', pricingError.message);
      // Continue with AI analysis only if pricing fails
      pricingResult = {
        price: structuredData.estimatedValue || 'Not found',
        source: 'Market Search',
        category: structuredData.category || 'HSW',
        subcategory: structuredData.subCategory || 'General',
        url: `https://www.google.com/shopping?q=${encodeURIComponent(searchQuery)}`,
        isEstimated: true
      };
    }

    // Build response similar to CSV processing format
    const responseData = {
      success: true,
      // Pricing information (like CSV processing) - at top level for frontend compatibility
      price: pricingResult?.price || structuredData.estimatedValue || 'Not found',
      source: pricingResult?.source || 'Market Search',
      category: pricingResult?.category || structuredData.category || 'HSW',
      subcategory: pricingResult?.subcategory || structuredData.subCategory || 'General',
      url: pricingResult?.url || null,
      isEstimated: pricingResult?.isEstimated || false,
      matchQuality: pricingResult?.matchQuality || 'AI Analysis',
      // Cost to Replace field for frontend compatibility - always from AI Vision for NEW items
      costToReplace: structuredData.estimatedValue || 'AI Vision estimation needed',
      // Price calculation details for transparency - no condition adjustments
      actualMarketPrice: pricingResult?.price || 'Not found',
      conditionAdjustment: 1.0, // No adjustments - always 1.0 for NEW items
      adjustedPrice: pricingResult?.price || 'Not found', // Use original market price
      conditionNote: conditionNote,
      // AI Vision analysis (nested for additional info)
      aiAnalysis: structuredData,
      // Additional metadata
      fileName: fileName || 'unnamed',
      processingTime: new Date().toISOString(),
      environment: isLambda ? 'AWS Lambda' : (process.env.NODE_ENV || 'development'),
      deploymentVersion: DEPLOYMENT_VERSION,
      rawResponse: aiResponse
    };

    res.json(responseData);

  } catch (error) {
    console.error('❌ AI Vision processing error:', error.message);
    
    // Enhanced error handling
    if (error.message && error.message.includes('rate limit')) {
      res.status(429).json({
        success: false,
        error: 'OpenAI rate limit exceeded. Please try again later.',
        details: error.message
      });
    } else if (error.message && error.message.includes('invalid_api_key')) {
      res.status(401).json({
        success: false,
        error: 'Invalid OpenAI API key. Please check your configuration.',
        details: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'AI Vision processing failed',
        details: error.message,
        platform: isLambda ? 'AWS Lambda' : 'Express Server',
        deploymentVersion: DEPLOYMENT_VERSION
      });
    }
  }
});

// ========================================
// IMAGE PROCESSING WITH PRICING INTEGRATION
// ========================================

// Process images and get pricing results (like CSV processing)
/* DISABLED: app.post('/api/process-images', async (req, res) => {
  try {
    console.log('🔍 Image processing with pricing endpoint called');
    
    const { images, page = 1, pageSize = 50 } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Images array is required'
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    if (!openai) {
      console.error('❌ OpenAI client not initialized');
      return res.status(500).json({
        success: false,
        error: 'OpenAI client not initialized'
      });
    }

    console.log(`🔍 Processing ${images.length} images for pricing analysis...`);

    // Process each image with AI Vision
    const imageResults = [];
    const processingStartTime = Date.now();

    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      console.log(`🔍 Processing image ${i + 1}/${images.length}: ${imageData.fileName || 'unnamed'}`);

      try {
        // Validate image data
        if (!imageData.image || typeof imageData.image !== 'string') {
          throw new Error('Invalid image data: image field is missing or not a string');
        }
        
        if (!imageData.image.startsWith('data:image/')) {
          throw new Error('Invalid image data: must start with data:image/');
        }
        
        console.log(`🔍 Image data validation passed for ${imageData.fileName}`);
        console.log(`🔍 Image data length: ${imageData.image.length} characters`);
        console.log(`🔍 Image data starts with: ${imageData.image.substring(0, 50)}...`);
        
        // AI Vision analysis
        console.log(`🔍 Calling OpenAI Vision API for image: ${imageData.fileName}`);
        console.log(`🔍 Image data preview: ${imageData.image.substring(0, 100)}...`);
        
        let visionResponse;
        try {
          visionResponse = await openai.chat.completions.create({
            model: gpt5Config.getVisionModel(),
            messages: [
              {
                role: 'system',
                content: `You are an expert product identification specialist with deep knowledge of consumer goods, electronics, furniture, appliances, and insurance claims. Your goal is to identify products with 100% accuracy for pricing purposes.

                CRITICAL INSTRUCTIONS FOR 100% ACCURACY:
                1. ALWAYS identify the EXACT product type first (e.g., "Samsung 55-inch QLED 4K Smart TV" not just "TV")
                2. Look for ANY visible brand names, logos, or model numbers
                3. Identify specific features, materials, and specifications
                4. Use precise product categories (e.g., "Queen Size Memory Foam Mattress" not just "mattress")
                5. Include size, dimensions, capacity, or specifications when visible
                6. For electronics, identify the exact model series if possible
                7. For furniture, specify material, style, and dimensions
                8. For appliances, identify brand, model, and features
                
                SEARCH OPTIMIZATION:
                - Create search queries that will work perfectly with Google Shopping/SerpAPI
                - Include brand + product type + key features in productName
                - Make descriptions specific enough for exact product matching
                - Use common product terminology that retailers use
                
                Return a structured JSON response with the following format:
                {
                  "productName": "EXACT product name with brand, model, and key specifications for 100% search accuracy",
                  "brand": "Brand name if identifiable (required for accuracy)",
                  "model": "Model number, series, or specific identifier if visible",
                  "description": "Detailed description including materials, size, features, specifications for precise identification",
                  "condition": "Good/Fair/Poor based on visible condition assessment",
                  "damage": "Specific damage details: stains, scratches, dents, wear patterns, etc.",
                  "estimatedValue": "MUST provide a numerical price estimate in USD (e.g., 150.00, 299.99). This is critical for insurance pricing.",
                  "confidence": "High/Medium/Low based on image clarity and product visibility",
                  "searchKeywords": "Additional search terms that will help find this exact product"
                }
                
                REMEMBER: Your productName and description must be specific enough for SerpAPI to find the exact product with 100% accuracy.`
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Analyze this image and provide detailed product information for insurance pricing: Product identification'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: imageData.image,
                      detail: 'high'
                    }
                  }
                ]
              }
            ],
            max_tokens: 1000,
            temperature: 0.1
          });
          
          console.log(`✅ OpenAI Vision API call successful for image: ${imageData.fileName}`);
        } catch (visionError) {
          console.error(`❌ OpenAI Vision API call failed for ${imageData.fileName}:`, visionError.message);
          console.error(`❌ Full vision error:`, visionError);
          throw new Error(`OpenAI Vision API failed: ${visionError.message}`);
        }

        const aiResponse = visionResponse.choices[0].message.content;
        console.log(`🔍 AI Vision response received for ${imageData.fileName}:`, aiResponse.substring(0, 200) + '...');
        
        // Parse AI response
        let structuredData;
        try {
          let jsonString = aiResponse;
          const codeBlockMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) {
            jsonString = codeBlockMatch[1].trim();
            console.log(`🔍 Extracted JSON from code block for ${imageData.fileName}`);
          }
          structuredData = JSON.parse(jsonString);
          console.log(`✅ JSON parsing successful for ${imageData.fileName}:`, {
            productName: structuredData.productName,
            brand: structuredData.brand,
            confidence: structuredData.confidence
          });
        } catch (parseError) {
          console.log(`⚠️ JSON parsing failed for ${imageData.fileName}, using fallback:`, parseError.message);
          structuredData = {
            productName: aiResponse,
            description: aiResponse,
            estimatedValue: 'AI parsing failed - using market search',
            confidence: 'Medium'
          };
        }

        // Upload image to S3
        let s3Key = null;
        try {
          if (process.env.S3_UPLOAD_ENABLED === 'true' && process.env.S3_BUCKET) {
            const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
            const s3 = new S3Client({ 
              region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1' 
            });
            
            // Convert base64 to buffer
            const base64Data = imageData.image.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Generate safe filename
            const safeName = imageData.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const prefix = process.env.S3_PREFIX_IMAGES || 'images/';
            s3Key = `${prefix}${Date.now()}_${safeName}`;
            
            console.log('☁️ S3 upload begin (image processing):', { 
              bucket: process.env.S3_BUCKET, 
              s3Key, 
              size: imageBuffer.length 
            });
            
            await s3.send(new PutObjectCommand({
              Bucket: process.env.S3_BUCKET,
              Key: s3Key,
              Body: imageBuffer,
              ContentType: 'image/jpeg', // Default to JPEG
              Metadata: {
                'original-filename': imageData.fileName,
                'uploaded-at': new Date().toISOString(),
                'processing-type': 'image-analysis'
              }
            }));
            
            console.log(`☁️ Uploaded to S3 (image processing): s3://${process.env.S3_BUCKET}/${s3Key}`);
          }
        } catch (s3Error) {
          console.error('⚠️ S3 upload failed (image processing):', s3Error.message);
          // Don't break the main flow if S3 upload fails
        }

        // Get pricing using SerpAPI (like CSV processing)
        const { getInsuranceItemPricer } = require('./services/sharedServices');
        const pricer = getInsuranceItemPricer();
        
        if (!pricer) {
          throw new Error('Failed to get shared InsuranceItemPricer instance');
        }
        
        // Create optimized search query using new AI Vision fields
        let searchQuery = structuredData.productName || structuredData.description || aiResponse.substring(0, 200);
        
        // If we have searchKeywords, use them to enhance the search
        if (structuredData.searchKeywords && structuredData.searchKeywords.trim()) {
          searchQuery = `${structuredData.productName} ${structuredData.searchKeywords}`.trim();
        }
        
        // Fallback: if no productName, try to construct from brand + description
        if (!structuredData.productName && structuredData.brand) {
          searchQuery = `${structuredData.brand} ${structuredData.description}`.trim();
        }
        
        console.log(`🔍 Optimized search query for pricing: ${searchQuery}`);
        console.log(`🔍 AI Vision data:`, {
          productName: structuredData.productName,
          brand: structuredData.brand,
          searchKeywords: structuredData.searchKeywords,
          confidence: structuredData.confidence
        });
        
      // REMOVED: Condition-based pricing adjustments - always price for NEW products as requested
      let pricingAdjustment = 1.0; // No adjustments - always price for NEW items
      let conditionNote = ' (priced for NEW replacement item - no condition adjustments)';
        
        const pricingResult = await pricer.findBestPrice(searchQuery);
        
        // REMOVED: Condition-based pricing adjustment - always use original price for NEW items
        let adjustedPrice = pricingResult.price; // No adjustments - use original market price
        console.log(`🔍 No price adjustments applied: using original market price $${pricingResult.price} for NEW replacement item`);
        
        // Debug: Log the pricing result
        console.log(`🔍 Pricing Result Debug:`, {
          price: adjustedPrice,
          originalPrice: pricingResult.price,
          source: pricingResult.source,
          url: pricingResult.url,
          isEstimated: pricingResult.isEstimated,
          category: pricingResult.category,
          subcategory: pricingResult.subcategory,
          conditionAdjustment: 1.0, // No adjustments - always 1.0 for NEW items
          conditionNote: conditionNote
        });
        
        // Ensure isEstimated is always set correctly - check multiple sources
        let isEstimated = false;
        if (pricingResult.isEstimated === true) {
          isEstimated = true;
        } else if (pricingResult.source === 'price-estimate' || pricingResult.source === 'Market Search') {
          isEstimated = true;
        } else if (adjustedPrice === 'Not found' || !adjustedPrice) {
          isEstimated = true;
        }
        
        // Ensure URL is always set correctly
        let url = pricingResult.url;
        if (!url || url === 'N/A' || url === 'Not found') {
          url = null;
        }
        
        // Create result item (similar to CSV processing)
        const resultItem = {
          'Item Description': structuredData.productName || structuredData.description || searchQuery,
          'price': pricingResult.price || 'Not found', // Use original market price - no condition adjustments
          'category': pricingResult.category || 'HSW',
          'subcategory': pricingResult.subcategory || 'General',
          'source': pricingResult.source || 'Market Search',
          'url': url,
          'isEstimated': isEstimated,
          'matchQuality': pricingResult.matchQuality || 'AI Analysis',
          // Cost to Replace field for frontend compatibility - always from AI Vision for NEW items
          'costToReplace': structuredData.estimatedValue || 'AI Vision estimation needed',
          // Price calculation details for transparency - no condition adjustments
          'actualMarketPrice': pricingResult.price || 'Not found',
          'conditionAdjustment': 1.0, // No adjustments - always 1.0 for NEW items
          'adjustedPrice': pricingResult.price || 'Not found', // Use original market price
          'conditionNote': conditionNote,
          // AI Vision data for additional context
          'aiAnalysis': {
            productName: structuredData.productName,
            brand: structuredData.brand,
            model: structuredData.model,
            description: structuredData.description,
            condition: structuredData.condition,
            damage: structuredData.damage,
            estimatedValue: structuredData.estimatedValue,
            confidence: structuredData.confidence
          },
          'fileName': imageData.fileName || 'unnamed',
          // Add S3 and database tracking fields
          's3Key': s3Key, // S3 key where image was uploaded
          'jobId': null, // Will be populated after database job creation
          'jobItemId': null // Will be populated after database item creation
        };
        
        // Debug logging for Status and URL
        console.log(`🔍 Backend Debug - Image ${i + 1}:`, {
          'isEstimated': resultItem['isEstimated'],
          'url': resultItem['url'],
          'pricingResult.isEstimated': pricingResult.isEstimated,
          'pricingResult.url': pricingResult.url,
          'isEstimated (calculated)': isEstimated,
          'Full resultItem': resultItem
        });
        
        imageResults.push(resultItem);
        console.log(`✅ Processed image ${i + 1}: ${resultItem['price']}`); // Fixed console log

      } catch (error) {
        console.error(`❌ Error processing image ${i + 1} (${imageData.fileName}):`, error.message);
        console.error(`❌ Full error details:`, error);
        
        // Create error result item
        const errorItem = {
          'Item Description': `Error processing ${imageData.fileName || 'image'}`,
          'price': 'Error',
          'category': 'Error',
          'subcategory': 'Error',
          'source': 'Error',
          'url': null,
          'isEstimated': false,
          'matchQuality': 'Error',
          'Error Details': error.message,
          'fileName': imageData.fileName || 'unnamed',
          's3Key': null,
          'jobId': null,
          'jobItemId': null
        };
        
        imageResults.push(errorItem);
        console.log(`⚠️ Added error item to results for ${imageData.fileName}`);
      }
    }

    const processingEndTime = Date.now();
    const processingTime = processingEndTime - processingStartTime;

    // Create database job and update results with job IDs
    let jobId = null;
    let jobItems = [];
    
    console.log(`🔍 Database operations - Audit enabled: ${auditEnabled}, Audit system: ${!!auditSystem}`);
    
    try {
      if (auditEnabled && auditSystem) {
        // Create job record
        const { v4: uuidv4 } = require('uuid');
        jobId = uuidv4();
        
        // Create job items for each processed image
        for (let i = 0; i < imageResults.length; i++) {
          const item = imageResults[i];
          const jobItemId = uuidv4();
          
          // Update result item with job IDs
          item.jobId = jobId;
          item.jobItemId = jobItemId;
          
          // Prepare job item data for database
          jobItems.push({
            id: jobItemId,
            jobId: jobId,
            rowIndex: i + 1,
            imageRef: item.s3Key || null,
            inputDesc: item['Item Description'] || '',
            status: item['Search Status'] === 'Error' ? 'ERROR' : 'DONE',
            errorMessage: item['Search Status'] === 'Error' ? item['Error Details'] || 'Unknown error' : null
          });
          
          // Create search event record
          const searchEventId = uuidv4();
          const searchEvent = {
            id: searchEventId,
            jobItemId: jobItemId,
            engine: 'serpapi',
            queryText: item['Search Query Used'] || '',
            startedAt: new Date(),
            completedAt: new Date(),
            success: item['Search Status'] !== 'Error' ? 1 : 0,
            errorMessage: item['Search Status'] === 'Error' ? item['Error Details'] || 'Unknown error' : null,
            resultsJson: JSON.stringify({
              price: item['Price'],
              source: item['Source'],
              url: item['URL'],
              category: item['Cat'],
              subcategory: item['Sub Cat']
            })
          };
          
          // Create final choice record
          const finalChoiceId = uuidv4();
          const finalChoice = {
            id: finalChoiceId,
            jobItemId: jobItemId,
            sourceDomain: item['Source'] ? new URL(item['URL'] || 'https://example.com').hostname : null,
            productTitle: item['Item Description'] || '',
            priceCents: item['Price'] && item['Price'] !== 'Not found' ? 
              Math.round(parseFloat(item['Price'].replace(/[^0-9.]/g, '')) * 100) : null,
            currency: 'USD',
            url: item['URL'] || null,
            validated: 1,
            isTrustedDomain: item['Source'] && ['Walmart', 'Amazon', 'Target', 'Home Depot'].includes(item['Source']) ? 1 : 0,
            reason: `AI Vision analysis with ${item['Match Quality'] || 'AI Analysis'}`
          };
          
          // Store these for later database insertion
          item.searchEvent = searchEvent;
          item.finalChoice = finalChoice;
        }
        
        console.log('✅ Database job structure created:', { jobId, jobItemsCount: jobItems.length });
      }
    } catch (dbError) {
      console.error('⚠️ Database job creation failed:', dbError.message);
      // Don't break the main flow if database operations fail
    }

    // Calculate pagination
    const totalItems = imageResults.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = imageResults.slice(startIndex, endIndex);

    // Create statistics
    const statistics = {
      totalItems: totalItems,
      processedItems: imageResults.length,
      successfulItems: imageResults.filter(item => item['Price'] !== 'Error' && item['Price'] !== 'Not found').length,
      failedItems: imageResults.filter(item => item['Price'] === 'Error' || item['Price'] === 'Not found').length,
      processingTime: processingTime,
      averageTimePerItem: totalItems > 0 ? processingTime / totalItems : 0
    };

    // Create pagination info
    const pagination = {
      currentPage: page,
      totalPages: totalPages,
      pageSize: pageSize,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, totalItems)
    };

    // Debug: Log the final response structure
    console.log('🔍 FINAL RESPONSE DEBUG:');
    console.log('📊 Items being sent:', paginatedResults.map(item => ({
      'Item Description': item['Item Description'],
      'Price': item['Price'],
      'Search Status': item['Search Status'],
      'URL': item['URL'],
      'Source': item['Source']
    })));
    
    // Additional debug: Log the exact structure of the first item
    if (paginatedResults.length > 0) {
      console.log('🔍 FIRST ITEM STRUCTURE:', JSON.stringify(paginatedResults[0], null, 2));
      console.log('🔍 FIRST ITEM KEYS:', Object.keys(paginatedResults[0]));
    }
    
        // Audit the image processing job and insert into database
        if (auditEnabled && auditSystem && jobId) {
          try {
            const user = { id: 'image-user', email: 'image@example.com' }; // Default user for image processing
            
            // Insert job record using the audit system's database connection
            if (auditSystem && auditSystem.dbConnection) {
              await auditSystem.dbConnection.execute(
                'INSERT INTO jobs (id, user_id, job_type, status, input_text, started_at, completed_at, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  jobId,
                  user.id,
                  'IMAGE',
                  statistics.failedItems > 0 ? 'PARTIAL_SUCCESS' : 'SUCCESS',
                  `Image batch processing - ${images.length} images`,
                  new Date(processingStartTime),
                  new Date(processingEndTime),
                  statistics.failedItems > 0 ? `${statistics.failedItems} items failed` : null
                ]
              );
              
              // FIXED: Insert files records for each uploaded image and link to job
              const { v4: uuidv4 } = require('uuid');
              let fileId = null;
              for (let i = 0; i < imageResults.length; i++) {
                const item = imageResults[i];
                if (item.s3Key) {
                  fileId = uuidv4();
                  await auditSystem.dbConnection.execute(
                    'INSERT INTO files (id, user_id, bucket, s3_key, original_name, mime_type, size_bytes, file_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                      fileId,
                      user.id,
                      process.env.S3_BUCKET || 'default-bucket',
                      item.s3Key,
                      item.fileName || 'unnamed',
                      'image/webp', // Default mime type for images
                      0, // We don't have the exact size here, but it's not critical
                      'image'
                    ]
                  );
                  console.log(`✅ Inserted file record for ${item.fileName}: ${fileId}`);
                  break; // For batch processing, we typically have one file record per job
                }
              }
              
              // Update the job record to link to the file
              if (fileId) {
                await auditSystem.dbConnection.execute(
                  'UPDATE jobs SET file_id = ? WHERE id = ?',
                  [fileId, jobId]
                );
                console.log(`✅ Linked job ${jobId} to file ${fileId}`);
              }
          
          // Insert job items
          for (const jobItem of jobItems) {
            await auditSystem.dbConnection.execute(
              'INSERT INTO job_items (id, job_id, row_index, image_ref, input_desc, status, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [
                jobItem.id,
                jobItem.jobId,
                jobItem.rowIndex,
                jobItem.imageRef,
                jobItem.inputDesc,
                jobItem.status,
                jobItem.errorMessage
              ]
            );
          }
          
          // Insert search events and final choices
          for (const item of imageResults) {
            if (item.searchEvent) {
              await auditSystem.dbConnection.execute(
                'INSERT INTO search_events (id, job_item_id, engine, query_text, started_at, completed_at, success, error_message, results_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  item.searchEvent.id,
                  item.searchEvent.jobItemId,
                  item.searchEvent.engine,
                  item.searchEvent.queryText,
                  item.searchEvent.startedAt,
                  item.searchEvent.completedAt,
                  item.searchEvent.success,
                  item.searchEvent.errorMessage,
                  item.searchEvent.resultsJson
                ]
              );
            }
            if (item.finalChoice) {
              await auditSystem.dbConnection.execute(
                'INSERT INTO final_choices (id, job_item_id, source_domain, product_title, price_cents, currency, url, validated, is_trusted_domain, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  item.finalChoice.id,
                  item.finalChoice.jobItemId,
                  item.finalChoice.sourceDomain,
                  item.finalChoice.productTitle,
                  item.finalChoice.priceCents,
                  item.finalChoice.currency,
                  item.finalChoice.url,
                  item.finalChoice.validated,
                  item.finalChoice.isTrustedDomain,
                  item.finalChoice.reason
                ]
              );
            }
          }
        } else {
          console.log('⚠️ Audit system database not available, skipping database insertion');
          console.log('🔍 Audit system state:', {
            hasAuditSystem: !!auditSystem,
            hasDbConnection: !!(auditSystem && auditSystem.dbConnection)
          });
        }
        
        console.log('✅ Image processing job inserted into database successfully');
        
        // Also call the legacy audit method if available
        if (typeof initializeAuditSystem === 'function') {
          try {
            const fileMeta = {
              name: 'image-batch',
              size: images.length,
              type: 'image/batch'
            };
            const jobMeta = {
              type: 'IMAGE',
              itemCount: images.length,
              successfulItems: statistics.successfulItems,
              failedItems: statistics.failedItems,
              processingTime: processingTime
            };
            const items = imageResults.map(item => ({
              description: item['Item Description'] || '',
              targetPrice: null, // Images don't have target prices
              result: item['Price'] || 'N/A',
              status: item['Search Status'] || 'Unknown'
            }));
            
            // Get the audit system instance
            const auditSystem = require('./src/audit');
            if (auditSystem.Audit) {
              await auditSystem.Audit.persistImageJob(user, { fileMeta, jobMeta, items });
              console.log('✅ Image processing job audited successfully (legacy method)');
            }
          } catch (legacyAuditError) {
            console.error('⚠️ Legacy audit logging failed:', legacyAuditError.message);
          }
        }
      } catch (dbError) {
        console.error('⚠️ Database insertion failed:', dbError.message);
        // Don't break the main response if database fails
      }
    }
    
    // Final response structure
    const finalResponse = {
      success: true,
      items: paginatedResults,
      statistics: statistics,
      pagination: pagination,
      processingTime: processingTime,
      environment: process.env.NODE_ENV || 'development',
      deploymentVersion: process.env.DEPLOYMENT_VERSION || 'V2-ENHANCED-2025-08-07'
    };
    
    console.log('🚀 SENDING RESPONSE TO FRONTEND:', {
      success: finalResponse.success,
      itemsCount: finalResponse.items.length,
      firstItemKeys: finalResponse.items.length > 0 ? Object.keys(finalResponse.items[0]) : [],
      responseKeys: Object.keys(finalResponse)
    });
    
    res.json(finalResponse);

  } catch (error) {
    console.error('❌ Image processing error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Image processing failed',
      details: error.message
    });
  }
});
*/ // END OF DISABLED IMAGE PROCESSING ROUTE

// ========================================
// RESEARCH ANALYTICS ENDPOINTS
// ========================================
console.log('🔍 Adding research analytics endpoints...');

// Start a new research session
app.post('/api/research/session/start', (req, res) => {
  try {
    const { sessionId, userId } = req.body;
    const session = pricer.startResearchSession(sessionId || `session_${Date.now()}`, userId || 'anonymous');
    
    res.json({
      success: true,
      session: session,
      message: 'Research session started successfully'
    });
  } catch (error) {
    console.error('❌ Error starting research session:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to start research session',
      details: error.message
    });
  }
});

// End current research session
app.post('/api/research/session/end', (req, res) => {
  try {
    const session = pricer.endResearchSession();
    
    if (session) {
      res.json({
        success: true,
        session: session,
        message: 'Research session ended successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'No active research session to end'
      });
    }
  } catch (error) {
    console.error('❌ Error ending research session:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to end research session',
      details: error.message
    });
  }
});

// Get research analytics
app.get('/api/research/analytics', (req, res) => {
  try {
    const analytics = pricer.getResearchAnalytics();
    
    res.json({
      success: true,
      analytics: analytics
    });
  } catch (error) {
    console.error('❌ Error getting research analytics:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get research analytics',
      details: error.message
    });
  }
});

// Get research history with filters
app.get('/api/research/history', (req, res) => {
  try {
    const { limit = 100, status, success, query } = req.query;
    const filters = { status, success: success === 'true', query };
    
    const history = pricer.getResearchHistory(parseInt(limit), filters);
    
    res.json({
      success: true,
      history: history,
      totalCount: history.length,
      filters: filters
    });
  } catch (error) {
    console.error('❌ Error getting research history:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get research history',
      details: error.message
    });
  }
});

// Get session analytics
app.get('/api/research/sessions', (req, res) => {
  try {
    const analytics = pricer.getSessionAnalytics();
    
    res.json({
      success: true,
      analytics: analytics
    });
  } catch (error) {
    console.error('❌ Error getting session analytics:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get session analytics',
      details: error.message
    });
  }
});

// Get performance insights and recommendations
app.get('/api/research/insights', (req, res) => {
  try {
    const insights = pricer.getPerformanceInsights();
    
    res.json({
      success: true,
      insights: insights
    });
  } catch (error) {
    console.error('❌ Error getting performance insights:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance insights',
      details: error.message
    });
  }
});

// Export research data (for database migration later)
app.get('/api/research/export', (req, res) => {
  try {
    const data = pricer.exportResearchData();
    
    res.json({
      success: true,
      data: data,
      message: 'Research data exported successfully'
    });
  } catch (error) {
    console.error('❌ Error exporting research data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to export research data',
      details: error.message
    });
  }
});

// Clear research data (for testing/reset)
app.post('/api/research/clear', (req, res) => {
  try {
    pricer.clearResearchData();
    
    res.json({
      success: true,
      message: 'Research data cleared successfully'
    });
  } catch (error) {
    console.error('❌ Error clearing research data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to clear research data',
      details: error.message
    });
  }
});

console.log('✅ Research analytics endpoints added');
console.log('🎯 Available research endpoints:');
console.log('   - POST /api/research/session/start');
console.log('   - POST /api/research/session/end');
console.log('   - GET /api/research/analytics');
console.log('   - GET /api/research/history');
console.log('   - GET /api/research/sessions');
console.log('   - GET /api/research/insights');
console.log('   - GET /api/research/export');
console.log('   - POST /api/research/clear');

// ========================================
// MOUNT PROCESSING ROUTES
// ========================================
console.log(`📡 Mounting processing routes... (${isLambda ? 'Lambda' : 'Local'})`);

// Mount image processing routes (Always Show Price Pipeline)
try {
  console.log('🔍 Attempting to require ./routes/imageProcessingRoutes...');
  const imageProcessingRoutes = require('./routes/imageProcessingRoutes');
  console.log('✅ imageProcessingRoutes module loaded successfully');

  app.use('/', imageProcessingRoutes);
  console.log(`✅ Image processing routes mounted at / (${isLambda ? 'Lambda' : 'Local'})`);
  console.log('🎯 Available routes: POST /api/process-image');
} catch (imageError) {
  console.error('❌ Failed to load image processing routes:', imageError.message);
  console.log('⚠️ Continuing without image processing routes...');
}

// Mount CSV processing routes
// Environment check before loading routes:
console.log('🔍 Environment check before loading routes:');
console.log('  - OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Found' : '❌ Missing');
console.log('  - GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '✅ Found' : '❌ Missing');
console.log('  - GOOGLE_SEARCH_ENGINE_ID:', process.env.GOOGLE_SEARCH_ENGINE_ID ? '✅ Found' : '❌ Missing');
console.log('  - SERPAPI_KEY:', process.env.SERPAPI_KEY ? '✅ Found' : '❌ Missing');

// TEMPORARILY DISABLED: Force enhanced processing to be used
console.log('🚫 TEMPORARILY DISABLED: csvProcessingRoutes to force enhanced processing');
// const csvProcessingRoutes = require('./routes/csvProcessingRoutes');
// console.log('✅ csvProcessingRoutes module loaded successfully');

// app.use('/', csvProcessingRoutes);
console.log(`🚫 CSV processing routes DISABLED - forcing enhanced processing (${isLambda ? 'Lambda' : 'Local'})`);
console.log('🎯 DISABLED routes: POST /api/process-item, POST /api/process-csv');

  // TEMPORARILY DISABLED: Mount optimized CSV processing routes to force enhanced processing
  console.log('🚫 TEMPORARILY DISABLED: optimizedCsvProcessing to force enhanced processing');
  // try {
  //   const optimizedCsvProcessingRoutes = require('./routes/optimizedCsvProcessing');
  //   app.use('/', optimizedCsvProcessingRoutes);
  //   console.log('✅ Optimized CSV processing routes mounted');
  //   console.log('🎯 Additional routes: POST /api/process-csv-optimized');
  // } catch (optimizedError) {
  //   console.error('❌ Failed to load optimized CSV processing routes:', optimizedError.message);
  // }
  console.log('🚫 Optimized CSV processing routes DISABLED - forcing enhanced processing');
  console.log('🎯 DISABLED routes: POST /api/process-csv-optimized');

  // Mount enhanced processing routes
  console.log('🚀 Mounting enhanced processing routes...');
  try {
    const enhancedProcessingRoutes = require('./routes/enhancedProcessingRoutes');
    app.use('/api/enhanced', enhancedProcessingRoutes.router);
    console.log('✅ Enhanced processing routes mounted');
    console.log('🎯 Enhanced routes: POST /api/enhanced/process-enhanced, POST /api/enhanced/select-sheet, POST /api/enhanced/download-excel, POST /api/enhanced/download-csv');
  } catch (enhancedError) {
    console.error('❌ Failed to load enhanced processing routes:', enhancedError.message);
  }

  // Mount depreciation routes
  console.log('🚀 Mounting depreciation routes...');
  try {
    const depRoutes = require('./routes/dep');
    app.use('/api/dep', depRoutes);
    console.log('✅ Depreciation routes mounted');
    console.log('🎯 Dep routes: POST /api/dep/apply, POST /api/dep/reload');
  } catch (depErr) {
    console.error('❌ Failed to load dep routes:', depErr.message);
  }

  // Mount URL resolution routes
  console.log('🚀 Mounting URL resolution routes...');
  try {
    const urlResolutionRoutes = require('./routes/urlResolutionRoutes');
    app.use('/', urlResolutionRoutes);
    console.log('✅ URL resolution routes mounted');
    console.log('🎯 Resolution routes: POST /api/resolve-estimated-items, GET /api/resolution-stats');
  } catch (resolutionErr) {
    console.error('❌ Failed to load URL resolution routes:', resolutionErr.message);
  }

// Continue with enhanced processing routes

  // Do NOT return a fake $35 price. Expose a clear 503 to prevent bad data.
  app.post('/api/process-item', async (req, res) => {
    console.log('🧪 TEMPORARY HOLDING ROUTE: /api/process-item called while CSV routes failed to load');

    const { description } = req.body || {};

    return res.status(503).json({
      success: false,
      error: 'Pricing service temporarily unavailable',
      details: 'CSV routes failed to load. Ensure SERPAPI_KEY is set and routes are present.',
      request: { description },
      environment: isLambda ? 'AWS Lambda' : 'Local Development',
      deploymentVersion: DEPLOYMENT_VERSION
    });
  });

  console.log('🧪 Added holding route for /api/process-item that returns 503 (no fake pricing)');

// ========================================
// ENHANCED API ROUTES
// ========================================

// Enhanced health check
app.get('/health', (req, res) => {
  const healthData = { 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: {
      mode: isLambda ? 'AWS Lambda' : 'Local Development',
      nodeEnv: process.env.NODE_ENV || 'development',
      serpapi: !!process.env.SERPAPI_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      google: !!process.env.GOOGLE_API_KEY,
      googleCSE: !!process.env.GOOGLE_SEARCH_ENGINE_ID,
      audit: auditEnabled
    },
    services: {
      aiVision: !!openai,
      visionModel: gpt5Config.getVisionModel(),
      csvProcessing: !!process.env.SERPAPI_KEY,
      serpapiIntegration: !!process.env.SERPAPI_KEY,
      audit: auditEnabled
    },
    version: 'V2-ENHANCED',
    company: 'KVS Technologies',
    deploymentVersion: DEPLOYMENT_VERSION,
    uptime: process.uptime()
  };

  // Add additional health metrics in development and local mode
  if (!isProduction && isLocal) {
    healthData.system = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid
    };
  }

  res.json(healthData);
});

// Redis health check endpoint
app.get('/health/redis', async (req, res) => {
  try {
    const InsuranceItemPricer = require('./models/InsuranceItemPricer');
    const pricer = new InsuranceItemPricer();
    
    // Test Redis connection
    const redisClient = await pricer.initRedis();
    
    if (redisClient && pricer.redisConnected) {
      // Test Redis ping
      await redisClient.ping();
      res.status(200).json({
        status: 'healthy',
        redis: 'connected',
        timestamp: new Date().toISOString(),
        message: 'Redis is working properly',
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
    } else {
      res.status(200).json({
        status: 'degraded',
        redis: 'disconnected',
        timestamp: new Date().toISOString(),
        message: 'Redis not available - using memory cache fallback',
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      redis: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Redis health check failed',
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
  }
});

// Redis restart endpoint
app.post('/api/redis/restart', async (req, res) => {
  try {
    console.log('🔄 Redis restart request received');
    
    const InsuranceItemPricer = require('./models/InsuranceItemPricer');
    const pricer = new InsuranceItemPricer();
    
    // Close existing Redis connection if it exists
    if (pricer.redisClient) {
      try {
        await pricer.redisClient.quit();
        console.log('✅ Existing Redis connection closed');
      } catch (closeError) {
        console.log('⚠️ Error closing existing Redis connection:', closeError.message);
      }
      pricer.redisClient = null;
      pricer.redisConnected = false;
    }
    
    // Reinitialize Redis connection
    const redisClient = await pricer.initRedis();
    
    if (redisClient && pricer.redisConnected) {
      // Test the new connection
      await redisClient.ping();
      res.json({
        success: true,
        status: 'restarted',
        redis: 'connected',
        timestamp: new Date().toISOString(),
        message: 'Redis client restarted successfully',
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
    } else {
      res.json({
        success: false,
        status: 'failed',
        redis: 'disconnected',
        timestamp: new Date().toISOString(),
        message: 'Redis restart failed - using memory cache fallback',
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
    }
  } catch (error) {
    console.error('❌ Redis restart error:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      redis: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Redis restart failed',
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
  }
});

// Enhanced API test
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'V2 Enhanced API is working!', 
        data: { 
            test: true,
            features: {
                aiVision: !!openai,
                csvProcessing: !!process.env.SERPAPI_KEY,
                enhancedPricing: true
            }
        },
        deploymentVersion: DEPLOYMENT_VERSION
    });
});

// ========================================
// ERROR HANDLING
// ========================================
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: err.message,
        deploymentVersion: DEPLOYMENT_VERSION
    });
});

// ========================================
// AUDIT SYSTEM INITIALIZATION AND SERVER STARTUP
// ========================================
console.log('🔍 Initializing audit system...');
initializeAuditSystem().then(() => {
  console.log(`🔍 Audit system status: ${auditEnabled ? '✅ Enabled' : '❌ Disabled'}`);
  
  // ========================================
  // SERVER STARTUP
  // ========================================
  app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 V2 Enhanced - AI Insurance Pricing System running on port ${PORT}`);
      console.log(`📱 Access your app at: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 API test: http://localhost:${PORT}/api/test`);
      console.log(`🤖 AI Vision status: http://localhost:${PORT}/api/ai-vision-status`);
      console.log(`📊 CSV Processing: ${process.env.SERPAPI_KEY ? '✅ Enabled' : '❌ Disabled (SERPAPI_KEY missing)'}`);
      console.log(`🔍 AI Vision: ${openai ? '✅ Enabled' : '❌ Disabled (OpenAI API key missing)'}`);
      console.log(`🔍 Audit System: ${auditEnabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`🎯 Deployment Version: ${DEPLOYMENT_VERSION}`);
  });
}).catch(error => {
  console.error('❌ Failed to initialize audit system:', error);
  
  // Start server anyway
  app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 V2 Enhanced - AI Insurance Pricing System running on port ${PORT}`);
      console.log(`📱 Access your app at: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 API test: http://localhost:${PORT}/api/test`);
      console.log(`🤖 AI Vision status: http://localhost:${PORT}/api/ai-vision-status`);
      console.log(`📊 CSV Processing: ${process.env.SERPAPI_KEY ? '✅ Enabled' : '❌ Disabled (SERPAPI_KEY missing)'}`);
      console.log(`🔍 AI Vision: ${openai ? '✅ Enabled' : '❌ Disabled (OpenAI API key missing)'}`);
      console.log(`🔍 Audit System: ❌ Failed to initialize`);
      console.log(`🎯 Deployment Version: ${DEPLOYMENT_VERSION}`);
  });
});
