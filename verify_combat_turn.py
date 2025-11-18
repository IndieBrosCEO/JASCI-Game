
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Log browser console messages
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

        try:
            # Navigate to the game
            await page.goto("http://localhost:8000")

            # Wait until the game assets are loaded
            await page.wait_for_function("window.gameInitialized")

            # Click "Start Game"
            await page.click("#startGameButton")
            print("Clicked 'Start Game' button.")

            # Add a delay to allow the game to fully enter its main state
            await page.wait_for_timeout(1000)
            print("Waited for 1 second.")

            # Spawn an NPC nearby
            await page.evaluate("() => { processConsoleCommand('spawnnpc training_dummy 11 7 0'); }")
            print("Executed spawnnpc command.")

            # Initiate combat by pressing 'R' and clicking the NPC
            await page.press('body', 'R')
            print("Pressed 'R' to open the nearby entities panel.")

            panel = page.locator("#nearbyEntitiesPanel")
            await expect(panel).not_to_have_class("hidden", timeout=5000)
            print("Panel is visible.")

            await panel.locator(".neutral").click()
            print("Clicked on the NPC in the panel to start combat.")

            # Wait for the UI to update and confirm it's the player's turn
            await page.wait_for_function("document.getElementById('currentAttacker').textContent.includes('Player')", timeout=5000)
            print("Player's turn has started correctly.")

            print("Verification successful!")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="verify_error.png")
            print("Screenshot 'verify_error.png' saved for debugging.")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
