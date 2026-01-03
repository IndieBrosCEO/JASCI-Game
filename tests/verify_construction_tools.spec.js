
const { test, expect } = require('@playwright/test');

test('construction tool requirements check', async ({ page }) => {
    // 1. Start the game (assuming hosted on localhost:8000)
    await page.goto('http://localhost:8000');

    // Wait for game to initialize
    await page.waitForSelector('#startGameButton', { state: 'visible', timeout: 30000 });
    await page.click('#startGameButton');

    // Wait for main UI
    await page.waitForSelector('#mapContainer', { timeout: 30000 });

    await page.waitForTimeout(1000);

    // Inject logic to give player skills but NO tools
    await page.evaluate(() => {
        if (!window.gameState) return;
        if (!window.gameState.inventory.container) {
             window.gameState.inventory.container = { items: [], maxSlots: 10 };
        }

        window.gameState.skills.Repair = 100;
        window.gameState.skills.Survival = 100;
        window.gameState.stats.Strength = 100;

        // Clear items
        window.gameState.inventory.container.items = [];
        window.gameState.inventory.handSlots = [null, null];

        const plankDef = window.assetManager.getItem('plank');
        const nailDef = window.assetManager.getItem('nail');

        if (plankDef && nailDef) {
             const planks = new window.Item(plankDef); planks.quantity = 20;
             const nails = new window.Item(nailDef); nails.quantity = 20;
             window.gameState.inventory.container.items.push(planks);
             window.gameState.inventory.container.items.push(nails);
        }
    });

    // Press 'B' to open construction menu
    await page.keyboard.press('b');

    // Wait for UI
    await page.waitForSelector('#constructionUI', { state: 'visible' });

    // Click "Defensive" category
    // ConstructionUI creates LIs with text content = Category Name
    const categoryList = page.locator('#constructionCategoryList');
    await expect(categoryList).toBeVisible();
    const defensiveCat = categoryList.locator('li').filter({ hasText: 'Defensive' }).first();
    await expect(defensiveCat).toBeVisible();
    await defensiveCat.click();

    // Click on "Wood Wall"
    const wallOption = page.locator('#constructionBuildableList li').filter({ hasText: 'Wood Wall' }).first();
    await expect(wallOption).toBeVisible();
    await wallOption.click();

    // Check tool req NOT met
    // Note: My fix added tools to #detailConstructionComponents
    const toolReq = page.locator('#detailConstructionComponents li').filter({ hasText: 'Tool:' }).first();
    await expect(toolReq).toBeVisible();

    // Check if it has the req-not-met class (either on li or child span)
    // My implementation puts class on span inside li?
    // Let's check inner text to be sure
    await expect(toolReq).toContainText('Ball-Peen Hammer');

    // Check button disabled
    await expect(page.locator('#selectConstructionButton')).toBeDisabled();

    // Screenshot 1
    await page.screenshot({ path: 'test-results/construction_tools_missing.png' });

    // Give Tool
    await page.evaluate(() => {
         const hammerDef = window.assetManager.getItem('hammer_peen');
         const hammer = new window.Item(hammerDef);
         window.gameState.inventory.container.items.push(hammer);
    });

    // Re-click to refresh
    await wallOption.click();

    // Check button enabled
    await expect(page.locator('#selectConstructionButton')).toBeEnabled();

    // Screenshot 2
    await page.screenshot({ path: 'test-results/construction_tools_present.png' });
});
