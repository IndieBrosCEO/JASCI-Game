from playwright.sync_api import sync_playwright, expect

def verify_mapmaker_zone_tool(page):
    page.goto("http://localhost:8080/mapMaker/mapMaker.html")

    # Check for Zone tool button
    zone_btn = page.locator('button[data-tool="zone"]')
    expect(zone_btn).to_be_visible()

    # Click it
    zone_btn.click()

    # Check if Zone config panel is visible (it should toggle visibility)
    # The panel is #zoneToolsContainer.
    # Wait, the toggle button inside it toggles content.
    # But selecting the tool doesn't automatically open the panel in this codebase logic (unlike NPC tool).
    # Ah, wait. `handleToolButtonClick` handles updating UI.
    # It calls `updateToolButtonUI`.
    # Does it open the panel?
    # In `mapMaker/eventHandlers.js`:
    # `updateSelectedNpcInfoUI` opens NPC panel if NPC tool selected.
    # I didn't add logic to open Zone panel automatically in `handleToolButtonClick`.
    # But `updateSelectedZoneInfoUI` (if implemented) might.
    # I implemented `handleZoneTool` but didn't implement `updateSelectedZoneInfoUI` in `uiManager.js` yet!
    # I missed that step in Phase 4.
    # `handleZoneTool` calls `interactionInterface.updateZoneEditorUI(newZone)`.
    # `toolManager.js` imports `updateZoneEditorUI`? No, it expects it in `interactionInterface`.
    # `eventHandlers.js` constructs `interactionInterface`.
    # I need to add `updateZoneEditorUI` to `uiManager.js` and pass it in `eventHandlers.js`.

    # So this test might reveal that the UI doesn't update.

    page.screenshot(path="verification_mapmaker.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_mapmaker_zone_tool(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification_error.png")
        finally:
            browser.close()
