
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock window and other globals
const mockWindow = {
    console: console,
    mapRenderer: null, // Will be set by eval
    assetManager: null, // Will be set by test
};

// Global context
global.window = mockWindow;
global.assetManagerInstance = null; // Will be set by initMapRenderer
global.gameState = {
    fowData: {},
    mapsBootstrapped: {},
    lightSources: [],
    containers: [],
    tileCache: null,
    renderScheduled: false
};
global.document = {
    getElementById: () => ({}),
    createElement: () => ({ style: {} }),
    body: { appendChild: () => {}, removeChild: () => {} }
};
global.logToConsole = (msg) => console.log("[GAME LOG]", msg);

// Helper to simulate requestAnimationFrame
global.requestAnimationFrame = (cb) => cb();
global.profileFunction = (name, fn, ...args) => fn(...args);

// Load the file content
const mapRendererContent = fs.readFileSync(path.join(__dirname, '../js/mapRenderer.js'), 'utf8');

// Evaluate the code in the global context
vm.runInThisContext(mapRendererContent);

// Test Setup
function runTest() {
    console.log("Running mapRenderer isTileBlockingVision fallback verification...");

    // Mock AssetManager
    const mockAssetManager = {
        tilesets: {
            "wall": { tags: ["blocks_vision"] },
            "floor": { tags: ["floor"] }
        },
        getItem: () => null
    };

    // Mock MapData
    const mockMapData = {
        id: "testMap",
        dimensions: { width: 10, height: 10 },
        levels: {
            "0": {
                bottom: [],
                middle: []
            }
        },
        startPos: { x: 0, y: 0, z: 0 }
    };
    // Populate mock level
    for(let y=0; y<10; y++) {
        mockMapData.levels["0"].bottom[y] = [];
        mockMapData.levels["0"].middle[y] = [];
        for(let x=0; x<10; x++) {
            mockMapData.levels["0"].bottom[y][x] = { tileId: "floor" };
            mockMapData.levels["0"].middle[y][x] = "";
        }
    }
    // Place a wall at 5,5
    mockMapData.levels["0"].middle[5][5] = { tileId: "wall" };

    // Setup mapRenderer
    window.mapRenderer.initializeCurrentMap(mockMapData);

    // TEST: window.assetManager is set, initMapRenderer NOT called (assetManagerInstance is null)
    // This tests the global fallback/direct access required by the task.

    window.assetManager = mockAssetManager;
    // assetManagerInstance is null by default in this context since initMapRenderer wasn't called.

    console.log("Verifying: window.assetManager set, assetManagerInstance null");

    let isBlocked = window.mapRenderer.isTileBlockingVision(5, 5, 0, 0);
    if (isBlocked === true) {
        console.log("PASS: Wall at 5,5 blocked vision using window.assetManager");
    } else {
        console.error("FAIL: Wall at 5,5 did NOT block vision (fallback failed)");
        process.exit(1);
    }

    // Verify a floor is not blocking
    let isFloorBlocked = window.mapRenderer.isTileBlockingVision(5, 4, 0, 0);
    if (isFloorBlocked === false) {
        console.log("PASS: Floor at 5,4 did not block vision");
    } else {
        console.error("FAIL: Floor at 5,4 blocked vision unexpectedly");
        process.exit(1);
    }
}

try {
    runTest();
} catch (e) {
    console.error("Test Execution Failed:", e);
    process.exit(1);
}
