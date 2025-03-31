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
import { executeMcpFunction } from './mcp-functions';
import { executeWorkflow as executeWorkflowInternal } from './mcp-workflows';

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
    try {
      log(`Starting workflow execution: ${workflow.name}`, 'mcp-service');
      
      // Use the new implementation from mcp-workflows.ts
      const execution = await executeWorkflowInternal(workflow.name, inputs);
      
      // Store execution for backward compatibility
      const executionId = uuid();
      this.workflowExecutions.set(executionId, {
        id: executionId,
        workflowId: workflow.id,
        status: execution.status,
        input: execution.input,
        output: execution.output,
        error: execution.error,
        steps: {},
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        currentStep: execution.currentStep
      });
      
      log(`Workflow execution completed: ${workflow.name}`, 'mcp-service');
      
      // Format the result for API response
      return { 
        executionId: execution.id,
        status: execution.status,
        results: execution.output
      };
      
    } catch (error: any) {
      log(`Workflow execution failed: ${workflow.name} - ${error.message}`, 'mcp-service');
      throw createError(`Workflow execution failed: ${error.message}`, 500, 'WORKFLOW_EXECUTION_ERROR');
    }
  }

  private setupRoutes(): void {
    // Test/Debug routes for development only - bypasses auth requirements
    if (process.env.NODE_ENV === 'development') {
      this.router.post('/test/workflows/:name/execute', async (req, res) => {
        try {
          const { name } = req.params;
          const inputs = req.body;
          
          log(`Test endpoint: Executing workflow '${name}'`, 'mcp-service');
          const workflow = await storage.getMcpWorkflowByName(name);
          
          if (!workflow) {
            return res.status(404).json(formatError(createError(`Workflow '${name}' not found`, 404, 'WORKFLOW_NOT_FOUND')));
          }
          
          const result = await this.executeWorkflow(workflow, inputs);
          
          log(`Test endpoint: Workflow '${name}' executed successfully`, 'mcp-service');
          res.json(result);
        } catch (error: any) {
          const formattedError = formatError(error);
          log(`Test endpoint: Error executing workflow: ${formattedError.message}`, 'mcp-service');
          res.status(formattedError.status || 500).json(formattedError);
        }
      });
    }
    
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
        const callId = req.body.callId || uuid();
        
        // Check if function exists in database
        const function_ = await storage.getMcpFunctionByName(name);
        
        if (!function_) {
          return res.status(404).json(formatError(createError(`Function '${name}' not found`, 404, 'FUNCTION_NOT_FOUND')));
        }
        
        // Create standardized function call for our internal format
        const functionCall = {
          name: name,
          parameters: req.body.parameters || {},
          callId
        };
        
        // Use the new implementation from mcp-functions.ts
        const functionResponse = await executeMcpFunction(functionCall);
        
        // Map to API response format
        const response: McpFunctionResponse = {
          callId: functionCall.callId || uuid(),
          status: functionResponse.success ? 'success' : 'error',
          timestamp: new Date().toISOString(),
          result: functionResponse.result
        };
        
        if (!functionResponse.success && functionResponse.error) {
          response.error = {
            code: 'FUNCTION_EXECUTION_ERROR',
            message: functionResponse.error,
            details: null
          };
        }
        
        log(`Function '${name}' invoked ${response.status === 'success' ? 'successfully' : 'with errors'}`, 'mcp-service');
        res.json(response);
      } catch (error: any) {
        const formattedError = formatError(error);
        
        const response: McpFunctionResponse = {
          callId: req.body.callId || uuid(),
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
    this.router.post('/workflows/:name/execute', process.env.NODE_ENV === 'development' ? (req, res, next) => next() : requireAuth, async (req, res) => {
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