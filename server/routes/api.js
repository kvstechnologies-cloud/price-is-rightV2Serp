// js/api.js - API helper functions

class APIHelper {
      constructor() {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        this.baseURL = isLocal
            ? '' // Relative path for local
            : 'https://udjszezwob.execute-api.us-east-1.amazonaws.com/stage';

        this.endpoints = {
            processCSV: `${this.baseURL}/api/process-csv`,
            processItem: `${this.baseURL}/api/process-item`,
            analyzeImage: `${this.baseURL}/api/analyze-image`,
            health: `${this.baseURL}/health`
        };
    }

    // Process CSV/Excel files
    async processCSVFile(file, tolerance = 10) {
        const formData = new FormData();
        formData.append('csvFile', file);
        formData.append('tolerance', tolerance.toString());

        try {
            const response = await fetch(this.endpoints.processCSV, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('CSV processing error:', error);
            throw new Error(`Failed to process CSV: ${error.message}`);
        }
    }

    // Process single item
    async processSingleItem(itemData) {
        try {
            const response = await fetch(this.endpoints.processItem, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Single item processing error:', error);
            throw new Error(`Failed to process item: ${error.message}`);
        }
    }

    // Analyze image with AI Vision - FIXED VERSION
    async analyzeImage(imageFile) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const base64Data = e.target.result; // Keep the full data URL
                    
                    // Create the AI Vision prompt
                    const visionPrompt = `You are a product identification expert helping with insurance documentation.

For the furniture or items clearly visible in the image, return data in this structured format:
Brand or Manufacturer	Model#	Item Description	Cost to Replace Pre-Tax (each)	Total Cost	Brand	Description

If brand or model is not visible, say "No Brand" or leave blank. Estimate cost realistically based on common online listings (Amazon, Wayfair, Walmart, Target, etc.). Only include clearly visible, identifiable items like furniture, fixtures, or electronics.

Return the data as a JSON array where each item is an object with these properties:
- brandOrManufacturer
- modelNumber  
- itemDescription
- costToReplace
- totalCost
- brand
- description

Example response:
[
  {
    "brandOrManufacturer": "No Brand",
    "modelNumber": "",
    "itemDescription": "Outdoor Welcome Mat",
    "costToReplace": "25.99",
    "totalCost": "25.99",
    "brand": "",
    "description": "Gray chevron pattern doormat for outdoor use"
  }
]`;

                    console.log('🔧 js/api.js: Sending AI Vision request with all required fields');
                    
                    const requestData = {
                        image: base64Data,
                        prompt: visionPrompt,
                        fileName: imageFile.name
                    };
                    
                    console.log('🔧 js/api.js: Request keys:', Object.keys(requestData));
                    console.log('🔧 js/api.js: Has prompt:', !!requestData.prompt);
                    console.log('🔧 js/api.js: Has fileName:', !!requestData.fileName);
                    
                    const response = await fetch(this.endpoints.analyzeImage, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestData)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();
                    console.log('🔧 js/api.js: AI Vision response:', result);
                    
                    resolve(result);
                } catch (error) {
                    console.error('Image analysis error:', error);
                    reject(new Error(`Failed to analyze image: ${error.message}`));
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read image file'));
            };

            reader.readAsDataURL(imageFile);
        });
    }

    // Check API health
    async checkHealth() {
        try {
            const response = await fetch(this.endpoints.health);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Health check error:', error);
            throw new Error(`API health check failed: ${error.message}`);
        }
    }

    // Process multiple files of different types
    async processMultipleFiles(files, tolerance = 10) {
        const results = [];
        const errors = [];

        for (const file of files) {
            try {
                const fileType = this.getFileType(file);
                let result;

                switch (fileType) {
                    case 'csv':
                    case 'excel':
                        result = await this.processCSVFile(file, tolerance);
                        break;
                    case 'image':
                        result = await this.analyzeImage(file);
                        break;
                    default:
                        throw new Error(`Unsupported file type: ${file.name}`);
                }

                results.push({
                    file: file.name,
                    type: fileType,
                    success: true,
                    data: result
                });

            } catch (error) {
                errors.push({
                    file: file.name,
                    error: error.message
                });
            }
        }

        return { results, errors };
    }

    // Helper method to determine file type
    getFileType(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (['csv'].includes(extension)) return 'csv';
        if (['xlsx', 'xls'].includes(extension)) return 'excel';
        if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) return 'image';
        
        return 'unknown';
    }

    // Validate file before processing
    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB for data files
        const maxImageSize = 5 * 1024 * 1024; // 5MB for images
        
        const fileType = this.getFileType(file);
        const isImage = fileType === 'image';
        const maxAllowedSize = isImage ? maxImageSize : maxSize;

        if (file.size > maxAllowedSize) {
            throw new Error(`File ${file.name} is too large. Maximum size: ${maxAllowedSize / 1024 / 1024}MB`);
        }

        if (fileType === 'unknown') {
            throw new Error(`Unsupported file type: ${file.name}`);
        }

        return true;
    }

    // Create download link for CSV results
    downloadCSV(csvData, filename = 'processed_results.csv') {
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }

    // Create download link for JSON results
    downloadJSON(jsonData, filename = 'results.json') {
        const dataStr = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }
}

// Create global API instance
window.api = new APIHelper();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIHelper;
}