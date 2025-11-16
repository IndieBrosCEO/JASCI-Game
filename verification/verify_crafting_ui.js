const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen for console logs, errors, and failed requests
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.error(`REQUEST FAILED: ${request.url()}`));

  try {
    await page.goto('http://localhost:8000');

    // Wait for the game to initialize
    await page.waitForFunction(() => window.gameInitialized);

    // An initial click to focus the game window
    await page.click('#mapContainer');

    // Open the crafting menu
    await page.keyboard.press('c');

    // Wait for the crafting UI to be visible
    await page.waitForSelector('#craftingUI:not(.hidden)');

    // Find and click the "Basic Gunpowder" recipe
    await page.click('li[data-recipe-id="gunpowder_basic"]');

    // Wait for the detail pane to update
    await page.waitForSelector('#craftingDetailComponents li');

    // Get the text content of the components list
    const componentsText = await page.textContent('#craftingDetailComponents');

    // Assert that the component names are present and "undefined" is not
    assert(componentsText.includes('charcoal'), 'Component "charcoal" not found.');
    assert(componentsText.includes('sulfur'), 'Component "sulfur" not found.');
    assert(componentsText.includes('saltpeter'), 'Component "saltpeter" not found.');
    assert(!componentsText.includes('undefined'), 'Found "undefined" in components list.');

    console.log('Verification successful: Crafting UI displays recipe components correctly.');

  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1); // Exit with error code on failure
  } finally {
    await browser.close();
  }
})();
