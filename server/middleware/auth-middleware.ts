import { Request, Response, NextFunction } from 'express';
import { log } from '../vite';
import { formatError } from '../utils/error-handler';

/**
 * Middleware to check if user is authenticated
 * Redirects to login page or returns 401 for API requests if not authenticated
 * 
 * In development mode, this will completely bypass authentication checks
 * and always add a mock admin user to the request
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Development mode bypass - ALWAYS allow access without checking anything
  if (process.env.NODE_ENV === 'development') {
    log(`DEV MODE: Complete auth bypass for ${req.path}`, 'auth-middleware');
    
    // Always create a mock user for the request
    req.user = {
      id: 1,
      username: 'dev-admin',
      email: 'dev@example.com',
      role: 'admin',
      tenantId: 1,
      isAdmin: true
    };
    
    // Override isAuthenticated method to always return true
    req.isAuthenticated = function() { return true; } as any;
    
    return next();
  }

  // Normal authentication check for production
  if (req.isAuthenticated()) {
    return next();
  }

  // Check if this is an API request
  if (req.path.startsWith('/api/') || req.path.startsWith('/internal/')) {
    log(`Unauthorized access attempt to ${req.path}`, 'auth-middleware');
    res.status(401).json(formatError({
      message: 'Authentication required',
      status: 401,
      code: 'UNAUTHORIZED'
    }));
  } else {
    // For non-API requests, redirect to login page
    log(`Redirecting unauthenticated user to login page from ${req.path}`, 'auth-middleware');
    res.redirect('/login');
  }
}

/**
 * Middleware to check if user has admin role
 * Returns 403 if user is not an admin
 * 
 * In development mode, this will completely bypass admin role checks
 * and always add a mock admin user to the request
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  // Development mode bypass - ALWAYS allow access without checking anything
  if (process.env.NODE_ENV === 'development') {
    log(`DEV MODE: Complete admin access granted for ${req.path}`, 'auth-middleware');
    
    // Always create a mock admin user for the request
    req.user = {
      id: 1,
      username: 'dev-admin',
      email: 'dev@example.com',
      role: 'admin',
      tenantId: 1,
      isAdmin: true
    };
    
    // Override isAuthenticated method to always return true
    req.isAuthenticated = function() { return true; } as any;
    
    return next();
  }
  
  if (!req.isAuthenticated()) {
    return requireAuth(req, res, next);
  }
  
  const user = req.user as any;
  if (user?.role !== 'admin') {
    log(`Access denied: User ${user?.username || 'unknown'} attempted to access admin resource ${req.path}`, 'auth-middleware');
    res.status(403).json(formatError({
      message: 'Admin privileges required',
      status: 403,
      code: 'FORBIDDEN'
    }));
  } else {
    next();
  }
}

/**
 * Middleware to check if user has specific tenant access
 * Returns 403 if user doesn't have access to the requested tenant
 * 
 * In development mode, this will completely bypass tenant access checks
 * and always add a mock admin user to the request with full tenant access
 */
export function requireTenantAccess(req: Request, res: Response, next: NextFunction): void {
  // Development mode bypass - ALWAYS allow access without checking anything
  if (process.env.NODE_ENV === 'development') {
    log(`DEV MODE: Complete tenant access granted for ${req.path}`, 'auth-middleware');
    
    // Always create a mock admin user for the request with access to all tenants
    req.user = {
      id: 1,
      username: 'dev-admin',
      email: 'dev@example.com',
      role: 'admin',
      tenantId: 1,
      isAdmin: true
    };
    
    // Override isAuthenticated method to always return true
    req.isAuthenticated = function() { return true; } as any;
    
    return next();
  }
  
  if (!req.isAuthenticated()) {
    return requireAuth(req, res, next);
  }
  
  const tenantId = req.params.tenantId || req.query.tenantId;
  
  if (!tenantId) {
    return next();
  }
  
  const user = req.user as any;
  
  // Check if user has access to this tenant
  if (user.tenantId === parseInt(tenantId as string) || user.role === 'admin') {
    next();
  } else {
    log(`Tenant access denied: User ${user?.username || 'unknown'} attempted to access tenant ${tenantId}`, 'auth-middleware');
    res.status(403).json(formatError({
      message: 'You do not have access to this tenant',
      status: 403,
      code: 'TENANT_ACCESS_DENIED'
    }));
  }
}

/**
 * Helper function to get current user's tenant ID
 * Returns -1 if not authenticated or no tenant assigned
 * 
 * In development mode, returns tenant ID 1 by default
 */
export function getCurrentTenantId(req: Request): number {
  // Development mode default
  if (process.env.NODE_ENV === 'development') {
    return 1; // Default tenant ID for development
  }
  
  if (!req.isAuthenticated()) {
    return -1;
  }
  
  const user = req.user as any;
  return user.tenantId || -1;
}