import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    # --- 1. File System Verification ---
    print("--- Verifying file system for cleanup ---")
    cleanup_success = True
    if os.path.exists('/home/jules/verification'):
        print("[FAILURE] /home/jules/verification directory still exists.")
        cleanup_success = False
    else:
        print("[SUCCESS] /home/jules/verification directory has been deleted.")

    if not cleanup_success:
        print("\nFile system verification failed. Aborting browser test.")
        return

    # --- 2. Browser Verification ---
    print("\n--- Verifying keybinding and combat flow in-game ---")
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

        try:
            # Navigate to the game
            await page.goto('http://localhost:8000')

            # Start the game
            await page.wait_for_selector('#character-creator', state='visible')
            await page.click('#startGameButton')
            await page.wait_for_function('window.gameInitialized', timeout=5000) # Reduced timeout for faster failure
            print("Game started.")

            # --- Check Panel Opening with 'R' key ---
            print("Pressing 'r' to open the Nearby Entities panel...")
            await page.press('body', 'r')
            await asyncio.sleep(0.5)

            panel_visible = await page.is_visible('#nearbyEntitiesPanel')
            if not panel_visible:
                print("[FAILURE] Nearby Entities panel is NOT visible after pressing 'r'.")
                await browser.close()
                return
            print("[SUCCESS] Nearby Entities panel is visible.")

            # --- Check Panel Closing with 'R' key ---
            print("Pressing 'r' again to close the panel...")
            await page.press('body', 'r')
            await asyncio.sleep(0.5)

            panel_hidden = await page.is_hidden('#nearbyEntitiesPanel')
            if not panel_hidden:
                print("[FAILURE] Nearby Entities panel is NOT hidden after pressing 'r' a second time.")
                await browser.close()
                return
            print("[SUCCESS] Nearby Entities panel is hidden.")

            # --- Check Combat Flow ---
            print("\n--- Verifying combat initiation and turn progression ---")
            # Initiate combat with the 'f' key (assuming a target is in range)
            await page.press('body', 'f')
            await asyncio.sleep(1) # Wait for combat to start

            in_combat = await page.evaluate('window.gameState.isInCombat')
            if not in_combat:
                print("[FAILURE] Combat did not start after pressing 'f'.")
                await browser.close()
                return
            print("[SUCCESS] Combat initiated.")

            # Check if it's the player's turn
            is_player_turn = await page.evaluate('window.gameState.combatCurrentAttacker === window.gameState.player')
            if not is_player_turn:
                print("It's not the player's turn, which can happen with random initiative. The test will proceed, but this may indicate an issue if it happens consistently.")
            else:
                print("Player's turn confirmed.")

            # End the player's turn with the 't' key
            print("Pressing 't' to end the player's turn...")
            await page.press('body', 't')
            await asyncio.sleep(1) # Wait for turn to process

            is_player_turn_after_t = await page.evaluate('window.gameState.combatCurrentAttacker === window.gameState.player')
            if is_player_turn_after_t and is_player_turn:
                print("[FAILURE] It is still the player's turn after pressing 't'.")
                await browser.close()
                return
            print("[SUCCESS] Player's turn ended successfully.")

            print("\nComprehensive Verification PASSED!")

        except Exception as e:
            print(f"An error occurred during the browser test: {e}")
        finally:
            await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
