
from playwright.sync_api import sync_playwright

def verify_tabs():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:8000')
        page.wait_for_function('window.gameInitialized === true')

        # Take screenshot of default state (Character tab)
        page.screenshot(path='verification/1_default_char_tab.png')

        # Click Appearance tab
        page.click('button:has-text("Appearance")')
        page.wait_for_timeout(500) # Wait for transition/render
        page.screenshot(path='verification/2_appearance_tab.png')

        # Start game
        page.click('#startGameButton')
        page.wait_for_timeout(1000) # Wait for game start
        page.screenshot(path='verification/3_game_started.png')

        browser.close()

if __name__ == "__main__":
    verify_tabs()
