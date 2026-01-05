
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

test('Police Officer has correct quest dialogue in game', async ({ page }) => {
    // 1. Navigate to the game page
    await page.goto('http://localhost:8000');

    // 2. Wait for game initialization
    await page.waitForFunction(() => window.gameInitialized === true, { timeout: 10000 });

    // 3. Load the FPD map
    await page.evaluate(() => {
        window.processConsoleCommand('map FPD');
    });

    // Wait for map load with a generous timeout and polling
    await page.waitForFunction(() =>
        window.gameState &&
        window.gameState.currentMapId === 'FPD',
        { timeout: 10000, polling: 500 }
    );

    // 4. Teleport near the Police Officer (10, 9, 0)
    // Officer is at 10, 9, 0. Teleporting to 10, 8, 0 (adjacent)
    await page.evaluate(() => {
        window.processConsoleCommand('teleport 10 8 0');
    });

    // Give it a moment to process updates
    await page.waitForTimeout(1000);

    // 5. Verify the NPC data in memory has the correct dialogue file.
    const npcDialogueInfo = await page.evaluate(() => {
        const npc = window.gameState.npcs.find(n => n.definitionId === 'police_officer');
        if (!npc) return { status: 'NPC_NOT_FOUND' };

        // This checks if the instance property is set correctly
        return {
            status: 'FOUND',
            dialogueId: npc.dialogueId,
            dialogueFile: npc.dialogueFile,
            defDialogueFile: window.assetManager.getNpc(npc.definitionId)?.dialogueFile
        };
    });

    console.log("NPC Dialogue Info:", npcDialogueInfo);

    // Based on my fix, dialogueFile should be set on the instance in FPD.json
    expect(npcDialogueInfo.status).toBe('FOUND');
    expect(npcDialogueInfo.dialogueFile).toBe('police_find_clue_quest_give.json');

    // 6. Verify DialogueManager loads the correct content
    // Start dialogue programmatically
    await page.evaluate(() => {
        const npc = window.gameState.npcs.find(n => n.definitionId === 'police_officer');
        if (npc) {
            window.dialogueManager.startDialogue(npc);
        }
    });

    // Check if UI is visible and text contains unique quest string
    await page.waitForSelector('#dialogueUI:not(.hidden)', { timeout: 3000 });

    // Small wait for text to render
    await page.waitForTimeout(200);

    const dialogueText = await page.innerText('#dialogueText');
    console.log("Dialogue Text:", dialogueText);

    // Check for text specific to the quest dialogue
    expect(dialogueText).toContain('recover a vital clue');
});
