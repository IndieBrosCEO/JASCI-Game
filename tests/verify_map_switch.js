const fs = require('fs');
const path = require('path');

// Mock browser environment
global.window = {};
global.getComputedStyle = () => ({ fontFamily: "monospace", fontSize: "12px", lineHeight: "12px" });
global.document = {
    createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} }, dataset: {}, offsetWidth: 10, offsetHeight: 18 }),
    createDocumentFragment: () => ({ appendChild: () => {} }),
    getElementById: () => ({ innerHTML: "", appendChild: () => {}, clientWidth: 100, clientHeight: 100, scrollLeft: 0, scrollTop: 0 }),
    querySelectorAll: () => [],
    body: { appendChild: () => {}, removeChild: () => {} }
};
global.requestAnimationFrame = (cb) => cb();

// Mock logging
global.logToConsole = (msg) => {
    // console.log(`[LOG] ${msg}`);
};

global.profileFunction = (name, fn, ...args) => fn(...args);

// Mock AssetManager
global.assetManagerInstance = {
    tilesets: {
        "floor": { tags: ["floor"], sprite: ".", color: "#555" }
    }
};

// Mock GameState
global.gameState = {
    fowData: {
        fowCurrentlyVisible: {}
    },
    lightSources: [],
    containers: [],
    activeFires: [],
    playerPos: { x: 5, y: 5, z: 0 },
    currentViewZ: 0
};

// Load mapRenderer
const mapRendererContent = fs.readFileSync(path.join(__dirname, '../js/mapRenderer.js'), 'utf8');
eval(mapRendererContent);

window.mapRenderer.initMapRenderer(global.assetManagerInstance);

// 1. Load Small Map (10x10)
const smallMap = {
    id: "small_map",
    dimensions: { width: 10, height: 10 },
    levels: {
        "0": {
            bottom: Array(10).fill().map(() => Array(10).fill("floor")),
            middle: Array(10).fill().map(() => Array(10).fill("")),
        }
    },
    startPos: { x: 5, y: 5, z: 0 }
};

console.log("Loading Small Map (10x10)...");
window.mapRenderer.initializeCurrentMap(smallMap);

// Update FOW to initialize arrays
window.mapRenderer.updateFOW(5, 5, 0, 5);

let fowData = global.gameState.fowData["0"];
if (fowData.length === 10 && fowData[0].length === 10) {
    console.log("Small Map FOW size correct (10x10).");
} else {
    console.error(`Small Map FOW size incorrect: ${fowData.length}x${fowData[0]?.length}`);
}

// 2. Load Large Map (20x20)
const largeMap = {
    id: "large_map",
    dimensions: { width: 20, height: 20 },
    levels: {
        "0": {
            bottom: Array(20).fill().map(() => Array(20).fill("floor")),
            middle: Array(20).fill().map(() => Array(20).fill("")),
        }
    },
    startPos: { x: 5, y: 5, z: 0 }
};

console.log("Loading Large Map (20x20)...");
window.mapRenderer.initializeCurrentMap(largeMap);

// Check if FOW data was reset and re-initialized to correct dimensions
fowData = global.gameState.fowData["0"];
if (fowData && fowData.length === 20 && fowData[0].length === 20) {
    console.log("Large Map FOW size correct (20x20) after load - PASS");
} else {
    console.log(`Large Map FOW size incorrect after load: ${fowData ? fowData.length + 'x' + fowData[0]?.length : 'undefined'} - FAIL`);
}

// Update FOW. This should work without error
try {
    window.mapRenderer.updateFOW(10, 10, 0, 5);
    fowData = global.gameState.fowData["0"];
    if (fowData && fowData.length === 20 && fowData[0].length === 20) {
        console.log("Large Map FOW size correct (20x20) after updateFOW - PASS");
    } else {
        console.log(`Large Map FOW size incorrect after updateFOW: ${fowData ? fowData.length + 'x' + fowData[0]?.length : 'undefined'} - FAIL`);
    }
} catch (e) {
    console.error("Error during updateFOW on Large Map:", e.message);
    console.log("Test FAILED due to error.");
}
