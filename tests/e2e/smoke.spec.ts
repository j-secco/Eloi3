import { test, expect } from '@playwright/test';
import { 
  KioskHelpers, 
  RobotHelpers, 
  AssertionHelpers, 
  PerformanceHelpers,
  TestDataLoader 
} from '../utils/test-helpers';

/**
 * Smoke Tests for UR10 Robot Kiosk
 * 
 * These tests verify basic functionality and system health:
 * - Application loads correctly
 * - Authentication works
 * - Navigation functions
 * - Robot connection status
 * - Basic UI interactions
 * 
 * @tags @smoke @critical
 */

test.describe('Smoke Tests', () => {
  let kioskHelpers: KioskHelpers;
  let robotHelpers: RobotHelpers;
  let assertionHelpers: AssertionHelpers;
  let performanceHelpers: PerformanceHelpers;

  test.beforeEach(async ({ page }) => {
    kioskHelpers = new KioskHelpers(page);
    robotHelpers = new RobotHelpers(page);
    assertionHelpers = new AssertionHelpers(page);
    performanceHelpers = new PerformanceHelpers(page);
  });

  test('Application loads successfully @smoke @critical', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Verify page loads within reasonable time
    const loadTime = await performanceHelpers.measurePageLoad();
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
    
    // Verify essential elements are present
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="lock-screen"]')).toBeVisible();
    
    // Verify no JavaScript errors
    await assertionHelpers.assertNoErrors();
    
    // Take screenshot for documentation
    await page.screenshot({ path: 'reports/screenshots/app-loaded.png' });
  });

  test('Authentication system works @smoke @critical', async ({ page }) => {
    await page.goto('/');
    
    const testUsers = TestDataLoader.loadTestUsers();
    const operatorPin = testUsers.operator.pin;
    
    // Verify lock screen is displayed
    await expect(page.locator('[data-testid="lock-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="pin-display"]')).toBeVisible();
    
    // Test PIN entry
    await kioskHelpers.unlock(operatorPin);
    
    // Verify successful authentication
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="lock-screen"]')).not.toBeVisible();
    
    // Verify user role is displayed
    await expect(page.locator('[data-testid="user-role"]')).toContainText('operator');
  });

  test('Navigation between screens works @smoke', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    
    // Test navigation to each screen
    const screens = ['jog', 'chess', 'settings'] as const;
    
    for (const screen of screens) {
      await kioskHelpers.navigateTo(screen);
      await expect(page.locator(`[data-testid="${screen}-screen"]`)).toBeVisible();
      
      // Verify screen-specific elements
      switch (screen) {
        case 'jog':
          await expect(page.locator('[data-testid="jog-controls"]')).toBeVisible();
          break;
        case 'chess':
          await expect(page.locator('[data-testid="chess-interface"]')).toBeVisible();
          break;
        case 'settings':
          await expect(page.locator('[data-testid="settings-tabs"]')).toBeVisible();
          break;
      }
    }
    
    // Return to dashboard
    await kioskHelpers.navigateTo('dashboard');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('Robot connection status is displayed @smoke @robot', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    
    // Verify robot status indicator is present
    await expect(page.locator('[data-testid="robot-status"]')).toBeVisible();
    
    // Get current robot status
    const status = await kioskHelpers.getRobotStatus();
    expect(['idle', 'moving', 'error', 'disconnected']).toContain(status);
    
    // Verify status-specific UI elements
    if (status === 'disconnected') {
      await expect(page.locator('[data-testid="robot-disconnected-warning"]')).toBeVisible();
    } else {
      await expect(page.locator('[data-testid="robot-position"]')).toBeVisible();
    }
  });

  test('Emergency stop is accessible @smoke @safety @critical', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    
    // Verify emergency stop button is always visible
    await expect(page.locator('[data-testid="emergency-stop"]')).toBeVisible();
    await expect(page.locator('[data-testid="emergency-stop"]')).toBeEnabled();
    
    // Verify emergency stop styling (should be prominent)
    const estopButton = page.locator('[data-testid="emergency-stop"]');
    const buttonColor = await estopButton.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Should be red or similar warning color
    expect(buttonColor).toMatch(/rgb\(.*255.*0.*0.*\)|red|#ff0000|#dc2626/i);
  });

  test('WebSocket connection establishes @smoke', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    
    // Wait for WebSocket connection
    await page.waitForTimeout(2000);
    
    // Check WebSocket connection status
    const wsStatus = await page.evaluate(() => {
      return (window as any).wsConnectionStatus || 'unknown';
    });
    
    // Should be connected or connecting
    expect(['connected', 'connecting']).toContain(wsStatus);
    
    // Verify telemetry data is being received
    await expect(page.locator('[data-testid="telemetry-timestamp"]')).toBeVisible();
  });

  test('Touch interactions work on touch devices @smoke @touch', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Touch test only runs on mobile/touch devices');
    
    await page.goto('/');
    await kioskHelpers.unlock();
    
    // Test touch navigation
    await page.tap('[data-testid="nav-jog"]');
    await expect(page.locator('[data-testid="jog-screen"]')).toBeVisible();
    
    // Test touch controls
    await page.tap('[data-testid="jog-x-positive"]');
    await page.waitForTimeout(500);
    
    // Verify touch feedback
    const jogButton = page.locator('[data-testid="jog-x-positive"]');
    const isPressed = await jogButton.evaluate(el => 
      el.classList.contains('pressed') || el.classList.contains('active')
    );
    
    // Button should show visual feedback
    expect(isPressed).toBeTruthy();
  });

  test('Responsive design works on different screen sizes @smoke @responsive', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500); // Allow layout to adjust
      
      // Verify essential elements are still visible
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="emergency-stop"]')).toBeVisible();
      
      // Take screenshot for each viewport
      await page.screenshot({ 
        path: `reports/screenshots/responsive-${viewport.name}.png`,
        fullPage: true 
      });
    }
  });

  test('Error handling displays user-friendly messages @smoke', async ({ page }) => {
    await page.goto('/');
    await kioskHelpers.unlock();
    
    // Simulate network error by blocking API calls
    await page.route('**/api/**', route => route.abort());
    
    // Try to perform an action that requires API
    await kioskHelpers.navigateTo('jog');
    await page.locator('[data-testid="robot-home"]').click();
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/connection|network|error/i);
    
    // Verify error is user-friendly (no technical details)
    const errorText = await page.locator('[data-testid="error-message"]').textContent();
    expect(errorText).not.toMatch(/500|404|undefined|null|stack trace/i);
  });

  test('Performance meets requirements @smoke @performance', async ({ page }) => {
    // Measure initial page load
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // 5 seconds max for initial load
    
    await kioskHelpers.unlock();
    
    // Measure navigation performance
    const navStartTime = Date.now();
    await kioskHelpers.navigateTo('jog');
    const navTime = Date.now() - navStartTime;
    
    expect(navTime).toBeLessThan(1000); // 1 second max for navigation
    
    // Check memory usage
    const memoryUsage = await performanceHelpers.checkMemoryUsage();
    expect(memoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB max
  });

  test('Accessibility features work @smoke @a11y', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper ARIA labels
    await expect(page.locator('[data-testid="emergency-stop"]')).toHaveAttribute('aria-label');
    
    // Check for keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focusedElement).toBeTruthy();
    
    // Check for high contrast mode support
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);
    
    // Verify elements are still visible in dark mode
    await expect(page.locator('[data-testid="lock-screen"]')).toBeVisible();
  });

  test('PWA features work @smoke @pwa', async ({ page }) => {
    await page.goto('/');
    
    // Check for service worker registration
    const swRegistered = await page.evaluate(async () => {
      return 'serviceWorker' in navigator && 
             (await navigator.serviceWorker.getRegistrations()).length > 0;
    });
    
    expect(swRegistered).toBeTruthy();
    
    // Check for manifest
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);
    
    // Check for offline capability
    await page.setOfflineMode(true);
    await page.reload();
    
    // Should still load (from cache)
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
    
    await page.setOfflineMode(false);
  });
});

