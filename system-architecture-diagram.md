# 🏗️ Insurance Pricing System Architecture Diagram

## User Interaction Flow with App Runner Backend

```mermaid
graph TB
    %% User Interface Layer
    subgraph "Frontend (Client)"
        UI[User Interface<br/>HTML/CSS/JavaScript]
        API_SERVICE[ApiService<br/>HTTP Client]
        ENHANCED_PROC[Enhanced Processing<br/>Component]
    end

    %% AWS App Runner Backend
    subgraph "AWS App Runner Backend"
        subgraph "Express.js Server"
            ROUTES[API Routes<br/>enhancedProcessingRoutes.js]
            MIDDLEWARE[Middleware<br/>CORS, Auth, Upload]
            SERVER[index.js<br/>Main Server]
        end
        
        subgraph "Processing Pipeline"
            FILE_PARSER[File Parser<br/>Excel/CSV Processing]
            AI_CATEGORIZER[AI Categorization<br/>OpenAI GPT-5]
            PRICER[Insurance Item Pricer<br/>Product Search Engine]
        end
        
        subgraph "External API Integration"
            SERPAPI[SerpAPI<br/>Google Shopping Search]
            OPENAI[OpenAI API<br/>GPT-5 Vision & Text]
            GOOGLE_CSE[Google Custom Search<br/>Trusted Sites]
        end
        
        subgraph "Data Layer"
            MYSQL[(MySQL Database<br/>Aurora Cluster)]
            S3[(AWS S3<br/>File Storage)]
            CACHE[In-Memory Cache<br/>AI Results & SerpAPI]
        end
        
        subgraph "Audit System"
            AUDIT[Audit Service<br/>Logging & Persistence]
            AUDIT_DB[(Audit Database<br/>Jobs, Files, Events)]
        end
    end

    %% User Flow
    UI -->|1. Upload Excel File| API_SERVICE
    API_SERVICE -->|2. POST /api/enhanced/process-enhanced| ROUTES
    
    %% Backend Processing Flow
    ROUTES -->|3. Parse File| FILE_PARSER
    FILE_PARSER -->|4. Extract Items| AI_CATEGORIZER
    
    %% AI Processing
    AI_CATEGORIZER -->|5. Categorize Products| OPENAI
    OPENAI -->|6. Return Categories| AI_CATEGORIZER
    
    %% Pricing Pipeline
    AI_CATEGORIZER -->|7. Process Each Item| PRICER
    PRICER -->|8. Search Products| SERPAPI
    PRICER -->|9. Search Trusted Sites| GOOGLE_CSE
    
    %% Data Storage
    SERPAPI -->|10. Cache Results| CACHE
    GOOGLE_CSE -->|11. Cache Results| CACHE
    
    %% Database Operations
    PRICER -->|12. Store Depreciation Data| MYSQL
    ROUTES -->|13. Upload File| S3
    ROUTES -->|14. Log Job| AUDIT
    AUDIT -->|15. Persist Data| AUDIT_DB
    
    %% Response Flow
    PRICER -->|16. Return Results| ROUTES
    ROUTES -->|17. JSON Response| API_SERVICE
    API_SERVICE -->|18. Display Results| ENHANCED_PROC
    ENHANCED_PROC -->|19. Show Table| UI

    %% Styling
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef external fill:#fff3e0
    classDef data fill:#e8f5e8
    classDef audit fill:#fce4ec

    class UI,API_SERVICE,ENHANCED_PROC frontend
    class ROUTES,MIDDLEWARE,SERVER,FILE_PARSER,AI_CATEGORIZER,PRICER backend
    class SERPAPI,OPENAI,GOOGLE_CSE external
    class MYSQL,S3,CACHE data
    class AUDIT,AUDIT_DB audit
```

## Detailed Processing Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Frontend UI
    participant API as ApiService
    participant SERVER as Express Server
    participant PARSER as File Parser
    participant AI as AI Categorizer
    participant PRICER as Item Pricer
    participant SERP as SerpAPI
    participant OPENAI as OpenAI API
    participant DB as MySQL Database
    participant S3 as AWS S3
    participant AUDIT as Audit System

    U->>UI: 1. Upload Excel File
    UI->>API: 2. POST /api/enhanced/process-enhanced
    API->>SERVER: 3. File Upload Request
    
    SERVER->>PARSER: 4. Parse Excel/CSV
    PARSER->>PARSER: 5. Extract Items Array
    PARSER-->>SERVER: 6. Return Parsed Items
    
    SERVER->>AI: 7. Categorize Each Item
    AI->>OPENAI: 8. GPT-5 Categorization Request
    OPENAI-->>AI: 9. Return Category & Depreciation %
    AI->>DB: 10. Cache Categories
    AI-->>SERVER: 11. Return Categorized Items
    
    loop For Each Item
        SERVER->>PRICER: 12. Process Item Pricing
        PRICER->>SERP: 13. Search Google Shopping
        SERP-->>PRICER: 14. Return Search Results
        PRICER->>PRICER: 15. Validate URLs & Extract Prices
        PRICER->>PRICER: 16. Apply Price Tolerance
        PRICER-->>SERVER: 17. Return Pricing Result
    end
    
    SERVER->>S3: 18. Upload Original File
    SERVER->>AUDIT: 19. Log Processing Job
    AUDIT->>DB: 20. Store Job Metadata
    AUDIT->>S3: 21. Store Audit Data
    
    SERVER-->>API: 22. Return Processing Results
    API-->>UI: 23. Display Results Table
    UI-->>U: 24. Show Pricing Results
```

## Key Components Breakdown

### 🎯 **Frontend Layer**
- **User Interface**: HTML/CSS/JavaScript for file upload and results display
- **ApiService**: Handles HTTP communication with backend
- **Enhanced Processing**: Manages file processing workflow and results display

### 🚀 **Backend Layer (AWS App Runner)**
- **Express.js Server**: Main application server with route handling
- **Enhanced Processing Routes**: Main API endpoint for file processing
- **File Parser**: Handles Excel/CSV file parsing and data extraction
- **AI Categorizer**: Uses OpenAI GPT-5 for product categorization
- **Insurance Item Pricer**: Core pricing engine with multiple search strategies

### 🔌 **External API Integration**
- **SerpAPI**: Google Shopping search for product prices
- **OpenAI API**: GPT-5 for AI categorization and vision processing
- **Google Custom Search**: Trusted retailer site searches

### 💾 **Data Storage**
- **MySQL Database**: Stores depreciation categories and audit data
- **AWS S3**: File storage for uploaded files and audit logs
- **In-Memory Cache**: Caches AI results and SerpAPI responses for performance

### 📊 **Audit System**
- **Audit Service**: Comprehensive logging and persistence
- **Audit Database**: Stores job metadata, file information, and processing events

## Processing Steps Detail

1. **File Upload**: User uploads Excel/CSV file through frontend
2. **File Parsing**: Server extracts items from uploaded file
3. **AI Categorization**: Each item is categorized using OpenAI GPT-5
4. **Price Search**: Multiple search strategies find product prices:
   - Direct retailer searches via SerpAPI
   - Trusted site searches via Google CSE
   - Fallback to market search if needed
5. **Price Validation**: URLs and prices are validated and filtered
6. **Data Storage**: Results stored in database and S3
7. **Audit Logging**: Complete processing trail logged for analysis
8. **Response**: Results returned to frontend for display

## Performance Optimizations

- **Caching**: AI categorization and SerpAPI results cached
- **Batch Processing**: Items processed in optimized batches
- **Parallel Execution**: Multiple API calls run concurrently
- **Connection Pooling**: Database connections pooled for efficiency
- **Timeout Management**: Proper timeout handling for external APIs
