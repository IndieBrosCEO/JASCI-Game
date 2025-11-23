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
            await page.wait_for_selector("#mapContainer", timeout=10000)
            await asyncio.sleep(1)

            result = await page.evaluate("""async () => {
                console.log("Starting Enter Vehicle Verification...");

                // 1. Setup
                if (!window.vehicleManager) return "VehicleManager missing";
                const mapData = window.mapRenderer.getCurrentMapData();
                if (!mapData) return "Map data missing";

                const playerPos = window.gameState.playerPos;
                // Spawn vehicle next to player (x+1)
                const spawnPos = { x: playerPos.x + 1, y: playerPos.y, z: playerPos.z };
                const vehicleId = window.vehicleManager.spawnVehicle("scooter_vespa", mapData.id, spawnPos);

                if (!vehicleId) return "Failed to spawn vehicle";
                console.log("Vehicle spawned:", vehicleId);

                // 2. Detect Interactables
                window.interaction.detectInteractableItems();
                const interactables = window.gameState.interactableItems;
                console.log("Interactables detected:", JSON.stringify(interactables));

                const vehicleItemIndex = interactables.findIndex(i => i.itemType === 'vehicle' && i.id === vehicleId);

                if (vehicleItemIndex === -1) return "Vehicle not detected in interactableItems";

                // 3. Select Vehicle
                window.gameState.selectedItemIndex = vehicleItemIndex;

                // 4. Get Actions (simulating interaction.interact())
                // interaction.interact() populates the DOM list, but we can check the internal logic
                // We need to verify 'Enter Vehicle' is an option.
                // Accessing internal _getActionsForItem via public API is not directly possible if it's not exposed.
                // But performSelectedAction relies on the DOM list populated by interact().

                // Let's simulate the UI flow:
                window.interaction.interact(); // Populates action list

                const actionList = document.getElementById('actionList');
                let enterActionIndex = -1;
                for (let i = 0; i < actionList.children.length; i++) {
                    if (actionList.children[i].textContent.includes("Enter Vehicle")) {
                        enterActionIndex = i;
                        break;
                    }
                }

                if (enterActionIndex === -1) return "Enter Vehicle action not found in menu";

                // 5. Perform Action
                window.gameState.selectedActionIndex = enterActionIndex;
                window.interaction.performSelectedAction();

                // 6. Verify State
                if (window.gameState.player.isInVehicle === vehicleId) {
                    return "SUCCESS: Player entered vehicle.";
                } else {
                    return "FAILURE: Player isInVehicle state did not update.";
                }
            }""")

            print("Verification Result:", result)

        except Exception as e:
            print(f"Error during verification: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
