import { Page, Locator, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test helper utilities for UR10 Robot Kiosk E2E tests
 * 
 * This module provides:
 * - Common test actions and assertions
 * - Robot control helpers
 * - Chess game helpers
 * - UI interaction helpers
 * - Data loading utilities
 */

// Test data interfaces
export interface TestUser {
  pin: string;
  role: string;
}

export interface ChessPosition {
  fen: string;
  description?: string;
}

export interface RobotPosition {
  joints: number[];
  description?: string;
}

/**
 * Load test data from fixtures
 */
export class TestDataLoader {
  private static fixturesDir = path.join(__dirname, '../fixtures');
  
  static loadTestUsers(): Record<string, TestUser> {
    const filePath = path.join(this.fixturesDir, 'test-users.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  
  static loadChessPositions(): Record<string, string> {
    const filePath = path.join(this.fixturesDir, 'chess-positions.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  
  static loadRobotPositions(): Record<string, number[]> {
    const filePath = path.join(this.fixturesDir, 'robot-positions.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
}

/**
 * Kiosk UI helper functions
 */
export class KioskHelpers {
  constructor(private page: Page) {}
  
  /**
   * Unlock the kiosk with PIN
   */
  async unlock(pin: string = '1234') {
    await this.page.waitForSelector('[data-testid="lock-screen"]', { timeout: 10000 });
    
    // Enter PIN digits
    for (const digit of pin) {
      await this.page.locator(`[data-testid="pin-${digit}"]`).click();
      await this.page.waitForTimeout(100); // Small delay between clicks
    }
    
    // Click unlock button
    await this.page.locator('[data-testid="unlock-button"]').click();
    
    // Wait for dashboard to load
    await this.page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
  }
  
  /**
   * Navigate to a specific screen
   */
  async navigateTo(screen: 'dashboard' | 'jog' | 'chess' | 'settings') {
    const screenMap = {
      dashboard: '[data-testid="nav-dashboard"]',
      jog: '[data-testid="nav-jog"]',
      chess: '[data-testid="nav-chess"]',
      settings: '[data-testid="nav-settings"]',
    };
    
    const selector = screenMap[screen];
    if (!selector) {
      throw new Error(`Unknown screen: ${screen}`);
    }
    
    await this.page.locator(selector).click();
    await this.page.waitForSelector(`[data-testid="${screen}-screen"]`, { timeout: 10000 });
  }
  
  /**
   * Check if emergency stop is active
   */
  async isEmergencyStopActive(): Promise<boolean> {
    const estopButton = this.page.locator('[data-testid="emergency-stop"]');
    return await estopButton.getAttribute('data-active') === 'true';
  }
  
  /**
   * Trigger emergency stop
   */
  async triggerEmergencyStop() {
    await this.page.locator('[data-testid="emergency-stop"]').click();
    await this.page.waitForSelector('[data-testid="estop-active"]', { timeout: 5000 });
  }
  
  /**
   * Reset emergency stop
   */
  async resetEmergencyStop() {
    await this.page.locator('[data-testid="reset-estop"]').click();
    await this.page.waitForSelector('[data-testid="estop-active"]', { state: 'hidden', timeout: 5000 });
  }
  
  /**
   * Wait for robot status
   */
  async waitForRobotStatus(status: 'idle' | 'moving' | 'error' | 'disconnected', timeout: number = 10000) {
    await this.page.waitForSelector(`[data-testid="robot-status"][data-status="${status}"]`, { timeout });
  }
  
  /**
   * Get current robot status
   */
  async getRobotStatus(): Promise<string> {
    const statusElement = this.page.locator('[data-testid="robot-status"]');
    return await statusElement.getAttribute('data-status') || 'unknown';
  }
}

/**
 * Robot control helper functions
 */
export class RobotHelpers {
  constructor(private page: Page) {}
  
  /**
   * Move robot to home position
   */
  async moveToHome() {
    await this.page.locator('[data-testid="robot-home"]').click();
    await this.page.waitForSelector('[data-testid="robot-status"][data-status="moving"]', { timeout: 5000 });
    await this.page.waitForSelector('[data-testid="robot-status"][data-status="idle"]', { timeout: 30000 });
  }
  
  /**
   * Jog robot in specific direction
   */
  async jog(axis: 'x' | 'y' | 'z' | 'rx' | 'ry' | 'rz', direction: 'positive' | 'negative', distance: number = 0.01) {
    const jogButton = this.page.locator(`[data-testid="jog-${axis}-${direction}"]`);
    
    // Set jog distance
    await this.page.locator('[data-testid="jog-distance"]').fill(distance.toString());
    
    // Click jog button
    await jogButton.click();
    
    // Wait for movement to complete
    await this.page.waitForTimeout(1000); // Allow time for movement
  }
  
  /**
   * Set robot speed
   */
  async setSpeed(speed: number) {
    await this.page.locator('[data-testid="robot-speed"]').fill(speed.toString());
  }
  
  /**
   * Get current robot position
   */
  async getCurrentPosition(): Promise<number[]> {
    const positionText = await this.page.locator('[data-testid="robot-position"]').textContent();
    if (!positionText) return [];
    
    // Parse position from text (assuming format like "X: 0.123, Y: 0.456, ...")
    const matches = positionText.match(/-?\d+\.\d+/g);
    return matches ? matches.map(Number) : [];
  }
  
  /**
   * Wait for robot to reach position
   */
  async waitForPosition(targetPosition: number[], tolerance: number = 0.001, timeout: number = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const currentPosition = await this.getCurrentPosition();
      
      if (currentPosition.length === targetPosition.length) {
        const isAtPosition = currentPosition.every((pos, index) => 
          Math.abs(pos - targetPosition[index]) < tolerance
        );
        
        if (isAtPosition) {
          return;
        }
      }
      
      await this.page.waitForTimeout(100);
    }
    
    throw new Error(`Robot did not reach target position within ${timeout}ms`);
  }
}

/**
 * Chess game helper functions
 */
export class ChessHelpers {
  constructor(private page: Page) {}
  
  /**
   * Start a new chess game
   */
  async startNewGame(playerColor: 'white' | 'black' = 'white') {
    await this.page.locator('[data-testid="new-chess-game"]').click();
    
    // Select player color
    await this.page.locator(`[data-testid="player-color-${playerColor}"]`).click();
    
    // Confirm game start
    await this.page.locator('[data-testid="start-game"]').click();
    
    // Wait for game to initialize
    await this.page.waitForSelector('[data-testid="chess-board"]', { timeout: 10000 });
  }
  
  /**
   * Make a chess move
   */
  async makeMove(from: string, to: string) {
    // Click source square
    await this.page.locator(`[data-testid="chess-square-${from}"]`).click();
    
    // Wait for piece to be selected
    await this.page.waitForSelector(`[data-testid="chess-square-${from}"][data-selected="true"]`, { timeout: 2000 });
    
    // Click destination square
    await this.page.locator(`[data-testid="chess-square-${to}"]`).click();
    
    // Wait for move to be processed
    await this.page.waitForTimeout(1000);
  }
  
  /**
   * Wait for robot to make move
   */
  async waitForRobotMove(timeout: number = 60000) {
    await this.page.waitForSelector('[data-testid="robot-thinking"]', { timeout: 5000 });
    await this.page.waitForSelector('[data-testid="robot-thinking"]', { state: 'hidden', timeout });
  }
  
  /**
   * Get current game status
   */
  async getGameStatus(): Promise<string> {
    const statusElement = this.page.locator('[data-testid="game-status"]');
    return await statusElement.textContent() || 'unknown';
  }
  
  /**
   * Get current turn
   */
  async getCurrentTurn(): Promise<'white' | 'black'> {
    const turnElement = this.page.locator('[data-testid="current-turn"]');
    const turnText = await turnElement.textContent();
    return turnText?.toLowerCase().includes('white') ? 'white' : 'black';
  }
  
  /**
   * Resign game
   */
  async resignGame() {
    await this.page.locator('[data-testid="resign-game"]').click();
    await this.page.locator('[data-testid="confirm-resign"]').click();
    await this.page.waitForSelector('[data-testid="game-over"]', { timeout: 5000 });
  }
}

/**
 * Touch interaction helpers
 */
export class TouchHelpers {
  constructor(private page: Page) {}
  
  /**
   * Perform touch tap
   */
  async tap(selector: string) {
    const element = this.page.locator(selector);
    await element.tap();
  }
  
  /**
   * Perform long press
   */
  async longPress(selector: string, duration: number = 1000) {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();
    
    if (box) {
      await this.page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await this.page.waitForTimeout(duration);
    }
  }
  
  /**
   * Perform swipe gesture
   */
  async swipe(startSelector: string, endSelector: string) {
    const startElement = this.page.locator(startSelector);
    const endElement = this.page.locator(endSelector);
    
    const startBox = await startElement.boundingBox();
    const endBox = await endElement.boundingBox();
    
    if (startBox && endBox) {
      await this.page.touchscreen.tap(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
      await this.page.mouse.move(endBox.x + endBox.width / 2, endBox.y + endBox.height / 2);
      await this.page.touchscreen.tap(endBox.x + endBox.width / 2, endBox.y + endBox.height / 2);
    }
  }
}

/**
 * Assertion helpers
 */
export class AssertionHelpers {
  constructor(private page: Page) {}
  
  /**
   * Assert robot is in expected state
   */
  async assertRobotState(expectedState: 'idle' | 'moving' | 'error' | 'disconnected') {
    const statusElement = this.page.locator('[data-testid="robot-status"]');
    await expect(statusElement).toHaveAttribute('data-status', expectedState);
  }
  
  /**
   * Assert chess game state
   */
  async assertChessGameState(expectedState: string) {
    const statusElement = this.page.locator('[data-testid="game-status"]');
    await expect(statusElement).toContainText(expectedState);
  }
  
  /**
   * Assert element is visible and interactive
   */
  async assertElementInteractive(selector: string) {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible();
    await expect(element).toBeEnabled();
  }
  
  /**
   * Assert no error messages are displayed
   */
  async assertNoErrors() {
    const errorElements = this.page.locator('[data-testid*="error"], .error, [role="alert"]');
    await expect(errorElements).toHaveCount(0);
  }
}

/**
 * Performance helpers
 */
export class PerformanceHelpers {
  constructor(private page: Page) {}
  
  /**
   * Measure page load time
   */
  async measurePageLoad(): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }
  
  /**
   * Measure robot response time
   */
  async measureRobotResponseTime(action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    await this.page.waitForSelector('[data-testid="robot-status"][data-status="idle"]', { timeout: 30000 });
    return Date.now() - startTime;
  }
  
  /**
   * Check for memory leaks
   */
  async checkMemoryUsage(): Promise<number> {
    const metrics = await this.page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    return metrics;
  }
}

/**
 * Screenshot helpers
 */
export class ScreenshotHelpers {
  constructor(private page: Page) {}
  
  /**
   * Take screenshot with timestamp
   */
  async takeTimestampedScreenshot(name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const screenshotPath = path.join(__dirname, '../reports/screenshots', filename);
    
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  }
  
  /**
   * Take element screenshot
   */
  async takeElementScreenshot(selector: string, name: string): Promise<string> {
    const element = this.page.locator(selector);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const screenshotPath = path.join(__dirname, '../reports/screenshots', filename);
    
    await element.screenshot({ path: screenshotPath });
    return screenshotPath;
  }
}

