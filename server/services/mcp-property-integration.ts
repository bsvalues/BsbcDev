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
          "filteredProperties": "result"  // Map to result
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
          "comparison": "result"
        }
      }
    ]
  };

  // Register the workflow
  registerWorkflow(propertyFilterComparisonWorkflow);
  
  log('Registered MCP workflow: propertyFilterComparison', 'mcp-property-service');
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
  }) => {
    const properties = params.properties;
    const factors = params.factors || ['marketValue', 'assessedValue', 'yearBuilt'];
    
    if (!properties || !Array.isArray(properties) || properties.length < 2) {
      throw new Error('At least 2 properties are required for comparison');
    }
    
    // Calculate comparisons between properties
    const results: Record<string, any> = {};
    
    // Process each comparison factor
    for (const factor of factors) {
      const values = properties.map(p => {
        // Handle nested properties (e.g., propertyDetails.marketValue)
        if (factor.includes('.')) {
          const parts = factor.split('.');
          let value = p;
          for (const part of parts) {
            if (!value) return null;
            value = value[part];
          }
          return value;
        }
        return p[factor];
      }).filter(v => v !== null && v !== undefined);
      
      // Calculate statistics
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        
        results[factor] = {
          values,
          average: avg,
          minimum: min,
          maximum: max,
          range,
          count: values.length
        };
      }
    }
    
    // If comparing exactly 2 properties, add direct comparisons
    if (properties.length === 2) {
      const [prop1, prop2] = properties;
      
      // Calculate specific differences between the two properties
      const differences: Record<string, any> = {};
      
      for (const factor of factors) {
        let value1, value2;
        
        // Handle nested properties
        if (factor.includes('.')) {
          const parts = factor.split('.');
          value1 = prop1;
          value2 = prop2;
          
          for (const part of parts) {
            if (value1) value1 = value1[part];
            if (value2) value2 = value2[part];
          }
        } else {
          value1 = prop1[factor];
          value2 = prop2[factor];
        }
        
        if (value1 !== null && value1 !== undefined && 
            value2 !== null && value2 !== undefined) {
          differences[factor] = {
            absolute: value2 - value1,
            percentage: value1 !== 0 ? ((value2 - value1) / value1) * 100 : null,
            ratio: value1 !== 0 ? value2 / value1 : null
          };
        }
      }
      
      results.direct_comparison = {
        property1: prop1.id,
        property2: prop2.id,
        differences
      };
    }
    
    return results;
  });
  
  log('MCP Property Integration initialized successfully', 'mcp-property-service');
}