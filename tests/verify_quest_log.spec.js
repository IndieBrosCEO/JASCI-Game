const { test, expect } = require('@playwright/test');

test.describe('Quest Log UI Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Go to the game page
        await page.goto('http://localhost:8000/');
        // Wait for game initialization
        await page.waitForFunction(() => window.gameInitialized === true);

        // Start the game to ensure UI is fully loaded/processed
        const startButton = page.locator('#startGameButton');
        await startButton.waitFor({ state: 'visible' });
        await startButton.click();
    });

    test('Quest Log should be hidden on launch', async ({ page }) => {
        const questLog = page.locator('#questLogUI');
        // It should be attached to the DOM
        await expect(questLog).toBeAttached();

        // It should be hidden.
        // Note: .toBeHidden() checks for display:none, visibility:hidden, etc.
        // Currently this is expected to FAIL because of the CSS bug.
        await expect(questLog).toBeHidden();
    });

    test('Pressing "q" should toggle Quest Log', async ({ page }) => {
        const questLog = page.locator('#questLogUI');

        // Ensure it starts hidden (this step might fail currently if not fixed)
        // If it starts visible, pressing 'q' (toggle) should make it hidden, then visible.
        // But let's assume we want to test the fixed behavior.

        // Force hide it manually for testing the toggle if the initial state is buggy?
        // No, better to test the full flow after the fix.

        // Press 'q'
        await page.keyboard.press('q');

        // Should be visible
        await expect(questLog).toBeVisible();

        // Press 'q' again
        await page.keyboard.press('q');

        // Should be hidden
        await expect(questLog).toBeHidden();
    });

    test('Close button should close Quest Log', async ({ page }) => {
        const questLog = page.locator('#questLogUI');

        // Open it first (or if it's open by default due to bug, this test might behave differently)
        // Let's ensure it's open.
        if (await questLog.isHidden()) {
            await page.keyboard.press('q');
        }
        await expect(questLog).toBeVisible();

        // Click close button
        const closeButton = page.locator('#closeQuestLogButton');
        await closeButton.click();

        // Should be hidden
        await expect(questLog).toBeHidden();
    });
});
