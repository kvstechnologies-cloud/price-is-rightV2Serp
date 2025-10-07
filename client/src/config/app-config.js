// App Configuration for Insurance Pricing System V2
// Simplified configuration for App Runner deployment

export const appConfig = {
    // Environment detection
    ENVIRONMENT: 'dev',
    DEVELOPMENT_MODE: false,
    
    // API Configuration - will be set dynamically based on environment
    API_BASE_URL: '',
    LOCAL_API_URL: 'http://localhost:5000', // No /api suffix - endpoints will include /api
    
    // Timeouts and limits
    API_TIMEOUT: 30000,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    
    // Supported file types
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

// Detect environment and update configuration
const isLocalDev = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const isAppRunner = typeof window !== 'undefined' && 
    window.location.hostname && 
    window.location.hostname.includes('awsapprunner.com');

if (isLocalDev) {
    appConfig.DEVELOPMENT_MODE = true;
    appConfig.ENVIRONMENT = 'dev';
    appConfig.API_BASE_URL = appConfig.LOCAL_API_URL; // This will be 'http://localhost:5000'
} else if (isAppRunner) {
    appConfig.DEVELOPMENT_MODE = false;
    appConfig.ENVIRONMENT = 'prod';
    appConfig.API_BASE_URL = `https://${window.location.hostname}/api`;
} else {
    // Fallback for other production environments
    appConfig.DEVELOPMENT_MODE = false;
    appConfig.ENVIRONMENT = 'prod';
    appConfig.API_BASE_URL = 'https://3981g42ga1.execute-api.us-east-1.amazonaws.com/dev/api';
}

// Global configuration for backward compatibility
if (typeof window !== 'undefined') {
    // Only set if not already defined (don't override index.html config)
    if (!window.CONFIG) {
        window.CONFIG = {
            API_BASE_URL: appConfig.API_BASE_URL,
            ENVIRONMENT: appConfig.ENVIRONMENT,
            DEVELOPMENT_MODE: appConfig.DEVELOPMENT_MODE
        };
    } else {
        // Update other properties but preserve API_BASE_URL from index.html
        window.CONFIG.ENVIRONMENT = appConfig.ENVIRONMENT;
        window.CONFIG.DEVELOPMENT_MODE = appConfig.DEVELOPMENT_MODE;
    }
}
