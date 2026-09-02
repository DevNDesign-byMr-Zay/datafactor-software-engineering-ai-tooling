export default {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  transform: {},
  collectCoverageFrom: [
    'Software Engineering & AI Tooling/Frontend Engineering/JavaScript/Aster JavaScript v638.js',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};
