import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Start the game via localhost
        url = "http://localhost:8000/index.html"
        print(f"Loading {url}")
        await page.goto(url)

        # Wait for game initialization
        await page.wait_for_function("window.gameInitialized === true")
        print("Game initialized.")

        # Locate the charName input
        char_name_input = page.locator("#charName")
        await char_name_input.click()

        # Type "Liam"
        print("Typing 'Liam' into charName...")
        await page.keyboard.type("Liam", delay=100)

        # Wait a moment for any potential (unwanted) UI to animate/appear
        await page.wait_for_timeout(500)

        # Take screenshot
        screenshot_path = "/home/jules/verification/input_focus_verification.png"
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
