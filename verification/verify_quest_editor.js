
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the quest editor
    await page.goto('http://localhost:8000/quest_editor.html');

    // Wait for the editor to load
    await page.waitForSelector('#quest-list');
    console.log('Quest editor loaded.');

    // Take a screenshot
    await page.screenshot({ path: 'verification/quest_editor.png' });
    console.log('Screenshot taken.');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
