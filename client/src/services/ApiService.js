// API Service for Insurance Pricing System
export class ApiService {
    constructor() {
        this.baseURL = this.getBaseURL();
        this.apiKey = this.getApiKey();
        this.timeout = 420000; // 7 minutes default timeout to prevent premature aborts on large jobs
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        
        this.requestQueue = new Map();
        this.isOnline = navigator.onLine;
        
        this.init();
    }
    
    init() {
        this.setupNetworkListeners();
        this.setupRequestInterceptors();
    }
    
    getBaseURL() {
        // Check for environment-specific base URL
        const baseURL = window.CONFIG?.API_BASE_URL || 
                       'http://localhost:5000';
        
        console.log('🔍 ApiService.getBaseURL() called');
        console.log('🔍 window.CONFIG:', window.CONFIG);
        console.log('🔍 window.CONFIG?.API_BASE_URL:', window.CONFIG?.API_BASE_URL);
        console.log('🔍 Final baseURL:', baseURL);
        
        return baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    }
    
    getApiKey() {
        // Get API key from environment variables or config
        return window.CONFIG?.API_KEY || 
               localStorage.getItem('api_key') || 
               '';
    }
    
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processQueuedRequests();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }
    
    setupRequestInterceptors() {
        // Global request configuration - simplified for CORS compatibility
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        
        if (this.apiKey) {
            this.defaultHeaders['Authorization'] = `Bearer ${this.apiKey}`;
        }
    }
    
    async makeRequest(endpoint, options = {}) {
        const requestId = this.generateRequestId();
        
        console.log('🔍 API Debug: makeRequest called with:', { endpoint, options, requestId });
        
        try {
            // Check network status
            if (!this.isOnline) {
                throw new Error('No internet connection available');
            }
            
            // Prepare request configuration
            const config = this.prepareRequestConfig(endpoint, options);
            console.log('🔍 API Debug: Prepared config:', config);
            
            // Execute request with retry logic
            const response = await this.executeWithRetry(config, requestId);
            console.log('🔍 API Debug: Raw response:', response);
            
            // Process and return response
            const processedResponse = await this.processResponse(response);
            console.log('🔍 API Debug: Processed response:', processedResponse);
            return processedResponse;
            
        } catch (error) {
            this.handleRequestError(error, requestId);
            throw error;
        } finally {
            this.requestQueue.delete(requestId);
        }
    }
    
    prepareRequestConfig(endpoint, options) {
        // Fix double /api issue: if endpoint starts with /api and baseURL ends with /api, remove /api from endpoint
        let cleanEndpoint = endpoint;
        if (this.baseURL.endsWith('/api') && endpoint.startsWith('/api/')) {
            cleanEndpoint = endpoint.substring(4); // Remove '/api' from beginning
        }
        
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${cleanEndpoint}`;
        
        console.log('🔍 prepareRequestConfig called');
        console.log('🔍 this.baseURL:', this.baseURL);
        console.log('🔍 original endpoint:', endpoint);
        console.log('🔍 cleaned endpoint:', cleanEndpoint);
        console.log('🔍 final url:', url);
        
        // PERFORMANCE FIX: Ensure proper timeout configuration with debugging
        const timeoutValue = options.timeout || this.timeout;
        console.log(`🔍 TIMEOUT DEBUG: Using timeout ${timeoutValue}ms for ${endpoint}`);
        console.log(`🔍 TIMEOUT DEBUG: options.timeout=${options.timeout}, this.timeout=${this.timeout}`);
        
        const config = {
            method: options.method || 'GET',
            headers: {
                ...this.defaultHeaders,
                ...options.headers
            },
            signal: AbortSignal.timeout(timeoutValue)
        };
        
        // Add body for non-GET requests
        if (config.method !== 'GET' && options.data) {
            if (options.data instanceof FormData) {
                // Remove content-type for FormData (browser will set it with boundary)
                delete config.headers['Content-Type'];
                config.body = options.data;
            } else {
                config.body = JSON.stringify(options.data);
            }
        }
        
        // Add query parameters for GET requests
        if (config.method === 'GET' && options.params) {
            const urlObj = new URL(url);
            Object.entries(options.params).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    urlObj.searchParams.append(key, value);
                }
            });
            config.url = urlObj.toString();
        } else {
            config.url = url;
        }
        
        return config;
    }
    
    async executeWithRetry(config, requestId, attempt = 1) {
        try {
            // Store request in queue for potential retry
            this.requestQueue.set(requestId, { config, attempt });
            
            const response = await fetch(config.url, config);
            
            // Check if response is ok
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
            
        } catch (error) {
            // Retry logic for failed requests
            if (attempt < this.retryAttempts && this.shouldRetry(error)) {
                console.warn(`Request failed, retrying (${attempt}/${this.retryAttempts}):`, error.message);
                
                // Wait before retry
                await this.delay(this.retryDelay * attempt);
                
                return this.executeWithRetry(config, requestId, attempt + 1);
            }
            
            throw error;
        }
    }
    
    shouldRetry(error) {
        // Retry on network errors and specific HTTP status codes
        return (
            error.name === 'TypeError' || // Network errors
            error.name === 'AbortError' || // Timeout errors
            (error.message.includes('HTTP 5')) || // Server errors
            error.message.includes('HTTP 408') || // Request timeout
            error.message.includes('HTTP 429')    // Rate limiting
        );
    }
    
    async processResponse(response) {
        const contentType = response.headers.get('content-type');
        console.log('🔍 API Debug: processResponse called with content-type:', contentType);
        
        if (contentType?.includes('application/json')) {
            const data = await response.json();
            console.log('🔍 API Debug: Parsed JSON data:', data);
            return {
                data,
                status: response.status,
                statusText: response.statusText,
                headers: this.headersToObject(response.headers)
            };
        } else if (contentType?.includes('text/')) {
            const text = await response.text();
            console.log('🔍 API Debug: Parsed text data:', text);
            return {
                data: text,
                status: response.status,
                statusText: response.statusText,
                headers: this.headersToObject(response.headers)
            };
        } else {
            const blob = await response.blob();
            console.log('🔍 API Debug: Parsed blob data:', blob);
            return {
                data: blob,
                status: response.status,
                statusText: response.statusText,
                headers: this.headersToObject(response.headers)
            };
        }
    }
    
    headersToObject(headers) {
        const headerObj = {};
        for (const [key, value] of headers.entries()) {
            headerObj[key] = value;
        }
        return headerObj;
    }
    
    handleRequestError(error, requestId) {
        console.error(`Request ${requestId} failed:`, error);
        console.error(`Error details:`, {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // Emit custom error event for global error handling
        window.dispatchEvent(new CustomEvent('apiError', {
            detail: { error, requestId }
        }));
    }
    
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Utility method for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    processQueuedRequests() {
        // Process any queued requests when connection is restored
        this.requestQueue.forEach(async ({ config }, requestId) => {
            try {
                await this.executeWithRetry(config, requestId);
            } catch (error) {
                console.error('Failed to process queued request:', error);
            }
        });
    }
    
    // Insurance-specific API methods
    
    async getInsuranceQuote(quoteData) {
        return this.makeRequest('/quotes', {
            method: 'POST',
            data: quoteData
        });
    }
    
    async updateQuote(quoteId, updateData) {
        return this.makeRequest(`/quotes/${quoteId}`, {
            method: 'PUT',
            data: updateData
        });
    }
    
    async getQuoteById(quoteId) {
        return this.makeRequest(`/quotes/${quoteId}`);
    }
    
    async getUserQuotes(userId, options = {}) {
        return this.makeRequest('/quotes', {
            params: {
                user_id: userId,
                limit: options.limit || 50,
                offset: options.offset || 0,
                status: options.status
            }
        });
    }
    
    async submitClaim(claimData) {
        return this.makeRequest('/claims', {
            method: 'POST',
            data: claimData
        });
    }
    
    async uploadDocument(file, documentType, relatedId) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', documentType);
        formData.append('related_id', relatedId);
        
        return this.makeRequest('/documents/upload', {
            method: 'POST',
            data: formData
        });
    }
    
    async analyzeDocument(documentId) {
        return this.makeRequest(`/documents/${documentId}/analyze`, {
            method: 'POST'
        });
    }
    
    async getInsuranceProducts(type = null) {
        return this.makeRequest('/products', {
            params: type ? { type } : {}
        });
    }
    
    async calculatePremium(calculationData) {
        return this.makeRequest('/premium/calculate', {
            method: 'POST',
            data: calculationData
        });
    }
    
    async getRiskAssessment(assessmentData) {
        return this.makeRequest('/risk/assess', {
            method: 'POST',
            data: assessmentData
        });
    }
    
    async getComparisonData(comparisonParams) {
        return this.makeRequest('/comparison', {
            params: comparisonParams
        });
    }
    
    async sendChatMessage(message, context = {}) {
        return this.makeRequest('/chat/message', {
            method: 'POST',
            data: {
                message,
                context,
                timestamp: new Date().toISOString()
            }
        });
    }
    
    async getChatHistory(sessionId, limit = 50) {
        return this.makeRequest('/chat/history', {
            params: {
                session_id: sessionId,
                limit
            }
        });
    }

    // Generic HTTP methods
    async get(endpoint, options = {}) {
        return this.makeRequest(endpoint, {
            method: 'GET',
            ...options
        });
    }

    async post(endpoint, data, options = {}) {
        return this.makeRequest(endpoint, {
            method: 'POST',
            data,
            ...options
        });
    }

    async put(endpoint, data, options = {}) {
        return this.makeRequest(endpoint, {
            method: 'PUT',
            data,
            ...options
        });
    }

    async delete(endpoint, options = {}) {
        return this.makeRequest(endpoint, {
            method: 'DELETE',
            ...options
        });
    }

    // ========================================
    // ENHANCED PRICING API METHODS
    // ========================================
    
    /**
     * Process a single item for pricing
     * @param {Object} itemData - Item data to process
     * @param {string} itemData.description - Item description
     * @param {string} itemData.category - Item category (optional)
     * @param {string} itemData.subCategory - Item sub-category (optional)
     * @param {number} itemData.priceTolerance - Price tolerance percentage (optional)
     * @returns {Promise<Object>} Pricing result
     */
    async processItem(itemData) {
        console.log('🔍 API Debug: processItem called with:', itemData);
        
        // Environment-aware endpoint construction
        // Local: http://localhost:5000 + /api/process-item
        // AWS: https://domain.com/api + /process-item  
        const endpoint = this.baseURL.includes('localhost') ? '/api/enhanced/test-item' : '/test-item';
        
        const result = await this.makeRequest(endpoint, {
            method: 'POST',
            data: itemData
        });
        console.log('🔍 API Debug: processItem result:', result);
        return result;
    }
    
    /**
     * Process CSV/Excel file for batch pricing
     * @param {File} file - CSV or Excel file
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing result
     */
    async processCSV(file, options = {}) {
        const formData = new FormData();
        formData.append('csvFile', file);
        
        // Add options to form data
        if (options.priceTolerance) {
            formData.append('priceTolerance', options.priceTolerance);
        }
        if (options.category) {
            formData.append('category', options.category);
        }
        if (options.subCategory) {
            formData.append('subCategory', options.subCategory);
        }
        
        // Environment-aware endpoint construction
        // Local: http://localhost:5000 + /api/process-csv
        // AWS: https://domain.com/api + /process-csv  
        const endpoint = this.baseURL.includes('localhost') ? '/api/process-csv' : '/process-csv';
        
        return this.makeRequest(endpoint, {
            method: 'POST',
            data: formData,
            timeout: 300000 // 5 minutes for CSV processing
        });
    }

    /**
     * Enhanced processing for Excel/CSV files with intelligent field mapping
     * @param {File} file - Excel or CSV file
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing result
     */
    async processEnhanced(file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add processing options
        if (options.tolerancePct) {
            formData.append('tolerancePct', options.tolerancePct);
        }
        if (options.selectedSheet) {
            formData.append('selectedSheet', options.selectedSheet);
        }
        if (options.fieldMapping) {
            // Send field mapping as individual form fields, not as JSON string
            Object.entries(options.fieldMapping).forEach(([field, value]) => {
                formData.append(`fieldMapping[${field}]`, value);
            });
        }
        
        // PERFORMANCE OPTIMIZED: Increased timeout to prevent frontend timeouts
        console.log('🔍 ENHANCED PROCESSING: Setting timeout to 420000ms (7 minutes)');
        console.log('🔍 Field mapping being sent:', options.fieldMapping);
        
        // Environment-aware endpoint construction
        // Local: http://localhost:5000 + /api/enhanced/process-enhanced
        // AWS: https://domain.com/api + /enhanced/process-enhanced  
        const endpoint = this.baseURL.includes('localhost') ? '/api/enhanced/process-enhanced' : '/enhanced/process-enhanced';
        
        return this.makeRequest(endpoint, {
            method: 'POST',
            data: formData,
            timeout: 420000 // 7 minutes - ensures frontend doesn't timeout before backend completes
        });
    }

    /**
     * Get available sheets from Excel workbook
     * @param {File} file - Excel file
     * @returns {Promise<Object>} Sheet information
     */
    async getSheetInfo(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Environment-aware endpoint construction
        const endpoint = this.baseURL.includes('localhost') ? '/api/enhanced/select-sheet' : '/enhanced/select-sheet';
        
        return this.makeRequest(endpoint, {
            method: 'POST',
            data: formData,
            timeout: 30000 // 30 seconds for sheet info
        });
    }

    /**
     * Download Excel file with results
     * @param {string} sessionId - Processing session ID
     * @param {string} format - 'excel' or 'csv'
     * @returns {Promise<Blob>} File blob
     */
    async downloadResults(sessionId, format = 'excel') {
        // Environment-aware endpoint construction
        const baseEndpoint = format === 'csv' ? '/enhanced/download-csv' : '/enhanced/download-excel';
        const endpoint = this.baseURL.includes('localhost') ? `/api${baseEndpoint}` : baseEndpoint;
        
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId }),
                signal: AbortSignal.timeout(120000) // 2 minutes for download
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.blob();
        } catch (error) {
            console.error('❌ Download error:', error);
            throw error;
        }
    }

    /**
     * Process CSV/Excel file with optimized paging
     * @param {File} file - CSV or Excel file
     * @param {number} page - Page number
     * @param {number} pageSize - Items per page
     * @returns {Promise<Object>} Processing result with pagination
     */
    async processCSVOptimized(file, page = 1, pageSize = 50) {
        const formData = new FormData();
        formData.append('csvFile', file);
        
        // Environment-aware endpoint construction
        // Local: http://localhost:5000 + /api/process-csv-optimized
        // AWS: https://domain.com/api + /process-csv-optimized  
        const endpoint = this.baseURL.includes('localhost') ? '/api/process-csv-optimized' : '/process-csv-optimized';
        const url = new URL(`${this.baseURL}${endpoint}`, window.location.origin);
        url.searchParams.set('page', page);
        url.searchParams.set('pageSize', pageSize);
        
        try {
            console.log(`🚀 Starting optimized CSV processing with paging (page ${page}, size ${pageSize})`);
            
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                signal: AbortSignal.timeout(this.timeout)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Optimized processing completed:`);
                console.log(`   📊 Total items: ${result.statistics.totalItems}`);
                console.log(`   ⏱️  Processing time: ${result.timing.totalProcessingTimeMinutes}m ${result.timing.totalProcessingTimeSeconds % 60}s`);
                console.log(`   🚀 Rate: ${result.timing.itemsPerMinute} items/minute`);
                console.log(`   📄 Page ${result.pagination.currentPage}/${result.pagination.totalPages}`);
                
                return {
                    success: true,
                    data: result.data,
                    pagination: result.pagination,
                    statistics: result.statistics,
                    timing: result.timing,
                    cache: result.cache
                };
            } else {
                throw new Error(result.error || 'Processing failed');
            }
        } catch (error) {
            console.error('❌ Optimized CSV processing error:', error);
            throw error;
        }
    }
    
    /**
     * Analyze image using AI Vision
     * @param {string} image - Base64 encoded image or image URL
     * @param {string} prompt - Analysis prompt
     * @param {string} fileName - File name (optional)
     * @returns {Promise<Object>} Analysis result
     */
    async analyzeImage(image, prompt, fileName = null) {
        const data = {
            image,
            prompt
        };
        
        if (fileName) {
            data.fileName = fileName;
        }
        
        // Environment-aware endpoint construction
        // Local: http://localhost:5000 + /api/analyze-image
        // AWS: https://domain.com/api + /analyze-image  
        const endpoint = this.baseURL.includes('localhost') ? '/api/analyze-image' : '/analyze-image';
        
        return this.makeRequest(endpoint, {
            method: 'POST',
            data
        });
    }
    
    /**
     * Process images and get pricing results (like CSV processing)
     * @param {Array} images - Array of image objects with image (base64) and fileName
     * @param {number} page - Page number for pagination
     * @param {number} pageSize - Number of items per page
     * @returns {Promise<Object>} Pricing results with pagination
     */
    async processImages(images, page = 1, pageSize = 50) {
        const data = {
            images,
            page,
            pageSize
        };
        
        // Environment-aware endpoint construction
        // Local: http://localhost:5000 + /api/process-images
        // AWS: https://domain.com/api + /process-images  
        const endpoint = this.baseURL.includes('localhost') ? '/api/process-images' : '/process-images';
        
        return this.makeRequest(endpoint, {
            method: 'POST',
            data
        });
    }
    
    /**
     * Check AI Vision status
     * @returns {Promise<Object>} Status information
     */
    async getAIVisionStatus() {
        return this.makeRequest('/ai-vision-status');
    }
    
    async getUserProfile(userId) {
        return this.makeRequest(`/users/${userId}/profile`);
    }
    
    async updateUserProfile(userId, profileData) {
        return this.makeRequest(`/users/${userId}/profile`, {
            method: 'PUT',
            data: profileData
        });
    }
    
    async getNotifications(userId, unreadOnly = false) {
        return this.makeRequest('/notifications', {
            params: {
                user_id: userId,
                unread_only: unreadOnly
            }
        });
    }
    
    async markNotificationAsRead(notificationId) {
        return this.makeRequest(`/notifications/${notificationId}/read`, {
            method: 'PUT'
        });
    }
    
    // Admin-specific methods
    
    async getSystemMetrics() {
        return this.makeRequest('/admin/metrics');
    }
    
    async getUserManagement(options = {}) {
        return this.makeRequest('/admin/users', {
            params: options
        });
    }
    
    async getAuditLogs(options = {}) {
        return this.makeRequest('/admin/audit', {
            params: options
        });
    }
    
    async updateSystemSettings(settings) {
        return this.makeRequest('/admin/settings', {
            method: 'PUT',
            data: settings
        });
    }
    
    // Utility methods
    
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        this.defaultHeaders['Authorization'] = `Bearer ${apiKey}`;
        localStorage.setItem('api_key', apiKey);
    }
    
    clearApiKey() {
        this.apiKey = '';
        delete this.defaultHeaders['Authorization'];
        localStorage.removeItem('api_key');
    }
    
    setBaseURL(baseURL) {
        this.baseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    }
    
    setTimeout(timeout) {
        this.timeout = timeout;
    }
    
    setRetryConfig(attempts, delay) {
        this.retryAttempts = attempts;
        this.retryDelay = delay;
    }
    
    // Health check
    async healthCheck() {
        try {
            const response = await this.makeRequest('/health', {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
    
    // Cancel all pending requests
    cancelAllRequests() {
        this.requestQueue.clear();
    }
    
    // Get request queue status
    getQueueStatus() {
        return {
            pending: this.requestQueue.size,
            isOnline: this.isOnline
        };
    }
    
    // Mock response helper for development
    mockResponse(data, delay = 1000) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    data,
                    status: 200,
                    statusText: 'OK',
                    headers: {}
                });
            }, delay);
        });
    }
    
    // Batch requests
    async batchRequests(requests) {
        const promises = requests.map(({ endpoint, options }) => 
            this.makeRequest(endpoint, options).catch(error => ({ error }))
        );
        
        return Promise.all(promises);
    }
    
    // Upload progress tracking
    async uploadWithProgress(file, endpoint, onProgress) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            
            const xhr = new XMLHttpRequest();
            
            // Track upload progress
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete, e.loaded, e.total);
                }
            });
            
            // Handle completion
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve({
                            data: response,
                            status: xhr.status,
                            statusText: xhr.statusText
                        });
                    } catch (error) {
                        resolve({
                            data: xhr.responseText,
                            status: xhr.status,
                            statusText: xhr.statusText
                        });
                    }
                } else {
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            });
            
            // Handle errors
            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });
            
            // Configure request
            const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
            xhr.open('POST', url);
            
            // Set headers (except Content-Type for FormData)
            Object.entries(this.defaultHeaders).forEach(([key, value]) => {
                if (key !== 'Content-Type') {
                    xhr.setRequestHeader(key, value);
                }
            });
            
            // Send request
            xhr.send(formData);
        });
    }

    // REMOVED: Chunked processing methods to eliminate 404 errors
    // All processing now uses the optimized regular processing with backend batch optimization
    
    // REMOVED: Chunked processing method to eliminate 404 errors
    // All processing now uses optimized regular processing with backend batch optimization
    
    // Read file content
    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    // Parse file content (CSV/Excel)
    parseFileContent(content) {
        // Simple CSV parsing - can be enhanced for Excel
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).filter(line => line.trim()).map(line => {
            const values = line.split(',').map(v => v.trim());
            const record = {};
            headers.forEach((header, index) => {
                record[header] = values[index] || '';
            });
            return record;
        });
    }
}

export default ApiService;
