import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');
  
  // Create browser instance for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for the dev server to be ready
    console.log('⏳ Waiting for development server...');
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
    
    // Poll the server until it's ready (max 2 minutes)
    let attempts = 0;
    const maxAttempts = 40;
    
    while (attempts < maxAttempts) {
      try {
        const response = await page.goto(baseURL, { waitUntil: 'networkidle' });
        if (response?.ok()) {
          console.log('✅ Development server is ready');
          break;
        }
      } catch (error) {
        console.log(`⏳ Server not ready (attempt ${attempts + 1}/${maxAttempts})`);
      }
      
      await page.waitForTimeout(3000);
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Development server failed to start within timeout period');
    }
    
    // Setup test data
    await setupTestData(page, baseURL);
    
    // Setup authentication state for tests
    await setupAuthenticationState(page, baseURL);
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function setupTestData(page: any, baseURL: string) {
  console.log('📊 Setting up test data...');
  
  try {
    // Create test organization
    await page.evaluate(async () => {
      const response = await fetch('/api/test/setup-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_test_organization',
          data: {
            name: 'E2E Test Organization',
            domain: 'e2etest.com',
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create test organization: ${response.statusText}`);
      }
    });
    
    // Create test cases
    await page.evaluate(async () => {
      const response = await fetch('/api/test/setup-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_test_cases',
          data: {
            count: 10,
            organizationId: 'e2e-test-org',
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create test cases: ${response.statusText}`);
      }
    });
    
    // Create test emails
    await page.evaluate(async () => {
      const response = await fetch('/api/test/setup-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_test_emails',
          data: {
            count: 25,
            organizationId: 'e2e-test-org',
            withAttachments: 5, // 5 emails with attachments
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create test emails: ${response.statusText}`);
      }
    });
    
    console.log('✅ Test data setup completed');
    
  } catch (error) {
    console.error('❌ Test data setup failed:', error);
    throw error;
  }
}

async function setupAuthenticationState(page: any, baseURL: string) {
  console.log('🔐 Setting up authentication state...');
  
  try {
    // Navigate to sign-in page
    await page.goto(`${baseURL}/auth/sign-in`);
    
    // Fill in test credentials
    await page.fill('[data-testid="email-input"]', 'e2e-test@example.com');
    await page.fill('[data-testid="password-input"]', 'e2e-test-password');
    
    // Click sign in button
    await page.click('[data-testid="sign-in-button"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    
    // Save authentication state
    await page.context().storageState({ path: 'e2e/config/auth-state.json' });
    
    console.log('✅ Authentication state saved');
    
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    console.log('💡 Make sure test user exists or create one manually');
    
    // For CI/CD, we might want to create the user automatically
    if (process.env.CI) {
      await createTestUser(page, baseURL);
      await setupAuthenticationState(page, baseURL);
    } else {
      throw error;
    }
  }
}

async function createTestUser(page: any, baseURL: string) {
  console.log('👤 Creating test user...');
  
  try {
    await page.goto(`${baseURL}/auth/sign-up`);
    
    await page.fill('[data-testid="email-input"]', 'e2e-test@example.com');
    await page.fill('[data-testid="password-input"]', 'e2e-test-password');
    await page.fill('[data-testid="confirm-password-input"]', 'e2e-test-password');
    await page.fill('[data-testid="first-name-input"]', 'E2E');
    await page.fill('[data-testid="last-name-input"]', 'Test User');
    
    await page.click('[data-testid="sign-up-button"]');
    
    // Wait for email verification or redirect
    await page.waitForTimeout(2000);
    
    console.log('✅ Test user created');
    
  } catch (error) {
    console.error('❌ Test user creation failed:', error);
    throw error;
  }
}

export default globalSetup;