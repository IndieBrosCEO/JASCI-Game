import json
from playwright.sync_api import sync_playwright

def verify_monsters_and_men():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the page
        page.goto("http://localhost:8080/Website%20Tools/monsters_and_men.html")
        print(f"Page title: {page.title()}")

        # 1. Check Default Values
        # Strength default 2
        # Use first() because multiple inputs have onchange updateStat if I didn't filter enough,
        # but actually updateStat('Strength') is unique.
        str_input = page.locator("input[onchange*=\"updateStat('Strength'\"]")
        str_val = str_input.input_value()
        print(f"Default Strength: {str_val}")
        if str_val != "2":
             print("FAIL: Default Strength is not 2")

        # Check Health parts
        head_text = page.locator("td:text('Head')").first.inner_text()
        if "Head" not in head_text:
             print("FAIL: Head body part not found or incorrect")

        # 2. Modify Stat and Check Modifier
        # Update Strength to 10
        str_input.fill("10")
        str_input.press("Enter") # Trigger change

        # Wait for re-render? It's synchronous JS but DOM update might take a tick.
        # Playwright auto-waits for elements to be stable usually.
        # Re-query the row because it was replaced.
        str_row = page.locator("tr:has-text('Strength')").first
        mod_cell = str_row.locator(".mod-display")

        # Expect +4
        try:
            import time
            time.sleep(0.5) # Allow JS to run
            mod_text = mod_cell.inner_text()
            print(f"Strength 10 Modifier: {mod_text}")
            if mod_text != "+4":
                print("FAIL: Strength 10 modifier should be +4")
        except Exception as e:
            print(f"FAIL: Could not read modifier: {e}")

        # 3. Check Skill Mod update
        # Melee Weapons depends on Strength.
        # Str is 10 (+4). Skill is 0 (0). Total +4.
        melee_row = page.locator("tr:has-text('Melee Weapons')").first
        melee_mod = melee_row.locator(".mod-display").inner_text()
        print(f"Melee Weapons (Str 10) Modifier: {melee_mod}")
        if melee_mod != "+4":
             print("FAIL: Melee Weapons mod should update with Strength to +4")

        # Update Skill Score to 20.
        # 20/10 = 2. Total Mod = 2 + 4 = 6.
        melee_input = melee_row.locator("input")
        melee_input.fill("20")
        melee_input.press("Enter")

        time.sleep(0.5)

        # Re-query
        melee_row = page.locator("tr:has-text('Melee Weapons')").first
        melee_mod = melee_row.locator(".mod-display").inner_text()
        print(f"Melee Weapons Score 20 Modifier: {melee_mod}")
        if melee_mod != "+6":
             print("FAIL: Melee Weapons mod should be +6")

        # 4. JSON Validation Test
        # Invalid Keys
        invalid_json = {
            "name": "Bad",
            "stats": {},
            "skills": {},
            "health": [],
            "attributes": "",
            "notes": ""
        }
        json_str = json.dumps(invalid_json)
        page.evaluate(f"validateAndLoad({json_str})")

        error_msg = page.locator("#errorMessage").inner_text()
        print(f"Error Message for invalid keys: {error_msg}")
        if "Validation Failed" not in error_msg:
             print("FAIL: Should show validation error for missing stats")

        # Valid JSON
        valid_json = {
            "name": "Good Creature",
            "stats": {"Strength": 2, "Intelligence": 2, "Dexterity": 2, "Constitution": 2, "Perception": 2, "Willpower": 2, "Charisma": 2},
            "skills": {
                "Animal Handling": 0, "Electronics": 0, "Explosives": 0, "Guns": 0, "Intimidation": 0, "Investigation": 0, "Lockpick": 0, "Medicine": 0, "Melee Weapons": 0, "Persuasion": 0, "Repair": 0, "Sleight of Hand": 0, "Stealth": 0, "Survival": 0, "Unarmed": 0
            },
            "health": [
                { "part": "Head", "HP": 5, "armorDefense": 0 },
                { "part": "Torso", "HP": 8, "armorDefense": 0 },
                { "part": "Left Arm", "HP": 7, "armorDefense": 0 },
                { "part": "Right Arm", "HP": 7, "armorDefense": 0 },
                { "part": "Left Leg", "HP": 7, "armorDefense": 0 },
                { "part": "Right Leg", "HP": 7, "armorDefense": 0 }
            ],
            "attributes": "Strong",
            "notes": "None"
        }
        json_str_valid = json.dumps(valid_json)
        page.evaluate(f"validateAndLoad({json_str_valid})")

        name_val = page.input_value("#creatureName")
        print(f"Loaded Name: {name_val}")
        if name_val != "Good Creature":
             print("FAIL: Name did not update on load")

        error_msg = page.locator("#errorMessage").inner_text()
        if error_msg != "":
             print(f"FAIL: Error message should be empty, got: {error_msg}")

        page.screenshot(path="verification/monsters_and_men_verified.png")
        print("Screenshot saved.")

        browser.close()

if __name__ == "__main__":
    verify_monsters_and_men()
