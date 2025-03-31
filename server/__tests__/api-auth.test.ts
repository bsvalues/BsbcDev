import express, { Express } from 'express';
import request from 'supertest';
import { devAuthBypass } from '../middleware/dev-auth-bypass';

describe('API Authentication Testing', () => {
  let app: Express;
  
  beforeEach(() => {
    // Create a new Express app for each test
    app = express();
    
    // Apply dev authentication bypass middleware
    app.use(devAuthBypass);
    
    // Add a test protected route
    app.get('/api/protected', (req, res) => {
      if (req.isAuthenticated()) {
        res.status(200).json({ 
          message: 'Authenticated access successful',
          user: req.user
        });
      } else {
        res.status(401).json({ message: 'Authentication required' });
      }
    });
  });
  
  test('should allow access to protected routes in development mode', async () => {
    // Set environment to development
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    // Make a request to the protected route
    const response = await request(app).get('/api/protected');
    
    // Check response
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Authenticated access successful');
    expect(response.body.user).toEqual({
      id: 1,
      username: 'dev-admin',
      email: 'dev@example.com',
      role: 'admin',
      tenantId: 1,
      isAdmin: true
    });
    
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });
  
  test('should deny access to protected routes in production mode', async () => {
    // Set environment to production
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    // Make a request to the protected route
    const response = await request(app).get('/api/protected');
    
    // Check response
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Authentication required');
    
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });
});