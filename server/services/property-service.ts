import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { fromZodError } from 'zod-validation-error';
import { ZodError } from 'zod';
import { insertPropertySchema } from '@shared/schema';

/**
 * Auth check middleware
 */
const authCheck = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

export class PropertyService {
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
      res.json({ status: 'ok', service: 'properties' });
    });

    // Get all properties (with optional filtering)
    this.router.get('/', authCheck, async (req: Request, res: Response) => {
      try {
        const tenantId = (req.user as any)?.tenantId;
        const properties = await storage.getAllProperties(tenantId);
        res.json(properties);
      } catch (error: any) {
        console.error('Error fetching properties:', error);
        res.status(500).json({ message: 'Failed to fetch properties' });
      }
    });

    // Get property by ID
    this.router.get('/:id', authCheck, async (req: Request, res: Response) => {
      try {
        const propertyId = parseInt(req.params.id, 10);
        const tenantId = (req.user as any)?.tenantId;
        const property = await storage.getProperty(propertyId, tenantId);
        
        if (!property) {
          return res.status(404).json({ message: 'Property not found' });
        }
        
        res.json(property);
      } catch (error: any) {
        console.error('Error fetching property:', error);
        res.status(500).json({ message: 'Failed to fetch property' });
      }
    });

    // Create property
    this.router.post('/', authCheck, async (req: Request, res: Response) => {
      try {
        const tenantId = (req.user as any)?.tenantId;
        const userId = (req.user as any)?.id;
        
        // Validate property data
        const propertyData = insertPropertySchema.parse({
          ...req.body,
          tenantId,
          createdBy: userId
        });
        
        const property = await storage.createProperty(propertyData);
        res.status(201).json(property);
      } catch (error: any) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          res.status(400).json({ message: validationError.message });
        } else {
          console.error('Error creating property:', error);
          res.status(500).json({ message: 'Failed to create property' });
        }
      }
    });

    // Update property
    this.router.patch('/:id', authCheck, async (req: Request, res: Response) => {
      try {
        const propertyId = parseInt(req.params.id, 10);
        const tenantId = (req.user as any)?.tenantId;
        
        // Check if property exists and belongs to tenant
        const property = await storage.getProperty(propertyId, tenantId);
        
        if (!property) {
          return res.status(404).json({ message: 'Property not found' });
        }
        
        // Validate update data (partial)
        const propertyUpdate = insertPropertySchema.partial().parse(req.body);
        const updatedProperty = await storage.updateProperty(propertyId, propertyUpdate);
        
        res.json(updatedProperty);
      } catch (error: any) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          res.status(400).json({ message: validationError.message });
        } else {
          console.error('Error updating property:', error);
          res.status(500).json({ message: 'Failed to update property' });
        }
      }
    });

    // Calculate property valuation
    this.router.post('/:id/valuate', authCheck, async (req: Request, res: Response) => {
      try {
        const propertyId = parseInt(req.params.id, 10);
        const tenantId = (req.user as any)?.tenantId;
        
        // Check if property exists and belongs to tenant
        const property = await storage.getProperty(propertyId, tenantId);
        
        if (!property) {
          return res.status(404).json({ message: 'Property not found' });
        }
        
        // Get valuation parameters from request
        const { 
          valuationMethod = 'standard',
          assessmentDate = new Date()
        } = req.body;
        
        // Calculate valuation (this would implement your valuation algorithms)
        const valuation = await storage.calculatePropertyValuation(
          propertyId, 
          valuationMethod,
          assessmentDate
        );
        
        res.json(valuation);
      } catch (error: any) {
        console.error('Error calculating property valuation:', error);
        res.status(500).json({ message: 'Failed to calculate property valuation' });
      }
    });

    // Submit property valuation appeal
    this.router.post('/:id/appeals', authCheck, async (req: Request, res: Response) => {
      try {
        const propertyId = parseInt(req.params.id, 10);
        const tenantId = (req.user as any)?.tenantId;
        const userId = (req.user as any)?.id;
        
        // Check if property exists and belongs to tenant
        const property = await storage.getProperty(propertyId, tenantId);
        
        if (!property) {
          return res.status(404).json({ message: 'Property not found' });
        }
        
        // Create appeal
        const appealData = {
          propertyId,
          tenantId,
          valuationId: req.body.valuationId, // Add the valuationId from request body
          submittedBy: userId,
          reason: req.body.reason,
          requestedValue: req.body.requestedValue,
          evidenceUrls: req.body.evidenceUrls || [],
          status: 'pending',
          submittedAt: new Date()
        };
        
        const appeal = await storage.createPropertyAppeal(appealData);
        res.status(201).json(appeal);
      } catch (error: any) {
        console.error('Error submitting property appeal:', error);
        res.status(500).json({ message: 'Failed to submit property appeal' });
      }
    });

    // Get property tax rates
    this.router.get('/tax-rates', authCheck, async (req: Request, res: Response) => {
      try {
        const tenantId = (req.user as any)?.tenantId;
        const taxRates = await storage.getTaxRates(tenantId);
        res.json(taxRates);
      } catch (error: any) {
        console.error('Error fetching tax rates:', error);
        res.status(500).json({ message: 'Failed to fetch tax rates' });
      }
    });
  }
}

export function createPropertyService(): PropertyService {
  return new PropertyService();
}