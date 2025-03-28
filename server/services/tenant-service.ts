import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { insertTenantSchema } from '@shared/schema';
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

export class TenantService {
  private router: Router;
  private tenantIdentificationStrategy: 'subdomain' | 'path' | 'header' | 'all';
  private tenantIsolationStrategy: 'database' | 'schema' | 'row';

  constructor() {
    this.router = Router();
    this.tenantIdentificationStrategy = 'subdomain';
    this.tenantIsolationStrategy = 'database';
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  /**
   * Set the tenant identification strategy
   */
  public setTenantIdentificationStrategy(strategy: 'subdomain' | 'path' | 'header' | 'all'): void {
    this.tenantIdentificationStrategy = strategy;
    log(`Tenant identification strategy set to: ${strategy}`, 'tenant-service');
  }

  /**
   * Set the tenant isolation strategy
   */
  public setTenantIsolationStrategy(strategy: 'database' | 'schema' | 'row'): void {
    this.tenantIsolationStrategy = strategy;
    log(`Tenant isolation strategy set to: ${strategy}`, 'tenant-service');
  }

  /**
   * Tenant resolution middleware based on current strategy
   */
  public resolveTenant(req: Request, res: Response, next: NextFunction): void {
    // Example implementation - would be expanded in a real system
    let tenantIdentifier: string | null = null;

    switch (this.tenantIdentificationStrategy) {
      case 'subdomain':
        // Extract tenant from subdomain (e.g., tenant1.domain.com)
        const host = req.headers.host || '';
        const subdomain = host.split('.')[0];
        if (subdomain && !['www', 'app', 'api'].includes(subdomain)) {
          tenantIdentifier = subdomain;
        }
        break;
      
      case 'path':
        // Extract tenant from path (e.g., /tenant1/resource)
        const pathParts = req.path.split('/');
        if (pathParts.length > 1 && pathParts[1]) {
          tenantIdentifier = pathParts[1];
        }
        break;
      
      case 'header':
        // Extract tenant from custom header
        tenantIdentifier = req.headers['x-tenant-id'] as string;
        break;
      
      case 'all':
        // Try all strategies in sequence
        const headerTenant = req.headers['x-tenant-id'] as string;
        if (headerTenant) {
          tenantIdentifier = headerTenant;
        } else {
          const host = req.headers.host || '';
          const subdomain = host.split('.')[0];
          if (subdomain && !['www', 'app', 'api'].includes(subdomain)) {
            tenantIdentifier = subdomain;
          } else {
            const pathParts = req.path.split('/');
            if (pathParts.length > 1 && pathParts[1]) {
              tenantIdentifier = pathParts[1];
            }
          }
        }
        break;
    }

    if (tenantIdentifier) {
      // Set the resolved tenant in request object
      (req as any).tenant = tenantIdentifier;
      log(`Resolved tenant: ${tenantIdentifier}`, 'tenant-service');
    } else {
      // No tenant identifier found - this could be a public route or an error
      log('No tenant identifier found', 'tenant-service');
    }

    next();
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.router.get('/health', (req, res) => {
      res.json({ 
        status: 'ok',
        identificationStrategy: this.tenantIdentificationStrategy,
        isolationStrategy: this.tenantIsolationStrategy
      });
    });

    // Get all tenants
    this.router.get('/', authCheck, async (req, res) => {
      try {
        const tenants = await storage.getAllTenants();
        res.json(tenants);
      } catch (error) {
        log(`Error fetching tenants: ${error.message}`, 'tenant-service');
        res.status(500).json({ message: 'Failed to fetch tenants' });
      }
    });

    // Get tenant by ID
    this.router.get('/:id', authCheck, async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        const tenant = await storage.getTenant(id);
        
        if (!tenant) {
          return res.status(404).json({ message: 'Tenant not found' });
        }
        
        res.json(tenant);
      } catch (error) {
        log(`Error fetching tenant: ${error.message}`, 'tenant-service');
        res.status(500).json({ message: 'Failed to fetch tenant' });
      }
    });

    // Create tenant
    this.router.post('/', authCheck, async (req, res) => {
      try {
        const tenantData = insertTenantSchema.parse(req.body);
        const existingTenant = await storage.getTenantByDomain(tenantData.domain);
        
        if (existingTenant) {
          log(`Tenant creation failed: Domain '${tenantData.domain}' already exists`, 'tenant-service');
          return res.status(400).json({ message: 'Domain already exists' });
        }
        
        const tenant = await storage.createTenant(tenantData);
        log(`Tenant created: ${tenant.name} (${tenant.domain})`, 'tenant-service');
        res.status(201).json(tenant);
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          log(`Validation error during tenant creation: ${validationError.message}`, 'tenant-service');
          res.status(400).json({ message: validationError.message });
        } else {
          log(`Error creating tenant: ${error.message}`, 'tenant-service');
          res.status(500).json({ message: 'Internal server error' });
        }
      }
    });

    // Update tenant
    this.router.patch('/:id', authCheck, async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        
        // Only allow updating certain fields
        const { name, status } = req.body;
        const updateData = { name, status };
        
        // Filter out undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });
        
        // Check if tenant exists
        const existingTenant = await storage.getTenant(id);
        if (!existingTenant) {
          return res.status(404).json({ message: 'Tenant not found' });
        }
        
        // Update the tenant
        const updatedTenant = await storage.updateTenant(id, updateData);
        log(`Tenant updated: ${id}`, 'tenant-service');
        res.json(updatedTenant);
      } catch (error) {
        log(`Error updating tenant: ${error.message}`, 'tenant-service');
        res.status(500).json({ message: 'Failed to update tenant' });
      }
    });

    // Configure tenant strategies
    this.router.post('/strategies', authCheck, (req, res) => {
      const { identificationStrategy, isolationStrategy } = req.body;
      
      if (identificationStrategy) {
        if (['subdomain', 'path', 'header', 'all'].includes(identificationStrategy)) {
          this.setTenantIdentificationStrategy(identificationStrategy);
        } else {
          return res.status(400).json({ message: 'Invalid identification strategy' });
        }
      }
      
      if (isolationStrategy) {
        if (['database', 'schema', 'row'].includes(isolationStrategy)) {
          this.setTenantIsolationStrategy(isolationStrategy);
        } else {
          return res.status(400).json({ message: 'Invalid isolation strategy' });
        }
      }
      
      res.json({
        message: 'Tenant strategies updated',
        identificationStrategy: this.tenantIdentificationStrategy,
        isolationStrategy: this.tenantIsolationStrategy
      });
    });
  }
}

export function createTenantService(): TenantService {
  return new TenantService();
}