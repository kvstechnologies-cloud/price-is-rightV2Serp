module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/unit', '<rootDir>/integration', '<rootDir>/e2e'],
  testMatch: ['**/*.test.js', '**/*.spec.js'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/test/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/fixtures/setup.js']
};
