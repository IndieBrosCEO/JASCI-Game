
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

    // Take a screenshot of the initial state
    await page.screenshot({ path: 'verification/quest_editor_initial.png' });
    console.log('Initial screenshot taken.');

    // Click "Add New Quest"
    await page.click('#add-quest');
    console.log('Clicked Add New Quest.');

    // Fill in quest details
    await page.fill('#quest-id', 'test_quest_123');
    await page.fill('#quest-title', 'Test Quest Title');
    await page.fill('#quest-description', 'This is a test quest created by Playwright.');

    // Add an objective
    await page.click('#add-objective');
    // Select type 'visit' (assuming it's the 3rd option, or by value)
    await page.selectOption('#objectives-container .list-item select', 'visit');
    await page.fill('#objectives-container .list-item input[placeholder="Target ID"]', 'testMap');

    // Add rewards
    await page.fill('#reward-xp', '50');
    // await page.fill('#reward-gold', '100'); // Removed gold reward input

    // Take a screenshot of the populated editor
    await page.screenshot({ path: 'verification/quest_editor_populated.png' });
    console.log('Populated screenshot taken.');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
