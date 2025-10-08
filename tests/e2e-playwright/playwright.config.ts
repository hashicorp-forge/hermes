import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Hermes E2E acceptance tests
 * Tests run against containerized testing environment (testing/docker-compose.yml)
 * Web UI accessible at: http://localhost:4201
 * Backend API at: http://localhost:8001
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
    baseURL: 'http://localhost:4201',
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

  webServer: {
    command: 'cd ../../testing && docker compose up -d hermes-web',
    url: 'http://localhost:4201',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
