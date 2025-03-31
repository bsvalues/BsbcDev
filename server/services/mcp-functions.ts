/**
 * MCP Standard Functions for Property Tax System
 * These functions can be used in MCP workflows
 */
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { McpFunctionCall as McpFunctionCallSchema, McpFunctionResponse as McpFunctionResponseSchema } from '@shared/mcp-schema';

// Modified interfaces for internal use to fix schema issues
// Property types for TypeScript strict checking
interface Property {
  id: number;
  tenantId: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  landArea: number;
  buildingArea: number;
  yearBuilt: number;
  [key: string]: any;
}

interface PropertyValuation {
  id: number;
  propertyId: number;
  tenantId: number;
  valuationMethod: string;
  assessmentDate: Date;
  assessedValue: number;
  marketValue: number;
  taxableValue: number;
  effectiveDate: Date;
  [key: string]: any;
}

interface McpFunctionCall {
  name: string;
  parameters: Record<string, any>;
  callId?: string;
  functionName?: string; // For compatibility with schema
}

interface McpFunctionResponse {
  success: boolean;
  error: string | null;
  result: any;
  executionId: string;
}

// Function registry
const functionRegistry: Map<string, Function> = new Map();

/**
 * Register a function in the MCP function registry
 */
export function registerMcpFunction(name: string, fn: Function) {
  functionRegistry.set(name, fn);
}

/**
 * Execute an MCP function
 */
export async function executeMcpFunction(
  functionCall: McpFunctionCall
): Promise<McpFunctionResponse> {
  try {
    // Support both name (our internal) and functionName (from schema)
    const name = functionCall.name || functionCall.functionName || '';
    const parameters = functionCall.parameters;
    console.log(`[mcp-functions] Executing ${name} with parameters:`, parameters);
    
    // Check if function exists in registry
    const fn = functionRegistry.get(name);
    if (!fn) {
      return {
        success: false,
        error: `Function "${name}" not found in registry`,
        result: null,
        executionId: uuidv4()
      };
    }
    
    // Execute function and return result
    const result = await fn(parameters);
    return {
      success: true,
      error: null,
      result,
      executionId: uuidv4()
    };
    
  } catch (error) {
    const functionName = functionCall.name || functionCall.functionName || 'unknown';
    console.error(`[mcp-functions] Error executing function ${functionName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      result: null,
      executionId: uuidv4()
    };
  }
}

// Standard system functions
registerMcpFunction('echo', async (params: any) => {
  return params;
});

registerMcpFunction('concatenate', async (params: { strings: string[] }) => {
  return params.strings.join('');
});

registerMcpFunction('calculate', async (params: { 
  operation: 'add' | 'subtract' | 'multiply' | 'divide',
  values: number[]
}) => {
  const { operation, values } = params;
  
  if (!values || !Array.isArray(values) || values.length === 0) {
    throw new Error('Invalid values array');
  }
  
  let result = values[0];
  
  for (let i = 1; i < values.length; i++) {
    switch (operation) {
      case 'add':
        result += values[i];
        break;
      case 'subtract':
        result -= values[i];
        break;
      case 'multiply':
        result *= values[i];
        break;
      case 'divide':
        if (values[i] === 0) throw new Error('Division by zero');
        result /= values[i];
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }
  
  return result;
});

// Property-specific functions
registerMcpFunction('getProperty', async (params: { propertyId: number }) => {
  const { propertyId } = params;
  const property = await storage.getProperty(propertyId, -1); // -1 means admin access to bypass tenant check
  
  if (!property) {
    throw new Error(`Property with ID ${propertyId} not found`);
  }
  
  return property;
});

registerMcpFunction('propertyValuation', async (params: { 
  propertyId: number, 
  method: 'income' | 'cost' | 'sales_comparison' | 'standard',
  assessmentDate?: string
}) => {
  const { propertyId, method, assessmentDate } = params;
  
  // Convert assessmentDate string to Date if provided, or use current date
  const assessDate = assessmentDate ? new Date(assessmentDate) : new Date();
  
  // Calculate property valuation using the specified method
  const valuation = await storage.calculatePropertyValuation(
    propertyId,
    method,
    assessDate
  );
  
  return valuation;
});

registerMcpFunction('compareProperties', async (params: { 
  propertyIds: number[], 
  comparisonFactor?: 'assessedValue' | 'marketValue' | 'taxableValue' | 'landArea' | 'buildingArea'
}) => {
  const { propertyIds, comparisonFactor = 'assessedValue' } = params;
  
  // Check property limit
  if (propertyIds.length > 5) {
    throw new Error('Maximum of 5 properties allowed for comparison');
  }
  
  // Get properties with their latest valuations
  const propertyData = await Promise.all(
    propertyIds.map(async (id) => {
      const property = await storage.getProperty(id, -1);
      if (!property) {
        throw new Error(`Property with ID ${id} not found`);
      }
      
      const valuations = await storage.getAllPropertyValuations(id, property.tenantId);
      
      // Find latest valuation using loop to avoid TypeScript error with reduce
      let latestValuation: any = null;
      for (const valuation of valuations) {
        if (!latestValuation || 
            new Date(valuation.assessmentDate) > new Date(latestValuation.assessmentDate)) {
          latestValuation = valuation;
        }
      }
      
      return {
        property,
        valuation: latestValuation
      };
    })
  );
  
  // Generate comparison data
  const comparisonResults = propertyData.map(({ property, valuation }) => {
    let comparisonValue: number | null = null;
    
    switch (comparisonFactor) {
      case 'assessedValue':
      case 'marketValue':
      case 'taxableValue':
        comparisonValue = valuation ? valuation[comparisonFactor] : null;
        break;
      case 'landArea':
      case 'buildingArea':
        comparisonValue = property[comparisonFactor];
        break;
    }
    
    return {
      propertyId: property.id,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      propertyType: property.propertyType,
      [comparisonFactor]: comparisonValue,
      valuationId: valuation ? valuation.id : null,
      valuationDate: valuation ? valuation.assessmentDate : null
    };
  });
  
  // Calculate statistics
  const values = comparisonResults
    .map(result => result[comparisonFactor])
    .filter((value): value is number => value !== null);
  
  const stats = {
    count: values.length,
    min: values.length > 0 ? Math.min(...values) : null,
    max: values.length > 0 ? Math.max(...values) : null,
    average: values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : null,
    median: values.length > 0 ? getMedian(values) : null,
    total: values.length > 0 ? values.reduce((sum, val) => sum + val, 0) : null
  };
  
  return {
    comparisonResults,
    statistics: stats,
    comparisonFactor
  };
});

registerMcpFunction('generateComparisonVisualization', async (params: { 
  propertyIds: number[], 
  comparisonFactors?: Array<'assessedValue' | 'marketValue' | 'taxableValue' | 'landArea' | 'buildingArea'>
}) => {
  const { propertyIds, comparisonFactors = ['assessedValue', 'marketValue', 'taxableValue'] } = params;
  
  // Check property limit
  if (propertyIds.length > 5) {
    throw new Error('Maximum of 5 properties allowed for visualization');
  }
  
  // Get comparison data for each factor
  const comparisonData = await Promise.all(
    comparisonFactors.map(async (factor) => {
      const result = await executeMcpFunction({
        name: 'compareProperties',
        parameters: {
          propertyIds,
          comparisonFactor: factor
        },
        callId: uuidv4()
      });
      
      if (!result.success) {
        throw new Error(`Failed to compare properties by ${factor}: ${result.error}`);
      }
      
      return result.result;
    })
  );
  
  // Format data for visualization
  const properties = comparisonData[0].comparisonResults.map((p: any) => ({
    id: p.propertyId,
    label: `${p.address}, ${p.city}, ${p.state}`
  }));
  
  const datasets = comparisonFactors.map((factor, index) => {
    const data = comparisonData[index].comparisonResults.map((r: any) => r[factor]);
    
    return {
      label: formatFactorLabel(factor),
      data,
      backgroundColor: getColorForDataset(index)
    };
  });
  
  // Format for chart.js
  const chartData = {
    labels: properties.map((p: any) => p.label),
    datasets
  };
  
  // Format for table view
  const tableData = properties.map((property: any, propIndex: number) => {
    const row: Record<string, any> = { 
      propertyId: property.id,
      propertyLabel: property.label
    };
    
    comparisonFactors.forEach((factor, factorIndex) => {
      row[factor] = comparisonData[factorIndex].comparisonResults[propIndex][factor];
    });
    
    return row;
  });
  
  return {
    chartData,
    tableData,
    comparisonFactors,
    properties
  };
});

// Helper functions
function getMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

function formatFactorLabel(factor: string): string {
  switch (factor) {
    case 'assessedValue': return 'Assessed Value';
    case 'marketValue': return 'Market Value';
    case 'taxableValue': return 'Taxable Value';
    case 'landArea': return 'Land Area (sq ft)';
    case 'buildingArea': return 'Building Area (sq ft)';
    default: return factor;
  }
}

function getColorForDataset(index: number): string {
  const colors = [
    'rgba(75, 192, 192, 0.6)',   // teal
    'rgba(54, 162, 235, 0.6)',   // blue
    'rgba(255, 206, 86, 0.6)',   // yellow
    'rgba(153, 102, 255, 0.6)',  // purple
    'rgba(255, 159, 64, 0.6)',   // orange
    'rgba(255, 99, 132, 0.6)',   // red
    'rgba(199, 199, 199, 0.6)'   // gray
  ];
  
  return colors[index % colors.length];
}

// Export functions for external use
export const mcpFunctions = {
  echo: functionRegistry.get('echo')!,
  concatenate: functionRegistry.get('concatenate')!,
  calculate: functionRegistry.get('calculate')!,
  getProperty: functionRegistry.get('getProperty')!,
  propertyValuation: functionRegistry.get('propertyValuation')!,
  compareProperties: functionRegistry.get('compareProperties')!,
  generateComparisonVisualization: functionRegistry.get('generateComparisonVisualization')!
};