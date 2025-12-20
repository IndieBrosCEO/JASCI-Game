from playwright.sync_api import sync_playwright

def verify_surroundings_wrapping():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Load the game (Test Map)
        page.goto("http://localhost:8000/index.html")

        # 2. Wait for initialization
        try:
            page.wait_for_selector("#startGameButton", timeout=5000)
            page.click("#startGameButton")
        except:
            print("Start button not found or already started.")

        # 3. Wait for game interface
        page.wait_for_selector("#game-container", timeout=10000)

        # Ensure Surroundings Grid is visible
        page.evaluate("""
            const grid = document.getElementById('surroundingsGrid');
            if (grid) grid.classList.remove('hidden');
        """)

        # 4. Inject Long Name Item
        page.evaluate("""
            window.gameState.floorItems.push({
                x: window.gameState.playerPos.x,
                y: window.gameState.playerPos.y,
                z: window.gameState.playerPos.z,
                id: 'long_item',
                name: 'Super Ultra Mega Long Item Name That Should Wrap Properly'
            });
            // Force UI update
            const ui = new window.SurroundingsUI();
            ui.update();
        """)

        page.wait_for_timeout(500)

        # 5. Take Screenshot
        page.screenshot(path="verification_surroundings_wrapping.png")
        print("Screenshot taken: verification_surroundings_wrapping.png")

        browser.close()

if __name__ == "__main__":
    verify_surroundings_wrapping()
