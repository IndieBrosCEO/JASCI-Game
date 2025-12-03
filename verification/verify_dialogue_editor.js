
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the dialogue editor
    await page.goto('http://localhost:8000/dialogue_tool.html');

    // Wait for the editor to load
    await page.waitForSelector('#node-key');
    console.log('Dialogue editor loaded.');

    // Fill in quest details in helper
    await page.selectOption('#qa-type', 'startQuest');
    await page.fill('#qa-id', 'test_quest_123');

    // Click Add
    await page.click('#qa-add-btn');
    console.log('Clicked Insert Action.');

    // Check textarea value
    const actionsValue = await page.inputValue('#node-actions');
    if (actionsValue.includes('startQuest:test_quest_123')) {
        console.log('startQuest action added successfully.');
    } else {
        throw new Error(`startQuest action not found in textarea. Found: ${actionsValue}`);
    }

    // Test Advance Quest
    await page.selectOption('#qa-type', 'advanceQuest');
    // Wait for advance opts to be visible
    await page.waitForSelector('#qa-advance-opts', { state: 'visible' });

    await page.fill('#qa-id', 'test_quest_456');
    await page.selectOption('#qa-obj-type', 'kill');
    await page.fill('#qa-target', 'rat');
    await page.fill('#qa-amount', '5');

    await page.click('#qa-add-btn');

    const actionsValue2 = await page.inputValue('#node-actions');
    if (actionsValue2.includes('advanceQuest:test_quest_456:kill:rat:5')) {
        console.log('advanceQuest action added successfully.');
    } else {
         throw new Error(`advanceQuest action not found in textarea. Found: ${actionsValue2}`);
    }

    // Take a screenshot
    await page.screenshot({ path: 'verification/dialogue_editor_quest_actions.png' });
    console.log('Screenshot taken.');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
