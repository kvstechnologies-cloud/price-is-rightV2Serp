// Test setup file for common configurations
process.env.NODE_ENV = 'test';

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  CognitoIdentityServiceProvider: jest.fn(),
  S3: jest.fn(),
  DynamoDB: jest.fn()
}));

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User'
  }),
  
  createMockPricingRequest: () => ({
    productType: 'auto',
    coverage: 'comprehensive',
    deductible: 500,
    location: 'CA'
  })
};
