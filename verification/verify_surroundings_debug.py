
from playwright.sync_api import sync_playwright
import time

def verify_surroundings_grid_eval():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            page.goto("http://localhost:8000/index.html")
        except:
            print("Failed to load localhost:8000. Is the server running?")
            return

        page.wait_for_selector("#startGameButton", state="visible")
        page.click("#startGameButton")
        page.wait_for_selector("#game-container", state="visible")
        time.sleep(2)

        # Force unhide for screenshot if hidden
        page.evaluate("document.getElementById(\"surroundingsGrid\").classList.remove(\"hidden\")")

        surroundings_grid = page.query_selector("#surroundingsGrid")
        if surroundings_grid:
            print("Found #surroundingsGrid")

            # Use page.evaluate to get innerHTML directly
            html_content = page.evaluate("document.getElementById(\"surroundingsGrid\").innerHTML")
            print("Grid HTML Content (from evaluate):")
            print(html_content)

            # Check visibility
            is_visible = page.is_visible("#surroundingsGrid")
            print(f"Is #surroundingsGrid visible? {is_visible}")

            # If visible, take screenshot
            if is_visible:
                page.screenshot(path="verification/surroundings_full_page.png")
                # Try screenshotting parent if grid fails
                page.query_selector("#combat-console-stack").screenshot(path="verification/surroundings_stack.png")
                print("Screenshots saved.")
            else:
                print("Grid is not visible, skipping element screenshot.")
                # Maybe parent is hidden?
                parent_visible = page.is_visible("#combat-console-stack")
                print(f"Is #combat-console-stack visible? {parent_visible}")

        else:
            print("#surroundingsGrid not found in DOM.")

        browser.close()

if __name__ == "__main__":
    verify_surroundings_grid_eval()
