import { Router, Request, Response } from 'express';
import { IStorage } from '../storage';
import { createError } from '../utils/error-handler';
import { z } from 'zod';
import { log } from '../vite';
import { 
  InsertWorkflowTemplate, 
  InsertWorkflowInstance, 
  WorkflowTemplate, 
  WorkflowInstance 
} from '@shared/schema';

/**
 * Workflow Automation Engine
 * Handles workflow template management and workflow execution
 */
export class WorkflowEngineService {
  private router: Router;
  private repository: IStorage;

  constructor(repository: IStorage) {
    this.repository = repository;
    this.router = Router();
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  /**
   * Execute a single workflow step
   */
  public async executeWorkflowStep(instanceId: number, tenantId: number): Promise<WorkflowInstance> {
    try {
      // Get workflow instance
      const instance = await this.repository.getWorkflowInstance(instanceId, tenantId);
      if (!instance) {
        throw createError('Workflow instance not found', 404, 'NOT_FOUND');
      }
      
      // If workflow is not active, cannot execute
      if (instance.status !== 'active') {
        throw createError(
          `Cannot execute workflow in ${instance.status} status`, 
          400, 
          'INVALID_WORKFLOW_STATUS'
        );
      }
      
      // Get workflow template
      const template = await this.repository.getWorkflowTemplate(instance.templateId, tenantId);
      if (!template) {
        throw createError('Workflow template not found', 404, 'NOT_FOUND');
      }
      
      // Get current step
      const currentStepIndex = instance.currentStepIndex;
      const steps = template.steps as any[];
      
      if (currentStepIndex >= steps.length) {
        throw createError('No more steps to execute', 400, 'WORKFLOW_COMPLETE');
      }
      
      const currentStep = steps[currentStepIndex];
      
      // Check for simulated error (for testing)
      if (instance.variables && instance.variables.simulateError) {
        throw createError('Simulated error in workflow execution', 500, 'SIMULATED_ERROR');
      }
      
      // Initialize or update logs array
      const logs = instance.logs || [];
      
      // Execute step based on type
      const stepResult = await this.executeStep(currentStep, instance, template);
      
      // Add log entry
      logs.push({
        timestamp: new Date(),
        stepId: currentStep.id,
        stepName: currentStep.name,
        status: stepResult.status,
        action: stepResult.action,
        result: stepResult.result
      });
      
      // Determine next step
      let nextStepIndex = currentStepIndex;
      
      if (stepResult.status === 'completed') {
        // For decision steps, use the result to determine the next step
        if (currentStep.type === 'decision') {
          const nextStepId = stepResult.result.condition 
            ? currentStep.trueStepId 
            : currentStep.falseStepId;
          
          // Find the index of the next step
          nextStepIndex = steps.findIndex(step => step.id === nextStepId);
        } else if (currentStep.isTerminal) {
          // If terminal step, mark workflow as completed
          return this.repository.updateWorkflowInstance(instanceId, {
            status: 'completed',
            completedAt: new Date(),
            currentStepIndex: currentStepIndex,
            logs
          });
        } else if (currentStep.nextStepId) {
          // Find the index of the next step
          nextStepIndex = steps.findIndex(step => step.id === currentStep.nextStepId);
        } else {
          // Default to next step in sequence
          nextStepIndex = currentStepIndex + 1;
        }
      }
      
      // If next step not found, use the next sequential step
      if (nextStepIndex < 0) {
        nextStepIndex = currentStepIndex + 1;
      }
      
      // Update workflow instance
      return this.repository.updateWorkflowInstance(instanceId, {
        currentStepIndex: nextStepIndex,
        variables: {
          ...instance.variables,
          ...stepResult.variables
        },
        logs
      });
    } catch (error) {
      log(`Error executing workflow step: ${error.message}`, 'error');
      
      // Update workflow instance with error
      await this.repository.updateWorkflowInstance(instanceId, {
        status: 'error',
        logs: [
          ...(await this.repository.getWorkflowInstance(instanceId, tenantId))?.logs || [],
          {
            timestamp: new Date(),
            status: 'error',
            error: {
              message: error.message,
              code: error.code || 'EXECUTION_ERROR'
            }
          }
        ]
      });
      
      throw error;
    }
  }
  
  /**
   * Execute a specific workflow step
   */
  private async executeStep(
    step: any, 
    instance: WorkflowInstance, 
    template: WorkflowTemplate
  ): Promise<{
    status: string,
    action?: any,
    result?: any,
    variables?: any
  }> {
    // Step execution depends on step type
    switch (step.type) {
      case 'task':
        return this.executeTaskStep(step, instance);
        
      case 'form':
        return this.executeFormStep(step, instance);
        
      case 'decision':
        return this.executeDecisionStep(step, instance);
        
      case 'approval':
        return this.executeApprovalStep(step, instance);
        
      case 'system':
        return this.executeSystemStep(step, instance);
        
      default:
        throw createError(`Unknown step type: ${step.type}`, 400, 'INVALID_STEP_TYPE');
    }
  }
  
  /**
   * Execute a task step
   */
  private async executeTaskStep(step: any, instance: WorkflowInstance): Promise<any> {
    // Execute actions if defined
    let actionResults = {};
    if (step.actions && Array.isArray(step.actions)) {
      actionResults = await this.executeActions(step.actions, instance);
    }
    
    return {
      status: 'completed',
      action: step.actions ? step.actions[0] : null,
      result: actionResults,
      variables: {}
    };
  }
  
  /**
   * Execute a form step
   */
  private async executeFormStep(step: any, instance: WorkflowInstance): Promise<any> {
    // Form step requires form data to be in variables
    const requiredFields = (step.form?.fields || [])
      .filter(field => field.required)
      .map(field => field.name);
    
    // Check if required fields are present in variables
    for (const field of requiredFields) {
      if (!(instance.variables && field in instance.variables)) {
        return {
          status: 'waiting_for_input',
          result: {
            form: step.form,
            missingFields: requiredFields.filter(f => !(instance.variables && f in instance.variables))
          },
          variables: {}
        };
      }
    }
    
    // All required fields are present, form is complete
    return {
      status: 'completed',
      result: {
        formData: Object.fromEntries(
          (step.form?.fields || [])
            .map(field => field.name)
            .filter(name => instance.variables && name in instance.variables)
            .map(name => [name, instance.variables[name]])
        )
      },
      variables: {}
    };
  }
  
  /**
   * Execute a decision step
   */
  private async executeDecisionStep(step: any, instance: WorkflowInstance): Promise<any> {
    // Evaluate the condition
    const { field, operator, value } = step.condition;
    
    // Get the field value from variables
    const fieldPath = field.split('.');
    let fieldValue = instance.variables;
    
    for (const part of fieldPath) {
      if (!fieldValue || typeof fieldValue !== 'object') {
        fieldValue = undefined;
        break;
      }
      fieldValue = fieldValue[part];
    }
    
    // Evaluate condition based on operator
    let conditionResult = false;
    
    switch (operator) {
      case 'equals':
        conditionResult = fieldValue === value;
        break;
      case 'notEquals':
        conditionResult = fieldValue !== value;
        break;
      case 'greaterThan':
        conditionResult = fieldValue > value;
        break;
      case 'lessThan':
        conditionResult = fieldValue < value;
        break;
      case 'contains':
        conditionResult = Array.isArray(fieldValue) 
          ? fieldValue.includes(value)
          : String(fieldValue).includes(String(value));
        break;
      case 'empty':
        conditionResult = !fieldValue || 
          (Array.isArray(fieldValue) && fieldValue.length === 0) ||
          (typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0);
        break;
      case 'notEmpty':
        conditionResult = fieldValue && 
          (!Array.isArray(fieldValue) || fieldValue.length > 0) &&
          (typeof fieldValue !== 'object' || Object.keys(fieldValue).length > 0);
        break;
      default:
        throw createError(`Unknown operator: ${operator}`, 400, 'INVALID_CONDITION_OPERATOR');
    }
    
    return {
      status: 'completed',
      result: {
        condition: conditionResult,
        evaluation: {
          field,
          fieldValue,
          operator,
          compareValue: value
        }
      },
      variables: {}
    };
  }
  
  /**
   * Execute an approval step
   */
  private async executeApprovalStep(step: any, instance: WorkflowInstance): Promise<any> {
    // Check if approval decision is in variables
    if (!(instance.variables && 'approvalDecision' in instance.variables)) {
      return {
        status: 'waiting_for_approval',
        result: {
          approverRole: step.approverRole,
          approvalContext: {
            workflowName: instance.name,
            entityType: instance.relatedEntityType,
            entityId: instance.relatedEntityId
          }
        },
        variables: {}
      };
    }
    
    // Approval decision is present
    const approved = instance.variables.approvalDecision === true;
    
    return {
      status: 'completed',
      result: {
        approved,
        approver: instance.variables.approver || 'unknown',
        approvalDate: instance.variables.approvalDate || new Date(),
        comments: instance.variables.approvalComments
      },
      variables: {}
    };
  }
  
  /**
   * Execute a system step
   */
  private async executeSystemStep(step: any, instance: WorkflowInstance): Promise<any> {
    // Execute actions if defined
    let actionResults = {};
    let newVariables = {};
    
    if (step.actions && Array.isArray(step.actions)) {
      const { results, variables } = await this.executeSystemActions(
        step.actions, 
        instance
      );
      
      actionResults = results;
      newVariables = variables;
    }
    
    return {
      status: 'completed',
      action: step.actions ? step.actions[0] : null,
      result: actionResults,
      variables: newVariables
    };
  }
  
  /**
   * Execute system actions
   */
  private async executeSystemActions(
    actions: any[], 
    instance: WorkflowInstance
  ): Promise<{ results: any, variables: any }> {
    const results = {};
    const variables = {};
    
    for (const action of actions) {
      switch (action.type) {
        case 'calculate':
          const calculationResult = await this.executeCalculation(
            action.config, 
            instance
          );
          
          results[action.type] = calculationResult.result;
          Object.assign(variables, calculationResult.variables);
          break;
          
        default:
          results[action.type] = {
            error: `Unsupported system action type: ${action.type}`
          };
      }
    }
    
    return { results, variables };
  }
  
  /**
   * Execute a calculation action
   */
  private async executeCalculation(
    config: any, 
    instance: WorkflowInstance
  ): Promise<{ result: any, variables: any }> {
    const operation = config.operation;
    
    switch (operation) {
      case 'generate_appeal_recommendation':
        // For property appeal workflows, generate appeal recommendation
        if (
          instance.relatedEntityType === 'property' && 
          instance.relatedEntityId && 
          instance.variables
        ) {
          const propertyId = instance.relatedEntityId;
          const tenantId = instance.variables.tenantId || 1;
          
          try {
            // Generate recommendations using appeal recommendation service
            // This would typically be injected or accessed through a service registry
            // For simplicity, we're accessing it directly through the repository
            const recommendation = await this.repository.generateAppealRecommendations(
              propertyId, 
              tenantId
            );
            
            return {
              result: {
                success: true,
                recommendationGenerated: true
              },
              variables: {
                recommendation
              }
            };
          } catch (error) {
            return {
              result: {
                success: false,
                error: error.message
              },
              variables: {
                recommendation: {
                  probability: 0,
                  potentialSavings: 0,
                  evidence: []
                }
              }
            };
          }
        }
        
        return {
          result: {
            success: false,
            error: 'Missing property information'
          },
          variables: {}
        };
        
      default:
        return {
          result: {
            success: false,
            error: `Unknown calculation operation: ${operation}`
          },
          variables: {}
        };
    }
  }
  
  /**
   * Execute workflow step actions
   */
  private async executeActions(actions: any[], instance: WorkflowInstance): Promise<any> {
    const results = {};
    
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'update_property':
            if (instance.relatedEntityType === 'property' && instance.relatedEntityId) {
              const propertyId = instance.relatedEntityId;
              const tenantId = instance.variables?.tenantId || 1;
              
              // Process dynamic values in config
              const processedConfig = this.processDynamicValues(action.config, instance);
              
              await this.repository.updateProperty(propertyId, {
                ...processedConfig,
                // Include tenant ID in case needed
                tenantId
              });
              
              results[action.type] = {
                success: true,
                propertyId
              };
            } else {
              results[action.type] = {
                success: false,
                error: 'Missing property information'
              };
            }
            break;
            
          case 'create_property_appeal':
            if (
              instance.relatedEntityType === 'property' && 
              instance.relatedEntityId && 
              instance.variables
            ) {
              const propertyId = instance.relatedEntityId;
              const tenantId = instance.variables.tenantId || 1;
              
              // Create appeal using data from workflow variables
              const { appealData } = instance.variables;
              
              if (appealData) {
                const appeal = await this.repository.createPropertyAppeal({
                  propertyId,
                  tenantId,
                  valuationId: appealData.valuationId,
                  submittedBy: appealData.submittedBy || 1,
                  reason: appealData.reason,
                  requestedValue: appealData.requestedValue,
                  evidenceUrls: appealData.evidenceUrls || [],
                  status: 'pending',
                  submittedAt: new Date()
                });
                
                results[action.type] = {
                  success: true,
                  appealId: appeal.id
                };
              } else {
                results[action.type] = {
                  success: false,
                  error: 'Missing appeal data in workflow variables'
                };
              }
            } else {
              results[action.type] = {
                success: false,
                error: 'Missing property information'
              };
            }
            break;
            
          case 'create_calendar_event':
            // In a real system, this would integrate with a calendar provider
            // For now, we'll just simulate it
            results[action.type] = {
              success: true,
              eventId: `event-${Date.now()}`,
              title: action.config.title,
              date: new Date(Date.now() + (action.config.daysInFuture || 1) * 86400000)
            };
            break;
            
          case 'notify':
            // In a real system, this would send notifications via email, SMS, etc.
            // For now, we'll just simulate it
            results[action.type] = {
              success: true,
              notificationType: action.config.channel,
              template: action.config.template,
              recipients: instance.variables?.notificationRecipients || ['user@example.com']
            };
            break;
            
          default:
            results[action.type] = {
              success: false,
              error: `Unsupported action type: ${action.type}`
            };
        }
      } catch (error) {
        results[action.type] = {
          success: false,
          error: error.message
        };
      }
    }
    
    return results;
  }
  
  /**
   * Process dynamic values in action config
   * Replaces placeholders like {{currentDate}} with actual values
   */
  private processDynamicValues(config: any, instance: WorkflowInstance): any {
    if (!config) return {};
    
    const result = {};
    
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        if (value === '{{currentDate}}') {
          result[key] = new Date();
        } else if (value.startsWith('{{') && value.endsWith('}}')) {
          // Extract variable name
          const varName = value.slice(2, -2);
          // Get value from instance variables
          result[key] = instance.variables?.[varName] ?? value;
        } else {
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.router.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok' });
    });

    // Create workflow template
    this.router.post('/templates', async (req: Request, res: Response) => {
      try {
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        // Validate request body
        const schema = z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          category: z.string().min(1),
          steps: z.array(z.any()).min(1),
          triggers: z.array(z.any()).optional(),
          isActive: z.boolean().optional()
        });
        
        const body = schema.parse(req.body);
        
        // Create template
        const template = await this.repository.createWorkflowTemplate({
          ...body,
          tenantId,
          createdBy: parseInt(req.query.userId as string) || 1
        } as InsertWorkflowTemplate);
        
        res.status(201).json(template);
      } catch (error) {
        if (error.name === 'ZodError') {
          res.status(400).json({ message: 'Invalid request data', details: error.errors });
        } else {
          res.status(error.status || 500).json({ 
            message: error.message || 'Internal server error' 
          });
        }
      }
    });

    // Get all workflow templates
    this.router.get('/templates', async (req: Request, res: Response) => {
      try {
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        const templates = await this.repository.getAllWorkflowTemplates(tenantId);
        
        res.status(200).json(templates);
      } catch (error) {
        res.status(error.status || 500).json({ 
          message: error.message || 'Internal server error' 
        });
      }
    });

    // Get workflow template by ID
    this.router.get('/templates/:id', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        const template = await this.repository.getWorkflowTemplate(id, tenantId);
        
        if (!template) {
          return res.status(404).json({ message: 'Workflow template not found' });
        }
        
        res.status(200).json(template);
      } catch (error) {
        res.status(error.status || 500).json({ 
          message: error.message || 'Internal server error' 
        });
      }
    });

    // Update workflow template
    this.router.patch('/templates/:id', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        // Validate request body
        const schema = z.object({
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          category: z.string().min(1).optional(),
          steps: z.array(z.any()).min(1).optional(),
          triggers: z.array(z.any()).optional(),
          isActive: z.boolean().optional()
        });
        
        const body = schema.parse(req.body);
        
        // Update template
        const template = await this.repository.updateWorkflowTemplate(id, {
          ...body,
          tenantId
        });
        
        if (!template) {
          return res.status(404).json({ message: 'Workflow template not found' });
        }
        
        res.status(200).json(template);
      } catch (error) {
        if (error.name === 'ZodError') {
          res.status(400).json({ message: 'Invalid request data', details: error.errors });
        } else {
          res.status(error.status || 500).json({ 
            message: error.message || 'Internal server error' 
          });
        }
      }
    });

    // Create workflow instance
    this.router.post('/instances', async (req: Request, res: Response) => {
      try {
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        // Validate request body
        const schema = z.object({
          templateId: z.number().int().positive(),
          name: z.string().min(1),
          relatedEntityType: z.string().optional(),
          relatedEntityId: z.number().int().positive().optional(),
          variables: z.record(z.any()).optional()
        });
        
        const body = schema.parse(req.body);
        
        // Verify template exists
        const template = await this.repository.getWorkflowTemplate(body.templateId, tenantId);
        if (!template) {
          return res.status(404).json({ message: 'Workflow template not found' });
        }
        
        // Create instance
        const instance = await this.repository.createWorkflowInstance({
          ...body,
          tenantId,
          status: 'active'
        } as InsertWorkflowInstance);
        
        res.status(201).json(instance);
      } catch (error) {
        if (error.name === 'ZodError') {
          res.status(400).json({ message: 'Invalid request data', details: error.errors });
        } else {
          res.status(error.status || 500).json({ 
            message: error.message || 'Internal server error' 
          });
        }
      }
    });

    // Get all workflow instances
    this.router.get('/instances', async (req: Request, res: Response) => {
      try {
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        const instances = await this.repository.getAllWorkflowInstances(tenantId);
        
        res.status(200).json(instances);
      } catch (error) {
        res.status(error.status || 500).json({ 
          message: error.message || 'Internal server error' 
        });
      }
    });

    // Get workflow instance by ID
    this.router.get('/instances/:id', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        const instance = await this.repository.getWorkflowInstance(id, tenantId);
        
        if (!instance) {
          return res.status(404).json({ message: 'Workflow instance not found' });
        }
        
        res.status(200).json(instance);
      } catch (error) {
        res.status(error.status || 500).json({ 
          message: error.message || 'Internal server error' 
        });
      }
    });

    // Update workflow instance
    this.router.patch('/instances/:id', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        // Validate request body
        const schema = z.object({
          status: z.enum(['active', 'suspended', 'completed', 'error']).optional(),
          currentStepIndex: z.number().int().min(0).optional(),
          variables: z.record(z.any()).optional()
        });
        
        const body = schema.parse(req.body);
        
        // Update instance
        const instance = await this.repository.updateWorkflowInstance(id, {
          ...body,
          tenantId
        });
        
        if (!instance) {
          return res.status(404).json({ message: 'Workflow instance not found' });
        }
        
        res.status(200).json(instance);
      } catch (error) {
        if (error.name === 'ZodError') {
          res.status(400).json({ message: 'Invalid request data', details: error.errors });
        } else {
          res.status(error.status || 500).json({ 
            message: error.message || 'Internal server error' 
          });
        }
      }
    });

    // Execute workflow step
    this.router.post('/instances/:id/execute', async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        // Execute workflow step
        const result = await this.executeWorkflowStep(id, tenantId);
        
        res.status(200).json(result);
      } catch (error) {
        res.status(error.status || 500).json({ 
          message: error.message || 'Internal server error',
          code: error.code || 'EXECUTION_ERROR'
        });
      }
    });

    // Get workflows for entity
    this.router.get('/entity/:type/:id', async (req: Request, res: Response) => {
      try {
        const entityType = req.params.type;
        const entityId = parseInt(req.params.id);
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        const instances = await this.repository.getEntityWorkflowInstances(
          entityType, 
          entityId, 
          tenantId
        );
        
        res.status(200).json(instances);
      } catch (error) {
        res.status(error.status || 500).json({ 
          message: error.message || 'Internal server error' 
        });
      }
    });
  }
}

export function createWorkflowEngineService(repository: IStorage): WorkflowEngineService {
  return new WorkflowEngineService(repository);
}