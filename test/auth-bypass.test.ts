import fetch from 'node-fetch';

describe('Authentication Bypass Tests', () => {
  test('Development mode allows access to protected routes', async () => {
    // First ensure dev mode is enabled
    await fetch('http://localhost:5000/api/env/toggle-mode', { method: 'POST' });
    
    // Verify dev mode is enabled
    const envResponse = await fetch('http://localhost:5000/api/env');
    const envData = await envResponse.json();
    expect(envData.useDevMode).toBe(true);
    
    // Check authenticated status
    const authResponse = await fetch('http://localhost:5000/api/auth/status');
    const authData = await authResponse.json();
    expect(authResponse.status).toBe(200);
    expect(authData.authenticated).toBe(true);
    
    // Access protected route
    const response = await fetch('http://localhost:5000/api/users/current');
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('username');
  });
  
  test('Production mode requires authentication', async () => {
    // Disable dev mode
    await fetch('http://localhost:5000/api/env/toggle-mode', { method: 'POST' });
    
    // Verify dev mode is disabled
    const envResponse = await fetch('http://localhost:5000/api/env');
    const envData = await envResponse.json();
    expect(envData.useDevMode).toBe(false);
    
    // Try to access protected route
    const response = await fetch('http://localhost:5000/api/users/current');
    expect(response.status).toBe(401);
    
    // Re-enable dev mode for other tests
    await fetch('http://localhost:5000/api/env/toggle-mode', { method: 'POST' });
  });
});