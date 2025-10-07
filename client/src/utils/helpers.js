// Utility helper functions for the application

/**
 * Debounce function to limit how often a function can be called
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function to limit execution frequency
 */
export function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @param {string} locale - Locale for formatting
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency
    }).format(amount);
}

/**
 * Format date in human-readable format
 * @param {Date|string} date - The date to format
 * @param {string} format - Format type ('relative', 'short', 'long', 'time')
 * @returns {string} - Formatted date string
 */
export function formatDate(date, format = 'relative') {
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    
    switch (format) {
        case 'relative':
            return formatRelativeTime(dateObj, now);
        case 'short':
            return dateObj.toLocaleDateString();
        case 'long':
            return dateObj.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        case 'time':
            return dateObj.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
            });
        case 'datetime':
            return dateObj.toLocaleString();
        default:
            return dateObj.toString();
    }
}

/**
 * Format relative time (e.g., "2 minutes ago")
 * @param {Date} date - The date to compare
 * @param {Date} now - The current date
 * @returns {string} - Relative time string
 */
function formatRelativeTime(date, now) {
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
    return `${years} year${years !== 1 ? 's' : ''} ago`;
}

/**
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted percentage string
 */
export function formatPercentage(value, decimals = 1) {
    return (value * 100).toFixed(decimals) + '%';
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get appropriate file icon class based on file type
 */
export function getFileIcon(mimeType) {
    if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'fas fa-file-word';
    if (mimeType.includes('image')) return 'fas fa-file-image';
    if (mimeType.includes('text')) return 'fas fa-file-alt';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel';
    return 'fas fa-file';
}

/**
 * Generate a unique ID
 */
export function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * Generate UUID v4
 * @returns {string} - UUID v4 string
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Validate email format
 */
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Check if object is empty
 * @param {any} value - Value to check
 * @returns {boolean} - Whether value is empty
 */
export function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
export function capitalizeFirst(str) {
    if (typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Capitalize string (first letter uppercase, rest lowercase)
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
export function capitalize(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to title case
 * @param {string} str - String to convert
 * @returns {string} - Title case string
 */
export function toTitleCase(str) {
    return str.replace(/\w\S*/g, txt => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add when truncated
 * @returns {string} - Truncated text
 */
export function truncateText(text, maxLength = 100, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Get query parameter value
 * @param {string} param - Parameter name
 * @returns {string|null} - Parameter value or null
 */
export function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Set query parameter
 * @param {string} param - Parameter name
 * @param {string} value - Parameter value
 */
export function setQueryParam(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Whether copy was successful
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const result = document.execCommand('copy');
            document.body.removeChild(textArea);
            return result;
        }
    } catch (error) {
        console.error('Failed to copy text to clipboard:', error);
        return false;
    }
}

/**
 * Show notification
 * @param {string} message - Message to display
 * @param {string} type - Notification type (info, success, warning, error)
 * @param {number} duration - Duration in milliseconds
 * @returns {HTMLElement} - Notification element
 */
export function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 10000;
    `;

    const colors = {
        info: '#2196F3',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, duration);

    return notification;
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Sanitize string for use in CSS classes or IDs
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeForCSS(str) {
    return str.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} - Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Get browser information
 * @returns {object} - Browser information
 */
export function getBrowserInfo() {
    const ua = navigator.userAgent;
    const browsers = {
        chrome: /chrome/i,
        safari: /safari/i,
        firefox: /firefox/i,
        edge: /edge/i,
        ie: /msie|trident/i
    };
    
    for (const [name, regex] of Object.entries(browsers)) {
        if (regex.test(ua)) {
            return { name, userAgent: ua };
        }
    }
    
    return { name: 'unknown', userAgent: ua };
}

/**
 * Check if device is mobile
 * @returns {boolean} - Whether device is mobile
 */
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Get device type
 * @returns {string} - Device type (mobile, tablet, desktop)
 */
export function getDeviceType() {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) return 'mobile';
    return 'desktop';
}

/**
 * Download data as file
 * @param {string|Blob} data - Data to download
 * @param {string} filename - Name of the file
 * @param {string} mimeType - MIME type of the file
 */
export function downloadFile(data, filename, mimeType = 'text/plain') {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Validate insurance-specific data
 */
export const insuranceValidators = {
    /**
     * Validate Social Security Number
     * @param {string} ssn - SSN to validate
     * @returns {boolean} - Whether SSN is valid
     */
    ssn: (ssn) => {
        const ssnRegex = /^(?!666|000|9\d{2})\d{3}-?(?!00)\d{2}-?(?!0{4})\d{4}$/;
        return ssnRegex.test(ssn.replace(/\D/g, ''));
    },
    
    /**
     * Validate VIN (Vehicle Identification Number)
     * @param {string} vin - VIN to validate
     * @returns {boolean} - Whether VIN is valid
     */
    vin: (vin) => {
        const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
        return vinRegex.test(vin.toUpperCase());
    },
    
    /**
     * Validate license plate
     * @param {string} plate - License plate to validate
     * @returns {boolean} - Whether license plate format is valid
     */
    licensePlate: (plate) => {
        // Basic validation - varies by state
        const plateRegex = /^[A-Z0-9]{2,8}$/;
        return plateRegex.test(plate.toUpperCase().replace(/[\s-]/g, ''));
    },
    
    /**
     * Validate policy number
     * @param {string} policyNumber - Policy number to validate
     * @returns {boolean} - Whether policy number format is valid
     */
    policyNumber: (policyNumber) => {
        const policyRegex = /^[A-Z0-9]{6,20}$/;
        return policyRegex.test(policyNumber.toUpperCase().replace(/[\s-]/g, ''));
    }
}

/**
 * Insurance utility functions
 */
export const insuranceUtils = {
    /**
     * Calculate age from date of birth
     * @param {Date|string} birthDate - Date of birth
     * @returns {number} - Age in years
     */
    calculateAge: (birthDate) => {
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    },
    
    /**
     * Format policy number for display
     * @param {string} policyNumber - Raw policy number
     * @returns {string} - Formatted policy number
     */
    formatPolicyNumber: (policyNumber) => {
        const clean = policyNumber.replace(/\D/g, '');
        return clean.replace(/(.{4})/g, '$1-').replace(/-$/, '');
    },
    
    /**
     * Calculate years of driving experience
     * @param {Date|string} licenseDate - Date license was obtained
     * @returns {number} - Years of experience
     */
    calculateDrivingExperience: (licenseDate) => {
        const license = new Date(licenseDate);
        const today = new Date();
        return Math.max(0, today.getFullYear() - license.getFullYear());
    },
    
    /**
     * Determine risk category based on age
     * @param {number} age - Person's age
     * @returns {string} - Risk category
     */
    getRiskCategory: (age) => {
        if (age < 25) return 'high';
        if (age < 65) return 'standard';
        return 'senior';
    }
}

/**
 * Local storage utilities with error handling
 */
export const storage = {
    /**
     * Get item from localStorage
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if key doesn't exist
     * @returns {any} - Stored value or default
     */
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    },
    
    /**
     * Set item in localStorage
     * @param {string} key - Storage key
     * @param {any} value - Value to store
     * @returns {boolean} - Whether storage was successful
     */
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to localStorage:', error);
            return false;
        }
    },
    
    /**
     * Remove item from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} - Whether removal was successful
     */
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },
    
    /**
     * Clear all localStorage
     * @returns {boolean} - Whether clear was successful
     */
    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
}

/**
 * URL utilities
 */
export const urlUtils = {
    /**
     * Get query parameter value
     * @param {string} name - Parameter name
     * @param {string} url - URL to parse (defaults to current URL)
     * @returns {string|null} - Parameter value or null
     */
    getParam: (name, url = window.location.href) => {
        const urlObj = new URL(url);
        return urlObj.searchParams.get(name);
    },
    
    /**
     * Set query parameter
     * @param {string} name - Parameter name
     * @param {string} value - Parameter value
     * @param {boolean} pushState - Whether to update browser history
     */
    setParam: (name, value, pushState = true) => {
        const url = new URL(window.location);
        url.searchParams.set(name, value);
        
        if (pushState) {
            window.history.pushState({}, '', url);
        } else {
            window.history.replaceState({}, '', url);
        }
    },
    
    /**
     * Remove query parameter
     * @param {string} name - Parameter name
     * @param {boolean} pushState - Whether to update browser history
     */
    removeParam: (name, pushState = true) => {
        const url = new URL(window.location);
        url.searchParams.delete(name);
        
        if (pushState) {
            window.history.pushState({}, '', url);
        } else {
            window.history.replaceState({}, '', url);
        }
    }
}

// Legacy exports for backward compatibility
export const getQueryParam = getQueryParam;
export const setQueryParam = setQueryParam;
export const isValidEmail = validateEmail;
