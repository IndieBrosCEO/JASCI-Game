from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # 1. Start the game
    print("Navigating to game...")
    page.goto("http://localhost:8000/index.html")

    # Wait for initialization
    page.wait_for_timeout(2000) # Wait for scripts to load

    # Check if start button exists and click it
    start_button = page.locator("#startGameButton")
    if start_button.is_visible():
        print("Clicking Start Game...")
        start_button.click()

    # Wait for game to start
    page.wait_for_timeout(2000)

    # 2. Verify character info is visible (which relies on character.js)
    print("Verifying UI...")
    char_info = page.locator("#characterInfo")
    if char_info.is_visible():
        print("Character Info is visible.")
    else:
        print("Error: Character Info not visible.")

    # 3. Verify stats rendering
    stats_container = page.locator("#statsSkillsWornContainer")
    if stats_container.is_visible():
        print("Stats container is visible.")
    else:
        print("Error: Stats container not visible.")

    # 4. Take screenshot
    screenshot_path = "verification/consolidation_verify.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
