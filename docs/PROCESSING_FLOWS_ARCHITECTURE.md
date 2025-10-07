# Price is Right V2 - Processing Flows Architecture

## Overview

The Price is Right V2 application implements three distinct processing flows for insurance item pricing:

1. **Single Search Flow** - Individual item pricing requests
2. **Image Processing Flow** - AI-powered image analysis with pricing
3. **CSV Processing Flow** - Batch processing of multiple items

## Architecture Components

### Frontend Layer
- **client/src/app.js** - Main application controller
- **client/src/services/ApiService.js** - API communication layer
- **client/src/components/** - UI components for different processing types

### Backend Layer
- **server/index.js** - Main server entry point and route orchestration
- **server/routes/api.js** - Single search API endpoints
- **server/routes/imageProcessingRoutes.js** - Image processing endpoints
- **server/routes/csvProcessingRoutes.js** - CSV batch processing endpoints
- **server/models/InsuranceItemPricer.js** - Core pricing engine
- **server/utils/** - Supporting utilities and services

---

## 1. Single Search Flow

### File Flow Chain:
```
Frontend (app.js) → ApiService.js → server/index.js → routes/api.js → InsuranceItemPricer.js → SerpAPI
```

### Detailed Process:

#### Step 1: Frontend Initiation
**File: `client/src/app.js`**
```javascript
// User submits single item search
handleSendMessage() {
    // Processes user input
    // Calls ApiService for backend communication
}
```

#### Step 2: API Service Layer
**File: `client/src/services/ApiService.js`**
```javascript
async processItem(itemData) {
    // Constructs API request
    // Handles retry logic and timeouts
    // Returns to frontend for display
}
```

#### Step 3: Server Route Handling
**File: `server/index.js`**
- Mounts `/api` routes from `routes/api.js`
- Initializes OpenAI client and audit system
- Provides middleware for request processing

**File: `server/routes/api.js`**
```javascript
// Handles POST /api/process-item
// Validates input data
// Calls InsuranceItemPricer for pricing
```

#### Step 4: Core Pricing Engine
**File: `server/models/InsuranceItemPricer.js`**
```javascript
async findBestPrice(item) {
    // 1. Checks cache for existing results
    // 2. Calls SerpAPI for product search
    // 3. Applies marketplace blocking (eBay, Alibaba, etc.)
    // 4. Implements fallback mechanisms
    // 5. Returns structured pricing data
}
```

#### Step 5: External API Integration
- **SerpAPI** - Primary product search
- **Fallback mechanisms** - Alternative search strategies
- **Caching system** - Performance optimization

---

## 2. Image Processing Flow

### File Flow Chain:
```
Frontend (app.js) → ApiService.js → server/index.js → imageProcessingRoutes.js → OpenAI Vision → InsuranceItemPricer.js
```

### Detailed Process:

#### Step 1: Frontend Image Upload
**File: `client/src/app.js`**
```javascript
// Handles drag-and-drop or file selection
// Converts image to base64 or FormData
// Calls ApiService.analyzeImage()
```

#### Step 2: API Service Layer
**File: `client/src/services/ApiService.js`**
```javascript
async analyzeImage(imageData) {
    // Constructs FormData with image
    // Sends to /api/analyze-image endpoint
    // Handles response processing
}
```

#### Step 3: Server Image Processing
**File: `server/index.js`**
- Contains enhanced image processing endpoint
- Integrates OpenAI Vision API
- Handles image analysis and pricing pipeline

**File: `server/routes/imageProcessingRoutes.js`**
```javascript
// POST /api/analyze-image
async function processImageWithPricing() {
    // 1. Receives image data
    // 2. Calls OpenAI Vision API for product identification
    // 3. Extracts product details (brand, model, condition)
    // 4. Calls searchForNewProductPrices()
    // 5. Returns combined analysis and pricing
}
```

#### Step 4: AI Vision Analysis
**OpenAI GPT-4 Vision Integration:**
- Analyzes uploaded images
- Identifies product details
- Extracts brand, model, condition information
- Provides structured product data

#### Step 5: Pricing Integration
**File: `server/models/InsuranceItemPricer.js`**
```javascript
// Called from image processing routes
// Uses AI-extracted product details
// Applies NEW product pricing (no condition adjustments)
// Implements trusted source validation
```

---

## 3. CSV Processing Flow

### File Flow Chain:
```
Frontend (app.js) → ApiService.js → server/index.js → csvProcessingRoutes.js → "Always Show Price Pipeline"
```

### Detailed Process:

#### Step 1: Frontend CSV Upload
**File: `client/src/app.js`**
```javascript
// Handles CSV/Excel file uploads
// Processes file data
// Calls ApiService.processCSV()
// Displays batch results in table format
```

#### Step 2: API Service Layer
**File: `client/src/services/ApiService.js`**
```javascript
async processCSV(csvData) {
    // Constructs FormData with CSV file
    // Sends to /api/process-csv endpoint
    // Handles batch processing response
}
```

#### Step 3: CSV Processing Routes
**File: `server/routes/csvProcessingRoutes.js`**

This file implements the **"Always Show Price Pipeline"** - a sophisticated system that ensures pricing results are always returned:

```javascript
async function alwaysShowPricePipeline(item) {
    // 1. AI Description Enhancement
    const enhancedDescription = await enhanceDescriptionWithAI(item.description);
    
    // 2. Primary Search with Enhanced Description
    let result = await insuranceItemPricer.findBestPrice({
        ...item,
        description: enhancedDescription
    });
    
    // 3. Marketplace Source Blocking
    result = blockMarketplaceSources(result);
    
    // 4. Dynamic Alternative Search (if needed)
    if (!result.price) {
        result = await findDynamicAlternatives(item);
    }
    
    // 5. Backstop Mechanisms
    if (!result.price) {
        result = await applyBackstopPricing(item);
    }
    
    return result;
}
```

#### Key Features:

1. **AI Description Enhancement:**
   - Uses OpenAI to improve product descriptions
   - Adds relevant keywords for better search results
   - Standardizes product terminology

2. **Marketplace Source Blocking:**
   - Filters out unreliable sources (eBay, Alibaba, etc.)
   - Prioritizes trusted retail sources
   - Ensures pricing accuracy

3. **Dynamic Alternative Search:**
   - Implements fallback search strategies
   - Uses alternative keywords and descriptions
   - Applies fuzzy matching for similar products

4. **Intelligent Field Mapping:**
   - Automatically maps CSV columns to expected fields
   - Handles various CSV formats and structures
   - Validates data integrity

---

## File Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  app.js (Main Controller)                                   │
│    ├── Handles user interactions                            │
│    ├── Manages UI state                                     │
│    └── Calls ApiService methods                             │
│                                                             │
│  ApiService.js (API Communication)                          │
│    ├── processItem() → Single search                        │
│    ├── analyzeImage() → Image processing                    │
│    ├── processCSV() → CSV batch processing                  │
│    └── Handles retry logic and error handling               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  server/index.js (Main Server)                              │
│    ├── Route mounting and middleware                        │
│    ├── OpenAI client initialization                         │
│    ├── Audit system setup                                   │
│    └── Enhanced image processing endpoint                   │
│                                                             │
│  ROUTING LAYER:                                             │
│  ├── routes/api.js (Single Search)                          │
│  │   └── Handles individual item pricing                    │
│  │                                                          │
│  ├── routes/imageProcessingRoutes.js (Image Processing)     │
│  │   ├── OpenAI Vision integration                          │
│  │   ├── Product identification                             │
│  │   └── Trusted source validation                          │
│  │                                                          │
│  └── routes/csvProcessingRoutes.js (CSV Processing)         │
│      ├── "Always Show Price Pipeline"                       │
│      ├── AI description enhancement                         │
│      ├── Marketplace source blocking                        │
│      └── Dynamic alternative search                         │
│                                                             │
│  CORE ENGINE:                                               │
│  models/InsuranceItemPricer.js                              │
│    ├── findBestPrice() - Main pricing method                │
│    ├── findExactProduct() - Exact match search              │
│    ├── searchForAlternatives() - Fallback search            │
│    ├── Caching with fuzzy matching                          │
│    └── SerpAPI integration                                  │
│                                                             │
│  UTILITIES:                                                 │
│  ├── utils/serpApiClient.js - SerpAPI wrapper               │
│  ├── utils/visionExtractor.js - Image analysis              │
│  ├── utils/similarity.js - Fuzzy matching                   │
│  └── utils/trusted_sources_new.js - Source validation       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                          │
├─────────────────────────────────────────────────────────────┤
│  ├── SerpAPI (Primary product search)                       │
│  ├── OpenAI GPT-4 Vision (Image analysis)                   │
│  ├── AWS S3 (File storage)                                  │
│  └── Database (Audit logging)                               │
└─────────────────────────────────────────────────────────────┘
```

## Processing Pipeline Comparison

| Feature | Single Search | Image Processing | CSV Processing |
|---------|---------------|------------------|----------------|
| **Input** | Text description | Image file | CSV/Excel file |
| **AI Enhancement** | Basic | Vision analysis | Description enhancement |
| **Pricing Strategy** | Standard pipeline | NEW product pricing | Always Show Price Pipeline |
| **Batch Processing** | No | No | Yes |
| **Marketplace Blocking** | Yes | Yes | Yes (Enhanced) |
| **Fallback Mechanisms** | Standard | Trusted sources only | Dynamic alternatives |
| **Caching** | Full caching | Limited caching | Batch caching |

## Key Architectural Patterns

1. **Layered Architecture:** Clear separation between frontend, API service, and backend layers
2. **Pipeline Pattern:** Each processing type implements a specific pipeline with multiple stages
3. **Strategy Pattern:** Different pricing strategies for different input types
4. **Decorator Pattern:** AI enhancement wraps around base functionality
5. **Circuit Breaker:** Fallback mechanisms prevent complete failures
6. **Caching Strategy:** Multi-level caching with fuzzy matching for performance

## Performance Optimizations

1. **Intelligent Caching:** Fuzzy matching prevents redundant API calls
2. **Batch Processing:** CSV processing handles multiple items efficiently
3. **Marketplace Blocking:** Filters unreliable sources early in the pipeline
4. **AI Enhancement:** Improves search accuracy, reducing failed searches
5. **Timeout Handling:** Prevents hanging requests with configurable timeouts

This architecture ensures robust, scalable, and accurate insurance item pricing across all three processing modes.
