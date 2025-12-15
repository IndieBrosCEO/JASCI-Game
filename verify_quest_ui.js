
const { test, expect, chromium } = require('@playwright/test');

test('Quest Log UI verification', async () => {
  const browser = await chromium.launch({
    headless: true, // Use headless for CI/sandboxed environments
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Critical for non-root users
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Load the game
  await page.goto('http://localhost:8000/index.html');
  await page.waitForLoadState('networkidle');

  // 2. Start the game (to initialize everything)
  await page.click('#startGameButton');

  // Wait for game initialization
  await page.waitForFunction(() => window.gameInitialized === true);

  // 3. Verify QuestLogUI exists in window
  const uiExists = await page.evaluate(() => !!window.QuestLogUI);
  expect(uiExists).toBeTruthy();

  // 4. Verify DOM element exists and is hidden
  const questLogUI = await page.$('#questLogUI');
  expect(questLogUI).not.toBeNull();
  expect(await questLogUI.isVisible()).toBeFalsy();

  // 5. Test toggle via console/direct call (since no button is mapped yet besides console command or internal logic)
  // Let's call the toggle method directly
  await page.evaluate(() => window.QuestLogUI.toggle());
  expect(await questLogUI.isVisible()).toBeTruthy();

  // 6. Test content
  // Initially, active quests list should be empty or say "No quests"
  const listContent = await page.evaluate(() => document.getElementById('questList').innerHTML);
  expect(listContent).toContain('No quests');

  // 7. Add a dummy quest and verify update
  await page.evaluate(() => {
    window.gameState.activeQuests.push({
      id: 'test_quest',
      displayName: 'Test Quest',
      description: 'A quest for testing.',
      objectives: [{ text: 'Do something', completed: false }]
    });
    window.QuestLogUI.refreshQuestLog();
  });

  const listContentUpdated = await page.evaluate(() => document.getElementById('questList').innerHTML);
  expect(listContentUpdated).toContain('Test Quest');

  // 8. Test details view
  await page.click('li.quest-item:has-text("Test Quest")');
  const detailsVisible = await page.isVisible('#questDetailPanel');
  expect(detailsVisible).toBeTruthy();

  const title = await page.textContent('#questDetailTitle');
  expect(title).toBe('Test Quest');

  // 9. Close
  await page.click('#closeQuestLogButton');
  expect(await questLogUI.isVisible()).toBeFalsy();

  await browser.close();
});
