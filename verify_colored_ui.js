const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Start the game
    const fileUrl = `file://${path.resolve('index.html')}`;
    await page.goto(fileUrl);

    // Wait for initialization
    await page.waitForFunction(() => window.gameInitialized === true);
    await page.click('#startGameButton');
    await page.waitForTimeout(1000);

    // 2. Award XP to ensure points are available and UI is relevant
    await page.evaluate(() => {
        window.xpManager.awardXp(1000, 'Test XP'); // Level 3
        window.gameState.unspentStatPoints = 5;
        window.gameState.unspentSkillPoints = 5;
        window.gameState.unspentPerkPicks = 2;
    });
    await page.waitForTimeout(500);

    // 3. Show Level Up UI
    await page.evaluate(() => {
        window.levelUpUI.show();
    });
    await page.waitForTimeout(500);

    // 4. Take screenshot
    await page.screenshot({ path: 'verification/colored_level_up_ui.png', fullPage: true });
    console.log('Screenshot captured: verification/colored_level_up_ui.png');

  } catch (error) {
    console.error('Error during verification:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
