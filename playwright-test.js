const { chromium } = require('playwright');

async function testConnectOutlookButton() {
  const browser = await chromium.launch({ 
    headless: true  // Run in headless mode to prevent hanging
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  try {
    console.log('🔄 Navigating to email page directly...');
    await page.goto('http://localhost:3000/dashboard/email', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    // Wait a bit for the page to load
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Take screenshot first to see what's on the page
    await page.screenshot({ path: '/Users/m3max361tb/Obelisk/page-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved to page-screenshot.png');
    
    console.log('🔄 Looking for Connect Outlook button...');
    
    // Get page content
    const pageText = await page.textContent('body');
    console.log('Page content preview (first 500 chars):', pageText.substring(0, 500));
    
    // List all buttons
    const allButtons = await page.locator('button').all();
    console.log(`\n📋 All buttons on page (${allButtons.length}):`);
    for (let i = 0; i < allButtons.length; i++) {
      try {
        const text = await allButtons[i].textContent({ timeout: 1000 });
        const visible = await allButtons[i].isVisible();
        console.log(`  ${i + 1}. "${text}" (visible: ${visible})`);
      } catch (e) {
        console.log(`  ${i + 1}. [Error getting text] (${e.message})`);
      }
    }
    
    // Try different selectors for the Connect Outlook button
    const buttonSelectors = [
      'button:has-text("Connect Outlook")',
      'button:has-text("Connect Outlook (Microsoft 365)")',
      'button:has-text("Connecting")',
      '[data-testid="connect-microsoft-button"]',
      'button[class*="gap-2"]'
    ];
    
    let connectButton = null;
    for (const selector of buttonSelectors) {
      try {
        console.log(`Trying selector: ${selector}`);
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          connectButton = element;
          console.log('✅ Found Connect Outlook button with selector:', selector);
          break;
        }
      } catch (e) {
        console.log(`❌ Selector ${selector} failed: ${e.message}`);
      }
    }
    
    if (!connectButton) {
      console.log('❌ Connect Outlook button not found');
      console.log('🔍 Searching for any button containing "Outlook" or "Microsoft"...');
      
      // Try to find any button with outlook or microsoft text
      const outlookButtons = await page.locator('button').filter({ hasText: /outlook|microsoft/i }).all();
      console.log(`Found ${outlookButtons.length} buttons with Outlook/Microsoft text`);
      
      for (let i = 0; i < outlookButtons.length; i++) {
        const text = await outlookButtons[i].textContent();
        console.log(`  - "${text}"`);
      }
      
      return;
    }
    
    // Check if button is visible and enabled
    const isVisible = await connectButton.isVisible();
    const isEnabled = await connectButton.isEnabled();
    const buttonText = await connectButton.textContent();
    
    console.log(`Button found: "${buttonText}"`);
    console.log(`Button visible: ${isVisible}, enabled: ${isEnabled}`);
    
    if (!isVisible) {
      console.log('❌ Button is not visible');
      return;
    }
    
    if (!isEnabled) {
      console.log('❌ Button is disabled');
      return;
    }
    
    // Set up network monitoring
    const networkResponses = [];
    page.on('response', response => {
      networkResponses.push({
        status: response.status(),
        url: response.url()
      });
    });
    
    console.log('🔄 Clicking Connect Outlook button...');
    
    // Click the button
    await connectButton.click();
    
    console.log('✅ Button clicked, waiting for response...');
    
    // Wait for any changes
    await page.waitForTimeout(3000);
    
    // Check for toast messages
    try {
      const toastElements = await page.locator('[data-sonner-toast]').all();
      console.log(`Found ${toastElements.length} toast messages`);
      
      for (const toast of toastElements) {
        const toastText = await toast.textContent();
        console.log(`🍞 Toast: "${toastText}"`);
      }
    } catch (e) {
      console.log('No toast messages found');
    }
    
    // Check network activity
    console.log('\n🌐 Network activity after click:');
    const relevantNetworkCalls = networkResponses.filter(r => 
      r.url.includes('clerk') || 
      r.url.includes('microsoft') || 
      r.url.includes('oauth') ||
      r.url.includes('api/email')
    );
    
    relevantNetworkCalls.forEach(call => {
      console.log(`  ${call.status} ${call.url}`);
    });
    
    const finalUrl = page.url();
    console.log('Final URL after click:', finalUrl);
    
    // Take final screenshot
    await page.screenshot({ path: '/Users/m3max361tb/Obelisk/after-click-screenshot.png', fullPage: true });
    console.log('📸 After-click screenshot saved');
    
    console.log('🎯 Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    try {
      await page.screenshot({ path: '/Users/m3max361tb/Obelisk/error-screenshot.png', fullPage: true });
      console.log('📸 Error screenshot saved');
    } catch (screenshotError) {
      console.log('Could not take error screenshot:', screenshotError.message);
    }
  } finally {
    await browser.close();
  }
}

testConnectOutlookButton();