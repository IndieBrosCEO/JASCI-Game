const { test, expect } = require('@playwright/test');

test('Flying Entity Verification', async ({ page }) => {
    // Navigate to the game page
    await page.goto('http://localhost:8000/index.html');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the game to initialize
    await page.waitForFunction(() => window.gameInitialized === true, { timeout: 30000 });

    // --- Helper Functions in Browser Context ---
    const runInBrowser = async (fn, args) => {
        return await page.evaluate(fn, args);
    };

    // Load the test map
    // We use "flying_test_map" which we created
    // But since it's a new file, we need to ensure the game can load it.
    // If mapIndex.json isn't updated, the game won't see it in the list.
    // However, assetManager.loadMap loads by ID if we call it directly or via console.

    // Let's use console command to load map if possible, or force load via evaluate.
    // Wait, the test map file flying_test_map.json is in tests/assets/maps/
    // The game looks in assets/maps/.
    // I need to move the map file to assets/maps/ or use a map that exists.
    // Ah, I created tests/assets/maps/flying_test_map.json but that's not served by the game server usually unless configured.
    // I should probably put it in assets/maps/ for the test and delete it later?
    // Or I can just inject the map data directly via evaluate.

    // Let's inject map data directly to avoid file system issues.
    await page.evaluate(() => {
        const flyingMapData = {
            id: "flying_test_map_injected",
            name: "Flying Test Map Injected",
            dimensions: { width: 10, height: 10 },
            startPos: { x: 1, y: 1, z: 0 },
            levels: {
                "0": {
                    bottom: Array(10).fill(Array(10).fill({ tileId: "g" })), // grass
                    middle: Array(10).fill(Array(10).fill(""))
                },
                "1": {
                    bottom: Array(10).fill(Array(10).fill("")),
                    middle: Array(10).fill(Array(10).fill(""))
                },
                "2": {
                     bottom: Array(10).fill(Array(10).fill("")),
                     middle: Array(10).fill(Array(10).fill(""))
                }
            }
        };
        // Mock assetManager tile definitions if needed, but 'g' should exist.
        // We set this as current map.
        window.mapRenderer.initializeCurrentMap(flyingMapData);
        window.gameState.playerPos = { x: 1, y: 1, z: 0 };
    });

    console.log("Map injected.");

    // Add a Flying NPC
    await page.evaluate(() => {
        const flyingNpc = {
            id: "test_hawk",
            name: "Test Hawk",
            mapPos: { x: 2, y: 2, z: 0 },
            currentMovementPoints: 10,
            tags: ["flying"], // The key tag
            health: { torso: { current: 10, max: 10 } },
            facing: "right"
        };
        if (!window.gameState.npcs) window.gameState.npcs = [];
        window.gameState.npcs.push(flyingNpc);
    });

    console.log("Flying NPC injected.");

    // Test 1: Flying Vertical Move (Up)
    const moveUpResult = await page.evaluate(async () => {
        const npc = window.gameState.npcs.find(n => n.id === "test_hawk");
        const success = await window.attemptCharacterMove(npc, 'up_z', window.assetManager, 1);
        return { success, z: npc.mapPos.z };
    });

    expect(moveUpResult.success).toBe(true);
    expect(moveUpResult.z).toBe(1);
    console.log("Flying Up Test Passed");

    // Test 2: Flying Horizontal Move in Air
    // NPC is at 2,2,1. 2,3,1 is empty air.
    const moveHorizontalResult = await page.evaluate(async () => {
        const npc = window.gameState.npcs.find(n => n.id === "test_hawk");
        const success = await window.attemptCharacterMove(npc, 'down', window.assetManager, 1);
        return { success, y: npc.mapPos.y, z: npc.mapPos.z };
    });

    expect(moveHorizontalResult.success).toBe(true);
    expect(moveHorizontalResult.y).toBe(3);
    expect(moveHorizontalResult.z).toBe(1); // Should remain at Z=1
    console.log("Flying Horizontal Test Passed");

    // Test 3: Fall Check (Should NOT fall)
    const fallCheckResult = await page.evaluate(async () => {
        const npc = window.gameState.npcs.find(n => n.id === "test_hawk");
        // Trigger manual fall check just to be sure
        const fell = await window.handleFalling(npc, npc.mapPos.x, npc.mapPos.y, npc.mapPos.z);
        return { fell, z: npc.mapPos.z };
    });

    expect(fallCheckResult.fell).toBe(false);
    expect(fallCheckResult.z).toBe(1);
    console.log("Flying Fall Check Test Passed");

    // Test 4: Non-Flying NPC (Control Group)
    await page.evaluate(() => {
        const landNpc = {
            id: "test_coyote",
            name: "Test Coyote",
            mapPos: { x: 5, y: 5, z: 0 },
            currentMovementPoints: 10,
            tags: [], // No flying tag
            health: { torso: { current: 10, max: 10 } },
            facing: "right"
        };
        window.gameState.npcs.push(landNpc);
    });

    // Try to move land NPC up_z (should fail)
    const landMoveResult = await page.evaluate(async () => {
        const npc = window.gameState.npcs.find(n => n.id === "test_coyote");
        const success = await window.attemptCharacterMove(npc, 'up_z', window.assetManager, 1);
        return { success, z: npc.mapPos.z };
    });

    expect(landMoveResult.success).toBe(false);
    expect(landMoveResult.z).toBe(0);
    console.log("Non-Flying Vertical Move Test Passed (Blocked)");

    // Test 5: Flying into Wall (Should be blocked)
    // Inject a wall at 3,2,1
    await page.evaluate(() => {
        // Need to define a wall tile first.
        // Assuming assetManagerInstance is available and we can inject a definition.
        // Or simpler: update isTileStrictlyImpassable logic in test context? No, that's inside movementUtils.
        // We need to modify the map data to have a wall.
        // We'll update level 1 at 3,2 to be a wall.
        // And we need a tile definition for it that has 'impassable' tag.

        // Let's add a fake wall tile to tilesets
        window.assetManager.tilesets["wall_tile"] = {
            id: "wall_tile",
            name: "Test Wall",
            tags: ["impassable"]
        };

        const map = window.mapRenderer.getCurrentMapData();
        // Set middle layer at 3,2,1 to wall
        if (map.levels["1"] && map.levels["1"].middle) {
            // Ensure rows exist
            if (!map.levels["1"].middle[2]) map.levels["1"].middle[2] = [];
            map.levels["1"].middle[2][3] = { tileId: "wall_tile" };
        }
    });

    // Move Flying NPC to 2,2,1 (already there from test 2? No, test 2 moved to 2,3,1)
    // Move it back to 2,2,1
    await page.evaluate(() => {
        const npc = window.gameState.npcs.find(n => n.id === "test_hawk");
        npc.mapPos = { x: 2, y: 2, z: 1 };
    });

    // Try to move RIGHT to 3,2,1 (Wall)
    const wallMoveResult = await page.evaluate(async () => {
        const npc = window.gameState.npcs.find(n => n.id === "test_hawk");
        const success = await window.attemptCharacterMove(npc, 'right', window.assetManager, 1);
        return { success, x: npc.mapPos.x };
    });

    expect(wallMoveResult.success).toBe(false);
    expect(wallMoveResult.x).toBe(2); // Should not have moved
    console.log("Flying into Wall Test Passed (Blocked)");

});
