from playwright.sync_api import sync_playwright
import time

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Enhanced logging
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Browser Error: {err}"))

        print("Navigating to http://localhost:8000")
        page.goto("http://localhost:8000")

        print("Waiting for game initialization (up to 30s)...")
        try:
            # Check periodically and print status
            for i in range(30):
                is_init = page.evaluate("window.gameInitialized")
                print(f"Check {i}: window.gameInitialized = {is_init}")
                if is_init:
                    break
                time.sleep(1)

            # Final wait to confirm
            page.wait_for_function("() => window.gameInitialized === true", timeout=1000)
            print("Game initialized confirmed.")
        except Exception as e:
            print(f"Initialization timed out. Last state: {page.evaluate('window.gameInitialized')}")
            # Capture screenshot of failure
            page.screenshot(path="verification/frontend_failure.png")
            raise e

        # Wait for the Open Settings button to be visible and clickable
        page.wait_for_selector("#openSettingsButton", state="visible")

        # Click Open Settings
        page.click("#openSettingsButton")
        print("Clicked Open Settings.")

        # Wait for settings modal to appear
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
