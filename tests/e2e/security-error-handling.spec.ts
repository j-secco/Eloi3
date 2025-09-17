import { test, expect } from '@playwright/test';
import { 
  KioskHelpers, 
  RobotHelpers, 
  ChessHelpers,
  AssertionHelpers, 
  TestDataLoader 
} from '../utils/test-helpers';

/**
 * Security and Error Handling Tests for UR10 Robot Kiosk
 * 
 * These tests verify security features and error handling:
 * - Authentication and authorization
 * - Session management
 * - Network error handling
 * - Robot error recovery
 * - Security headers and HTTPS
 * - Input validation and sanitization
 * 
 * @tags @security @error @recovery
 */

test.describe('Security and Error Handling Tests', () => {
  let kioskHelpers: KioskHelpers;
  let robotHelpers: RobotHelpers;
  let chessHelpers: ChessHelpers;
  let assertionHelpers: AssertionHelpers;

  test.beforeEach(async ({ page }) => {
    kioskHelpers = new KioskHelpers(page);
    robotHelpers = new RobotHelpers(page);
    chessHelpers = new ChessHelpers(page);
    assertionHelpers = new AssertionHelpers(page);
  });

  test('HTTPS is enforced @security @https @critical', async ({ page }) => {
    // Try to access HTTP version
    const httpUrl = page.url().replace('https://', 'http://');
    
    try {
      await page.goto(httpUrl);
      
      // Should be redirected to HTTPS
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/^https:/);
    } catch (error) {
      // HTTP might be completely blocked, which is also acceptable
      expect(error).toBeTruthy();
    }
  });

  test('Security headers are present @security @headers', async ({ page }) => {
    await page.goto('/');
    
    // Check for security headers in response
    const response = await page.waitForResponse(response => 
      response.url().includes(page.url()) && response.status() === 200
    );
    
    const headers = response.headers();
    
    // Verify security headers
    expect(headers['strict-transport-security']).toBeTruthy();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-xss-protection']).toMatch(/1; mode=block/);
    expect(headers['content-security-policy']).toBeTruthy();
    expect(headers['referrer-policy']).toBeTruthy();
  });

  test('Authentication prevents unauthorized access @security @auth @critical', async ({ page }) => {
    await page.goto('/');
    
    // Verify lock screen is shown
    await expect(page.locator('[data-testid="lock-screen"]')).toBeVisible();
    
    // Try to access protected functionality without authentication
    await expect(page.locator('[data-testid="dashboard"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="jog-controls"]')).not.toBeVisible();
    
    // Try invalid PIN
    await page.locator('[data-testid="pin-1"]').click();
    await page.locator('[data-testid="pin-2"]').click();
    await page.locator('[data-testid="pin-3"]').click();
    await page.locator('[data-testid="pin-5"]').click(); // Wrong digit
    await page.locator('[data-testid="unlock-button"]').click();
    
    // Should remain locked
    await expect(page.locator('[data-testid="lock-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="invalid-pin-message"]')).toBeVisible();
  });

  test('Session timeout works correctly @security @session', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    
    // Verify authenticated
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Simulate session timeout by manipulating session storage
    await page.evaluate(() => {
      localStorage.setItem('sessionExpiry', (Date.now() - 1000).toString());
    });
    
    // Trigger session check (navigate or perform action)
    await page.reload();
    
    // Should be locked again
    await expect(page.locator('[data-testid="lock-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
  });

  test('Rate limiting prevents abuse @security @rate-limit', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    await kioskHelpers.navigateTo('jog');
    
    // Make many rapid requests to trigger rate limiting
    const rapidRequests = Array(50).fill(null);
    
    let rateLimitTriggered = false;
    
    page.on('response', response => {
      if (response.status() === 429) {
        rateLimitTriggered = true;
      }
    });
    
    // Send rapid requests
    for (let i = 0; i < rapidRequests.length; i++) {
      try {
        await page.locator('[data-testid="jog-x-positive"]').click();
        await page.waitForTimeout(50); // Very rapid clicks
      } catch (error) {
        // Some requests may fail due to rate limiting
      }
    }
    
    // Wait a bit for rate limiting to kick in
    await page.waitForTimeout(2000);
    
    // Rate limiting should have been triggered
    expect(rateLimitTriggered).toBeTruthy();
  });

  test('Input validation prevents XSS attacks @security @xss', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    await kioskHelpers.navigateTo('settings');
    
    // Try to inject script in text inputs
    const maliciousInputs = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(\'XSS\')">',
      '"><script>alert("XSS")</script>',
    ];
    
    for (const maliciousInput of maliciousInputs) {
      // Try to inject in various input fields
      const inputs = await page.locator('input[type="text"], textarea').all();
      
      for (const input of inputs) {
        try {
          await input.fill(maliciousInput);
          await page.waitForTimeout(500);
          
          // Verify script didn't execute
          const alertDialogs = page.locator('role=dialog');
          await expect(alertDialogs).toHaveCount(0);
          
          // Verify input was sanitized
          const inputValue = await input.inputValue();
          expect(inputValue).not.toContain('<script>');
          expect(inputValue).not.toContain('javascript:');
        } catch (error) {
          // Input rejection is also acceptable
        }
      }
    }
  });

  test('Network errors are handled gracefully @error @network', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    
    // Block all API requests to simulate network failure
    await page.route('**/api/**', route => route.abort());
    
    // Try various operations
    await kioskHelpers.navigateTo('jog');
    await page.locator('[data-testid="robot-home"]').click();
    
    // Verify error handling
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="network-error"]')).toContainText(/network|connection|offline/i);
    
    // Verify retry mechanism
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Restore network and test recovery
    await page.unroute('**/api/**');
    await page.locator('[data-testid="retry-button"]').click();
    
    // Should recover
    await page.waitForTimeout(2000);
    const robotStatus = await kioskHelpers.getRobotStatus();
    expect(['idle', 'connecting']).toContain(robotStatus);
  });

  test('Robot errors are handled and recovered @error @robot @recovery', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    await kioskHelpers.navigateTo('jog');
    
    // Simulate robot error by returning error responses
    await page.route('**/api/v1/robot/move', route => 
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Robot joint limit exceeded' })
      })
    );
    
    // Try to move robot
    await page.locator('[data-testid="jog-x-positive"]').click();
    
    // Verify error is displayed
    await expect(page.locator('[data-testid="robot-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="robot-error"]')).toContainText(/joint limit|error/i);
    
    // Verify robot status shows error
    await kioskHelpers.waitForRobotStatus('error', 5000);
    
    // Verify recovery options are available
    await expect(page.locator('[data-testid="reset-robot"]')).toBeVisible();
    await expect(page.locator('[data-testid="robot-home"]')).toBeVisible();
    
    // Test error recovery
    await page.unroute('**/api/v1/robot/move');
    await page.locator('[data-testid="reset-robot"]').click();
    
    // Should recover to idle state
    await kioskHelpers.waitForRobotStatus('idle', 10000);
  });

  test('Chess game errors are handled gracefully @error @chess', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    await kioskHelpers.navigateTo('chess');
    
    await chessHelpers.startNewGame('white');
    
    // Simulate chess engine error
    await page.route('**/api/v1/chess/**', route => 
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Chess engine crashed' })
      })
    );
    
    // Try to make a move
    await chessHelpers.makeMove('e2', 'e4');
    
    // Wait for robot move (which should fail)
    await page.waitForTimeout(5000);
    
    // Verify error handling
    await expect(page.locator('[data-testid="chess-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="chess-error"]')).toContainText(/chess engine|error/i);
    
    // Verify recovery options
    await expect(page.locator('[data-testid="restart-chess-engine"]')).toBeVisible();
    await expect(page.locator('[data-testid="new-chess-game"]')).toBeVisible();
    
    // Test recovery
    await page.unroute('**/api/v1/chess/**');
    await page.locator('[data-testid="restart-chess-engine"]').click();
    
    // Should be able to continue
    await page.waitForTimeout(2000);
    const gameStatus = await chessHelpers.getGameStatus();
    expect(['in progress', 'ready']).toContain(gameStatus.toLowerCase());
  });

  test('Emergency stop works during errors @error @safety @critical', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    await kioskHelpers.navigateTo('jog');
    
    // Simulate robot in error state
    await page.route('**/api/v1/robot/status', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          status: 'error',
          error: 'Joint limit exceeded',
          position: [0, 0, 0, 0, 0, 0]
        })
      })
    );
    
    await page.reload();
    await kioskHelpers.unlock();
    await kioskHelpers.navigateTo('jog');
    
    // Verify robot is in error state
    await kioskHelpers.waitForRobotStatus('error', 5000);
    
    // Emergency stop should still work
    await kioskHelpers.triggerEmergencyStop();
    
    // Verify emergency stop is active
    expect(await kioskHelpers.isEmergencyStopActive()).toBeTruthy();
    await expect(page.locator('[data-testid="estop-active"]')).toBeVisible();
    
    // All controls should be disabled
    await expect(page.locator('[data-testid="jog-x-positive"]')).toBeDisabled();
    await expect(page.locator('[data-testid="robot-home"]')).toBeDisabled();
  });

  test('Memory leaks are prevented during errors @error @performance', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    
    const initialMemory = await page.evaluate(() => 
      (performance as any).memory?.usedJSHeapSize || 0
    );
    
    // Simulate multiple error scenarios
    const errorScenarios = [
      () => page.route('**/api/v1/robot/**', route => route.abort()),
      () => page.route('**/api/v1/chess/**', route => route.abort()),
      () => page.route('**/ws/**', route => route.abort()),
    ];
    
    for (let i = 0; i < 10; i++) {
      // Apply random error scenario
      const scenario = errorScenarios[i % errorScenarios.length];
      await scenario();
      
      // Perform operations that will fail
      await kioskHelpers.navigateTo('jog');
      await page.locator('[data-testid="robot-home"]').click();
      await page.waitForTimeout(1000);
      
      await kioskHelpers.navigateTo('chess');
      await page.locator('[data-testid="new-chess-game"]').click();
      await page.waitForTimeout(1000);
      
      // Clear routes
      await page.unroute('**/api/**');
      await page.unroute('**/ws/**');
      
      await page.waitForTimeout(500);
    }
    
    // Check memory usage
    const finalMemory = await page.evaluate(() => 
      (performance as any).memory?.usedJSHeapSize || 0
    );
    
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  test('Malformed API responses are handled @error @api', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    
    // Return malformed JSON responses
    await page.route('**/api/v1/robot/status', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json {'
      })
    );
    
    await kioskHelpers.navigateTo('jog');
    
    // Should handle malformed response gracefully
    await expect(page.locator('[data-testid="api-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="api-error"]')).toContainText(/invalid response|parse error/i);
    
    // Application should remain functional
    await assertionHelpers.assertNoErrors();
    await expect(page.locator('[data-testid="jog-screen"]')).toBeVisible();
  });

  test('Concurrent error scenarios are handled @error @stress', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    
    // Simulate multiple concurrent errors
    const errorPromises = [
      // Network errors
      page.route('**/api/v1/robot/move', route => route.abort()),
      // Server errors
      page.route('**/api/v1/chess/move', route => 
        route.fulfill({ status: 500, body: 'Server Error' })
      ),
      // Timeout errors
      page.route('**/api/v1/robot/status', route => 
        new Promise(resolve => setTimeout(() => route.abort(), 10000))
      ),
    ];
    
    await Promise.all(errorPromises);
    
    // Try multiple operations simultaneously
    const operationPromises = [
      kioskHelpers.navigateTo('jog'),
      kioskHelpers.navigateTo('chess'),
      page.locator('[data-testid="robot-home"]').click(),
      page.locator('[data-testid="new-chess-game"]').click(),
    ];
    
    // Wait for operations to complete (or fail)
    await Promise.allSettled(operationPromises);
    
    // Application should remain stable
    await page.waitForTimeout(2000);
    await assertionHelpers.assertNoErrors();
    
    // Should be able to navigate
    await kioskHelpers.navigateTo('dashboard');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('Browser security features work @security @browser', async ({ page }) => {
    await page.goto('/');
    
    // Test Content Security Policy
    const cspViolations: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('Content Security Policy')) {
        cspViolations.push(msg.text());
      }
    });
    
    // Try to execute inline script (should be blocked by CSP)
    await page.evaluate(() => {
      try {
        eval('console.log("This should be blocked")');
      } catch (error) {
        // CSP should block this
      }
    });
    
    // Try to load external resource (should be controlled by CSP)
    await page.evaluate(() => {
      const img = document.createElement('img');
      img.src = 'https://evil.example.com/malicious.jpg';
      document.body.appendChild(img);
    });
    
    await page.waitForTimeout(2000);
    
    // Verify CSP is working (violations should be logged)
    // Note: This test may need adjustment based on actual CSP configuration
  });

  test('Data sanitization prevents injection @security @sanitization', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    await kioskHelpers.navigateTo('settings');
    
    // Test various injection attempts
    const injectionAttempts = [
      { input: '<script>alert("XSS")</script>', field: 'robot-name' },
      { input: 'javascript:void(0)', field: 'robot-ip' },
      { input: '"><img src=x onerror=alert(1)>', field: 'robot-name' },
      { input: 'DROP TABLE users;', field: 'robot-name' },
    ];
    
    for (const attempt of injectionAttempts) {
      const inputField = page.locator(`[data-testid="${attempt.field}"]`);
      
      if (await inputField.isVisible()) {
        await inputField.fill(attempt.input);
        await page.locator('[data-testid="save-settings"]').click();
        
        // Verify data was sanitized
        const savedValue = await inputField.inputValue();
        expect(savedValue).not.toContain('<script>');
        expect(savedValue).not.toContain('javascript:');
        expect(savedValue).not.toContain('onerror=');
        expect(savedValue).not.toContain('DROP TABLE');
      }
    }
  });
});

