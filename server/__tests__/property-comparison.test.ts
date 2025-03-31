import { MCPService } from '../services/mcp-service';
import { PropertyService } from '../services/property-service';
import { storage } from '../storage';
import {
  registerPropertyFilterFunction,
  registerPropertyComparisonWorkflow,
  calculatePropertyComparison
} from '../services/mcp-property-integration';
import { v4 as uuidv4 } from 'uuid';

// Mock storage for property service
jest.mock('../storage', () => {
  const mockStorage = {
    getProperty: jest.fn(),
    getAllProperties: jest.fn(),
    getPropertyValuation: jest.fn(),
    getAllPropertyValuations: jest.fn()
  };
  
  return {
    storage: mockStorage
  };
});

// Ensure NODE_ENV is set to development for auth bypass
process.env.NODE_ENV = 'development';

describe('Property Comparison Service', () => {
  let mcpService: MCPService;
  let propertyService: PropertyService;
  
  // Sample property data for testing
  const testProperties = [
    {
      id: 1,
      address: '123 Main St',
      city: 'Richland',
      state: 'WA',
      zipCode: '99352',
      tenantId: 1,
      createdBy: 1,
      status: 'active',
      parcelId: 'ABC123',
      propertyType: 'residential',
      yearBuilt: 1990,
      landArea: 10000,
      buildingArea: 2500,
      zoneCode: 'R1',
      propertyDetails: {
        assessedValue: 350000,
        marketValue: 420000,
        taxableValue: 330000
      }
    },
    {
      id: 2,
      address: '456 Oak Ave',
      city: 'Kennewick',
      state: 'WA',
      zipCode: '99336',
      tenantId: 1,
      createdBy: 1,
      status: 'active',
      parcelId: 'DEF456',
      propertyType: 'residential',
      yearBuilt: 2005,
      landArea: 12000,
      buildingArea: 3200,
      zoneCode: 'R1',
      propertyDetails: {
        assessedValue: 485000,
        marketValue: 520000,
        taxableValue: 460000
      }
    }
  ];
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup MCP service
    mcpService = new MCPService();
    
    // Setup property service with mock storage
    propertyService = new PropertyService(storage);
    
    // Configure mock behavior for property retrieval
    (storage.getProperty as jest.Mock).mockImplementation((id, tenantId) => {
      const property = testProperties.find(p => p.id === id);
      return Promise.resolve(property);
    });
    
    // Configure mock behavior for property valuations
    (storage.getAllPropertyValuations as jest.Mock).mockResolvedValue([
      {
        id: 1,
        propertyId: 1,
        assessedValue: 350000,
        marketValue: 420000,
        taxableValue: 330000,
        assessmentDate: new Date('2023-01-15'),
        assessmentMethod: 'standard',
        tenantId: 1
      }
    ]);
  });
  
  describe('Property Comparison Calculation', () => {
    test('should calculate basic comparison metrics between two properties', async () => {
      // Execute comparison calculation
      const result = await calculatePropertyComparison({
        propertyIds: [1, 2],
        factors: ['assessedValue', 'marketValue', 'yearBuilt']
      });
      
      // Verify comparison results
      expect(result).toBeDefined();
      expect(result.properties).toHaveLength(2);
      
      // Check comparison metrics
      expect(result.metrics).toBeDefined();
      expect(result.metrics.assessedValue).toHaveProperty('difference');
      expect(result.metrics.assessedValue.difference).toBe(135000);
      expect(result.metrics.assessedValue).toHaveProperty('percentageDifference');
      
      // Check year built difference
      expect(result.metrics.yearBuilt).toHaveProperty('difference');
      expect(result.metrics.yearBuilt.difference).toBe(15);
    });
    
    test('should calculate advanced metrics including price per square foot', async () => {
      // Execute comparison with advanced metrics
      const result = await calculatePropertyComparison({
        propertyIds: [1, 2],
        factors: ['assessedValue', 'marketValue'],
        includeAdvancedMetrics: true
      });
      
      // Verify advanced metrics
      expect(result.advancedMetrics).toBeDefined();
      
      // Check price per square foot calculations
      expect(result.advancedMetrics).toHaveProperty('pricePerSqFt');
      expect(result.advancedMetrics.pricePerSqFt).toHaveLength(2);
      
      // Property 1 price per sqft should be 420000 / 2500 = 168
      expect(result.advancedMetrics.pricePerSqFt[0]).toBeCloseTo(168, 0);
      
      // Property 2 price per sqft should be 520000 / 3200 = 162.5
      expect(result.advancedMetrics.pricePerSqFt[1]).toBeCloseTo(162.5, 0);
    });
    
    test('should handle properties with missing data gracefully', async () => {
      // Mock properties with missing data
      const propertiesWithMissingData = [
        { ...testProperties[0] },
        { 
          ...testProperties[1],
          propertyDetails: {
            assessedValue: null,
            marketValue: 520000,
            taxableValue: 460000
          }
        }
      ];
      
      // Update mock to return properties with missing data
      (storage.getProperty as jest.Mock).mockImplementation((id) => {
        return Promise.resolve(id === 1 ? propertiesWithMissingData[0] : propertiesWithMissingData[1]);
      });
      
      // Execute comparison
      const result = await calculatePropertyComparison({
        propertyIds: [1, 2],
        factors: ['assessedValue', 'marketValue']
      });
      
      // Verify handling of missing data
      expect(result.metrics.assessedValue).toHaveProperty('incomplete', true);
      expect(result.metrics.marketValue).not.toHaveProperty('incomplete');
    });
  });
  
  describe('Property Comparison Workflow Integration', () => {
    test('should register and execute property comparison workflow', async () => {
      // Register functions and workflows
      await registerPropertyFilterFunction(mcpService, propertyService);
      await registerPropertyComparisonWorkflow(mcpService);
      
      // Mock additional function needed for comparison
      mcpService.registerFunction('calculateComparison', async () => {
        return {
          properties: testProperties,
          metrics: {
            assessedValue: {
              difference: 135000,
              percentageDifference: 38.57
            },
            marketValue: {
              difference: 100000,
              percentageDifference: 23.81
            }
          }
        };
      });
      
      // Prepare workflow parameters
      const parameters = {
        propertyIds: [1, 2],
        comparisonFactors: ['assessedValue', 'marketValue']
      };
      
      // Execute the workflow
      const result = await mcpService.executeWorkflow('propertyComparison', parameters);
      
      // Verify workflow execution and results
      expect(result).toBeDefined();
      expect(result.comparisonResults).toBeDefined();
      expect(result.chartData).toBeDefined();
    });
  });
});