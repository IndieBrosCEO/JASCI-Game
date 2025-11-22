from playwright.sync_api import sync_playwright

def debug_verification(page):
    page.goto("http://localhost:8000")
    page.wait_for_selector("#character-creator")

    # Check input max attribute
    strength_input = page.locator("input[onchange*='Strength']")
    if strength_input.count() > 0:
        print(f"Strength input found. Max: {strength_input.first.get_attribute('max')}")
    else:
        print("Strength input NOT found.")

    # Check header existence
    header = page.locator("#statPointsHeader")
    if header.count() > 0:
        print(f"Header found. Text: {header.inner_text()}")
    else:
        print("Header NOT found.")
        # Print parent content
        stats_body = page.locator("#statsBody")
        if stats_body.count() > 0:
            print("statsBody found.")
            print(f"statsBody parent HTML: {stats_body.evaluate('el => el.parentNode.innerHTML')}")
        else:
            print("statsBody NOT found.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            debug_verification(page)
        finally:
            browser.close()
