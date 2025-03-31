import { Request, Response, NextFunction } from 'express';
import { devAuthBypass, User } from '../dev-auth-bypass';

// Mock the log function from vite.ts
jest.mock('../../vite', () => ({
  log: jest.fn()
}));

describe('Development Authentication Bypass Middleware', () => {
  // Mock request, response, and next function
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  
  beforeEach(() => {
    // Reset mocks before each test
    req = {
      path: '/api/test',
      user: undefined,
      isAuthenticated: jest.fn().mockReturnValue(false)
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      redirect: jest.fn()
    };
    
    next = jest.fn();
  });
  
  test('should bypass authentication in development mode', () => {
    // Set environment to development
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    // Call the middleware
    devAuthBypass(req as Request, res as Response, next);
    
    // Expectations
    expect(req.user).toBeDefined();
    expect(req.user).toEqual({
      id: 1,
      username: 'dev-admin',
      email: 'dev@example.com',
      role: 'admin',
      tenantId: 1,
      isAdmin: true
    });
    
    // Check that isAuthenticated is now a function that returns true
    expect(typeof req.isAuthenticated).toBe('function');
    
    // Check if we can call it safely by using the any type assertion
    expect((req.isAuthenticated as any)?.()).toBe(true);
    
    // Check that next() was called
    expect(next).toHaveBeenCalled();
    
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });
  
  test('should not bypass authentication in production mode', () => {
    // Set environment to production
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    // Store initial state
    const originalUser = req.user;
    const originalIsAuthenticated = req.isAuthenticated;
    
    // Call the middleware
    devAuthBypass(req as Request, res as Response, next);
    
    // Expectations
    expect(req.user).toBe(originalUser);
    expect(req.isAuthenticated).toBe(originalIsAuthenticated);
    
    // Check that next() was called
    expect(next).toHaveBeenCalled();
    
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });
});