
import request from 'supertest';
import { createApp } from '../api-gateway';

describe('Application Startup', () => {
  let app: any;

  beforeEach(async () => {
    app = await createApp();
  });

  test('server starts and health check passes', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('all services are registered and healthy', async () => {
    const checks = [
      '/auth/health',
      '/tenants/health', 
      '/properties/health',
      '/users/health',
      '/plans/health'
    ];

    for (const check of checks) {
      const response = await request(app).get(check);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    }
  });
});
