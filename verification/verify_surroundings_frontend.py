
from playwright.sync_api import sync_playwright
import time

def verify_surroundings_grid():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Start server if not running (assuming it is, or we start it separately)
        # Assuming http://localhost:8000 is available
        try:
            page.goto("http://localhost:8000/index.html")
        except:
            print("Failed to load localhost:8000. Is the server running?")
            return

        # Start game
        page.wait_for_selector("#startGameButton", state="visible")
        page.click("#startGameButton")

        # Wait for game to init
        page.wait_for_selector("#game-container", state="visible")
        time.sleep(2) # Wait for map render

        # Check if surroundings grid is present and visible
        # It might be hidden initially until rendered?
        # But SurroundingsUI.initializeGrid removes hidden class.

        # We need to ensure it is visible.
        # If it is inside #combat-console-stack, check that too.

        surroundings_grid = page.query_selector("#surroundingsGrid")
        if surroundings_grid:
            print("Found #surroundingsGrid")

            # Check content of the first cell (center or top left)
            # The grid has 9 cells.
            cells = surroundings_grid.query_selector_all("div > div")
            # Actually structure is cell > top, bottom.
            # cell is div with border.

            # Let s take a screenshot of the grid area
            element_handle = page.query_selector("#surroundingsGrid")
            if element_handle:
                element_handle.screenshot(path="verification/surroundings_grid.png")
                print("Screenshot saved to verification/surroundings_grid.png")

                # Log innerHTML for debugging text
                print("Grid HTML Content:")
                print(element_handle.inner_html())
            else:
                print("Grid element not found for screenshot.")
        else:
            print("#surroundingsGrid not found in DOM.")

        browser.close()

if __name__ == "__main__":
    verify_surroundings_grid()
