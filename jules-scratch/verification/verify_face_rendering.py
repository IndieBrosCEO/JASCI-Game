from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:8000")

    # Click the randomize face button to generate a face
    randomize_button = page.locator("#randomizeFaceButton")
    randomize_button.click()

    # Wait for the face preview element to be visible and have content
    face_preview = page.locator("#asciiFacePreview")
    face_preview.wait_for()

    # Give it a moment to render
    page.wait_for_timeout(1000)

    # Take a screenshot of the face preview
    face_preview.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)