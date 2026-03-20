const { test, expect } = require('@playwright/test');

test('benchmark floor items rendering', async ({ page }) => {
    await page.goto('http://localhost:8000');

    // Wait for the game to be loaded
    await page.waitForFunction(() => window.gameState && window.mapRenderer && window.mapRenderer.getCurrentMapData());

    await page.evaluate(() => {
        window.gameState.floorItems = [];
        for (let i = 0; i < 50000; i++) {
            window.gameState.floorItems.push({
                x: Math.floor(Math.random() * 50),
                y: Math.floor(Math.random() * 50),
                z: 0,
                id: 'item_' + i
            });
        }

        // Force rendering logic by faking a large viewport and visible tiles
        window.gameState.currentViewZ = 0;
        const currentMapData = window.mapRenderer.getCurrentMapData();
        const H = currentMapData.dimensions.height;
        const W = currentMapData.dimensions.width;

        window.gameState.fowData['0'] = Array(H).fill(null).map(() => Array(W).fill('visible'));

        // Mock container to have a very large client area so it renders all
        const container = document.getElementById('mapContainer');
        Object.defineProperty(container, 'clientWidth', { get: () => 5000 });
        Object.defineProperty(container, 'clientHeight', { get: () => 5000 });
        Object.defineProperty(container, 'scrollLeft', { get: () => 0 });
        Object.defineProperty(container, 'scrollTop', { get: () => 0 });
    });

    // Run mapRenderer manually a few times and measure
    const results = await page.evaluate(() => {
        const times = [];
        for (let i = 0; i < 5; i++) {
            window.gameState.tileCache = null; // force clear to avoid fast path
            const start = performance.now();
            window.mapRenderer.renderMapLayers();
            times.push(performance.now() - start);
        }
        return times;
    });

    console.log("Benchmark results (ms per frame):", results);
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    console.log("Average:", avg.toFixed(2), "ms");
});
