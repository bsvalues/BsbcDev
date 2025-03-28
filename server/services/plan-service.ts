import { Router, Request, Response, NextFunction } from 'express';
import { insertPlanSchema } from '@shared/schema';
import { storage } from '../storage';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

/**
 * Auth check middleware
 */
const authCheck = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

export class PlanService {
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.router.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', service: 'plans' });
    });

    // Get all plans
    this.router.get('/', async (req: Request, res: Response) => {
      try {
        const plans = await storage.getAllPlans();
        res.json(plans);
      } catch (error: any) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ message: 'Failed to fetch plans' });
      }
    });

    // Get plan by ID
    this.router.get('/:id', async (req: Request, res: Response) => {
      try {
        const planId = parseInt(req.params.id, 10);
        const plan = await storage.getPlan(planId);
        
        if (!plan) {
          return res.status(404).json({ message: 'Plan not found' });
        }
        
        res.json(plan);
      } catch (error: any) {
        console.error('Error fetching plan:', error);
        res.status(500).json({ message: 'Failed to fetch plan' });
      }
    });

    // Create plan (admin only)
    this.router.post('/', authCheck, async (req: Request, res: Response) => {
      // Check if user is admin
      if ((req.user as any)?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden - Admin access required' });
      }
      
      try {
        const planData = insertPlanSchema.parse(req.body);
        const plan = await storage.createPlan(planData);
        res.status(201).json(plan);
      } catch (error: any) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          res.status(400).json({ message: validationError.message });
        } else {
          console.error('Error creating plan:', error);
          res.status(500).json({ message: 'Failed to create plan' });
        }
      }
    });

    // Update plan (admin only)
    this.router.patch('/:id', authCheck, async (req: Request, res: Response) => {
      // Check if user is admin
      if ((req.user as any)?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden - Admin access required' });
      }
      
      try {
        const planId = parseInt(req.params.id, 10);
        const plan = await storage.getPlan(planId);
        
        if (!plan) {
          return res.status(404).json({ message: 'Plan not found' });
        }
        
        // Validate update data (partial)
        const planUpdate = insertPlanSchema.partial().parse(req.body);
        const updatedPlan = await storage.updatePlan(planId, planUpdate);
        
        res.json(updatedPlan);
      } catch (error: any) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          res.status(400).json({ message: validationError.message });
        } else {
          console.error('Error updating plan:', error);
          res.status(500).json({ message: 'Failed to update plan' });
        }
      }
    });

    // Compare plans
    this.router.get('/compare', async (req: Request, res: Response) => {
      try {
        const planIds = req.query.ids;
        
        if (!planIds) {
          return res.status(400).json({ message: 'No plan IDs provided' });
        }
        
        let planIdsArray: number[] = [];
        
        if (typeof planIds === 'string') {
          planIdsArray = planIds.split(',').map(id => parseInt(id.trim(), 10));
        } else if (Array.isArray(planIds)) {
          planIdsArray = planIds.map(id => parseInt(id.toString(), 10));
        }
        
        // Filter out invalid IDs
        planIdsArray = planIdsArray.filter(id => !isNaN(id));
        
        if (planIdsArray.length === 0) {
          return res.status(400).json({ message: 'No valid plan IDs provided' });
        }
        
        // Fetch plans
        const plansPromises = planIdsArray.map(id => storage.getPlan(id));
        const plans = await Promise.all(plansPromises);
        
        // Filter out null/undefined plans
        const validPlans = plans.filter(plan => plan !== undefined);
        
        res.json(validPlans);
      } catch (error: any) {
        console.error('Error comparing plans:', error);
        res.status(500).json({ message: 'Failed to compare plans' });
      }
    });
  }
}

export function createPlanService(): PlanService {
  return new PlanService();
}