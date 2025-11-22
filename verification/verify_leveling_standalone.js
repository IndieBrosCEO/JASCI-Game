const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log("Navigating to game...");
        // detailed logging for console messages
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', exception => console.log(`PAGE ERROR: "${exception}"`));

        await page.goto('http://localhost:8000');

        // Wait for initialization
        await page.waitForFunction(() => window.gameInitialized === true, { timeout: 5000 });
        console.log("Game initialized.");

        // Start the game
        const startButton = await page.$('#startGameButton');
        if (startButton) {
            await startButton.click();
            console.log("Clicked Start Game.");
        }

        await page.waitForFunction(() => window.gameState && window.gameState.gameStarted, { timeout: 5000 });
        console.log("Game state started.");

        // --- XP Gain and Leveling ---
        const initialLevel = await page.evaluate(() => window.gameState.level);
        const initialXP = await page.evaluate(() => window.gameState.totalXp);
        console.log(`Initial Level: ${initialLevel}, XP: ${initialXP}`);

        if (initialLevel !== 1 || initialXP !== 0) throw new Error("Initial state incorrect");

        // Award XP
        await page.evaluate(() => window.xpManager.awardXp('test', 300));
        console.log("Awarded 300 XP.");

        const newLevel = await page.evaluate(() => window.gameState.level);
        const newXP = await page.evaluate(() => window.gameState.totalXp);
        console.log(`New Level: ${newLevel}, XP: ${newXP}`);

        if (newLevel !== 2) throw new Error(`Level Up Failed. Expected 2, got ${newLevel}`);

        // Check Skill Points
        const unspentSkillPoints = await page.evaluate(() => window.gameState.unspentSkillPoints);
        // 30 initial + 16 level up = 46
        if (unspentSkillPoints !== 46) throw new Error(`Skill Points Incorrect. Expected 46, got ${unspentSkillPoints}`);
        console.log("Skill Points verification passed.");

        // Check HP Increase
        // Con 3 -> Mod 0 -> Head+1, Torso+2
        // Base: Head 5, Torso 8
        // Expected: Head 6, Torso 10
        const health = await page.evaluate(() => window.gameState.player.health);
        console.log(`Health: Head Max ${health.head.max}, Torso Max ${health.torso.max}`);
        if (health.head.max !== 6 || health.torso.max !== 10) throw new Error("HP Increase Failed.");
        console.log("HP Increase verification passed.");

        // --- Perk System ---
        // Level up to 3
        await page.evaluate(() => window.xpManager.awardXp('test', 600)); // Total 900
        const level3 = await page.evaluate(() => window.gameState.level);
        console.log(`Level is now ${level3}`);
        if (level3 !== 3) throw new Error("Failed to reach Level 3");

        const perkPicks = await page.evaluate(() => window.gameState.unspentPerkPicks);
        if (perkPicks !== 1) throw new Error(`Perk Picks Incorrect. Expected 1, got ${perkPicks}`);
        console.log("Perk Picks verification passed.");

        // Unlock "Fortified Frame"
        const prePerkTorsoMax = await page.evaluate(() => window.gameState.player.health.torso.max);

        const unlockResult = await page.evaluate(() => window.perkManager.unlockPerk("Fortified Frame"));
        if (unlockResult !== true) throw new Error("Failed to unlock perk 'Fortified Frame'");

        const hasPerk = await page.evaluate(() => window.perkManager.hasPerk("Fortified Frame"));
        if (!hasPerk) throw new Error("Perk not active after unlock.");
        console.log("Perk unlocked successfully.");

        // Verify Effect (+1 Max HP)
        const postPerkTorsoMax = await page.evaluate(() => window.gameState.player.health.torso.max);
        console.log(`Torso Max HP: Pre ${prePerkTorsoMax} -> Post ${postPerkTorsoMax}`);
        if (postPerkTorsoMax !== prePerkTorsoMax + 1) throw new Error("Perk Effect Failed: HP did not increase.");

        // Verify Pick Consumption
        const finalPicks = await page.evaluate(() => window.gameState.unspentPerkPicks);
        if (finalPicks !== 0) throw new Error("Perk pick was not consumed.");
        console.log("Perk system verification passed.");

        // Unlock "Evasive Footwork" (Force add logic or assume next level)
        // Let's level to 6 to get another pick
        await page.evaluate(() => window.xpManager.awardXp('test', 3600)); // Total 4500 (Level 6)
        const level6 = await page.evaluate(() => window.gameState.level);
        console.log(`Level is now ${level6}`);

        await page.evaluate(() => window.perkManager.unlockPerk("Evasive Footwork"));
        const hasEvasive = await page.evaluate(() => window.perkManager.hasPerk("Evasive Footwork"));
        if (!hasEvasive) throw new Error("Failed to unlock 'Evasive Footwork'");
        console.log("Unlocked 'Evasive Footwork'");

        // Verify Dodge Calculation with Perk
        // Create a dummy attacker
        await page.evaluate(() => {
            window.testAttacker = { name: "TestAttacker", id: "test_attacker", stats: [] };
            window.gameState.isInCombat = true; // Mock combat
        });

        const defenseResult = await page.evaluate(() => {
            return window.combatManager.calculateDefenseRoll(window.gameState, "Dodge", null, 0, {});
        });

        // Check if "Perk (Evasive Footwork): +1" is in detailedModifiers
        const modFound = defenseResult.detailedModifiers.some(m => m.text === "Perk (Evasive Footwork): +1");
        if (!modFound) throw new Error("Evasive Footwork modifier not found in defense roll.");
        console.log("Evasive Footwork modifier verified.");


        // --- Stat Increase ---
        // Already leveled to 6 (passed 5), should have 2 stat points
        const statPoints = await page.evaluate(() => window.gameState.unspentStatPoints);
        if (statPoints !== 2) throw new Error(`Stat Points Incorrect. Expected 2, got ${statPoints}`);
        console.log("Stat Increase verification passed.");

        console.log("ALL TESTS PASSED.");

    } catch (error) {
        console.error("TEST FAILED:", error);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
