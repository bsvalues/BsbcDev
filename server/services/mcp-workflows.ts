/**
 * MCP Workflow Definitions
 * Each workflow defines a multi-step process for property operations
 */
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { executeMcpFunction } from './mcp-functions';
import { 
  McpWorkflow, 
  McpExecution, 
  McpWorkflowStep,
  McpFunctionCall as McpFunctionCallSchema
} from '@shared/mcp-schema';

// Adapter for compatibility between schema and internal types
interface McpFunctionCallInternal {
  name: string;
  parameters: Record<string, any>;
  callId?: string;
  functionName?: string;
}

// Extended type definitions for our internal usage
interface WorkflowStep {
  id?: string;
  name: string;
  function: string;
  parameters: Record<string, any>;
  output?: Record<string, string>;
  condition?: string;
  next?: string | null;
  retry?: {
    maxAttempts: number;
    backoffFactor: number;
    backoffBaseMs: number;
  };
}

interface WorkflowDefinition {
  name: string;
  description: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  steps: WorkflowStep[];
  errorHandlers?: Record<string, any>;
  timeout?: number;
  parallel?: Record<string, any>;
}

// Registry of workflow definitions
const workflowRegistry: Map<string, WorkflowDefinition> = new Map();

/**
 * Register a workflow definition
 */
export function registerWorkflow(workflow: WorkflowDefinition) {
  workflowRegistry.set(workflow.name, workflow);
  console.log(`[mcp-workflows] Registered workflow: ${workflow.name}`);
}

/**
 * Execute a workflow by name
 */
export async function executeWorkflow(
  workflowName: string,
  input: Record<string, any>
): Promise<McpExecution> {
  try {
    // Find workflow definition
    const workflowDef = workflowRegistry.get(workflowName);
    if (!workflowDef) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }
    
    // Get or create workflow in storage
    let workflow = await storage.getMcpWorkflowByName(workflowName);
    if (!workflow) {
      // Create workflow in storage if it doesn't exist
      workflow = await storage.createMcpWorkflow({
        name: workflowDef.name,
        description: workflowDef.description,
        steps: workflowDef.steps,
        inputs: workflowDef.inputs,
        outputs: workflowDef.outputs,
        timeout: workflowDef.timeout,
        parallel: workflowDef.parallel,
        errorHandlers: workflowDef.errorHandlers,
        enabled: true,
        version: '1.0.0'
      });
    }
    
    // Create execution record
    const execution = await storage.createMcpExecution({
      workflowId: workflow.id,
      status: 'running',
      input,
      currentStep: 'start'
    });
    
    // Execute workflow steps
    const result = await runWorkflowSteps(workflow, execution, input);
    
    return result;
  } catch (error) {
    console.error(`[mcp-workflows] Error executing workflow ${workflowName}:`, error);
    return {
      id: -1,
      workflowId: -1,
      status: 'failed',
      startedAt: new Date(),
      completedAt: new Date(),
      currentStep: null,
      input: input,
      output: {},
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Run all steps in a workflow
 */
async function runWorkflowSteps(
  workflow: McpWorkflow,
  execution: McpExecution,
  input: Record<string, any>
): Promise<McpExecution> {
  let currentExecution = { ...execution };
  let workflowOutput: Record<string, any> = {};
  let stepResults: Record<string, any> = {};
  
  try {
    // Parse steps from workflow
    let workflowSteps: WorkflowStep[] = [];
    
    if (typeof workflow.steps === 'string') {
      // Parse from JSON string
      const parsedSteps = JSON.parse(workflow.steps as string);
      // Convert to our internal WorkflowStep format
      workflowSteps = parsedSteps.map((s: any) => ({
        name: s.name || 'unnamed',
        function: s.function || s.functionName || '',
        parameters: s.parameters || {},
        output: s.output || {},
      }));
    } else {
      // Convert from McpWorkflowStep to our internal format
      workflowSteps = (workflow.steps as any[]).map((s: any) => ({
        name: s.name || 'unnamed',
        function: s.function || s.functionName || '',
        parameters: s.parameters || {},
        output: s.output || {},
      }));
    }

    // Execute each step sequentially (parallel execution would be implemented here)
    for (const step of workflowSteps) {
      console.log(`[mcp-workflows] Executing step: ${step.name}`);
      
      // Update execution status with current step
      const stepUpdate = await storage.updateMcpExecution(currentExecution.id, {
        currentStep: step.name
      });
      
      // Use the update or fallback to previous state with updated field
      if (stepUpdate) {
        currentExecution = stepUpdate;
      } else {
        // Create a new object manually with all required fields
        currentExecution = {
          id: currentExecution.id,
          workflowId: currentExecution.workflowId,
          status: currentExecution.status,
          input: currentExecution.input,
          output: currentExecution.output,
          error: currentExecution.error,
          startedAt: currentExecution.startedAt,
          completedAt: currentExecution.completedAt,
          currentStep: step.name
        };
      }
      
      // Prepare function call parameters with variables from previous steps
      const functionCall: McpFunctionCallInternal = {
        name: step.function as string, // Cast to string for compatibility
        parameters: {}
      };
      
      // Evaluate parameters (could be static or from previous steps/input)
      if (step.parameters) {
        for (const [paramName, paramValue] of Object.entries(step.parameters)) {
          functionCall.parameters[paramName] = evaluateParameter(
            paramValue, 
            input, 
            stepResults
          );
        }
      }
      
      // Execute the function
      const stepResult = await executeMcpFunction(functionCall);
      
      if (!stepResult.success) {
        throw new Error(`Step '${step.name}' failed: ${stepResult.error}`);
      }
      
      // Store step result for use in later steps
      stepResults[step.name] = stepResult.result;
      
      // If step has output mappings, add to workflow output
      if (step.output) {
        for (const [outputName, outputSource] of Object.entries(step.output)) {
          // Get output from the step result based on the path
          workflowOutput[outputName] = getPropertyByPath(stepResult.result, outputSource);
        }
      }
    }
    
    // Update execution with success status and output
    // Note: Create a safe object to pass to storage (avoid typescript errors)
    const updateData: any = {
      status: 'completed',
      output: workflowOutput,
      currentStep: null
    };
    // Add completedAt manually (typescript doesn't know this field is valid)
    updateData.completedAt = new Date();
    
    const updatedExecution = await storage.updateMcpExecution(currentExecution.id, updateData);
    
    if (updatedExecution) {
      return updatedExecution;
    } else {
      // Manually create a new object with all required fields
      return {
        id: currentExecution.id,
        workflowId: currentExecution.workflowId,
        status: 'completed',
        input: currentExecution.input,
        output: workflowOutput,
        error: currentExecution.error,
        startedAt: currentExecution.startedAt,
        completedAt: new Date(),
        currentStep: null
      };
    }
  } catch (error) {
    console.error(`[mcp-workflows] Workflow execution error:`, error);
    
    // Update execution with error status
    // Create a safe object to pass to storage
    const errorUpdateData: any = {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      output: workflowOutput
    };
    // Add completedAt manually
    errorUpdateData.completedAt = new Date();
    
    const updatedExecution = await storage.updateMcpExecution(currentExecution.id, errorUpdateData);
    
    if (updatedExecution) {
      return updatedExecution;
    } else {
      // Manually create a new object with all required fields
      return {
        id: currentExecution.id,
        workflowId: currentExecution.workflowId,
        status: 'failed',
        input: currentExecution.input,
        output: workflowOutput,
        error: error instanceof Error ? error.message : String(error),
        startedAt: currentExecution.startedAt,
        completedAt: new Date(),
        currentStep: null
      };
    }
  }
}

/**
 * Evaluate a parameter value which could be a static value or a reference to input/previous steps
 */
function evaluateParameter(
  paramValue: any, 
  input: Record<string, any>,
  stepResults: Record<string, any>
): any {
  // If param is a string and starts with $ it's a reference
  if (typeof paramValue === 'string' && paramValue.startsWith('$')) {
    // Parse the reference: $input.propertyId or $steps.getProperty.id
    const parts = paramValue.substring(1).split('.');
    
    if (parts[0] === 'input') {
      // Get from workflow input
      return getPropertyByPath(input, parts.slice(1).join('.'));
    } else if (parts[0] === 'steps' && parts.length >= 2) {
      // Get from previous step result
      const stepName = parts[1];
      const propertyPath = parts.slice(2).join('.');
      return getPropertyByPath(stepResults[stepName], propertyPath);
    }
  }
  
  // If it's not a reference, return as is
  return paramValue;
}

/**
 * Get a property from an object by dot-notation path
 */
function getPropertyByPath(obj: any, path: string): any {
  if (!obj || !path) return obj;
  
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  
  return current;
}

// Define standard workflows
const propertyValuationWorkflow: WorkflowDefinition = {
  name: 'propertyValuation',
  description: 'Calculate property valuation using specified method',
  inputs: {
    propertyId: 'number',
    method: 'string',
    assessmentDate: 'string?'
  },
  outputs: {
    propertyId: 'number',
    assessedValue: 'number',
    marketValue: 'number',
    taxableValue: 'number'
  },
  steps: [
    {
      name: 'getPropertyDetails',
      function: 'getProperty',
      parameters: {
        propertyId: '$input.propertyId'
      },
      output: {
        property: ''  // Empty path means the entire result
      }
    },
    {
      name: 'calculateValuation',
      function: 'propertyValuation',
      parameters: {
        propertyId: '$input.propertyId',
        method: '$input.method',
        assessmentDate: '$input.assessmentDate'
      },
      output: {
        valuation: ''  // Empty path means the entire result
      }
    }
  ]
};

const propertyComparisonWorkflow: WorkflowDefinition = {
  name: 'propertyComparison',
  description: 'Compare multiple properties by specified factors',
  inputs: {
    propertyIds: 'number[]',
    comparisonFactors: 'string[]?'
  },
  outputs: {
    comparisonResults: 'object',
    chartData: 'object',
    tableData: 'object'
  },
  steps: [
    {
      name: 'validateProperties',
      function: 'compareProperties',
      parameters: {
        propertyIds: '$input.propertyIds',
        comparisonFactor: 'assessedValue'  // Default factor
      },
      output: {
        validationResults: ''
      }
    },
    {
      name: 'generateVisualization',
      function: 'generateComparisonVisualization',
      parameters: {
        propertyIds: '$input.propertyIds',
        comparisonFactors: '$input.comparisonFactors'
      },
      output: {
        visualization: ''
      }
    }
  ],
  errorHandlers: {
    validateProperties: {
      retry: 0,
      fallback: { error: 'Could not validate properties for comparison' }
    }
  }
};

// Register standard workflows
registerWorkflow(propertyValuationWorkflow);
registerWorkflow(propertyComparisonWorkflow);

// Export for external use
export const mcpWorkflows = {
  propertyValuation: propertyValuationWorkflow,
  propertyComparison: propertyComparisonWorkflow
};