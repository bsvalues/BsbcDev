import { Express } from 'express';
import { Server } from 'http';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import createMemoryStore from 'memorystore';
import { storage } from './storage';
import { createApiGateway, createMCP } from './api-gateway';
import { createAuthService } from './services/auth-service';
import { createTenantService } from './services/tenant-service';
import { createSubscriptionService } from './services/subscription-service';
import { createUserService } from './services/user-service';
import { createPlanService } from './services/plan-service';
import { createPropertyService } from './services/property-service';
import { log } from './vite';

export async function setupServices(app: Express, server: Server): Promise<void> {
  const MemoryStore = createMemoryStore(session);

  // Set up session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'bsbc-dev-secret',
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: 'Incorrect username' });
        }
        if (user.password !== password) {
          return done(null, false, { message: 'Incorrect password' });
        }
        return done(null, user);
      } catch (err: any) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err: any) {
      done(err);
    }
  });

  // Create API Gateway and MCP
  const apiGateway = createApiGateway();
  const mcp = createMCP(apiGateway);
  
  // Register services with API Gateway
  apiGateway.registerService('auth', 'http://localhost:5000/internal/auth');
  apiGateway.registerService('tenants', 'http://localhost:5000/internal/tenants');
  apiGateway.registerService('users', 'http://localhost:5000/internal/users');
  apiGateway.registerService('plans', 'http://localhost:5000/internal/plans');
  apiGateway.registerService('subscriptions', 'http://localhost:5000/internal/subscriptions');
  apiGateway.registerService('properties', 'http://localhost:5000/internal/properties');

  // Create and setup services
  const authService = createAuthService(passport);
  const tenantService = createTenantService();
  const subscriptionService = createSubscriptionService();
  const userService = createUserService();
  const planService = createPlanService();
  const propertyService = createPropertyService();

  // Register internal routes for services
  app.use('/internal/auth', authService.getRouter());
  app.use('/internal/tenants', tenantService.getRouter());
  app.use('/internal/subscriptions', subscriptionService.getRouter());
  app.use('/internal/users', userService.getRouter());
  app.use('/internal/plans', planService.getRouter());
  app.use('/internal/properties', propertyService.getRouter());

  // Register API Gateway routes
  app.use('/api-gateway', apiGateway.getRouter());

  // Start health checks for microservices
  apiGateway.startHealthChecks();

  // Provide compatibility with existing routes
  // These will be gradually migrated to the API Gateway
  
  // Auth routes
  app.get('/api/auth/status', (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ authenticated: true, user: req.user });
    } else {
      res.json({ authenticated: false });
    }
  });

  app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
    log(`Legacy API - Login successful for user: ${(req.user as any)?.username || 'unknown'}`, 'routes');
    res.json({ message: 'Login successful', user: req.user });
  });

  app.post('/api/auth/logout', (req, res) => {
    const username = (req.user as any)?.username || 'unknown';
    req.logout(() => {
      log(`Legacy API - Logout successful for user: ${username}`, 'routes');
      res.json({ message: 'Logout successful' });
    });
  });

  // User routes
  app.get('/api/users/current', (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      // Forward to user service
      const response = await fetch('http://localhost:5000/internal/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });
      
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      log(`Legacy API - Error creating user: ${error.message}`, 'routes');
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Tenant routes
  app.get('/api/tenants', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error: any) {
      log(`Legacy API - Error fetching tenants: ${error.message}`, 'routes');
      res.status(500).json({ message: 'Failed to fetch tenants' });
    }
  });

  app.post('/api/tenants', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
      // Forward to tenant service
      const response = await fetch('http://localhost:5000/internal/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });
      
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      log(`Legacy API - Error creating tenant: ${error.message}`, 'routes');
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Plan routes
  app.get('/api/plans', async (req, res) => {
    try {
      const plans = await storage.getAllPlans();
      res.json(plans);
    } catch (error: any) {
      log(`Legacy API - Error fetching plans: ${error.message}`, 'routes');
      res.status(500).json({ message: 'Failed to fetch plans' });
    }
  });

  // Environment check route
  app.get('/api/env', (req, res) => {
    res.json({
      environment: process.env.NODE_ENV || 'development',
      devAutoLogin: process.env.DEV_AUTO_LOGIN === 'true',
      devUserId: process.env.DEV_USER_ID || '1'
    });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // MCP admin routes
  app.get('/api/mcp/services', (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const serviceStatus = mcp.getServiceStatus();
    res.json(serviceStatus);
  });

  app.post('/api/mcp/services/:name/enable', (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const serviceName = req.params.name;
    const success = mcp.enableService(serviceName);
    
    if (success) {
      res.json({ message: `Service '${serviceName}' enabled` });
    } else {
      res.status(404).json({ message: `Service '${serviceName}' not found` });
    }
  });

  app.post('/api/mcp/services/:name/disable', (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const serviceName = req.params.name;
    const success = mcp.disableService(serviceName);
    
    if (success) {
      res.json({ message: `Service '${serviceName}' disabled` });
    } else {
      res.status(404).json({ message: `Service '${serviceName}' not found` });
    }
  });

  // Auto-login configuration
  app.post('/api/autologin/config', (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const { enabled, userId } = req.body;
    
    if (typeof enabled === 'boolean') {
      if (enabled) {
        authService.enableAutoLogin();
      } else {
        authService.disableAutoLogin();
      }
      process.env.DEV_AUTO_LOGIN = enabled ? 'true' : 'false';
    }
    
    if (userId && !isNaN(parseInt(userId))) {
      process.env.DEV_USER_ID = userId.toString();
    }
    
    log(`Auto-login config updated: enabled=${process.env.DEV_AUTO_LOGIN}, userId=${process.env.DEV_USER_ID}`, 'routes');
    
    res.json({
      message: 'Auto-login configuration updated',
      config: {
        enabled: process.env.DEV_AUTO_LOGIN === 'true',
        userId: process.env.DEV_USER_ID
      }
    });
  });

  // Auto login middleware for development
  app.use((req, res, next) => {
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.DEV_AUTO_LOGIN === 'true' &&
      !req.isAuthenticated()
    ) {
      req.login({ id: parseInt(process.env.DEV_USER_ID || '1', 10) }, (err) => {
        if (err) {
          return next(err);
        }
        next();
      });
    } else {
      next();
    }
  });

  log('Services setup complete', 'services-integration');
}