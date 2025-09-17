# UR10 Robot Kiosk - E2E Testing Framework

This directory contains comprehensive end-to-end (E2E) tests for the UR10 Robot Kiosk system using Playwright. The testing framework provides automated testing for all system components including the kiosk UI, robot control, chess gameplay, security features, and error handling.

## Overview

The E2E testing framework provides:

- **Comprehensive Test Coverage**: Tests for all major system components
- **Multi-Browser Support**: Chrome, Firefox, Safari, and mobile browsers
- **Touch Device Testing**: Specialized tests for touch interfaces
- **Robot Integration**: Tests for physical robot movements and safety
- **Chess Game Testing**: Complete chess gameplay validation
- **Security Testing**: Authentication, authorization, and vulnerability tests
- **Error Handling**: Network failures, robot errors, and recovery scenarios
- **Performance Testing**: Load times, memory usage, and responsiveness
- **Accessibility Testing**: WCAG compliance and keyboard navigation
- **PWA Testing**: Service worker, offline functionality, and manifest

## Directory Structure

```
tests/
├── e2e/                           # Test specifications
│   ├── smoke.spec.ts             # Basic functionality and health checks
│   ├── robot-control.spec.ts     # Robot movement and control tests
│   ├── chess-game.spec.ts        # Chess gameplay and AI tests
│   └── security-error-handling.spec.ts # Security and error recovery tests
├── fixtures/                     # Test data and fixtures
│   ├── test-users.json          # User credentials for testing
│   ├── chess-positions.json     # Chess positions for testing
│   ├── robot-positions.json     # Robot positions for testing
│   └── auth-state.json          # Saved authentication state
├── utils/                        # Test utilities and helpers
│   ├── global-setup.ts          # Global test setup
│   ├── global-teardown.ts       # Global test cleanup
│   └── test-helpers.ts          # Helper functions and utilities
├── reports/                      # Test reports and artifacts
│   ├── html-report/             # HTML test reports
│   ├── screenshots/             # Test screenshots
│   ├── videos/                  # Test execution videos
│   ├── traces/                  # Playwright traces
│   └── archives/                # Archived test results
├── package.json                  # Dependencies and scripts
├── playwright.config.ts          # Playwright configuration
├── run-tests.sh                 # Test runner script
└── README.md                    # This file
```

## Quick Start

### Prerequisites

- Node.js 18 or later
- npm or pnpm package manager
- UR10 Kiosk UI running on https://localhost:5173
- UR10 Robot Server running on https://localhost:8000

### Installation

1. **Install dependencies and browsers**:
   ```bash
   ./run-tests.sh --install
   ```

2. **Run all tests**:
   ```bash
   ./run-tests.sh
   ```

3. **Run specific test suite**:
   ```bash
   ./run-tests.sh --suite smoke
   ```

4. **Run tests in headed mode (visible browser)**:
   ```bash
   ./run-tests.sh --headed
   ```

5. **View test reports**:
   ```bash
   ./run-tests.sh --report-only
   ```

## Test Suites

### Smoke Tests (`@smoke`)

Basic functionality and system health checks:

- Application loads correctly
- Authentication system works
- Navigation between screens
- Robot connection status
- Emergency stop accessibility
- WebSocket connections
- Touch interactions
- Responsive design
- Error handling
- Performance requirements
- Accessibility features
- PWA functionality

**Run smoke tests**:
```bash
./run-tests.sh --suite smoke
```

### Robot Control Tests (`@robot`)

Robot movement and control functionality:

- Home position movements
- Jogging controls in all axes
- Speed control effects
- Emergency stop functionality
- Workspace limit enforcement
- Position display updates
- Status updates during movements
- Rapid command handling
- Robot disconnection handling
- Custom position movements
- Touch controls for mobile
- Performance requirements

**Run robot tests**:
```bash
./run-tests.sh --suite robot
```

### Chess Game Tests (`@chess`)

Chess gameplay and AI functionality:

- Game initialization
- New game creation
- Human move validation
- Robot AI moves
- Physical piece movements
- Game state preservation
- Game resignation
- Draw offers
- Position analysis
- Move history navigation
- Multiple game sessions
- Touch controls
- Performance requirements

**Run chess tests**:
```bash
./run-tests.sh --suite chess
```

### Security and Error Handling Tests (`@security`)

Security features and error recovery:

- HTTPS enforcement
- Security headers validation
- Authentication and authorization
- Session management
- Rate limiting
- Input validation and XSS prevention
- Network error handling
- Robot error recovery
- Chess game error handling
- Emergency stop during errors
- Memory leak prevention
- Malformed API responses
- Concurrent error scenarios
- Browser security features
- Data sanitization

**Run security tests**:
```bash
./run-tests.sh --suite security
```

## Test Runner Options

The `run-tests.sh` script provides comprehensive options for test execution:

### Basic Usage

```bash
./run-tests.sh [OPTIONS]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --suite SUITE` | Test suite (smoke\|robot\|chess\|security\|all) | all |
| `-b, --browser BROWSER` | Browser (chromium\|firefox\|webkit\|all) | chromium |
| `-h, --headed` | Run in headed mode (visible browser) | false |
| `-d, --debug` | Run in debug mode | false |
| `-p, --parallel` | Run tests in parallel | true |
| `--no-parallel` | Disable parallel execution | - |
| `-r, --retry COUNT` | Number of retries for failed tests | 1 |
| `-t, --timeout MS` | Test timeout in milliseconds | 60000 |
| `-u, --url URL` | Base URL for kiosk UI | https://localhost:5173 |
| `--robot-url URL` | Robot server URL | https://localhost:8000 |
| `--install` | Install dependencies and browsers | - |
| `--report-only` | Only show reports | - |
| `--clean` | Clean previous results | - |
| `--help` | Show help message | - |

### Examples

```bash
# Run all tests with default settings
./run-tests.sh

# Run smoke tests in headed mode
./run-tests.sh --suite smoke --headed

# Run robot tests in Firefox
./run-tests.sh --suite robot --browser firefox

# Debug mode (headed, single-threaded)
./run-tests.sh --debug

# Run tests against different URLs
./run-tests.sh --url https://kiosk.example.com --robot-url https://robot.example.com

# Clean previous results and run all tests
./run-tests.sh --clean --suite all

# Install dependencies only
./run-tests.sh --install

# View previous test reports
./run-tests.sh --report-only
```

## Configuration

### Playwright Configuration

The `playwright.config.ts` file contains comprehensive configuration:

- **Multiple Browser Support**: Chrome, Firefox, Safari
- **Device Emulation**: Desktop, tablet, mobile, industrial displays
- **Kiosk Mode Testing**: Full-screen kiosk simulation
- **Touch Device Support**: Touch interactions and gestures
- **Video Recording**: On failure for debugging
- **Screenshot Capture**: On failure for analysis
- **Trace Collection**: For detailed debugging
- **Parallel Execution**: Optimized test performance
- **Retry Logic**: Automatic retry on transient failures

### Environment Variables

Set these environment variables to customize test execution:

```bash
export BASE_URL="https://localhost:5173"
export ROBOT_SERVER_URL="https://localhost:8000"
export PWTEST_TIMEOUT="60000"
export CI="true"  # For CI/CD environments
```

### Test Data

Test data is stored in the `fixtures/` directory:

- **test-users.json**: User credentials and roles
- **chess-positions.json**: Chess positions for testing
- **robot-positions.json**: Robot positions and configurations
- **auth-state.json**: Saved authentication state (generated)

## Test Development

### Writing New Tests

1. **Create test file** in the `e2e/` directory:
   ```typescript
   import { test, expect } from '@playwright/test';
   import { KioskHelpers } from '../utils/test-helpers';
   
   test.describe('My New Tests', () => {
     test('should do something @my-tag', async ({ page }) => {
       const kioskHelpers = new KioskHelpers(page);
       await page.goto('/');
       await kioskHelpers.unlock();
       // Test implementation
     });
   });
   ```

2. **Use helper functions** from `test-helpers.ts`:
   ```typescript
   const kioskHelpers = new KioskHelpers(page);
   const robotHelpers = new RobotHelpers(page);
   const chessHelpers = new ChessHelpers(page);
   ```

3. **Add test tags** for categorization:
   ```typescript
   test('my test @smoke @critical', async ({ page }) => {
     // Test implementation
   });
   ```

### Helper Classes

The testing framework provides several helper classes:

#### KioskHelpers
- `unlock(pin)`: Unlock the kiosk interface
- `navigateTo(screen)`: Navigate to different screens
- `isEmergencyStopActive()`: Check emergency stop status
- `triggerEmergencyStop()`: Activate emergency stop
- `waitForRobotStatus(status)`: Wait for robot status change

#### RobotHelpers
- `moveToHome()`: Move robot to home position
- `jog(axis, direction, distance)`: Jog robot in specific direction
- `setSpeed(speed)`: Set robot movement speed
- `getCurrentPosition()`: Get current robot position
- `waitForPosition(target, tolerance)`: Wait for robot to reach position

#### ChessHelpers
- `startNewGame(color)`: Start new chess game
- `makeMove(from, to)`: Make chess move
- `waitForRobotMove()`: Wait for robot to make move
- `getGameStatus()`: Get current game status
- `resignGame()`: Resign current game

#### AssertionHelpers
- `assertRobotState(state)`: Assert robot is in expected state
- `assertChessGameState(state)`: Assert chess game state
- `assertElementInteractive(selector)`: Assert element is interactive
- `assertNoErrors()`: Assert no error messages are displayed

### Test Tags

Use tags to categorize and filter tests:

- `@smoke`: Basic functionality tests
- `@robot`: Robot control tests
- `@chess`: Chess game tests
- `@security`: Security tests
- `@critical`: Critical functionality
- `@touch`: Touch device tests
- `@performance`: Performance tests
- `@a11y`: Accessibility tests
- `@pwa`: Progressive Web App tests
- `@regression`: Regression tests

## Continuous Integration

### GitHub Actions

Example workflow for CI/CD:

```yaml
name: E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        cd tests
        npm install
        npx playwright install --with-deps
        
    - name: Start services
      run: |
        # Start kiosk UI and robot server
        docker-compose up -d
        
    - name: Run E2E tests
      run: |
        cd tests
        ./run-tests.sh --suite smoke --no-parallel
        
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: tests/reports/
```

### Docker Integration

Run tests in Docker containers:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app
COPY tests/ ./tests/
RUN cd tests && npm install

CMD ["./tests/run-tests.sh", "--suite", "smoke"]
```

## Debugging

### Debug Mode

Run tests in debug mode for step-by-step execution:

```bash
./run-tests.sh --debug
```

This enables:
- Headed browser mode
- Single-threaded execution
- Playwright Inspector
- Detailed logging

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots at failure point
- Video recordings of test execution
- Playwright traces for detailed analysis

Access these in the `reports/` directory.

### Trace Viewer

View detailed traces with Playwright's trace viewer:

```bash
npx playwright show-trace reports/traces/trace.zip
```

### Console Logs

Monitor browser console logs during test execution:

```typescript
page.on('console', msg => console.log('Browser:', msg.text()));
```

## Performance Testing

### Metrics Collected

- Page load times
- Robot response times
- Memory usage
- Network request timing
- UI interaction responsiveness

### Performance Assertions

```typescript
// Page load time
const loadTime = await performanceHelpers.measurePageLoad();
expect(loadTime).toBeLessThan(5000);

// Memory usage
const memoryUsage = await performanceHelpers.checkMemoryUsage();
expect(memoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB
```

## Accessibility Testing

### WCAG Compliance

Tests verify:
- Keyboard navigation
- ARIA labels and roles
- Color contrast
- Screen reader compatibility
- Focus management

### Accessibility Assertions

```typescript
// Check ARIA labels
await expect(page.locator('[data-testid="emergency-stop"]'))
  .toHaveAttribute('aria-label');

// Test keyboard navigation
await page.keyboard.press('Tab');
const focusedElement = await page.evaluate(() => 
  document.activeElement?.getAttribute('data-testid')
);
expect(focusedElement).toBeTruthy();
```

## Mobile and Touch Testing

### Touch Device Simulation

Tests run on various device configurations:
- Industrial touch panels
- Tablets (landscape/portrait)
- Mobile devices
- Large industrial displays

### Touch Interactions

```typescript
// Touch tap
await page.tap('[data-testid="button"]');

// Long press
await touchHelpers.longPress('[data-testid="button"]', 1000);

// Swipe gesture
await touchHelpers.swipe('[data-testid="start"]', '[data-testid="end"]');
```

## Troubleshooting

### Common Issues

#### Tests Fail to Start

**Problem**: Services not accessible
**Solution**: 
```bash
# Check if services are running
curl -k https://localhost:5173
curl -k https://localhost:8000/health

# Start services if needed
cd ../apps/kiosk-ui && npm run dev
cd ../apps/robot-server && python -m uvicorn main:app --reload
```

#### Browser Installation Issues

**Problem**: Playwright browsers not installed
**Solution**:
```bash
./run-tests.sh --install
# Or manually:
npx playwright install --with-deps
```

#### Certificate Errors

**Problem**: HTTPS certificate issues
**Solution**:
```bash
# Generate certificates
cd ../deployment/security/scripts
sudo ./generate-certificates.sh

# Or disable HTTPS checks in test config
```

#### Robot Connection Issues

**Problem**: Robot tests fail due to connection
**Solution**:
- Ensure robot server is running
- Check robot IP configuration
- Use mock mode for development:
  ```bash
  export MOCK_MODE=true
  ```

### Debug Logs

Enable detailed logging:

```bash
DEBUG=pw:api ./run-tests.sh --debug
```

### Test Isolation

If tests interfere with each other:

```bash
./run-tests.sh --no-parallel --retry 0
```

## Best Practices

### Test Writing

1. **Use Page Object Model**: Encapsulate page interactions in helper classes
2. **Atomic Tests**: Each test should be independent and isolated
3. **Descriptive Names**: Use clear, descriptive test names
4. **Proper Tagging**: Tag tests for easy filtering and categorization
5. **Error Handling**: Test both success and failure scenarios
6. **Performance Awareness**: Include performance assertions
7. **Accessibility**: Test keyboard navigation and screen readers

### Test Data Management

1. **Use Fixtures**: Store test data in fixture files
2. **Clean State**: Reset state between tests
3. **Realistic Data**: Use realistic test data
4. **Data Isolation**: Avoid shared mutable state

### CI/CD Integration

1. **Parallel Execution**: Use parallel execution for faster CI
2. **Retry Logic**: Configure retries for flaky tests
3. **Artifact Collection**: Save screenshots and videos
4. **Test Reporting**: Generate comprehensive reports
5. **Environment Parity**: Match CI environment to production

## Reporting

### HTML Reports

Comprehensive HTML reports include:
- Test results summary
- Individual test details
- Screenshots and videos
- Performance metrics
- Error traces

Access reports at: `reports/html-report/index.html`

### JSON Reports

Machine-readable JSON reports for integration:
- Test statistics
- Individual test results
- Timing information
- Error details

### JUnit Reports

XML reports compatible with CI/CD systems:
- Jenkins integration
- Azure DevOps integration
- GitHub Actions integration

## Support

### Getting Help

1. **Check Documentation**: Review this README and inline comments
2. **Debug Mode**: Use `--debug` flag for step-by-step execution
3. **Trace Viewer**: Analyze failed tests with trace viewer
4. **Console Logs**: Monitor browser console for errors
5. **Screenshots**: Review failure screenshots

### Contributing

1. **Follow Conventions**: Use existing patterns and naming
2. **Add Tests**: Include tests for new features
3. **Update Documentation**: Keep README and comments current
4. **Test Coverage**: Maintain high test coverage
5. **Performance**: Consider performance impact of new tests

### Resources

- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## Changelog

### Version 1.0.0
- Initial E2E testing framework
- Comprehensive test coverage
- Multi-browser support
- Touch device testing
- Security and error handling tests
- Performance and accessibility testing
- CI/CD integration support

