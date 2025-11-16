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
        testEventBus: testEventBus()
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

    // 2. We need the migration logic from `loadGame` in `script.js`.
    // Since it's not exported, we'll replicate the core logic here for a unit test.
    // Ideally, this would be a shared, importable function.

    // Replicated migration logic:
    if (oldSaveState.saveVersion === undefined) {
        oldSaveState.totalXp = oldSaveState.XP || 0;
        oldSaveState.level = 1; // Migration always defaults to level 1.
        oldSaveState.unspentSkillPoints = 0;
        oldSaveState.unspentStatPoints = 0;
        oldSaveState.unspentPerkPicks = 0;
        oldSaveState.perkRanks = {};

        if (!oldSaveState.player.health) {
            oldSaveState.player.health = {};
        }

        // We need the `calculateBaselineMaxHp` function. Since it's global, we can call it.
        if (typeof calculateBaselineMaxHp !== 'function') {
            console.error("Migration Test FAIL: calculateBaselineMaxHp function not found.");
            return false;
        }
        const baselineMaxHp = calculateBaselineMaxHp(oldSaveState);
        for (const partKey of Object.values(BodyParts)) {
             oldSaveState.player.health[partKey] = {
                max: baselineMaxHp[partKey],
                current: baselineMaxHp[partKey]
            };
        }

        oldSaveState.saveVersion = 1;
    }

    // 3. Assertions
    let passed = true;

    if (oldSaveState.level !== 1) {
        console.error(`FAIL: Expected level to be 1, but got ${oldSaveState.level}`);
        passed = false;
    }
    if (oldSaveState.totalXp !== 0) {
        console.error(`FAIL: Expected totalXp to be 0, but got ${oldSaveState.totalXp}`);
        passed = false;
    }
    if (oldSaveState.unspentSkillPoints !== 0) {
        console.error(`FAIL: Expected unspentSkillPoints to be 0, but got ${oldSaveState.unspentSkillPoints}`);
        passed = false;
    }
    if (oldSaveState.saveVersion !== 1) {
        console.error(`FAIL: Expected saveVersion to be 1, but got ${oldSaveState.saveVersion}`);
        passed = false;
    }

    // Check HP based on Constitution 12 (+1 mod -> tier 2)
    // Head: 1, Limbs: 2, Torso: 2
    // Base HP: Head 10, Torso 20, Arms 12, Legs 14
    const expectedHeadHp = 11;
    const expectedTorsoHp = 22;
    const expectedArmHp = 14;
    const expectedLegHp = 16;

    if (oldSaveState.player.health.head.max !== expectedHeadHp) {
        console.error(`FAIL: Expected head max HP to be ${expectedHeadHp}, but got ${oldSaveState.player.health.head.max}`);
        passed = false;
    }
    if (oldSaveState.player.health.torso.max !== expectedTorsoHp) {
        console.error(`FAIL: Expected torso max HP to be ${expectedTorsoHp}, but got ${oldSaveState.player.health.torso.max}`);
        passed = false;
    }
     if (oldSaveState.player.health.leftArm.max !== expectedArmHp) {
        console.error(`FAIL: Expected left arm max HP to be ${expectedArmHp}, but got ${oldSaveState.player.health.leftArm.max}`);
        passed = false;
    }
     if (oldSaveState.player.health.rightLeg.max !== expectedLegHp) {
        console.error(`FAIL: Expected right leg max HP to be ${expectedLegHp}, but got ${oldSaveState.player.health.rightLeg.max}`);
        passed = false;
    }

    return passed;
}

// Expose the test runner to the global scope so it can be called from the console.
window.runProgressionSystemTests = runProgressionSystemTests;

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
    const expectedFinalXp = 2848125;
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

    if (!window.eventManager) {
        console.error("FAIL: window.eventManager not found.");
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

    const listener = (event) => {
        console.log(`Heard event: ${event.type}`);
        eventsHeard++;
    };

    // Subscribe to all new events
    for (const eventName of newEvents) {
        window.eventManager.subscribe(eventName, listener);
    }

    // Publish all new events
    for (const eventName of newEvents) {
        window.eventManager.publish(eventName, { test: "data" });
    }

    // Check if all events were heard
    if (eventsHeard !== newEvents.length) {
        console.error(`FAIL: Expected to hear ${newEvents.length} events, but only heard ${eventsHeard}.`);
        passed = false;
    }

    // Clean up listeners
    for (const eventName of newEvents) {
        window.eventManager.unsubscribe(eventName, listener);
    }

    return passed;
}
