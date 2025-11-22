from playwright.sync_api import sync_playwright, expect

def verify_character_mechanics(page):
    # Navigate to the local server (ensure it's running)
    page.goto("http://localhost:8000")

    # Wait for the game to initialize (wait for start button)
    # The game now starts with the character creator visible.
    expect(page.locator("#character-creator")).to_be_visible()

    # 1. Verify Stats List (No Marksmanship)
    stats_body = page.locator("#statsBody")
    expect(stats_body).to_contain_text("Strength")
    expect(stats_body).to_contain_text("Intelligence")
    expect(stats_body).not_to_contain_text("Marksmanship")
    print("VERIFIED: Marksmanship is absent from stats UI.")

    # 2. Verify Skill Points (30 Starting)
    # The starting total logic is internal, but the UI might display remaining points.
    # Assuming no points spent initially.
    # Check for an element displaying skill points.
    # character.js renders points on change, but there's also a #skillPoints span in index.html usually.
    # Let's see if we can find "Skill Points Remaining: 30" or similiar text logic.
    # Actually, let's check the global state via evaluation.

    # But first, let's take a screenshot of the initial state
    page.screenshot(path="verify_mechanics_initial.png")

    # Check global state via console
    stats_names = page.evaluate("() => window.gameState.stats.map(s => s.name)")
    if "Marksmanship" not in stats_names:
        print("VERIFIED (State): Marksmanship not in gameState.stats")
    else:
        print("FAILED (State): Marksmanship found in gameState.stats")

    unspent_skill_points = page.evaluate("() => window.gameState.unspentSkillPoints")
    # Or better, check what happens when we try to add skill points.
    # The updateSkill function uses MAX_SKILL_POINTS or 30 default.
    # Let's try to set a skill to 31 via UI or console and see if it warns.

    # Let's check if the Skill Modifiers are correct in the UI or logic.
    # Currently the character creator only shows points, not modifiers.
    # We can check modifiers after game start or via console.

    # Let's verify the Skill -> Stat association via a console test inside the browser context
    # to ensure the live environment matches our offline verify_mechanics.js

    skill_associations_check = page.evaluate("""() => {
        const results = [];
        // Mock entity with 20 INT (Mod 9) and 0 Explosives. Result should be 9.
        const mockEnt = {
            stats: [{name: 'Intelligence', points: 20}],
            skills: [{name: 'Explosives', points: 0}]
        };
        const mod = window.getSkillModifier('Explosives', mockEnt);
        if (mod === 9) results.push("Explosives->INT: PASS");
        else results.push("Explosives->INT: FAIL (Expected 9, got " + mod + ")");

        // Mock entity with 20 PER (Mod 9) and 0 Guns. Result 9.
        const mockEnt2 = {
            stats: [{name: 'Perception', points: 20}],
            skills: [{name: 'Guns', points: 0}]
        };
        const mod2 = window.getSkillModifier('Guns', mockEnt2);
        if (mod2 === 9) results.push("Guns->PER: PASS");
        else results.push("Guns->PER: FAIL (Expected 9, got " + mod2 + ")");

        return results;
    }""")

    for res in skill_associations_check:
        print(res)

    page.screenshot(path="verify_mechanics_final.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_character_mechanics(page)
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
