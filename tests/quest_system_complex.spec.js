
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the game (local server)
    await page.goto('http://localhost:8000/index.html');

    // Wait for game initialization
    await page.waitForFunction(() => window.gameInitialized === true);
    console.log('Game initialized.');

    // Start the game
    await page.click('#startGameButton');
    await page.waitForTimeout(1000);

    // --- Start "The Grand Tour" Quest ---
    const questId = 'grand_tour';
    console.log(`Starting quest: ${questId}`);

    await page.evaluate((qid) => {
        return window.questManager.startQuest(qid);
    }, questId);

    // Verify quest is active
    let isActive = await page.evaluate((qid) => {
        return window.gameState.activeQuests.some(q => q.id === qid);
    }, questId);

    if (!isActive) {
        throw new Error('Quest "The Grand Tour" failed to start.');
    }
    console.log('Quest started.');

    // --- Objective 1: Visit (testMap) ---
    console.log('Testing VISIT objective...');
    // Simulate map transition to 'testMap'
    await page.evaluate(() => {
        // We simulate the call that script.js would make or directly invoke updateObjective
        // Ideally we test the hook. script.js initiateMapTransition calls updateObjective.
        // But initiateMapTransition is complex and async loading maps.
        // We can simulate the *result* of a map load by manually triggering the hook to verify the quest system logic works.
        // However, to test the hook itself, we should try to load a map.
        // 'testMap' exists in the repo? Let's assume it does or use the hook directly if map loading is flaky in headless.
        // Let's try the hook directly for stability, as we verified the hook code exists in previous step.
        window.questManager.updateObjective("visit", "testMap");
    });

    let visitProgress = await page.evaluate((qid) => {
        const q = window.gameState.activeQuests.find(q => q.id === qid);
        return q.objectives.find(o => o.type === 'visit').current;
    }, questId);

    if (visitProgress !== 1) {
        throw new Error(`Visit objective failed. Progress: ${visitProgress}`);
    }
    console.log('Visit objective complete.');

    // --- Objective 2: Kill (training_dummy) ---
    console.log('Testing KILL objective...');
    await page.evaluate(() => {
        // Simulate kill hook
        window.questManager.updateObjective("kill", "training_dummy");
    });

    let killProgress = await page.evaluate((qid) => {
        const q = window.gameState.activeQuests.find(q => q.id === qid);
        return q.objectives.find(o => o.type === 'kill').current;
    }, questId);

    if (killProgress !== 1) {
        throw new Error(`Kill objective failed. Progress: ${killProgress}`);
    }
    console.log('Kill objective complete.');

    // --- Objective 3: Collect (knife_melee) ---
    console.log('Testing COLLECT objective...');
    await page.evaluate(() => {
        // Simulate collect hook
        window.questManager.updateObjective("collect", "knife_melee", 1);
    });

    let collectProgress = await page.evaluate((qid) => {
        const q = window.gameState.activeQuests.find(q => q.id === qid);
        return q.objectives.find(o => o.type === 'collect').current;
    }, questId);

    if (collectProgress !== 1) {
        throw new Error(`Collect objective failed. Progress: ${collectProgress}`);
    }
    console.log('Collect objective complete.');

    // --- Objective 4: Talk (fish_joe) ---
    console.log('Testing TALK objective...');
    await page.evaluate(() => {
        // Talk is usually triggered via DialogueManager 'advanceQuest'
        // Simulating that call:
        window.questManager.updateObjective("talk", "fish_joe");
    });

    // --- Verify Completion ---
    let isCompleted = await page.evaluate((qid) => {
        return window.gameState.completedQuests.some(q => q.id === qid);
    }, questId);

    if (!isCompleted) {
        // Check why
        const questStatus = await page.evaluate((qid) => {
             const q = window.gameState.activeQuests.find(q => q.id === qid);
             return q ? JSON.stringify(q) : "Not in active";
        }, questId);
        throw new Error(`Quest failed to complete automatically. Status: ${questStatus}`);
    }
    console.log('Quest completed successfully.');

    // --- Verify Rewards ---
    const rewards = await page.evaluate(() => {
        return {
            xp: window.gameState.totalXp,
            gold: window.gameState.playerGold,
            hasMedkit: window.gameState.inventory.container.items.some(i => i.id === "medkit_basic")
        };
    });

    if (rewards.xp < 500) throw new Error(`XP reward missing. Got ${rewards.xp}`);
    if (rewards.gold < 100) throw new Error(`Gold reward missing. Got ${rewards.gold}`); // Assuming start 0
    if (!rewards.hasMedkit) throw new Error(`Item reward (medkit) missing.`);

    console.log('Rewards verified.');

    // --- Edge Case: Over-completion ---
    console.log('Testing Edge Case: Over-completion...');
    // Try to update objectives again on a completed quest (should do nothing)
    await page.evaluate(() => {
        window.questManager.updateObjective("kill", "training_dummy");
    });
    // Nothing to assert other than no errors, and state remains completed.

    // --- Edge Case: Concurrent Quests ---
    console.log('Testing Edge Case: Concurrent Quests...');
    await page.evaluate(() => {
        // Manually push two quests with same objective
        window.gameState.activeQuests.push({
            id: "q1", title: "Q1", status: "active",
            objectives: [{type: "kill", target: "rat", count: 1, current: 0}]
        });
        window.gameState.activeQuests.push({
            id: "q2", title: "Q2", status: "active",
            objectives: [{type: "kill", target: "rat", count: 1, current: 0}]
        });
        window.questManager.updateObjective("kill", "rat");
    });

    const concurrentResults = await page.evaluate(() => {
        // Check if both completed (since count was 1) or at least progressed
        // Since updateObjective calls checkQuestCompletion, they might be moved to completedQuests
        const q1Comp = window.gameState.completedQuests.find(q => q.id === "q1");
        const q2Comp = window.gameState.completedQuests.find(q => q.id === "q2");
        return { q1: !!q1Comp, q2: !!q2Comp };
    });

    if (!concurrentResults.q1 || !concurrentResults.q2) {
        throw new Error("Concurrent quest update failed. Both quests should have completed.");
    }
    console.log('Concurrent quests verified.');

    // --- Edge Case: Invalid Inputs ---
    console.log('Testing Edge Case: Invalid Inputs...');
    await page.evaluate(() => {
        window.questManager.updateObjective("dance", "macarena"); // Unknown type
        window.questManager.updateObjective("kill", null); // Null target
    });
    console.log('Invalid inputs handled (no crash).');


    console.log('Complex Quest Test Suite PASSED.');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
