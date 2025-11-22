import asyncio
from playwright.async_api import async_playwright

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

        # Type "Liam" (includes 'L' for look mode, 'i' for inventory, 'a' for move left, 'm' nothing)
        print("Typing 'Liam' into charName...")
        await page.keyboard.type("Liam", delay=100)

        # Check if inventory opened
        is_inventory_open = await page.evaluate("window.gameState.inventory.open")
        print(f"Inventory Open State: {is_inventory_open}")

        # Check if look mode activated
        is_look_mode = await page.evaluate("window.gameState.isLookModeActive")
        print(f"Look Mode Active: {is_look_mode}")

        # Check input value
        input_value = await char_name_input.input_value()
        print(f"Input Value: '{input_value}'")

        if is_inventory_open or is_look_mode:
            print("ISSUE REPRODUCED: Game actions triggered while typing in input field.")
        else:
            print("Issue NOT reproduced.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
