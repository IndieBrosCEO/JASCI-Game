from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # Wait for game initialization
        page.wait_for_function("() => window.gameInitialized === true")
        print("Game initialized.")

        # Wait for the Open Settings button to be visible and clickable
        page.wait_for_selector("#openSettingsButton", state="visible")

        # Click Open Settings
        page.click("#openSettingsButton")
        print("Clicked Open Settings.")

        # Wait for settings modal to appear (Wait for it to NOT have the 'hidden' class)
        page.wait_for_selector("#settingsModal:not(.hidden)", state="visible")
        print("Settings Modal visible.")

        # Check if Multiplayer section is visible
        page.wait_for_selector("#multiplayerSection", state="visible")

        # Check for specific multiplayer inputs
        page.wait_for_selector("#lanIpInput", state="visible")
        page.wait_for_selector("#connectButton", state="visible")
        page.wait_for_selector("#hostButton", state="visible")

        print("Multiplayer UI elements verified.")

        # Take screenshot
        page.screenshot(path="verification/frontend_multiplayer.png")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
