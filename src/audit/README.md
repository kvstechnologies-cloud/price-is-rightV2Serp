# 🔍 Audit & Persistence System

A non-invasive, feature-flagged audit and persistence system for the Insurance Pricing application. This system provides comprehensive logging of all search operations, file processing, and user activities without modifying existing business logic.

## 🚀 Features

- **Zero Risk**: Non-invasive integration - no changes to existing pricing logic
- **Feature Flagged**: Can be completely disabled via environment variables
- **Non-blocking**: All audit operations happen asynchronously
- **Full Traceability**: Complete audit trail of searches, results, and decisions
- **Dashboard**: Read-only API endpoints for monitoring and analysis
- **S3 Integration**: File storage with deterministic key schemes
- **Database**: Aurora MySQL with Drizzle ORM

## 📋 Prerequisites

### Environment Variables

```bash
# Required for audit system to function
AUDIT_ENABLED=true

# Database configuration
DB_HOST=your-aurora-cluster.region.rds.amazonaws.com
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_database_name

# S3 configuration (optional - system works without S3)
S3_BUCKET=your-audit-bucket
STAGE=dev  # or 'prod', 'staging'
AWS_REGION=us-east-1

# Database pool configuration (App Runner optimized)
DB_POOL_MIN=0
DB_POOL_MAX=3
```

### Database Setup

1. **Create Aurora MySQL Database**
   ```sql
   CREATE DATABASE insurance_audit;
   ```

2. **Run Migration**
   ```bash
   # Connect to your Aurora MySQL instance and run:
   mysql -h your-aurora-cluster.region.rds.amazonaws.com -u your_user -p insurance_audit < src/audit/migrations/001_init.sql
   ```

## 🔧 Installation

### 1. Install Dependencies

The system is already installed with the required packages:
- `drizzle-orm` - Database ORM
- `mysql2` - MySQL driver
- `@aws-sdk/client-s3` - S3 client
- `uuid` - UUID generation

### 2. Initialize Audit System

In your main server file (`server/index.js`), add:

```javascript
import { initializeAuditSystem, logsRouter } from './audit';

// Initialize audit system
initializeAuditSystem().then(initialized => {
  if (initialized) {
    console.log('✅ Audit system initialized');
  } else {
    console.log('🔍 Audit system disabled');
  }
});

// Mount audit routes
app.use('/api/logs', logsRouter);
```

## 📊 Integration Points

### Single Search Auditing

Add one line to your existing search handlers:

```javascript
import { Audit } from './audit';

// After your search completes successfully
Audit.persistSingleSearch(
  { id: 'user-123', email: 'user@example.com' },
  {
    text: 'Bissell Vacuum Cleaner',
    choice: {
      sourceDomain: 'walmart.com',
      productTitle: 'Bissell PowerForce Helix Bagless Upright Vacuum',
      price: 89.99,
      currency: 'USD',
      url: 'https://walmart.com/...',
      validated: true,
      validatedPrice: 89.99,
      validationMethod: 'page-scrape',
      isTrustedDomain: true,
      reason: 'Best price match with validation'
    },
    allResults: [/* array of all search results */]
  }
);
```

### File Processing Auditing

For CSV/Excel file processing:

```javascript
import { Audit } from './audit';

// After file processing completes
Audit.persistFileJob(
  { id: 'user-123', email: 'user@example.com' },
  {
    fileMeta: {
      id: 'file-uuid',
      bucket: 'audit-bucket',
      s3Key: 'dev/user-123/CSV/2025/08/18/job-uuid/filename.csv',
      originalName: 'insurance_items.csv',
      mimeType: 'text/csv',
      sizeBytes: 1024,
      sha256: 'abc123...',
      fileType: 'csv'
    },
    jobMeta: {
      id: 'job-uuid',
      jobType: 'CSV',
      status: 'SUCCESS',
      startedAt: new Date(),
      completedAt: new Date()
    },
    items: [
      {
        id: 'item-uuid',
        rowIndex: 1,
        inputDesc: 'Bissell Vacuum Cleaner',
        status: 'DONE'
      }
      // ... more items
    ]
  }
);
```

### Image Processing Auditing

For image-based searches:

```javascript
import { Audit } from './audit';

// After image processing completes
Audit.persistImageJob(
  { id: 'user-123', email: 'user@example.com' },
  {
    fileMeta: {
      id: 'image-uuid',
      bucket: 'audit-bucket',
      s3Key: 'dev/user-123/IMAGE/2025/08/18/job-uuid/image.jpg',
      originalName: 'damaged_item.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 2048,
      sha256: 'def456...',
      fileType: 'image'
    },
    jobMeta: {
      id: 'job-uuid',
      jobType: 'IMAGE',
      status: 'SUCCESS',
      startedAt: new Date(),
      completedAt: new Date()
    },
    items: [
      {
        id: 'item-uuid',
        imageRef: 's3://bucket/key',
        inputDesc: 'Damaged wooden table',
        status: 'DONE'
      }
    ]
  }
);
```

## 🗄️ Database Schema

The system creates the following tables:

- **users** - User information
- **files** - File metadata and S3 references
- **jobs** - Job tracking and status
- **job_items** - Individual items within jobs
- **search_events** - Search engine operations and results
- **final_choices** - Final selected results
- **audit_logs** - User action logging

## 📡 API Endpoints

### Dashboard APIs (Read-only)

All endpoints require authentication via `X-Dev-User` header or JWT token.

- `GET /api/logs/health` - System health check
- `GET /api/logs/jobs` - List user's jobs (paginated)
- `GET /api/logs/jobs/:jobId` - Job details with items
- `GET /api/logs/items/:itemId` - Item details with search events
- `GET /api/logs/summary?days=30` - Dashboard summary statistics

### Example Usage

```bash
# Health check
curl -H "X-Dev-User: dev-user-001" http://localhost:5000/api/logs/health

# Get recent jobs
curl -H "X-Dev-User: dev-user-001" "http://localhost:5000/api/logs/jobs?limit=10"

# Get job details
curl -H "X-Dev-User: dev-user-001" http://localhost:5000/api/logs/jobs/job-uuid-123

# Get dashboard summary
curl -H "X-Dev-User: dev-user-001" "http://localhost:5000/api/logs/summary?days=30"
```

## 🎯 Dashboard

Access the built-in dashboard at:
```
http://localhost:5000/src/audit/dashboard.html
```

Features:
- System status monitoring
- Dashboard summary statistics
- Recent jobs listing
- Job detail views
- Development user switching

## 🔒 Security

### Authentication

- **Development**: Use `X-Dev-User` header for local testing
- **Production**: JWT tokens from Cognito or other auth providers
- **User Isolation**: Users can only access their own data

### Data Protection

- All sensitive data is stored in the database (not logs)
- S3 files are organized by user ID for access control
- Database connections use connection pooling and retry logic

## 🚨 Error Handling

The system is designed to be resilient:

- **Circuit Breaker**: Automatically stops operations if database is down
- **Graceful Degradation**: Continues working even if S3 is unavailable
- **Non-blocking**: Never blocks the main request path
- **Retry Logic**: Automatic retries with exponential backoff

## 📈 Monitoring

### Health Checks

```bash
# Check system health
GET /api/logs/health

# Response includes:
{
  "audit": { "enabled": true, "status": "operational" },
  "database": { "healthy": true, "message": "Database connection healthy" },
  "timestamp": "2025-08-18T22:34:00.000Z"
}
```

### Queue Status

```javascript
import { getQueueStatus } from './audit/queue';

const status = getQueueStatus();
console.log('Queue length:', status.queueLength);
console.log('Circuit breaker:', status.circuitBreakerOpen);
```

## 🧪 Testing

### Local Development

1. **Set Environment Variables**
   ```bash
   export AUDIT_ENABLED=true
   export DB_HOST=localhost
   export DB_USER=root
   export DB_PASSWORD=password
   export DB_NAME=insurance_audit
   ```

2. **Start Database**
   ```bash
   # Use Docker for local MySQL
   docker run -d --name mysql-audit \
     -e MYSQL_ROOT_PASSWORD=password \
     -e MYSQL_DATABASE=insurance_audit \
     -p 3306:3306 mysql:8.0
   ```

3. **Run Migration**
   ```bash
   mysql -h localhost -u root -ppassword insurance_audit < src/audit/migrations/001_init.sql
   ```

4. **Test Integration**
   ```javascript
   // In your existing code, add audit calls
   Audit.persistSingleSearch(user, searchData);
   ```

### Testing Dashboard

1. **Access Dashboard**
   ```
   http://localhost:5000/src/audit/dashboard.html
   ```

2. **Set Dev User**
   - Enter a user ID (e.g., `test-user-001`)
   - Click "Set User"

3. **Run Some Searches**
   - Use your existing search functionality
   - Check dashboard for new jobs

## 🚀 Deployment

### AWS App Runner

1. **Set Environment Variables**
   - `AUDIT_ENABLED=true`
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `S3_BUCKET`, `STAGE`, `AWS_REGION`

2. **Database Access**
   - Ensure App Runner can access Aurora MySQL
   - Consider using RDS Proxy for connection pooling

3. **S3 Permissions**
   - App Runner execution role needs S3 read/write permissions
   - Bucket policy should restrict access by user ID

### Environment-Specific Configuration

```bash
# Development
AUDIT_ENABLED=true
STAGE=dev
DB_POOL_MAX=3

# Production
AUDIT_ENABLED=true
STAGE=prod
DB_POOL_MAX=10
```

## 🔧 Troubleshooting

### Common Issues

1. **"Audit system disabled"**
   - Check `AUDIT_ENABLED=true`
   - Verify database environment variables

2. **"Database not available"**
   - Check database connectivity
   - Verify credentials and network access
   - Check Aurora cluster status

3. **"S3 not available"**
   - Verify S3 bucket exists
   - Check AWS credentials and permissions
   - System continues working without S3

4. **Queue not processing**
   - Check circuit breaker status
   - Verify database health
   - Check for error logs

### Debug Mode

Enable detailed logging:

```javascript
// Add to your server startup
process.env.DEBUG = 'audit:*';
```

## 📚 API Reference

### Audit Service Methods

```javascript
// Core audit methods
Audit.persistSingleSearch(user, data)
Audit.persistFileJob(user, data)
Audit.persistImageJob(user, data)

// Utility methods
Audit.updateJobStatus(jobId, status, errorMessage)
Audit.updateJobItemStatus(itemId, status, errorMessage)
Audit.logAuditEvent(userId, action, metaJson)
```

### Database Utilities

```javascript
import { isAuditEnabled, checkDatabaseHealth, getDatabase } from './audit';

// Check if audit is available
if (isAuditEnabled()) {
  // Use audit features
}

// Health check
const health = await checkDatabaseHealth();

// Get database instance
const db = getDatabase();
```

## 🤝 Contributing

### Adding New Audit Types

1. **Extend Types** (`src/types/audit.ts`)
2. **Add Database Schema** (`src/audit/drizzle-schema.ts`)
3. **Update Queue Processing** (`src/audit/queue.ts`)
4. **Add Service Methods** (`src/audit/audit.service.ts`)
5. **Update API Routes** (`src/audit/logs.routes.ts`)

### Testing New Features

1. **Unit Tests** - Test individual components
2. **Integration Tests** - Test with real database
3. **End-to-End Tests** - Test complete audit flow

## 📄 License

This audit system is part of the Insurance Pricing application and follows the same licensing terms.

---

**Need Help?** Check the logs for detailed error messages and ensure all environment variables are properly set.
