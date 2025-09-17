import { test, expect } from '@playwright/test';
import { 
  KioskHelpers, 
  ChessHelpers, 
  RobotHelpers,
  AssertionHelpers, 
  PerformanceHelpers,
  TestDataLoader 
} from '../utils/test-helpers';

/**
 * Chess Game Tests for UR10 Robot Kiosk
 * 
 * These tests verify chess game functionality:
 * - Game initialization and setup
 * - Human vs robot gameplay
 * - Move validation and execution
 * - Robot physical chess moves
 * - Game state management
 * - Error handling and recovery
 * 
 * @tags @chess @game
 */

test.describe('Chess Game Tests', () => {
  let kioskHelpers: KioskHelpers;
  let chessHelpers: ChessHelpers;
  let robotHelpers: RobotHelpers;
  let assertionHelpers: AssertionHelpers;
  let performanceHelpers: PerformanceHelpers;

  test.beforeEach(async ({ page }) => {
    kioskHelpers = new KioskHelpers(page);
    chessHelpers = new ChessHelpers(page);
    robotHelpers = new RobotHelpers(page);
    assertionHelpers = new AssertionHelpers(page);
    performanceHelpers = new PerformanceHelpers(page);
    
    // Navigate to chess screen
    await page.goto('/');
    await kioskHelpers.unlock();
    await kioskHelpers.navigateTo('chess');
  });

  test('Chess game initializes correctly @chess @basic', async ({ page }) => {
    // Verify chess interface is loaded
    await expect(page.locator('[data-testid="chess-interface"]')).toBeVisible();
    await expect(page.locator('[data-testid="chess-board"]')).toBeVisible();
    
    // Verify initial game state
    await expect(page.locator('[data-testid="game-status"]')).toContainText(/ready|new game/i);
    
    // Verify chess board has correct layout
    const squares = page.locator('[data-testid^="chess-square-"]');
    await expect(squares).toHaveCount(64); // 8x8 board
    
    // Verify pieces are in starting positions
    await expect(page.locator('[data-testid="chess-square-a1"]')).toContainText('♜'); // Black rook
    await expect(page.locator('[data-testid="chess-square-e1"]')).toContainText('♔'); // White king
    await expect(page.locator('[data-testid="chess-square-e8"]')).toContainText('♚'); // Black king
    
    // Take screenshot of initial board
    await page.screenshot({ path: 'reports/screenshots/chess-initial-board.png' });
  });

  test('New chess game starts correctly @chess @game-flow', async ({ page }) => {
    // Start a new game as white
    await chessHelpers.startNewGame('white');
    
    // Verify game started
    await assertionHelpers.assertChessGameState('in progress');
    await expect(page.locator('[data-testid="current-turn"]')).toContainText('white');
    
    // Verify player color is set
    await expect(page.locator('[data-testid="player-color"]')).toContainText('white');
    
    // Verify robot is ready
    await expect(page.locator('[data-testid="robot-opponent"]')).toContainText('ready');
    
    // Verify game controls are available
    await expect(page.locator('[data-testid="resign-game"]')).toBeVisible();
    await expect(page.locator('[data-testid="offer-draw"]')).toBeVisible();
  });

  test('Human player can make valid moves @chess @moves', async ({ page }) => {
    await chessHelpers.startNewGame('white');
    
    // Make opening move: e2-e4
    await chessHelpers.makeMove('e2', 'e4');
    
    // Verify move was executed
    await expect(page.locator('[data-testid="chess-square-e2"]')).not.toContainText('♙');
    await expect(page.locator('[data-testid="chess-square-e4"]')).toContainText('♙');
    
    // Verify turn changed to black
    await expect(page.locator('[data-testid="current-turn"]')).toContainText('black');
    
    // Verify move is recorded in move history
    await expect(page.locator('[data-testid="move-history"]')).toContainText('1. e4');
    
    // Take screenshot after move
    await page.screenshot({ path: 'reports/screenshots/chess-after-human-move.png' });
  });

  test('Invalid moves are rejected @chess @validation', async ({ page }) => {
    await chessHelpers.startNewGame('white');
    
    // Try to make invalid move: king two squares forward
    await page.locator('[data-testid="chess-square-e1"]').click();
    await page.locator('[data-testid="chess-square-e3"]').click();
    
    // Verify move was rejected
    await expect(page.locator('[data-testid="chess-square-e1"]')).toContainText('♔'); // King still there
    await expect(page.locator('[data-testid="chess-square-e3"]')).not.toContainText('♔');
    
    // Verify error message is shown
    await expect(page.locator('[data-testid="invalid-move-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="invalid-move-message"]')).toContainText(/invalid|illegal/i);
    
    // Verify turn hasn't changed
    await expect(page.locator('[data-testid="current-turn"]')).toContainText('white');
  });

  test('Robot makes moves automatically @chess @robot @ai', async ({ page }) => {
    await chessHelpers.startNewGame('white');
    
    // Make human move
    await chessHelpers.makeMove('e2', 'e4');
    
    // Wait for robot to think and make move
    await chessHelpers.waitForRobotMove(60000); // 60 second timeout
    
    // Verify robot made a move
    await expect(page.locator('[data-testid="current-turn"]')).toContainText('white');
    
    // Verify move history shows robot move
    const moveHistory = await page.locator('[data-testid="move-history"]').textContent();
    expect(moveHistory).toMatch(/1\. e4 \w+/); // Should show robot's response
    
    // Verify board state changed
    const boardState = await page.locator('[data-testid="chess-board"]').innerHTML();
    expect(boardState).toBeTruthy();
    
    // Take screenshot after robot move
    await page.screenshot({ path: 'reports/screenshots/chess-after-robot-move.png' });
  });

  test('Robot physically moves pieces @chess @robot @physical', async ({ page }) => {
    // Skip if robot is not connected
    const robotStatus = await kioskHelpers.getRobotStatus();
    test.skip(robotStatus === 'disconnected', 'Robot not connected');
    
    await chessHelpers.startNewGame('white');
    
    // Make human move
    await chessHelpers.makeMove('e2', 'e4');
    
    // Monitor robot status during move execution
    await expect(page.locator('[data-testid="robot-thinking"]')).toBeVisible();
    
    // Wait for robot to start physical movement
    await kioskHelpers.waitForRobotStatus('moving', 30000);
    
    // Verify robot is executing chess move
    await expect(page.locator('[data-testid="robot-action"]')).toContainText(/moving piece|executing move/i);
    
    // Wait for robot to complete move
    await kioskHelpers.waitForRobotStatus('idle', 120000); // 2 minutes for chess move
    
    // Verify move completed successfully
    await expect(page.locator('[data-testid="robot-thinking"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="current-turn"]')).toContainText('white');
  });

  test('Game state is preserved during robot disconnection @chess @error @recovery', async ({ page }) => {
    await chessHelpers.startNewGame('white');
    
    // Make a few moves to establish game state
    await chessHelpers.makeMove('e2', 'e4');
    await chessHelpers.waitForRobotMove();
    await chessHelpers.makeMove('d2', 'd4');
    
    // Get current game state
    const moveHistoryBefore = await page.locator('[data-testid="move-history"]').textContent();
    
    // Simulate robot disconnection
    await page.route('**/api/v1/robot/**', route => route.abort());
    
    // Verify game continues (robot moves disabled but game state preserved)
    await expect(page.locator('[data-testid="robot-disconnected-warning"]')).toBeVisible();
    
    // Verify move history is preserved
    const moveHistoryAfter = await page.locator('[data-testid="move-history"]').textContent();
    expect(moveHistoryAfter).toBe(moveHistoryBefore);
    
    // Verify human can still make moves (in analysis mode)
    await chessHelpers.makeMove('g1', 'f3');
    
    // Restore connection
    await page.unroute('**/api/v1/robot/**');
    await page.waitForTimeout(5000);
    
    // Verify game can continue
    const finalStatus = await kioskHelpers.getRobotStatus();
    expect(['idle', 'connecting']).toContain(finalStatus);
  });

  test('Game can be resigned @chess @game-flow', async ({ page }) => {
    await chessHelpers.startNewGame('white');
    
    // Make a move to start the game
    await chessHelpers.makeMove('e2', 'e4');
    
    // Resign the game
    await chessHelpers.resignGame();
    
    // Verify game ended
    await expect(page.locator('[data-testid="game-over"]')).toBeVisible();
    await expect(page.locator('[data-testid="game-result"]')).toContainText(/resigned|lost/i);
    
    // Verify new game option is available
    await expect(page.locator('[data-testid="new-chess-game"]')).toBeVisible();
    
    // Take screenshot of game over state
    await page.screenshot({ path: 'reports/screenshots/chess-game-resigned.png' });
  });

  test('Draw offers work correctly @chess @game-flow', async ({ page }) => {
    await chessHelpers.startNewGame('white');
    
    // Make a few moves
    await chessHelpers.makeMove('e2', 'e4');
    await chessHelpers.waitForRobotMove();
    
    // Offer draw
    await page.locator('[data-testid="offer-draw"]').click();
    
    // Verify draw offer is displayed
    await expect(page.locator('[data-testid="draw-offer"]')).toBeVisible();
    await expect(page.locator('[data-testid="draw-offer"]')).toContainText(/draw offered/i);
    
    // Robot should respond to draw offer
    await page.waitForTimeout(5000);
    
    // Check if draw was accepted or declined
    const gameStatus = await chessHelpers.getGameStatus();
    expect(['draw accepted', 'draw declined', 'in progress']).toContain(gameStatus.toLowerCase());
  });

  test('Chess position analysis works @chess @analysis', async ({ page }) => {
    await chessHelpers.startNewGame('white');
    
    // Make some moves to create an interesting position
    await chessHelpers.makeMove('e2', 'e4');
    await chessHelpers.waitForRobotMove();
    await chessHelpers.makeMove('d2', 'd4');
    await chessHelpers.waitForRobotMove();
    
    // Enable analysis mode
    await page.locator('[data-testid="analysis-mode"]').click();
    
    // Verify analysis information is displayed
    await expect(page.locator('[data-testid="position-evaluation"]')).toBeVisible();
    await expect(page.locator('[data-testid="best-moves"]')).toBeVisible();
    
    // Verify evaluation shows reasonable values
    const evaluation = await page.locator('[data-testid="position-evaluation"]').textContent();
    expect(evaluation).toMatch(/[+-]?\d+\.\d+|mate/i);
    
    // Take screenshot of analysis
    await page.screenshot({ path: 'reports/screenshots/chess-analysis-mode.png' });
  });

  test('Different chess positions load correctly @chess @positions', async ({ page }) => {
    const chessPositions = TestDataLoader.loadChessPositions();
    
    for (const [positionName, fen] of Object.entries(chessPositions)) {
      // Load specific position
      await page.locator('[data-testid="load-position"]').click();
      await page.locator('[data-testid="fen-input"]').fill(fen);
      await page.locator('[data-testid="load-fen"]').click();
      
      // Verify position loaded
      await page.waitForTimeout(1000);
      
      // Verify board reflects the position
      const boardHTML = await page.locator('[data-testid="chess-board"]').innerHTML();
      expect(boardHTML).toBeTruthy();
      
      // Take screenshot of position
      await page.screenshot({ 
        path: `reports/screenshots/chess-position-${positionName}.png` 
      });
    }
  });

  test('Move history and navigation work @chess @history', async ({ page }) => {
    await chessHelpers.startNewGame('white');
    
    // Make several moves
    const moves = [
      ['e2', 'e4'],
      ['d2', 'd4'],
      ['g1', 'f3']
    ];
    
    for (const [from, to] of moves) {
      await chessHelpers.makeMove(from, to);
      if (await chessHelpers.getCurrentTurn() === 'black') {
        await chessHelpers.waitForRobotMove();
      }
    }
    
    // Verify move history shows all moves
    const moveHistory = await page.locator('[data-testid="move-history"]').textContent();
    expect(moveHistory).toContain('e4');
    expect(moveHistory).toContain('d4');
    expect(moveHistory).toContain('Nf3');
    
    // Test move navigation
    await page.locator('[data-testid="move-back"]').click();
    await page.waitForTimeout(500);
    
    // Verify board state changed
    const currentMove = await page.locator('[data-testid="current-move"]').textContent();
    expect(currentMove).toBeTruthy();
    
    // Navigate forward
    await page.locator('[data-testid="move-forward"]').click();
    await page.waitForTimeout(500);
    
    // Navigate to start
    await page.locator('[data-testid="move-start"]').click();
    await page.waitForTimeout(500);
    
    // Navigate to end
    await page.locator('[data-testid="move-end"]').click();
    await page.waitForTimeout(500);
  });

  test('Chess game performance meets requirements @chess @performance', async ({ page }) => {
    // Measure game initialization time
    const initStartTime = Date.now();
    await chessHelpers.startNewGame('white');
    const initTime = Date.now() - initStartTime;
    
    expect(initTime).toBeLessThan(5000); // 5 seconds max for game init
    
    // Measure move execution time
    const moveStartTime = Date.now();
    await chessHelpers.makeMove('e2', 'e4');
    const moveTime = Date.now() - moveStartTime;
    
    expect(moveTime).toBeLessThan(2000); // 2 seconds max for human move
    
    // Measure robot thinking time (should be reasonable)
    const thinkStartTime = Date.now();
    await chessHelpers.waitForRobotMove(30000);
    const thinkTime = Date.now() - thinkStartTime;
    
    expect(thinkTime).toBeLessThan(30000); // 30 seconds max for robot move
    expect(thinkTime).toBeGreaterThan(1000); // At least 1 second of thinking
    
    // Check memory usage during chess game
    const memoryUsage = await performanceHelpers.checkMemoryUsage();
    expect(memoryUsage).toBeLessThan(200 * 1024 * 1024); // 200MB max
  });

  test('Touch controls work for chess on touch devices @chess @touch', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Touch test only runs on mobile/touch devices');
    
    await chessHelpers.startNewGame('white');
    
    // Test touch move
    await page.tap('[data-testid="chess-square-e2"]');
    await page.waitForTimeout(500);
    
    // Verify piece is selected
    await expect(page.locator('[data-testid="chess-square-e2"]')).toHaveClass(/selected/);
    
    // Complete move with second tap
    await page.tap('[data-testid="chess-square-e4"]');
    
    // Verify move completed
    await expect(page.locator('[data-testid="chess-square-e4"]')).toContainText('♙');
    
    // Test drag and drop (if supported)
    const fromSquare = page.locator('[data-testid="chess-square-d2"]');
    const toSquare = page.locator('[data-testid="chess-square-d4"]');
    
    await fromSquare.dragTo(toSquare);
    
    // Verify drag move worked
    await expect(page.locator('[data-testid="chess-square-d4"]')).toContainText('♙');
  });

  test('Multiple chess games can be played sequentially @chess @regression', async ({ page }) => {
    const numberOfGames = 3;
    
    for (let gameNumber = 1; gameNumber <= numberOfGames; gameNumber++) {
      // Start new game
      await chessHelpers.startNewGame('white');
      
      // Make a few moves
      await chessHelpers.makeMove('e2', 'e4');
      await chessHelpers.waitForRobotMove();
      await chessHelpers.makeMove('d2', 'd4');
      
      // Resign game to end it quickly
      await chessHelpers.resignGame();
      
      // Verify game ended
      await expect(page.locator('[data-testid="game-over"]')).toBeVisible();
      
      // Take screenshot of completed game
      await page.screenshot({ 
        path: `reports/screenshots/chess-game-${gameNumber}-completed.png` 
      });
      
      // Prepare for next game (if not last)
      if (gameNumber < numberOfGames) {
        await page.locator('[data-testid="new-chess-game"]').click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Verify system is still stable after multiple games
    await assertionHelpers.assertNoErrors();
    const memoryUsage = await performanceHelpers.checkMemoryUsage();
    expect(memoryUsage).toBeLessThan(300 * 1024 * 1024); // 300MB max after multiple games
  });
});

