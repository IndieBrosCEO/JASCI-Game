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

            # Inject setup to show menu
            await page.evaluate("""async () => {
                if (!window.vehicleManager) return;
                const mapData = window.mapRenderer.getCurrentMapData();
                const playerPos = window.gameState.playerPos;
                const spawnPos = { x: playerPos.x + 1, y: playerPos.y, z: playerPos.z };
                const vehicleId = window.vehicleManager.spawnVehicle("scooter_vespa", mapData.id, spawnPos);

                window.interaction.detectInteractableItems();
                const interactables = window.gameState.interactableItems;
                const vehicleItemIndex = interactables.findIndex(i => i.itemType === 'vehicle' && i.id === vehicleId);

                if (vehicleItemIndex !== -1) {
                    window.gameState.selectedItemIndex = vehicleItemIndex;
                    window.interaction.interact(); // Should populate action list
                }
            }""")

            await asyncio.sleep(1) # Wait for UI update
            await page.screenshot(path="verification/enter_vehicle_menu.png")
            print("Screenshot taken: verification/enter_vehicle_menu.png")

        except Exception as e:
            print(f"Error during verification: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
