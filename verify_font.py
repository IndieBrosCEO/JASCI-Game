from playwright.sync_api import sync_playwright

def verify_clock_font():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Navigate to the local server
        page.goto("http://localhost:8000/index.html")

        # Wait for the start game button and click it to enter the game
        # The clock is in the right panel which might be hidden initially or obscured
        try:
            start_button = page.locator("#startGameButton")
            start_button.wait_for(state="visible", timeout=5000)
            start_button.click()
            print("Clicked Start Game button.")
        except:
            print("Start Game button not found or not visible. Assuming game might be ready or different state.")

        # Wait for the game container
        page.wait_for_selector("#game-container")

        # Locate the clockDisplay element
        # It is inside #right-panel which might be hidden on load, but let's check.
        # The CSS for #right-panel has class 'menu-game-controls hidden' initially in the HTML provided in memory.
        # After starting the game, it should be visible.

        # Wait for right panel to be visible
        right_panel = page.locator("#right-panel")
        right_panel.wait_for(state="visible", timeout=5000)

        clock_display = page.locator("#clockDisplay")
        clock_display.wait_for(state="visible", timeout=5000)

        # Verify the font-family style
        font_family = clock_display.evaluate("element => getComputedStyle(element).fontFamily")

        print(f"Computed font-family for #clockDisplay: {font_family}")

        expected_font = 'DwarfFortress'

        if expected_font in font_family:
            print("SUCCESS: font-family contains 'DwarfFortress'.")
        else:
            print(f"FAILURE: font-family '{font_family}' does not contain '{expected_font}'.")

        # Take a screenshot of the clock display area
        time_needs_section = page.locator("#timeAndNeedsStatus")
        time_needs_section.screenshot(path="verification_clock_font.png")

        browser.close()

if __name__ == "__main__":
    verify_clock_font()
