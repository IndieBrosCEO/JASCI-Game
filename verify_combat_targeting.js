const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log(msg.text()));

    try {
        await page.goto('http://127.0.0.1:8000', { waitUntil: 'networkidle' });

        // Wait for the game to initialize and for NPCs to be loaded
        await page.waitForFunction(() => window.gameState && window.gameState.npcs && window.gameState.npcs.length > 0, null, { timeout: 15000 });

        // 1. Test 'F' key combat initiation
        console.log("Running test: 'F' key combat initiation...");

        // Manually select the first NPC as the target
        await page.evaluate(() => {
            const firstNpc = window.gameState.npcs[0];
            if (firstNpc) {
                window.gameState.selectedTargetEntity = firstNpc;
                console.log(`Manually selected target: ${firstNpc.name}`);
            }
        });

        // Get the initial target to confirm it was set
        const initialTarget = await page.evaluate(() => {
            return window.gameState.selectedTargetEntity;
        });

        assert(initialTarget, "[FAILURE] No initial target found after manual selection.");

        // Press 'F' to start combat
        await page.press('body', 'f');

        // Add a small delay for combat to start
        await page.waitForTimeout(500);

        // Verify that combat has started
        const inCombat = await page.evaluate(() => window.gameState.isInCombat);
        assert(inCombat, "[FAILURE] Combat did not start after pressing 'f'.");

        // Verify that the correct target is selected
        const combatTarget = await page.evaluate(() => window.gameState.combatCurrentDefender);
        assert(combatTarget, "[FAILURE] combatCurrentDefender is not set.");
        assert.deepStrictEqual(combatTarget.id, initialTarget.id, `[FAILURE] The wrong target was selected in combat. Expected ${initialTarget.id}, got ${combatTarget.id}`);

        // Add a console.assert for immediate debugging in the browser console
        await page.evaluate((expectedId) => {
            console.assert(window.gameState.combatCurrentDefender.id === expectedId, `[CONSOLE ASSERT FAILURE] Defender mismatch. Expected ${expectedId}, got ${window.gameState.combatCurrentDefender.id}`);
        }, initialTarget.id);

        console.log("[SUCCESS] 'F' key combat initiation test passed.");

        // End combat to reset state for the next test
        await page.evaluate(() => {
            if (window.combatManager) {
                window.combatManager.endCombat();
            }
        });

        // 2. Test 'R' key for "Nearby Entities" panel
        console.log("Running test: 'R' key for 'Nearby Entities' panel...");

        // Press 'R' to open the panel
        await page.press('body', 'r');
        await page.waitForSelector('#nearbyEntitiesPanel', { state: 'visible' });

        const isPanelVisible = await page.isVisible('#nearbyEntitiesPanel');
        assert(isPanelVisible, "[FAILURE] 'Nearby Entities' panel is not visible after pressing 'R'.");

        // Hover over an entity in the panel
        await page.hover('#nearbyEntitiesPanel .nearby-entity-entry');

        // Check if the entity is highlighted
        const isEntityHighlighted = await page.evaluate(() => {
            const entry = document.querySelector('#nearbyEntitiesPanel .nearby-entity-entry');
            if (!entry) return false;
            const event = new MouseEvent('mouseover', { view: window, bubbles: true, cancelable: true });
            entry.dispatchEvent(event);
            return window.gameState.highlightedEntity === entry.dataset.entityId;
        });
        assert(isEntityHighlighted, "[FAILURE] Hovering over entity in panel did not highlight it on the map.");

        console.log("[SUCCESS] 'R' key for 'Nearby Entities' panel test passed.");

    } catch (error) {
        console.error(error.message);
        // Take screenshot on failure
        const screenshotPath = `test-results/failure-screenshot-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot saved to ${screenshotPath}`);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
