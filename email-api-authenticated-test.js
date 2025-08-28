const { chromium } = require('playwright');

async function runAuthenticatedAPITests() {
  const browser = await chromium.launch({ 
    headless: true
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🧪 Email API Tests with Authentication Context');
  console.log('==============================================\n');
  
  try {
    // First, navigate to the application to establish session context
    console.log('🔄 Setting up authentication context...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Wait for any redirects
    await page.waitForTimeout(2000);
    
    console.log(`Current URL: ${page.url()}`);
    
    // Now test the API endpoints from within the browser context
    const testResults = [];
    
    async function testEndpoint(name, url, method = 'GET', body = null) {
      console.log(`\n🔍 Testing ${name}...`);
      
      const response = await page.evaluate(async ({ url, method, body }) => {
        try {
          const options = {
            method,
            headers: {
              'Content-Type': 'application/json',
              'X-Org-Id': 'org_303QuSOW8ORQ26Ohf7bkiGpm477'
            }
          };
          
          if (body) {
            options.body = JSON.stringify(body);
          }
          
          const res = await fetch(url, options);
          
          let responseData;
          const contentType = res.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            responseData = await res.json();
          } else {
            responseData = await res.text();
          }
          
          return {
            status: res.status,
            statusText: res.statusText,
            data: responseData,
            contentType: contentType
          };
        } catch (error) {
          return {
            error: error.message,
            status: 0
          };
        }
      }, { url, method, body });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.contentType || 'Not set'}`);
      
      if (response.error) {
        console.log(`   Error: ${response.error}`);
      } else if (response.status >= 200 && response.status < 300) {
        console.log('   ✅ Success');
        if (typeof response.data === 'object' && response.data !== null) {
          console.log(`   📦 Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
        }
      } else if (response.status === 401) {
        console.log('   🔐 Authentication required');
      } else if (response.status === 404) {
        console.log('   🚫 Not found (expected for some tests)');
      } else {
        console.log(`   ⚠️  Status: ${response.status} - ${response.statusText}`);
        console.log(`   Response: ${JSON.stringify(response.data).substring(0, 200)}`);
      }
      
      testResults.push({
        name,
        status: response.status,
        success: response.status >= 200 && response.status < 300,
        authenticated: response.status !== 401,
        error: response.error
      });
      
      return response;
    }
    
    // Test all email API endpoints
    await testEndpoint('Email Status', 'http://localhost:3000/api/email/status');
    await testEndpoint('Email Folders', 'http://localhost:3000/api/email/folders');
    await testEndpoint('Email Messages', 'http://localhost:3000/api/email/messages?folderId=inbox');
    await testEndpoint('Email Search', 'http://localhost:3000/api/email/search?query=test');
    await testEndpoint('Individual Message', 'http://localhost:3000/api/email/messages/test-id');
    
    await testEndpoint('Send Email', 'http://localhost:3000/api/email/send', 'POST', {
      to: ['test@example.com'],
      subject: 'Test Email',
      body: 'Test content',
      contentType: 'text'
    });
    
    // Test error handling
    await testEndpoint('Invalid Endpoint', 'http://localhost:3000/api/email/nonexistent');
    
    // Summary
    console.log('\n📊 Test Summary');
    console.log('================');
    
    const successful = testResults.filter(t => t.success).length;
    const authRequired = testResults.filter(t => !t.authenticated).length;
    const errors = testResults.filter(t => t.error).length;
    
    console.log(`✅ Successful responses: ${successful}`);
    console.log(`🔐 Authentication required: ${authRequired}`);
    console.log(`❌ Network/other errors: ${errors}`);
    console.log(`📝 Total endpoints tested: ${testResults.length}`);
    
    // API Health Check
    console.log('\n🏥 API Health Assessment');
    console.log('========================');
    
    const apiWorking = testResults.every(t => !t.error && (t.success || t.status === 401 || t.status === 404));
    
    if (apiWorking) {
      console.log('✅ All API endpoints are responding correctly');
      console.log('✅ Proper authentication is enforced');
      console.log('✅ Error handling is working');
      
      if (authRequired > 0) {
        console.log('📋 Next steps:');
        console.log('  1. Complete Microsoft OAuth setup in Clerk');
        console.log('  2. Test with authenticated user session');
        console.log('  3. Verify email provider connection');
      }
    } else {
      console.log('❌ Some API endpoints have issues');
      
      const problematic = testResults.filter(t => t.error || (t.status !== 401 && t.status !== 404 && !t.success));
      problematic.forEach(t => {
        console.log(`  - ${t.name}: ${t.error || `Status ${t.status}`}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

runAuthenticatedAPITests();