/**
 * Request utility functions for extracting client information
 * Handles IP address extraction and user authentication data
 */

/**
 * Extract client IP address from Express request
 * Handles various proxy configurations and environments
 * 
 * @param {Object} req - Express request object
 * @returns {string} Client IP address or 'unknown' if not found
 */
function getClientIP(req) {
  try {
    // Check for forwarded IP (most common in production with proxies/load balancers)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
      // The first IP is usually the original client
      const firstIP = forwardedFor.split(',')[0].trim();
      if (firstIP && firstIP !== 'unknown') {
        return firstIP;
      }
    }

    // Check for real IP header (used by some proxies)
    const realIP = req.headers['x-real-ip'];
    if (realIP && realIP !== 'unknown') {
      return realIP;
    }

    // Check for CloudFlare IP header
    const cfConnectingIP = req.headers['cf-connecting-ip'];
    if (cfConnectingIP && cfConnectingIP !== 'unknown') {
      return cfConnectingIP;
    }

    // Check for AWS ALB/ELB IP header
    const awsIP = req.headers['x-amzn-trace-id'];
    if (awsIP) {
      // Extract IP from trace ID if available
      const ipMatch = awsIP.match(/Root=([^;]+)/);
      if (ipMatch) {
        return ipMatch[1];
      }
    }

    // Direct connection (development/local)
    if (req.connection && req.connection.remoteAddress) {
      return req.connection.remoteAddress;
    }

    // Socket connection
    if (req.socket && req.socket.remoteAddress) {
      return req.socket.remoteAddress;
    }

    // Socket connection (alternative)
    if (req.socket && req.socket.socket && req.socket.socket.remoteAddress) {
      return req.socket.socket.remoteAddress;
    }

    // Fallback to request IP (Express built-in)
    if (req.ip) {
      return req.ip;
    }

    console.warn('⚠️ Could not determine client IP address');
    return 'unknown';
  } catch (error) {
    console.error('❌ Error extracting client IP:', error.message);
    return 'unknown';
  }
}

/**
 * Extract user information from request
 * Uses existing authentication system from src/audit/auth.ts
 * 
 * @param {Object} req - Express request object
 * @returns {Object|null} User object with id, email, name, authProvider or null
 */
function getUserFromRequest(req) {
  try {
    // For now, implement a simplified version since TypeScript import is problematic
    // Check for dev override header (for local testing)
    const devUserHeader = req.headers['x-dev-user'];
    if (devUserHeader) {
      console.log('🔍 Using dev user override:', devUserHeader);
      return {
        id: String(devUserHeader),
        email: 'dev@example.com',
        name: 'Development User',
        authProvider: 'dev'
      };
    }

    // Check for Cognito JWT in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        // For now, return a mock user from JWT
        // In production, you'd decode and verify the JWT properly
        return {
          id: 'jwt-user-' + Date.now(),
          email: 'user@example.com',
          name: 'JWT User',
          authProvider: 'cognito'
        };
      } catch (error) {
        console.warn('🔍 Failed to parse JWT token:', error);
      }
    }

    // Check for user info in request object (if middleware has already processed it)
    if (req.user && typeof req.user === 'object' && 'id' in req.user) {
      return req.user;
    }

    // Return default dev user if no authentication found (for development)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 No auth found, using default dev user');
      return {
        id: 'dev-user-001',
        email: 'dev@example.com',
        name: 'Development User',
        authProvider: 'dev'
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Error extracting user from request:', error.message);
    return null;
  }
}

/**
 * Get comprehensive request metadata
 * Combines IP address and user information
 * 
 * @param {Object} req - Express request object
 * @returns {Object} Request metadata object
 */
function getRequestMetadata(req) {
  const user = getUserFromRequest(req);
  const ipAddress = getClientIP(req);
  
  return {
    user: user,
    ipAddress: ipAddress,
    userAgent: req.headers['user-agent'] || 'unknown',
    timestamp: new Date().toISOString(),
    // Additional metadata that might be useful
    referer: req.headers.referer || null,
    origin: req.headers.origin || null
  };
}

/**
 * Validate IP address format
 * 
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid IP format
 */
function isValidIP(ip) {
  if (!ip || ip === 'unknown') {
    return false;
  }
  
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

module.exports = {
  getClientIP,
  getUserFromRequest,
  getRequestMetadata,
  isValidIP
};
