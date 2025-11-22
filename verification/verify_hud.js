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

        // Wait for HUD update
        await page.waitForTimeout(1000);

        // Take a screenshot of the HUD with unspent points
        await page.screenshot({ path: 'verification/hud_with_points.png' });
        console.log("Screenshot taken.");

    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
