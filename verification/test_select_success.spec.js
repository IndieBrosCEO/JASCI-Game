const { test, expect } = require('@playwright/test');

test('MapMaker Select Tool Success Verification', async ({ page }) => {
    // 1. Navigate to Map Maker via local server
    await page.goto('http://localhost:8000/mapMaker/mapMaker.html');

    // Wait for initialization
    await page.waitForTimeout(1000);

    // 2. Select Brush Tool
    await page.click('button[data-tool="brush"]');

    // 3. Select a container tile from the palette.
    await page.fill('#paletteSearchInput', 'Trash Can');
    await page.waitForTimeout(500);

    // Select the tile that is NOT the eraser.
    const trashCanTile = page.locator('.palette-tile').filter({ hasText: 'u' }).first();
    await trashCanTile.click();

    // 4. Place the container on the grid at 5,5
    const targetCellSelector = '.cell[data-x="5"][data-y="5"]';
    await page.click(targetCellSelector);

    // 5. Select the "Select" tool
    await page.click('button[data-tool="selectInspect"]');

    // 6. Click on the placed container
    await page.click(targetCellSelector);

    // 7. Verify that the Container Inventory UI is visible
    const containerControls = page.locator('#containerInventoryControls');
    await expect(containerControls).toBeVisible();

    // 8. Verify the container name is correct
    const editingName = page.locator('#editingContainerName');
    await expect(editingName).toContainText('Trash Can');

    // 9. Verify Lock Properties are visible and interactive
    const isLockedCheckbox = page.locator('#isLockedCheckbox');
    await expect(isLockedCheckbox).toBeVisible();
    await isLockedCheckbox.check(); // Ensure checked
    await expect(isLockedCheckbox).toBeChecked();

    const lockDCInput = page.locator('#lockDifficultyInput');
    await expect(lockDCInput).toBeEnabled();
    await lockDCInput.fill('99');
    await expect(lockDCInput).toHaveValue('99');
});
