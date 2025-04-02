import { 
  users, type User, type InsertUser,
  tenants, type Tenant, type InsertTenant, 
  subscriptions, type Subscription, type InsertSubscription,
  plans, type Plan, type InsertPlan,
  properties, type Property, type InsertProperty,
  propertyValuations, type PropertyValuation, type InsertPropertyValuation,
  propertyAppeals, type PropertyAppeal, type InsertPropertyAppeal,
  taxRates, type TaxRate, type InsertTaxRate,
  workflowTemplates, type WorkflowTemplate, type InsertWorkflowTemplate,
  workflowInstances, type WorkflowInstance, type InsertWorkflowInstance,
  marketData, type MarketData, type InsertMarketData
} from "@shared/schema";

import {
  type McpFunction, type McpWorkflow, type McpExecution,
  type InsertMcpFunction, type InsertMcpWorkflow, type InsertMcpExecution
} from "@shared/mcp-schema";
import { bentonCountyProperties, bentonCountyTaxRates } from './data/benton-county-properties';

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Tenant operations
  getTenant(id: number): Promise<Tenant | undefined>;
  getTenantByDomain(domain: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  getAllTenants(): Promise<Tenant[]>;
  updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant | undefined>;
  
  // Subscription operations
  getSubscription(id: number): Promise<Subscription | undefined>;
  getSubscriptionByTenantId(tenantId: number): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  
  // Plan operations
  getPlan(id: number): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  getAllPlans(): Promise<Plan[]>;
  updatePlan(id: number, plan: Partial<InsertPlan>): Promise<Plan | undefined>;

  // Property operations
  getProperty(id: number, tenantId: number): Promise<Property | undefined>;
  getAllProperties(tenantId: number): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined>;
  
  // Property Valuation operations
  getPropertyValuation(id: number, tenantId: number): Promise<PropertyValuation | undefined>;
  getAllPropertyValuations(propertyId: number, tenantId: number): Promise<PropertyValuation[]>;
  createPropertyValuation(valuation: InsertPropertyValuation): Promise<PropertyValuation>;
  calculatePropertyValuation(propertyId: number, valuationMethod: string, assessmentDate: Date): Promise<PropertyValuation>;
  generatePredictiveValuation(propertyId: number, predictionDate: Date): Promise<PropertyValuation>;
  
  // Property Appeal operations
  getPropertyAppeal(id: number, tenantId: number): Promise<PropertyAppeal | undefined>;
  getAllPropertyAppeals(propertyId: number, tenantId: number): Promise<PropertyAppeal[]>;
  createPropertyAppeal(appeal: InsertPropertyAppeal): Promise<PropertyAppeal>;
  updatePropertyAppeal(id: number, appeal: Partial<InsertPropertyAppeal>): Promise<PropertyAppeal | undefined>;
  generateAppealRecommendations(propertyId: number, tenantId: number): Promise<{
    probability: number;
    potentialSavings: number;
    recommendedValue: number;
    evidence: Array<{type: string, description: string, impact: number}>;
  }>;
  
  // Tax Rate operations
  getTaxRate(id: number, tenantId: number): Promise<TaxRate | undefined>;
  getTaxRates(tenantId: number): Promise<TaxRate[]>;
  createTaxRate(taxRate: InsertTaxRate): Promise<TaxRate>;
  updateTaxRate(id: number, taxRate: Partial<InsertTaxRate>): Promise<TaxRate | undefined>;

  // Workflow Template operations
  getWorkflowTemplate(id: number, tenantId: number): Promise<WorkflowTemplate | undefined>;
  getAllWorkflowTemplates(tenantId: number): Promise<WorkflowTemplate[]>;
  createWorkflowTemplate(template: InsertWorkflowTemplate): Promise<WorkflowTemplate>;
  updateWorkflowTemplate(id: number, template: Partial<InsertWorkflowTemplate>): Promise<WorkflowTemplate | undefined>;
  
  // Workflow Instance operations
  getWorkflowInstance(id: number, tenantId: number): Promise<WorkflowInstance | undefined>;
  getAllWorkflowInstances(tenantId: number): Promise<WorkflowInstance[]>;
  getEntityWorkflowInstances(entityType: string, entityId: number, tenantId: number): Promise<WorkflowInstance[]>;
  createWorkflowInstance(instance: InsertWorkflowInstance): Promise<WorkflowInstance>;
  updateWorkflowInstance(id: number, instance: Partial<InsertWorkflowInstance>): Promise<WorkflowInstance | undefined>;
  executeWorkflowStep(instanceId: number, tenantId: number): Promise<WorkflowInstance>;
  
  // Market Data operations
  getMarketData(id: number, tenantId: number): Promise<MarketData | undefined>;
  getAllMarketData(tenantId: number): Promise<MarketData[]>;
  getMarketDataByRegion(region: string, regionType: string, tenantId: number): Promise<MarketData[]>;
  createMarketData(data: InsertMarketData): Promise<MarketData>;
  getMarketTrends(region: string, regionType: string, dataType: string, tenantId: number, period: {start: Date, end: Date}): Promise<Array<{date: Date, value: number}>>;
  
  // MCP Function operations
  getMcpFunction(id: number): Promise<McpFunction | undefined>;
  getMcpFunctionByName(name: string): Promise<McpFunction | undefined>;
  getAllMcpFunctions(): Promise<McpFunction[]>;
  createMcpFunction(function_: any): Promise<McpFunction>;
  updateMcpFunction(id: number, function_: Partial<any>): Promise<McpFunction | undefined>;
  
  // MCP Workflow operations
  getMcpWorkflow(id: number): Promise<McpWorkflow | undefined>;
  getMcpWorkflowByName(name: string): Promise<McpWorkflow | undefined>;
  getAllMcpWorkflows(): Promise<McpWorkflow[]>;
  createMcpWorkflow(workflow: any): Promise<McpWorkflow>;
  updateMcpWorkflow(id: number, workflow: Partial<any>): Promise<McpWorkflow | undefined>;
  
  // MCP Execution operations
  getMcpExecution(id: number): Promise<McpExecution | undefined>;
  createMcpExecution(execution: any): Promise<McpExecution>;
  updateMcpExecution(id: number, execution: Partial<any>): Promise<McpExecution | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tenants: Map<number, Tenant>;
  private subscriptions: Map<number, Subscription>;
  private plans: Map<number, Plan>;
  private properties: Map<number, Property>;
  private propertyValuations: Map<number, PropertyValuation>;
  private propertyAppeals: Map<number, PropertyAppeal>;
  private taxRates: Map<number, TaxRate>;
  
  // New schema additions
  private workflowTemplates: Map<number, WorkflowTemplate>;
  private workflowInstances: Map<number, WorkflowInstance>;
  private marketData: Map<number, MarketData>;
  
  private currentUserId: number;
  private currentTenantId: number;
  private currentSubscriptionId: number;
  private currentPlanId: number;
  private currentPropertyId: number;
  private currentPropertyValuationId: number;
  private currentPropertyAppealId: number;
  private currentTaxRateId: number;
  private currentWorkflowTemplateId: number;
  private currentWorkflowInstanceId: number;
  private currentMarketDataId: number;
  
  // MCP private properties
  private mcpFunctions: Map<number, McpFunction>;
  private mcpWorkflows: Map<number, McpWorkflow>;
  private mcpExecutions: Map<number, McpExecution>;
  private currentMcpFunctionId: number;
  private currentMcpWorkflowId: number;
  private currentMcpExecutionId: number;

  constructor() {
    this.users = new Map();
    this.tenants = new Map();
    this.subscriptions = new Map();
    this.plans = new Map();
    this.properties = new Map();
    this.propertyValuations = new Map();
    this.propertyAppeals = new Map();
    this.taxRates = new Map();
    
    // Initialize new maps
    this.workflowTemplates = new Map();
    this.workflowInstances = new Map();
    this.marketData = new Map();
    
    // Initialize MCP Maps
    this.mcpFunctions = new Map();
    this.mcpWorkflows = new Map();
    this.mcpExecutions = new Map();
    
    this.currentUserId = 1;
    this.currentTenantId = 1;
    this.currentSubscriptionId = 1;
    this.currentPlanId = 1;
    this.currentPropertyId = 1;
    this.currentPropertyValuationId = 1;
    this.currentPropertyAppealId = 1;
    this.currentTaxRateId = 1;
    this.currentWorkflowTemplateId = 1;
    this.currentWorkflowInstanceId = 1;
    this.currentMarketDataId = 1;
    this.currentMcpFunctionId = 1;
    this.currentMcpWorkflowId = 1;
    this.currentMcpExecutionId = 1;
    
    // Create initial dev user
    this.createUser({
      username: "dev_admin",
      password: "dev_password",
      email: "dev@example.com",
      role: "admin",
      isDevUser: true
    });
    
    // Create initial system tenant
    this.createTenant({
      name: "System",
      domain: "bsbc.local",
      plan: "System",
      status: "active",
      adminEmail: "dev@example.com"
    });
    
    // Create initial plans
    this.createPlan({
      name: "Free Trial",
      description: "14-day trial period",
      price: 0,
      features: ["Basic features", "2 users"],
      isActive: true
    });
    
    this.createPlan({
      name: "Basic Plan",
      description: "For small teams",
      price: 2900, // $29.00
      features: ["All basic features", "Up to 10 users", "Basic reporting"],
      isActive: true
    });
    
    this.createPlan({
      name: "Premium Plan",
      description: "For growing businesses",
      price: 9900, // $99.00
      features: ["All features included", "Unlimited users", "Advanced reporting"],
      isActive: true
    });
    
    // Add Benton County WA properties
    for (const property of bentonCountyProperties) {
      this.createProperty(property);
    }
    
    // Add Benton County WA tax rates
    for (const taxRate of bentonCountyTaxRates) {
      this.createTaxRate(taxRate);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser,
      id,
      role: insertUser.role || 'user',
      isDevUser: insertUser.isDevUser ?? null,
      tenantId: insertUser.tenantId ?? null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userUpdate: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...userUpdate };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Tenant operations
  async getTenant(id: number): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }
  
  async getTenantByDomain(domain: string): Promise<Tenant | undefined> {
    return Array.from(this.tenants.values()).find(
      (tenant) => tenant.domain === domain,
    );
  }
  
  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const id = this.currentTenantId++;
    const tenant: Tenant = { 
      ...insertTenant, 
      id, 
      createdAt: new Date(),
      status: insertTenant.status || 'active',
      plan: insertTenant.plan || 'free_trial',
      settings: insertTenant.settings || {}
    };
    this.tenants.set(id, tenant);
    return tenant;
  }
  
  async getAllTenants(): Promise<Tenant[]> {
    return Array.from(this.tenants.values());
  }
  
  async updateTenant(id: number, tenantUpdate: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const existingTenant = this.tenants.get(id);
    if (!existingTenant) return undefined;
    
    const updatedTenant = { ...existingTenant, ...tenantUpdate };
    this.tenants.set(id, updatedTenant);
    return updatedTenant;
  }
  
  // Subscription operations
  async getSubscription(id: number): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }
  
  async getSubscriptionByTenantId(tenantId: number): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(
      (subscription) => subscription.tenantId === tenantId,
    );
  }
  
  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const id = this.currentSubscriptionId++;
    const subscription: Subscription = { 
      ...insertSubscription, 
      id,
      status: insertSubscription.status || 'active',
      startDate: insertSubscription.startDate || null,
      endDate: insertSubscription.endDate || null
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }
  
  async updateSubscription(id: number, subscriptionUpdate: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const existingSubscription = this.subscriptions.get(id);
    if (!existingSubscription) return undefined;
    
    const updatedSubscription = { ...existingSubscription, ...subscriptionUpdate };
    this.subscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }
  
  // Plan operations
  async getPlan(id: number): Promise<Plan | undefined> {
    return this.plans.get(id);
  }
  
  async createPlan(insertPlan: InsertPlan): Promise<Plan> {
    const id = this.currentPlanId++;
    const plan: Plan = { 
      ...insertPlan, 
      id,
      features: insertPlan.features || null,
      isActive: insertPlan.isActive ?? null
    };
    this.plans.set(id, plan);
    return plan;
  }
  
  async getAllPlans(): Promise<Plan[]> {
    return Array.from(this.plans.values());
  }
  
  async updatePlan(id: number, planUpdate: Partial<InsertPlan>): Promise<Plan | undefined> {
    const existingPlan = this.plans.get(id);
    if (!existingPlan) return undefined;
    
    const updatedPlan = { ...existingPlan, ...planUpdate };
    this.plans.set(id, updatedPlan);
    return updatedPlan;
  }

  // Property operations
  async getProperty(id: number, tenantId: number): Promise<Property | undefined> {
    const property = this.properties.get(id);
    if (!property || property.tenantId !== tenantId) return undefined;
    return property;
  }

  async getAllProperties(tenantId: number): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(
      (property) => property.tenantId === tenantId
    );
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = this.currentPropertyId++;
    const now = new Date();
    const property: Property = {
      ...insertProperty,
      id,
      createdAt: now,
      updatedAt: now,
      updatedBy: insertProperty.createdBy || null,
      status: insertProperty.status || 'active',
      features: insertProperty.features || null,
      propertyDetails: insertProperty.propertyDetails || {},
      buildingArea: insertProperty.buildingArea || null,
      yearBuilt: insertProperty.yearBuilt || null,
      bedrooms: insertProperty.bedrooms || null,
      bathrooms: insertProperty.bathrooms || null,
      lastAssessedValue: insertProperty.lastAssessedValue || null,
      lastAssessedDate: insertProperty.lastAssessedDate || null
    };
    this.properties.set(id, property);
    return property;
  }

  async updateProperty(id: number, propertyUpdate: Partial<InsertProperty>): Promise<Property | undefined> {
    const existingProperty = this.properties.get(id);
    if (!existingProperty) return undefined;
    
    const updatedProperty = {
      ...existingProperty,
      ...propertyUpdate,
      updatedAt: new Date()
    };
    
    if ('createdBy' in propertyUpdate) {
      updatedProperty.updatedBy = propertyUpdate.createdBy || null;
    }
    
    this.properties.set(id, updatedProperty);
    return updatedProperty;
  }

  // Property Valuation operations
  async getPropertyValuation(id: number, tenantId: number): Promise<PropertyValuation | undefined> {
    const valuation = this.propertyValuations.get(id);
    if (!valuation || valuation.tenantId !== tenantId) return undefined;
    return valuation;
  }

  async getAllPropertyValuations(propertyId: number, tenantId: number): Promise<PropertyValuation[]> {
    return Array.from(this.propertyValuations.values()).filter(
      (valuation) => valuation.propertyId === propertyId && valuation.tenantId === tenantId
    );
  }

  async createPropertyValuation(insertValuation: InsertPropertyValuation): Promise<PropertyValuation> {
    const id = this.currentPropertyValuationId++;
    const valuation: PropertyValuation = {
      ...insertValuation,
      id,
      createdAt: new Date(),
      status: insertValuation.status || 'draft',
      valuationFactors: insertValuation.valuationFactors || {},
      expirationDate: insertValuation.expirationDate || null,
      notes: insertValuation.notes || null
    };
    this.propertyValuations.set(id, valuation);
    return valuation;
  }

  async calculatePropertyValuation(propertyId: number, valuationMethod: string, assessmentDate: Date): Promise<PropertyValuation> {
    // Get the property
    const property = Array.from(this.properties.values()).find(p => p.id === propertyId);
    if (!property) {
      throw new Error('Property not found');
    }

    // Get the tax rate for the property's zone and type
    const taxRate = Array.from(this.taxRates.values()).find(
      tr => tr.tenantId === property.tenantId && 
           tr.zoneCode === property.zoneCode && 
           tr.propertyType === property.propertyType &&
           tr.status === 'active'
    );

    // Calculate market value based on the valuation method
    let marketValue = 0;
    let assessedValue = 0;
    let taxableValue = 0;
    let valuationFactors: any = {};

    switch (valuationMethod) {
      case 'income':
        // Income approach - simplified
        const annualIncome = 30000; // Example value, would be pulled from property data
        const capRate = 0.06; // Capitalization rate
        marketValue = Math.round(annualIncome / capRate);
        valuationFactors = { annualIncome, capRate };
        break;
      
      case 'sales_comparison':
        // Sales comparison approach - simplified
        const baseValue = 250000; // Base value for the area
        const sizeFactor = property.landArea / 5000; // Adjust based on lot size
        const conditionFactor = 1.1; // Property condition adjustment
        marketValue = Math.round(baseValue * sizeFactor * conditionFactor);
        valuationFactors = { baseValue, sizeFactor, conditionFactor };
        break;
      
      case 'cost':
        // Cost approach - simplified
        const landValue = property.landArea * 50; // $50 per sq ft
        const constructionCost = (property.buildingArea || 0) * 200; // $200 per sq ft
        const depreciationFactor = property.yearBuilt 
          ? 1 - Math.min(0.5, (new Date().getFullYear() - property.yearBuilt) * 0.01) // 1% per year, max 50%
          : 0.8;
        marketValue = Math.round(landValue + (constructionCost * depreciationFactor));
        valuationFactors = { landValue, constructionCost, depreciationFactor };
        break;
      
      default: // standard method - simplified
        // Base value plus adjustments for size and features
        const baseLandValue = property.landArea * 40; // $40 per sq ft
        const buildingValue = (property.buildingArea || 0) * 150; // $150 per sq ft
        const featureValue = (property.features?.length || 0) * 5000; // $5000 per feature
        marketValue = Math.round(baseLandValue + buildingValue + featureValue);
        valuationFactors = { baseLandValue, buildingValue, featureValue };
    }

    // Calculate assessed value (usually a percentage of market value, varies by jurisdiction)
    const assessmentRatio = 0.8; // 80% of market value
    assessedValue = Math.round(marketValue * assessmentRatio);
    
    // Calculate taxable value (assessed value minus exemptions)
    const exemptionAmount = taxRate?.exemptionAmount || 0;
    taxableValue = Math.max(0, assessedValue - exemptionAmount);

    // Create and return the valuation
    return this.createPropertyValuation({
      propertyId,
      tenantId: property.tenantId,
      assessedValue,
      marketValue,
      taxableValue,
      assessmentDate,
      effectiveDate: new Date(assessmentDate.getFullYear(), 0, 1), // January 1st of assessment year
      expirationDate: new Date(assessmentDate.getFullYear() + 1, 0, 1), // January 1st of next year
      valuationMethod,
      assessorId: 1, // Default to admin user
      status: 'draft',
      notes: `Valuation using ${valuationMethod} method`,
      valuationFactors
    });
  }

  // Property Appeal operations
  async getPropertyAppeal(id: number, tenantId: number): Promise<PropertyAppeal | undefined> {
    const appeal = this.propertyAppeals.get(id);
    if (!appeal || appeal.tenantId !== tenantId) return undefined;
    return appeal;
  }

  async getAllPropertyAppeals(propertyId: number, tenantId: number): Promise<PropertyAppeal[]> {
    return Array.from(this.propertyAppeals.values()).filter(
      (appeal) => appeal.propertyId === propertyId && appeal.tenantId === tenantId
    );
  }

  async createPropertyAppeal(insertAppeal: InsertPropertyAppeal): Promise<PropertyAppeal> {
    const id = this.currentPropertyAppealId++;
    const appeal: PropertyAppeal = {
      ...insertAppeal,
      id,
      reviewedAt: null,
      reviewedBy: null,
      decision: null,
      decisionReason: null,
      adjustedValue: null,
      status: insertAppeal.status || 'pending',
      evidenceUrls: insertAppeal.evidenceUrls || null
    };
    this.propertyAppeals.set(id, appeal);
    return appeal;
  }

  async updatePropertyAppeal(id: number, appealUpdate: Partial<InsertPropertyAppeal>): Promise<PropertyAppeal | undefined> {
    const existingAppeal = this.propertyAppeals.get(id);
    if (!existingAppeal) return undefined;
    
    const updatedAppeal = { ...existingAppeal, ...appealUpdate };
    this.propertyAppeals.set(id, updatedAppeal);
    return updatedAppeal;
  }

  // Tax Rate operations
  async getTaxRate(id: number, tenantId: number): Promise<TaxRate | undefined> {
    const taxRate = this.taxRates.get(id);
    if (!taxRate || taxRate.tenantId !== tenantId) return undefined;
    return taxRate;
  }

  async getTaxRates(tenantId: number): Promise<TaxRate[]> {
    return Array.from(this.taxRates.values()).filter(
      (taxRate) => taxRate.tenantId === tenantId
    );
  }

  async createTaxRate(insertTaxRate: InsertTaxRate): Promise<TaxRate> {
    const id = this.currentTaxRateId++;
    const now = new Date();
    const taxRate: TaxRate = {
      ...insertTaxRate,
      id,
      createdAt: now,
      updatedAt: now,
      updatedBy: insertTaxRate.createdBy || null,
      status: insertTaxRate.status || 'active',
      specialAssessments: insertTaxRate.specialAssessments || {},
      expirationDate: insertTaxRate.expirationDate || null,
      exemptionAmount: insertTaxRate.exemptionAmount || null
    };
    this.taxRates.set(id, taxRate);
    return taxRate;
  }

  async updateTaxRate(id: number, taxRateUpdate: Partial<InsertTaxRate>): Promise<TaxRate | undefined> {
    const existingTaxRate = this.taxRates.get(id);
    if (!existingTaxRate) return undefined;
    
    const updatedTaxRate = {
      ...existingTaxRate,
      ...taxRateUpdate,
      updatedAt: new Date()
    };
    
    if ('createdBy' in taxRateUpdate) {
      updatedTaxRate.updatedBy = taxRateUpdate.createdBy || null;
    }
    
    this.taxRates.set(id, updatedTaxRate);
    return updatedTaxRate;
  }
  
  // Predictive Valuation Operations
  async generatePredictiveValuation(propertyId: number, predictionDate: Date): Promise<PropertyValuation> {
    // Get the property details
    const property = Array.from(this.properties.values()).find(p => p.id === propertyId);
    if (!property) {
      throw new Error('Property not found');
    }

    // Get historical valuations for the property to analyze trends
    const valuations = Array.from(this.propertyValuations.values())
      .filter(v => v.propertyId === propertyId)
      .sort((a, b) => a.assessmentDate.getTime() - b.assessmentDate.getTime());

    // Need at least one valuation for prediction
    if (valuations.length === 0) {
      // Create a baseline valuation if none exists
      const baseValuation = await this.calculatePropertyValuation(
        propertyId,
        'standard',
        new Date()
      );
      valuations.push(baseValuation);
    }

    // Determine prediction method based on data availability
    let predictionMethod = 'limited_data';
    let confidenceScore = 60;
    let predictionModels = {};

    if (valuations.length >= 5) {
      predictionMethod = 'time_series';
      confidenceScore = 90;
    } else if (valuations.length >= 3) {
      predictionMethod = 'linear_trend';
      confidenceScore = 75;
    } else if (valuations.length >= 1) {
      predictionMethod = 'simple_extrapolation';
      confidenceScore = 60;
    }

    // Get the most recent valuation as baseline
    const latestValuation = valuations[valuations.length - 1];
    
    // Calculate annual growth rate from historical data if available
    let annualGrowthRate = 0.03; // Default 3% if insufficient data
    let seasonalAdjustment = 1.0;
    
    if (valuations.length >= 2) {
      const oldestValuation = valuations[0];
      const yearDiff = (latestValuation.assessmentDate.getTime() - oldestValuation.assessmentDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
      if (yearDiff > 0) {
        annualGrowthRate = Math.pow(latestValuation.marketValue / oldestValuation.marketValue, 1 / yearDiff) - 1;
      }
    }
    
    // Apply seasonal adjustments based on month
    const month = predictionDate.getMonth();
    // Spring/summer months typically have higher values
    if (month >= 3 && month <= 8) {
      seasonalAdjustment = 1.02; // 2% higher in spring/summer
    } else {
      seasonalAdjustment = 0.99; // 1% lower in fall/winter
    }
    
    // Calculate years between latest valuation and prediction date
    const yearDiff = (predictionDate.getTime() - latestValuation.assessmentDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
    
    // Predict market value
    const predictedMarketValue = Math.round(
      latestValuation.marketValue * Math.pow(1 + annualGrowthRate, yearDiff) * seasonalAdjustment
    );
    
    // Calculate assessed and taxable values
    const assessmentRatio = 0.8; // 80% of market value
    const predictedAssessedValue = Math.round(predictedMarketValue * assessmentRatio);
    
    // Get applicable tax rate
    const taxRate = Array.from(this.taxRates.values()).find(
      tr => tr.tenantId === property.tenantId && 
           tr.zoneCode === property.zoneCode && 
           tr.propertyType === property.propertyType &&
           tr.status === 'active'
    );
    
    const exemptionAmount = taxRate?.exemptionAmount || 0;
    const predictedTaxableValue = Math.max(0, predictedAssessedValue - exemptionAmount);
    
    // Record prediction models and factors used
    predictionModels = {
      method: predictionMethod,
      baseValue: latestValuation.marketValue,
      annualGrowthRate,
      seasonalAdjustment,
      valuationsUsed: valuations.length,
      timeSpan: yearDiff
    };
    
    // Create and return the predictive valuation
    return this.createPropertyValuation({
      propertyId,
      tenantId: property.tenantId,
      assessedValue: predictedAssessedValue,
      marketValue: predictedMarketValue,
      taxableValue: predictedTaxableValue,
      assessmentDate: predictionDate,
      effectiveDate: new Date(predictionDate.getFullYear(), 0, 1),
      expirationDate: new Date(predictionDate.getFullYear() + 1, 0, 1),
      valuationMethod: 'predictive',
      assessorId: 1, // System-generated 
      status: 'predicted',
      notes: `Predictive valuation using ${predictionMethod} method`,
      valuationFactors: {
        annualGrowthRate,
        seasonalAdjustment,
        predictionMethod,
        yearDiff
      },
      confidenceScore,
      predictedChange: annualGrowthRate * 100, // Convert to percentage
      seasonalAdjustment,
      predictionModels
    });
  }
  
  // Appeal Recommendation Operations
  async generateAppealRecommendations(propertyId: number, tenantId: number): Promise<{
    probability: number;
    potentialSavings: number;
    recommendedValue: number;
    evidence: Array<{type: string, description: string, impact: number}>;
  }> {
    // Get the property
    const property = await this.getProperty(propertyId, tenantId);
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Get latest valuation
    const valuations = await this.getAllPropertyValuations(propertyId, tenantId);
    const valuation = valuations.sort((a, b) => 
      b.assessmentDate.getTime() - a.assessmentDate.getTime()
    )[0];
    
    if (!valuation) {
      throw new Error('No valuations found for this property');
    }
    
    // Find comparable properties 
    const comparableProperties = await this.findComparableProperties(property);
    
    // Find successful appeals
    const successfulAppeals = await this.findSuccessfulAppeals(tenantId);
    
    // Calculate probability of successful appeal
    const probability = this.calculateAppealProbability(property, valuation, comparableProperties, successfulAppeals);
    
    // Calculate recommended value
    const recommendedValue = this.calculateRecommendedValue(property, valuation, comparableProperties);
    
    // Calculate potential savings
    const potentialSavings = this.calculatePotentialSavings(property, valuation, recommendedValue);
    
    // Generate evidence
    const evidence = this.generateEvidence(property, valuation, comparableProperties, successfulAppeals);
    
    return {
      probability,
      potentialSavings,
      recommendedValue,
      evidence
    };
  }
  
  // Helper methods for appeal recommendations
  private async findComparableProperties(property: Property): Promise<Property[]> {
    // Find properties with similar characteristics in same area
    return Array.from(this.properties.values()).filter(p => 
      p.id !== property.id &&
      p.tenantId === property.tenantId &&
      p.zipCode === property.zipCode &&
      p.propertyType === property.propertyType &&
      Math.abs((p.landArea - property.landArea) / property.landArea) < 0.25 && // Within 25% of land area
      (!property.buildingArea || !p.buildingArea || 
        Math.abs((p.buildingArea - property.buildingArea) / property.buildingArea) < 0.25) // Within 25% of building area if applicable
    ).sort((a, b) => 
      this.calculateSimilarityScore(property, b) - this.calculateSimilarityScore(property, a)
    ).slice(0, 5); // Get top 5 most similar
  }
  
  private calculateSimilarityScore(property1: Property, property2: Property): number {
    let score = 0;
    
    // Location match (same zip gives higher score)
    if (property1.zipCode === property2.zipCode) score += 0.3;
    else if (property1.city === property2.city) score += 0.2;
    
    // Property type match
    if (property1.propertyType === property2.propertyType) score += 0.2;
    
    // Zone code match
    if (property1.zoneCode === property2.zoneCode) score += 0.1;
    
    // Size similarity
    const landAreaDiff = Math.abs((property1.landArea - property2.landArea) / property1.landArea);
    score += (1 - Math.min(landAreaDiff, 1)) * 0.15;
    
    // Building size similarity if applicable
    if (property1.buildingArea && property2.buildingArea) {
      const buildingAreaDiff = Math.abs((property1.buildingArea - property2.buildingArea) / property1.buildingArea);
      score += (1 - Math.min(buildingAreaDiff, 1)) * 0.15;
    }
    
    // Year built similarity if applicable
    if (property1.yearBuilt && property2.yearBuilt) {
      const yearDiff = Math.abs(property1.yearBuilt - property2.yearBuilt) / 100; // Normalize by century
      score += (1 - Math.min(yearDiff, 1)) * 0.1;
    }
    
    // Features match
    if (property1.features && property2.features) {
      const commonFeatures = property1.features.filter(f => property2.features?.includes(f));
      if (property1.features.length > 0) {
        score += (commonFeatures.length / property1.features.length) * 0.05;
      }
    }
    
    return score;
  }
  
  private async findSuccessfulAppeals(tenantId: number): Promise<PropertyAppeal[]> {
    return Array.from(this.propertyAppeals.values()).filter(appeal => 
      appeal.tenantId === tenantId &&
      appeal.decision === 'approved' &&
      appeal.adjustedValue !== null
    );
  }
  
  private calculateAppealProbability(
    property: Property,
    valuation: PropertyValuation,
    comparableProperties: Property[],
    successfulAppeals: PropertyAppeal[]
  ): number {
    let probability = 50; // Base probability
    
    // Check if property is significantly overvalued compared to comparables
    if (comparableProperties.length > 0) {
      const avgComparableValue = comparableProperties.reduce((sum, comp) => {
        // Calculate per square foot value for fair comparison
        const compValue = comp.lastAssessedValue || 0;
        const compSize = comp.buildingArea || 1;
        return sum + (compValue / compSize);
      }, 0) / comparableProperties.length;
      
      const propertyValuePerSqFt = valuation.assessedValue / (property.buildingArea || 1);
      
      const valueDifference = (propertyValuePerSqFt - avgComparableValue) / avgComparableValue;
      
      if (valueDifference > 0.15) { // More than 15% higher than comparables
        probability += 25;
      } else if (valueDifference > 0.05) { // 5-15% higher
        probability += 15;
      } else if (valueDifference < 0) { // Lower than comparables
        probability -= 10;
      }
    }
    
    // Check if there are successful appeals with similar characteristics
    const similarAppeals = successfulAppeals.filter(appeal => {
      const appealProperty = this.properties.get(appeal.propertyId);
      return appealProperty && appealProperty.propertyType === property.propertyType;
    });
    
    if (similarAppeals.length > 0) {
      probability += 10;
      
      // Check for average reduction percentage in successful appeals
      const avgReduction = similarAppeals.reduce((sum, appeal) => {
        const property = this.properties.get(appeal.propertyId);
        if (!property) return sum;
        
        const valuation = this.propertyValuations.get(appeal.valuationId);
        if (!valuation) return sum;
        
        const reduction = (valuation.assessedValue - (appeal.adjustedValue || 0)) / valuation.assessedValue;
        return sum + reduction;
      }, 0) / similarAppeals.length;
      
      if (avgReduction > 0.2) { // If average reduction is over 20%
        probability += 5;
      }
    }
    
    // Check if property has special circumstances that might benefit an appeal
    const hasSpecialCircumstances = 
      (property.propertyDetails && 'floodZone' in property.propertyDetails) || 
      (property.propertyDetails && 'accessIssues' in property.propertyDetails) ||
      (property.propertyDetails && 'environmentalIssues' in property.propertyDetails);
    
    if (hasSpecialCircumstances) {
      probability += 15;
    }
    
    // Cap probability between 5% and 95%
    return Math.max(5, Math.min(95, probability));
  }
  
  private calculatePotentialSavings(
    property: Property,
    valuation: PropertyValuation,
    recommendedValue: number
  ): number {
    const potentialValueReduction = valuation.assessedValue - recommendedValue;
    
    // Get tax rate
    const taxRate = Array.from(this.taxRates.values()).find(
      tr => tr.tenantId === property.tenantId && 
           tr.zoneCode === property.zoneCode && 
           tr.propertyType === property.propertyType &&
           tr.status === 'active'
    );
    
    if (!taxRate) return potentialValueReduction * 0.02; // Default to 2% if no tax rate found
    
    // Calculate tax savings
    const millageRate = taxRate.millageRate; // tax per $1000 of assessed value
    return potentialValueReduction * (millageRate / 1000);
  }
  
  private calculateRecommendedValue(
    property: Property,
    valuation: PropertyValuation,
    comparableProperties: Property[]
  ): number {
    if (comparableProperties.length === 0) {
      // If no comparables, suggest 10% reduction from current assessed value
      return Math.round(valuation.assessedValue * 0.9);
    }
    
    // Calculate average value per square foot from comparables
    const avgValuePerSqFt = comparableProperties.reduce((sum, comp) => {
      if (comp.lastAssessedValue === null || comp.buildingArea === null) return sum;
      return sum + (comp.lastAssessedValue / comp.buildingArea);
    }, 0) / comparableProperties.filter(c => c.lastAssessedValue !== null && c.buildingArea !== null).length;
    
    // Apply to property's square footage with adjustments
    const recommendedValue = Math.round(avgValuePerSqFt * (property.buildingArea || 1));
    
    // Don't recommend a value higher than current
    return Math.min(recommendedValue, valuation.assessedValue);
  }
  
  private generateEvidence(
    property: Property,
    valuation: PropertyValuation,
    comparableProperties: Property[],
    successfulAppeals: PropertyAppeal[]
  ): Array<{type: string, description: string, impact: number}> {
    const evidence: Array<{type: string, description: string, impact: number}> = [];
    
    // Comparable property evidence
    if (comparableProperties.length > 0) {
      const avgValue = comparableProperties.reduce((sum, comp) => 
        sum + (comp.lastAssessedValue || 0), 0) / comparableProperties.length;
      
      const valueDifference = (valuation.assessedValue - avgValue) / avgValue;
      
      if (valueDifference > 0.05) { // If more than 5% difference
        evidence.push({
          type: 'comparative_analysis',
          description: `Property is assessed ${Math.round(valueDifference * 100)}% higher than similar properties in the area.`,
          impact: 8
        });
        
        // Add specific comparable examples
        const bestComparable = comparableProperties[0];
        evidence.push({
          type: 'comparable_property',
          description: `Comparable property at ${bestComparable.address} is assessed at $${bestComparable.lastAssessedValue?.toLocaleString()} with similar characteristics.`,
          impact: 7
        });
      }
    }
    
    // Recent successful appeals
    const recentAppeals = successfulAppeals
      .filter(a => a.reviewedAt && new Date().getTime() - a.reviewedAt.getTime() < 365 * 24 * 60 * 60 * 1000); // Within past year
    
    if (recentAppeals.length > 0) {
      evidence.push({
        type: 'appeal_precedent',
        description: `${recentAppeals.length} similar properties have successfully appealed assessments in the past year.`,
        impact: 6
      });
    }
    
    // Market conditions
    evidence.push({
      type: 'market_conditions',
      description: 'Current market conditions suggest a potential overvaluation based on recent sales data.',
      impact: 5
    });
    
    // Property-specific issues
    if (property.propertyDetails) {
      if ('floodZone' in property.propertyDetails) {
        evidence.push({
          type: 'property_issue',
          description: 'Property is located in a flood zone, which may reduce its market value.',
          impact: 9
        });
      }
      
      if ('accessIssues' in property.propertyDetails) {
        evidence.push({
          type: 'property_issue',
          description: 'Property has documented access issues that may reduce its value.',
          impact: 7
        });
      }
    }
    
    // Sort by impact (highest first)
    return evidence.sort((a, b) => b.impact - a.impact);
  }
  
  // Workflow Template Operations
  async getWorkflowTemplate(id: number, tenantId: number): Promise<WorkflowTemplate | undefined> {
    const template = this.workflowTemplates.get(id);
    if (!template || template.tenantId !== tenantId) return undefined;
    return template;
  }

  async getAllWorkflowTemplates(tenantId: number): Promise<WorkflowTemplate[]> {
    return Array.from(this.workflowTemplates.values()).filter(
      template => template.tenantId === tenantId
    );
  }

  async createWorkflowTemplate(insertTemplate: InsertWorkflowTemplate): Promise<WorkflowTemplate> {
    const id = this.currentWorkflowTemplateId++;
    const now = new Date();
    const template: WorkflowTemplate = {
      ...insertTemplate,
      id,
      createdAt: now,
      updatedAt: now,
      isActive: insertTemplate.isActive ?? true,
      triggers: insertTemplate.triggers || null
    };
    this.workflowTemplates.set(id, template);
    return template;
  }

  async updateWorkflowTemplate(id: number, templateUpdate: Partial<InsertWorkflowTemplate>): Promise<WorkflowTemplate | undefined> {
    const existingTemplate = this.workflowTemplates.get(id);
    if (!existingTemplate) return undefined;
    
    const updatedTemplate = { 
      ...existingTemplate, 
      ...templateUpdate,
      updatedAt: new Date()
    };
    
    this.workflowTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }
  
  // Workflow Instance Operations
  async getWorkflowInstance(id: number, tenantId: number): Promise<WorkflowInstance | undefined> {
    const instance = this.workflowInstances.get(id);
    if (!instance || instance.tenantId !== tenantId) return undefined;
    return instance;
  }

  async getAllWorkflowInstances(tenantId: number): Promise<WorkflowInstance[]> {
    return Array.from(this.workflowInstances.values()).filter(
      instance => instance.tenantId === tenantId
    );
  }
  
  async getEntityWorkflowInstances(entityType: string, entityId: number, tenantId: number): Promise<WorkflowInstance[]> {
    return Array.from(this.workflowInstances.values()).filter(
      instance => 
        instance.tenantId === tenantId &&
        instance.relatedEntityType === entityType &&
        instance.relatedEntityId === entityId
    );
  }

  async createWorkflowInstance(insertInstance: InsertWorkflowInstance): Promise<WorkflowInstance> {
    const id = this.currentWorkflowInstanceId++;
    const now = new Date();
    const instance: WorkflowInstance = {
      ...insertInstance,
      id,
      startedAt: now,
      completedAt: null,
      status: insertInstance.status || 'active',
      currentStepIndex: insertInstance.currentStepIndex ?? 0,
      relatedEntityType: insertInstance.relatedEntityType || null,
      relatedEntityId: insertInstance.relatedEntityId || null,
      variables: insertInstance.variables || {},
      logs: insertInstance.logs || []
    };
    this.workflowInstances.set(id, instance);
    return instance;
  }

  async updateWorkflowInstance(id: number, instanceUpdate: Partial<InsertWorkflowInstance>): Promise<WorkflowInstance | undefined> {
    const existingInstance = this.workflowInstances.get(id);
    if (!existingInstance) return undefined;
    
    const updatedInstance = { 
      ...existingInstance, 
      ...instanceUpdate 
    };
    
    this.workflowInstances.set(id, updatedInstance);
    return updatedInstance;
  }
  
  async executeWorkflowStep(instanceId: number, tenantId: number): Promise<WorkflowInstance> {
    // Get the workflow instance
    const instance = await this.getWorkflowInstance(instanceId, tenantId);
    if (!instance) {
      throw new Error('Workflow instance not found');
    }
    
    // Get the workflow template
    const template = await this.getWorkflowTemplate(instance.templateId, tenantId);
    if (!template) {
      throw new Error('Workflow template not found');
    }
    
    // Get the current step
    const steps = template.steps as any[];
    const currentStepIndex = instance.currentStepIndex || 0;
    
    if (currentStepIndex >= steps.length) {
      // Workflow is complete
      const completedInstance = await this.updateWorkflowInstance(instanceId, {
        status: 'completed',
        completedAt: new Date()
      });
      return completedInstance!;
    }
    
    const currentStep = steps[currentStepIndex];
    
    try {
      // Execute the step based on its type
      let result;
      switch (currentStep.type) {
        case 'task':
          result = await this.executeTaskStep(currentStep, instance);
          break;
        case 'form':
          result = await this.executeFormStep(currentStep, instance);
          break;
        case 'decision':
          result = await this.executeDecisionStep(currentStep, instance);
          break;
        case 'approval':
          result = await this.executeApprovalStep(currentStep, instance);
          break;
        case 'system':
          result = await this.executeSystemStep(currentStep, instance);
          break;
        default:
          throw new Error(`Unknown step type: ${currentStep.type}`);
      }
      
      // Update instance logs
      const logs = Array.isArray(instance.logs) ? [...instance.logs] : [];
      logs.push({
        stepIndex: currentStepIndex,
        stepName: currentStep.name,
        status: 'completed',
        timestamp: new Date(),
        result
      });
      
      // Move to the next step
      const nextStepIndex = 
        typeof result?.nextStepIndex === 'number' 
          ? result.nextStepIndex 
          : currentStepIndex + 1;
      
      // Update the workflow instance
      const updatedInstance = await this.updateWorkflowInstance(instanceId, {
        currentStepIndex: nextStepIndex,
        variables: { ...instance.variables, ...result?.variables },
        logs
      });
      
      return updatedInstance!;
    } catch (error) {
      // Log error and update instance status
      const logs = Array.isArray(instance.logs) ? [...instance.logs] : [];
      logs.push({
        stepIndex: currentStepIndex,
        stepName: currentStep.name,
        status: 'error',
        timestamp: new Date(),
        error: String(error)
      });
      
      const updatedInstance = await this.updateWorkflowInstance(instanceId, {
        status: 'error',
        logs
      });
      
      return updatedInstance!;
    }
  }
  
  // Helper methods for workflow execution
  private async executeTaskStep(step: any, instance: WorkflowInstance): Promise<any> {
    // Task steps are user tasks that require user input to complete
    // In this implementation, we'll just simulate completion
    return {
      status: 'completed',
      variables: {
        [`${step.id}_completed`]: true,
        [`${step.id}_completedAt`]: new Date()
      }
    };
  }
  
  private async executeFormStep(step: any, instance: WorkflowInstance): Promise<any> {
    // Form steps require user input
    // In this implementation, we'll simulate with sample data
    const formData = {};
    
    if (step.fields) {
      for (const field of step.fields) {
        // Generate sample data based on field type
        switch (field.type) {
          case 'text':
            formData[field.name] = `Sample ${field.label}`;
            break;
          case 'number':
            formData[field.name] = 100;
            break;
          case 'date':
            formData[field.name] = new Date();
            break;
          case 'boolean':
            formData[field.name] = true;
            break;
          default:
            formData[field.name] = null;
        }
      }
    }
    
    return {
      status: 'completed',
      variables: {
        [`${step.id}_formData`]: formData,
        [`${step.id}_submittedAt`]: new Date()
      }
    };
  }
  
  private async executeDecisionStep(step: any, instance: WorkflowInstance): Promise<any> {
    // Decision steps use conditions to determine the next step
    let nextStepIndex;
    let decisionResult = null;
    
    // Evaluate conditions
    if (step.conditions && Array.isArray(step.conditions)) {
      for (const condition of step.conditions) {
        const result = this.evaluateCondition(condition, instance);
        if (result) {
          nextStepIndex = condition.nextStepIndex;
          decisionResult = condition.id;
          break;
        }
      }
    }
    
    // Use default path if no conditions matched
    if (decisionResult === null && step.defaultNextStepIndex !== undefined) {
      nextStepIndex = step.defaultNextStepIndex;
      decisionResult = 'default';
    }
    
    return {
      status: 'completed',
      nextStepIndex,
      variables: {
        [`${step.id}_decision`]: decisionResult,
        [`${step.id}_decisionTime`]: new Date()
      }
    };
  }
  
  private async executeApprovalStep(step: any, instance: WorkflowInstance): Promise<any> {
    // Approval steps require user approval
    // Simulate automatic approval for testing
    const isApproved = true;
    const approvalData = {
      approver: 'System',
      approvalDate: new Date(),
      approvalComments: 'Auto-approved for testing'
    };
    
    return {
      status: 'completed',
      nextStepIndex: isApproved ? step.approvedNextStepIndex : step.rejectedNextStepIndex,
      variables: {
        [`${step.id}_approved`]: isApproved,
        [`${step.id}_approvalData`]: approvalData
      }
    };
  }
  
  private async executeSystemStep(step: any, instance: WorkflowInstance): Promise<any> {
    // System steps perform automated actions
    let result = {};
    
    if (step.actions && Array.isArray(step.actions)) {
      result = await this.executeActions(step.actions, instance);
    }
    
    return {
      status: 'completed',
      variables: {
        [`${step.id}_executed`]: true,
        [`${step.id}_result`]: result
      }
    };
  }
  
  // Helper method to evaluate conditions
  private evaluateCondition(condition: any, instance: WorkflowInstance): boolean {
    const { field, operator, value } = condition;
    
    // Get field value from instance variables
    const fieldValue = field in (instance.variables as any) 
      ? (instance.variables as any)[field] 
      : null;
    
    // Evaluate based on operator
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'notEquals':
        return fieldValue !== value;
      case 'greaterThan':
        return fieldValue > value;
      case 'lessThan':
        return fieldValue < value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(value);
      case 'exists':
        return fieldValue !== null && fieldValue !== undefined;
      default:
        return false;
    }
  }
  
  // Execute workflow actions
  private async executeActions(actions: any[], instance: WorkflowInstance): Promise<any> {
    const result = {};
    
    for (const action of actions) {
      try {
        let actionResult;
        
        switch (action.type) {
          case 'update_property':
            actionResult = await this.executeUpdateProperty(action, instance);
            break;
          case 'create_appeal':
            actionResult = await this.executeCreateAppeal(action, instance);
            break;
          case 'send_notification':
            actionResult = await this.executeSendNotification(action, instance);
            break;
          case 'calculate':
            actionResult = await this.executeCalculation(action, instance);
            break;
          default:
            actionResult = null;
        }
        
        (result as any)[action.id] = actionResult;
      } catch (error) {
        (result as any)[action.id] = { error: String(error) };
      }
    }
    
    return result;
  }
  
  private async executeUpdateProperty(action: any, instance: WorkflowInstance): Promise<any> {
    const propertyId = action.propertyId || instance.relatedEntityId;
    const tenantId = instance.tenantId;
    
    if (!propertyId) {
      throw new Error('Property ID not found');
    }
    
    const updateData = this.processDynamicValues(action.data || {}, instance);
    
    const updatedProperty = await this.updateProperty(propertyId, {
      ...updateData,
      createdBy: action.userId || 1 // Default to system user
    });
    
    return {
      success: !!updatedProperty,
      propertyId,
      updatedAt: new Date()
    };
  }
  
  private async executeCreateAppeal(action: any, instance: WorkflowInstance): Promise<any> {
    const propertyId = action.propertyId || instance.relatedEntityId;
    const tenantId = instance.tenantId;
    
    if (!propertyId) {
      throw new Error('Property ID not found');
    }
    
    // Get the latest valuation
    const valuations = await this.getAllPropertyValuations(propertyId, tenantId);
    if (valuations.length === 0) {
      throw new Error('No valuations found for this property');
    }
    
    const latestValuation = valuations.sort((a, b) => 
      b.assessmentDate.getTime() - a.assessmentDate.getTime()
    )[0];
    
    // Create appeal data from action config and instance variables
    const appealData = action.data || {};
    
    const appeal = await this.createPropertyAppeal({
      propertyId,
      tenantId,
      valuationId: latestValuation.id,
      submittedBy: action.userId || 1, // Default to system user
      reason: this.processDynamicValues(appealData.reason || 'Automated appeal', instance),
      requestedValue: this.processDynamicValues(appealData.requestedValue || latestValuation.assessedValue * 0.9, instance),
      submittedAt: new Date(),
      evidenceUrls: appealData.evidenceUrls || []
    });
    
    return {
      success: !!appeal,
      appealId: appeal.id,
      valuationId: latestValuation.id,
      submittedAt: appeal.submittedAt
    };
  }
  
  private async executeSendNotification(action: any, instance: WorkflowInstance): Promise<any> {
    // Simulate sending a notification
    const recipients = action.recipients || [];
    const message = this.processDynamicValues(action.message || '', instance);
    const notificationType = action.notificationType || 'system';
    
    // In a real system, this would connect to a notification service
    return {
      success: true,
      notificationSent: true,
      recipients,
      notificationType,
      sentAt: new Date()
    };
  }
  
  private async executeCalculation(action: any, instance: WorkflowInstance): Promise<any> {
    const { formula, targetVariable } = action;
    
    if (!formula || !targetVariable) {
      throw new Error('Formula or target variable missing');
    }
    
    // Very simple formula parser for demonstration
    // In a real system, use a proper expression evaluator
    let result;
    
    try {
      // Replace variable placeholders with actual values
      const processedFormula = formula.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
        const value = variable in (instance.variables as any) 
          ? (instance.variables as any)[variable] 
          : 0;
        return isNaN(value) ? 0 : value;
      });
      
      // Evaluate the formula (unsafe but simple for demonstration)
      // eslint-disable-next-line no-eval
      result = eval(processedFormula);
    } catch (error) {
      result = 0;
    }
    
    return {
      success: true,
      targetVariable,
      result,
      calculatedAt: new Date(),
      variables: { [targetVariable]: result }
    };
  }
  
  // Helper to process dynamic values in configuration
  private processDynamicValues(config: any, instance: WorkflowInstance): any {
    if (typeof config === 'string') {
      // Replace variable placeholders with actual values
      return config.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
        // Special variables
        if (variable === 'currentDate') return new Date().toISOString();
        if (variable === 'currentUser') return 'System';
        
        // Instance variables
        return variable in (instance.variables as any) 
          ? String((instance.variables as any)[variable]) 
          : '';
      });
    } else if (typeof config === 'object' && config !== null) {
      if (Array.isArray(config)) {
        return config.map(item => this.processDynamicValues(item, instance));
      } else {
        const result: any = {};
        for (const key in config) {
          result[key] = this.processDynamicValues(config[key], instance);
        }
        return result;
      }
    }
    
    return config;
  }
  
  // Market Data Operations
  async getMarketData(id: number, tenantId: number): Promise<MarketData | undefined> {
    const marketData = this.marketData.get(id);
    if (!marketData || marketData.tenantId !== tenantId) return undefined;
    return marketData;
  }

  async getAllMarketData(tenantId: number): Promise<MarketData[]> {
    return Array.from(this.marketData.values()).filter(
      data => data.tenantId === tenantId
    );
  }
  
  async getMarketDataByRegion(region: string, regionType: string, tenantId: number): Promise<MarketData[]> {
    return Array.from(this.marketData.values()).filter(
      data => 
        data.tenantId === tenantId &&
        data.region === region &&
        data.regionType === regionType
    );
  }

  async createMarketData(insertMarketData: InsertMarketData): Promise<MarketData> {
    const id = this.currentMarketDataId++;
    const marketData: MarketData = {
      ...insertMarketData,
      id,
      collectedAt: new Date(),
      metadata: insertMarketData.metadata || null
    };
    this.marketData.set(id, marketData);
    return marketData;
  }
  
  async getMarketTrends(
    region: string, 
    regionType: string, 
    dataType: string, 
    tenantId: number,
    period: {start: Date, end: Date}
  ): Promise<Array<{date: Date, value: number}>> {
    // Get relevant market data
    const marketDataItems = Array.from(this.marketData.values()).filter(
      data => 
        data.tenantId === tenantId &&
        data.region === region &&
        data.regionType === regionType &&
        data.dataType === dataType &&
        data.effectiveDate >= period.start &&
        data.effectiveDate <= period.end
    );
    
    // Sort by date
    marketDataItems.sort((a, b) => 
      a.effectiveDate.getTime() - b.effectiveDate.getTime()
    );
    
    // Extract trend data points
    const trends: Array<{date: Date, value: number}> = [];
    
    for (const item of marketDataItems) {
      // Extract the value from the data field (structure depends on data type)
      let value = 0;
      
      if (typeof item.data === 'object' && item.data !== null) {
        if ('value' in (item.data as any)) {
          value = Number((item.data as any).value) || 0;
        } else if ('median' in (item.data as any)) {
          value = Number((item.data as any).median) || 0;
        } else if ('average' in (item.data as any)) {
          value = Number((item.data as any).average) || 0;
        }
      }
      
      trends.push({
        date: item.effectiveDate,
        value
      });
    }
    
    // If we don't have enough data points, generate synthetic ones
    if (trends.length < 2) {
      // Start with base value
      const baseValue = trends.length > 0 ? trends[0].value : 100;
      
      // Generate monthly data points within the period
      const currentDate = new Date(period.start);
      while (currentDate <= period.end) {
        // Skip if we already have data for this month
        const exists = trends.some(t => 
          t.date.getMonth() === currentDate.getMonth() && 
          t.date.getFullYear() === currentDate.getFullYear()
        );
        
        if (!exists) {
          // Generate slightly varying values (±5%)
          const randomFactor = 0.95 + Math.random() * 0.1; // 0.95 to 1.05
          const value = baseValue * randomFactor;
          
          trends.push({
            date: new Date(currentDate),
            value
          });
        }
        
        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      // Re-sort by date
      trends.sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    
    return trends;
  }
  
  // MCP Function operations
  async getMcpFunction(id: number): Promise<McpFunction | undefined> {
    return this.mcpFunctions.get(id);
  }

  async getMcpFunctionByName(name: string): Promise<McpFunction | undefined> {
    return Array.from(this.mcpFunctions.values()).find(
      (func) => func.name === name
    );
  }

  async getAllMcpFunctions(): Promise<McpFunction[]> {
    return Array.from(this.mcpFunctions.values());
  }

  async createMcpFunction(function_: InsertMcpFunction): Promise<McpFunction> {
    const id = this.currentMcpFunctionId++;
    const now = new Date();
    const mcpFunction: McpFunction = {
      ...function_,
      id,
      createdAt: now,
      updatedAt: now,
      examples: function_.examples || {},
      permissions: function_.permissions || {},
      timeout: function_.timeout || null,
      idempotent: function_.idempotent ?? null,
      version: function_.version || '1.0.0',
      enabled: function_.enabled ?? null
    };
    this.mcpFunctions.set(id, mcpFunction);
    return mcpFunction;
  }

  async updateMcpFunction(id: number, functionUpdate: Partial<InsertMcpFunction>): Promise<McpFunction | undefined> {
    const existingFunction = this.mcpFunctions.get(id);
    if (!existingFunction) return undefined;
    
    const updatedFunction = {
      ...existingFunction,
      ...functionUpdate,
      updatedAt: new Date()
    };
    this.mcpFunctions.set(id, updatedFunction);
    return updatedFunction;
  }
  
  // MCP Workflow operations
  async getMcpWorkflow(id: number): Promise<McpWorkflow | undefined> {
    return this.mcpWorkflows.get(id);
  }

  async getMcpWorkflowByName(name: string): Promise<McpWorkflow | undefined> {
    return Array.from(this.mcpWorkflows.values()).find(
      (workflow) => workflow.name === name
    );
  }

  async getAllMcpWorkflows(): Promise<McpWorkflow[]> {
    return Array.from(this.mcpWorkflows.values());
  }

  async createMcpWorkflow(workflow: InsertMcpWorkflow): Promise<McpWorkflow> {
    const id = this.currentMcpWorkflowId++;
    const now = new Date();
    const mcpWorkflow: McpWorkflow = {
      ...workflow,
      id,
      createdAt: now,
      updatedAt: now,
      description: workflow.description || null,
      inputs: workflow.inputs || {},
      outputs: workflow.outputs || {},
      parallel: workflow.parallel || {},
      timeout: workflow.timeout || null,
      version: workflow.version || '1.0.0',
      enabled: workflow.enabled ?? null,
      errorHandlers: workflow.errorHandlers || {}
    };
    this.mcpWorkflows.set(id, mcpWorkflow);
    return mcpWorkflow;
  }

  async updateMcpWorkflow(id: number, workflowUpdate: Partial<InsertMcpWorkflow>): Promise<McpWorkflow | undefined> {
    const existingWorkflow = this.mcpWorkflows.get(id);
    if (!existingWorkflow) return undefined;
    
    const updatedWorkflow = {
      ...existingWorkflow,
      ...workflowUpdate,
      updatedAt: new Date()
    };
    this.mcpWorkflows.set(id, updatedWorkflow);
    return updatedWorkflow;
  }
  
  // MCP Execution operations
  async getMcpExecution(id: number): Promise<McpExecution | undefined> {
    return this.mcpExecutions.get(id);
  }

  async createMcpExecution(execution: InsertMcpExecution): Promise<McpExecution> {
    const id = this.currentMcpExecutionId++;
    const now = new Date();
    const mcpExecution: McpExecution = {
      ...execution,
      id,
      startedAt: now,
      completedAt: null,
      status: execution.status || 'pending',
      input: execution.input || {},
      output: execution.output || {},
      error: execution.error || {},
      currentStep: execution.currentStep || null
    };
    this.mcpExecutions.set(id, mcpExecution);
    return mcpExecution;
  }

  async updateMcpExecution(id: number, executionUpdate: Partial<InsertMcpExecution>): Promise<McpExecution | undefined> {
    const existingExecution = this.mcpExecutions.get(id);
    if (!existingExecution) return undefined;
    
    const updatedExecution = {
      ...existingExecution,
      ...executionUpdate
    };
    this.mcpExecutions.set(id, updatedExecution);
    return updatedExecution;
  }
}

export const storage = new MemStorage();
