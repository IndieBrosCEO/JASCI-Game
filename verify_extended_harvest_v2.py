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

    # 2. Test Harvest Mud (MU)
    print("Testing Harvest Mud (MU)...")
    page.evaluate("""
        const mockMud = { id: 'MU', name: 'Mock Mud', x:0, y:0, z:0 };
        const hm = new window.HarvestManager(window.assetManager);
        hm.attemptHarvest("Harvest Mud", mockMud, window.gameState);
    """)

    # 3. Test Scavenge Electronics (CP)
    print("Testing Scavenge Electronics (CP)...")
    page.evaluate("""
        const mockComp = { id: 'CP', name: 'Mock Computer', x:0, y:0, z:0 };
        const hm = new window.HarvestManager(window.assetManager);
        hm.attemptHarvest("Scavenge", mockComp, window.gameState);
    """)

    # 4. Test Scavenge Appliance (RF)
    print("Testing Scavenge Appliance (RF)...")
    page.evaluate("""
        const mockFridge = { id: 'RF', name: 'Mock Fridge', x:0, y:0, z:0 };
        const hm = new window.HarvestManager(window.assetManager);
        hm.attemptHarvest("Scavenge", mockFridge, window.gameState);
    """)

    # 5. Verify Inventory
    time.sleep(2)
    inventory_items = page.evaluate("""
        window.gameState.inventory.container.items.map(i => i.id)
    """)
    print(f"Inventory items: {inventory_items}")

    # Checks (Using flexible check because of RNG)
    mud_items = ["clay_lump", "stone_sharp_fragment"]
    elec_items = ["electronic_scrap", "wire_insulated_thin", "circuit_board_blank", "led_basic", "battery_cell_small", "memory_chip_basic"]
    appliance_items = ["scrap_metal", "motor_small_electric", "heating_element_nichrome_wire", "rubber_hose_section", "wire_insulated_thin"]

    has_mud_loot = any(i in inventory_items for i in mud_items)
    has_elec_loot = any(i in inventory_items for i in elec_items)
    has_appliance_loot = any(i in inventory_items for i in appliance_items)

    if has_mud_loot: print("PASS: Harvested mud materials.")
    else: print("FAIL: No mud materials found (could be RNG).")

    if has_elec_loot: print("PASS: Scavenged electronics.")
    else: print("FAIL: No electronics found (could be RNG).")

    if has_appliance_loot: print("PASS: Scavenged appliance.")
    else: print("FAIL: No appliance materials found (could be RNG).")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
