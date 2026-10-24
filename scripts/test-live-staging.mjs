import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));

  console.log('1. Navigating to https://unitrack-web-staging.vercel.app...');
  await page.goto('https://unitrack-web-staging.vercel.app', { waitUntil: 'networkidle' });

  // Test registration with unique staging user
  const email = `staging-live-${Date.now()}@unitrack.test`;
  console.log('2. Registering live test user:', email);
  await page.click('button:has-text("Sign up now")');
  await page.waitForTimeout(500);

  await page.fill('input[placeholder*="Aisha"]', 'Live Staging Verifier');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'Str0ng!Pass123');

  const regBtn = page.locator('button[type="submit"]');
  await regBtn.click();
  console.log('3. Submitted registration form, waiting for response...');

  await page.waitForTimeout(4000);

  // Check if error appeared or if redirected to Today / Dashboard
  const errorBox = page.locator('div[class*="border-rose"]');
  if (await errorBox.isVisible()) {
    console.log('❌ Error message shown on page:', await errorBox.innerText());
  } else {
    console.log('✓ No error box. Current page content preview:');
    const snippet = (await page.locator('body').innerText()).substring(0, 500);
    console.log(snippet);
  }

  await browser.close();
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
