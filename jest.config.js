export default {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  transform: {},
  collectCoverageFrom: ['src/**/*.js', 'src/promoted/*.mjs'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};
