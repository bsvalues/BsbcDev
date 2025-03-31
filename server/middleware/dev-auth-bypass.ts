import { Request, Response, NextFunction } from 'express';
import { log } from '../vite';

// No need to define a separate interface, we'll use Request directly

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
      email: 'dev@example.com',
      role: 'admin',
      tenantId: 1,
      isAdmin: true
    };
    
    // Override isAuthenticated method
    // We need to redefine it as a function that returns true
    const originalIsAuthenticated = req.isAuthenticated;
    req.isAuthenticated = function() { return true; };
    
    // Continue with request
    next();
  } else {
    // In production, don't modify the request
    next();
  }
}