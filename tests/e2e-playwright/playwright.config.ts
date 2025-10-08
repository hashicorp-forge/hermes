import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Hermes E2E acceptance tests
 * Tests run against local development environment:
 * - Backend: ./hermes server -config=config.hcl (port 8000)
 * - Frontend: Ember dev server in proxy mode (port 4200)
 * - Dex OIDC: docker compose up -d dex (port 5558)
 * 
 * Web UI accessible at: http://localhost:4200
 * Backend API at: http://localhost:8000
 * Dex OIDC at: http://localhost:5558
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  
  // Test artifacts
  outputDir: 'test-results',
  
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Disable webServer since we're running servers manually
  // webServer: {
  //   command: 'cd ../../testing && docker compose up -d hermes-web',
  //   url: 'http://localhost:4201',
  //   reuseExistingServer: true,
  //   timeout: 120 * 1000,
  // },
});
