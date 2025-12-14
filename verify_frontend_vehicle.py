
from playwright.sync_api import sync_playwright, expect
import time

def verify_vehicle_cargo(page):
    print("Navigating to game...")
    page.goto("http://localhost:8000/index.html")

    # Wait for game to initialize
    print("Waiting for game to load...")
    try:
        page.wait_for_selector("#startGameButton", timeout=5000)
        page.click("#startGameButton")
        print("Clicked Start Game")
    except:
        print("Start Game button not found or already started.")

    # Wait for map to render
    page.wait_for_selector("#mapContainer", timeout=5000)

    # Wait for initialization
    time.sleep(2)

    print("Injecting vehicle and items via console/JS...")
    # Inject a vehicle and force open its cargo
    page.evaluate("""
        const vm = window.vehicleManager;
        const im = window.inventoryManager;
        const gm = window.gameState;

        // Spawn vehicle
        const vid = vm.spawnVehicle("buggy_makeshift", gm.currentMapId, {x: gm.playerPos.x + 1, y: gm.playerPos.y, z: gm.playerPos.z});
        const vehicle = vm.getVehicleById(vid);

        // Add cargo details manually if not present (although spawn should do it)
        if (!vehicle.cargoDetails) {
            vehicle.cargoDetails = { capacity: 20, items: [] };
        }

        // Add some items
        const item1 = new window.Item(window.assetManager.getItem("wrench"));
        item1.quantity = 1;
        const item2 = new window.Item(window.assetManager.getItem("scrap_metal"));
        item2.quantity = 10;

        vehicle.cargoDetails.items.push(item1);
        vehicle.cargoDetails.items.push(item2);

        // Force open UI
        im.toggleInventoryMenu(vehicle);
    """)

    time.sleep(1)

    # Verify UI is open and has content
    print("Verifying UI content...")
    inventory_menu = page.locator("#inventoryMenu")

    # Explicitly check classList
    classes = inventory_menu.get_attribute("class")
    print(f"Inventory Menu Classes: {classes}")
    if "hidden" in (classes or ""):
        print("FAILURE: Inventory menu still has 'hidden' class.")
    else:
        print("SUCCESS: Inventory menu does NOT have 'hidden' class.")

    expect(inventory_menu).to_be_visible()

    left_pane_header = page.locator("#inventoryPaneLeft h4")
    expect(left_pane_header).to_contain_text("Cargo")

    items = page.locator("#inventoryListContainer .inventory-item")
    count = items.count()
    print(f"Found {count} items in left pane.")

    if count >= 2:
        print("Success: Vehicle items displayed.")
    else:
        print("Failure: Vehicle items not displayed.")

    # Screenshot
    print("Taking screenshot...")
    page.screenshot(path="vehicle_cargo_ui.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_vehicle_cargo(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="vehicle_cargo_error.png")
        finally:
            browser.close()
