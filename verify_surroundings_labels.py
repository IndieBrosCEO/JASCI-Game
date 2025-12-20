from playwright.sync_api import sync_playwright

def verify_surroundings_labels():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Load the game (Test Map)
        # Note: In CI environments, we often need to wait for assets to load.
        page.goto("http://localhost:8000/index.html")

        # 2. Wait for initialization
        # Click Start Game if present
        try:
            page.wait_for_selector("#startGameButton", timeout=5000)
            page.click("#startGameButton")
        except:
            print("Start button not found or already started.")

        # 3. Wait for game interface
        page.wait_for_selector("#game-container", timeout=10000)

        # 4. Inject Game State to ensure we have content in Surroundings
        # We need to make sure the Surroundings UI is visible and populated.
        # It updates on tick or player move.
        # We can force an update via console or JS evaluation.

        # Ensure Surroundings Grid is visible
        page.evaluate("""
            const grid = document.getElementById('surroundingsGrid');
            if (grid) grid.classList.remove('hidden');
        """)

        # Teleport player to a known location with items and walls to trigger labels
        # Let's use the 'teleport 10 10 0' command via console
        page.type("#consoleInput", "teleport 10 10 0")
        page.press("#consoleInput", "Enter")

        # Wait for update
        page.wait_for_timeout(1000)

        # Drop an item to see 'Item' label
        page.evaluate("""
            window.gameState.floorItems.push({ x: 10, y: 10, z: 0, id: 'hatchet', name: 'Hatchet' });
            // Force UI update
            const ui = new window.SurroundingsUI();
            ui.update();
        """)

        page.wait_for_timeout(500)

        # 5. Take Screenshot
        page.screenshot(path="verification_surroundings_labels.png")
        print("Screenshot taken: verification_surroundings_labels.png")

        browser.close()

if __name__ == "__main__":
    verify_surroundings_labels()
