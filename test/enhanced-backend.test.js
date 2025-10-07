// test/enhanced-backend.test.js - Enhanced Backend Processing Tests
const request = require('supertest');
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Mock the InsuranceItemPricer for testing
jest.mock('../server/models/InsuranceItemPricer', () => {
  return jest.fn().mockImplementation(() => ({
    findBestPrice: jest.fn().mockResolvedValue({
      found: true,
      price: 150.00,
      source: 'walmart.com',
      url: 'https://www.walmart.com/product/123',
      matchQuality: 'Good'
    })
  }));
});

// Import the enhanced routes
const enhancedProcessingRoutes = require('../server/routes/enhancedProcessingRoutes');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/enhanced', enhancedProcessingRoutes);

describe('Enhanced Processing Routes', () => {
  let testServer;
  
  beforeAll(() => {
    testServer = app.listen(0); // Use random port
  });
  
  afterAll((done) => {
    testServer.close(done);
  });

  describe('POST /api/enhanced/select-sheet', () => {
    it('should return sheet list for Excel files', async () => {
      // Create a mock Excel file buffer (simplified)
      const mockExcelBuffer = Buffer.from('mock excel content');
      
      const response = await request(app)
        .post('/api/enhanced/select-sheet')
        .attach('file', mockExcelBuffer, 'test.xlsx');
      
      expect(response.status).toBe(200);
      expect(response.body.type).toBe('sheet_selection');
      expect(Array.isArray(response.body.sheets)).toBe(true);
    });

    it('should reject non-Excel files', async () => {
      const response = await request(app)
        .post('/api/enhanced/select-sheet')
        .attach('file', Buffer.from('csv content'), 'test.csv');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Excel file required');
    });
  });

  describe('POST /api/enhanced/process-enhanced', () => {
    it('should process CSV files with automatic field mapping', async () => {
      const csvContent = `Description,Qty,Purchase Price,Model,Age,Condition,Original Source
"KitchenAid Mixer",1,299.99,"KSM150PS",5,"Good","Best Buy"
"Refrigerator",1,899.99,"FRIG123",3,"Excellent","Home Depot"`;
      
      const response = await request(app)
        .post('/api/enhanced/process-enhanced')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .field('tolerancePct', '15');
      
      expect(response.status).toBe(200);
      expect(response.body.type).toBe('processing_complete');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBe(2);
      
      // Check that results have the expected structure
      const firstResult = response.body.results[0];
      expect(firstResult).toHaveProperty('itemNumber');
      expect(firstResult).toHaveProperty('description');
      expect(firstResult).toHaveProperty('status');
      expect(firstResult).toHaveProperty('replacementSource');
      expect(firstResult).toHaveProperty('replacementPrice');
      expect(firstResult).toHaveProperty('totalReplacementPrice');
      expect(firstResult).toHaveProperty('url');
    });

    it('should handle missing required fields gracefully', async () => {
      const csvContent = `Description,Qty
"Test Item",1`;
      
      const response = await request(app)
        .post('/api/enhanced/process-enhanced')
        .attach('file', Buffer.from(csvContent), 'test.csv');
      
      expect(response.status).toBe(200);
      expect(response.body.type).toBe('mapping_required');
      expect(Array.isArray(response.body.missingFields)).toBe(true);
      expect(response.body.missingFields).toContain('Purchase Price');
    });

    it('should process Excel files with sheet selection', async () => {
      // This test would require a real Excel file or more sophisticated mocking
      // For now, we'll test the error handling
      const response = await request(app)
        .post('/api/enhanced/process-enhanced')
        .attach('file', Buffer.from('mock excel'), 'test.xlsx');
      
      // Should return sheet selection request
      expect(response.status).toBe(200);
      expect(response.body.type).toBe('sheet_selection');
    });
  });

  describe('POST /api/enhanced/download-excel', () => {
    it('should generate Excel file with appended columns', async () => {
      const downloadData = {
        originalFilename: 'test.xlsx',
        results: [
          {
            itemNumber: 1,
            description: 'Test Item',
            status: 'Found',
            replacementSource: 'walmart.com',
            replacementPrice: 150.00,
            totalReplacementPrice: 150.00,
            url: 'https://walmart.com/product'
          }
        ],
        originalData: {
          headers: ['Description', 'Qty', 'Price'],
          rows: [
            { Description: 'Test Item', Qty: 1, Price: 100 }
          ]
        }
      };
      
      const response = await request(app)
        .post('/api/enhanced/download-excel')
        .send(downloadData);
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('test - evaluated.xlsx');
    });

    it('should reject requests without results data', async () => {
      const response = await request(app)
        .post('/api/enhanced/download-excel')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Results data required');
    });
  });

  describe('POST /api/enhanced/download-csv', () => {
    it('should generate CSV file with appended columns', async () => {
      const downloadData = {
        originalFilename: 'test.csv',
        results: [
          {
            itemNumber: 1,
            description: 'Test Item',
            status: 'Found',
            replacementSource: 'walmart.com',
            replacementPrice: 150.00,
            totalReplacementPrice: 150.00,
            url: 'https://walmart.com/product'
          }
        ],
        originalData: {
          headers: ['Description', 'Qty', 'Price'],
          rows: [
            { Description: 'Test Item', Qty: 1, Price: 100 }
          ]
        }
      };
      
      const response = await request(app)
        .post('/api/enhanced/download-csv')
        .send(downloadData);
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('test - evaluated.csv');
      
      // Check CSV content includes the appended columns
      const csvContent = response.text;
      expect(csvContent).toContain('Pricer');
      expect(csvContent).toContain('Replacement Source');
      expect(csvContent).toContain('Replacement Price');
      expect(csvContent).toContain('Total Replacement Price');
      expect(csvContent).toContain('URL');
      expect(csvContent).toContain('AI Pricer');
    });
  });

  describe('Field Mapping Logic', () => {
    it('should map common field variations correctly', () => {
      const { mapFields } = require('../server/routes/enhancedProcessingRoutes');
      
      const headers = [
        'Item Description',
        'Quantity Lost',
        'Unit Cost',
        'Model Number',
        'Item Age (Years)',
        'Item Condition',
        'Original Vendor',
        'Total Cost'
      ];
      
      const { mapping, missingFields } = mapFields(headers);
      
      // Check that all required fields are mapped
      expect(mapping['Description']).toBe('Item Description');
      expect(mapping['QTY']).toBe('Quantity Lost');
      expect(mapping['Purchase Price']).toBe('Unit Cost');
      expect(mapping['Model#']).toBe('Model Number');
      expect(mapping['Age (Years)']).toBe('Item Age (Years)');
      expect(mapping['Condition']).toBe('Item Condition');
      expect(mapping['Original Source']).toBe('Original Vendor');
      expect(mapping['Total Purchase Price']).toBe('Total Cost');
      
      // No missing fields should exist
      expect(missingFields.length).toBe(0);
    });

    it('should handle fuzzy matching for similar field names', () => {
      const { mapFields } = require('../server/routes/enhancedProcessingRoutes');
      
      const headers = [
        'Product Desc',
        'Qty',
        'Cost Each',
        'SKU',
        'Years',
        'Quality',
        'Vendor',
        'Line Total'
      ];
      
      const { mapping, missingFields } = mapFields(headers);
      
      // Check fuzzy matches
      expect(mapping['Description']).toBe('Product Desc');
      expect(mapping['QTY']).toBe('Qty');
      expect(mapping['Purchase Price']).toBe('Cost Each');
      expect(mapping['Model#']).toBe('SKU');
      expect(mapping['Age (Years)']).toBe('Years');
      expect(mapping['Condition']).toBe('Quality');
      expect(mapping['Original Source']).toBe('Vendor');
      expect(mapping['Total Purchase Price']).toBe('Line Total');
    });
  });

  describe('Data Validation', () => {
    it('should validate and clean row data correctly', () => {
      const { validateRow } = require('../server/routes/enhancedProcessingRoutes');
      
      const fieldMapping = {
        'Description': 'Description',
        'QTY': 'Qty',
        'Purchase Price': 'Price',
        'Model#': 'Model',
        'Age (Years)': 'Age',
        'Condition': 'Condition',
        'Original Source': 'Source',
        'Total Purchase Price': 'Total'
      };
      
      const row = {
        'Description': 'Test Item',
        'Qty': '2',
        'Price': '99.99',
        'Model': 'No Brand',
        'Age': '3.5',
        'Condition': 'Good',
        'Source': 'Store',
        'Total': '199.98'
      };
      
      const validated = validateRow(row, fieldMapping);
      
      expect(validated['Description']).toBe('Test Item');
      expect(validated['QTY']).toBe(2);
      expect(validated['Purchase Price']).toBe(99.99);
      expect(validated['Model#']).toBe(null); // 'No Brand' should become null
      expect(validated['Age (Years)']).toBe(3.5);
      expect(validated['Condition']).toBe('Good');
      expect(validated['Original Source']).toBe('Store');
      expect(validated['Total Purchase Price']).toBe(199.98);
    });
  });

  describe('Error Handling', () => {
    it('should handle file upload errors gracefully', async () => {
      const response = await request(app)
        .post('/api/enhanced/process-enhanced');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No file uploaded');
    });

    it('should handle processing errors with proper error messages', async () => {
      // Test with malformed data that would cause processing errors
      const csvContent = `Description,Qty,Purchase Price
"Invalid Item",invalid,not-a-number`;
      
      const response = await request(app)
        .post('/api/enhanced/process-enhanced')
        .attach('file', Buffer.from(csvContent), 'test.csv');
      
      // Should still process but handle invalid data gracefully
      expect(response.status).toBe(200);
      expect(response.body.type).toBe('processing_complete');
    });
  });
});

// Helper function to create test Excel files (if needed for more comprehensive testing)
function createTestExcelFile(sheetNames, data) {
  // This would create a real Excel file for testing
  // For now, we'll use the mock approach
  return Buffer.from('mock excel content');
}

console.log('✅ Enhanced backend tests loaded successfully');
