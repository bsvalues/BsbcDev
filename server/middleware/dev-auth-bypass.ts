import { Request, Response, NextFunction } from 'express';
import { log } from '../vite';

// Create a user type similar to what passport would provide
export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  tenantId: number;
  isAdmin: boolean;
}

// Extend the Express Request type to include auth properties
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      role: string;
      tenantId: number;
      isAdmin: boolean;
    }
  }
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
      email: 'dev@example.com',
      role: 'admin',
      tenantId: 1,
      isAdmin: true
    };
    
    // Override isAuthenticated method
    // We use defineProperty to avoid TypeScript errors while still modifying the function behavior
    const originalIsAuthenticated = req.isAuthenticated?.bind(req) || (() => false);
    req.isAuthenticated = function() { return true; } as any;
    
    // Continue with request
    next();
  } else {
    // In production, don't modify the request
    next();
  }
}