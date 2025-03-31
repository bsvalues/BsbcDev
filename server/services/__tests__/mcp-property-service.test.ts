import { MCPService } from '../mcp-service';
import { PropertyService } from '../property-service';
import { storage } from '../../storage';
import { Property } from '@shared/schema';

// Mock storage implementation
jest.mock('../../storage', () => ({
  storage: {
    getAllProperties: jest.fn(),
    getProperty: jest.fn(),
    createProperty: jest.fn(),
    updateProperty: jest.fn(),
    getAllPropertyValuations: jest.fn(),
    createPropertyValuation: jest.fn(),
    calculatePropertyValuation: jest.fn(),
  }
}));

describe('MCP Property Service Integration', () => {
  let mcpService: MCPService;
  let propertyService: PropertyService;
  
  const mockProperties: Property[] = [
    {
      id: 1,
      tenantId: 1,
      parcelId: 'PAR-001',
      address: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      propertyType: 'residential',
      zoneCode: 'R1',
      landArea: 5000,
      buildingArea: 2500,
      yearBuilt: 1985,
      bedrooms: 3,
      bathrooms: 2,
      floors: 2,
      parking: true,
      amenities: ['garage', 'backyard'],
      status: 'active',
      propertyDetails: { 
        marketValue: 320000, 
        assessedValue: 300000,
        taxableValue: 290000 
      }
    },
    {
      id: 2,
      tenantId: 1,
      parcelId: 'PAR-002',
      address: '456 Oak Ave',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62702',
      propertyType: 'commercial',
      zoneCode: 'C1',
      landArea: 10000,
      buildingArea: 8000,
      yearBuilt: 2002,
      bedrooms: null,
      bathrooms: 4,
      floors: 3,
      parking: true,
      amenities: ['parking lot', 'elevator'],
      status: 'active',
      propertyDetails: { 
        marketValue: 750000,
        assessedValue: 700000,
        taxableValue: 680000
      }
    }
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
    mcpService = new MCPService();
    propertyService = new PropertyService(storage);
    
    // Setup mocks
    (storage.getAllProperties as jest.Mock).mockResolvedValue(mockProperties);
    (storage.getProperty as jest.Mock).mockImplementation((id, tenantId) => {
      const property = mockProperties.find(p => p.id === id && p.tenantId === tenantId);
      return Promise.resolve(property);
    });
  });
  
  describe('MCP Property Filter Function', () => {
    test('should register property filter function in MCP service', async () => {
      // This test will verify that our function is properly registered with MCP
      expect(mcpService.getFunctionByName('filterProperties')).toBeUndefined();
      
      // Register the function (to be implemented)
      await registerPropertyFilterFunction(mcpService, propertyService);
      
      // Verify registration
      const func = mcpService.getFunctionByName('filterProperties');
      expect(func).toBeDefined();
      expect(func?.name).toBe('filterProperties');
      expect(func?.description).toContain('Filter properties');
    });
    
    test('should filter properties by criteria when function is called', async () => {
      // Register the function
      await registerPropertyFilterFunction(mcpService, propertyService);
      
      // Prepare test parameters
      const parameters = {
        tenantId: 1,
        filters: {
          propertyType: { equals: 'residential' }
        }
      };
      
      // Execute the function through MCP
      const result = await mcpService.executeFunction('filterProperties', parameters);
      
      // Verify results
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
      expect(result[0].propertyType).toBe('residential');
      
      // Verify storage was called correctly
      expect(storage.getAllProperties).toHaveBeenCalledWith(1);
    });
    
    test('should handle multiple filter criteria', async () => {
      // Register the function
      await registerPropertyFilterFunction(mcpService, propertyService);
      
      // Prepare test parameters with multiple filters
      const parameters = {
        tenantId: 1,
        filters: {
          city: { equals: 'Springfield' },
          'propertyDetails.marketValue': { min: 500000 }
        }
      };
      
      // Execute the function
      const result = await mcpService.executeFunction('filterProperties', parameters);
      
      // Verify results
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(2);
      expect(result[0].propertyDetails.marketValue).toBeGreaterThanOrEqual(500000);
    });
    
    test('should return empty array when no properties match filters', async () => {
      // Register the function
      await registerPropertyFilterFunction(mcpService, propertyService);
      
      // Prepare test parameters with filters that won't match
      const parameters = {
        tenantId: 1,
        filters: {
          propertyType: { equals: 'industrial' }
        }
      };
      
      // Execute the function
      const result = await mcpService.executeFunction('filterProperties', parameters);
      
      // Verify results
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
    
    test('should throw error when tenantId is missing', async () => {
      // Register the function
      await registerPropertyFilterFunction(mcpService, propertyService);
      
      // Prepare invalid parameters (missing tenantId)
      const parameters = {
        filters: {
          propertyType: { equals: 'residential' }
        }
      };
      
      // Execute and expect error
      await expect(mcpService.executeFunction('filterProperties', parameters))
        .rejects.toThrow('Tenant ID is required');
    });
  });
  
  describe('MCP Property Comparison Workflow', () => {
    test('should register property comparison workflow in MCP service', async () => {
      // Verify workflow doesn't exist yet
      expect(mcpService.getWorkflowByName('propertyComparison')).toBeUndefined();
      
      // Register the workflow (to be implemented)
      await registerPropertyComparisonWorkflow(mcpService);
      
      // Verify registration
      const workflow = mcpService.getWorkflowByName('propertyComparison');
      expect(workflow).toBeDefined();
      expect(workflow?.name).toBe('propertyComparison');
      expect(workflow?.description).toContain('Compare properties');
    });
    
    test('should execute property comparison workflow successfully', async () => {
      // Register necessary functions and workflow
      await registerPropertyFilterFunction(mcpService, propertyService);
      await registerPropertyComparisonWorkflow(mcpService);
      
      // Mock additional function needed for comparison
      mcpService.registerFunction({
        name: 'calculateComparison',
        description: 'Calculate comparison metrics between properties',
        execute: jest.fn().mockResolvedValue({
          priceDifference: 430000,
          pricePerSqFtDifference: 62.5,
          ageDifference: 17
        })
      });
      
      // Prepare workflow parameters
      const parameters = {
        tenantId: 1,
        propertyIds: [1, 2]
      };
      
      // Execute the workflow
      const result = await mcpService.executeWorkflow('propertyComparison', parameters);
      
      // Verify workflow execution and results
      expect(result).toBeDefined();
      expect(result.properties).toHaveLength(2);
      expect(result.comparison).toBeDefined();
      expect(result.comparison.priceDifference).toBe(430000);
    });
  });
});

// Import implementation from our new integration module
import { 
  registerPropertyFilterFunction, 
  registerPropertyComparisonWorkflow 
} from '../mcp-property-integration';