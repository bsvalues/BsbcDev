import { Express } from 'express';
import request from 'supertest';
import express from 'express';
import { createPropertyService } from '../services/property-service';
import { IStorage } from '../storage';

// Create a mock of the storage interface for testing
const mockStorage: jest.Mocked<Partial<IStorage>> = {
  // User operations
  getUser: jest.fn(),
  getUserByUsername: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  
  // Tenant operations
  getTenant: jest.fn(),
  getTenantByDomain: jest.fn(),
  createTenant: jest.fn(),
  getAllTenants: jest.fn(),
  updateTenant: jest.fn(),
  
  // Subscription operations
  getSubscription: jest.fn(),
  getSubscriptionByTenantId: jest.fn(),
  createSubscription: jest.fn(),
  updateSubscription: jest.fn(),
  
  // Plan operations
  getPlan: jest.fn(),
  createPlan: jest.fn(),
  getAllPlans: jest.fn(),
  updatePlan: jest.fn(),
  
  // Property operations
  getProperty: jest.fn(),
  getAllProperties: jest.fn(),
  createProperty: jest.fn(),
  updateProperty: jest.fn(),
  
  // Property Valuation operations
  getPropertyValuation: jest.fn(),
  getAllPropertyValuations: jest.fn(),
  createPropertyValuation: jest.fn(),
  calculatePropertyValuation: jest.fn(),
  
  // Property Appeal operations
  getPropertyAppeal: jest.fn(),
  getAllPropertyAppeals: jest.fn(),
  createPropertyAppeal: jest.fn(),
  updatePropertyAppeal: jest.fn(),
  
  // Tax Rate operations
  getTaxRate: jest.fn(),
  getTaxRates: jest.fn(),
  createTaxRate: jest.fn(),
  updateTaxRate: jest.fn(),
  
  // MCP Function operations
  getMcpFunction: jest.fn(),
  getMcpFunctionByName: jest.fn(),
  getAllMcpFunctions: jest.fn(),
  createMcpFunction: jest.fn(),
  updateMcpFunction: jest.fn(),
  
  // MCP Workflow operations
  getMcpWorkflow: jest.fn(),
  getMcpWorkflowByName: jest.fn(),
  getAllMcpWorkflows: jest.fn(),
  createMcpWorkflow: jest.fn(),
  updateMcpWorkflow: jest.fn(),
  
  // MCP Execution operations
  getMcpExecution: jest.fn(),
  createMcpExecution: jest.fn(),
  updateMcpExecution: jest.fn()
};

// Ensure NODE_ENV is set to development for auth bypass
process.env.NODE_ENV = 'development';

describe('Property Service API', () => {
  let app: Express;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Create property service with mock storage
    const propertyService = createPropertyService(mockStorage as any);
    
    // Register property service routes
    app.use('/internal/properties', propertyService.getRouter());
  });
  
  describe('GET /internal/properties', () => {
    it('should return all properties for tenant', async () => {
      // Setup mock data
      const mockProperties = [
        { id: 1, address: '123 Main St', tenantId: 1 },
        { id: 2, address: '456 Oak Ave', tenantId: 1 }
      ];
      
      // Configure mock behavior
      mockStorage.getAllProperties.mockResolvedValue(mockProperties as any);
      
      // Test API endpoint
      const response = await request(app)
        .get('/internal/properties')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body).toEqual(mockProperties);
      expect(mockStorage.getAllProperties).toHaveBeenCalledWith(1); // Default tenant ID in dev mode
    });
    
    it('should handle errors when fetching properties', async () => {
      // Configure mock to throw error
      mockStorage.getAllProperties.mockRejectedValue(new Error('Database error'));
      
      // Test API endpoint
      const response = await request(app)
        .get('/internal/properties')
        .expect('Content-Type', /json/)
        .expect(500);
      
      // Assertions
      expect(response.body).toHaveProperty('message', 'Failed to fetch properties');
      expect(response.body).toHaveProperty('code', 'PROPERTY_FETCH_ERROR');
    });
  });
  
  describe('GET /internal/properties/:id', () => {
    it('should return a property by ID', async () => {
      // Setup mock data
      const mockProperty = { id: 1, address: '123 Main St', tenantId: 1 };
      
      // Configure mock behavior
      mockStorage.getProperty.mockResolvedValue(mockProperty as any);
      
      // Test API endpoint
      const response = await request(app)
        .get('/internal/properties/1')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assertions
      expect(response.body).toEqual(mockProperty);
      expect(mockStorage.getProperty).toHaveBeenCalledWith(1, 1); // propertyId, tenantId
    });
    
    it('should return 404 when property not found', async () => {
      // Configure mock behavior for not found
      mockStorage.getProperty.mockResolvedValue(undefined);
      
      // Test API endpoint
      await request(app)
        .get('/internal/properties/999')
        .expect('Content-Type', /json/)
        .expect(404);
      
      // Assertions
      expect(mockStorage.getProperty).toHaveBeenCalledWith(999, 1);
    });
  });
  
  describe('POST /internal/properties', () => {
    it('should create a new property', async () => {
      // Setup mock data
      const newProperty = { address: '789 Pine St', city: 'Testville', state: 'TS', zipCode: '12345' };
      const createdProperty = { id: 3, ...newProperty, tenantId: 1, createdBy: 1 };
      
      // Configure mock behavior
      mockStorage.createProperty.mockResolvedValue(createdProperty as any);
      
      // Test API endpoint
      const response = await request(app)
        .post('/internal/properties')
        .send(newProperty)
        .expect('Content-Type', /json/)
        .expect(201);
      
      // Assertions
      expect(response.body).toEqual(createdProperty);
      expect(mockStorage.createProperty).toHaveBeenCalledWith(expect.objectContaining({
        ...newProperty,
        tenantId: 1,
        createdBy: 1
      }));
    });
    
    it('should validate property data before creating', async () => {
      // Send invalid property data (missing required fields)
      const invalidProperty = { state: 'TS' }; // Missing address, city, zipCode
      
      // Test API endpoint
      const response = await request(app)
        .post('/internal/properties')
        .send(invalidProperty)
        .expect('Content-Type', /json/)
        .expect(400);
      
      // Assertions
      expect(mockStorage.createProperty).not.toHaveBeenCalled();
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Validation error');
    });
  });
});