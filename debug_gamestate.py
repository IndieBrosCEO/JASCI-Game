from playwright.sync_api import sync_playwright

def check_gamestate(page):
    page.goto("http://localhost:8000")
    page.wait_for_timeout(2000) # Wait for init

    # Check gameState.stats
    stats = page.evaluate("() => window.gameState.stats")
    print(f"gameState.stats: {stats}")

    # Check if renderTables ran
    # We can check by calling it manually and seeing if it works
    page.evaluate("() => { try { window.renderTables(window.gameState); console.log('Manual renderTables success'); } catch(e) { console.error('Manual renderTables failed', e); } }")

    page.wait_for_timeout(1000)

    # Check statsBody again
    content = page.locator("#statsBody").evaluate("el => el.innerHTML")
    print(f"statsBody innerHTML after manual call: {content}")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        check_gamestate(page)
        browser.close()
