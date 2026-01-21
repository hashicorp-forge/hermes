import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Hermes E2E acceptance tests
 * Tests run against testing environment (./testing/docker-compose.yml):
 * - Backend: hermes-server container (port 8001)
 * - Frontend: hermes-web container (port 4201)
 * - Dex OIDC: hermes-dex container (port 5558)
 * 
 * Web UI accessible at: http://localhost:4201
 * Backend API at: http://localhost:8001
 * Dex OIDC at: http://localhost:5558
 * 
 * To switch to local dev (ports 4200/8000), set TEST_ENV=local
 */
const TEST_ENV = process.env.TEST_ENV || 'testing';
const BASE_URL = TEST_ENV === 'local' ? 'http://localhost:4200' : 'http://localhost:4201';

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
    baseURL: BASE_URL,
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
