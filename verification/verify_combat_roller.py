from playwright.sync_api import sync_playwright

def verify_combat_roller():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the Combat Roller page
        # Using %20 for space in "Website Tools"
        page.goto("http://localhost:8080/Website%20Tools/Combat_Roller.html")

        # Verify the title
        print(f"Page title: {page.title()}")

        # Click on Ranged tab
        page.click("button:text('Ranged')")

        # Fill in some Ranged details
        page.fill("#rangedAttackerName", "Hero")
        page.fill("#rangedGunSkill", "5")
        page.select_option("#rangedWeaponType", "Rifle")
        page.fill("#rangedDistance", "15")
        page.select_option("#rangedFireMode", "Burst")

        page.fill("#rangedDefenderName", "Villain")
        page.select_option("#rangedDefenseAction", "Dodge")
        page.fill("#rangedDefenderDex", "3")
        page.fill("#rangedCover", "2")

        # Roll
        page.click("button:text('Roll Ranged')")

        # Wait a bit for output (though it's instant JS)
        page.wait_for_timeout(500)

        # Take a screenshot
        page.screenshot(path="verification/combat_roller.png")

        browser.close()

if __name__ == "__main__":
    verify_combat_roller()
