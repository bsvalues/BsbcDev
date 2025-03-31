/**
 * MCP Property Filter Integration
 * Integrates property filtering functionality with MCP service
 */
import { filterProperties } from '../../client/src/lib/property-filter';
import { PropertyFilters } from '../../client/src/lib/property-filter-types';
import { MCPService } from './mcp-service';
import { PropertyService } from './property-service';
import { registerMcpFunction } from './mcp-functions';
import { registerWorkflow } from './mcp-workflows';
import { log } from '../vite';
import { storage } from '../storage';

/**
 * Register property filter function with MCP service
 */
export async function registerPropertyFilterFunction(
  mcpService: MCPService, 
  propertyService: PropertyService
): Promise<void> {
  // Define the property filter function
  registerMcpFunction('filterProperties', async (params: {
    tenantId: number;
    filters: PropertyFilters;
  }) => {
    // Validate required parameters
    if (params.tenantId === undefined || params.tenantId === null) {
      throw new Error('Tenant ID is required');
    }

    // Get all properties for the tenant
    const properties = await propertyService.getProperties(params.tenantId);
    
    // Apply filters if provided
    const filteredProperties = params.filters 
      ? filterProperties(properties, params.filters)
      : properties;
    
    log(`Filtered ${properties.length} properties to ${filteredProperties.length} results`, 'mcp-property-service');
    
    return filteredProperties;
  });

  log('Registered MCP function: filterProperties', 'mcp-property-service');
}

/**
 * Register property comparison workflow with MCP service
 */
export async function registerPropertyComparisonWorkflow(mcpService: MCPService): Promise<void> {
  // Define workflow for comparing properties
  const propertyFilterComparisonWorkflow = {
    name: 'propertyFilterComparison',
    description: 'Filter and compare properties by criteria',
    inputs: {
      tenantId: 'number',
      filters: 'object',
      sortField: 'string?',
      sortDirection: 'string?',
      comparisonFactors: 'string[]?'
    },
    outputs: {
      filteredProperties: 'object[]',
      comparison: 'object'
    },
    steps: [
      {
        name: 'filterProperties',
        function: 'filterProperties',
        parameters: {
          tenantId: '$input.tenantId',
          filters: '$input.filters'
        },
        output: {
          filteredProperties: "result"  // Map to result
        }
      },
      {
        name: 'calculateComparison',
        function: 'calculateComparison',
        parameters: {
          properties: '$steps.filterProperties',
          factors: '$input.comparisonFactors'
        },
        output: {
          comparison: "result"
        }
      }
    ]
  };

  // Register the workflow with proper type casting
  registerWorkflow(propertyFilterComparisonWorkflow as any);
  
  log('Registered MCP workflow: propertyFilterComparison', 'mcp-property-service');
}

/**
 * Calculate detailed property comparison based on specified factors
 */
export async function calculatePropertyComparison(params: {
  propertyIds: number[];
  factors?: string[];
  includeAdvancedMetrics?: boolean;
}): Promise<any> {
  const { propertyIds, factors = ['assessedValue', 'marketValue', 'taxableValue'], includeAdvancedMetrics = false } = params;
  
  if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length < 2) {
    throw new Error('At least 2 property IDs are required for comparison');
  }
  
  // Fetch property data
  const properties = await Promise.all(
    propertyIds.map(async (id) => {
      const property = await storage.getProperty(id, -1); // Using -1 for default tenant in dev mode
      if (!property) {
        throw new Error(`Property with ID ${id} not found`);
      }
      return property;
    })
  );
  
  // Calculate comparisons between properties
  const metrics: Record<string, any> = {};
  
  // Process each comparison factor
  for (const factor of factors) {
    const factorValues = properties.map((p: any) => {
      // Handle nested properties (e.g., propertyDetails.marketValue)
      if (factor.includes('.')) {
        const parts = factor.split('.');
        let value: any = p;
        for (const part of parts) {
          if (!value) return null;
          value = (value as any)[part];
        }
        return value;
      } 
      
      // Handle propertyDetails object
      if (p.propertyDetails && typeof p.propertyDetails === 'object' && factor in (p.propertyDetails as any)) {
        return (p.propertyDetails as any)[factor];
      }
      
      // Access property using index signature
      return (p as any)[factor];
    });
    
    // Skip if we don't have at least two valid values
    const validValues = factorValues.filter((v: any) => v !== null && v !== undefined);
    if (validValues.length < 2) {
      metrics[factor] = { incomplete: true, message: 'Insufficient data for comparison' };
      continue;
    }
    
    // Calculate basic metrics
    const min = Math.min(...validValues as number[]);
    const max = Math.max(...validValues as number[]);
    const difference = max - min;
    const percentageDifference = parseFloat(((difference / min) * 100).toFixed(2));
    
    metrics[factor] = {
      values: factorValues,
      min,
      max,
      difference,
      percentageDifference,
      incomplete: factorValues.some((v: any) => v === null || v === undefined)
    };
  }
  
  // Advanced metrics
  let advancedMetrics = {};
  if (includeAdvancedMetrics) {
    // Calculate price per square foot
    if (properties.every((p: any) => p.buildingArea && p.propertyDetails && (p.propertyDetails as any).marketValue)) {
      const pricePerSqFt = properties.map((p: any) => 
        (p.propertyDetails as any).marketValue / (p.buildingArea as number)
      );
      
      // Calculate difference in price per square foot
      const minPPSF = Math.min(...pricePerSqFt);
      const maxPPSF = Math.max(...pricePerSqFt);
      const ppsfDifference = maxPPSF - minPPSF;
      const ppsfPercentageDiff = parseFloat(((ppsfDifference / minPPSF) * 100).toFixed(2));
      
      advancedMetrics = {
        ...advancedMetrics,
        pricePerSqFt,
        pricePerSqFtDifference: ppsfDifference,
        pricePerSqFtPercentageDiff: ppsfPercentageDiff
      };
    }
    
    // Calculate age-adjusted value (value relative to age)
    if (properties.every((p: any) => p.yearBuilt && p.propertyDetails && (p.propertyDetails as any).marketValue)) {
      const currentYear = new Date().getFullYear();
      const ageAdjustedValues = properties.map((p: any) => {
        const age = currentYear - (p.yearBuilt as number);
        return {
          age,
          valuePerYearOfAge: (p.propertyDetails as any).marketValue / age
        };
      });
      
      advancedMetrics = {
        ...advancedMetrics,
        ageAdjustedValues
      };
    }
  }
  
  return {
    properties,
    metrics,
    ...(includeAdvancedMetrics ? { advancedMetrics } : {})
  };
}

/**
 * Initialize MCP property integration
 */
export async function initializeMcpPropertyIntegration(
  mcpService: MCPService,
  propertyService: PropertyService
): Promise<void> {
  // Register functions and workflows
  await registerPropertyFilterFunction(mcpService, propertyService);
  await registerPropertyComparisonWorkflow(mcpService);
  
  // Calculate comparison utility function
  registerMcpFunction('calculateComparison', async (params: {
    properties: any[];
    factors?: string[];
    includeAdvancedMetrics?: boolean;
  }) => {
    const properties = params.properties;
    const factors = params.factors || ['marketValue', 'assessedValue', 'yearBuilt'];
    const includeAdvancedMetrics = params.includeAdvancedMetrics || false;
    
    if (!properties || !Array.isArray(properties) || properties.length < 2) {
      throw new Error('At least 2 properties are required for comparison');
    }
    
    // Extract property IDs
    const propertyIds = properties.map((p: any) => p.id);
    
    // Use the enhanced property comparison function
    return calculatePropertyComparison({
      propertyIds,
      factors,
      includeAdvancedMetrics
    });
  });
  
  log('MCP Property Integration initialized successfully', 'mcp-property-service');
}