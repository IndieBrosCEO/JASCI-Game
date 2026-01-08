const { test, expect } = require('@playwright/test');

test('Verify Cover Overlay Logic', async ({ page }) => {
    // 1. Initialize Game
    await page.goto('http://localhost:8000/index.html');
    await page.waitForSelector('#startGameButton');
    await page.click('#startGameButton');
    await page.waitForFunction(() => window.gameInitialized);

    // 2. Setup Scenario
    // Move Player to a safe spot
    await page.evaluate(async () => {
        window.gameState.playerPos = { x: 5, y: 5, z: 0 };
        // Place a high cover object (Concrete Wall) and low cover (Tree) nearby
        const mapData = window.mapRenderer.getCurrentMapData();
        if (!mapData.levels['0'].middle) mapData.levels['0'].middle = [];

        // Wall at 5,7 (+10)
        if (!mapData.levels['0'].middle[7]) mapData.levels['0'].middle[7] = [];
        mapData.levels['0'].middle[7][5] = 'CWH';

        // Tree at 5,6 (+4)
        if (!mapData.levels['0'].middle[6]) mapData.levels['0'].middle[6] = [];
        mapData.levels['0'].middle[6][5] = 'TRK';

        window.mapRenderer.scheduleRender();
    });

    // 3. Enable Overlay
    await page.evaluate(() => {
        window.gameState.settings.showCoverOverlay = true;
        window.mapRenderer.scheduleRender();
    });

    // Allow render
    await page.waitForTimeout(500);

    // 4. Inspect Tiles
    // We check the background color of the tiles. It should be greenish.
    // Coordinates 5,7 (Wall) and 5,6 (Tree).
    // Note: Tiles in DOM are often identified by data attributes or just order.
    // mapRenderer creates spans with data-x and data-y.

    const wallColor = await page.evaluate(() => {
        const span = document.querySelector('.tile[data-x="5"][data-y="7"]');
        return span ? span.style.backgroundColor : null;
    });

    const treeColor = await page.evaluate(() => {
        const span = document.querySelector('.tile[data-x="5"][data-y="6"]');
        return span ? span.style.backgroundColor : null;
    });

    const floorColor = await page.evaluate(() => {
        const span = document.querySelector('.tile[data-x="5"][data-y="4"]'); // Empty floor
        return span ? span.style.backgroundColor : null;
    });

    console.log(`Wall BG: ${wallColor}`);
    console.log(`Tree BG: ${treeColor}`);
    console.log(`Floor BG: ${floorColor}`);

    // Basic assertion: Wall and Tree should have green component, Floor should not (or be different)
    // Green tint usually results in 'rgb(r, g, b)' where g is significant.
    // Checking if color string contains 'rgb' and values indicate green mix is complex without parsing.
    // But we know standard floor is usually not green-tinted in this way.

    // Check if Wall BG is defined and likely tinted
    if (!wallColor || wallColor === '' || wallColor === 'initial') {
         console.log("Wall has no background color. Test Failed?");
    }

    // Since we used blendColors with green (0, 255, 0), we expect G component to be present/high.
    // This is a heuristic verification.
    const isGreenish = (colorStr) => {
        if (!colorStr) return false;
        if (colorStr.startsWith('#')) {
             // Hex check (simple) - unlikely as browser computed style is usually rgb/rgba
             return false;
        }
        if (colorStr.startsWith('rgb')) {
            const parts = colorStr.match(/\d+/g);
            if (parts && parts.length >= 3) {
                const g = parseInt(parts[1]);
                return g > 50; // Arbitrary threshold
            }
        }
        return false;
    };

    expect(isGreenish(wallColor)).toBeTruthy();
    expect(isGreenish(treeColor)).toBeTruthy();

    // Disable Overlay
    await page.evaluate(() => {
        window.gameState.settings.showCoverOverlay = false;
        window.mapRenderer.scheduleRender();
    });

    await page.waitForTimeout(500);

    const wallColorOff = await page.evaluate(() => {
        const span = document.querySelector('.tile[data-x="5"][data-y="7"]');
        return span ? span.style.backgroundColor : null;
    });

    console.log(`Wall BG (Off): ${wallColorOff}`);
    // Should be different (likely darker or standard tile bg)
    expect(wallColor).not.toBe(wallColorOff);

});
