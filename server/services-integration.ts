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
import { createMCPService } from './services/mcp-service';
import { TenantTestService } from './services/tenant-test-service';
import { createPredictiveValuationService } from './services/predictive-valuation';
import { createAppealRecommendationService } from './services/appeal-recommendation';
import { createWorkflowEngineService } from './services/workflow-engine';
import { createMarketIntelligenceService } from './services/market-intelligence';
import { log } from './vite';
// Auth bypass is now handled in auth-middleware.ts
import { hashPassword, comparePassword, needsPasswordMigration } from './utils/password-utils';

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
  
  // Initialize dev mode
  if (typeof global.useDevMode === 'undefined') {
    // By default, enable dev mode in development environment
    global.useDevMode = process.env.NODE_ENV === 'development' ? true : false;
    log(`Dev mode initialized to: ${global.useDevMode}`, 'services-integration');
  }
  
  // Note: Authentication is now fully bypassed in auth-middleware.ts
  // so we don't need the dev bypass middleware separately

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          log(`Authentication failed: Username '${username}' not found`, 'passport');
          return done(null, false, { message: 'Incorrect username' });
        }
        
        let isValidPassword = false;
        
        // Check if the password needs migration (is stored in plaintext)
        if (needsPasswordMigration(user.password)) {
          // Temporary support for plaintext passwords during migration
          isValidPassword = user.password === password;
          
          if (isValidPassword) {
            // Migrate the plaintext password to a hashed one
            log(`Migrating plaintext password for user: ${username}`, 'passport');
            const hashedPassword = await hashPassword(password);
            await storage.updateUser(user.id, { password: hashedPassword });
          }
        } else {
          // Verify against hashed password
          isValidPassword = await comparePassword(password, user.password);
        }
        
        if (!isValidPassword) {
          log(`Authentication failed: Incorrect password for user '${username}'`, 'passport');
          return done(null, false, { message: 'Incorrect password' });
        }
        
        log(`Authentication successful for user: ${username}`, 'passport');
        return done(null, user);
      } catch (err: any) {
        log(`Authentication error: ${err.message}`, 'passport');
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
  apiGateway.registerService('mcp', 'http://localhost:5000/internal/mcp');
  apiGateway.registerService('tenants/test', 'http://localhost:5000/internal/tenant-test');
  
  // Register intelligent services with API Gateway
  apiGateway.registerService('predictive-valuation', 'http://localhost:5000/internal/predictive-valuation');
  apiGateway.registerService('appeal-recommendation', 'http://localhost:5000/internal/appeal-recommendation');
  apiGateway.registerService('workflow-engine', 'http://localhost:5000/internal/workflow-engine');
  apiGateway.registerService('market-intelligence', 'http://localhost:5000/internal/market-intelligence');

  // Create and setup services
  const authService = createAuthService(passport);
  const tenantService = createTenantService();
  const subscriptionService = createSubscriptionService();
  const userService = createUserService();
  const planService = createPlanService();
  const propertyService = createPropertyService();
  const mcpService = createMCPService();
  const tenantTestService = new TenantTestService();
  
  // Create intelligent services
  const predictiveValuationService = createPredictiveValuationService(storage);
  const appealRecommendationService = createAppealRecommendationService(storage);
  const workflowEngineService = createWorkflowEngineService(storage);
  const marketIntelligenceService = createMarketIntelligenceService(storage);

  // Register internal routes for services
  app.use('/internal/auth', authService.getRouter());
  app.use('/internal/tenants', tenantService.getRouter());
  app.use('/internal/subscriptions', subscriptionService.getRouter());
  app.use('/internal/users', userService.getRouter());
  app.use('/internal/plans', planService.getRouter());
  app.use('/internal/properties', propertyService.getRouter());
  
  // Register the MCP service
  app.use('/internal/mcp', mcpService.getRouter());
  
  // Register the Tenant Test service
  app.use('/internal/tenant-test', tenantTestService.getRouter());
  
  // Register intelligent services
  app.use('/internal/predictive-valuation', predictiveValuationService.getRouter());
  app.use('/internal/appeal-recommendation', appealRecommendationService.getRouter());
  app.use('/internal/workflow-engine', workflowEngineService.getRouter());
  app.use('/internal/market-intelligence', marketIntelligenceService.getRouter());
  
  // Direct access to tenant test service for the frontend
  // This bypasses the API gateway for testing purposes
  app.use('/api/tenants/test', tenantTestService.getRouter());
  
  // Add a test route for development that doesn't require authentication
  if (process.env.NODE_ENV === 'development') {
    app.post('/test-api/mcp/workflows/:name/execute', async (req, res) => {
      try {
        const { name } = req.params;
        log(`TEST API - Executing workflow: ${name} (no auth required)`, 'services-integration');
        
        // Get workflow from storage
        const workflow = await storage.getMcpWorkflowByName(name);
        
        if (!workflow) {
          return res.status(404).json({ error: `Workflow '${name}' not found` });
        }
        
        // Execute the workflow directly using the MCP service
        const result = await mcpService.executeWorkflow(workflow, req.body);
        
        res.json(result);
      } catch (error: any) {
        log(`TEST API - Error executing workflow: ${error.message}`, 'services-integration');
        res.status(500).json({ error: error.message });
      }
    });
    
    log('Development mode: Test API routes enabled for MCP service', 'services-integration');
  }

  // Register API Gateway routes
  app.use('/api-gateway', apiGateway.getRouter());

  // Start health checks for microservices
  apiGateway.startHealthChecks();

  // Provide compatibility with existing routes
  // These will be gradually migrated to the API Gateway
  
  // Auth routes
  app.get('/api/auth/status', (req, res) => {
    // Development mode bypass (using our toggle)
    if (process.env.NODE_ENV === 'development' && global.useDevMode !== false) {
      log(`DEV MODE: Auth bypass for /api/auth/status`, 'services-integration');
      const adminUser = {
        id: 1,
        username: 'dev-admin',
        email: 'dev@example.com',
        role: 'admin',
        tenantId: 1,
        isAdmin: true
      };
      return res.json({ authenticated: true, user: adminUser });
    }
    
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
    // Development mode bypass
    if (process.env.NODE_ENV === 'development' && global.useDevMode !== false) {
      log(`DEV MODE: Auth bypass for /api/users/current`, 'services-integration');
      return res.json({
        id: 1,
        username: 'dev-admin',
        email: 'dev@example.com',
        role: 'admin',
        tenantId: 1,
        isAdmin: true
      });
    }
    
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
    // Development mode bypass
    if (process.env.NODE_ENV === 'development' && global.useDevMode !== false) {
      log(`DEV MODE: Auth bypass for /api/tenants`, 'services-integration');
      try {
        const tenants = await storage.getAllTenants();
        return res.json(tenants);
      } catch (error: any) {
        log(`Legacy API - Error fetching tenants: ${error.message}`, 'routes');
        return res.status(500).json({ message: 'Failed to fetch tenants' });
      }
    }
    
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

  // Subscription routes
  app.get('/api/subscriptions', async (req, res) => {
    try {
      // Forward to subscription service
      const response = await fetch('http://localhost:5000/internal/subscriptions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      log(`Legacy API - Error fetching subscriptions: ${error.message}`, 'routes');
      res.status(500).json({ message: 'Failed to fetch subscriptions' });
    }
  });


  
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // Development mode environment endpoints
  app.get('/api/env', (req, res) => {
    res.json({
      nodeEnv: process.env.NODE_ENV,
      useDevMode: global.useDevMode !== false,
      devAutoLogin: process.env.DEV_AUTO_LOGIN === 'true'
    });
  });
  
  app.post('/api/env/toggle-mode', (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ 
        error: 'Cannot toggle dev mode in production' 
      });
    }
    
    // Toggle the dev mode
    global.useDevMode = global.useDevMode === false ? true : false;
    
    log(`Development mode toggled to: ${global.useDevMode}`, 'services-integration');
    
    res.json({
      message: `Development mode ${global.useDevMode ? 'enabled' : 'disabled'}`,
      useDevMode: global.useDevMode
    });
  });

  // MCP admin routes
  app.get('/api/mcp/services', (req, res) => {
    // Development mode bypass
    if (process.env.NODE_ENV === 'development' && global.useDevMode !== false) {
      log(`DEV MODE: Auth bypass for /api/mcp/services`, 'services-integration');
      const serviceStatus = mcp.getServiceStatus();
      return res.json(serviceStatus);
    }
    
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
  
  // MCP Functions and Workflows routes
  app.get('/api/mcp/functions', async (req, res) => {
    try {
      const functions = await storage.getAllMcpFunctions();
      res.json(functions);
    } catch (error: any) {
      log(`Legacy API - Error fetching MCP functions: ${error.message}`, 'routes');
      res.status(500).json({ message: 'Failed to fetch MCP functions' });
    }
  });
  
  app.post('/api/mcp/functions', async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const newFunction = await storage.createMcpFunction(req.body);
      log(`Created new MCP function: ${newFunction.name}`, 'routes');
      res.status(201).json(newFunction);
    } catch (error: any) {
      log(`Error creating MCP function: ${error.message}`, 'routes');
      res.status(500).json({ message: 'Failed to create MCP function' });
    }
  });
  
  app.get('/api/mcp/workflows', async (req, res) => {
    try {
      const workflows = await storage.getAllMcpWorkflows();
      res.json(workflows);
    } catch (error: any) {
      log(`Legacy API - Error fetching MCP workflows: ${error.message}`, 'routes');
      res.status(500).json({ message: 'Failed to fetch MCP workflows' });
    }
  });
  
  app.post('/api/mcp/workflows', async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const newWorkflow = await storage.createMcpWorkflow(req.body);
      log(`Created new MCP workflow: ${newWorkflow.name}`, 'routes');
      res.status(201).json(newWorkflow);
    } catch (error: any) {
      log(`Error creating MCP workflow: ${error.message}`, 'routes');
      res.status(500).json({ message: 'Failed to create MCP workflow' });
    }
  });
  
  app.post('/api/mcp/functions/execute/:functionName', async (req, res) => {
    try {
      const response = await fetch('http://localhost:5000/internal/mcp/function/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          functionName: req.params.functionName,
          parameters: req.body
        }),
      });
      
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      log(`Error executing MCP function: ${error.message}`, 'routes');
      res.status(500).json({ message: 'Failed to execute MCP function' });
    }
  });
  
  // Add test workflow execution endpoint for development only
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/mcp/test/workflows/:name/execute', async (req, res) => {
      try {
        log(`Legacy API - Executing test workflow: ${req.params.name}`, 'routes');
        
        const response = await fetch(`http://localhost:5000/internal/mcp/test/workflows/${req.params.name}/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(req.body),
        });
        
        const data = await response.json();
        res.status(response.status).json(data);
      } catch (error: any) {
        log(`Error executing test MCP workflow: ${error.message}`, 'routes');
        res.status(500).json({ message: 'Failed to execute test MCP workflow' });
      }
    });
  }
  
  // Regular workflow execution endpoint with authentication
  app.post('/api/mcp/workflows/:name/execute', async (req, res) => {
    try {
      log(`Legacy API - Executing workflow: ${req.params.name}`, 'routes');
      
      // For development/testing only - create a temporary user session if not authenticated
      let authenticated = req.isAuthenticated();
      if (!authenticated && process.env.NODE_ENV === 'development' && global.useDevMode !== false) {
        log('Dev mode - Creating temporary user session for workflow execution', 'routes');
        await new Promise<void>((resolve) => {
          req.login({ id: 1, role: 'admin', tenantId: 1 }, () => {
            resolve();
          });
        });
        authenticated = true;
      }
      
      if (!authenticated) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const response = await fetch(`http://localhost:5000/internal/mcp/workflows/${req.params.name}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': req.headers.cookie || ''
        },
        body: JSON.stringify(req.body),
      });
      
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      log(`Error executing MCP workflow: ${error.message}`, 'routes');
      res.status(500).json({ message: 'Failed to execute MCP workflow' });
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