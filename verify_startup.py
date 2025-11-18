
import asyncio
from playwright.async_api import async_playwright

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

            # Wait for the game to start
            await page.wait_for_function("window.gameState && window.gameState.gameStarted")
            print("SUCCESS: Game started successfully.")

        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
