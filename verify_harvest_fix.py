from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # 1. Start the game
    print("Loading game...")
    page.goto("http://localhost:8000/index.html")
    page.wait_for_selector("#startGameButton", timeout=10000)
    page.click("#startGameButton")

    # Wait for initialization
    page.wait_for_function("window.gameInitialized === true", timeout=10000)
    print("Game initialized.")

    # 4. Simulate Harvest Action via HarvestManager with a MOCK item
    print("Simulating Harvest Action via HarvestManager...")
    page.evaluate("""
        // Mock an item object representing a tree
        // 'TRK' is the ID for Tree Trunk which should have 'harvest:wood' tag in assetManager
        const mockTreeItem = {
            id: 'TRK',
            name: 'Mock Tree Trunk',
            x: 0,
            y: 0,
            z: 0
        };

        // Ensure HarvestManager is available
        if (!window.HarvestManager) {
             throw new Error("HarvestManager class not found on window.");
        }

        // Get or Create HarvestManager instance
        let hm = window.harvestManager;
        if (!hm) {
            hm = new window.HarvestManager(window.assetManager);
        }

        // Call attemptHarvest directly
        hm.attemptHarvest("Harvest Wood", mockTreeItem, window.gameState);
    """)

    # 5. Verify Inventory
    print("Verifying inventory...")
    time.sleep(1)

    inventory_items = page.evaluate("""
        window.gameState.inventory.container.items.map(i => i.id)
    """)

    print(f"Inventory items: {inventory_items}")

    has_wood = "wood_log" in inventory_items or "wood_stick" in inventory_items

    if has_wood:
        print("PASS: Found wood products in inventory.")
    else:
        print("FAIL: No wood products found. Check logs.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
