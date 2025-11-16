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
