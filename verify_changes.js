const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'http://localhost:8000/index.html';

    console.log(`Navigating to ${url}`);
    await page.goto(url);

    // Wait for the character creator to load (stat inputs)
    await page.waitForSelector('.stat-input', { timeout: 10000 });

    // Inject styles to ensure full page screenshot
    await page.addStyleTag({ content: 'body { height: auto; overflow: visible; }' });

    // 1. Verify 'Willpower' is missing from the page
    const content = await page.content();
    if (content.includes('Willpower')) {
        console.error('FAIL: "Willpower" found on the page.');
    } else {
        console.log('PASS: "Willpower" not found on the page.');
    }

    // 2. Verify 'Charisma' is present and has correct colors
    const charismaRow = await page.locator('.stat-row', { hasText: 'Charisma' });
    if (await charismaRow.count() > 0) {
        console.log('PASS: "Charisma" found on the page.');

        // Check background color of the icon
        const icon = charismaRow.locator('.stat-icon');
        const bgColor = await icon.evaluate(el => getComputedStyle(el).backgroundColor);
        console.log(`Charisma Icon BgColor: ${bgColor}`);
        // Magenta is rgb(255, 0, 255)
        if (bgColor === 'rgb(255, 0, 255)') {
             console.log('PASS: Charisma icon is Magenta.');
        } else {
             console.error(`FAIL: Charisma icon is ${bgColor}, expected rgb(255, 0, 255).`);
        }
    } else {
        console.error('FAIL: "Charisma" row not found.');
    }

    // 3. Verify 'Persuasion' (associated skill) is present and correct color
    const persuasionRow = await page.locator('.skill-row', { hasText: 'Persuasion' });
    if (await persuasionRow.count() > 0) {
        console.log('PASS: "Persuasion" found on the page.');
        const icon = persuasionRow.locator('.stat-icon');
        const bgColor = await icon.evaluate(el => getComputedStyle(el).backgroundColor);
        console.log(`Persuasion Icon BgColor: ${bgColor}`);
        if (bgColor === 'rgb(255, 0, 255)') {
             console.log('PASS: Persuasion icon is Magenta.');
        } else {
             console.error(`FAIL: Persuasion icon is ${bgColor}, expected rgb(255, 0, 255).`);
        }
    } else {
        console.error('FAIL: "Persuasion" row not found.');
    }


    await page.screenshot({ path: 'verification_screenshot.png', fullPage: true });
    console.log('Screenshot saved to verification_screenshot.png');

    await browser.close();
})();
