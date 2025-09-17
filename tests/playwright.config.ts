import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Playwright configuration for UR10 Robot Kiosk E2E tests
 * 
 * This configuration supports:
 * - Multiple browsers and devices
 * - Kiosk mode testing
 * - Touch device simulation
 * - Video recording and screenshots
 * - Parallel test execution
 * - Custom test environments
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Global test timeout
  timeout: 60000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 10000,
  },
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'reports/html-report' }],
    ['json', { outputFile: 'reports/test-results.json' }],
    ['junit', { outputFile: 'reports/junit-results.xml' }],
    ['line'],
  ],
  
  // Global test setup
  globalSetup: './utils/global-setup.ts',
  globalTeardown: './utils/global-teardown.ts',
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.BASE_URL || 'https://localhost:5173',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Ignore HTTPS errors for self-signed certificates
    ignoreHTTPSErrors: true,
    
    // Accept downloads
    acceptDownloads: true,
    
    // Viewport size (will be overridden by device-specific configs)
    viewport: { width: 1920, height: 1080 },
    
    // User agent
    userAgent: 'UR10-Kiosk-E2E-Tests/1.0',
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  // Configure projects for major browsers and devices
  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Kiosk mode (full screen)
    {
      name: 'kiosk-mode',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [
            '--kiosk',
            '--no-first-run',
            '--disable-infobars',
            '--disable-session-crashed-bubble',
            '--disable-translate',
            '--start-maximized',
          ],
        },
      },
    },

    // Touch devices
    {
      name: 'tablet-landscape',
      use: {
        ...devices['iPad Pro landscape'],
        hasTouch: true,
      },
    },
    
    {
      name: 'tablet-portrait',
      use: {
        ...devices['iPad Pro'],
        hasTouch: true,
      },
    },
    
    {
      name: 'mobile-landscape',
      use: {
        ...devices['iPhone 12 Pro landscape'],
        hasTouch: true,
      },
    },
    
    {
      name: 'mobile-portrait',
      use: {
        ...devices['iPhone 12 Pro'],
        hasTouch: true,
      },
    },

    // Industrial touch panel simulation
    {
      name: 'industrial-touch-panel',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
        isMobile: false,
        deviceScaleFactor: 1,
      },
    },

    // Large industrial display
    {
      name: 'industrial-large-display',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1200 },
        hasTouch: true,
        isMobile: false,
        deviceScaleFactor: 1,
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: process.env.CI ? undefined : [
    {
      command: 'cd ../apps/kiosk-ui && npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'cd ../apps/robot-server && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload',
      port: 8000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],

  // Output directory for test artifacts
  outputDir: 'reports/test-results',
  
  // Test match patterns
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts',
  ],
  
  // Test ignore patterns
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
  ],
});

