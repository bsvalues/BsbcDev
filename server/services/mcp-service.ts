import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { log } from '../vite';
import { formatError, createError } from '../utils/error-handler';
import { requireAuth, requireAdmin } from '../middleware/auth-middleware';
import { v4 as uuid } from 'uuid';
import { 
  McpFunction, 
  McpWorkflow, 
  McpExecution,
  McpContent, 
  McpFunctionCall, 
  McpFunctionResponse,
  mcpFunctionSchema, 
  mcpWorkflowSchema, 
  mcpContentSchema, 
  mcpFunctionCallSchema, 
  mcpFunctionResponseSchema 
} from '@shared/mcp-schema';

export class MCPService {
  private router: Router;
  private registeredFunctions: Map<string, Function>;
  private workflowExecutions: Map<string, {
    id: string;
    workflowId: number;
    status: string;
    input: any;
    output: any;
    error: any;
    steps: Record<string, any>;
    startedAt: Date;
    completedAt: Date | null;
    currentStep: string | null;
  }>;

  constructor() {
    this.router = Router();
    this.registeredFunctions = new Map();
    this.workflowExecutions = new Map();
    this.setupDefaultFunctions();
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private setupDefaultFunctions() {
    // Register default system functions
    this.registerSystemFunction('echo', async (params: any) => {
      return params;
    });

    this.registerSystemFunction('concatenate', async (params: { strings: string[] }) => {
      return { result: params.strings.join('') };
    });

    this.registerSystemFunction('calculate', async (params: { operation: string, a: number, b: number }) => {
      const { operation, a, b } = params;
      let result;
      
      switch (operation) {
        case 'add':
          result = a + b;
          break;
        case 'subtract':
          result = a - b;
          break;
        case 'multiply':
          result = a * b;
          break;
        case 'divide':
          if (b === 0) {
            throw new Error('Division by zero');
          }
          result = a / b;
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
      
      return { result };
    });
  }

  private registerSystemFunction(name: string, handler: Function): void {
    this.registeredFunctions.set(name, handler);
    log(`Registered system function: ${name}`, 'mcp-service');
  }

  private async executeFunction(functionName: string, parameters: any): Promise<any> {
    const functionHandler = this.registeredFunctions.get(functionName);
    
    if (!functionHandler) {
      throw createError(`Function '${functionName}' not found`, 404, 'FUNCTION_NOT_FOUND');
    }
    
    try {
      log(`Executing function '${functionName}' with parameters: ${JSON.stringify(parameters)}`, 'mcp-service');
      return await functionHandler(parameters);
    } catch (error: any) {
      log(`Error executing function '${functionName}': ${error.message}`, 'mcp-service');
      throw createError(`Error executing function '${functionName}': ${error.message}`, 500, 'FUNCTION_EXECUTION_ERROR');
    }
  }

  private async executeWorkflow(workflow: McpWorkflow, inputs: any): Promise<any> {
    const executionId = uuid();
    const execution = {
      id: executionId,
      workflowId: workflow.id,
      status: 'running',
      input: inputs,
      output: null,
      error: null,
      steps: {},
      startedAt: new Date(),
      completedAt: null,
      currentStep: Object.keys(workflow.steps as Record<string, any>)[0]
    };
    
    this.workflowExecutions.set(executionId, execution);
    
    try {
      log(`Starting workflow execution: ${workflow.name} (${executionId})`, 'mcp-service');
      
      // In a real implementation, this would be more sophisticated with step transitions, etc.
      // For now, we'll execute steps sequentially
      const steps = workflow.steps as Record<string, any>;
      const results: Record<string, any> = {};
      let currentStepId = execution.currentStep;
      
      while (currentStepId) {
        const step = steps[currentStepId];
        if (!step) break;
        
        execution.currentStep = currentStepId;
        this.workflowExecutions.set(executionId, execution);
        
        // Prepare function parameters (could include results from previous steps)
        const functionCall = step.functionCall;
        const parameters = { ...functionCall.parameters, _context: { results, inputs } };
        
        // Execute the function
        try {
          const result = await this.executeFunction(functionCall.functionName, parameters);
          results[currentStepId] = result;
          
          // Determine next step
          currentStepId = step.next as string;
        } catch (error: any) {
          // Handle error according to error handlers if defined
          log(`Error in workflow step ${currentStepId}: ${error.message}`, 'mcp-service');
          
          const errorHandlers = workflow.errorHandlers as Record<string, any> || {};
          const handler = errorHandlers[currentStepId];
          
          if (handler) {
            if (handler.action === 'retry') {
              // We could implement retry logic here
              // For now, we'll just fail
              throw error;
            } else if (handler.action === 'next') {
              currentStepId = handler.target as string;
              continue;
            } else if (handler.action === 'terminate') {
              throw error;
            }
          } else {
            throw error;
          }
        }
      }
      
      // Update execution status
      const updatedExecution = {
        ...execution,
        status: 'completed',
        output: results,
        completedAt: new Date()
      };
      this.workflowExecutions.set(executionId, updatedExecution);
      
      log(`Workflow execution completed: ${workflow.name} (${executionId})`, 'mcp-service');
      return { executionId, status: 'completed', results };
      
    } catch (error: any) {
      // Update execution status on error
      const failedExecution = {
        ...execution,
        status: 'failed',
        error: { message: error.message, stack: error.stack },
        completedAt: new Date()
      };
      this.workflowExecutions.set(executionId, failedExecution);
      
      log(`Workflow execution failed: ${workflow.name} (${executionId}) - ${error.message}`, 'mcp-service');
      throw createError(`Workflow execution failed: ${error.message}`, 500, 'WORKFLOW_EXECUTION_ERROR');
    }
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.router.get('/health', (req, res) => {
      res.json({ 
        status: 'ok',
        functionsRegistered: this.registeredFunctions.size,
        activeWorkflowExecutions: this.workflowExecutions.size
      });
    });

    // Function registration
    this.router.post('/functions', requireAuth, requireAdmin, async (req, res) => {
      try {
        const functionData = mcpFunctionSchema.parse(req.body);
        
        // Check if function already exists
        const existingFunction = await storage.getMcpFunctionByName(functionData.name);
        if (existingFunction) {
          return res.status(409).json(formatError(createError(`Function with name '${functionData.name}' already exists`, 409, 'FUNCTION_ALREADY_EXISTS')));
        }
        
        // Register function in database
        const createdFunction = await storage.createMcpFunction(functionData);
        
        // Register function handler (in a real implementation, this would load from a plugin system or code)
        this.registerSystemFunction(functionData.name, async (params: any) => {
          // This is a placeholder implementation
          return { message: 'Function executed with placeholder implementation', params };
        });
        
        log(`Registered new function: ${functionData.name}`, 'mcp-service');
        res.status(201).json(createdFunction);
      } catch (error: any) {
        const formattedError = formatError(error);
        log(`Error registering function: ${formattedError.message}`, 'mcp-service');
        res.status(formattedError.status || 400).json(formattedError);
      }
    });

    // List functions
    this.router.get('/functions', async (req, res) => {
      try {
        const functions = await storage.getAllMcpFunctions();
        res.json(functions);
      } catch (error: any) {
        const formattedError = formatError(error);
        log(`Error listing functions: ${formattedError.message}`, 'mcp-service');
        res.status(formattedError.status || 500).json(formattedError);
      }
    });

    // Get function by name
    this.router.get('/functions/:name', async (req, res) => {
      try {
        const { name } = req.params;
        const function_ = await storage.getMcpFunctionByName(name);
        
        if (!function_) {
          return res.status(404).json(formatError(createError(`Function '${name}' not found`, 404, 'FUNCTION_NOT_FOUND')));
        }
        
        res.json(function_);
      } catch (error: any) {
        const formattedError = formatError(error);
        log(`Error getting function: ${formattedError.message}`, 'mcp-service');
        res.status(formattedError.status || 500).json(formattedError);
      }
    });

    // Function invocation
    this.router.post('/functions/:name/invoke', requireAuth, async (req, res) => {
      try {
        const { name } = req.params;
        const functionCall = mcpFunctionCallSchema.parse({ ...req.body, functionName: name });
        
        const function_ = await storage.getMcpFunctionByName(name);
        
        if (!function_) {
          return res.status(404).json(formatError(createError(`Function '${name}' not found`, 404, 'FUNCTION_NOT_FOUND')));
        }
        
        const result = await this.executeFunction(name, functionCall.parameters);
        
        const response: McpFunctionResponse = {
          callId: functionCall.callId,
          status: 'success',
          result,
          timestamp: new Date().toISOString()
        };
        
        log(`Function '${name}' invoked successfully`, 'mcp-service');
        res.json(response);
      } catch (error: any) {
        const formattedError = formatError(error);
        
        const response: McpFunctionResponse = {
          callId: req.body.callId,
          status: 'error',
          error: {
            code: formattedError.code || 'INTERNAL_ERROR',
            message: formattedError.message,
            details: formattedError.details
          },
          timestamp: new Date().toISOString()
        };
        
        log(`Error invoking function: ${formattedError.message}`, 'mcp-service');
        res.status(formattedError.status || 500).json(response);
      }
    });

    // Workflow registration
    this.router.post('/workflows', requireAuth, requireAdmin, async (req, res) => {
      try {
        const workflowData = mcpWorkflowSchema.parse(req.body);
        
        // Check if workflow already exists
        const existingWorkflow = await storage.getMcpWorkflowByName(workflowData.name);
        if (existingWorkflow) {
          return res.status(409).json(formatError(createError(`Workflow with name '${workflowData.name}' already exists`, 409, 'WORKFLOW_ALREADY_EXISTS')));
        }
        
        // Register workflow in database
        const createdWorkflow = await storage.createMcpWorkflow(workflowData);
        
        log(`Registered new workflow: ${workflowData.name}`, 'mcp-service');
        res.status(201).json(createdWorkflow);
      } catch (error: any) {
        const formattedError = formatError(error);
        log(`Error registering workflow: ${formattedError.message}`, 'mcp-service');
        res.status(formattedError.status || 400).json(formattedError);
      }
    });

    // List workflows
    this.router.get('/workflows', async (req, res) => {
      try {
        const workflows = await storage.getAllMcpWorkflows();
        res.json(workflows);
      } catch (error: any) {
        const formattedError = formatError(error);
        log(`Error listing workflows: ${formattedError.message}`, 'mcp-service');
        res.status(formattedError.status || 500).json(formattedError);
      }
    });

    // Get workflow by name
    this.router.get('/workflows/:name', async (req, res) => {
      try {
        const { name } = req.params;
        const workflow = await storage.getMcpWorkflowByName(name);
        
        if (!workflow) {
          return res.status(404).json(formatError(createError(`Workflow '${name}' not found`, 404, 'WORKFLOW_NOT_FOUND')));
        }
        
        res.json(workflow);
      } catch (error: any) {
        const formattedError = formatError(error);
        log(`Error getting workflow: ${formattedError.message}`, 'mcp-service');
        res.status(formattedError.status || 500).json(formattedError);
      }
    });

    // Workflow execution
    this.router.post('/workflows/:name/execute', requireAuth, async (req, res) => {
      try {
        const { name } = req.params;
        const inputs = req.body;
        
        const workflow = await storage.getMcpWorkflowByName(name);
        
        if (!workflow) {
          return res.status(404).json(formatError(createError(`Workflow '${name}' not found`, 404, 'WORKFLOW_NOT_FOUND')));
        }
        
        const result = await this.executeWorkflow(workflow, inputs);
        
        log(`Workflow '${name}' executed successfully`, 'mcp-service');
        res.json(result);
      } catch (error: any) {
        const formattedError = formatError(error);
        log(`Error executing workflow: ${formattedError.message}`, 'mcp-service');
        res.status(formattedError.status || 500).json(formattedError);
      }
    });

    // Get workflow execution status
    this.router.get('/executions/:id', requireAuth, async (req, res) => {
      try {
        const { id } = req.params;
        const execution = this.workflowExecutions.get(id);
        
        if (!execution) {
          return res.status(404).json(formatError(createError(`Execution '${id}' not found`, 404, 'EXECUTION_NOT_FOUND')));
        }
        
        res.json(execution);
      } catch (error: any) {
        const formattedError = formatError(error);
        log(`Error getting execution: ${formattedError.message}`, 'mcp-service');
        res.status(formattedError.status || 500).json(formattedError);
      }
    });

    // Content processing
    this.router.post('/content/process', requireAuth, async (req, res) => {
      try {
        const content = mcpContentSchema.parse(req.body);
        
        // Process content based on MCP standards
        // This would typically involve multiple steps like:
        // 1. Validating content structure
        // 2. Processing annotations
        // 3. Resolving references
        // 4. Applying transformations
        
        // For this example, we'll do a simple processing that counts content blocks by type
        const blockCounts: Record<string, number> = {};
        
        for (const block of content.blocks) {
          blockCounts[block.type] = (blockCounts[block.type] || 0) + 1;
        }
        
        const processedContent = {
          original: content,
          analysis: {
            blockCounts,
            totalBlocks: content.blocks.length,
            metadata: content.metadata
          }
        };
        
        log(`Content processed successfully: ${content.blocks.length} blocks`, 'mcp-service');
        res.json(processedContent);
      } catch (error: any) {
        const formattedError = formatError(error);
        log(`Error processing content: ${formattedError.message}`, 'mcp-service');
        res.status(formattedError.status || 400).json(formattedError);
      }
    });
  }
}

export function createMCPService(): MCPService {
  return new MCPService();
}