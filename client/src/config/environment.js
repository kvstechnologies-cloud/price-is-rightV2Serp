
// Environment configuration

class Environment {
    constructor() {
        this.config = {
            API_BASE_URL: window.location.origin + '/api',
            DEVELOPMENT_MODE: true,
            API_TIMEOUT: 30000,
            MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
            SUPPORTED_FILE_TYPES: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'text/csv',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp'
            ]
        };
    }

    get(key) {
        return this.config[key];
    }

    isDevelopment() {
        return this.config.DEVELOPMENT_MODE;
    }

    hasApiKeys() {
        // Check if API keys are configured
        return false; // Placeholder for now
    }

    getApiBaseUrl() {
        return this.config.API_BASE_URL;
    }

    getMaxFileSize() {
        return this.config.MAX_FILE_SIZE;
    }

    getSupportedFileTypes() {
        return this.config.SUPPORTED_FILE_TYPES;
    }
}

// Create singleton instance
const environment = new Environment();

export { environment, Environment };
