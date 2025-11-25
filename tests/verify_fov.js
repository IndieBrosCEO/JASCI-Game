const fs = require('fs');
const path = require('path');

// Mock browser environment
global.window = {};
global.document = {
    createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
    createDocumentFragment: () => ({ appendChild: () => {} }),
    getElementById: () => null,
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
        "floor": { tags: ["floor"], sprite: ".", color: "#555" },
        "wall": { tags: ["impassable", "blocks_vision"], sprite: "#", color: "#AAA" },
        "window": { tags: ["impassable", "transparent", "allows_vision"], sprite: "O", color: "#88F" },
        "air": { tags: [], sprite: " ", color: "#000" }
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
    currentViewZ: 0,
    currentWeather: { type: 'fog' } // Test with Fog
};

// Mock WeatherManager
global.window.weatherManager = {
    getVisionRadius: () => {
        if (global.gameState.currentWeather.type === 'fog') return 50;
        if (global.gameState.currentWeather.type === 'clear') return 2112;
        return 10;
    }
};

// Load script.js content to define getPlayerVisionRadius
// We only need the function definition, so we can eval a mock or the function itself.
// Since script.js has other dependencies, I'll just define the function as it appears in the file for the test context.
global.window.getPlayerVisionRadius = function() {
    if (global.window.weatherManager && typeof global.window.weatherManager.getVisionRadius === 'function') {
        return global.window.weatherManager.getVisionRadius();
    }
    return 10;
};


// Load mapRenderer
const mapRendererContent = fs.readFileSync(path.join(__dirname, '../js/mapRenderer.js'), 'utf8');
eval(mapRendererContent);

// Setup a small 3D map (10x10x3)
const mapData = {
    id: "test_map",
    dimensions: { width: 10, height: 10 },
    levels: {
        "0": { // Ground floor
            bottom: Array(10).fill().map(() => Array(10).fill("floor")),
            middle: Array(10).fill().map(() => Array(10).fill("")),
        },
        "1": { // Upper floor
            bottom: Array(10).fill().map(() => Array(10).fill("floor")), // Ceiling of 0 / Floor of 1
            middle: Array(10).fill().map(() => Array(10).fill("")),
        }
    },
    startPos: { x: 5, y: 5, z: 0 }
};

// Initialize Map Renderer
window.mapRenderer.initMapRenderer(global.assetManagerInstance);
window.mapRenderer.initializeCurrentMap(mapData);

// Test Integration: Check getPlayerVisionRadius
const radius = global.window.getPlayerVisionRadius();
console.log(`Test: Vision Radius for Fog: ${radius} (Expected: 50)`);

// Test FOW Update with this radius
console.log("Test: Updating FOW at (5,5,0) with dynamic radius");
window.mapRenderer.updateFOW(5, 5, 0, radius);

const fow0 = global.gameState.fowData["0"];
const fow1 = global.gameState.fowData["1"];

console.log(`Z=0 (5,5) visibility: ${fow0[5][5]}`);
console.log(`Z=1 (5,5) visibility: ${fow1[5][5]}`);

// Change weather to clear
global.gameState.currentWeather.type = 'clear';
const radiusClear = global.window.getPlayerVisionRadius();
console.log(`Test: Vision Radius for Clear: ${radiusClear} (Expected: 2112)`);
