
from playwright.sync_api import sync_playwright

def verify_medical_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Load the game
        # Assuming local server or file protocol.
        # Using file protocol for simplicity as I haven't started a server.
        import os
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Wait for game to initialize
        # We need to bypass character creation or just use console commands?
        # The game starts at character creation.
        # Let's start the game.
        page.click("#startGameButton")

        # Wait for game started
        page.wait_for_selector("#healthTable", state="visible")

        # Inject state: Injure the player
        page.evaluate("""
            window.gameState.player.health.head.current = 3;
            window.gameState.player.health.head.max = 5;
            window.renderHealthTable(window.gameState.player);

            // Give a bandage
            window.inventoryManager.addItem({ id: "bandage", name: "Bandage", type: "consumable" });
        """)

        # Click on the Head row in health table
        # We need to find the specific row.
        # The row content is "Head".
        head_cell = page.get_by_role("cell", name="Head")
        head_cell.click()

        # Wait for modal
        page.wait_for_selector("#medicalTreatmentModal", state="visible")

        # Take screenshot of the modal
        page.screenshot(path="verification/medical_modal.png")

        print("Screenshot taken: verification/medical_modal.png")

        browser.close()

if __name__ == "__main__":
    verify_medical_ui()
