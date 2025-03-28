import { 
  users, type User, type InsertUser,
  tenants, type Tenant, type InsertTenant, 
  subscriptions, type Subscription, type InsertSubscription,
  plans, type Plan, type InsertPlan
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tenants: Map<number, Tenant>;
  private subscriptions: Map<number, Subscription>;
  private plans: Map<number, Plan>;
  
  private currentUserId: number;
  private currentTenantId: number;
  private currentSubscriptionId: number;
  private currentPlanId: number;

  constructor() {
    this.users = new Map();
    this.tenants = new Map();
    this.subscriptions = new Map();
    this.plans = new Map();
    
    this.currentUserId = 1;
    this.currentTenantId = 1;
    this.currentSubscriptionId = 1;
    this.currentPlanId = 1;
    
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
}

export const storage = new MemStorage();
