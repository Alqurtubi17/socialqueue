const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to X login...');
  await page.goto('https://x.com/i/flow/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  console.log('Waiting 10 seconds for react to render...');
  await page.waitForTimeout(10000);

  const html = await page.content();
  fs.writeFileSync('x-login-dump.html', html);
  console.log('Saved HTML to x-login-dump.html');

  await page.screenshot({ path: 'x-login-screenshot.png' });
  console.log('Saved screenshot to x-login-screenshot.png');

  await browser.close();
})();
