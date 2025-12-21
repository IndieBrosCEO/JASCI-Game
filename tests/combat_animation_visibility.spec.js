
const { test, expect } = require('@playwright/test');

test.describe('Combat Animation Visibility', () => {
  test('should not show dice roll animations for NPC vs NPC combat', async ({ page }) => {
    // 1. Initialize Game
    await page.goto('http://localhost:8000/index.html');
    await page.waitForSelector('#startGameButton');
    await page.click('#startGameButton');
    await page.waitForFunction(() => window.gameInitialized === true);

    // 2. Setup Scenario: Player, NPC A, NPC B
    await page.evaluate(() => {
        window.gameState.playerPos = { x: 5, y: 5, z: 0 };
        window.gameState.npcs = []; // Clear existing
        window.gameState.inventory.handSlots[0] = null; // Unarmed player

        // NPC A
        window.gameState.npcs.push({
            id: 'npc_a', name: 'NPC A', mapPos: { x: 6, y: 5, z: 0 },
            health: { torso: { current: 10, max: 10 }, head: { current: 10, max: 10 } },
            teamId: 2, symbol: 'A', color: 'red',
            skills: { "Unarmed": 5 }, stats: { "Strength": 5 }
        });

        // NPC B
        window.gameState.npcs.push({
            id: 'npc_b', name: 'NPC B', mapPos: { x: 7, y: 5, z: 0 },
            health: { torso: { current: 10, max: 10 }, head: { current: 10, max: 10 } },
            teamId: 3, symbol: 'B', color: 'blue',
            skills: { "Unarmed": 5 }, stats: { "Strength": 5 }
        });
    });

    // 3. Monitor playAnimation calls
    // We mock playAnimation to track calls
    await page.evaluate(() => {
        window.animationCalls = [];
        const originalPlayAnimation = window.animationManager.playAnimation;
        window.animationManager.playAnimation = function(type, data) {
            window.animationCalls.push({ type, data });
            // For testing, we can just resolve immediately or call original if we want visuals
            // Resolving immediately is faster for test
            if (data.onComplete) data.onComplete(5); // Return a dummy roll value
            return Promise.resolve();
        };
    });

    // 4. Force NPC A to attack NPC B (NPC vs NPC)
    await page.evaluate(async () => {
        const combatManager = window.combatManager; // Assuming global or attached to window
        const npcA = window.gameState.npcs[0];
        const npcB = window.gameState.npcs[1];

        // Start combat manually
        combatManager.startCombat([window.gameState, npcA, npcB]);

        // Mock current turn to be NPC A's
        combatManager.gameState.combatCurrentAttacker = npcA;
        combatManager.gameState.combatCurrentDefender = npcB;
        combatManager.gameState.pendingCombatAction = {
            attacker: npcA,
            defender: npcB,
            attackType: 'melee',
            actionType: 'attack',
            weapon: null // Unarmed
        };
        combatManager.gameState.combatPhase = 'resolveRolls';

        // Execute processAttack directly to verify logic
        await combatManager.processAttack();
    });

    // 5. Assert NO diceRoll animation
    const npcCalls = await page.evaluate(() => window.animationCalls);
    const npcDiceRolls = npcCalls.filter(c => c.type === 'diceRoll');
    console.log("NPC vs NPC Animations:", npcDiceRolls.length);
    expect(npcDiceRolls.length).toBe(0);


    // 6. Reset calls
    await page.evaluate(() => { window.animationCalls = []; });

    // 7. Force Player to attack NPC A (Player involved)
    await page.evaluate(async () => {
        const combatManager = window.combatManager;
        const player = window.gameState; // Player entity
        const npcA = window.gameState.npcs[0];

        combatManager.gameState.combatCurrentAttacker = player;
        combatManager.gameState.combatCurrentDefender = npcA;
        combatManager.gameState.pendingCombatAction = {
            attacker: player,
            defender: npcA,
            attackType: 'melee',
            actionType: 'attack',
            weapon: null
        };
        combatManager.gameState.combatPhase = 'resolveRolls';

        await combatManager.processAttack();
    });

    // 8. Assert diceRoll animation IS present
    const playerCalls = await page.evaluate(() => window.animationCalls);
    const playerDiceRolls = playerCalls.filter(c => c.type === 'diceRoll');
    console.log("Player vs NPC Animations:", playerDiceRolls.length);
    expect(playerDiceRolls.length).toBeGreaterThan(0);
  });
});
