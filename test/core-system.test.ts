import fetch from 'node-fetch';

describe('Core System Tests', () => {
  test('API server starts successfully', async () => {
    const response = await fetch('http://localhost:5000/api/health');
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
  });

  test('Environment configuration is accessible', async () => {
    const response = await fetch('http://localhost:5000/api/env');
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('nodeEnv');
    expect(data).toHaveProperty('useDevMode');
  });

  test('All microservices are healthy', async () => {
    const response = await fetch('http://localhost:5000/api-gateway/health');
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.services).toBeInstanceOf(Array);
    expect(data.services.length).toBeGreaterThan(0);
    
    // All services should report as healthy
    data.services.forEach(service => {
      expect(service.status).toBe('healthy');
    });
  });
});