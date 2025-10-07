# 🔄 Automatic Synchronization System

## 🎯 **Overview**

This system automatically synchronizes files between your local development server and Lambda functions, ensuring that changes you make in one place are automatically reflected in the other.

## 🚀 **Quick Start**

### **1. Start Development with Auto-Sync**
```bash
# Start development server with automatic synchronization
npm run dev:sync

# Or start with file watching (real-time sync)
npm run watch:sync
```

### **2. Manual Synchronization**
```bash
# Sync all files at once
npm run sync:all

# Sync specific components
npm run sync:models      # Sync model files only
npm run sync:routes      # Sync route files only
npm run sync:services    # Sync service-specific logic
```

## 📁 **What Gets Synced**

### **Models** (`server/models/` → `lambda/functions/*/models/`)
- ✅ `InsuranceItemPricer.js` - Enhanced pricing engine
- ✅ `ProductValidator.js` - Product validation logic

### **Routes** (`server/routes/` → `lambda/functions/*/src/`)
- ✅ `csvProcessingRoutes.js` - CSV/Excel processing
- ✅ `api.js` - API endpoints and validation

### **Services** (Service-specific logic)
- ✅ **pricing-service** - Pricing calculations
- ✅ **csv-processing-service** - File processing
- ✅ **ai-vision-service** - AI Vision analysis
- ✅ **document-service** - Document handling

## 🔄 **Synchronization Modes**

### **1. Real-Time Watching** (Recommended)
```bash
npm run watch:sync
```
- **Watches** for file changes in real-time
- **Automatically syncs** when files are modified
- **Instant updates** to Lambda functions
- **Best for development**

### **2. Development with Sync**
```bash
npm run dev:sync
```
- **Syncs once** before starting development server
- **Uses nodemon** for server auto-restart
- **Good for initial setup**

### **3. Manual Sync**
```bash
npm run sync:all
```
- **Syncs all files** manually
- **Good for** one-time updates
- **Useful for** deployment preparation

## 📊 **File Structure After Sync**

```
price-is-right-V2/
├── server/                          # Source (Local Development)
│   ├── models/
│   │   ├── InsuranceItemPricer.js   # ← Source
│   │   └── ProductValidator.js      # ← Source
│   ├── routes/
│   │   ├── csvProcessingRoutes.js   # ← Source
│   │   └── api.js                   # ← Source
│   └── index.js                     # ← Source
│
├── lambda/functions/                # Target (Lambda Functions)
│   ├── pricing-service/
│   │   └── models/
│   │       ├── InsuranceItemPricer.js   # ← Synced
│   │       └── ProductValidator.js      # ← Synced
│   ├── csv-processing-service/
│   │   └── src/
│   │       └── csvProcessingRoutes.js   # ← Synced
│   ├── ai-vision-service/
│   │   └── src/
│   │       └── ai-vision-logic.js       # ← Extracted
│   └── document-service/
│       └── src/
│           └── api.js                   # ← Synced
```

## 🎯 **Usage Examples**

### **Example 1: Real-Time Development**
```bash
# Terminal 1: Start file watcher
npm run watch:sync

# Terminal 2: Start development server
npm run dev

# Now when you edit server/models/InsuranceItemPricer.js
# It automatically syncs to lambda/functions/pricing-service/models/
```

### **Example 2: One-Time Sync**
```bash
# Sync all files before deployment
npm run sync:all

# Deploy to AWS
npm run lambda:deploy:all
```

### **Example 3: Selective Sync**
```bash
# Only sync models
npm run sync:models

# Only sync routes
npm run sync:routes
```

## 🔧 **Configuration**

### **Sync Paths** (in `scripts/watch-sync.js`)
```javascript
const WATCH_PATHS = [
    path.join(__dirname, '../server/models/**/*.js'),
    path.join(__dirname, '../server/routes/**/*.js'),
    path.join(__dirname, '../server/index.js')
];
```

### **Service Mapping** (in `scripts/sync-services.js`)
```javascript
const LAMBDA_SERVICES = {
    'pricing-service': {
        source: path.join(__dirname, '../server/models'),
        target: path.join(__dirname, '../lambda/functions/pricing-service/models'),
        files: ['InsuranceItemPricer.js', 'ProductValidator.js']
    },
    // ... more services
};
```

## 🚨 **Important Notes**

### **1. File Overwriting**
- **Synced files overwrite** existing files in Lambda directories
- **Backup important changes** before syncing
- **Use version control** for safety

### **2. Dependencies**
- **Lambda functions** need their own `package.json`
- **Dependencies** are not automatically synced
- **Install dependencies** in each Lambda function

### **3. Environment Variables**
- **Environment variables** are not synced
- **Configure separately** for each Lambda function
- **Use AWS Systems Manager** for production

## 🎯 **Best Practices**

### **1. Development Workflow**
```bash
# 1. Start file watcher
npm run watch:sync

# 2. Make changes in server/ directory
# 3. Changes automatically sync to lambda/
# 4. Test locally with npm run dev
# 5. Deploy when ready
```

### **2. Testing**
```bash
# Test local changes
npm run dev

# Test Lambda functions locally
cd lambda/functions/pricing-service
npm run dev

# Run integration tests
npm test
```

### **3. Deployment**
```bash
# Sync all changes
npm run sync:all

# Deploy to AWS
npm run lambda:deploy:all
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. Files Not Syncing**
```bash
# Check if source files exist
ls server/models/
ls server/routes/

# Run manual sync
npm run sync:all
```

#### **2. Permission Errors**
```bash
# Check file permissions
chmod +x scripts/*.js

# Run as administrator if needed
sudo npm run sync:all
```

#### **3. Watch Not Working**
```bash
# Check if chokidar is installed
npm list chokidar

# Reinstall if needed
npm install chokidar --save-dev
```

## 📈 **Monitoring**

### **Sync Logs**
```
🔄 [2025-08-07T17:00:00.000Z] Starting file watcher...
✅ [2025-08-07T17:00:00.000Z] File watcher started successfully!
🔄 [2025-08-07T17:00:05.000Z] File changed: server/models/InsuranceItemPricer.js
🔄 [2025-08-07T17:00:05.000Z] Syncing models...
✅ [2025-08-07T17:00:05.000Z] Synced InsuranceItemPricer.js to lambda/functions/pricing-service/models/
✅ [2025-08-07T17:00:05.000Z] Sync completed!
```

## 🎉 **Benefits**

### **✅ Automatic Updates**
- **No manual copying** required
- **Real-time synchronization**
- **Reduced errors**

### **✅ Development Efficiency**
- **Single source of truth**
- **Faster development cycle**
- **Consistent codebase**

### **✅ Deployment Ready**
- **Lambda functions** always up-to-date
- **Easy deployment** process
- **Reduced deployment time**

---

## 🚀 **Get Started Now**

```bash
# 1. Install dependencies
npm install

# 2. Start development with auto-sync
npm run dev:sync

# 3. Make changes and watch them sync automatically!
```

**Your V2 app now has automatic synchronization between local development and Lambda functions!** 🎉
