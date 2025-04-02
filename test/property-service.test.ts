import fetch from 'node-fetch';

describe('Property Service Tests', () => {
  // Ensure dev mode is enabled before tests
  beforeAll(async () => {
    await fetch('http://localhost:5000/api/env/toggle-mode', { method: 'POST' });
    const envResponse = await fetch('http://localhost:5000/api/env');
    const envData = await envResponse.json();
    
    if (!envData.useDevMode) {
      throw new Error('Dev mode not enabled, tests will fail');
    }
  });
  
  test('Can fetch properties for a tenant', async () => {
    // Assuming tenant ID 1 exists
    const response = await fetch('http://localhost:5000/api/properties?tenantId=1');
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    
    if (data.length > 0) {
      const property = data[0];
      expect(property).toHaveProperty('id');
      expect(property).toHaveProperty('address');
      expect(property).toHaveProperty('tenantId');
      expect(property.tenantId).toBe(1);
    }
  });
  
  test('Property valuation workflow executes successfully', async () => {
    // First get a property ID
    const propertiesResponse = await fetch('http://localhost:5000/api/properties?tenantId=1');
    const properties = await propertiesResponse.json();
    
    if (properties.length > 0) {
      const propertyId = properties[0].id;
      
      const response = await fetch('http://localhost:5000/api/mcp/workflows/propertyValuation/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId,
          valuationMethod: 'standard',
          assessmentDate: new Date().toISOString(),
        }),
      });
      
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
    } else {
      // Skip test if no properties
      console.log('Skipping property valuation test - no properties found');
    }
  });
  
  test('Property comparison workflow executes successfully', async () => {
    // First get two property IDs
    const propertiesResponse = await fetch('http://localhost:5000/api/properties?tenantId=1');
    const properties = await propertiesResponse.json();
    
    if (properties.length >= 2) {
      const property1Id = properties[0].id;
      const property2Id = properties[1].id;
      
      const response = await fetch('http://localhost:5000/api/mcp/workflows/propertyComparison/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property1Id,
          property2Id,
          metrics: ['value', 'size', 'tax', 'location']
        }),
      });
      
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('comparison');
    } else {
      // Skip test if not enough properties
      console.log('Skipping property comparison test - not enough properties found');
    }
  });
});