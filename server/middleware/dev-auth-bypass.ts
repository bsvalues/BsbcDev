import { Request, Response, NextFunction } from 'express';
import { log } from '../vite';

// Define an interface to match Express's type for authenticated requests
interface AuthenticatedRequest extends Request {
  user: any;
  isAuthenticated(): boolean;
}

/**
 * Development authentication bypass middleware
 * This middleware bypasses authentication checks in development environment
 * WARNING: This should never be used in production!
 */
export function devAuthBypass(req: Request, res: Response, next: NextFunction): void {
  // Only apply in development mode
  if (process.env.NODE_ENV === 'development') {
    log(`DEV MODE: Authentication bypassed for ${req.path}`, 'dev-auth-bypass');
    
    // Create a mock user object for the request
    req.user = {
      id: 1,
      username: 'dev-admin',
      role: 'admin',
      tenantId: 1
    };
    
    // Set req.isAuthenticated to return true
    const originalIsAuthenticated = req.isAuthenticated;
    
    // Create a proper TypeScript type predicate function
    req.isAuthenticated = function(this: AuthenticatedRequest): this is AuthenticatedRequest {
      return true;
    };
    
    // Continue with request
    next();
  } else {
    // In production, don't modify the request
    next();
  }
}