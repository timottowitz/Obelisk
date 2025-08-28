#!/usr/bin/env node

/**
 * Comprehensive Test Runner Script
 * Orchestrates all testing phases with detailed reporting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class TestRunner {
  constructor() {
    this.results = {
      unit: { status: 'pending', duration: 0, coverage: {} },
      integration: { status: 'pending', duration: 0, coverage: {} },
      e2e: { status: 'pending', duration: 0, browsers: [] },
      performance: { status: 'pending', duration: 0, benchmarks: {} },
      security: { status: 'pending', duration: 0, vulnerabilities: 0 },
      accessibility: { status: 'pending', duration: 0, violations: 0 },
    };
    
    this.startTime = Date.now();
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    this.skipE2E = process.argv.includes('--skip-e2e');
    this.parallel = process.argv.includes('--parallel');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().substr(11, 8);
    const prefix = `[${timestamp}]`;
    
    switch (type) {
      case 'success':
        console.log(chalk.green(`${prefix} ✅ ${message}`));
        break;
      case 'error':
        console.log(chalk.red(`${prefix} ❌ ${message}`));
        break;
      case 'warning':
        console.log(chalk.yellow(`${prefix} ⚠️  ${message}`));
        break;
      case 'info':
        console.log(chalk.blue(`${prefix} ℹ️  ${message}`));
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  async runCommand(command, options = {}) {
    if (this.verbose) {
      this.log(`Running: ${command}`, 'info');
    }

    const startTime = Date.now();
    
    try {
      const result = execSync(command, {
        stdio: this.verbose ? 'inherit' : 'pipe',
        encoding: 'utf8',
        ...options,
      });
      
      const duration = Date.now() - startTime;
      
      if (this.verbose) {
        this.log(`Command completed in ${duration}ms`, 'success');
      }
      
      return { success: true, output: result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.log(`Command failed after ${duration}ms: ${error.message}`, 'error');
      
      return { success: false, output: error.stdout || error.message, duration, error };
    }
  }

  async runUnitTests() {
    this.log('🧪 Running unit tests...');
    const startTime = Date.now();

    try {
      const result = await this.runCommand('npm run test -- --coverage --watchAll=false');
      
      this.results.unit = {
        status: result.success ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        coverage: this.parseCoverage('coverage/lcov-report/index.html'),
      };

      if (result.success) {
        this.log('Unit tests passed', 'success');
      } else {
        this.log('Unit tests failed', 'error');
      }
    } catch (error) {
      this.results.unit = {
        status: 'error',
        duration: Date.now() - startTime,
        error: error.message,
      };
      this.log(`Unit tests error: ${error.message}`, 'error');
    }
  }

  async runIntegrationTests() {
    this.log('🔗 Running integration tests...');
    const startTime = Date.now();

    try {
      // Start test services
      await this.runCommand('docker-compose -f docker-compose.test.yml up -d');
      
      // Wait for services to be ready
      await this.waitForServices();

      const result = await this.runCommand('npm run test src/__tests__/integration -- --coverage');
      
      this.results.integration = {
        status: result.success ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        coverage: this.parseCoverage('coverage/integration/lcov-report/index.html'),
      };

      if (result.success) {
        this.log('Integration tests passed', 'success');
      } else {
        this.log('Integration tests failed', 'error');
      }
    } catch (error) {
      this.results.integration = {
        status: 'error',
        duration: Date.now() - startTime,
        error: error.message,
      };
      this.log(`Integration tests error: ${error.message}`, 'error');
    } finally {
      // Cleanup test services
      await this.runCommand('docker-compose -f docker-compose.test.yml down');
    }
  }

  async runE2ETests() {
    if (this.skipE2E) {
      this.log('⏭️  Skipping E2E tests');
      this.results.e2e.status = 'skipped';
      return;
    }

    this.log('🎭 Running E2E tests...');
    const startTime = Date.now();

    try {
      // Install Playwright browsers if not already installed
      await this.runCommand('npx playwright install');

      const browsers = ['chromium', 'firefox', 'webkit'];
      const browserResults = [];

      for (const browser of browsers) {
        this.log(`Testing on ${browser}...`);
        const result = await this.runCommand(`npm run test:e2e -- --project=${browser}`);
        
        browserResults.push({
          browser,
          status: result.success ? 'passed' : 'failed',
          duration: result.duration,
        });
      }

      this.results.e2e = {
        status: browserResults.every(r => r.status === 'passed') ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        browsers: browserResults,
      };

      if (this.results.e2e.status === 'passed') {
        this.log('E2E tests passed on all browsers', 'success');
      } else {
        this.log('E2E tests failed on some browsers', 'error');
      }
    } catch (error) {
      this.results.e2e = {
        status: 'error',
        duration: Date.now() - startTime,
        error: error.message,
      };
      this.log(`E2E tests error: ${error.message}`, 'error');
    }
  }

  async runPerformanceTests() {
    this.log('🚀 Running performance tests...');
    const startTime = Date.now();

    try {
      const result = await this.runCommand('npm run test src/__tests__/performance -- --testTimeout=60000');
      
      this.results.performance = {
        status: result.success ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        benchmarks: this.parseBenchmarks(result.output),
      };

      if (result.success) {
        this.log('Performance tests passed', 'success');
      } else {
        this.log('Performance tests failed', 'error');
      }
    } catch (error) {
      this.results.performance = {
        status: 'error',
        duration: Date.now() - startTime,
        error: error.message,
      };
      this.log(`Performance tests error: ${error.message}`, 'error');
    }
  }

  async runSecurityTests() {
    this.log('🔒 Running security tests...');
    const startTime = Date.now();

    try {
      // Run custom security tests
      const securityResult = await this.runCommand('npm run test src/__tests__/security');
      
      // Run npm audit
      const auditResult = await this.runCommand('npm audit --json');
      
      const vulnerabilities = this.parseAuditResults(auditResult.output);
      
      this.results.security = {
        status: securityResult.success && vulnerabilities === 0 ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        vulnerabilities,
      };

      if (this.results.security.status === 'passed') {
        this.log('Security tests passed', 'success');
      } else {
        this.log(`Security tests found ${vulnerabilities} vulnerabilities`, 'warning');
      }
    } catch (error) {
      this.results.security = {
        status: 'error',
        duration: Date.now() - startTime,
        error: error.message,
      };
      this.log(`Security tests error: ${error.message}`, 'error');
    }
  }

  async runAccessibilityTests() {
    this.log('♿ Running accessibility tests...');
    const startTime = Date.now();

    try {
      const result = await this.runCommand('npm run test src/__tests__/accessibility');
      
      this.results.accessibility = {
        status: result.success ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        violations: this.parseA11yViolations(result.output),
      };

      if (result.success) {
        this.log('Accessibility tests passed', 'success');
      } else {
        this.log('Accessibility tests found violations', 'error');
      }
    } catch (error) {
      this.results.accessibility = {
        status: 'error',
        duration: Date.now() - startTime,
        error: error.message,
      };
      this.log(`Accessibility tests error: ${error.message}`, 'error');
    }
  }

  async waitForServices() {
    this.log('⏳ Waiting for test services to be ready...');
    
    // Wait for PostgreSQL
    let attempts = 0;
    while (attempts < 30) {
      try {
        await this.runCommand('pg_isready -h localhost -p 5432', { timeout: 1000 });
        break;
      } catch (error) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (attempts >= 30) {
      throw new Error('PostgreSQL service failed to start');
    }

    this.log('Test services are ready', 'success');
  }

  parseCoverage(htmlPath) {
    try {
      if (!fs.existsSync(htmlPath)) return {};
      
      const html = fs.readFileSync(htmlPath, 'utf8');
      
      // Extract coverage percentages from HTML (simplified)
      const lines = html.match(/Lines.*?(\d+\.\d+)%/) || [];
      const functions = html.match(/Functions.*?(\d+\.\d+)%/) || [];
      const branches = html.match(/Branches.*?(\d+\.\d+)%/) || [];
      const statements = html.match(/Statements.*?(\d+\.\d+)%/) || [];
      
      return {
        lines: lines[1] ? parseFloat(lines[1]) : 0,
        functions: functions[1] ? parseFloat(functions[1]) : 0,
        branches: branches[1] ? parseFloat(branches[1]) : 0,
        statements: statements[1] ? parseFloat(statements[1]) : 0,
      };
    } catch (error) {
      return {};
    }
  }

  parseBenchmarks(output) {
    try {
      const benchmarks = {};
      const lines = output.split('\n');
      
      lines.forEach(line => {
        if (line.includes('completed in')) {
          const match = line.match(/(.*) completed in (\d+)ms/);
          if (match) {
            benchmarks[match[1].trim()] = parseInt(match[2]);
          }
        }
      });
      
      return benchmarks;
    } catch (error) {
      return {};
    }
  }

  parseAuditResults(output) {
    try {
      const audit = JSON.parse(output);
      return audit.metadata ? audit.metadata.vulnerabilities.total : 0;
    } catch (error) {
      return 0;
    }
  }

  parseA11yViolations(output) {
    try {
      const violations = output.match(/(\d+) violations/);
      return violations ? parseInt(violations[1]) : 0;
    } catch (error) {
      return 0;
    }
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log(chalk.bold.cyan('📊 COMPREHENSIVE TEST REPORT'));
    console.log('='.repeat(60));
    
    console.log(`\n⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s\n`);
    
    // Test Results Summary
    const testTypes = Object.keys(this.results);
    const passed = testTypes.filter(type => this.results[type].status === 'passed').length;
    const failed = testTypes.filter(type => this.results[type].status === 'failed').length;
    const errors = testTypes.filter(type => this.results[type].status === 'error').length;
    const skipped = testTypes.filter(type => this.results[type].status === 'skipped').length;
    
    console.log('📈 SUMMARY:');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   🚫 Errors: ${errors}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    
    console.log('\n📋 DETAILED RESULTS:\n');
    
    // Detailed results for each test type
    Object.entries(this.results).forEach(([type, result]) => {
      const icon = this.getStatusIcon(result.status);
      const duration = `${Math.round(result.duration / 1000)}s`;
      
      console.log(`${icon} ${type.toUpperCase().padEnd(12)} ${result.status.padEnd(8)} (${duration})`);
      
      if (result.coverage && Object.keys(result.coverage).length > 0) {
        const { lines, functions, branches, statements } = result.coverage;
        console.log(`     Coverage: Lines ${lines}% | Functions ${functions}% | Branches ${branches}% | Statements ${statements}%`);
      }
      
      if (result.browsers && result.browsers.length > 0) {
        result.browsers.forEach(browser => {
          const browserIcon = this.getStatusIcon(browser.status);
          console.log(`     ${browserIcon} ${browser.browser}: ${browser.status}`);
        });
      }
      
      if (result.vulnerabilities > 0) {
        console.log(`     🚨 ${result.vulnerabilities} security vulnerabilities found`);
      }
      
      if (result.violations > 0) {
        console.log(`     ♿ ${result.violations} accessibility violations found`);
      }
      
      if (result.benchmarks && Object.keys(result.benchmarks).length > 0) {
        console.log('     Performance benchmarks:');
        Object.entries(result.benchmarks).forEach(([name, time]) => {
          console.log(`       • ${name}: ${time}ms`);
        });
      }
      
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
      
      console.log('');
    });
    
    // Overall result
    const overallSuccess = failed === 0 && errors === 0;
    const overallStatus = overallSuccess ? 'PASSED' : 'FAILED';
    const overallColor = overallSuccess ? chalk.green : chalk.red;
    
    console.log('='.repeat(60));
    console.log(overallColor.bold(`🎯 OVERALL RESULT: ${overallStatus}`));
    console.log('='.repeat(60));
    
    return overallSuccess;
  }

  getStatusIcon(status) {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'error': return '🚫';
      case 'skipped': return '⏭️';
      case 'pending': return '⏳';
      default: return '❓';
    }
  }

  async saveReport() {
    const reportPath = path.join(process.cwd(), 'test-reports');
    
    if (!fs.existsSync(reportPath)) {
      fs.mkdirSync(reportPath, { recursive: true });
    }
    
    // Save JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      results: this.results,
      environment: {
        node: process.version,
        platform: process.platform,
        ci: !!process.env.CI,
      },
    };
    
    fs.writeFileSync(
      path.join(reportPath, 'test-results.json'),
      JSON.stringify(jsonReport, null, 2)
    );
    
    // Save markdown report
    const mdReport = this.generateMarkdownReport(jsonReport);
    fs.writeFileSync(
      path.join(reportPath, 'test-results.md'),
      mdReport
    );
    
    this.log(`Reports saved to ${reportPath}`, 'info');
  }

  generateMarkdownReport(data) {
    const { results, duration, timestamp } = data;
    
    let md = `# Test Results Report\n\n`;
    md += `**Generated:** ${timestamp}\n`;
    md += `**Duration:** ${Math.round(duration / 1000)}s\n\n`;
    
    md += `## Summary\n\n`;
    const testTypes = Object.keys(results);
    const passed = testTypes.filter(type => results[type].status === 'passed').length;
    const failed = testTypes.filter(type => results[type].status === 'failed').length;
    
    md += `- ✅ **Passed:** ${passed}\n`;
    md += `- ❌ **Failed:** ${failed}\n`;
    md += `- **Success Rate:** ${Math.round((passed / testTypes.length) * 100)}%\n\n`;
    
    md += `## Detailed Results\n\n`;
    
    Object.entries(results).forEach(([type, result]) => {
      md += `### ${type.charAt(0).toUpperCase() + type.slice(1)} Tests\n\n`;
      md += `- **Status:** ${result.status}\n`;
      md += `- **Duration:** ${Math.round(result.duration / 1000)}s\n`;
      
      if (result.coverage && Object.keys(result.coverage).length > 0) {
        md += `- **Coverage:**\n`;
        Object.entries(result.coverage).forEach(([metric, value]) => {
          md += `  - ${metric}: ${value}%\n`;
        });
      }
      
      md += '\n';
    });
    
    return md;
  }

  async run() {
    this.log('🚀 Starting comprehensive test suite...');
    
    try {
      if (this.parallel) {
        // Run tests in parallel (where possible)
        await Promise.all([
          this.runUnitTests(),
          this.runSecurityTests(),
          this.runAccessibilityTests(),
        ]);
        
        // These need to run sequentially due to resource requirements
        await this.runIntegrationTests();
        await this.runPerformanceTests();
        await this.runE2ETests();
      } else {
        // Run tests sequentially
        await this.runUnitTests();
        await this.runIntegrationTests();
        await this.runPerformanceTests();
        await this.runSecurityTests();
        await this.runAccessibilityTests();
        await this.runE2ETests();
      }
      
      const success = this.generateReport();
      await this.saveReport();
      
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run the test suite
if (require.main === module) {
  const runner = new TestRunner();
  runner.run();
}

module.exports = TestRunner;