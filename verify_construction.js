const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000');

  // Listen for console logs
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // Wait for the game to initialize
  await page.waitForFunction(() => window.gameInitialized);

  // Wait for the map data to be fully loaded
  await page.waitForFunction(() => window.mapRenderer.getCurrentMapData() && window.mapRenderer.getCurrentMapData().levels);

  // Add required components to inventory
  await page.evaluate(() => {
    window.inventoryManager.addItemToInventoryById('wood_planks', 10);
    window.inventoryManager.addItemToInventoryById('nails', 10);
  });

  // Directly test the placement logic
  await page.evaluate(() => {
    const constructionManager = window.constructionManager;
    const definition = constructionManager.constructionDefinitions['workbench_basic_built'];
    const targetTilePos = { x: 12, y: 9, z: 0 };
    constructionManager.placeConstruction('workbench_basic_built', targetTilePos);
  });

  // Check if the construction was added to the map
  const constructionPlaced = await page.evaluate(() => {
    const mapData = window.mapRenderer.getCurrentMapData();
    console.log('mapData:', mapData);
    const buildingTile = mapData.levels['0'].building[9][12];
    return buildingTile === 'workbench_basic_tile';
  });

  if (constructionPlaced) {
    console.log('Test Passed!');
  } else {
    console.error('Test Failed!');
  }

  await browser.close();
})();
