const { test, expect } = require('@playwright/test');

test('MapMaker Portal Edit Verification', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // 1. Navigate to Map Maker via local server
    await page.goto('http://localhost:8000/mapMaker/mapMaker.html');

    // Wait for initialization
    await page.waitForTimeout(1000);

    // 2. Select Portal Tool
    await page.click('button[data-tool="portal"]');

    // 3. Place a portal at 8,8
    const targetCellSelector = '.cell[data-x="8"][data-y="8"]';
    await page.click(targetCellSelector);

    // Verify Portal Data
    const portalData = await page.evaluate(() => {
        return window.getMapData().portals;
    });
    console.log('Portal Data after placement:', JSON.stringify(portalData));

    // 4. Select the "Select" tool
    await page.click('button[data-tool="selectInspect"]');

    // 5. Click on the placed portal
    await page.click(targetCellSelector);

    // 6. Verify that the Portal Config UI is visible
    const portalConfigControls = page.locator('#portalConfigControls');

    // Debugging UI state
    const isVisible = await portalConfigControls.isVisible();
    console.log('Is portal config visible?', isVisible);

    if (!isVisible) {
        const selectedInfo = await page.locator('#selectedPortalInfo').textContent();
        console.log('Selected Portal Info Text:', selectedInfo);
    }

    await expect(portalConfigControls).toBeVisible();

    // 7. Verify we are editing a portal
    const selectedPortalInfo = page.locator('#selectedPortalInfo');
    await expect(selectedPortalInfo).toContainText('Selected Portal:');

    // 8. Edit Portal Properties
    const targetMapIdInput = page.locator('#portalTargetMapId');
    await targetMapIdInput.fill('new_dest_map');

    const saveBtn = page.locator('#savePortalPropertiesBtn');
    await saveBtn.click();

    // 9. Deselect (click empty space)
    await page.click('.cell[data-x="0"][data-y="0"]');
    await expect(portalConfigControls).toBeHidden();

    // 10. Re-select the portal
    await page.click(targetCellSelector);
    await expect(portalConfigControls).toBeVisible();

    // 11. Verify persistence
    await expect(targetMapIdInput).toHaveValue('new_dest_map');
});
