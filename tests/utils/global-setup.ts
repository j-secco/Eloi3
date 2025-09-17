import { chromium, FullConfig } from '@playwright/test';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup for UR10 Robot Kiosk E2E tests
 * 
 * This setup:
 * - Verifies services are running
 * - Sets up test data and fixtures
 * - Configures authentication if needed
 * - Prepares the test environment
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting UR10 Robot Kiosk E2E test setup...');
  
  const baseURL = config.projects[0].use.baseURL || 'https://localhost:5173';
  const robotServerURL = process.env.ROBOT_SERVER_URL || 'https://localhost:8000';
  
  // Wait for services to be ready
  await waitForServices(baseURL, robotServerURL);
  
  // Set up test data
  await setupTestData();
  
  // Create test reports directory
  await createReportsDirectory();
  
  // Set up authentication if needed
  await setupAuthentication(config);
  
  console.log('✅ UR10 Robot Kiosk E2E test setup completed');
}

/**
 * Wait for services to be ready
 */
async function waitForServices(kioskURL: string, robotURL: string) {
  console.log('⏳ Waiting for services to be ready...');
  
  const maxRetries = 30;
  const retryDelay = 2000; // 2 seconds
  
  // Wait for kiosk UI
  await waitForService('Kiosk UI', kioskURL, maxRetries, retryDelay);
  
  // Wait for robot server
  await waitForService('Robot Server', `${robotURL}/health`, maxRetries, retryDelay);
  
  console.log('✅ All services are ready');
}

/**
 * Wait for a specific service to be ready
 */
async function waitForService(serviceName: string, url: string, maxRetries: number, retryDelay: number) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false, // Accept self-signed certificates
        }),
      });
      
      if (response.status === 200) {
        console.log(`✅ ${serviceName} is ready`);
        return;
      }
    } catch (error) {
      console.log(`⏳ Waiting for ${serviceName}... (attempt ${i + 1}/${maxRetries})`);
      
      if (i === maxRetries - 1) {
        throw new Error(`❌ ${serviceName} failed to start after ${maxRetries} attempts`);
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

/**
 * Set up test data and fixtures
 */
async function setupTestData() {
  console.log('📋 Setting up test data...');
  
  const testDataDir = path.join(__dirname, '../fixtures');
  
  // Ensure fixtures directory exists
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }
  
  // Create test chess positions
  const chessPositions = {
    startingPosition: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    midGamePosition: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4',
    endGamePosition: '8/8/8/8/8/8/4K3/4k3 w - - 0 1',
  };
  
  fs.writeFileSync(
    path.join(testDataDir, 'chess-positions.json'),
    JSON.stringify(chessPositions, null, 2)
  );
  
  // Create test robot positions
  const robotPositions = {
    homePosition: [0.0, -0.5, 0.3, 0.0, 0.0, 0.0],
    boardCenter: [0.3, 0.0, 0.1, 0.0, 0.0, 0.0],
    safePosition: [0.0, -0.3, 0.5, 0.0, 0.0, 0.0],
  };
  
  fs.writeFileSync(
    path.join(testDataDir, 'robot-positions.json'),
    JSON.stringify(robotPositions, null, 2)
  );
  
  // Create test user credentials
  const testUsers = {
    operator: {
      pin: '1234',
      role: 'operator',
    },
    supervisor: {
      pin: '9999',
      role: 'supervisor',
    },
  };
  
  fs.writeFileSync(
    path.join(testDataDir, 'test-users.json'),
    JSON.stringify(testUsers, null, 2)
  );
  
  console.log('✅ Test data setup completed');
}

/**
 * Create reports directory
 */
async function createReportsDirectory() {
  const reportsDir = path.join(__dirname, '../reports');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // Create subdirectories
  const subdirs = ['html-report', 'screenshots', 'videos', 'traces'];
  for (const subdir of subdirs) {
    const subdirPath = path.join(reportsDir, subdir);
    if (!fs.existsSync(subdirPath)) {
      fs.mkdirSync(subdirPath, { recursive: true });
    }
  }
}

/**
 * Set up authentication for tests
 */
async function setupAuthentication(config: FullConfig) {
  console.log('🔐 Setting up authentication...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });
  
  try {
    const page = await context.newPage();
    const baseURL = config.projects[0].use.baseURL || 'https://localhost:5173';
    
    // Navigate to the kiosk
    await page.goto(baseURL);
    
    // Check if authentication is required
    const isLocked = await page.locator('[data-testid="lock-screen"]').isVisible();
    
    if (isLocked) {
      console.log('🔓 Performing initial authentication...');
      
      // Enter PIN
      await page.locator('[data-testid="pin-1"]').click();
      await page.locator('[data-testid="pin-2"]').click();
      await page.locator('[data-testid="pin-3"]').click();
      await page.locator('[data-testid="pin-4"]').click();
      await page.locator('[data-testid="unlock-button"]').click();
      
      // Wait for dashboard
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      
      // Save authentication state
      await context.storageState({ path: path.join(__dirname, '../fixtures/auth-state.json') });
      
      console.log('✅ Authentication state saved');
    } else {
      console.log('ℹ️ No authentication required');
    }
  } catch (error) {
    console.warn('⚠️ Authentication setup failed:', error);
  } finally {
    await browser.close();
  }
}

export default globalSetup;

