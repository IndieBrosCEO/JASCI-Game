// js/progression_tests.js

/**
 * Runs a suite of tests for the progression system.
 * This should be called from the developer console via a command.
 */
async function runProgressionSystemTests() {
    console.log("--- Running Progression System Foundational Tests ---");

    // Test Suite
    const results = {
        testSaveMigration: await testSaveMigration(),
        testLevelCurve: testLevelCurve(),
        testEventBus: testEventBus(),
        xpManagerTests: runXpManagerTests(),
        testCraftingRecipes: testCraftingRecipes()
    };

    // Summary
    console.log("--- Test Summary ---");
    let allPassed = true;
    for (const testName in results) {
        if (results[testName]) {
            console.log(`%c[PASS] ${testName}`, "color: green");
        } else {
            console.log(`%c[FAIL] ${testName}`, "color: red");
            allPassed = false;
        }
    }

    if (allPassed) {
        logToConsole("All progression system foundational tests passed!", "event-success");
    } else {
        logToConsole("One or more progression system tests failed. See console for details.", "error");
    }
    console.log("--- End of Progression System Tests ---");
}


/**
 * Test 1: Verifies that an old save file is correctly migrated to the new schema.
 */
async function testSaveMigration() {
    console.log("Running Save Migration Test...");

    // 1. Create a mock "old" save state.
    const oldSaveState = {
        gameStarted: true,
        player: {
            // No health object
        },
        stats: [
            { name: "Strength", points: 5 },
            { name: "Dexterity", points: 5 },
            { name: "Constitution", points: 12 }, // Con modifier of +1
            { name: "Intelligence", points: 5 },
            { name: "Perception", points: 5 },
            { name: "Willpower", points: 5 },
            { name: "Charisma", points: 5 },
            { name: "Marketing", points: 5 }
        ],
        // Missing all new fields: totalXp, level, unspentSkillPoints, etc.
    };

    // 2. Call the actual migration function.
    if (typeof window.migrateSaveData !== 'function') {
        console.error("Migration Test FAIL: migrateSaveData function not found.");
        return false;
    }
    const migratedState = window.migrateSaveData(JSON.parse(JSON.stringify(oldSaveState))); // Use a deep copy

    // 3. Assertions
    let passed = true;

    if (migratedState.level !== 1) {
        console.error(`FAIL: Expected level to be 1, but got ${migratedState.level}`);
        passed = false;
    }
    if (migratedState.totalXp !== 0) {
        console.error(`FAIL: Expected totalXp to be 0, but got ${migratedState.totalXp}`);
        passed = false;
    }
    if (migratedState.unspentSkillPoints !== 0) {
        console.error(`FAIL: Expected unspentSkillPoints to be 0, but got ${migratedState.unspentSkillPoints}`);
        passed = false;
    }
    if (migratedState.saveVersion !== 1) {
        console.error(`FAIL: Expected saveVersion to be 1, but got ${migratedState.saveVersion}`);
        passed = false;
    }

    // Check HP for a level 1 character. Should be base values only.
    const expectedHeadHp = 5;
    const expectedTorsoHp = 8;
    const expectedArmHp = 7;
    const expectedLegHp = 7;

    if (migratedState.player.health.head.max !== expectedHeadHp) {
        console.error(`FAIL: Expected head max HP to be ${expectedHeadHp}, but got ${migratedState.player.health.head.max}`);
        passed = false;
    }
    if (migratedState.player.health.torso.max !== expectedTorsoHp) {
        console.error(`FAIL: Expected torso max HP to be ${expectedTorsoHp}, but got ${migratedState.player.health.torso.max}`);
        passed = false;
    }
     if (migratedState.player.health.leftArm.max !== expectedArmHp) {
        console.error(`FAIL: Expected left arm max HP to be ${expectedArmHp}, but got ${migratedState.player.health.leftArm.max}`);
        passed = false;
    }
     if (migratedState.player.health.rightArm.max !== expectedArmHp) {
        console.error(`FAIL: Expected right arm max HP to be ${expectedArmHp}, but got ${migratedState.player.health.rightArm.max}`);
        passed = false;
    }
     if (migratedState.player.health.leftLeg.max !== expectedLegHp) {
        console.error(`FAIL: Expected left leg max HP to be ${expectedLegHp}, but got ${migratedState.player.health.leftLeg.max}`);
        passed = false;
    }
     if (migratedState.player.health.rightLeg.max !== expectedLegHp) {
        console.error(`FAIL: Expected right leg max HP to be ${expectedLegHp}, but got ${migratedState.player.health.rightLeg.max}`);
        passed = false;
    }

    return passed;
}

// Expose the test runner to the global scope so it can be called from the console.
window.runProgressionSystemTests = runProgressionSystemTests;

/**
 * Test 4: Verifies the correctness of a few fixed crafting recipes.
 */
function testCraftingRecipes() {
    console.log("Running Crafting Recipes Test...");

    if (!window.craftingManager) {
        console.error("Crafting Recipes Test FAIL: craftingManager not available.");
        return false;
    }

    let passed = true;

    // Test Case 1: Hand Saw (wood)
    const handSawWood = window.craftingManager.getRecipeById('hand_saw_wood');
    if (!handSawWood || !handSawWood.recipe || !handSawWood.recipe.components) {
        console.error("FAIL: 'hand_saw_wood' recipe not found or malformed.");
        passed = false;
    } else {
        const components = handSawWood.recipe.components;
        const wood = components.find(c => c.family === 'wood');
        const metalSheet = components.find(c => c.family === 'metal_sheet');
        if (!wood || wood.quantity !== 1 || !metalSheet || metalSheet.quantity !== 1) {
            console.error("FAIL: 'hand_saw_wood' recipe has incorrect components.", components);
            passed = false;
        }
    }

    // Test Case 2: Molotov Cocktail
    const molotov = window.craftingManager.getRecipeById('molotov_cocktail');
    if (!molotov || !molotov.recipe || !molotov.recipe.components) {
        console.error("FAIL: 'molotov_cocktail' recipe not found or malformed.");
        passed = false;
    } else {
        const components = molotov.recipe.components;
        const container = components.find(c => c.family === 'container');
        const fabric = components.find(c => c.family === 'fabric');
        const fuel = components.find(c => c.family === 'fuel');
        if (!container || container.quantity !== 1 || !fabric || fabric.quantity !== 1 || !fuel || fuel.quantity !== 1) {
            console.error("FAIL: 'molotov_cocktail' recipe has incorrect components.", components);
            passed = false;
        }
    }

    // Test Case 3: Leather Strips
    const leatherStrips = window.craftingManager.getRecipeById('leather_strips');
    if(!leatherStrips || !leatherStrips.recipe || !leatherStrips.recipe.components){
        console.error("FAIL: 'leather_strips' recipe not found or malformed.");
        passed = false;
    } else {
        const components = leatherStrips.recipe.components;
        const leather = components.find(c => c.family === 'leather');
        if(!leather || leather.quantity !== 1){
            console.error("FAIL: 'leather_strips' recipe has incorrect components.", components);
            passed = false;
        }
    }

    // Test Case 4: Candle
    const candle = window.craftingManager.getRecipeById('candle');
    if (!candle || !candle.recipe || !candle.recipe.components) {
        console.error("FAIL: 'candle' recipe not found or malformed.");
        passed = false;
    } else {
        const components = candle.recipe.components;
        const tallow = components.find(c => c.family === 'tallow');
        const fabric = components.find(c => c.family === 'fabric');
        if (!tallow || tallow.quantity !== 1 || !fabric || fabric.quantity !== 1) {
            console.error("FAIL: 'candle' recipe has incorrect components.", components);
            passed = false;
        }
    }

    return passed;
}

function runXpManagerTests() {
    console.log("Running XpManager tests...");

    if (!window.xpManager) {
        console.error("xpManager is not available on the window object. Tests cannot be run.");
        return false;
    }

    // Save original state
    const originalXp = window.gameState.totalXp;
    const originalLevel = window.gameState.level;
    const originalIdempotencyKeys = new Set(window.gameState.processedIdempotencyKeys);

    let allTestsPassed = true;

    // --- Test 1: Grant several sources, totals add up. ---
    try {
        // Setup
        window.gameState.totalXp = 100;
        window.gameState.processedIdempotencyKeys.clear();

        const initialXp = window.gameState.totalXp;
        window.xpManager.awardXp('kill', 10);
        window.xpManager.awardXp('quest_complete', 50);
        const finalXp = window.gameState.totalXp;

        if (finalXp === initialXp + 60) {
            console.log("Test 1 PASSED: Grant several sources, totals add up.");
        } else {
            console.error(`Test 1 FAILED: Expected ${initialXp + 60} XP, but got ${finalXp}.`);
            allTestsPassed = false;
        }
    } catch (error) {
        console.error("Test 1 FAILED with an error:", error);
        allTestsPassed = false;
    }

    // --- Test 2: Duplicate grant with same source id ignored when expected. ---
    try {
        // Setup
        window.gameState.totalXp = 100;
        window.gameState.processedIdempotencyKeys.clear();

        const initialXp = window.gameState.totalXp;
        window.xpManager.awardXp('quest_step', 25, { idempotencyKey: 'quest1_step1' });
        window.xpManager.awardXp('quest_step', 25, { idempotencyKey: 'quest1_step1' }); // This one should be ignored
        const finalXp = window.gameState.totalXp;

        if (finalXp === initialXp + 25) {
            console.log("Test 2 PASSED: Duplicate grant with same source id ignored when expected.");
        } else {
            console.error(`Test 2 FAILED: Expected ${initialXp + 25} XP, but got ${finalXp}.`);
            allTestsPassed = false;
        }
    } catch (error) {
        console.error("Test 2 FAILED with an error:", error);
        allTestsPassed = false;
    }

    // --- Test 3: XP bar reflects totals. ---
    try {
        // Setup
        window.gameState.totalXp = 0;
        window.gameState.level = 1;
        window.xpManager.setXp(150); // Use setXp to trigger the update event for the UI.

        const xpBar = document.getElementById('xpBar');
        const currentXp = window.gameState.totalXp;
        const levelCurve = window.assetManager.getLevelCurve();
        const currentLevelData = levelCurve.find(levelData => levelData.level === window.gameState.level);
        const nextLevelData = levelCurve.find(levelData => levelData.level === window.gameState.level + 1);
        const xpForNextLevel = nextLevelData.total - currentLevelData.total;
        const xpProgress = currentXp - currentLevelData.total;

        if (xpBar.value == xpProgress && xpBar.max == xpForNextLevel) {
            console.log("Test 3 PASSED: XP bar reflects totals.");
        } else {
            console.error(`Test 3 FAILED: XP bar does not reflect totals. Expected ${xpProgress}/${xpForNextLevel}, but got ${xpBar.value}/${xpBar.max}.`);
            allTestsPassed = false;
        }
    } catch (error) {
        console.error("Test 3 FAILED with an error:", error);
        allTestsPassed = false;
    }

    // Restore original state
    window.gameState.totalXp = originalXp;
    window.gameState.level = originalLevel;
    window.gameState.processedIdempotencyKeys = originalIdempotencyKeys;
    // Manually trigger an update to the XP bar to reflect the restored state.
    if (window.updateXpBar) {
        window.updateXpBar();
    }


    console.log("XpManager tests complete.");
    return allTestsPassed;
}

/**
 * Test 2: Verifies the integrity of the loaded level curve data.
 */
function testLevelCurve() {
    console.log("Running Level Curve Test...");
    const levelCurve = assetManager.getLevelCurve();

    if (!levelCurve || levelCurve.length === 0) {
        console.error("FAIL: Level curve data not found via assetManager.");
        return false;
    }

    let passed = true;

    // Check for exactly 50 entries
    if (levelCurve.length !== 50) {
        console.error(`FAIL: Expected 50 level entries, but found ${levelCurve.length}.`);
        passed = false;
    }

    // Check the final level's XP total
    const finalLevel = levelCurve[levelCurve.length - 1];
    const expectedFinalXp = 367500;
    if (finalLevel.total !== expectedFinalXp) {
        console.error(`FAIL: Expected final level (50) XP to be ${expectedFinalXp}, but got ${finalLevel.total}.`);
        passed = false;
    }

    // The validation check for strictly increasing is already in the main script,
    // so we trust that it covers that aspect. This test focuses on structure.

    return passed;
}

/**
 * Test 3: Verifies that the event bus can handle the new progression event names.
 */
function testEventBus() {
    console.log("Running Event Bus Test...");

    if (!window.EventManager) {
        console.error("FAIL: window.EventManager not found.");
        return false;
    }

    const newEvents = [
        'xp:awarded',
        'level:up',
        'rewards:granted',
        'perk:picked',
        'stats:allocated',
        'hp:increased'
    ];

    let passed = true;
    let eventsHeard = 0;

    // Note: The new EventManager uses the document's event system, so listeners
    // will exist across tests if not cleaned up. For this simple test, we'll
    // accept that, but a real test suite might need listener management.
    const listener = (detail) => {
        console.log(`Heard event with detail:`, detail);
        eventsHeard++;
    };

    // Subscribe to all new events
    for (const eventName of newEvents) {
        // We can't easily unsubscribe a static anonymous function,
        // but for this test, it's okay.
        window.EventManager.on(eventName, listener);
    }

    // Publish all new events
    for (const eventName of newEvents) {
        window.EventManager.dispatch(eventName, { test: "data", eventName: eventName });
    }

    // Due to the async nature of CustomEvents, we need a small delay
    // to allow the events to be processed.
    return new Promise(resolve => {
        setTimeout(() => {
            if (eventsHeard !== newEvents.length) {
                console.error(`FAIL: Expected to hear ${newEvents.length} events, but only heard ${eventsHeard}.`);
                passed = false;
            }

            // It's not straightforward to remove the listeners with this static class pattern,
            // so we'll just leave them. This is a known limitation of this test's scope.

            resolve(passed);
        }, 100); // 100ms should be plenty of time for the events to fire.
    });
}

// js/world_logic_tests.js

/**
 * Runs a suite of tests for the World Logic (Z-levels, Construction, Movement).
 * This should be called from the developer console.
 */
async function runWorldLogicTests() {
    console.log("--- Running World Logic Tests ---");

    const results = {
        testGhostWalls: await testGhostWalls(),
    };

    console.log("--- Test Summary ---");
    let allPassed = true;
    for (const testName in results) {
        if (results[testName]) {
            console.log(`%c[PASS] ${testName}`, "color: green");
        } else {
            console.log(`%c[FAIL] ${testName}`, "color: red");
            allPassed = false;
        }
    }

    if (allPassed) {
        logToConsole("All World Logic tests passed!", "event-success");
    } else {
        logToConsole("One or more World Logic tests failed. See console for details.", "error");
    }
    console.log("--- End of World Logic Tests ---");
}

/**
 * Test: Verifies that placing a wall correctly blocks movement (fixes "Ghost Wall" bug).
 * The bug was that constructions were placed on 'building' layer, but isWalkable only checked 'middle'.
 */
async function testGhostWalls() {
    console.log("Running Ghost Walls Test...");

    if (!window.constructionManager || !window.mapRenderer) {
        console.error("FAIL: Managers not available.");
        return false;
    }

    // 1. Find a clear spot near the player
    const startX = window.gameState.playerPos.x;
    const startY = window.gameState.playerPos.y;
    const z = window.gameState.playerPos.z;

    // Look for a spot 2 tiles away to avoid standing in it
    let testX = startX + 2;
    let testY = startY;

    // Ensure it's currently walkable and empty
    if (!window.mapRenderer.isWalkable(testX, testY, z)) {
        console.log(`Test spot (${testX},${testY},${z}) is not initially walkable. Trying another.`);
        testX = startX;
        testY = startY + 2;
        if (!window.mapRenderer.isWalkable(testX, testY, z)) {
             console.error("FAIL: Could not find a clear walkable spot to test construction.");
             return false;
        }
    }

    console.log(`Testing construction at (${testX}, ${testY}, ${z})`);

    // 2. Place a wall (using ID 'wall_wood_simple' which we know blocks movement)
    // We mock the inventory/skill check by bypassing canBuild if possible, or we just force it via internal method if accessible?
    // placeConstruction calls canBuild.
    // Let's force placement by bypassing checks or ensuring requirements met.
    // Easier: Just call the internal map update logic that ConstructionManager uses,
    // OR temporarily mock canBuild to return true.

    const originalCanBuild = window.constructionManager.canBuild;
    window.constructionManager.canBuild = () => true; // Mock true

    // We also need to mock inventory removal to avoid errors
    const originalRemoveItems = window.inventoryManager.removeItems;
    window.inventoryManager.removeItems = () => true; // Mock success

    const originalIsValidPlacement = window.constructionManager.isValidPlacement;
    window.constructionManager.isValidPlacement = () => true; // Assume valid

    let constructionId = "wall_wood_simple";
    // Ensure definition exists
    if (!window.constructionManager.constructionDefinitions[constructionId]) {
         console.error("FAIL: 'wall_wood_simple' definition not found.");
         // Cleanup
         window.constructionManager.canBuild = originalCanBuild;
         window.inventoryManager.removeItems = originalRemoveItems;
         window.constructionManager.isValidPlacement = originalIsValidPlacement;
         return false;
    }

    // Capture initial state of the tile on all layers
    const mapData = window.mapRenderer.getCurrentMapData();
    const levelData = mapData.levels[z.toString()];
    const initialBuilding = levelData.building ? levelData.building[testY][testX] : null;
    const initialMiddle = levelData.middle ? levelData.middle[testY][testX] : null;

    console.log(`Initial Tile State: Building='${initialBuilding}', Middle='${initialMiddle}'`);

    // Perform placement
    await window.constructionManager.placeConstruction(constructionId, { x: testX, y: testY, z: z });

    // 3. Verify Walkability
    const isWalkableAfter = window.mapRenderer.isWalkable(testX, testY, z);

    // Check where it was placed
    const finalBuilding = levelData.building ? levelData.building[testY][testX] : null;
    const finalMiddle = levelData.middle ? levelData.middle[testY][testX] : null;

    console.log(`Final Tile State: Building='${finalBuilding}', Middle='${finalMiddle}'`);
    console.log(`Is Walkable After Construction: ${isWalkableAfter}`);

    // Cleanup mocks
    window.constructionManager.canBuild = originalCanBuild;
    window.inventoryManager.removeItems = originalRemoveItems;
    window.constructionManager.isValidPlacement = originalIsValidPlacement;

    // Cleanup the wall (restore map)
    if (levelData.building) levelData.building[testY][testX] = initialBuilding;
    if (levelData.middle) levelData.middle[testY][testX] = initialMiddle;
    window.mapRenderer.scheduleRender();

    if (isWalkableAfter === true) {
        console.error("FAIL: Tile is still walkable after placing a wall! (Ghost Wall Bug)");
        return false;
    } else {
        console.log("PASS: Tile is blocked after placing a wall.");
        return true;
    }
}

// Expose
window.runWorldLogicTests = runWorldLogicTests;
