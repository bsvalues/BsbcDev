import { Router, Request, Response, NextFunction } from 'express';
import { storage, IStorage } from '../storage';
import { fromZodError } from 'zod-validation-error';
import { ZodError } from 'zod';
import { insertPropertySchema } from '@shared/schema';
import { requireAuth, getCurrentTenantId } from '../middleware/auth-middleware';
import { formatError } from '../utils/error-handler';
import { log } from '../vite';

// Import property search and batch operations routers
import propertySearchRouter from './property-search';
import propertyBatchRouter from './property-batch';

export class PropertyService {
  private router: Router;
  private repository: IStorage;

  constructor(repository?: IStorage) {
    this.router = Router();
    this.repository = repository || storage;
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }
  
  /**
   * Get all properties for a tenant
   */
  public async getProperties(tenantId: number) {
    return this.repository.getAllProperties(tenantId);
  }
  
  /**
   * Get a property by ID
   */
  public async getProperty(propertyId: number, tenantId: number) {
    return this.repository.getProperty(propertyId, tenantId);
  }
  
  /**
   * Calculate property valuation
   */
  public async calculateValuation(propertyId: number, method: string, date: Date) {
    return this.repository.calculatePropertyValuation(propertyId, method, date);
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.router.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', service: 'properties' });
    });
    
    // Register the enhanced property search router
    this.router.use('/search', requireAuth, propertySearchRouter);
    
    // Register the batch operations router
    this.router.use('/batch', requireAuth, propertyBatchRouter);

    // Get all properties (with optional filtering)
    this.router.get('/', requireAuth, async (req: Request, res: Response) => {
      try {
        const tenantId = (req.user as any)?.tenantId;
        const properties = await this.getProperties(tenantId);
        res.json(properties);
      } catch (error: any) {
        log(`Error fetching properties: ${error.message}`, 'property-service');
        res.status(500).json(formatError({
          message: 'Failed to fetch properties',
          status: 500,
          code: 'PROPERTY_FETCH_ERROR',
          error
        }));
      }
    });

    // Get property by ID
    this.router.get('/:id', requireAuth, async (req: Request, res: Response) => {
      try {
        const propertyId = parseInt(req.params.id, 10);
        const tenantId = (req.user as any)?.tenantId;
        const property = await this.getProperty(propertyId, tenantId);
        
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
    this.router.post('/', requireAuth, async (req: Request, res: Response) => {
      try {
        const tenantId = (req.user as any)?.tenantId;
        const userId = (req.user as any)?.id;
        
        // Validate property data
        const propertyData = insertPropertySchema.parse({
          ...req.body,
          tenantId,
          createdBy: userId
        });
        
        const property = await this.repository.createProperty(propertyData);
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
    this.router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
      try {
        const propertyId = parseInt(req.params.id, 10);
        const tenantId = (req.user as any)?.tenantId;
        
        // Check if property exists and belongs to tenant
        const property = await this.getProperty(propertyId, tenantId);
        
        if (!property) {
          return res.status(404).json({ message: 'Property not found' });
        }
        
        // Validate update data (partial)
        const propertyUpdate = insertPropertySchema.partial().parse(req.body);
        const updatedProperty = await this.repository.updateProperty(propertyId, propertyUpdate);
        
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
    this.router.post('/:id/valuate', requireAuth, async (req: Request, res: Response) => {
      try {
        const propertyId = parseInt(req.params.id, 10);
        const tenantId = (req.user as any)?.tenantId;
        
        // Check if property exists and belongs to tenant
        const property = await this.getProperty(propertyId, tenantId);
        
        if (!property) {
          return res.status(404).json({ message: 'Property not found' });
        }
        
        // Get valuation parameters from request
        const { 
          valuationMethod = 'standard',
          assessmentDate = new Date()
        } = req.body;
        
        // Calculate valuation (this would implement your valuation algorithms)
        const valuation = await this.calculateValuation(
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
    this.router.post('/:id/appeals', requireAuth, async (req: Request, res: Response) => {
      try {
        const propertyId = parseInt(req.params.id, 10);
        const tenantId = (req.user as any)?.tenantId;
        const userId = (req.user as any)?.id;
        
        // Check if property exists and belongs to tenant
        const property = await this.getProperty(propertyId, tenantId);
        
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
        
        const appeal = await this.repository.createPropertyAppeal(appealData);
        res.status(201).json(appeal);
      } catch (error: any) {
        console.error('Error submitting property appeal:', error);
        res.status(500).json({ message: 'Failed to submit property appeal' });
      }
    });

    // Get property tax rates
    this.router.get('/tax-rates', requireAuth, async (req: Request, res: Response) => {
      try {
        const tenantId = (req.user as any)?.tenantId;
        const taxRates = await this.repository.getTaxRates(tenantId);
        res.json(taxRates);
      } catch (error: any) {
        console.error('Error fetching tax rates:', error);
        res.status(500).json({ message: 'Failed to fetch tax rates' });
      }
    });
    
    // Compare properties
    this.router.post('/compare', requireAuth, async (req: Request, res: Response) => {
      try {
        const { propertyIds, factors, includeAdvancedMetrics } = req.body;
        
        if (!Array.isArray(propertyIds) || propertyIds.length < 2) {
          return res.status(400).json({ 
            message: 'At least 2 property IDs are required for comparison' 
          });
        }
        
        // Import the MCP property integration service
        const { calculatePropertyComparison } = await import('./mcp-property-integration');
        
        // Calculate property comparison
        const comparisonResult = await calculatePropertyComparison({
          propertyIds,
          factors: factors || ['assessedValue', 'marketValue', 'taxableValue', 'yearBuilt'],
          includeAdvancedMetrics: includeAdvancedMetrics || false
        });
        
        res.json(comparisonResult);
      } catch (error: any) {
        log(`Error comparing properties: ${error.message}`, 'property-service');
        res.status(500).json({ 
          message: 'Failed to compare properties',
          error: error.message
        });
      }
    });
  }
}

export function createPropertyService(customRepository?: IStorage): PropertyService {
  return new PropertyService(customRepository);
}