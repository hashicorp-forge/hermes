module.exports = {
  // Use Istanbul reporters for coverage output
  reporters: ['lcov', 'html', 'text-summary', 'json-summary'],
  
  // Output directory for coverage reports
  coverageFolder: 'coverage',
  
  // Enable parallel test execution for faster coverage collection
  parallel: true,
  
  // Exclude patterns - don't count test files, mirage, or generated files
  excludes: [
    '*/mirage/**/*',
    '*/tests/**/*',
    '*/dist/**/*',
    '*/tmp/**/*',
    '*/node_modules/**/*',
    '*/vendor/**/*',
    '*/.yarn/**/*',
  ],
  
  // Coverage thresholds (will cause builds to fail if not met)
  // Start conservative, increase over time
  coverageThresholds: {
    statements: 60,
    branches: 55,
    functions: 60,
    lines: 60,
  },
  
  // Enable source maps for better debugging
  useBabelInstrumenter: true,
};
