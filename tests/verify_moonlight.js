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

console.log("--- Starting Moonlight & No-Ambient Verification ---");
let allPassed = true;

// 1. Ambient Check (Daytime shadow)
// At 12:00, if we are under a roof (opaque), it should be PITCH BLACK (0.0), not just Dark Ambient.
// Wait, my previous code sets ambient to 0 if under roof.
// But now `getAmbientLightColor` returns 0 GLOBALLY.
// So shadows OUTDOORS should also be black?
// Let's check outdoors at 12:00 but shadowed.
// Create a shadow caster.
mapData.levels["0"].middle[10][10] = "WALL"; // Wall at (10, 10)
// Sun at 12:00 -> South. Ray comes from South (+Y).
// Shadow falls to North (-Y).
// Check (10, 9).
const shadowLum = checkLight(10, 9, 0, "Outdoor Shadow (Noon)");
if (shadowLum > 0.05) {
    console.error(`FAIL: Outdoor shadow should be black (no ambient). Got ${shadowLum}`);
    allPassed = false;
} else {
    console.log(`PASS: Outdoor shadow is black (${shadowLum}).`);
}

// 2. Moonlight Check (Night)
window.gameState.currentTime.hours = 24; // Midnight (0:00)
// Or 0.
// Let's use 20 (8 PM). Moon should be up.
window.gameState.currentTime.hours = 20;

// Check Exposed Tile (15, 15). Should be lit by Moon.
const moonLitLum = checkLight(15, 15, 0, "Moonlit Tile");
if (moonLitLum < 0.05) {
    console.error(`FAIL: Moonlit tile should have some light. Got ${moonLitLum}`);
    allPassed = false;
} else {
    console.log(`PASS: Moonlit tile has light (${moonLitLum}).`);
}

// Check Moon Shadow
// Moon Path: 18:00 (East) -> 6:00 (West).
// 20:00 is early night. Moon is East-ish.
// Shadow falls West.
// Wall at (10, 10).
// Target (9, 10) should be shadowed?
// Let's calculate vector.
// (20-18)/12 * PI = 2/12 PI = PI/6 (30 deg).
// x = cos(30)*5 ~ 4.3. y = sin(30)*2 ~ 1.
// Vector is (+X, +Y). Ray from East.
// Shadow falls West (-X).
// Target (9, 10). Ray traces East to (13, 11).
// Does it hit (10, 10)?
// x: 9 -> 13. Passes through 10.
// y: 10 -> 11.
// stepX ~ 0.86. stepY ~ 0.2.
// 9.86, 10.2 -> (9, 10).
// 10.72, 10.4 -> (10, 10). HIT.
// So (9, 10) should be shadowed.
const moonShadowLum = checkLight(9, 10, 0, "Moon Shadow Tile");
if (moonShadowLum > 0.05) { // Should be 0 (No ambient)
    console.error(`FAIL: Moon shadow should be dark. Got ${moonShadowLum}`);
    allPassed = false;
} else {
    console.log(`PASS: Moon shadow is dark (${moonShadowLum}).`);
}

if (allPassed) {
    console.log("ALL TESTS PASSED");
} else {
    console.log("SOME TESTS FAILED");
}
