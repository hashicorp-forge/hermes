/**
 * Get authenticated session cookies for API testing
 * 
 * Purpose: Authenticate with Dex and extract session cookies for curl-based API testing
 * 
 * Usage:
 *   cd testing
 *   npx playwright run get-auth-cookies.ts --headed  # or remove --headed for headless
 * 
 * Output:
 *   - Prints session cookies to stdout
 *   - Saves cookies to /tmp/hermes-auth-cookies.json
 */

import { chromium } from '@playwright/test';

async function getAuthCookies(email: string = 'test@hermes.local', password: string = 'password') {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`Authenticating as: ${email}`);
    
    // Navigate to Hermes (will redirect to Dex)
    await page.goto('http://localhost:4201/');
    
    // Wait for Dex login page
    await page.waitForURL(/5558.*\/auth/, { timeout: 10000 });
    console.log('✓ Redirected to Dex');
    
    // Click on "Log in with Email" button
    await page.click('button:has-text("Log in with Email")');
    await page.waitForURL(/5558.*\/auth\/mock-password/, { timeout: 5000 });
    console.log('✓ On password form');
    
    // Fill credentials
    await page.fill('input[name="login"]', email);
    await page.fill('input[name="password"]', password);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for redirect back to Hermes
    await page.waitForURL(/localhost:420[01]/, { timeout: 10000 });
    console.log('✓ Authenticated successfully');
    
    // Wait a bit for session to be fully established
    await page.waitForTimeout(1000);
    
    // Get cookies
    const cookies = await context.cookies();
    
    console.log('\n=== Session Cookies ===');
    console.log(JSON.stringify(cookies, null, 2));
    
    // Find the session cookie
    const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('hermes'));
    
    if (sessionCookie) {
      console.log('\n=== Session Cookie (for curl) ===');
      console.log(`${sessionCookie.name}=${sessionCookie.value}`);
      
      // Also format for curl
      const curlCookies = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      console.log('\n=== All Cookies (for curl -H "Cookie: ...") ===');
      console.log(curlCookies);
    } else {
      console.log('\n⚠ Warning: No session cookie found');
      console.log('All cookies:', cookies.map(c => c.name).join(', '));
    }
    
    // Save to file for later use
    const fs = require('fs');
    fs.writeFileSync('/tmp/hermes-auth-cookies.json', JSON.stringify(cookies, null, 2));
    console.log('\n✓ Cookies saved to /tmp/hermes-auth-cookies.json');
    
    // Save curl format
    const curlCookies = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    fs.writeFileSync('/tmp/hermes-auth-cookies.txt', curlCookies);
    console.log('✓ Curl-formatted cookies saved to /tmp/hermes-auth-cookies.txt');
    
  } catch (error) {
    console.error('Error during authentication:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Main execution
(async () => {
  const email = process.argv[2] || 'test@hermes.local';
  const password = process.argv[3] || 'password';
  
  await getAuthCookies(email, password);
  
  console.log('\n=== Next Steps ===');
  console.log('Use the cookies in curl commands like this:');
  console.log('  COOKIES=$(cat /tmp/hermes-auth-cookies.txt)');
  console.log('  curl -H "Cookie: $COOKIES" http://localhost:8001/api/v2/me');
})();
