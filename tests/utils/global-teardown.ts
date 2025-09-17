import { FullConfig } from '@playwright/test';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown for UR10 Robot Kiosk E2E tests
 * 
 * This teardown:
 * - Cleans up test data
 * - Resets robot to safe state
 * - Generates test reports
 * - Performs cleanup operations
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting UR10 Robot Kiosk E2E test teardown...');
  
  const robotServerURL = process.env.ROBOT_SERVER_URL || 'https://localhost:8000';
  
  // Reset robot to safe state
  await resetRobotState(robotServerURL);
  
  // Clean up test data
  await cleanupTestData();
  
  // Generate test summary
  await generateTestSummary();
  
  // Archive test artifacts
  await archiveTestArtifacts();
  
  console.log('✅ UR10 Robot Kiosk E2E test teardown completed');
}

/**
 * Reset robot to safe state
 */
async function resetRobotState(robotURL: string) {
  console.log('🤖 Resetting robot to safe state...');
  
  try {
    // Stop any ongoing operations
    await axios.post(`${robotURL}/api/v1/robot/stop`, {}, {
      timeout: 5000,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false,
      }),
    });
    
    // Move to home position
    await axios.post(`${robotURL}/api/v1/robot/home`, {}, {
      timeout: 30000,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false,
      }),
    });
    
    // Clear any active chess games
    await axios.delete(`${robotURL}/api/v1/chess/game`, {
      timeout: 5000,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false,
      }),
    });
    
    console.log('✅ Robot reset to safe state');
  } catch (error) {
    console.warn('⚠️ Failed to reset robot state:', error);
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');
  
  const fixturesDir = path.join(__dirname, '../fixtures');
  
  // Remove temporary test files
  const tempFiles = [
    'auth-state.json',
    'temp-chess-game.json',
    'temp-robot-state.json',
  ];
  
  for (const file of tempFiles) {
    const filePath = path.join(fixturesDir, file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Removed ${file}`);
      } catch (error) {
        console.warn(`⚠️ Failed to remove ${file}:`, error);
      }
    }
  }
  
  console.log('✅ Test data cleanup completed');
}

/**
 * Generate test summary
 */
async function generateTestSummary() {
  console.log('📊 Generating test summary...');
  
  const reportsDir = path.join(__dirname, '../reports');
  const resultsFile = path.join(reportsDir, 'test-results.json');
  
  if (!fs.existsSync(resultsFile)) {
    console.log('ℹ️ No test results file found, skipping summary generation');
    return;
  }
  
  try {
    const resultsData = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    
    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: resultsData.stats?.total || 0,
      passed: resultsData.stats?.passed || 0,
      failed: resultsData.stats?.failed || 0,
      skipped: resultsData.stats?.skipped || 0,
      duration: resultsData.stats?.duration || 0,
      projects: resultsData.config?.projects?.map((p: any) => p.name) || [],
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
    
    fs.writeFileSync(
      path.join(reportsDir, 'test-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    // Generate human-readable summary
    const readableSummary = `
UR10 Robot Kiosk E2E Test Summary
================================

Test Execution: ${summary.timestamp}
Total Tests: ${summary.totalTests}
Passed: ${summary.passed}
Failed: ${summary.failed}
Skipped: ${summary.skipped}
Duration: ${Math.round(summary.duration / 1000)}s

Projects Tested:
${summary.projects.map(p => `  - ${p}`).join('\n')}

Environment:
  Node.js: ${summary.environment.nodeVersion}
  Platform: ${summary.environment.platform}
  Architecture: ${summary.environment.arch}

Reports:
  - HTML Report: reports/html-report/index.html
  - JSON Results: reports/test-results.json
  - JUnit Results: reports/junit-results.xml
`;
    
    fs.writeFileSync(
      path.join(reportsDir, 'test-summary.txt'),
      readableSummary
    );
    
    console.log('✅ Test summary generated');
    console.log(`📊 Results: ${summary.passed}/${summary.totalTests} tests passed`);
  } catch (error) {
    console.warn('⚠️ Failed to generate test summary:', error);
  }
}

/**
 * Archive test artifacts
 */
async function archiveTestArtifacts() {
  console.log('📦 Archiving test artifacts...');
  
  const reportsDir = path.join(__dirname, '../reports');
  const archiveDir = path.join(reportsDir, 'archives');
  
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveName = `test-run-${timestamp}`;
  const archivePath = path.join(archiveDir, archiveName);
  
  if (!fs.existsSync(archivePath)) {
    fs.mkdirSync(archivePath, { recursive: true });
  }
  
  // Copy important files to archive
  const filesToArchive = [
    'test-results.json',
    'test-summary.json',
    'test-summary.txt',
    'junit-results.xml',
  ];
  
  for (const file of filesToArchive) {
    const sourcePath = path.join(reportsDir, file);
    const destPath = path.join(archivePath, file);
    
    if (fs.existsSync(sourcePath)) {
      try {
        fs.copyFileSync(sourcePath, destPath);
      } catch (error) {
        console.warn(`⚠️ Failed to archive ${file}:`, error);
      }
    }
  }
  
  // Copy HTML report directory
  const htmlReportSource = path.join(reportsDir, 'html-report');
  const htmlReportDest = path.join(archivePath, 'html-report');
  
  if (fs.existsSync(htmlReportSource)) {
    try {
      copyDirectory(htmlReportSource, htmlReportDest);
    } catch (error) {
      console.warn('⚠️ Failed to archive HTML report:', error);
    }
  }
  
  console.log(`✅ Test artifacts archived to: ${archivePath}`);
}

/**
 * Recursively copy directory
 */
function copyDirectory(source: string, destination: string) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }
  
  const items = fs.readdirSync(source);
  
  for (const item of items) {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    
    const stat = fs.statSync(sourcePath);
    
    if (stat.isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

export default globalTeardown;

