
const fs = require('fs');
const path = require('path');

// Mock Browser Environment
global.window = {};
global.document = {
    getElementById: (id) => {
        if (id === 'surroundingsGrid') {
            return {
                style: {},
                classList: { contains: () => false, remove: () => {} },
                appendChild: () => {},
                innerHTML: ''
            };
        }
        return null;
    },
    createElement: (tag) => {
        return {
            style: {},
            appendChild: () => {},
            innerHTML: '', // This property will be written to
            children: []
        };
    }
};

// Mock Game State and Managers
global.window.gameState = {
    player: { x: 5, y: 5, z: 0 },
    npcs: []
};

global.window.assetManager = {
    tilesets: {
        "GR": { name: "Grass", sprite: ",", color: "green" },
        "WALL": { name: "Stone Wall", sprite: "#", color: "grey" },
        "VOID": { name: "Void", sprite: " ", color: "black" }
    }
};

global.window.mapRenderer = {
    getCurrentMapData: () => {
        return {
            dimensions: { width: 10, height: 10 },
            levels: {
                "0": {
                    middle: [
                        [], [], [], [], [],
                        [null, null, null, null, null, null, "WALL"], // y=5. x=6 is WALL
                        []
                    ],
                    bottom: [
                        [], [], [], [], [],
                        [null, null, null, null, null, "GR", "GR"], // y=5. x=5 is GR, x=6 is GR
                        []
                    ]
                }
            }
        };
    }
};

// Load SurroundingsUI code
const surroundingsUICode = fs.readFileSync('js/ui/surroundingsUI.js', 'utf8');
eval(surroundingsUICode);

// Instantiate and Test
const ui = new window.SurroundingsUI();

// Force update
ui.update();

console.log("--- SurroundingsUI Verification ---");
ui.cells.forEach((cell, index) => {
    // Cell (1,0) [Right of Player] -> x=6, y=5
    // Middle: WALL ("Stone Wall"), Bottom: GR ("Grass")
    if (cell.dx === 1 && cell.dy === 0) {
        console.log(`Cell (1,0) [Right of Player]:`);
        console.log(`Top HTML: ${cell.top.innerHTML}`);
        console.log(`Bottom HTML: ${cell.bottom.innerHTML}`);
    }

    // Cell (0,0) [Player] -> x=5, y=5
    // Middle: You, Bottom: GR ("Grass")
    if (cell.dx === 0 && cell.dy === 0) {
        console.log(`Cell (0,0) [Player]:`);
        console.log(`Top HTML: ${cell.top.innerHTML}`);
        console.log(`Bottom HTML: ${cell.bottom.innerHTML}`);
    }
});
