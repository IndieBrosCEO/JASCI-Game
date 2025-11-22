const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', exception => {
    console.log(`Page Error: ${exception}`);
    errors.push(exception);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
        console.log(`Console Error: ${msg.text()}`);
        errors.push(msg.text());
    }
  });

  try {
    await page.goto('http://localhost:8000');

    await page.waitForFunction(() => window.gameInitialized === true, { timeout: 5000 });

    // Start game
    await page.click('#startGameButton');
    await page.waitForTimeout(1000);

    // Setup Combat
    await page.evaluate(() => {
        window.gameState.playerPos = { x: 5, y: 5, z: 0 };
        // Force player high Dex
        window.gameState.stats = [{name: "Dexterity", points: 100}];

        const dummy = {
            id: 'aim_test_dummy',
            name: 'Aim Test Dummy',
            health: { torso: { current: 10, max: 10 }, head: { current: 10, max: 10 } },
            mapPos: { x: 5, y: 6, z: 0 },
            teamId: 2,
            stats: { Dexterity: 1 }, // Low Dex
            skills: { Unarmed: 0 }
        };
        window.gameState.npcs.push(dummy);
        window.combatManager.startCombat([window.gameState, dummy]);
    });

    // Wait for attack UI to appear
    try {
        await page.waitForSelector('#attackDeclarationUI:not(.hidden)', { timeout: 2000 });
    } catch (e) {
        console.log("Attack UI did not appear within timeout.");
        // Check if it's hidden
        const isHidden = await page.$eval('#attackDeclarationUI', el => el.classList.contains('hidden'));
        console.log(`Is Attack UI hidden? ${isHidden}`);

        // Check whose turn it is
        const attackerName = await page.evaluate(() => window.combatManager.gameState.combatCurrentAttacker?.name);
        console.log(`Current Attacker: ${attackerName}`);
        throw e;
    }

    const aimButton = await page.$('#aimButton');
    if (!aimButton) throw new Error("Aim button not found in DOM");

    const isVisible = await aimButton.isVisible();
    if (!isVisible) throw new Error("Aim button is not visible");

    console.log("Clicking Aim...");
    await aimButton.click();
    await page.waitForTimeout(500);

    // Verify Aim Effect
    const aimingEffect = await page.evaluate(() => window.gameState.player.aimingEffect);
    if (!aimingEffect) throw new Error("Player aimingEffect flag was not set after clicking Aim");

    const ap = await page.evaluate(() => window.gameState.actionPointsRemaining);
    if (ap !== 0) throw new Error(`AP was not consumed correctly. Expected 0, got ${ap}`);

    console.log("Aim action verified successfully.");

    const tracker = await page.evaluate(() => window.combatManager.initiativeTracker);
    if (tracker.length > 0 && typeof tracker[0].tieBreaker === 'undefined') {
        throw new Error("Initiative tracker entries do not have tieBreaker property");
    }
    console.log("Initiative tieBreaker verified.");

    // Take screenshot
    await page.screenshot({ path: '/home/jules/verification/verification.png' });
    console.log("Screenshot saved to /home/jules/verification/verification.png");

  } catch (error) {
    console.error('Test Failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
