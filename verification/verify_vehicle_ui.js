
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    // Launch browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Go to game
    await page.goto('http://localhost:8000/index.html');

    // Wait for game to init (wait for start button)
    await page.waitForSelector('#startGameButton', { state: 'visible', timeout: 10000 });

    // Click Start Game
    await page.click('#startGameButton');

    // Wait for game loop to start (e.g. canvas or map container)
    await page.waitForSelector('#mapContainer', { state: 'visible' });

    // Inject a vehicle into the game state and put player in it
    await page.evaluate(() => {
        // Create dummy vehicle
        const vehicle = {
            id: 'test_vehicle_1',
            name: 'Test Car',
            mapPos: { ...window.gameState.playerPos },
            currentMapId: window.gameState.currentMapId,
            chassis: 'chassis_basic',
            attachedParts: {},
            durability: {},
            fuel: 10,
            maxFuel: 20,
            currentMovementPoints: 10,
            calculatedStats: {
                fuelEfficiency: 0.5,
                speed: 60
            }
        };

        if (!window.gameState.vehicles) window.gameState.vehicles = [];
        window.gameState.vehicles.push(vehicle);

        // Put player in vehicle
        window.gameState.player.isInVehicle = 'test_vehicle_1';

        // Trigger UI update
        if (window.turnManager && window.turnManager.updateTurnUI) {
            window.turnManager.updateTurnUI();
        }
    });

    // Wait for UI update
    await page.waitForTimeout(1000);

    // Take screenshot of the movement points UI
    // We expect "Vehicle Moves Left" to appear
    const element = await page.$('#movementPointsUI');
    // Get parent node to see siblings (where vehicle UI is inserted)
    if (element) {
        const parent = await element.evaluateHandle(el => el.parentNode);
        await parent.screenshot({ path: 'verification/vehicle_ui.png' });
    } else {
        await page.screenshot({ path: 'verification/full_page.png' });
    }

    await browser.close();
})();
