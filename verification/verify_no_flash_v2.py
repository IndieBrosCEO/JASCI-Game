
import os
import time
from playwright.sync_api import sync_playwright

def verify_no_flash():
    print("Starting verification for 'no flash' UI updates...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Start the game
        page.goto("http://localhost:8000/index.html")

        # Wait for initialization
        page.wait_for_function("window.gameInitialized === true")
        print("Game initialized.")

        # Ensure we are on the character creator screen
        if not page.is_visible("#character-creator"):
            print("Not on character creator screen. Refreshing...")
            page.reload()
            page.wait_for_function("window.gameInitialized === true")

        # Wait for the Strength stat row to appear
        strength_row_selector = ".stat-row:has(.stat-name:text('Strength'))"
        page.wait_for_selector(strength_row_selector)

        # Get the input element and the plus button
        input_selector = f"{strength_row_selector} input.stat-input"
        plus_btn_selector = f"{strength_row_selector} .stat-btn.plus"

        # Initial value check
        initial_value = page.input_value(input_selector)
        print(f"Initial Strength: {initial_value}")

        # Click the plus button
        print("Clicking + button for Strength...")

        # Get a reference to the DOM element handle *before* the click
        row_element = page.query_selector(strength_row_selector)

        page.click(plus_btn_selector)

        # Wait a moment for potential JS execution
        time.sleep(0.5)

        # Check new value
        new_value = page.input_value(input_selector)
        print(f"New Strength: {new_value}")

        if int(new_value) != int(initial_value) + 1:
            print("ERROR: Value did not increment correctly.")
            browser.close()
            return False

        # Check if the row element is still the same DOM object (not detached)
        # If renderTables() was called, the old row_element would be detached from the document.
        try:
            # Try to evaluate something on the old handle
            is_attached = row_element.evaluate("el => document.body.contains(el)")
            if is_attached:
                print("SUCCESS: The row element persists (no full re-render).")
            else:
                print("FAILURE: The row element was detached (full re-render occurred).")
                browser.close()
                return False
        except Exception as e:
            print(f"FAILURE: Error checking element attachment: {e}")
            browser.close()
            return False

        browser.close()
        return True

if __name__ == "__main__":
    if verify_no_flash():
        print("Verification PASSED.")
        exit(0)
    else:
        print("Verification FAILED.")
        exit(1)
