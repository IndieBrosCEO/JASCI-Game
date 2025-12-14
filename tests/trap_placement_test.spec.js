
const { test, expect } = require('@playwright/test');

test.describe('Trap Placement System', () => {
    test('Should allow player to place a trap from inventory', async ({ page }) => {
        // Enable console logging from the page
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        // 1. Initialize game
        await page.goto('http://localhost:8000');
        await page.waitForSelector('#startGameButton', { timeout: 10000 });
        await page.click('#startGameButton');
        await page.waitForFunction(() => window.gameInitialized === true);

        // 2. Add trap kit to inventory and boost skills
        await page.evaluate(() => {
            const trapItemDef = window.assetManager.getItem('pressure_plate_dart_trap_kit');
            if (trapItemDef) {
                window.inventoryManager.addItem(new window.Item(trapItemDef));
                console.log("Added trap kit to inventory.");
            } else {
                console.error("Trap item definition not found for test!");
            }

            // Boost skills to ensure placement success
            const player = window.gameState.player;
            const skill = player.skills.find(s => s.name === "Survival");
            if (skill) {
                skill.points = 20; // Max skill
                console.log("Boosted Survival skill to 20.");
            } else {
                console.error("Survival skill not found on player.");
            }
            // Also boost stats just in case
            window.gameState.stats.forEach(s => s.points = 10);
        });

        // 3. Open inventory and verify item is present
        await page.keyboard.press('i');
        // Wait for inventory to render
        await page.waitForSelector('#inventoryListPlayer .inventory-item', { state: 'visible', timeout: 2000 }).catch(() => console.log("Inventory items not visible yet"));

        const inventoryContent = await page.textContent('#inventoryListPlayer');
        expect(inventoryContent).toContain('Dart Trap Kit');

        // 4. Use the trap kit to enter placement mode
        await page.evaluate(() => {
            const item = window.gameState.inventory.container.items.find(i => i.id === 'pressure_plate_dart_trap_kit');
            if (item) {
                // Mock selection
                window.gameState.inventory.currentlyDisplayedItems = [{...item, source: 'container', globalIndex: 0}];
                window.gameState.inventory.cursor = 0;
                window.inventoryManager.interactInventoryItem();
                console.log("Interacted with trap item.");
            } else {
                console.error("Item not found in inventory for interaction.");
            }
        });

        // 5. Verify placement mode is active
        const isPlacementMode = await page.evaluate(() => window.gameState.isTrapPlacementMode);
        console.log("Is Placement Mode:", isPlacementMode);
        expect(isPlacementMode).toBe(true);

        // 6. Find valid placement tile and attempt placement
        const result = await page.evaluate(() => {
            const playerPos = window.gameState.playerPos;
            console.log("Player Pos:", playerPos);
            // Scan neighbors for a valid spot
            const neighbors = [
                {dx: 1, dy: 0}, {dx: -1, dy: 0}, {dx: 0, dy: 1}, {dx: 0, dy: -1}
            ];

            for (const n of neighbors) {
                const tx = playerPos.x + n.dx;
                const ty = playerPos.y + n.dy;
                const tz = playerPos.z;

                // Check passability
                // Use default passability logic if mapUtils missing (test context issue) or use mapUtils if available
                let passable = true;
                if (window.mapUtils) {
                    passable = window.mapUtils.isTilePassable(tx, ty, tz, window.gameState.player, false);
                } else if (window.mapRenderer) {
                    passable = window.mapRenderer.isWalkable(tx, ty, tz) && !window.mapRenderer.isTileOccupied(tx, ty, tz); // Fallback
                }

                const hasTrap = window.trapManager.getTrapAt(tx, ty, tz);
                console.log(`Checking tile (${tx},${ty},${tz}): Passable=${passable}, HasTrap=${!!hasTrap}`);

                if (passable && !hasTrap) {
                    // Found valid spot
                    console.log(`Attempting to place trap at (${tx},${ty},${tz})...`);
                    const success = window.trapManager.attemptPlaceTrap('pressure_plate_dart_trap_kit', tx, ty, tz, window.gameState.player);
                    return { success, x: tx, y: ty, z: tz };
                }
            }
            return { success: false, reason: "No valid tile found" };
        });

        console.log("Placement Result:", result);
        expect(result.success).toBe(true);

        // 7. Verify trap exists in gameState
        const trapExists = await page.evaluate(({x, y, z}) => {
            return window.gameState.currentMapTraps.some(t => t.x === x && t.y === y && t.z === z);
        }, result);

        expect(trapExists).toBe(true);

        // 8. Verify item consumed
        const itemInInventory = await page.evaluate(() => {
            return window.gameState.inventory.container.items.find(i => i.id === 'pressure_plate_dart_trap_kit');
        });
        expect(itemInInventory).toBeUndefined();
    });
});
