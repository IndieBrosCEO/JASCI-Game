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

    # 2. Fill the inventory to prevent pickup
    print("Filling inventory...")
    page.evaluate("""
        // Set main container slots to 0 to simulate full inventory
        // (Assuming inventoryManager respects this, or just fill it with dummy items)

        // Better to fill with dummy items
        const inv = window.gameState.inventory.container;
        // inv.items = []; // Clear first just in case

        // Fill slots
        while (inv.items.length < inv.maxSlots) {
             const dummyItem = new window.Item({
                 id: 'dummy_filler_' + inv.items.length,
                 name: 'Dummy Filler',
                 quantity: 1
             });
             inv.items.push(dummyItem);
        }
    """)

    # 3. Simulate Harvest Action via HarvestManager with a MOCK item
    print("Simulating Harvest Action (expecting drop to floor)...")
    page.evaluate("""
        const mockTreeItem = {
            id: 'TRK',
            name: 'Mock Tree Trunk',
            x: 0,
            y: 0,
            z: 0
        };

        let hm = window.harvestManager;
        if (!hm) hm = new window.HarvestManager(window.assetManager);

        // This should trigger 'harvest:wood' which drops wood_log or wood_stick or fibers
        hm.attemptHarvest("Harvest Wood", mockTreeItem, window.gameState);
    """)

    # 4. Verify Floor Items
    print("Verifying floor items...")
    time.sleep(1)

    floor_items = page.evaluate("""
        (window.gameState.floorItems || []).map(entry => entry.item.id)
    """)

    print(f"Floor items: {floor_items}")

    # Check if any wood harvest product is on the floor
    possible_drops = ["wood_log", "wood_stick", "plant_fibers_strong", "tree_bark_brown_pigment"]

    found_on_floor = any(drop in floor_items for drop in possible_drops)

    if found_on_floor:
        print("PASS: Harvested items found on the floor.")
    else:
        print("FAIL: No harvested items found on the floor.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
