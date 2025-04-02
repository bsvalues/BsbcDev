import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { insertPropertySchema } from '@shared/schema';
import { fromZodError } from 'zod-validation-error';
import { ZodError } from 'zod';
import { log } from '../vite';

const router = Router();

/**
 * Batch operations for properties
 * This endpoint allows creating, updating, or deleting multiple properties in a single request
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { operations } = req.body;
    const tenantId = (req.user as any)?.tenantId;
    const userId = (req.user as any)?.id;
    
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Property batch operations must include an array of operations' 
      });
    }

    // Validate that all operations have valid action and data
    for (const op of operations) {
      if (!op.action || !['create', 'update', 'delete'].includes(op.action)) {
        return res.status(400).json({ 
          error: 'Invalid operation', 
          message: `Invalid action: ${op.action}. Must be 'create', 'update', or 'delete'` 
        });
      }
      
      if (op.action !== 'delete' && !op.data) {
        return res.status(400).json({ 
          error: 'Invalid operation', 
          message: `Data is required for ${op.action} operations` 
        });
      }
      
      if (op.action === 'update' || op.action === 'delete') {
        if (!op.data?.id) {
          return res.status(400).json({ 
            error: 'Invalid operation', 
            message: `Property ID is required for ${op.action} operations` 
          });
        }
      }
    }

    const results = [];
    const errors = [];

    // Execute all operations sequentially
    for (let index = 0; index < operations.length; index++) {
      const op = operations[index];
      try {
        let result;
        
        switch (op.action) {
          case 'create':
            // Add tenant ID and created by user ID to each create operation
            const createData = {
              ...op.data,
              tenantId,
              createdBy: userId
            };
            
            // Validate the property data
            const validatedCreateData = insertPropertySchema.parse(createData);
            result = await storage.createProperty(validatedCreateData);
            break;
            
          case 'update':
            // First check if the property exists and belongs to this tenant
            const propertyToUpdate = await storage.getProperty(op.data.id, tenantId);
            
            if (!propertyToUpdate) {
              throw new Error(`Property with ID ${op.data.id} not found or does not belong to tenant`);
            }
            
            // Validate the update data (partial validation)
            const updateData = insertPropertySchema.partial().parse(op.data);
            result = await storage.updateProperty(op.data.id, updateData);
            break;
            
          case 'delete':
            // First check if the property exists and belongs to this tenant
            const propertyToDelete = await storage.getProperty(op.data.id, tenantId);
            
            if (!propertyToDelete) {
              throw new Error(`Property with ID ${op.data.id} not found or does not belong to tenant`);
            }
            
            // Soft delete by updating the status to 'deleted'
            result = await storage.updateProperty(op.data.id, { status: 'deleted' });
            break;
        }
        
        results.push({
          success: true,
          index,
          action: op.action,
          data: result
        });
      } catch (error) {
        log(`Error in batch operation ${index}: ${error}`, 'property-batch');
        
        let errorMessage;
        if (error instanceof ZodError) {
          errorMessage = fromZodError(error).message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        } else {
          errorMessage = String(error);
        }
        
        errors.push({
          success: false,
          index,
          action: op.action,
          error: errorMessage
        });
      }
    }

    // Return results with success status and details
    res.json({
      status: errors.length === 0 ? 'success' : 'partial_success',
      totalOperations: operations.length,
      successCount: results.length,
      failureCount: errors.length,
      results,
      errors
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Property batch error: ${errorMessage}`, 'error');
    res.status(500).json({ 
      error: 'Failed to execute batch operations',
      details: errorMessage 
    });
  }
});

export default router;