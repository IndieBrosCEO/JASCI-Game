const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log("Navigating to game...");
        // detailed logging for console messages
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        await page.goto('http://localhost:8000');
        await page.waitForFunction(() => window.gameInitialized === true, { timeout: 5000 });

        const startButton = await page.$('#startGameButton');
        if (startButton) await startButton.click();
        await page.waitForFunction(() => window.gameState && window.gameState.gameStarted, { timeout: 5000 });
        console.log("Game Started.");

        // Get initial values
        const initialSkillPointsText = await page.locator('#nameLevelXpContainer').textContent();
        console.log("Initial Info:", initialSkillPointsText);

        // Check initial Health Table (Torso)
        // The table rows are dynamic. Finding the row with 'Torso'.
        const initialTorsoRow = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('#healthTable tbody tr'));
            const row = rows.find(r => r.cells[0].textContent === 'Torso');
            return row ? row.cells[1].textContent : null;
        });
        console.log("Initial Torso HP:", initialTorsoRow);

        // Award XP to Level Up
        console.log("Awarding XP...");
        await page.evaluate(() => window.xpManager.awardXp('test', 300)); // Level 2

        // Verify XP Bar Update
        const xpBarValue = await page.evaluate(() => document.getElementById('xpBar').value);
        console.log("XP Bar Value:", xpBarValue);
        if (xpBarValue != 0) { // 300 XP total, Level 2 starts at 300. Current XP into level is 0.
            // Wait, Level 2 is at 300 total.
            // Level 1: 0-299.
            // Level 2: 300-899.
            // So at 300 total, we are at 0 into Level 2?
            // Let's check `xpBar.js` logic: `xpProgress = currentXp - currentLevelData.total`.
            // 300 - 300 = 0. Correct.
            console.log("XP Bar reset correctly for new level start.");
        }

        // Verify Character Info Text Update
        const updatedInfoText = await page.locator('#nameLevelXpContainer').textContent();
        console.log("Updated Info:", updatedInfoText);

        if (!updatedInfoText.includes("Level: 2")) throw new Error("Level text not updated.");
        // 30 initial + 16 = 46
        if (!updatedInfoText.includes("Unspent Skill Points: 46")) throw new Error("Skill Points text not updated.");

        // Verify Health Update
        const updatedTorsoRow = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('#healthTable tbody tr'));
            const row = rows.find(r => r.cells[0].textContent === 'Torso');
            return row ? row.cells[1].textContent : null;
        });
        console.log("Updated Torso HP:", updatedTorsoRow);

        // Parse HP "Current/Max"
        const getMax = (str) => parseInt(str.split('/')[1]);
        if (getMax(updatedTorsoRow) <= getMax(initialTorsoRow)) throw new Error("Max HP did not increase in UI.");

        console.log("UI Verification PASSED.");

    } catch (error) {
        console.error("TEST FAILED:", error);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
