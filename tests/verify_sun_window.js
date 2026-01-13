const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock Browser Environment
const window = {
    gameState: {
        lightSources: [],
        currentTime: { hours: 12 }, // Noon
        fowData: {},
        mapsBootstrapped: {},
        showRoof: true
    },
    console: console,
    mapRenderer: {}
};
const document = {
    createElement: () => ({ style: {}, classList: { add: ()=>{}, remove: ()=>{} }, dataset: {} }),
    querySelectorAll: () => [],
    getElementById: () => null
};
window.document = document;

// Mock AssetManager
const assetManagerInstance = {
    tilesets: {
        "GR": { tags: ["landscape", "bottom"], color: "#00FF00" },
        "RW": { tags: ["roof", "impassable"], color: "#8B4513" },
        "WIN": { tags: ["window", "transparent", "middle"], color: "#88CCFF" },
        "WALL": { tags: ["wall", "impassable"], color: "#555555" },
        "FLOOR": { tags: ["floor", "bottom"], color: "#333333" },
        "LAMP": { tags: ["item", "middle"], emitsLight: true, lightRadius: 5, lightColor: "#FFFFFF" }
    }
};

// Load mapRenderer.js
const mapRendererCode = fs.readFileSync(path.join(__dirname, '../js/mapRenderer.js'), 'utf8');

const sandbox = {
    window: window,
    document: document,
    gameState: window.gameState,
    assetManagerInstance: assetManagerInstance,
    console: console,
    getDistance3D: (p1, p2) => Math.sqrt(Math.pow(p1.x-p2.x, 2) + Math.pow(p1.y-p2.y, 2) + Math.pow(p1.z-p2.z, 2)),
    profileFunction: (name, fn, ...args) => fn(...args),
    logToConsole: console.log
};

vm.createContext(sandbox);
vm.runInContext(mapRendererCode, sandbox);

sandbox.window.mapRenderer.initMapRenderer(assetManagerInstance);

const mapData = {
    id: "test_map",
    dimensions: { width: 20, height: 20 },
    levels: {
        "0": {
            bottom: Array(20).fill(null).map(() => Array(20).fill("FLOOR")),
            middle: Array(20).fill(null).map(() => Array(20).fill("")),
            roof: Array(20).fill(null).map(() => Array(20).fill(""))
        }
    }
};
sandbox.window.mapRenderer.getCurrentMapData = () => mapData;

function checkLight(x, y, z, label) {
    const lum = sandbox.window.mapRenderer.getTileLightLevel(x, y, z);
    return lum;
}

console.log("--- Starting Sun Window & Roof Verification ---");
let allPassed = true;

// Setup Room with Roof at (6,6)
// We need to understand directions: [y][x].
// y is row (vertical), x is col (horizontal).
// North is y- (Row 5). South is y+ (Row 7).
// West is x- (Col 5). East is x+ (Col 7).

mapData.levels["0"].roof[6][6] = "RW";
mapData.levels["0"].middle[6][5] = "WALL"; // West Wall
mapData.levels["0"].middle[5][6] = "WALL"; // North Wall

// Test 2: Morning (8:00). Sun Vector ~ (4.3, 1.0). Direction +X (East) and slight +Y (South).
// To let Morning Sun in, we need the East Wall to be a Window.
// East is [6][7].
mapData.levels["0"].middle[6][7] = "WIN"; // East Window

// Test 1: Noon (12:00). Sun Vector ~ (0, 2.0). Direction +Y (South).
// To block Noon Sun, we need the South Wall to be solid.
// South is [7][6].
mapData.levels["0"].middle[7][6] = "WALL"; // South Wall

// Verify Setup
// console.log("East (Window):", mapData.levels["0"].middle[6][7]);
// console.log("South (Wall):", mapData.levels["0"].middle[7][6]);

// Test 1: Noon (South Sun).
window.gameState.currentTime.hours = 12;
const noonLum = checkLight(6, 6, 0, "Room Noon");
// Sun (0, 2). Ray hits (6, 8) at Z+1.
// Passing through (6, 7) [South].
// (6, 7) is WALL.
// Should be Blocked.
if (noonLum > 0.05) {
    console.error(`FAIL: Room at Noon should be dark (Roof/Wall blocks). Got ${noonLum}`);
    allPassed = false;
} else {
    console.log(`PASS: Room at Noon is dark (${noonLum}).`);
}

// Test 2: Morning (8:00, East Sun).
window.gameState.currentTime.hours = 8;
const morningLum = checkLight(6, 6, 0, "Room Morning");
// Sun (4.3, 1). Ray hits East.
// Passing through (7, 6) [East].
// (7, 6) is WIN.
// Should be Lit.
if (morningLum < 0.5) {
    console.error(`FAIL: Room in Morning should be lit (Window). Got ${morningLum}`);
    allPassed = false;
} else {
    console.log(`PASS: Room in Morning is lit (${morningLum}).`);
}

if (allPassed) {
    console.log("ALL TESTS PASSED");
} else {
    console.log("SOME TESTS FAILED");
}
