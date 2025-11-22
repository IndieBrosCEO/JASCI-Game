const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log("Navigating to game...");
        await page.goto('http://localhost:8000');

        // Wait for initialization
        await page.waitForFunction(() => window.gameInitialized === true, { timeout: 10000 });

        // Start the game
        const startButton = await page.$('#startGameButton');
        if (startButton) {
            await startButton.click();
        }

        await page.waitForFunction(() => window.gameState && window.gameState.gameStarted, { timeout: 5000 });

        // Give XP to level up
        await page.evaluate(() => window.xpManager.awardXp('test', 3000)); // Level 5

        // Open Level Up UI by pressing 'U'
        await page.keyboard.press('u');

        // Wait for the UI to be visible
        const ui = await page.locator('#levelUpUI');
        await ui.waitFor({ state: 'visible' });

        // Take a screenshot
        await page.screenshot({ path: 'verification/level_up_ui_fixed_skills.png' });
        console.log("Screenshot taken.");

    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
