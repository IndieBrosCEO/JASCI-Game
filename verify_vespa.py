import asyncio
from playwright.async_api import async_playwright
import time

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto("http://localhost:8000")
        except:
            print("Could not connect to localhost:8000.")
            return

        try:
            await page.wait_for_selector("#startGameButton", timeout=10000)
            await page.click("#startGameButton")

            # Wait for the map container to be populated or visible
            await page.wait_for_selector("#mapContainer", timeout=10000)

            # Give it a moment to settle
            await asyncio.sleep(2)

            # Inject verification logic
            result = await page.evaluate("""async () => {
                console.log("Starting in-browser verification...");

                // Wait for mapRenderer to have currentMapId
                let attempts = 0;
                while ((!window.mapRenderer || !window.mapRenderer.getCurrentMapData()) && attempts < 10) {
                    await new Promise(r => setTimeout(r, 500));
                    attempts++;
                }

                // 1. Spawn a Vespa
                if (!window.vehicleManager) return "VehicleManager not found";

                // Ensure we are on a map
                const mapData = window.mapRenderer.getCurrentMapData();
                if (!mapData || !mapData.id) return "Map not loaded";

                const playerPos = window.gameState.playerPos;
                // Spawn near player
                const vehicleId = window.vehicleManager.spawnVehicle("scooter_vespa", mapData.id, {x: playerPos.x, y: playerPos.y, z: playerPos.z});

                if (!vehicleId) return "Failed to spawn Vespa";
                const vehicle = window.vehicleManager.getVehicleById(vehicleId);
                console.log("Spawned Vespa: " + vehicle.name);

                // 2. Put player in vehicle
                window.gameState.player.isInVehicle = vehicleId;

                // 3. Check initial position
                const startX = window.gameState.playerPos.x;
                const startY = window.gameState.playerPos.y;
                const startFuel = vehicle.fuel;

                console.log(`Start Pos: ${startX}, ${startY}. Fuel: ${startFuel}`);

                // 4. Attempt to move right
                // We need to ensure the target tile is valid.
                if (!window.mapRenderer.isWalkable(startX + 1, startY, playerPos.z)) {
                    return "SKIPPED: Target tile for test (right) is not walkable. Cannot verify movement.";
                }

                // Call attemptCharacterMove directly to verify logic without event listener noise if possible,
                // but `attemptCharacterMove` is global.
                // Let's try calling it directly.
                const moved = await window.attemptCharacterMove(window.gameState, 'right', window.assetManager);

                const endX = window.gameState.playerPos.x;
                const endY = window.gameState.playerPos.y;
                const endFuel = vehicle.fuel;

                console.log(`End Pos: ${endX}, ${endY}. Fuel: ${endFuel}`);

                if (moved && endX === startX + 1) {
                    // Moved successfully
                    if (vehicle.mapPos.x === endX && vehicle.mapPos.y === endY) {
                        // Vehicle moved with player
                         if (endFuel < startFuel) {
                             return "SUCCESS: Player moved, Vehicle moved, Fuel consumed.";
                         } else {
                             return "PARTIAL: Player/Vehicle moved, but FUEL NOT CONSUMED (Check efficiency/distance).";
                         }
                    } else {
                        return "FAILURE: Player moved, but Vehicle did NOT.";
                    }
                } else {
                    return "FAILURE: Player did not move.";
                }
            }""")

            print("Verification Result:", result)

        except Exception as e:
            print(f"Error during verification: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
