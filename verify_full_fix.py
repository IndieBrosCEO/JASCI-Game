
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Enable logging
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

        try:
            await page.goto("http://localhost:8000")

            # Wait for the start game button and click it
            start_button = page.locator("#startGameButton")
            await start_button.wait_for(state="visible")
            await start_button.click()
            print("Clicked 'Start Game' button.")

            # Wait for the game to be in a ready state
            await page.wait_for_function("window.gameState && window.gameState.gameStarted")
            print("Game started.")

            # Spawn an NPC to target
            await page.evaluate("() => { window.processConsoleCommand('spawnnpc generic_bandit'); }")
            print("Spawned a bandit.")

            # Wait for NPC to be in gameState
            await page.wait_for_function("window.gameState.npcs.some(npc => npc.definitionId === 'generic_bandit')")
            print("NPC found in gameState.")

            # Open the nearby entities panel with 'R'
            await page.keyboard.press('r')
            print("Pressed 'R' to open nearby entities panel.")

            # Click the bandit in the panel to target it and start combat
            bandit_element = page.locator("#nearbyEntitiesList > div", has_text="Generic Bandit")
            await bandit_element.wait_for(state="visible")
            await bandit_element.click()
            print("Clicked on the bandit in the panel to start combat.")

            # Verify that the combat UI shows the correct defender
            defender_display = page.locator("#currentDefender")
            await expect(defender_display).to_contain_text("Generic Bandit")
            print("SUCCESS: Combat started with the correct target 'Generic Bandit'.")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="verify_full_fix_error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
