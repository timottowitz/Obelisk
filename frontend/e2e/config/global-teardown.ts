import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...');
  
  try {
    // Clean up test data
    await cleanupTestData();
    
    // Clean up authentication state
    await cleanupAuthState();
    
    // Generate test report summary
    await generateTestSummary();
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error - teardown failures shouldn't fail the build
  }
}

async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');
  
  try {
    // Use fetch to call cleanup endpoint
    const response = await fetch('http://localhost:3000/api/test/cleanup-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'cleanup_all',
        testPrefix: 'e2e-test',
      }),
    });
    
    if (response.ok) {
      console.log('✅ Test data cleaned up');
    } else {
      console.warn('⚠️ Test data cleanup failed, but continuing...');
    }
    
  } catch (error) {
    console.warn('⚠️ Could not connect to cleanup endpoint:', error.message);
  }
}

async function cleanupAuthState() {
  console.log('🔐 Cleaning up authentication state...');
  
  const authStatePath = 'e2e/config/auth-state.json';
  
  try {
    if (fs.existsSync(authStatePath)) {
      fs.unlinkSync(authStatePath);
      console.log('✅ Authentication state file removed');
    }
  } catch (error) {
    console.warn('⚠️ Could not remove auth state file:', error.message);
  }
}

async function generateTestSummary() {
  console.log('📊 Generating test summary...');
  
  try {
    const resultsPath = 'e2e/test-results/results.json';
    const summaryPath = 'e2e/test-results/summary.md';
    
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      
      const summary = generateMarkdownSummary(results);
      
      // Ensure directory exists
      const summaryDir = path.dirname(summaryPath);
      if (!fs.existsSync(summaryDir)) {
        fs.mkdirSync(summaryDir, { recursive: true });
      }
      
      fs.writeFileSync(summaryPath, summary);
      console.log('✅ Test summary generated');
    }
  } catch (error) {
    console.warn('⚠️ Could not generate test summary:', error.message);
  }
}

function generateMarkdownSummary(results: any) {
  const { stats, suites } = results;
  
  let summary = `# E2E Test Results\n\n`;
  summary += `**Test Run Date:** ${new Date().toISOString()}\n\n`;
  
  // Overall stats
  summary += `## Overall Results\n\n`;
  summary += `- **Total Tests:** ${stats.total}\n`;
  summary += `- **Passed:** ${stats.passed} ✅\n`;
  summary += `- **Failed:** ${stats.failed} ❌\n`;
  summary += `- **Skipped:** ${stats.skipped} ⏭️\n`;
  summary += `- **Duration:** ${Math.round(stats.duration / 1000)}s\n\n`;
  
  // Success rate
  const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
  summary += `**Success Rate:** ${successRate}%\n\n`;
  
  // Failed tests details
  if (stats.failed > 0) {
    summary += `## Failed Tests\n\n`;
    
    suites.forEach((suite: any) => {
      suite.specs.forEach((spec: any) => {
        spec.tests.forEach((test: any) => {
          if (test.results.some((result: any) => result.status === 'failed')) {
            summary += `### ${spec.title}\n`;
            summary += `**Test:** ${test.title}\n`;
            
            test.results.forEach((result: any) => {
              if (result.status === 'failed') {
                summary += `**Error:** ${result.error?.message || 'Unknown error'}\n`;
                summary += `**Duration:** ${Math.round(result.duration / 1000)}s\n\n`;
              }
            });
          }
        });
      });
    });
  }
  
  // Performance metrics
  summary += `## Performance Metrics\n\n`;
  
  const testDurations = [];
  suites.forEach((suite: any) => {
    suite.specs.forEach((spec: any) => {
      spec.tests.forEach((test: any) => {
        test.results.forEach((result: any) => {
          if (result.status === 'passed') {
            testDurations.push(result.duration);
          }
        });
      });
    });
  });
  
  if (testDurations.length > 0) {
    const avgDuration = testDurations.reduce((sum, duration) => sum + duration, 0) / testDurations.length;
    const maxDuration = Math.max(...testDurations);
    const minDuration = Math.min(...testDurations);
    
    summary += `- **Average Test Duration:** ${Math.round(avgDuration / 1000)}s\n`;
    summary += `- **Fastest Test:** ${Math.round(minDuration / 1000)}s\n`;
    summary += `- **Slowest Test:** ${Math.round(maxDuration / 1000)}s\n\n`;
  }
  
  // Browser compatibility
  summary += `## Browser Compatibility\n\n`;
  const browsers = new Set();
  suites.forEach((suite: any) => {
    if (suite.project) {
      browsers.add(suite.project);
    }
  });
  
  browsers.forEach(browser => {
    const browserTests = suites.filter((suite: any) => suite.project === browser);
    const browserStats = browserTests.reduce((acc: any, suite: any) => {
      suite.specs.forEach((spec: any) => {
        spec.tests.forEach((test: any) => {
          test.results.forEach((result: any) => {
            acc.total++;
            if (result.status === 'passed') acc.passed++;
            if (result.status === 'failed') acc.failed++;
          });
        });
      });
      return acc;
    }, { total: 0, passed: 0, failed: 0 });
    
    const browserSuccessRate = ((browserStats.passed / browserStats.total) * 100).toFixed(1);
    summary += `- **${browser}:** ${browserStats.passed}/${browserStats.total} (${browserSuccessRate}%)\n`;
  });
  
  summary += `\n---\n\n`;
  summary += `*Generated by Playwright E2E Test Suite*\n`;
  
  return summary;
}

export default globalTeardown;