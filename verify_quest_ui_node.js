
const { chromium } = require('playwright');

(async () => {
  console.log('Starting verification...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
      // 1. Load the game
      await page.goto('http://localhost:8000/index.html');
      await page.waitForLoadState('networkidle');

      // 2. Start the game (to initialize everything)
      const startButton = await page.$('#startGameButton');
      if (startButton) {
          await startButton.click();
      } else {
          console.error("Start button not found!");
      }

      // Wait for game initialization
      await page.waitForFunction(() => window.gameInitialized === true);
      console.log('Game initialized.');

      // 3. Verify QuestLogUI exists in window
      const uiExists = await page.evaluate(() => !!window.QuestLogUI);
      if (!uiExists) throw new Error('window.QuestLogUI is undefined');
      console.log('QuestLogUI exists.');

      // 4. Verify DOM element exists and is hidden
      const questLogUI = await page.$('#questLogUI');
      if (!questLogUI) throw new Error('#questLogUI not found in DOM');
      const isVisible = await questLogUI.isVisible();
      if (isVisible) throw new Error('#questLogUI should be hidden initially');
      console.log('QuestLogUI DOM element verified.');

      // 5. Test toggle
      await page.evaluate(() => window.QuestLogUI.toggle());
      const isVisibleAfterToggle = await questLogUI.isVisible();
      if (!isVisibleAfterToggle) throw new Error('#questLogUI should be visible after toggle');
      console.log('QuestLogUI toggle worked.');

      // 6. Test content
      const listContent = await page.evaluate(() => document.getElementById('questList').innerHTML);
      if (!listContent.includes('No quests')) throw new Error('Expected "No quests" in empty list');
      console.log('QuestLogUI empty state verified.');

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
      if (!listContentUpdated.includes('Test Quest')) throw new Error('Quest list did not update with new quest');
      console.log('QuestLogUI updated with new quest.');

      // 8. Test details view
      await page.click('li.quest-item'); // Click the first item
      const detailsVisible = await page.isVisible('#questDetailPanel');
      if (!detailsVisible) throw new Error('Detail panel did not open');

      const title = await page.textContent('#questDetailTitle');
      if (title !== 'Test Quest') throw new Error('Detail title mismatch');
      console.log('Quest details view verified.');

      // 9. Close
      await page.click('#closeQuestLogButton');
      const isVisibleAfterClose = await questLogUI.isVisible();
      if (isVisibleAfterClose) throw new Error('Close button did not hide UI');
      console.log('Close button worked.');

      console.log('Verification PASSED!');

  } catch (error) {
      console.error('Verification FAILED:', error);
      process.exit(1);
  } finally {
      await browser.close();
  }
})();
