import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { MemStorage } from '../server/storage';
import { InsertWorkflowTemplate, InsertWorkflowInstance, InsertProperty } from '@shared/schema';

describe('Workflow Automation Engine', () => {
  let storage: MemStorage;
  let tenantId: number = 1;
  let userId: number = 1;
  let propertyId: number;
  let inspectionTemplateId: number;
  
  beforeEach(async () => {
    storage = new MemStorage();
    
    // Create a test property
    const property = await storage.createProperty({
      tenantId,
      parcelId: "WORKFLOW12345",
      address: "123 Workflow Street",
      city: "Testville",
      state: "TS",
      zipCode: "12345",
      propertyType: "residential",
      zoneCode: "R1",
      landArea: 10000,
      createdBy: userId,
      status: "active"
    } as InsertProperty);
    
    propertyId = property.id;
    
    // Create test workflow templates
    // 1. Property Inspection Workflow
    const inspectionTemplate = await storage.createWorkflowTemplate({
      tenantId,
      name: "Property Inspection",
      description: "Standard process for property inspection",
      category: "property",
      isActive: true,
      createdBy: userId,
      steps: [
        {
          id: "schedule_inspection",
          name: "Schedule Inspection",
          type: "task",
          assigneeRole: "inspector",
          dueDate: { days: 5 },
          actions: [
            { type: "create_calendar_event", config: { title: "Property Inspection", durationMinutes: 60 } }
          ],
          nextStepId: "perform_inspection"
        },
        {
          id: "perform_inspection",
          name: "Perform Inspection",
          type: "task",
          assigneeRole: "inspector",
          dueDate: { days: 1 },
          actions: [
            { type: "update_property", config: { status: "inspection_in_progress" } }
          ],
          nextStepId: "record_findings"
        },
        {
          id: "record_findings",
          name: "Record Inspection Findings",
          type: "form",
          form: {
            fields: [
              { name: "condition", type: "select", options: ["excellent", "good", "average", "poor"], required: true },
              { name: "notes", type: "textarea", required: false },
              { name: "photos", type: "file_upload", multiple: true, required: true }
            ]
          },
          nextStepId: "decision_point"
        },
        {
          id: "decision_point",
          name: "Evaluate Findings",
          type: "decision",
          condition: {
            field: "condition",
            operator: "equals",
            value: "poor"
          },
          trueStepId: "create_improvement_plan",
          falseStepId: "complete_inspection"
        },
        {
          id: "create_improvement_plan",
          name: "Create Improvement Plan",
          type: "task",
          assigneeRole: "property_manager",
          dueDate: { days: 10 },
          actions: [
            { type: "notify", config: { channel: "email", template: "improvement_plan_needed" } }
          ],
          nextStepId: "complete_inspection"
        },
        {
          id: "complete_inspection",
          name: "Complete Inspection",
          type: "task",
          actions: [
            { type: "update_property", config: { status: "inspection_completed", lastInspectionDate: "{{currentDate}}" } },
            { type: "notify", config: { channel: "email", template: "inspection_completed" } }
          ],
          isTerminal: true
        }
      ],
      triggers: [
        { type: "property_created", config: { propertyTypes: ["commercial"] } },
        { type: "manual" },
        { type: "scheduled", config: { interval: "yearly" } }
      ]
    } as InsertWorkflowTemplate);
    
    inspectionTemplateId = inspectionTemplate.id;
    
    // 2. Valuation Appeal Workflow
    await storage.createWorkflowTemplate({
      tenantId,
      name: "Valuation Appeal Process",
      description: "Standard process for appealing property valuations",
      category: "appeal",
      isActive: true,
      createdBy: userId,
      steps: [
        {
          id: "evaluate_appeal_potential",
          name: "Evaluate Appeal Potential",
          type: "system",
          actions: [
            { type: "calculate", config: { operation: "generate_appeal_recommendation" } }
          ],
          nextStepId: "decision_continue"
        },
        {
          id: "decision_continue",
          name: "Decision to Continue",
          type: "decision",
          condition: {
            field: "recommendation.probability",
            operator: "greaterThan",
            value: 50
          },
          trueStepId: "gather_evidence",
          falseStepId: "low_probability_end"
        },
        {
          id: "low_probability_end",
          name: "End Process - Low Probability",
          type: "task",
          actions: [
            { type: "notify", config: { channel: "email", template: "appeal_not_recommended" } }
          ],
          isTerminal: true
        },
        {
          id: "gather_evidence",
          name: "Gather Supporting Evidence",
          type: "task",
          assigneeRole: "analyst",
          dueDate: { days: 14 },
          nextStepId: "prepare_appeal_document"
        },
        {
          id: "prepare_appeal_document",
          name: "Prepare Appeal Document",
          type: "task",
          assigneeRole: "analyst",
          dueDate: { days: 7 },
          nextStepId: "review_appeal"
        },
        {
          id: "review_appeal",
          name: "Review Appeal",
          type: "approval",
          approverRole: "manager",
          dueDate: { days: 3 },
          nextStepId: "submit_appeal"
        },
        {
          id: "submit_appeal",
          name: "Submit Appeal to Authorities",
          type: "task",
          assigneeRole: "analyst",
          dueDate: { days: 1 },
          actions: [
            { type: "create_property_appeal", config: {} },
            { type: "notify", config: { channel: "email", template: "appeal_submitted" } }
          ],
          nextStepId: "track_appeal_status"
        },
        {
          id: "track_appeal_status",
          name: "Track Appeal Status",
          type: "task",
          assigneeRole: "analyst",
          dueDate: { days: 30 },
          isTerminal: true
        }
      ],
      triggers: [
        { type: "property_valuation_created", config: {} },
        { type: "manual" }
      ]
    } as InsertWorkflowTemplate);
  });
  
  test('should execute property inspection workflow correctly', async () => {
    // Start a new workflow instance
    const workflowInstance = await storage.createWorkflowInstance({
      templateId: inspectionTemplateId,
      tenantId,
      name: "Inspection for 123 Workflow Street",
      status: "active",
      relatedEntityType: "property",
      relatedEntityId: propertyId,
      variables: {
        propertyId,
        assignedInspector: userId
      }
    } as InsertWorkflowInstance);
    
    expect(workflowInstance).toBeDefined();
    expect(workflowInstance.id).toBeDefined();
    expect(workflowInstance.currentStepIndex).toBe(0);
    
    // Execute first step
    const stepOneResult = await storage.executeWorkflowStep(workflowInstance.id, tenantId);
    
    expect(stepOneResult.currentStepIndex).toBe(1);
    expect(stepOneResult.logs).toBeDefined();
    expect(Array.isArray(stepOneResult.logs)).toBe(true);
    expect(stepOneResult.logs.length).toBeGreaterThan(0);
    expect(stepOneResult.logs[0]).toHaveProperty('stepId', 'schedule_inspection');
    expect(stepOneResult.logs[0]).toHaveProperty('status', 'completed');
    
    // Execute second step
    const stepTwoResult = await storage.executeWorkflowStep(stepOneResult.id, tenantId);
    
    expect(stepTwoResult.currentStepIndex).toBe(2);
    
    // Check if property status was updated
    const property = await storage.getProperty(propertyId, tenantId);
    expect(property.status).toBe('inspection_in_progress');
    
    // Simulate form submission for third step
    stepTwoResult.variables = {
      ...stepTwoResult.variables,
      condition: 'good',
      notes: 'Property is in good condition, minor wear and tear',
      photos: ['photo1.jpg', 'photo2.jpg']
    };
    
    await storage.updateWorkflowInstance(stepTwoResult.id, stepTwoResult);
    
    // Execute third step (form)
    const stepThreeResult = await storage.executeWorkflowStep(stepTwoResult.id, tenantId);
    
    expect(stepThreeResult.currentStepIndex).toBe(3);
    
    // Execute fourth step (decision point)
    const stepFourResult = await storage.executeWorkflowStep(stepThreeResult.id, tenantId);
    
    // Since condition is 'good', it should skip the improvement plan and go to complete
    expect(stepFourResult.currentStepIndex).toBe(5);
    
    // Execute final step
    const finalResult = await storage.executeWorkflowStep(stepFourResult.id, tenantId);
    
    expect(finalResult.status).toBe('completed');
    expect(finalResult.completedAt).toBeDefined();
    
    // Check property was updated
    const updatedProperty = await storage.getProperty(propertyId, tenantId);
    expect(updatedProperty.status).toBe('inspection_completed');
    expect(updatedProperty.propertyDetails).toHaveProperty('lastInspectionDate');
  });
  
  test('should handle conditional branches in workflows', async () => {
    // Start a new workflow instance
    const workflowInstance = await storage.createWorkflowInstance({
      templateId: inspectionTemplateId,
      tenantId,
      name: "Inspection for 123 Workflow Street - Poor Condition",
      status: "active",
      relatedEntityType: "property",
      relatedEntityId: propertyId,
      variables: {
        propertyId,
        assignedInspector: userId
      }
    } as InsertWorkflowInstance);
    
    // Fast forward to the decision point
    let currentInstance = workflowInstance;
    
    // Execute first step
    currentInstance = await storage.executeWorkflowStep(currentInstance.id, tenantId);
    
    // Execute second step
    currentInstance = await storage.executeWorkflowStep(currentInstance.id, tenantId);
    
    // Simulate form submission for third step with POOR condition
    currentInstance.variables = {
      ...currentInstance.variables,
      condition: 'poor', // This should trigger the improvement plan branch
      notes: 'Property needs significant repairs',
      photos: ['damaged1.jpg', 'damaged2.jpg']
    };
    
    await storage.updateWorkflowInstance(currentInstance.id, currentInstance);
    
    // Execute third step (form)
    currentInstance = await storage.executeWorkflowStep(currentInstance.id, tenantId);
    
    // Execute fourth step (decision point)
    currentInstance = await storage.executeWorkflowStep(currentInstance.id, tenantId);
    
    // Since condition is 'poor', it should go to the improvement plan step
    expect(currentInstance.currentStepIndex).toBe(4);
    
    // Execute improvement plan step
    currentInstance = await storage.executeWorkflowStep(currentInstance.id, tenantId);
    
    // Now it should be at the complete step
    expect(currentInstance.currentStepIndex).toBe(5);
  });
  
  test('should generate appropriate notifications for workflow events', async () => {
    // Start a new workflow instance
    const workflowInstance = await storage.createWorkflowInstance({
      templateId: inspectionTemplateId,
      tenantId,
      name: "Inspection with Notifications",
      status: "active",
      relatedEntityType: "property",
      relatedEntityId: propertyId,
      variables: {
        propertyId,
        assignedInspector: userId,
        notificationRecipients: ["test@example.com"]
      }
    } as InsertWorkflowInstance);
    
    // Fast forward to completion
    let currentInstance = workflowInstance;
    
    // Execute first step
    currentInstance = await storage.executeWorkflowStep(currentInstance.id, tenantId);
    
    // Execute second step
    currentInstance = await storage.executeWorkflowStep(currentInstance.id, tenantId);
    
    // Simulate form submission
    currentInstance.variables = {
      ...currentInstance.variables,
      condition: 'good',
      notes: 'Property is in good condition',
      photos: ['photo1.jpg']
    };
    
    await storage.updateWorkflowInstance(currentInstance.id, currentInstance);
    
    // Execute third step (form)
    currentInstance = await storage.executeWorkflowStep(currentInstance.id, tenantId);
    
    // Execute fourth step (decision)
    currentInstance = await storage.executeWorkflowStep(currentInstance.id, tenantId);
    
    // Execute final step which includes notifications
    const finalResult = await storage.executeWorkflowStep(currentInstance.id, tenantId);
    
    // Check that notifications were generated
    expect(finalResult.logs).toBeDefined();
    expect(Array.isArray(finalResult.logs)).toBe(true);
    
    // Find notification logs
    const notificationLogs = finalResult.logs.filter(log => 
      log.action && log.action.type === 'notify'
    );
    
    expect(notificationLogs.length).toBeGreaterThan(0);
    expect(notificationLogs[0]).toHaveProperty('status', 'completed');
    expect(notificationLogs[0]).toHaveProperty('result');
    expect(notificationLogs[0].result).toHaveProperty('recipients');
    expect(notificationLogs[0].result.recipients).toContain("test@example.com");
  });
  
  test('should recover from failed workflow steps', async () => {
    // Create a workflow instance with a simulated failure
    const workflowInstance = await storage.createWorkflowInstance({
      templateId: inspectionTemplateId,
      tenantId,
      name: "Inspection with Error Recovery",
      status: "active",
      relatedEntityType: "property",
      relatedEntityId: propertyId,
      variables: {
        propertyId,
        assignedInspector: userId,
        simulateError: true // Flag to simulate an error
      }
    } as InsertWorkflowInstance);
    
    // Attempt to execute first step - should fail due to simulateError flag
    try {
      await storage.executeWorkflowStep(workflowInstance.id, tenantId);
    } catch (error) {
      // Expected error
    }
    
    // Get the current state - should be in error state
    const errorState = await storage.getWorkflowInstance(workflowInstance.id, tenantId);
    expect(errorState.status).toBe('error');
    
    // Attempt recovery by removing error flag and retrying
    errorState.variables = {
      ...errorState.variables,
      simulateError: false,
      retry: true
    };
    
    await storage.updateWorkflowInstance(errorState.id, errorState);
    
    // Resume workflow
    const recoveredInstance = await storage.executeWorkflowStep(errorState.id, tenantId);
    
    // Should have recovered and moved to next step
    expect(recoveredInstance.status).toBe('active');
    expect(recoveredInstance.currentStepIndex).toBe(1);
  });
});