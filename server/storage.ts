import { 
  users, type User, type InsertUser,
  tenants, type Tenant, type InsertTenant, 
  subscriptions, type Subscription, type InsertSubscription,
  plans, type Plan, type InsertPlan,
  properties, type Property, type InsertProperty,
  propertyValuations, type PropertyValuation, type InsertPropertyValuation,
  propertyAppeals, type PropertyAppeal, type InsertPropertyAppeal,
  taxRates, type TaxRate, type InsertTaxRate
} from "@shared/schema";

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
  
  // Property Appeal operations
  getPropertyAppeal(id: number, tenantId: number): Promise<PropertyAppeal | undefined>;
  getAllPropertyAppeals(propertyId: number, tenantId: number): Promise<PropertyAppeal[]>;
  createPropertyAppeal(appeal: InsertPropertyAppeal): Promise<PropertyAppeal>;
  updatePropertyAppeal(id: number, appeal: Partial<InsertPropertyAppeal>): Promise<PropertyAppeal | undefined>;
  
  // Tax Rate operations
  getTaxRate(id: number, tenantId: number): Promise<TaxRate | undefined>;
  getTaxRates(tenantId: number): Promise<TaxRate[]>;
  createTaxRate(taxRate: InsertTaxRate): Promise<TaxRate>;
  updateTaxRate(id: number, taxRate: Partial<InsertTaxRate>): Promise<TaxRate | undefined>;
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
  
  private currentUserId: number;
  private currentTenantId: number;
  private currentSubscriptionId: number;
  private currentPlanId: number;
  private currentPropertyId: number;
  private currentPropertyValuationId: number;
  private currentPropertyAppealId: number;
  private currentTaxRateId: number;

  constructor() {
    this.users = new Map();
    this.tenants = new Map();
    this.subscriptions = new Map();
    this.plans = new Map();
    this.properties = new Map();
    this.propertyValuations = new Map();
    this.propertyAppeals = new Map();
    this.taxRates = new Map();
    
    this.currentUserId = 1;
    this.currentTenantId = 1;
    this.currentSubscriptionId = 1;
    this.currentPlanId = 1;
    this.currentPropertyId = 1;
    this.currentPropertyValuationId = 1;
    this.currentPropertyAppealId = 1;
    this.currentTaxRateId = 1;
    
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
    const user: User = { ...insertUser, id };
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
      createdAt: new Date() 
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
    const subscription: Subscription = { ...insertSubscription, id };
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
    const plan: Plan = { ...insertPlan, id };
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
      updatedBy: insertProperty.createdBy
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
      updatedAt: new Date(),
      updatedBy: propertyUpdate.updatedBy || existingProperty.updatedBy
    };
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
      createdAt: new Date()
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
      adjustedValue: null
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
      updatedBy: insertTaxRate.createdBy
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
      updatedAt: new Date(),
      updatedBy: taxRateUpdate.updatedBy || existingTaxRate.updatedBy
    };
    this.taxRates.set(id, updatedTaxRate);
    return updatedTaxRate;
  }
}

export const storage = new MemStorage();
