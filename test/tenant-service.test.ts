import fetch from 'node-fetch';

describe('Tenant Service Tests', () => {
  // Ensure dev mode is enabled before tests
  beforeAll(async () => {
    await fetch('http://localhost:5000/api/env/toggle-mode', { method: 'POST' });
    const envResponse = await fetch('http://localhost:5000/api/env');
    const envData = await envResponse.json();
    
    if (!envData.useDevMode) {
      throw new Error('Dev mode not enabled, tests will fail');
    }
  });
  
  test('Can fetch all tenants', async () => {
    const response = await fetch('http://localhost:5000/api/tenants');
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    
    // Check tenant data structure
    const tenant = data[0];
    expect(tenant).toHaveProperty('id');
    expect(tenant).toHaveProperty('name');
    expect(tenant).toHaveProperty('domain');
  });
  
  test('Tenant multi-tenancy tests run successfully', async () => {
    const response = await fetch('http://localhost:5000/api/tenants/test/testCreation');
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('results');
  });
  
  test('Tenant data isolation test', async () => {
    const response = await fetch('http://localhost:5000/api/tenants/test/testIsolation');
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('results');
  });
  
  test('Tenant access control test', async () => {
    const response = await fetch('http://localhost:5000/api/tenants/test/testAccessControl');
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('results');
  });
  
  test('Tenant resource limits test', async () => {
    const response = await fetch('http://localhost:5000/api/tenants/test/testResourceLimits');
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('results');
  });
});