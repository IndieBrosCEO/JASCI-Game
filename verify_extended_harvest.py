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

    # 2. Test Harvest Plant (BSH is now harvest:plant)
    print("Testing Harvest Plant (BSH)...")
    page.evaluate("""
        const mockBush = { id: 'BSH', name: 'Mock Bush', x:0, y:0, z:0 };
        const hm = new window.HarvestManager(window.assetManager);
        hm.attemptHarvest("Harvest Plant", mockBush, window.gameState);
    """)

    # 3. Test Harvest Sand (SA)
    print("Testing Harvest Sand (SA)...")
    page.evaluate("""
        const mockSand = { id: 'SA', name: 'Mock Sand', x:0, y:0, z:0 };
        const hm = new window.HarvestManager(window.assetManager);
        hm.attemptHarvest("Harvest Sand", mockSand, window.gameState);
    """)

    # 4. Test Scavenge Furniture (CH - Chair)
    print("Testing Scavenge Furniture (CH)...")
    page.evaluate("""
        const mockChair = { id: 'CH', name: 'Mock Chair', x:0, y:0, z:0 };
        const hm = new window.HarvestManager(window.assetManager);
        hm.attemptHarvest("Scavenge", mockChair, window.gameState);
    """)

    # 5. Verify Inventory
    time.sleep(2)
    inventory_items = page.evaluate("""
        window.gameState.inventory.container.items.map(i => i.id)
    """)
    print(f"Inventory items: {inventory_items}")

    # Checks
    has_plant_loot = any(i in inventory_items for i in ["plant_fibers_strong", "plant_leaves_green_pigment", "medicinal_herb_comfrey", "tomato_seeds"])
    has_sand_loot = any(i in inventory_items for i in ["sand_pile", "clay_lump", "stone_sharp_fragment"])
    has_furn_loot = any(i in inventory_items for i in ["nails", "wood_planks", "cloth_scrap", "spring_small_metal"])

    if has_plant_loot: print("PASS: Harvested plant materials.")
    else: print("FAIL: No plant materials found.")

    if has_sand_loot: print("PASS: Harvested sand materials.")
    else: print("FAIL: No sand materials found.")

    if has_furn_loot: print("PASS: Scavenged furniture materials.")
    else: print("FAIL: No furniture materials found.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
