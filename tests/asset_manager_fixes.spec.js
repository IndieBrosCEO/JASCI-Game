const { test, expect } = require('@playwright/test');

test('Verify AssetManager critiques', async ({ page }) => {
    // Navigate to game
    await page.goto('http://localhost:8000/');

    // Wait for game initialization
    await page.waitForFunction(() => window.gameInitialized);

    // 1. Verify getTileset works (despite inconsistent logic)
    const tileDef = await page.evaluate(() => {
        return window.assetManager.getTileset('TRK');
    });
    expect(tileDef).not.toBeNull();
    expect(tileDef.name).toBe('Tree Trunk');

    // 2. Verify mapsById cache usage (currently ignored)
    // Load map once
    await page.evaluate(async () => {
        await window.assetManager.loadMap('npcTestMap');
        // Modify cache
        if (window.assetManager.mapsById['npcTestMap']) {
             window.assetManager.mapsById['npcTestMap']._cached_flag = true;
        }
    });

    // Load again
    await page.evaluate(async () => {
        await window.assetManager.loadMap('npcTestMap');
    });

    const isCached = await page.evaluate(() => {
        return window.assetManager.mapsById['npcTestMap']._cached_flag;
    });

    // Current behavior: re-fetches, so cache is overwritten. Expect undefined.
    // This proves the "critique" that caching is not used.
    // AFTER FIX: Expect true.
    expect(isCached).toBe(true);

    // 3. Verify mapPos deletion in processed data
    const mapData = await page.evaluate(() => {
        return window.assetManager.mapsById['npcTestMap'];
    });

    // Check first NPC
    if (mapData && mapData.npcs && mapData.npcs.length > 0) {
        const npc = mapData.npcs[0];
        // Expect 'pos' to exist
        expect(npc.pos).toBeDefined();
        // Expect 'mapPos' to be DEFINED because we want to preserve it.
        expect(npc.mapPos).toBeDefined();
    }
});
