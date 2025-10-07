import { Request } from 'express';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Environment variables
const AUDIT_ENABLED = process.env.AUDIT_ENABLED === 'true';

// Default user for development/testing
const DEFAULT_DEV_USER = {
  id: 'dev-user-001',
  email: 'dev@example.com',
  name: 'Development User',
  authProvider: 'dev'
};

/**
 * Extract user information from request
 * Supports both Cognito JWT and dev override headers
 */
export function getUser(req: Request): { id: string; email?: string; name?: string; authProvider?: string } | null {
  if (!AUDIT_ENABLED) {
    return null;
  }

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
      const user = extractUserFromJWT(token);
      if (user) {
        return user;
      }
    } catch (error) {
      console.warn('🔍 Failed to parse JWT token:', error);
    }
  }

  // Check for user info in request object (if middleware has already processed it)
  if (req.user && typeof req.user === 'object' && 'id' in req.user) {
    return req.user as any;
  }

  // Return default dev user if no authentication found (for development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 No auth found, using default dev user');
    return DEFAULT_DEV_USER;
  }

  return null;
}

/**
 * Extract user information from Cognito JWT token
 * This is a simplified implementation - in production you'd want proper JWT verification
 */
function extractUserFromJWT(token: string): { id: string; email?: string; name?: string; authProvider: string } | null {
  try {
    // For now, we'll just decode the JWT payload without verification
    // In production, you should verify the JWT signature and issuer
    const payload = decodeJWTPayload(token);
    
    if (!payload || !payload.sub) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload['cognito:username'],
      authProvider: 'cognito'
    };
  } catch (error) {
    console.warn('🔍 Failed to extract user from JWT:', error);
    return null;
  }
}

/**
 * Decode JWT payload (base64 decode only, no signature verification)
 * This is for development purposes only
 */
function decodeJWTPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('🔍 Failed to decode JWT payload:', error);
    return null;
  }
}

/**
 * Check if request has valid authentication
 */
export function isAuthenticated(req: Request): boolean {
  return getUser(req) !== null;
}

/**
 * Get user ID from request (required for audit operations)
 */
export function getUserId(req: Request): string | null {
  const user = getUser(req);
  return user?.id || null;
}

/**
 * Validate that user has access to a resource
 * This is a basic implementation - extend as needed
 */
export function validateUserAccess(req: Request, resourceUserId: string): boolean {
  const user = getUser(req);
  if (!user) {
    return false;
  }

  // For now, users can only access their own resources
  // In production, you might want role-based access control
  return user.id === resourceUserId;
}
