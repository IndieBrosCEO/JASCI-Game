from playwright.sync_api import sync_playwright, expect

def verify_mechanics_final(page):
    # Navigate to the local server
    page.goto("http://localhost:8000")

    # Wait for character creator
    expect(page.locator("#character-creator")).to_be_visible()

    # 1. Verify Stats Limit (Max 10)
    # Find a stat input (e.g., Strength)
    strength_input = page.locator("input[onchange*='Strength']")

    # Check max attribute
    max_attr = strength_input.get_attribute("max")
    if max_attr == "10":
        print("VERIFIED: Stat max attribute is 10.")
    else:
        print(f"FAILED: Stat max attribute is {max_attr} (Expected 10).")

    # 2. Verify Points Pool Display
    # Check for elements with IDs we added
    expect(page.locator("#statPointsRemainingDisplay")).to_be_visible()
    expect(page.locator("#skillPointsRemainingDisplay")).to_be_visible()

    # Check initial values
    # Stats: 7 stats * 3 points = 21 points. Max 35. Remaining should be 14.
    # Actually, default points might differ. Let's read the text.
    remaining_stats = page.locator("#statPointsRemainingDisplay").inner_text()
    print(f"Initial Stat Points Remaining: {remaining_stats}")

    # Skills: 0 points spent. Max 30. Remaining should be 30.
    remaining_skills = page.locator("#skillPointsRemainingDisplay").inner_text()
    print(f"Initial Skill Points Remaining: {remaining_skills}")

    if remaining_skills == "30":
        print("VERIFIED: Initial skill points remaining is 30.")
    else:
        print(f"FAILED: Initial skill points remaining is {remaining_skills} (Expected 30).")

    # 3. Verify Interaction (Update Stat)
    # Increase Strength by 1
    current_str = int(strength_input.input_value())
    strength_input.fill(str(current_str + 1))
    strength_input.dispatch_event("change")

    # Check if remaining points decreased
    new_remaining_stats = page.locator("#statPointsRemainingDisplay").inner_text()
    print(f"New Stat Points Remaining: {new_remaining_stats}")

    if int(new_remaining_stats) < int(remaining_stats):
        print("VERIFIED: Stat points decreased after increase.")
    else:
        print("FAILED: Stat points did not decrease.")

    # 4. Verify Interaction (Update Skill)
    # Find a skill input (e.g., Electronics)
    electronics_input = page.locator("input[onchange*='Electronics']")
    electronics_input.fill("5")
    electronics_input.dispatch_event("change")

    new_remaining_skills = page.locator("#skillPointsRemainingDisplay").inner_text()
    print(f"New Skill Points Remaining: {new_remaining_skills}")

    if new_remaining_skills == "25":
        print("VERIFIED: Skill points updated correctly (30 -> 25).")
    else:
        print(f"FAILED: Skill points update incorrect. Expected 25, got {new_remaining_skills}")

    # 5. Verify NaN Handling (Skill)
    electronics_input.fill("") # Clear input (could cause NaN if not handled)
    electronics_input.dispatch_event("change")

    # Should default to 0 and restore points
    final_remaining_skills = page.locator("#skillPointsRemainingDisplay").inner_text()
    print(f"Skill Points after clearing input: {final_remaining_skills}")

    if final_remaining_skills == "30":
        print("VERIFIED: NaN/Empty input handled, points restored.")
    else:
        print("FAILED: NaN/Empty input mishandled.")

    page.screenshot(path="verify_mechanics_ui_final.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_mechanics_final(page)
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
