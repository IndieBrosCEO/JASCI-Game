
const { test, expect } = require('@playwright/test');

test.describe('Water Absorption Config Test', () => {

  test('Water absorption works via config', async ({ page }) => {
    // Navigate to the game
    await page.goto('http://localhost:8000/index.html');
    await page.waitForSelector('#startGameButton', { state: 'visible', timeout: 10000 });
    await page.click('#startGameButton');

    // Wait for game initialization
    await page.waitForFunction(() => window.gameInitialized === true, { timeout: 20000 });

    // Wait for player position to be defined
    await page.waitForFunction(() => window.gameState && window.gameState.playerPos, { timeout: 20000 });

    // Wait for assetManager to be ready
    await page.waitForFunction(() => window.assetManager && window.assetManager.waterAbsorptionRules && window.assetManager.waterAbsorptionRules.length > 0);

    // Run the test logic inside the page context
    const testResults = await page.evaluate(() => {
        const playerPos = window.gameState.playerPos;
        if (!playerPos) return { error: "Player position not found" };

        const x = playerPos.x + 2;
        const y = playerPos.y + 2;
        const z = playerPos.z;

        const mapRenderer = window.mapRenderer;
        const mapData = mapRenderer.getCurrentMapData();
        const W = mapData.dimensions.width;
        const H = mapData.dimensions.height;

        // Helper to ensure Z level and layers exist with correct dimensions
        const ensureLevel = (levelZ) => {
            if (!mapData.levels[levelZ]) {
                mapData.levels[levelZ] = {};
            }
            ['bottom', 'middle'].forEach(layer => {
                if (!mapData.levels[levelZ][layer]) {
                    mapData.levels[levelZ][layer] = Array(H).fill(null).map(() => Array(W).fill(""));
                } else if (mapData.levels[levelZ][layer].length === 0) {
                     mapData.levels[levelZ][layer] = Array(H).fill(null).map(() => Array(W).fill(""));
                }
            });
        };

        ensureLevel(z);

        // --- Test Case 1: GR -> MF ---
        // Prepare tile
        // We bypass updateTileOnLayer for setup to avoid its strict checks or side effects,
        // effectively forcing the state.
        mapData.levels[z].bottom[y][x] = 'GR';

        // Ensure WaterManager
        if (!window.waterManager) window.waterManager = new window.WaterManager();
        window.waterManager.init(window.gameState);

        // Add water
        window.waterManager.addWater(x, y, z, 1);

        // Trigger turn processing
        window.waterManager.processTurn();

        // Check result
        let newTile = mapData.levels[z].bottom[y][x];
        if (newTile && typeof newTile === 'object') newTile = newTile.tileId;

        const result1 = (newTile === 'MF');

        // --- Test Case 2: DI at Z-1 -> MU ---
        const x2 = x + 2;
        const y2 = y;
        const zBelow = z - 1;

        ensureLevel(zBelow);

        // Prepare tile at Z-1
        mapData.levels[zBelow].middle[y2][x2] = 'DI';
        // Ensure tile at Z is empty so water can be there?
        // Actually water manager doesn't check if tile is occupied by water itself,
        // but gravity might move it if no floor?
        // Wait, if no floor at Z, water falls.
        // We need a floor at Z for water to stay and interact with Z-1?
        // No, the rule is "Middle layer one level below (Z-1)".
        // If there is DI at Z-1 middle, that acts as support/floor for Z.
        // Standing logic says solid_terrain_top at Z-1 middle supports Z.
        // DI has `solid_terrain_top`. So water at Z stays at Z (supported by DI at Z-1).

        // Add water at Z (above the Dirt)
        window.waterManager.addWater(x2, y2, z, 1);

        // Trigger turn processing
        window.waterManager.processTurn();

        // Check result
        let newTile2 = mapData.levels[zBelow].middle[y2][x2];
        if (newTile2 && typeof newTile2 === 'object') newTile2 = newTile2.tileId;

        const result2 = (newTile2 === 'MU');

        return { result1, result2, tile1: newTile, tile2: newTile2, x, y, z, x2, y2, zBelow };
    });

    console.log('Test Results:', testResults);

    expect(testResults.error).toBeUndefined();
    expect(testResults.result1).toBe(true);
    expect(testResults.result2).toBe(true);
  });
});
