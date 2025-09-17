import { test, expect } from '@playwright/test';
import { 
  KioskHelpers, 
  RobotHelpers, 
  AssertionHelpers, 
  PerformanceHelpers,
  TestDataLoader 
} from '../utils/test-helpers';

/**
 * Robot Control Tests for UR10 Robot Kiosk
 * 
 * These tests verify robot control functionality:
 * - Basic robot movements
 * - Jogging controls
 * - Safety systems
 * - Position accuracy
 * - Error handling
 * 
 * @tags @robot @control
 */

test.describe('Robot Control Tests', () => {
  let kioskHelpers: KioskHelpers;
  let robotHelpers: RobotHelpers;
  let assertionHelpers: AssertionHelpers;
  let performanceHelpers: PerformanceHelpers;

  test.beforeEach(async ({ page }) => {
    kioskHelpers = new KioskHelpers(page);
    robotHelpers = new RobotHelpers(page);
    assertionHelpers = new AssertionHelpers(page);
    performanceHelpers = new PerformanceHelpers(page);
    
    // Navigate to jog screen for robot control tests
    await page.goto('/');
    await kioskHelpers.unlock();
    await kioskHelpers.navigateTo('jog');
  });

  test('Robot home movement works @robot @basic', async ({ page }) => {
    // Verify robot is connected
    await assertionHelpers.assertRobotState('idle');
    
    // Initiate home movement
    await robotHelpers.moveToHome();
    
    // Verify robot reaches home position
    const homePosition = TestDataLoader.loadRobotPositions().homePosition;
    await robotHelpers.waitForPosition(homePosition, 0.01, 30000);
    
    // Verify final state
    await assertionHelpers.assertRobotState('idle');
    
    // Take screenshot of successful home position
    await page.screenshot({ path: 'reports/screenshots/robot-home-position.png' });
  });

  test('Jogging controls work in all axes @robot @jog', async ({ page }) => {
    // Ensure robot is at home position
    await robotHelpers.moveToHome();
    
    const axes = ['x', 'y', 'z', 'rx', 'ry', 'rz'] as const;
    const directions = ['positive', 'negative'] as const;
    const jogDistance = 0.01; // 1cm for linear, 0.01 rad for rotational
    
    for (const axis of axes) {
      for (const direction of directions) {
        // Get initial position
        const initialPosition = await robotHelpers.getCurrentPosition();
        
        // Perform jog movement
        await robotHelpers.jog(axis, direction, jogDistance);
        
        // Wait for movement to complete
        await page.waitForTimeout(2000);
        
        // Verify position changed
        const newPosition = await robotHelpers.getCurrentPosition();
        expect(newPosition).not.toEqual(initialPosition);
        
        // Verify robot is still in idle state
        await assertionHelpers.assertRobotState('idle');
      }
    }
  });

  test('Speed control affects movement time @robot @speed', async ({ page }) => {
    await robotHelpers.moveToHome();
    
    const speeds = [0.1, 0.3, 0.5]; // Different speeds to test
    const movementTimes: number[] = [];
    
    for (const speed of speeds) {
      // Set robot speed
      await robotHelpers.setSpeed(speed);
      
      // Measure time for a standard movement
      const moveTime = await performanceHelpers.measureRobotResponseTime(async () => {
        await robotHelpers.jog('x', 'positive', 0.05); // 5cm movement
      });
      
      movementTimes.push(moveTime);
      
      // Return to starting position
      await robotHelpers.jog('x', 'negative', 0.05);
      await page.waitForTimeout(1000);
    }
    
    // Verify that higher speeds result in faster movements
    expect(movementTimes[0]).toBeGreaterThan(movementTimes[1]); // 0.1 > 0.3
    expect(movementTimes[1]).toBeGreaterThan(movementTimes[2]); // 0.3 > 0.5
  });

  test('Emergency stop immediately halts robot @robot @safety @critical', async ({ page }) => {
    await robotHelpers.moveToHome();
    
    // Start a long movement
    await robotHelpers.jog('x', 'positive', 0.2); // 20cm movement
    
    // Immediately trigger emergency stop
    await page.waitForTimeout(100); // Small delay to ensure movement started
    await kioskHelpers.triggerEmergencyStop();
    
    // Verify emergency stop is active
    expect(await kioskHelpers.isEmergencyStopActive()).toBeTruthy();
    
    // Verify robot stops moving
    await assertionHelpers.assertRobotState('error');
    
    // Verify UI shows emergency stop state
    await expect(page.locator('[data-testid="estop-active"]')).toBeVisible();
    await expect(page.locator('[data-testid="estop-message"]')).toContainText(/emergency stop|e-stop/i);
    
    // Verify controls are disabled
    await expect(page.locator('[data-testid="jog-x-positive"]')).toBeDisabled();
    await expect(page.locator('[data-testid="robot-home"]')).toBeDisabled();
  });

  test('Emergency stop reset restores functionality @robot @safety', async ({ page }) => {
    // First trigger emergency stop
    await kioskHelpers.triggerEmergencyStop();
    expect(await kioskHelpers.isEmergencyStopActive()).toBeTruthy();
    
    // Reset emergency stop
    await kioskHelpers.resetEmergencyStop();
    
    // Verify emergency stop is no longer active
    expect(await kioskHelpers.isEmergencyStopActive()).toBeFalsy();
    
    // Verify robot returns to idle state
    await assertionHelpers.assertRobotState('idle');
    
    // Verify controls are re-enabled
    await expect(page.locator('[data-testid="jog-x-positive"]')).toBeEnabled();
    await expect(page.locator('[data-testid="robot-home"]')).toBeEnabled();
    
    // Test that robot can move again
    await robotHelpers.jog('x', 'positive', 0.01);
    await assertionHelpers.assertRobotState('idle');
  });

  test('Workspace limits prevent dangerous movements @robot @safety', async ({ page }) => {
    await robotHelpers.moveToHome();
    
    // Try to move beyond workspace limits
    // This should either be prevented or trigger a safety stop
    
    // Attempt to move far in positive X direction
    await robotHelpers.setSpeed(0.1); // Slow speed for safety
    
    let movementCount = 0;
    const maxMovements = 100; // Prevent infinite loop
    
    while (movementCount < maxMovements) {
      const initialPosition = await robotHelpers.getCurrentPosition();
      
      try {
        await robotHelpers.jog('x', 'positive', 0.05);
        await page.waitForTimeout(1000);
        
        const newPosition = await robotHelpers.getCurrentPosition();
        
        // If position didn't change, we've hit a limit
        if (Math.abs(newPosition[0] - initialPosition[0]) < 0.001) {
          break;
        }
        
        movementCount++;
      } catch (error) {
        // Movement was prevented - this is expected
        break;
      }
    }
    
    // Verify robot is still in a safe state
    const finalStatus = await kioskHelpers.getRobotStatus();
    expect(['idle', 'error']).toContain(finalStatus);
    
    // If in error state, it should be due to workspace limits
    if (finalStatus === 'error') {
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/workspace|limit|boundary/i);
    }
  });

  test('Position display updates in real-time @robot @telemetry', async ({ page }) => {
    await robotHelpers.moveToHome();
    
    // Get initial position display
    const initialDisplayPosition = await page.locator('[data-testid="robot-position"]').textContent();
    
    // Make a movement
    await robotHelpers.jog('x', 'positive', 0.02);
    await page.waitForTimeout(1000);
    
    // Verify position display updated
    const newDisplayPosition = await page.locator('[data-testid="robot-position"]').textContent();
    expect(newDisplayPosition).not.toBe(initialDisplayPosition);
    
    // Verify position values are reasonable
    const positionMatch = newDisplayPosition?.match(/-?\d+\.\d+/g);
    expect(positionMatch).toBeTruthy();
    
    if (positionMatch) {
      const positions = positionMatch.map(Number);
      expect(positions).toHaveLength(6); // 6 DOF robot
      
      // All positions should be finite numbers
      positions.forEach(pos => {
        expect(pos).toBeFinite();
        expect(pos).not.toBeNaN();
      });
    }
  });

  test('Robot status updates correctly during movements @robot @status', async ({ page }) => {
    await robotHelpers.moveToHome();
    
    // Verify initial idle state
    await assertionHelpers.assertRobotState('idle');
    
    // Start a movement and verify status changes
    const homeButton = page.locator('[data-testid="robot-home"]');
    await homeButton.click();
    
    // Should transition to moving state
    await kioskHelpers.waitForRobotStatus('moving', 5000);
    
    // Should return to idle when complete
    await kioskHelpers.waitForRobotStatus('idle', 30000);
    
    // Verify status indicator styling
    const statusElement = page.locator('[data-testid="robot-status"]');
    const statusClass = await statusElement.getAttribute('class');
    expect(statusClass).toContain('idle');
  });

  test('Multiple rapid commands are handled gracefully @robot @stress', async ({ page }) => {
    await robotHelpers.moveToHome();
    
    // Send multiple rapid jog commands
    const rapidCommands = Array(10).fill(null).map((_, i) => ({
      axis: ['x', 'y', 'z'][i % 3] as 'x' | 'y' | 'z',
      direction: i % 2 === 0 ? 'positive' : 'negative' as 'positive' | 'negative',
      distance: 0.005 // Small movements
    }));
    
    // Execute commands rapidly
    for (const command of rapidCommands) {
      await robotHelpers.jog(command.axis, command.direction, command.distance);
      await page.waitForTimeout(100); // Very short delay
    }
    
    // Wait for all movements to complete
    await page.waitForTimeout(5000);
    
    // Verify robot is still in a good state
    const finalStatus = await kioskHelpers.getRobotStatus();
    expect(['idle', 'moving']).toContain(finalStatus);
    
    // If still moving, wait for completion
    if (finalStatus === 'moving') {
      await kioskHelpers.waitForRobotStatus('idle', 30000);
    }
    
    // Verify no errors occurred
    await assertionHelpers.assertNoErrors();
  });

  test('Robot disconnection is handled gracefully @robot @error', async ({ page }) => {
    // Simulate robot disconnection by blocking robot server requests
    await page.route('**/api/v1/robot/**', route => route.abort());
    
    // Try to perform robot operation
    await page.locator('[data-testid="robot-home"]').click();
    
    // Verify disconnection is detected and displayed
    await kioskHelpers.waitForRobotStatus('disconnected', 10000);
    
    // Verify appropriate error message
    await expect(page.locator('[data-testid="robot-disconnected-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="robot-disconnected-warning"]')).toContainText(/disconnected|connection lost/i);
    
    // Verify controls are disabled
    await expect(page.locator('[data-testid="jog-x-positive"]')).toBeDisabled();
    await expect(page.locator('[data-testid="robot-home"]')).toBeDisabled();
    
    // Restore connection
    await page.unroute('**/api/v1/robot/**');
    
    // Verify reconnection
    await page.waitForTimeout(5000); // Allow time for reconnection
    const reconnectedStatus = await kioskHelpers.getRobotStatus();
    expect(['idle', 'connecting']).toContain(reconnectedStatus);
  });

  test('Custom position movements work @robot @advanced', async ({ page }) => {
    await robotHelpers.moveToHome();
    
    // Define a custom target position
    const targetPosition = [0.2, 0.1, 0.3, 0.0, 0.0, 0.0];
    
    // Enter custom position
    for (let i = 0; i < 6; i++) {
      const input = page.locator(`[data-testid="position-input-${i}"]`);
      await input.fill(targetPosition[i].toString());
    }
    
    // Execute movement to custom position
    await page.locator('[data-testid="move-to-position"]').click();
    
    // Wait for movement to complete
    await kioskHelpers.waitForRobotStatus('moving', 5000);
    await kioskHelpers.waitForRobotStatus('idle', 30000);
    
    // Verify robot reached target position
    await robotHelpers.waitForPosition(targetPosition, 0.01, 5000);
    
    // Take screenshot of custom position
    await page.screenshot({ path: 'reports/screenshots/robot-custom-position.png' });
  });

  test('Touch controls work on touch devices @robot @touch', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Touch test only runs on mobile/touch devices');
    
    await robotHelpers.moveToHome();
    
    // Test touch jog controls
    await page.tap('[data-testid="jog-x-positive"]');
    await page.waitForTimeout(1000);
    
    // Verify movement occurred
    const position = await robotHelpers.getCurrentPosition();
    expect(position[0]).toBeGreaterThan(0); // X should be positive
    
    // Test touch and hold for continuous movement
    const jogButton = page.locator('[data-testid="jog-y-positive"]');
    
    // Start touch and hold
    await jogButton.tap();
    await page.waitForTimeout(2000); // Hold for 2 seconds
    
    // Verify continuous movement
    const newPosition = await robotHelpers.getCurrentPosition();
    expect(Math.abs(newPosition[1])).toBeGreaterThan(0.01); // Y should have moved significantly
  });

  test('Performance meets requirements during robot operations @robot @performance', async ({ page }) => {
    await robotHelpers.moveToHome();
    
    // Measure jog command response time
    const jogResponseTime = await performanceHelpers.measureRobotResponseTime(async () => {
      await robotHelpers.jog('x', 'positive', 0.01);
    });
    
    expect(jogResponseTime).toBeLessThan(5000); // 5 seconds max for small jog
    
    // Measure home command response time
    const homeResponseTime = await performanceHelpers.measureRobotResponseTime(async () => {
      await robotHelpers.moveToHome();
    });
    
    expect(homeResponseTime).toBeLessThan(30000); // 30 seconds max for home
    
    // Check memory usage during robot operations
    const memoryBefore = await performanceHelpers.checkMemoryUsage();
    
    // Perform multiple operations
    for (let i = 0; i < 10; i++) {
      await robotHelpers.jog('x', i % 2 === 0 ? 'positive' : 'negative', 0.005);
      await page.waitForTimeout(500);
    }
    
    const memoryAfter = await performanceHelpers.checkMemoryUsage();
    const memoryIncrease = memoryAfter - memoryBefore;
    
    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB max increase
  });
});

