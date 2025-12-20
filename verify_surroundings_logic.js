
const fs = require('fs');
const path = require('path');

// Mock window and global objects
global.window = {};
global.document = {
    getElementById: () => ({
        classList: { contains: () => false, remove: () => {} },
        style: {},
        appendChild: () => {},
        innerHTML: ""
    }),
    createElement: () => {
        return {
            style: {},
            appendChild: () => {},
            innerHTML: ""
        };
    }
};

// Mock dependencies
class AssetManager {
    constructor() {
        this.tilesets = {};
    }
    async loadDefinitions() {
        // Load tileset.json directly for testing
        const tilesetPath = path.join(__dirname, 'assets/definitions/tileset.json');
        this.tilesets = JSON.parse(fs.readFileSync(tilesetPath, 'utf8'));
    }
}

global.assetManager = new AssetManager();
global.gameState = {
    player: { x: 10, y: 10, z: 0 },
    npcs: []
};

// Mock MapRenderer
global.mapRenderer = {
    getCurrentMapData: () => {
        return {
            dimensions: { width: 20, height: 20 },
            levels: {
                "0": {
                    middle: Array(20).fill().map(() => Array(20).fill("")),
                    bottom: Array(20).fill().map(() => Array(20).fill("GR")) // Fill with Grass
                }
            }
        };
    }
};

// Load SurroundingsUI code manually since it's not a module
const uiCode = fs.readFileSync(path.join(__dirname, 'js/ui/surroundingsUI.js'), 'utf8');
// We need to eval it to add SurroundingsUI to window
eval(uiCode);

async function runTest() {
    await global.assetManager.loadDefinitions();
    // console.log("Tileset loaded. GR definition:", global.assetManager.tilesets["GR"]);

    const ui = new global.window.SurroundingsUI();

    ui.update();

    // Check the cell corresponding to (0,0) relative (center)
    const centerCell = ui.cells.find(c => c.dx === 0 && c.dy === 0);
    console.log("Center Cell Top HTML:", centerCell.top.innerHTML);
    console.log("Center Cell Bottom HTML:", centerCell.bottom.innerHTML);

    // Check a neighbor cell (1,0)
    const neighborCell = ui.cells.find(c => c.dx === 1 && c.dy === 0);
    console.log("Neighbor Cell Top HTML:", neighborCell.top.innerHTML);
    console.log("Neighbor Cell Bottom HTML:", neighborCell.bottom.innerHTML);
}

runTest();
