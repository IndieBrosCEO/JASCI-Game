const { firefox } = require('playwright');

(async () => {
  const browser = await firefox.launch({
    headless: true,
    executablePath: '/home/jules/.cache/ms-playwright/firefox-1495/firefox/firefox'
  });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:8000/index.html');
    await page.waitForFunction(() => window.gameInitialized === true);
    await page.click('#startGameButton');
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
        // Mock requirements for Medic
        // 1. Mark quest as completed
        window.gameState.completedQuests.push("save_the_clinic");
        // 2. Set reputation (if needed, but civilian/neutral is usually default)

        // Spawn Medic
        const medicDef = window.assetManager.getNpc("medic_doctor");
        const newNpc = JSON.parse(JSON.stringify(medicDef));
        newNpc.id = "test_medic_recruit";
        newNpc.mapPos = { x: window.gameState.playerPos.x + 1, y: window.gameState.playerPos.y, z: window.gameState.playerPos.z };
        window.initializeHealth(newNpc);
        window.gameState.npcs.push(newNpc);

        // Start Dialogue
        window.dialogueManager.startDialogue(newNpc);
    });

    await page.waitForSelector('#dialogueUI:not(.hidden)');

    // Check if the recruitment option appears
    const recruitOption = await page.$('#dialogueOptions li:has-text("I\'m looking for allies")');
    if (recruitOption) {
        console.log("SUCCESS: Recruitment option appeared.");
        await recruitOption.click();
        await page.waitForTimeout(500);

        // Check if we are in the recruit_offer node (text check)
        const text = await page.$eval('#dialogueText', el => el.textContent);
        if (text.includes("I suppose I could")) {
             console.log("SUCCESS: Advanced to recruit_offer node.");
             // Click confirm
             await page.click('#dialogueOptions li:has-text("Glad to have you")');
             await page.waitForTimeout(500);

             // Check if companion was added
             const isCompanion = await page.evaluate(() => {
                 return window.companionManager.isCompanion("test_medic_recruit");
             });

             if (isCompanion) {
                 console.log("SUCCESS: NPC was recruited via dialogue.");
             } else {
                 console.error("FAILURE: NPC was NOT recruited after dialogue action.");
             }
        } else {
             console.error("FAILURE: Did not advance to recruit_offer node. Text: " + text);
        }
    } else {
        console.error("FAILURE: Recruitment option NOT found (Condition failed?).");
        // Debug condition
        const debug = await page.evaluate(() => {
            const npc = window.gameState.npcs.find(n => n.id === "test_medic_recruit");
            return {
                canRecruit: window.companionManager.canRecruitNpc(npc.id),
                quests: window.gameState.completedQuests
            };
        });
        console.log("Debug info:", debug);
    }

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await browser.close();
  }
})();
