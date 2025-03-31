import { Request, Response, NextFunction } from 'express';
import { log } from '../vite';
import { formatError } from '../utils/error-handler';

/**
 * Middleware to check if user is authenticated
 * Redirects to login page or returns 401 for API requests if not authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
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
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
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
 */
export function requireTenantAccess(req: Request, res: Response, next: NextFunction): void {
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
 */
export function getCurrentTenantId(req: Request): number {
  if (!req.isAuthenticated()) {
    return -1;
  }
  
  const user = req.user as any;
  return user.tenantId || -1;
}