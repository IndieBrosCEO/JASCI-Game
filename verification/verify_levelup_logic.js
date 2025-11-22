const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log("Navigating to game...");
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.goto('http://localhost:8000');

        await page.waitForFunction(() => window.gameInitialized === true, { timeout: 5000 });

        const startButton = await page.$('#startGameButton');
        if (startButton) await startButton.click();

        await page.waitForFunction(() => window.gameState && window.gameState.gameStarted, { timeout: 5000 });
        console.log("Game Started.");

        // Initial Stats check (Assuming default Str=3)
        const initialStr = await page.evaluate(() => window.gameState.stats.find(s => s.name === 'Strength').points);
        console.log("Initial Strength:", initialStr);

        // Award XP for Level 5 (where +2 Stat points are given)
        await page.evaluate(() => window.xpManager.awardXp('test', 3000));

        // Check Stat Points
        const statPoints = await page.evaluate(() => window.gameState.unspentStatPoints);
        console.log("Unspent Stat Points:", statPoints);
        if (statPoints !== 2) throw new Error("Stat points not awarded correctly at level 5.");

        // Open Level Up UI
        await page.evaluate(() => window.levelUpUI.show());

        // Increase Strength
        console.log("Increasing Strength via UI...");
        // Find button for Strength (text "Strength (3) +")
        // We can just call the method directly to be safe for headless, or simulate click.
        // Let's simulate logic call to verify `increaseStat` fix specifically.
        await page.evaluate(() => window.levelUpUI.increaseStat('Strength'));

        const newStr = await page.evaluate(() => window.gameState.stats.find(s => s.name === 'Strength').points);
        console.log("New Strength:", newStr);

        if (newStr !== initialStr + 1) throw new Error(`Strength reset or incorrect increment. Expected ${initialStr + 1}, got ${newStr}`);

        // Increase again to check it doesn't reset to 2 on second click (if logic was set=2)
        await page.evaluate(() => window.levelUpUI.increaseStat('Strength'));
        const newerStr = await page.evaluate(() => window.gameState.stats.find(s => s.name === 'Strength').points);
        console.log("Newer Strength:", newerStr);
        if (newerStr !== initialStr + 2) throw new Error(`Strength reset on second increment. Expected ${initialStr + 2}, got ${newerStr}`);


        // --- Skill Points Test ---
        const initialSkillVal = await page.evaluate(() => window.gameState.skills.find(s => s.name === 'Unarmed').points);
        const initialUnspentSkills = await page.evaluate(() => window.gameState.unspentSkillPoints);
        console.log(`Initial Unarmed: ${initialSkillVal}, Unspent: ${initialUnspentSkills}`);

        // Increase Skill via UI method
        console.log("Increasing Unarmed Skill via UI...");
        await page.evaluate(() => window.levelUpUI.increaseSkill('Unarmed'));

        const newSkillVal = await page.evaluate(() => window.gameState.skills.find(s => s.name === 'Unarmed').points);
        const newUnspentSkills = await page.evaluate(() => window.gameState.unspentSkillPoints);
        console.log(`New Unarmed: ${newSkillVal}, New Unspent: ${newUnspentSkills}`);

        if (newSkillVal !== initialSkillVal + 1) throw new Error("Skill did not increment.");
        if (newUnspentSkills !== initialUnspentSkills - 1) throw new Error("Skill point not consumed.");

        console.log("Level Up UI Logic Verification PASSED.");

    } catch (error) {
        console.error("TEST FAILED:", error);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
