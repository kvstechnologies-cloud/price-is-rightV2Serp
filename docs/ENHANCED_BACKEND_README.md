# Enhanced Backend Processing System

## Overview

The Enhanced Backend Processing System is a sophisticated insurance claims pricing pipeline that provides intelligent Excel/CSV processing with advanced field mapping, pricing logic, and data safety features.

## Key Features

### 🎯 Multi-Format Support
- **Excel (.xlsx/.xls)**: Multi-sheet support with user sheet selection
- **CSV**: Single-sheet processing with automatic field detection
- **Data Safety**: Never modifies existing sheets, formulas, or formatting

### 🔍 Intelligent Field Mapping
- **Fuzzy Matching**: Case/space-tolerant mapping with fallback wizard
- **Canonical Fields**: 8 required fields with multiple name variations
- **Auto-Detection**: Intelligent column recognition and validation

### 💰 Advanced Pricing Logic
- **Tolerance-Based**: User-configurable price tolerance percentage
- **Status Tracking**: Found, Price Estimated, No Verified Match
- **Trusted Sources**: Only reputable retailer domains
- **Model Matching**: Exact model matching when available

### 📊 Output Generation
- **Evaluation Sheets**: Separate summary sheets in Excel workbooks
- **Download Formats**: Excel with appended columns or CSV export
- **Data Preservation**: Original data integrity maintained

## Canonical Fields

| Field | Required | Variations | Description |
|-------|----------|------------|-------------|
| **Room** | ✅ | Room, Location, Area | Item location in property |
| **QTY** | ✅ | Quantity, Qty, Quantity Lost | Number of items |
| **Description** | ✅ | Item Description, Desc, Product Name | Item description |
| **Model#** | ✅ | Model, Model Number, SKU | Product model/serial |
| **Age (Years)** | ✅ | Item Age, Years, Age | Item age in years |
| **Condition** | ✅ | Item Condition, Grade, Quality | Item condition rating |
| **Original Source** | ✅ | Original Vendor, Vendor, Source | Purchase source |
| **Purchase Price** | ✅ | Unit Cost, Cost Each, Price Each | Unit purchase price |
| **Total Purchase Price** | ⚠️ | Total Cost, Extended Cost | Total line cost (optional) |

## API Endpoints

### 1. Sheet Selection (Excel Only)
```
POST /api/enhanced/select-sheet
```
**Purpose**: Get available sheets from multi-sheet Excel files

**Request**: 
- `file`: Excel file (.xlsx/.xls)

**Response**:
```json
{
  "type": "sheet_selection",
  "sheets": ["Sheet1", "Data", "Summary"],
  "message": "Please select a sheet to process"
}
```

### 2. Main Processing
```
POST /api/enhanced/process-enhanced
```
**Purpose**: Process uploaded files and generate pricing results

**Request**:
- `file`: Excel/CSV file
- `selectedSheet`: Sheet name (for Excel files)
- `tolerancePct`: Price tolerance percentage (default: 10)

**Response Types**:

#### Sheet Selection Required
```json
{
  "type": "sheet_selection",
  "sheets": ["Sheet1", "Data"],
  "message": "Please select a sheet to process"
}
```

#### Field Mapping Required
```json
{
  "type": "mapping_required",
  "missingFields": ["Room", "Purchase Price"],
  "availableHeaders": ["Description", "Qty", "Cost"],
  "message": "Field mapping required for missing fields"
}
```

#### Processing Complete
```json
{
  "type": "processing_complete",
  "results": [
    {
      "itemNumber": 1,
      "description": "KitchenAid Mixer",
      "status": "Found",
      "replacementSource": "walmart.com",
      "replacementPrice": 299.99,
      "totalReplacementPrice": 299.99,
      "url": "https://walmart.com/product/123"
    }
  ],
  "evaluationSheetName": "Evaluation sheet",
  "originalFilename": "claims.xlsx",
  "processedRows": 1
}
```

### 3. Excel Download
```
POST /api/enhanced/download-excel
```
**Purpose**: Download Excel file with original data + appended columns

**Request**:
```json
{
  "originalFilename": "claims.xlsx",
  "results": [...],
  "originalData": {
    "headers": [...],
    "rows": [...],
    "workbook": {...}
  }
}
```

**Response**: Excel file download with filename `{original} - evaluated.xlsx`

### 4. CSV Download
```
POST /api/enhanced/download-csv
```
**Purpose**: Download CSV file with original data + appended columns

**Request**: Same as Excel download

**Response**: CSV file download with filename `{original} - evaluated.csv`

## Field Mapping Logic

### Exact Matching
The system first attempts exact matches between canonical field names and uploaded headers.

### Fuzzy Matching
For unmapped fields, fuzzy matching uses word similarity scoring:
- Headers are normalized (lowercase, spaces, punctuation)
- Key words are extracted and compared
- Match score calculated based on word overlap
- Minimum score threshold applied

### Example Mapping
```
Uploaded Header → Canonical Field
"Item Description" → "Description"
"Quantity Lost" → "QTY"
"Unit Cost" → "Purchase Price"
"Model Number" → "Model#"
"Item Age (Years)" → "Age (Years)"
"Item Condition" → "Condition"
"Original Vendor" → "Original Source"
"Total Cost" → "Total Purchase Price"
```

## Pricing Logic

### Price Cap Calculation
```
Price Cap = Purchase Price × (1 + TolerancePct/100)
```

### Status Determination
1. **Found**: Exact match within price cap
2. **Price Estimated**: Match found but above price cap
3. **No Verified Match**: No suitable replacement found

### Trusted Sources
Only domains from the trusted sources list are accepted:
- amazon.com, walmart.com, target.com
- homedepot.com, lowes.com, bestbuy.com
- wayfair.com, costco.com, overstock.com
- And others...

## Data Safety Features

### Excel Workbooks
- **No Sheet Modification**: Original sheets remain unchanged
- **No Formula Changes**: All formulas and formatting preserved
- **Evaluation Sheets**: New summary sheets created separately
- **Collision Avoidance**: Automatic naming with numeric suffixes

### Export Files
- **Original Data**: All original columns preserved
- **Appended Columns**: 5 new columns added to the right
- **Filename Suffix**: `- evaluated` suffix added
- **Format Preservation**: Excel formatting maintained

## Usage Examples

### Basic CSV Processing
```javascript
const formData = new FormData();
formData.append('file', csvFile);
formData.append('tolerancePct', '15');

const response = await fetch('/api/enhanced/process-enhanced', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.type === 'processing_complete') {
  console.log('Processing complete:', result.results);
}
```

### Excel Sheet Selection
```javascript
// First, get available sheets
const sheetResponse = await fetch('/api/enhanced/select-sheet', {
  method: 'POST',
  body: formData
});

const sheetData = await sheetResponse.json();
if (sheetData.type === 'sheet_selection') {
  // Show sheet selection UI
  const selectedSheet = await showSheetSelector(sheetData.sheets);
  
  // Process with selected sheet
  formData.append('selectedSheet', selectedSheet);
  const processResponse = await fetch('/api/enhanced/process-enhanced', {
    method: 'POST',
    body: formData
  });
}
```

### Download Results
```javascript
// Download Excel
const excelResponse = await fetch('/api/enhanced/download-excel', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    originalFilename: 'claims.xlsx',
    results: results,
    originalData: originalData
  })
});

// Download CSV
const csvResponse = await fetch('/api/enhanced/download-csv', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    originalFilename: 'claims.csv',
    results: results,
    originalData: originalData
  })
});
```

## Error Handling

### Common Error Responses
```json
{
  "error": "Error description",
  "details": "Additional error information",
  "timestamp": "2025-01-XX...",
  "requestId": "unique-identifier"
}
```

### Error Types
- **400**: Bad Request (missing file, invalid parameters)
- **500**: Internal Server Error (processing failures)
- **503**: Service Unavailable (external service issues)

## Performance Considerations

### Processing Delays
- **API Rate Limiting**: 100ms delay between items
- **Batch Processing**: Configurable batch sizes
- **Memory Management**: Automatic cleanup of file buffers

### File Size Limits
- **Excel**: 50MB maximum
- **CSV**: 10MB maximum
- **Row Limits**: No hard limit, but performance degrades with large datasets

## Testing

### Run Tests
```bash
# Run comprehensive tests
npm test

# Run specific test file
node test/enhanced-backend.test.js

# Run demo
node test/demo-enhanced-backend.js
```

### Test Coverage
- Field mapping logic
- Data validation
- Pricing calculations
- Error handling
- API endpoints
- Data safety features

## Integration Notes

### Frontend Requirements
- File upload handling
- Sheet selection UI (for Excel)
- Field mapping wizard (if needed)
- Results display table
- Download functionality

### Backend Dependencies
- Node.js 16+
- Express.js
- Multer (file uploads)
- XLSX (Excel processing)
- PapaParse (CSV processing)

## Troubleshooting

### Common Issues

#### Field Mapping Failures
- Check header names for typos
- Verify required fields are present
- Use field mapping wizard for complex cases

#### Processing Errors
- Check file format compatibility
- Verify file size limits
- Review error logs for details

#### Download Issues
- Ensure results data is complete
- Check original data structure
- Verify file permissions

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
DEBUG=enhanced-processing npm start
```

## Future Enhancements

### Planned Features
- **Batch Processing**: Process multiple files simultaneously
- **Advanced Analytics**: Processing statistics and metrics
- **Template Support**: Pre-configured field mappings
- **API Rate Limiting**: Configurable external API limits
- **Caching**: Result caching for repeated queries

### Integration Opportunities
- **Database Storage**: Save processing results
- **User Management**: Multi-user support
- **Audit Logging**: Complete processing history
- **Webhook Support**: Real-time notifications

## Support

For technical support or feature requests, please refer to the main project documentation or contact the development team.

---

**Version**: Enhanced Backend v1.0  
**Last Updated**: January 2025  
**Compatibility**: Node.js 16+, Express 4+
