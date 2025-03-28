import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { insertPlanSchema, insertSubscriptionSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { log } from '../vite';

/**
 * Auth check middleware
 */
const authCheck = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

export class SubscriptionService {
  private router: Router;
  private paymentGateway: 'stripe' | 'paypal' | 'mock';
  private features: {
    trialPeriods: boolean;
    planSwitching: boolean;
    usageBased: boolean;
    teamBilling: boolean;
  };

  constructor() {
    this.router = Router();
    this.paymentGateway = 'stripe';
    this.features = {
      trialPeriods: true,
      planSwitching: true,
      usageBased: true,
      teamBilling: false
    };
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  /**
   * Set the payment gateway
   */
  public setPaymentGateway(gateway: 'stripe' | 'paypal' | 'mock'): void {
    this.paymentGateway = gateway;
    log(`Payment gateway set to: ${gateway}`, 'subscription-service');
  }

  /**
   * Configure subscription features
   */
  public configureFeatures(features: {
    trialPeriods?: boolean;
    planSwitching?: boolean;
    usageBased?: boolean;
    teamBilling?: boolean;
  }): void {
    Object.assign(this.features, features);
    log(`Subscription features updated`, 'subscription-service');
  }

  /**
   * Initialize default subscription plans if none exist
   */
  public async initializeDefaultPlans(): Promise<void> {
    const existingPlans = await storage.getAllPlans();
    
    if (existingPlans.length === 0) {
      // Create default plans
      const plans = [
        {
          name: 'Free Trial',
          description: '14-day trial with limited features',
          price: 0,
          features: ['Basic features', 'Limited API calls', 'Single user'],
          billingPeriod: 'monthly'
        },
        {
          name: 'Basic',
          description: 'Essential features for small teams',
          price: 1999, // $19.99
          features: ['All Free Trial features', 'Unlimited API calls', 'Up to 5 users', 'Basic support'],
          billingPeriod: 'monthly'
        },
        {
          name: 'Premium',
          description: 'Advanced features for growing teams',
          price: 4999, // $49.99
          features: ['All Basic features', 'Advanced analytics', 'Up to 20 users', 'Priority support'],
          billingPeriod: 'monthly'
        },
        {
          name: 'Enterprise',
          description: 'Full feature set for large organizations',
          price: 9999, // $99.99
          features: ['All Premium features', 'Custom integrations', 'Unlimited users', 'Dedicated support'],
          billingPeriod: 'monthly'
        }
      ];
      
      for (const plan of plans) {
        await storage.createPlan(plan);
      }
      
      log('Default subscription plans initialized', 'subscription-service');
    }
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.router.get('/health', (req, res) => {
      res.json({ 
        status: 'ok',
        paymentGateway: this.paymentGateway,
        features: this.features
      });
    });

    // Get all plans
    this.router.get('/plans', async (req, res) => {
      try {
        const plans = await storage.getAllPlans();
        res.json(plans);
      } catch (error) {
        log(`Error fetching plans: ${error.message}`, 'subscription-service');
        res.status(500).json({ message: 'Failed to fetch plans' });
      }
    });

    // Get plan by ID
    this.router.get('/plans/:id', async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        const plan = await storage.getPlan(id);
        
        if (!plan) {
          return res.status(404).json({ message: 'Plan not found' });
        }
        
        res.json(plan);
      } catch (error) {
        log(`Error fetching plan: ${error.message}`, 'subscription-service');
        res.status(500).json({ message: 'Failed to fetch plan' });
      }
    });

    // Create plan
    this.router.post('/plans', authCheck, async (req, res) => {
      try {
        const planData = insertPlanSchema.parse(req.body);
        const plan = await storage.createPlan(planData);
        log(`Plan created: ${plan.name}`, 'subscription-service');
        res.status(201).json(plan);
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          log(`Validation error during plan creation: ${validationError.message}`, 'subscription-service');
          res.status(400).json({ message: validationError.message });
        } else {
          log(`Error creating plan: ${error.message}`, 'subscription-service');
          res.status(500).json({ message: 'Internal server error' });
        }
      }
    });

    // Update plan
    this.router.patch('/plans/:id', authCheck, async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        
        // Only allow updating certain fields
        const { name, description, price, features } = req.body;
        const updateData = { name, description, price, features };
        
        // Filter out undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });
        
        // Check if plan exists
        const existingPlan = await storage.getPlan(id);
        if (!existingPlan) {
          return res.status(404).json({ message: 'Plan not found' });
        }
        
        // Update the plan
        const updatedPlan = await storage.updatePlan(id, updateData);
        log(`Plan updated: ${id}`, 'subscription-service');
        res.json(updatedPlan);
      } catch (error) {
        log(`Error updating plan: ${error.message}`, 'subscription-service');
        res.status(500).json({ message: 'Failed to update plan' });
      }
    });

    // Get subscription by ID
    this.router.get('/subscriptions/:id', authCheck, async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        const subscription = await storage.getSubscription(id);
        
        if (!subscription) {
          return res.status(404).json({ message: 'Subscription not found' });
        }
        
        res.json(subscription);
      } catch (error) {
        log(`Error fetching subscription: ${error.message}`, 'subscription-service');
        res.status(500).json({ message: 'Failed to fetch subscription' });
      }
    });

    // Get subscription by tenant ID
    this.router.get('/tenants/:tenantId/subscription', authCheck, async (req, res) => {
      try {
        const tenantId = parseInt(req.params.tenantId, 10);
        const subscription = await storage.getSubscriptionByTenantId(tenantId);
        
        if (!subscription) {
          return res.status(404).json({ message: 'Subscription not found for this tenant' });
        }
        
        res.json(subscription);
      } catch (error) {
        log(`Error fetching subscription: ${error.message}`, 'subscription-service');
        res.status(500).json({ message: 'Failed to fetch subscription' });
      }
    });

    // Create subscription
    this.router.post('/subscriptions', authCheck, async (req, res) => {
      try {
        const subscriptionData = insertSubscriptionSchema.parse(req.body);
        
        // Check if tenant exists
        const tenant = await storage.getTenant(subscriptionData.tenantId);
        if (!tenant) {
          return res.status(400).json({ message: 'Tenant does not exist' });
        }
        
        // Check if plan exists
        const plan = await storage.getPlan(subscriptionData.planId);
        if (!plan) {
          return res.status(400).json({ message: 'Plan does not exist' });
        }
        
        // Check if subscription already exists for this tenant
        const existingSubscription = await storage.getSubscriptionByTenantId(subscriptionData.tenantId);
        if (existingSubscription) {
          return res.status(400).json({ message: 'Subscription already exists for this tenant' });
        }
        
        // Create the subscription
        const subscription = await storage.createSubscription(subscriptionData);
        log(`Subscription created for tenant ${subscriptionData.tenantId}`, 'subscription-service');
        res.status(201).json(subscription);
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          log(`Validation error during subscription creation: ${validationError.message}`, 'subscription-service');
          res.status(400).json({ message: validationError.message });
        } else {
          log(`Error creating subscription: ${error.message}`, 'subscription-service');
          res.status(500).json({ message: 'Internal server error' });
        }
      }
    });

    // Update subscription
    this.router.patch('/subscriptions/:id', authCheck, async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        
        // Only allow updating certain fields
        const { planId, status } = req.body;
        const updateData = { planId, status };
        
        // Filter out undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });
        
        // If changing plan, verify the plan exists
        if (planId) {
          const plan = await storage.getPlan(planId);
          if (!plan) {
            return res.status(400).json({ message: 'Plan does not exist' });
          }
        }
        
        // Check if subscription exists
        const existingSubscription = await storage.getSubscription(id);
        if (!existingSubscription) {
          return res.status(404).json({ message: 'Subscription not found' });
        }
        
        // Update the subscription
        const updatedSubscription = await storage.updateSubscription(id, updateData);
        log(`Subscription updated: ${id}`, 'subscription-service');
        res.json(updatedSubscription);
      } catch (error) {
        log(`Error updating subscription: ${error.message}`, 'subscription-service');
        res.status(500).json({ message: 'Failed to update subscription' });
      }
    });

    // Configure payment gateway
    this.router.post('/config/payment-gateway', authCheck, (req, res) => {
      const { gateway, apiKey, webhookSecret } = req.body;
      
      if (gateway) {
        if (['stripe', 'paypal', 'mock'].includes(gateway)) {
          this.setPaymentGateway(gateway);
        } else {
          return res.status(400).json({ message: 'Invalid payment gateway' });
        }
      }
      
      // In a real implementation, we would securely store API keys and secrets
      log(`Payment gateway configuration updated`, 'subscription-service');
      
      res.json({
        message: 'Payment gateway configuration updated',
        gateway: this.paymentGateway
      });
    });

    // Configure subscription features
    this.router.post('/config/features', authCheck, (req, res) => {
      const { trialPeriods, planSwitching, usageBased, teamBilling } = req.body;
      
      this.configureFeatures({
        trialPeriods: typeof trialPeriods === 'boolean' ? trialPeriods : undefined,
        planSwitching: typeof planSwitching === 'boolean' ? planSwitching : undefined,
        usageBased: typeof usageBased === 'boolean' ? usageBased : undefined,
        teamBilling: typeof teamBilling === 'boolean' ? teamBilling : undefined
      });
      
      res.json({
        message: 'Subscription features updated',
        features: this.features
      });
    });

    // Simulate payment for development
    this.router.post('/test-payment', (req, res) => {
      const { planId, success = true } = req.body;
      
      if (success) {
        log(`Test payment successful for plan ${planId}`, 'subscription-service');
        res.json({
          success: true,
          message: 'Test payment successful',
          transactionId: `test_${Date.now()}`,
          planId
        });
      } else {
        log(`Test payment failed for plan ${planId}`, 'subscription-service');
        res.status(400).json({
          success: false,
          message: 'Test payment failed',
          error: 'simulated_failure'
        });
      }
    });
  }
}

export function createSubscriptionService(): SubscriptionService {
  const service = new SubscriptionService();
  
  // Initialize default plans (async)
  service.initializeDefaultPlans().catch(error => {
    log(`Error initializing default plans: ${error.message}`, 'subscription-service');
  });
  
  return service;
}