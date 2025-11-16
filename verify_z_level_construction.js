const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));

    try {
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });

        await page.waitForFunction(() => window.gameState.mapLoaded);

        const result = await page.evaluate(async () => {
            // Add a solid_terrain_top tile to the middle layer of z-1
            const mapData = window.mapRenderer.getCurrentMapData();
            if (!mapData.levels[-1]) {
                const height = mapData.dimensions.height;
                const width = mapData.dimensions.width;
                mapData.levels[-1] = {
                    bottom: Array(height).fill(0).map(() => Array(width).fill(null)),
                    middle: Array(height).fill(0).map(() => Array(width).fill(null)),
                };
            }
            mapData.levels[-1].middle[9][12] = 'concrete_floor'; // Assuming 'concrete_floor' has the 'solid_terrain_top' tag

            // Add required items
            window.inventoryManager.addItem('wood_planks', 10);
            window.inventoryManager.addItem('nails', 10);

            // Define target location
            const x = 12;
            const y = 9;
            const z = 0;
            const constructionId = 'workbench_basic_built';

            // Attempt to place construction
            const placeResult = await window.constructionManager.placeConstruction(constructionId, {x, y, z});

            // Check if construction was placed
            const constructionPlaced = mapData.levels[z][y][x].construction !== null;

            return {
                placeResult: placeResult,
                constructionPlaced: constructionPlaced,
                logs: window.console.logs || []
            };
        });

        console.log('Verification result:', result);

        if (result.constructionPlaced) {
            console.log('Test Passed: Construction placed successfully!');
        } else {
            console.error('Test Failed: Construction not placed.');
            console.error('Placement result:', result.placeResult);
        }

    } catch (error) {
        console.error('An error occurred during verification:', error);
    } finally {
        await browser.close();
    }
})();
