import { Request, Response, Router } from 'express';
import { storage } from '../storage';
import { insertPropertySchema } from '@shared/schema';
import { log } from '../vite';
import { z } from 'zod';

const router = Router();

// Define a schema for property search parameters
const searchParamsSchema = z.object({
  tenantId: z.coerce.number().optional(),
  query: z.string().optional(),
  propertyType: z.string().optional(),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  limit: z.coerce.number().optional().default(20),
  offset: z.coerce.number().optional().default(0)
});

// Search properties with filtering options
router.get('/search', async (req: Request, res: Response) => {
  try {
    // Validate and parse query parameters
    const validation = searchParamsSchema.safeParse(req.query);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid search parameters', 
        details: validation.error.format() 
      });
    }
    
    const params = validation.data;
    
    // Require tenant ID for data isolation
    if (!params.tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required for property search' });
    }
    
    // Build search criteria object
    const criteria: any = { tenantId: params.tenantId };
    
    if (params.propertyType) criteria.propertyType = params.propertyType;
    if (params.city) criteria.city = params.city;
    if (params.state) criteria.state = params.state;
    
    // Get all properties matching criteria
    const allProperties = await storage.getAllProperties(params.tenantId);
    
    // Apply additional filters manually
    let filteredProperties = [...allProperties];
    
    // Apply value range filters
    if (params.minValue !== undefined) {
      filteredProperties = filteredProperties.filter(p => {
        // Use lastAssessedValue for property value filtering
        const propValue = p.lastAssessedValue || 0;
        return propValue >= params.minValue!;
      });
    }
    
    if (params.maxValue !== undefined) {
      filteredProperties = filteredProperties.filter(p => {
        const propValue = p.lastAssessedValue || 0;
        return propValue <= params.maxValue!;
      });
    }
    
    // Apply text search if query is provided
    if (params.query) {
      const query = params.query.toLowerCase();
      filteredProperties = filteredProperties.filter(p => 
        p.address.toLowerCase().includes(query) || 
        (p.parcelId && p.parcelId.toLowerCase().includes(query)) ||
        // Check propertyDetails for description field or any notes
        (p.propertyDetails && JSON.stringify(p.propertyDetails).toLowerCase().includes(query))
      );
    }
    
    // Sort by property value (highest to lowest)
    filteredProperties.sort((a, b) => {
      const aValue = a.lastAssessedValue || 0;
      const bValue = b.lastAssessedValue || 0;
      return bValue - aValue;
    });
    
    // Apply pagination
    const paginatedResults = filteredProperties.slice(
      params.offset, 
      params.offset + params.limit
    );
    
    // Return results with pagination metadata
    res.json({
      results: paginatedResults,
      pagination: {
        total: filteredProperties.length,
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + params.limit < filteredProperties.length
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Property search error: ${errorMessage}`, 'error');
    res.status(500).json({ error: 'Failed to search properties', details: errorMessage });
  }
});

export default router;