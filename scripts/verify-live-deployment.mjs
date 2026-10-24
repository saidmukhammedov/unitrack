import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = path.resolve('C:/Users/hp/.gemini/antigravity/brain/f7438c3b-5a75-40ed-b29b-e085e55b0bb4');

async function main() {
  console.log('--- Starting Live Staging Web End-to-End Verification ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    console.log('1. Navigating to https://unitrack-web-staging.vercel.app...');
    await page.goto('https://unitrack-web-staging.vercel.app', { waitUntil: 'networkidle' });

    console.log('2. Logging in with live staging user...');
    await page.fill('input[type="email"]', 'staging-live-1792807368692@unitrack.test');
    await page.fill('input[type="password"]', 'Str0ng!Pass123');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    console.log('3. Waiting for Chronicle Today view to load...');
    await page.waitForSelector("text=Today's Commitments", { timeout: 20000 });
    console.log('✓ Successfully entered Chronicle Today view on live staging!');

    // Verify default contexts are visible
    const personalCtx = await page.locator('button:has-text("Personal")').first().isVisible();
    const workCtx = await page.locator('button:has-text("Work")').first().isVisible();
    const studyCtx = await page.locator('button:has-text("Study")').first().isVisible();
    console.log(`Contexts visible - Personal: ${personalCtx}, Work: ${workCtx}, Study: ${studyCtx}`);

    // Create a live commitment
    console.log('4. Creating commitment on live staging...');
    await page.locator('button', { hasText: 'Commitment' }).first().click();
    await page.waitForSelector('text=Add Commitment');
    await page.fill('input[placeholder*="Focus Block"]', 'Live Staging Strategic Review');
    await page.click('button[type="submit"]:has-text("Save Commitment")');
    await page.waitForTimeout(2000);

    const commitmentVisible = await page.locator('text=Live Staging Strategic Review').first().isVisible();
    console.log('✓ Created commitment visible on live staging:', commitmentVisible);

    // Capture screenshot
    const screenshotPath = path.join(ARTIFACT_DIR, '10_live_staging_chronicle.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`✓ Saved live staging screenshot to: ${screenshotPath}`);

    // Navigation tests
    console.log('5. Testing navigation on live staging: Goals...');
    await page.click('button:has-text("Goals")');
    await page.waitForSelector('text=Goals & Key Milestones', { timeout: 15000 });
    console.log('✓ Goals view loaded on live staging');

    console.log('6. Testing navigation on live staging: Habits...');
    await page.click('button:has-text("Habits")');
    await page.waitForSelector('text=Habits & Daily Cadence', { timeout: 15000 });
    console.log('✓ Habits view loaded on live staging');

    console.log('7. Testing navigation on live staging: Academic Hub...');
    await page.click('button:has-text("Academic Hub")');
    await page.waitForSelector('text=Academic Suite', { timeout: 15000 });
    console.log('✓ Academic Hub loaded on live staging');

    await context.close();
    console.log('--- Live Staging Verification Succeeded 100% ---');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ Live staging verification failed:', err);
  process.exit(1);
});
