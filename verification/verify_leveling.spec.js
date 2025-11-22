const { test, expect } = require('@playwright/test');

test.describe('Game Mechanics Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the game page
        await page.goto('http://localhost:8000');

        // Wait for initialization
        await page.waitForFunction(() => window.gameInitialized === true);

        // Start the game (click Start Game button if present)
        const startButton = await page.$('#startGameButton');
        if (startButton) {
            await startButton.click();
        }

        // Wait for gameState to be ready
        await page.waitForFunction(() => window.gameState && window.gameState.gameStarted);
    });

    test('XP Gain and Leveling', async ({ page }) => {
        // Check initial state
        const initialLevel = await page.evaluate(() => window.gameState.level);
        const initialXP = await page.evaluate(() => window.gameState.totalXp);
        expect(initialLevel).toBe(1);
        expect(initialXP).toBe(0);

        // Award XP to trigger level up (Level 2 needs 300 XP)
        await page.evaluate(() => window.xpManager.awardXp('test', 300));

        // Check new state
        const newLevel = await page.evaluate(() => window.gameState.level);
        const newXP = await page.evaluate(() => window.gameState.totalXp);

        expect(newXP).toBe(300);
        expect(newLevel).toBe(2);

        // Check rewards: +16 Skill Points
        // Initial unspentSkillPoints is 30 (from gameState.js)
        const unspentSkillPoints = await page.evaluate(() => window.gameState.unspentSkillPoints);
        expect(unspentSkillPoints).toBe(30 + 16);

        // Check HP Increase (Con mod is likely 0 or +1 based on default stats)
        // Default Con is 3. Mod = floor(3/2)-1 = 0.
        // Table for Mod 0: Head+1, Limbs+1, Torso+2.
        // Base HP (initHealth): Head 5, Torso 8, Arms 7, Legs 7.
        // Expected: Head 6, Torso 10, Arms 8, Legs 8.

        const health = await page.evaluate(() => window.gameState.player.health);
        expect(health.head.max).toBe(6);
        expect(health.torso.max).toBe(10);
        expect(health.leftArm.max).toBe(8);
    });

    test('Perk System', async ({ page }) => {
        // Level up to 3 to get a perk pick
        await page.evaluate(() => window.xpManager.awardXp('test', 900)); // Level 3

        const level = await page.evaluate(() => window.gameState.level);
        expect(level).toBe(3);

        const perkPicks = await page.evaluate(() => window.gameState.unspentPerkPicks);
        expect(perkPicks).toBe(1); // 1 pick at level 3

        // Unlock "Fortified Frame" (Con perk) -> +1 Max HP all parts
        // First, get current max HP
        const prePerkHealth = await page.evaluate(() => JSON.parse(JSON.stringify(window.gameState.player.health)));

        // Unlock perk
        const unlockResult = await page.evaluate(() => window.perkManager.unlockPerk("Fortified Frame"));
        expect(unlockResult).toBe(true);

        // Verify perk is active
        const hasPerk = await page.evaluate(() => window.perkManager.hasPerk("Fortified Frame"));
        expect(hasPerk).toBe(true);

        // Verify Effect: HP increase
        const postPerkHealth = await page.evaluate(() => window.gameState.player.health);
        expect(postPerkHealth.head.max).toBe(prePerkHealth.head.max + 1);
        expect(postPerkHealth.torso.max).toBe(prePerkHealth.torso.max + 1);

        // Verify pick consumed
        const remainingPicks = await page.evaluate(() => window.gameState.unspentPerkPicks);
        expect(remainingPicks).toBe(0);
    });

    test('Stat Increase at Level 5', async ({ page }) => {
        // Level up to 5
        await page.evaluate(() => window.xpManager.awardXp('test', 3000)); // Level 5

        const level = await page.evaluate(() => window.gameState.level);
        expect(level).toBe(5);

        const statPoints = await page.evaluate(() => window.gameState.unspentStatPoints);
        expect(statPoints).toBe(2); // +2 at level 5
    });
});
