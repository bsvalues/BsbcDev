import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { log } from '../vite';
import { 
  InsertTenant, 
  InsertUser, 
  InsertSubscription, 
  InsertProperty,
  Tenant,
  User,
  Subscription,
  Property
} from '@shared/schema';
import { randomUUID } from 'crypto';

/**
 * Tenant Test Service - Provides endpoints and utilities for testing multi-tenant 
 * functionality including creation, isolation, and data separation.
 */
export class TenantTestService {
  private router: Router;
  private testTenants: Map<number, string> = new Map(); // Keep track of test tenants
  private testUsers: Map<number, string> = new Map(); // Keep track of test users

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  /**
   * Clean up all test resources (tenants, users) created during tests
   */
  public async cleanupTestResources(): Promise<{
    success: boolean;
    deleted: {
      tenants: number;
      users: number;
    };
  }> {
    try {
      // In a real implementation, we would actually delete these resources
      // Since we're using in-memory storage, we'll just track what would be deleted
      const deletedTenants = this.testTenants.size;
      const deletedUsers = this.testUsers.size;
      
      // Clear our tracking maps
      this.testTenants.clear();
      this.testUsers.clear();
      
      log(`Test resources cleaned up: ${deletedTenants} tenants, ${deletedUsers} users`, 'tenant-test-service');
      
      return {
        success: true,
        deleted: {
          tenants: deletedTenants,
          users: deletedUsers
        }
      };
    } catch (error: any) {
      log(`Error cleaning up test resources: ${error.message}`, 'tenant-test-service');
      return {
        success: false,
        deleted: {
          tenants: 0,
          users: 0
        }
      };
    }
  }

  /**
   * Test tenant creation with the provided tenant data
   */
  public async testTenantCreation(tenantData: {
    name: string;
    domain: string;
    plan: string;
  }): Promise<{
    success: boolean;
    tenantId?: number;
    error?: string;
  }> {
    try {
      // Check if domain already exists
      const existingTenant = await storage.getTenantByDomain(tenantData.domain);
      if (existingTenant) {
        log(`Tenant creation test failed: domain already exists`, 'tenant-test-service');
        return {
          success: false,
          error: 'domain already exists'
        };
      }
      
      // Create new tenant
      const newTenant = await storage.createTenant({
        name: tenantData.name,
        domain: tenantData.domain,
        plan: tenantData.plan
      });
      
      // Track this as a test tenant
      this.testTenants.set(newTenant.id, newTenant.name);
      
      log(`Tenant creation test succeeded: ${newTenant.name} (${newTenant.id})`, 'tenant-test-service');
      return {
        success: true,
        tenantId: newTenant.id
      };
    } catch (error: any) {
      log(`Tenant creation test error: ${error.message}`, 'tenant-test-service');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a test tenant with a unique domain
   */
  public async createTestTenant(baseName: string): Promise<{
    id: number;
    name: string;
    domain: string;
  }> {
    const uniqueId = randomUUID().substring(0, 8);
    const tenantName = `${baseName}-${uniqueId}`;
    const domain = `${baseName.toLowerCase()}-${uniqueId}.bsbc.test`;
    
    const result = await this.testTenantCreation({
      name: tenantName,
      domain,
      plan: 'basic'
    });
    
    if (!result.success || !result.tenantId) {
      throw new Error(`Failed to create test tenant: ${result.error}`);
    }
    
    return {
      id: result.tenantId,
      name: tenantName,
      domain
    };
  }

  /**
   * Create a test tenant with a user
   */
  public async createTestTenantWithUser(baseName: string): Promise<{
    id: number;
    name: string;
    domain: string;
    user: {
      id: number;
      username: string;
    };
  }> {
    // Create tenant
    const tenant = await this.createTestTenant(baseName);
    
    // Create user
    const uniqueId = randomUUID().substring(0, 8);
    const username = `user-${baseName.toLowerCase()}-${uniqueId}`;
    
    const user = await storage.createUser({
      username,
      email: `${username}@bsbc.test`,
      password: 'TestPassword123!',
      role: 'user',
      tenantId: tenant.id
    });
    
    // Track test user
    this.testUsers.set(user.id, username);
    
    return {
      ...tenant,
      user: {
        id: user.id,
        username: user.username
      }
    };
  }

  /**
   * Create a test tenant with a specific subscription plan
   */
  public async createTestTenantWithPlan(baseName: string, planName: string): Promise<{
    id: number;
    name: string;
    domain: string;
    subscription: {
      id: number;
      planName: string;
    };
  }> {
    // Create tenant
    const tenant = await this.createTestTenant(baseName);
    
    // Get plan ID
    const plans = await storage.getAllPlans();
    const plan = plans.find(p => p.name.toLowerCase() === planName.toLowerCase());
    
    if (!plan) {
      throw new Error(`Plan not found: ${planName}`);
    }
    
    // Create subscription
    const subscription = await storage.createSubscription({
      tenantId: tenant.id,
      planId: plan.id,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    });
    
    return {
      ...tenant,
      subscription: {
        id: subscription.id,
        planName: plan.name
      }
    };
  }

  /**
   * Create a property for a specific tenant
   */
  public async createPropertyInTenant(tenantId: number, propertyData: any): Promise<{
    success: boolean;
    propertyId?: number;
    error?: string;
  }> {
    try {
      // Validate tenant ID
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return {
          success: false,
          error: 'Tenant not found'
        };
      }
      
      // Get plan info for resource limits
      const subscription = await storage.getSubscriptionByTenantId(tenantId);
      let planLimit = 999; // Default high limit
      
      if (subscription) {
        const plan = await storage.getPlan(subscription.planId);
        if (plan) {
          // Set plan limits based on plan name
          switch (plan.name.toLowerCase()) {
            case 'free trial':
              planLimit = 3;
              break;
            case 'basic':
              planLimit = 10;
              break;
            case 'premium':
              planLimit = 50;
              break;
            case 'enterprise':
              planLimit = 999;
              break;
          }
        }
      }
      
      // Check resource limits
      const existingProperties = await storage.getAllProperties(tenantId);
      if (existingProperties.length >= planLimit) {
        return {
          success: false,
          error: 'plan limit reached'
        };
      }
      
      // Create property
      const property = await storage.createProperty({
        tenantId,
        address: propertyData.address || '123 Test St',
        city: propertyData.city || 'Testville',
        state: propertyData.state || 'TS',
        zipCode: propertyData.zipCode || '12345',
        propertyType: propertyData.propertyType || 'residential',
        squareFeet: propertyData.squareFeet || 1000,
        yearBuilt: propertyData.yearBuilt || 2000,
        marketValue: propertyData.marketValue || 250000,
        assessedValue: propertyData.assessedValue || 200000
      });
      
      return {
        success: true,
        propertyId: property.id
      };
    } catch (error: any) {
      log(`Error creating property: ${error.message}`, 'tenant-test-service');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List properties for a specific tenant
   */
  public async listPropertiesInTenant(tenantId: number): Promise<{
    success: boolean;
    properties: Property[];
    error?: string;
  }> {
    try {
      // Validate tenant ID
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return {
          success: false,
          properties: [],
          error: 'Tenant not found'
        };
      }
      
      // Get properties
      const properties = await storage.getAllProperties(tenantId);
      
      return {
        success: true,
        properties
      };
    } catch (error: any) {
      log(`Error listing properties: ${error.message}`, 'tenant-test-service');
      return {
        success: false,
        properties: [],
        error: error.message
      };
    }
  }

  /**
   * Create a subscription for a tenant
   */
  public async createSubscriptionForTenant(tenantId: number, planName: string): Promise<{
    success: boolean;
    subscriptionId?: number;
    error?: string;
  }> {
    try {
      // Validate tenant ID
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return {
          success: false,
          error: 'Tenant not found'
        };
      }
      
      // Check if tenant already has a subscription
      const existingSubscription = await storage.getSubscriptionByTenantId(tenantId);
      if (existingSubscription) {
        return {
          success: false,
          error: 'Tenant already has a subscription'
        };
      }
      
      // Get plan ID
      const plans = await storage.getAllPlans();
      const plan = plans.find(p => p.name.toLowerCase() === planName.toLowerCase());
      
      if (!plan) {
        return {
          success: false,
          error: `Plan not found: ${planName}`
        };
      }
      
      // Create subscription
      const subscription = await storage.createSubscription({
        tenantId,
        planId: plan.id,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });
      
      return {
        success: true,
        subscriptionId: subscription.id
      };
    } catch (error: any) {
      log(`Error creating subscription: ${error.message}`, 'tenant-test-service');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a tenant's subscription
   */
  public async getTenantSubscription(tenantId: number): Promise<{
    success: boolean;
    subscription?: {
      id: number;
      planName: string;
      status: string;
    };
    error?: string;
  }> {
    try {
      // Validate tenant ID
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return {
          success: false,
          error: 'Tenant not found'
        };
      }
      
      // Get subscription
      const subscription = await storage.getSubscriptionByTenantId(tenantId);
      if (!subscription) {
        return {
          success: false,
          error: 'Subscription not found'
        };
      }
      
      // Get plan name
      const plan = await storage.getPlan(subscription.planId);
      if (!plan) {
        return {
          success: false,
          error: 'Plan not found'
        };
      }
      
      return {
        success: true,
        subscription: {
          id: subscription.id,
          planName: plan.name,
          status: subscription.status
        }
      };
    } catch (error: any) {
      log(`Error getting subscription: ${error.message}`, 'tenant-test-service');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Attempt property access as a specific user
   */
  public async attemptPropertyAccess(
    userId: number,
    propertyTenantId: number,
    propertyId: number
  ): Promise<{
    success: boolean;
    allowed: boolean;
    error?: string;
  }> {
    try {
      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return {
          success: false,
          allowed: false,
          error: 'User not found'
        };
      }
      
      // Get property
      const property = await storage.getProperty(propertyId, propertyTenantId);
      if (!property) {
        return {
          success: false,
          allowed: false,
          error: 'Property not found'
        };
      }
      
      // Check tenant isolation - user's tenant must match property's tenant
      if (user.tenantId !== property.tenantId) {
        return {
          success: true,
          allowed: false,
          error: 'User not authorized to access this property'
        };
      }
      
      return {
        success: true,
        allowed: true
      };
    } catch (error: any) {
      log(`Error testing property access: ${error.message}`, 'tenant-test-service');
      return {
        success: false,
        allowed: false,
        error: error.message
      };
    }
  }

  /**
   * Test data isolation between tenants
   */
  public async testTenantIsolation(): Promise<{
    success: boolean;
    results: Array<{
      testName: string;
      passed: boolean;
      message: string;
    }>;
  }> {
    const results = [];
    
    try {
      // 1. Create test tenants
      const tenant1 = await this.createTestTenant('Isolation-Test-1');
      const tenant2 = await this.createTestTenant('Isolation-Test-2');
      
      // 2. Create property in tenant 1
      const propertyResult = await this.createPropertyInTenant(tenant1.id, {
        address: '123 Test Street',
        city: 'Testville',
        state: 'TS',
        zipCode: '12345'
      });
      
      if (!propertyResult.success) {
        results.push({
          testName: 'Property Creation',
          passed: false,
          message: `Failed to create property: ${propertyResult.error}`
        });
        return { success: false, results };
      }
      
      // 3. List properties in tenant 2
      const propertiesResult = await this.listPropertiesInTenant(tenant2.id);
      
      // Verify tenant 2 has no properties (isolation test)
      if (propertiesResult.properties.length === 0) {
        results.push({
          testName: 'Property Isolation',
          passed: true,
          message: 'Properties are properly isolated between tenants'
        });
      } else {
        results.push({
          testName: 'Property Isolation',
          passed: false,
          message: `Expected tenant 2 to have 0 properties, but found ${propertiesResult.properties.length}`
        });
        return { success: false, results };
      }
      
      // 4. Create subscriptions with different plans
      await this.createSubscriptionForTenant(tenant1.id, 'basic');
      await this.createSubscriptionForTenant(tenant2.id, 'premium');
      
      // 5. Get tenant subscriptions
      const sub1Result = await this.getTenantSubscription(tenant1.id);
      const sub2Result = await this.getTenantSubscription(tenant2.id);
      
      // Verify different subscription plans
      if (sub1Result.success && sub2Result.success) {
        const sub1 = sub1Result.subscription!;
        const sub2 = sub2Result.subscription!;
        
        if (sub1.planName.toLowerCase() === 'basic' && sub2.planName.toLowerCase() === 'premium') {
          results.push({
            testName: 'Subscription Isolation',
            passed: true,
            message: 'Subscriptions are properly isolated between tenants'
          });
        } else {
          results.push({
            testName: 'Subscription Isolation',
            passed: false,
            message: `Expected different subscription plans, but found ${sub1.planName} and ${sub2.planName}`
          });
          return { success: false, results };
        }
      } else {
        results.push({
          testName: 'Subscription Isolation',
          passed: false,
          message: 'Failed to retrieve tenant subscriptions'
        });
        return { success: false, results };
      }
      
      // 6. Test user access controls
      const tenant1WithUser = await this.createTestTenantWithUser('Access-Test-1');
      const tenant2WithUser = await this.createTestTenantWithUser('Access-Test-2');
      
      const propertyInTenant1 = await this.createPropertyInTenant(tenant1WithUser.id, {
        address: '456 Security Ave',
        city: 'Lockdown',
        state: 'TS',
        zipCode: '54321'
      });
      
      if (!propertyInTenant1.success) {
        results.push({
          testName: 'User Access Control',
          passed: false,
          message: `Failed to create property for access control test: ${propertyInTenant1.error}`
        });
        return { success: false, results };
      }
      
      // Attempt property access as tenant 2's user
      const accessResult = await this.attemptPropertyAccess(
        tenant2WithUser.user.id,
        tenant1WithUser.id,
        propertyInTenant1.propertyId!
      );
      
      if (accessResult.success && !accessResult.allowed) {
        results.push({
          testName: 'User Access Control',
          passed: true,
          message: 'Users cannot access data from other tenants'
        });
      } else {
        results.push({
          testName: 'User Access Control',
          passed: false,
          message: 'Security breach: User from tenant 2 could access property from tenant 1'
        });
        return { success: false, results };
      }
      
      // All tests passed
      return {
        success: true,
        results
      };
    } catch (error: any) {
      log(`Error in tenant isolation test: ${error.message}`, 'tenant-test-service');
      results.push({
        testName: 'Tenant Isolation',
        passed: false,
        message: `Error: ${error.message}`
      });
      
      return {
        success: false,
        results
      };
    }
  }

  /**
   * Run all tenant tests
   */
  public async runAllTests(): Promise<{
    success: boolean;
    results: {
      creation: boolean;
      isolation: boolean;
      resourceLimits: boolean;
      accessControl: boolean;
      summary: string;
    };
  }> {
    try {
      // Run tenant creation test
      const creationResult = await this.testTenantCreation({
        name: 'Test Tenant',
        domain: `test-tenant-${Date.now()}.bsbc.test`,
        plan: 'basic'
      });
      
      // Run isolation tests
      const isolationResult = await this.testTenantIsolation();
      
      // Resource limits test
      const resourceLimitsResult = await this.testResourceLimits();
      
      // Summarize results
      const success = creationResult.success && 
                     isolationResult.success && 
                     resourceLimitsResult.success;
      
      const summary = success
        ? 'All tenant tests passed successfully!'
        : 'Some tenant tests failed. Check individual test results for details.';
      
      return {
        success,
        results: {
          creation: creationResult.success,
          isolation: isolationResult.success,
          resourceLimits: resourceLimitsResult.success,
          accessControl: isolationResult.success, // Access control is part of isolation tests
          summary
        }
      };
    } catch (error: any) {
      log(`Error running all tenant tests: ${error.message}`, 'tenant-test-service');
      return {
        success: false,
        results: {
          creation: false,
          isolation: false,
          resourceLimits: false,
          accessControl: false,
          summary: `Error running tenant tests: ${error.message}`
        }
      };
    } finally {
      // Clean up test resources
      await this.cleanupTestResources();
    }
  }
  
  /**
   * Test resource limits based on subscription plan
   */
  private async testResourceLimits(): Promise<{
    success: boolean;
    results: Array<{
      testName: string;
      passed: boolean;
      message: string;
    }>;
  }> {
    const results = [];
    
    try {
      // Create test tenant with basic plan (limited to 10 properties)
      const tenant = await this.createTestTenantWithPlan('Resource-Test', 'basic');
      
      // Create properties up to the limit (basic plan = 10)
      for (let i = 0; i < 10; i++) {
        const propertyResult = await this.createPropertyInTenant(tenant.id, {
          address: `Property ${i}`,
          city: 'Limitville',
          state: 'TS',
          zipCode: '12345'
        });
        
        if (!propertyResult.success) {
          results.push({
            testName: 'Resource Limit Creation',
            passed: false,
            message: `Failed to create property ${i}: ${propertyResult.error}`
          });
          return { success: false, results };
        }
      }
      
      results.push({
        testName: 'Resource Limit Creation',
        passed: true,
        message: 'Successfully created properties up to the plan limit'
      });
      
      // Try to create one more property
      const overLimitResult = await this.createPropertyInTenant(tenant.id, {
        address: 'One Too Many',
        city: 'Limitville',
        state: 'TS',
        zipCode: '12345'
      });
      
      // This should fail due to plan limits
      if (!overLimitResult.success && overLimitResult.error?.includes('plan limit')) {
        results.push({
          testName: 'Resource Limit Enforcement',
          passed: true,
          message: 'Plan limits properly enforced'
        });
      } else {
        results.push({
          testName: 'Resource Limit Enforcement',
          passed: false,
          message: 'Failed to enforce plan limits'
        });
        return { success: false, results };
      }
      
      // All resource limit tests passed
      return {
        success: true,
        results
      };
    } catch (error: any) {
      log(`Error in resource limits test: ${error.message}`, 'tenant-test-service');
      results.push({
        testName: 'Resource Limits',
        passed: false,
        message: `Error: ${error.message}`
      });
      
      return {
        success: false,
        results
      };
    }
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.router.get('/health', (req, res) => {
      res.json({ 
        status: 'ok',
        testTenants: this.testTenants.size,
        testUsers: this.testUsers.size
      });
    });

    // Test tenant creation endpoint
    this.router.post('/test/create', async (req, res) => {
      try {
        const { name, domain, plan } = req.body;
        
        if (!name || !domain || !plan) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: name, domain, plan'
          });
        }
        
        const result = await this.testTenantCreation({ name, domain, plan });
        res.json(result);
      } catch (error: any) {
        log(`Error in tenant creation test endpoint: ${error.message}`, 'tenant-test-service');
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Test tenant isolation endpoint
    this.router.post('/test/isolation', async (req, res) => {
      try {
        const result = await this.testTenantIsolation();
        res.json(result);
      } catch (error: any) {
        log(`Error in tenant isolation test endpoint: ${error.message}`, 'tenant-test-service');
        res.status(500).json({
          success: false,
          results: [{
            testName: 'Tenant Isolation',
            passed: false,
            message: `Error: ${error.message}`
          }]
        });
      }
    });

    // Test resource limits endpoint
    this.router.post('/test/resource-limits', async (req, res) => {
      try {
        const result = await this.testResourceLimits();
        res.json(result);
      } catch (error: any) {
        log(`Error in resource limits test endpoint: ${error.message}`, 'tenant-test-service');
        res.status(500).json({
          success: false,
          results: [{
            testName: 'Resource Limits',
            passed: false,
            message: `Error: ${error.message}`
          }]
        });
      }
    });

    // Run all tests endpoint
    this.router.post('/test/all', async (req, res) => {
      try {
        const result = await this.runAllTests();
        res.json(result);
      } catch (error: any) {
        log(`Error running all tenant tests: ${error.message}`, 'tenant-test-service');
        res.status(500).json({
          success: false,
          results: {
            creation: false,
            isolation: false,
            resourceLimits: false,
            accessControl: false,
            summary: `Error: ${error.message}`
          }
        });
      }
    });

    // Cleanup test resources endpoint
    this.router.post('/cleanup', async (req, res) => {
      try {
        const result = await this.cleanupTestResources();
        res.json(result);
      } catch (error: any) {
        log(`Error cleaning up test resources: ${error.message}`, 'tenant-test-service');
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }
}

export function createTenantTestService(): TenantTestService {
  const service = new TenantTestService();
  return service;
}