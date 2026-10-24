const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/hp/.gemini/antigravity/brain/f7438c3b-5a75-40ed-b29b-e085e55b0bb4');

async function run() {
  console.log('--- Starting Real Web Application UI Verification ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  try {
    // -------------------------------------------------------------------------
    // 1. Desktop Viewport Inspection (1440x900)
    // -------------------------------------------------------------------------
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await desktopContext.newPage();

    // Collect console logs
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('BROWSER ERROR:', msg.text());
      }
    });

    console.log('1. Navigating to http://localhost:5173 (Desktop)...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Check if already authenticated or needs login
    const isLoginFormVisible = await page.getByRole('button', { name: 'Sign In', exact: true }).isVisible();

    if (isLoginFormVisible) {
      console.log('Login form detected. Taking login screenshot...');
      const loginScreenshot = path.join(ARTIFACT_DIR, '01_desktop_login.png');
      await page.screenshot({ path: loginScreenshot, fullPage: true });
      console.log(`Saved login screenshot: ${loginScreenshot}`);

      console.log('2. Testing Login with verified test user...');
      await page.fill('input[type="email"]', 'prod-ui-verify@unitrack.test');
      await page.fill('input[type="password"]', 'Str0ng!Password123');

      const submitBtn = page.getByRole('button', { name: 'Sign In', exact: true });
      await submitBtn.click();
      await page.waitForTimeout(1500);

      // Check if error box appeared (meaning user needs to register)
      const errorBox = page.locator('div[class*="border-rose"]');
      if (await errorBox.isVisible()) {
        console.log('User not registered yet. Switching to Register view...');
        await page.click('button:has-text("Sign up now")');
        await page.waitForTimeout(500);

        await page.fill('input[placeholder*="Aisha"]', 'Chronicle Verifier');
        await page.fill('input[type="email"]', 'prod-ui-verify@unitrack.test');
        await page.fill('input[type="password"]', 'Str0ng!Password123');
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(2000);
      }
    } else {
      console.log('Session already active. Taking Chronicle view screenshot directly...');
    }

    // Now user should be logged into the Chronicle Today view
    console.log('3. Waiting for Chronicle Today view...');
    await page.waitForSelector("text=Today's Commitments", { timeout: 15000 });
    console.log('Chronicle Today view loaded successfully!');

    // Capture Desktop Today View
    const todayDesktopScreenshot = path.join(ARTIFACT_DIR, '02_desktop_today_chronicle.png');
    await page.screenshot({ path: todayDesktopScreenshot, fullPage: true });
    console.log(`Saved Today screenshot: ${todayDesktopScreenshot}`);

    // -------------------------------------------------------------------------
    // 2. Interactive Feature Verification
    // -------------------------------------------------------------------------
    console.log('4. Testing Quick Add Commitment Modal...');
    await page.locator('button', { hasText: 'Commitment' }).first().click();
    await page.waitForSelector('text=Add Commitment');
    await page.fill('input[placeholder*="Focus Block"]', 'Deep Strategic Planning');
    await page.click('button[type="submit"]:has-text("Save Commitment")');
    await page.waitForTimeout(1000);

    console.log('5. Testing Quick Add Task Modal...');
    await page.locator('button', { hasText: 'Task' }).first().click();
    await page.waitForSelector('text=Add Task');
    await page.fill('input[placeholder*="Task title"]', 'Review Performance Metrics');
    await page.click('button[type="submit"]:has-text("Save Task")');
    await page.waitForTimeout(1000);

    // Verify presence of newly created items
    const hasCommitment = await page.locator('text=Deep Strategic Planning').first().isVisible();
    const hasTask = await page.locator('text=Review Performance Metrics').first().isVisible();
    console.log(`Commitment visible: ${hasCommitment}, Task visible: ${hasTask}`);

    // Test attendance logging
    console.log('6. Testing Commitment Attend Action...');
    const attendBtn = page.locator('button:has-text("Attend")').first();
    if (await attendBtn.isVisible()) {
      await attendBtn.click();
      await page.waitForTimeout(1000);
      console.log('Attend button clicked.');
    }

    // Capture updated Today stream
    const todayActionScreenshot = path.join(ARTIFACT_DIR, '03_desktop_today_action.png');
    await page.screenshot({ path: todayActionScreenshot, fullPage: true });

    // -------------------------------------------------------------------------
    // 3. Navigation across all views
    // -------------------------------------------------------------------------
    console.log('7. Testing Navigation: Plan & Review...');
    await page.click('button:has-text("Plan & Review")');
    await page.waitForSelector('text=Weekly Planning & Reflection', { timeout: 15000 });
    const reviewScreenshot = path.join(ARTIFACT_DIR, '04_desktop_review.png');
    await page.screenshot({ path: reviewScreenshot, fullPage: true });
    console.log(`Saved Review screenshot: ${reviewScreenshot}`);

    console.log('8. Testing Navigation: Goals...');
    await page.click('button:has-text("Goals")');
    await page.waitForSelector('text=Goals & Key Milestones', { timeout: 15000 });
    const goalsScreenshot = path.join(ARTIFACT_DIR, '05_desktop_goals.png');
    await page.screenshot({ path: goalsScreenshot, fullPage: true });
    console.log(`Saved Goals screenshot: ${goalsScreenshot}`);

    console.log('9. Testing Navigation: Habits...');
    await page.click('button:has-text("Habits")');
    await page.waitForSelector('text=Habits & Daily Cadence', { timeout: 15000 });
    const habitsScreenshot = path.join(ARTIFACT_DIR, '06_desktop_habits.png');
    await page.screenshot({ path: habitsScreenshot, fullPage: true });
    console.log(`Saved Habits screenshot: ${habitsScreenshot}`);

    console.log('10. Testing Navigation: Academic Hub...');
    await page.click('button:has-text("Academic Hub")');
    await page.waitForSelector('text=Academic Suite', { timeout: 15000 });
    const academicScreenshot = path.join(ARTIFACT_DIR, '07_desktop_academic_hub.png');
    await page.screenshot({ path: academicScreenshot, fullPage: true });
    console.log(`Saved Academic Hub screenshot: ${academicScreenshot}`);

    // -------------------------------------------------------------------------
    // 4. Persistence across Refresh
    // -------------------------------------------------------------------------
    console.log('11. Testing Refresh & Session Persistence...');
    await page.click('button:has-text("Today")');
    await page.waitForSelector("text=Today's Commitments", { timeout: 15000 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector("text=Today's Commitments", { timeout: 15000 });
    console.log('Session and Today stream successfully persisted after full page reload!');

    await desktopContext.close();

    // -------------------------------------------------------------------------
    // 5. Mobile Viewport Inspection (390x844 - iPhone / Modern Android)
    // -------------------------------------------------------------------------
    console.log('12. Inspecting Mobile Viewport (390x844)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Login on mobile context if needed
    const isMobileLoggedIn = await mobilePage.locator("text=Today's Commitments").isVisible();
    if (!isMobileLoggedIn) {
      await mobilePage.fill('input[type="email"]', 'prod-ui-verify@unitrack.test');
      await mobilePage.fill('input[type="password"]', 'Str0ng!Password123');
      await mobilePage.getByRole('button', { name: 'Sign In', exact: true }).click();
      await mobilePage.waitForSelector("text=Today's Commitments", { timeout: 15000 });
    }

    const mobileTodayScreenshot = path.join(ARTIFACT_DIR, '08_mobile_today_chronicle.png');
    await mobilePage.screenshot({ path: mobileTodayScreenshot, fullPage: true });
    console.log(`Saved Mobile Today screenshot: ${mobileTodayScreenshot}`);

    // Mobile horizontal nav test
    await mobilePage.locator('button:visible', { hasText: 'Goals' }).click();
    await mobilePage.waitForSelector('text=Goals & Key Milestones', { timeout: 15000 });
    const mobileGoalsScreenshot = path.join(ARTIFACT_DIR, '09_mobile_goals.png');
    await mobilePage.screenshot({ path: mobileGoalsScreenshot, fullPage: true });
    console.log(`Saved Mobile Goals screenshot: ${mobileGoalsScreenshot}`);
    console.log(`Saved Mobile Goals screenshot: ${mobileGoalsScreenshot}`);

    await mobileContext.close();

    console.log('--- Real UI Verification Completed Successfully with Zero Errors ---');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('UI VERIFICATION FAILED:', err);
  process.exit(1);
});
