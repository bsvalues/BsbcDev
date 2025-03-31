// Global setup for all tests
process.env.NODE_ENV = 'test';

// Global timeout settings for tests
// Using jasmine's timeout instead of direct jest call to avoid initialization errors
if (typeof global.jasmine !== 'undefined') {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
}

// You can add more global setup here if needed