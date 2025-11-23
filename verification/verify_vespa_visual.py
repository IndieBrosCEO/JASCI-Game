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

            # Inject verification logic to spawn vehicle and move
            result = await page.evaluate("""async () => {
                // Wait for mapRenderer to have currentMapId
                let attempts = 0;
                while ((!window.mapRenderer || !window.mapRenderer.getCurrentMapData()) && attempts < 10) {
                    await new Promise(r => setTimeout(r, 500));
                    attempts++;
                }

                // 1. Spawn a Vespa
                if (!window.vehicleManager) return "VehicleManager not found";

                const mapData = window.mapRenderer.getCurrentMapData();
                if (!mapData || !mapData.id) return "Map not loaded";

                const playerPos = window.gameState.playerPos;
                // Spawn near player
                const vehicleId = window.vehicleManager.spawnVehicle("scooter_vespa", mapData.id, {x: playerPos.x, y: playerPos.y, z: playerPos.z});

                if (!vehicleId) return "Failed to spawn Vespa";

                // 2. Put player in vehicle
                window.gameState.player.isInVehicle = vehicleId;

                // Force update to ensure rendering picks it up
                window.mapRenderer.scheduleRender();
            }""")

            await asyncio.sleep(1) # Wait for render
            await page.screenshot(path="verification/vespa_spawned.png")
            print("Screenshot taken: verification/vespa_spawned.png")

        except Exception as e:
            print(f"Error during verification: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
