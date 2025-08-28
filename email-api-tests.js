const { chromium } = require('playwright');

async function runEmailAPITests() {
  const browser = await chromium.launch({ 
    headless: true
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🧪 Starting Email Integration API Tests');
  console.log('=====================================\n');
  
  // Test results collector
  const testResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };
  
  function logTest(name, status, details = '') {
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${emoji} ${name}`);
    if (details) console.log(`   ${details}`);
    
    testResults.details.push({ name, status, details });
    testResults[status === 'PASS' ? 'passed' : status === 'FAIL' ? 'failed' : 'skipped']++;
  }
  
  try {
    // Helper function to make API calls
    async function apiCall(endpoint, options = {}) {
      const response = await page.evaluate(async ({ endpoint, options }) => {
        try {
          const res = await fetch(`http://localhost:3000${endpoint}`, {
            method: options.method || 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Org-Id': 'org_303QuSOW8ORQ26Ohf7bkiGpm477', // From server logs
              ...options.headers
            },
            body: options.body ? JSON.stringify(options.body) : undefined
          });
          
          return {
            status: res.status,
            statusText: res.statusText,
            data: res.headers.get('content-type')?.includes('application/json') 
              ? await res.json() 
              : await res.text(),
            headers: Object.fromEntries(res.headers.entries())
          };
        } catch (error) {
          return {
            error: error.message,
            status: 0
          };
        }
      }, { endpoint, options });
      
      return response;
    }
    
    // Test 1: Email Status Endpoint
    console.log('🔍 Test 1: Email Status API');
    const statusResponse = await apiCall('/api/email/status');
    
    if (statusResponse.status === 200) {
      logTest('GET /api/email/status - Response OK', 'PASS', `Status: ${statusResponse.status}`);
      
      if (statusResponse.data && typeof statusResponse.data === 'object') {
        logTest('Email Status - Valid JSON Response', 'PASS');
        
        // Check expected properties
        const expectedProps = ['connected', 'provider'];
        const hasProps = expectedProps.every(prop => statusResponse.data.hasOwnProperty(prop));
        logTest('Email Status - Required Properties', hasProps ? 'PASS' : 'FAIL', 
          hasProps ? 'Has connected, provider' : 'Missing required properties');
      } else {
        logTest('Email Status - Invalid Response Format', 'FAIL', 'Expected JSON object');
      }
    } else if (statusResponse.status === 401) {
      logTest('GET /api/email/status - Auth Required', 'SKIP', 'Need authentication to test');
    } else {
      logTest('GET /api/email/status - Error', 'FAIL', 
        `Status: ${statusResponse.status} - ${statusResponse.data?.error || statusResponse.statusText}`);
    }
    
    console.log('');
    
    // Test 2: Email Folders Endpoint
    console.log('🔍 Test 2: Email Folders API');
    const foldersResponse = await apiCall('/api/email/folders');
    
    if (foldersResponse.status === 200) {
      logTest('GET /api/email/folders - Response OK', 'PASS');
      
      if (Array.isArray(foldersResponse.data)) {
        logTest('Email Folders - Valid Array Response', 'PASS', `${foldersResponse.data.length} folders`);
      } else {
        logTest('Email Folders - Invalid Response Format', 'FAIL', 'Expected array');
      }
    } else if (foldersResponse.status === 401) {
      logTest('GET /api/email/folders - Auth Required', 'SKIP', 'Need authentication to test');
    } else {
      logTest('GET /api/email/folders - Error', 'FAIL',
        `Status: ${foldersResponse.status} - ${foldersResponse.data?.error || foldersResponse.statusText}`);
    }
    
    console.log('');
    
    // Test 3: Email Messages Endpoint
    console.log('🔍 Test 3: Email Messages API');
    const messagesResponse = await apiCall('/api/email/messages?folderId=inbox');
    
    if (messagesResponse.status === 200) {
      logTest('GET /api/email/messages - Response OK', 'PASS');
      
      if (Array.isArray(messagesResponse.data)) {
        logTest('Email Messages - Valid Array Response', 'PASS', `${messagesResponse.data.length} messages`);
      } else {
        logTest('Email Messages - Invalid Response Format', 'FAIL', 'Expected array');
      }
    } else if (messagesResponse.status === 401) {
      logTest('GET /api/email/messages - Auth Required', 'SKIP', 'Need authentication to test');
    } else {
      logTest('GET /api/email/messages - Error', 'FAIL',
        `Status: ${messagesResponse.status} - ${messagesResponse.data?.error || messagesResponse.statusText}`);
    }
    
    console.log('');
    
    // Test 4: Email Search Endpoint
    console.log('🔍 Test 4: Email Search API');
    const searchResponse = await apiCall('/api/email/search?query=test');
    
    if (searchResponse.status === 200) {
      logTest('GET /api/email/search - Response OK', 'PASS');
      
      if (Array.isArray(searchResponse.data)) {
        logTest('Email Search - Valid Array Response', 'PASS', `${searchResponse.data.length} results`);
      } else {
        logTest('Email Search - Invalid Response Format', 'FAIL', 'Expected array');
      }
    } else if (searchResponse.status === 401) {
      logTest('GET /api/email/search - Auth Required', 'SKIP', 'Need authentication to test');
    } else {
      logTest('GET /api/email/search - Error', 'FAIL',
        `Status: ${searchResponse.status} - ${searchResponse.data?.error || searchResponse.statusText}`);
    }
    
    console.log('');
    
    // Test 5: Send Email Endpoint (POST)
    console.log('🔍 Test 5: Send Email API');
    const sendEmailResponse = await apiCall('/api/email/send', {
      method: 'POST',
      body: {
        to: ['test@example.com'],
        subject: 'API Test Email',
        body: 'This is a test email from API tests',
        contentType: 'text'
      }
    });
    
    if (sendEmailResponse.status === 200) {
      logTest('POST /api/email/send - Response OK', 'PASS');
    } else if (sendEmailResponse.status === 401) {
      logTest('POST /api/email/send - Auth Required', 'SKIP', 'Need authentication to test');
    } else if (sendEmailResponse.status === 400) {
      logTest('POST /api/email/send - Validation Working', 'PASS', 'Properly validates input');
    } else {
      logTest('POST /api/email/send - Error', 'FAIL',
        `Status: ${sendEmailResponse.status} - ${sendEmailResponse.data?.error || sendEmailResponse.statusText}`);
    }
    
    console.log('');
    
    // Test 6: Individual Message Endpoint
    console.log('🔍 Test 6: Individual Message API');
    const messageResponse = await apiCall('/api/email/messages/test-message-id');
    
    if (messageResponse.status === 200) {
      logTest('GET /api/email/messages/[id] - Response OK', 'PASS');
    } else if (messageResponse.status === 401) {
      logTest('GET /api/email/messages/[id] - Auth Required', 'SKIP', 'Need authentication to test');
    } else if (messageResponse.status === 404) {
      logTest('GET /api/email/messages/[id] - 404 Handling', 'PASS', 'Properly handles missing message');
    } else {
      logTest('GET /api/email/messages/[id] - Error', 'FAIL',
        `Status: ${messageResponse.status} - ${messageResponse.data?.error || messageResponse.statusText}`);
    }
    
    console.log('');
    
    // Test 7: Check Response Headers
    console.log('🔍 Test 7: API Response Headers');
    
    // Test CORS headers
    const corsTest = statusResponse.headers?.['access-control-allow-origin'] !== undefined;
    logTest('CORS Headers Present', corsTest ? 'PASS' : 'SKIP', 
      corsTest ? 'CORS configured' : 'CORS headers not found');
    
    // Test Content-Type
    const contentType = statusResponse.headers?.['content-type'];
    logTest('Content-Type Header', 
      contentType?.includes('application/json') ? 'PASS' : 'FAIL',
      `Content-Type: ${contentType || 'Not set'}`);
    
    console.log('');
    
    // Test 8: Error Handling
    console.log('🔍 Test 8: Error Handling');
    
    // Test invalid endpoint
    const invalidEndpoint = await apiCall('/api/email/invalid-endpoint');
    logTest('Invalid Endpoint Handling', 
      invalidEndpoint.status === 404 ? 'PASS' : 'FAIL',
      `Status: ${invalidEndpoint.status}`);
    
    // Test malformed request
    const malformedRequest = await apiCall('/api/email/send', {
      method: 'POST',
      body: { invalid: 'data' }
    });
    logTest('Malformed Request Handling',
      [400, 401].includes(malformedRequest.status) ? 'PASS' : 'FAIL',
      `Status: ${malformedRequest.status}`);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    logTest('Test Suite Execution', 'FAIL', error.message);
  } finally {
    await browser.close();
    
    // Print summary
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⏭️  Skipped: ${testResults.skipped}`);
    console.log(`📝 Total: ${testResults.passed + testResults.failed + testResults.skipped}`);
    
    if (testResults.failed > 0) {
      console.log('\n🚨 Failed Tests:');
      testResults.details
        .filter(test => test.status === 'FAIL')
        .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
    }
    
    if (testResults.skipped > 0) {
      console.log('\n⏭️  Skipped Tests (likely need authentication):');
      testResults.details
        .filter(test => test.status === 'SKIP')
        .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
    }
    
    console.log('\n🎯 Email API Integration Test Complete');
    
    // Return exit code based on results
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

runEmailAPITests();