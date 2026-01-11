const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const serverUrl = 'http://localhost:8000';
    const screenshotPath = 'verification_crafting_tabs.png';

    try {
        console.log('Navigating to game...');
        await page.goto(serverUrl);

        // Wait for game initialization
        console.log('Waiting for gameInitialized...');
        await page.waitForFunction(() => window.gameInitialized === true, { timeout: 10000 });

        // Start the game to get to the main UI
        console.log('Starting game...');
        const startButton = page.locator('#startGameButton');
        await startButton.click();

        // Wait for main game UI (e.g., #left-panel)
        await page.waitForSelector('#left-panel', { state: 'visible' });

        // Force open Crafting UI via console execution
        console.log('Opening Crafting UI...');
        await page.evaluate(() => {
            const craftingUI = new window.CraftingUIManager(
                window.craftingManager,
                window.inventoryManager,
                window.assetManager,
                window.gameState
            );
            // Re-initialization for test purposes to bind elements
            craftingUI.initialize();
            craftingUI.open();
        });

        // Wait for crafting UI to be visible
        const craftingUI = page.locator('#craftingUI');
        await craftingUI.waitFor({ state: 'visible' });

        // Check for tabs
        const tabs = page.locator('#craftingTabs .tab-button');
        const count = await tabs.count();
        console.log(`Found ${count} crafting tabs.`);

        if (count === 0) {
            throw new Error("No crafting tabs found!");
        }

        // Click a tab (e.g., "Weapons")
        console.log('Clicking Weapons tab...');
        const weaponsTab = tabs.locator('text=Weapons');
        await weaponsTab.click();

        // Wait a moment for render
        await page.waitForTimeout(500);

        // Take screenshot of Crafting UI
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved to ${screenshotPath}`);

        // Now test Construction UI
        console.log('Closing Crafting, Opening Construction...');
         await page.evaluate(() => {
            document.getElementById('craftingUI').classList.add('hidden');
            const constructionUI = new window.ConstructionUIManager(
                window.constructionManager,
                window.inventoryManager,
                window.assetManager,
                window.gameState,
                window.mapRenderer
            );
            constructionUI.initialize();
            constructionUI.open();
        });

        const constructionUI = page.locator('#constructionUI');
        await constructionUI.waitFor({ state: 'visible' });

        const conTabs = page.locator('#constructionTabs .tab-button');
        const conCount = await conTabs.count();
        console.log(`Found ${conCount} construction tabs.`);

        if (conCount === 0) {
             throw new Error("No construction tabs found!");
        }

        // Click a tab if available
        if (conCount > 1) {
             await conTabs.nth(1).click();
             await page.waitForTimeout(500);
        }

        await page.screenshot({ path: 'verification_construction_tabs.png' });
        console.log('Construction UI screenshot saved.');


    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        await browser.close();
    }
})();
