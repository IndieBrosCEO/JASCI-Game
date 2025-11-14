const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Listen for all console events and log them to the terminal
    page.on('console', msg => console.log(`Browser Console: ${msg.text()}`));

    try {
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });

        // Wait for the game to be initialized
        await page.waitForFunction(() => window.gameInitialized);

        // Start the game
        await page.click('#startGameButton');

        // Wait for the game to start
        await page.waitForFunction(() => gameState.gameStarted);

        // Add a container to the game state
        await page.evaluate(() => {
            if (!window.gameState.containers) {
                window.gameState.containers = [];
            }
            const playerPos = window.gameState.playerPos;
            const container = {
                id: 'cabinet_1',
                name: 'Cabinet',
                x: playerPos.x,
                y: playerPos.y + 1,
                z: playerPos.z,
                items: [
                    {
                        id: 'simple_fishing_rod',
                        name: 'Simple Fishing Rod',
                        size: 4,
                        type: 'tool'
                    }
                ]
            };
            window.gameState.containers.push(container);
        });

        // Open the inventory
        await page.keyboard.press('i');

        // Wait for the inventory to be rendered
        await page.waitForSelector('#inventoryMenu:not(.hidden)');

        // Verify the contents of the inventory
        const inventoryItems = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('#inventoryList > div').forEach(el => {
                items.push(el.textContent);
            });
            return items;
        });

        assert(inventoryItems.some(item => item.includes('--- Cabinet ---')), 'Container header "--- Cabinet ---" not found.');
        assert(inventoryItems.some(item => item.includes('[CABINET] Simple Fishing Rod')), 'Item "[CABINET] Simple Fishing Rod" not found.');


        // Take a screenshot
        await page.screenshot({ path: 'verification/inventory_verification.png' });

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        await browser.close();
    }
})();
