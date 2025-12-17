const { test, expect } = require('@playwright/test');

test('Quest Log Screenshot Verification', async ({ page }) => {
    // Navigate to game
    await page.goto('http://localhost:8000/');
    await page.waitForFunction(() => window.gameInitialized === true);

    // Start game
    await page.click('#startGameButton');

    // Ensure Quest Log is hidden initially
    const questLog = page.locator('#questLogUI');
    await expect(questLog).toBeHidden();

    // Open Quest Log with 'q'
    await page.keyboard.press('q');
    await expect(questLog).toBeVisible();

    // Take screenshot of open quest log
    await page.screenshot({ path: 'verification/quest_log_open.png' });

    // Close it
    await page.click('#closeQuestLogButton');
    await expect(questLog).toBeHidden();
});
