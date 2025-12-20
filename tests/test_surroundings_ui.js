
const fs = require('fs');
const path = require('path');

// --- SMART MOCK DOM ---

class MockElement {
    constructor(tagName) {
        this.tagName = tagName.toUpperCase();
        this.style = {};
        this.children = [];
        this._innerHTML = "";
    }

    get innerHTML() {
        if (this.children.length > 0) {
            return this.children.map(c => c.innerHTML).join("");
        }
        return this._innerHTML;
    }

    set innerHTML(val) {
        this._innerHTML = val;
        this.children = []; // Clear children
    }

    appendChild(child) {
        this.children.push(child);
    }

    get classList() {
        return {
            contains: () => false,
            remove: () => {}
        }
    }
}

global.window = {};
global.document = {
    getElementById: (id) => new MockElement("DIV"),
    createElement: (tag) => new MockElement(tag)
};

// --- MOCK DEPENDENCIES ---

// Mock AssetManager
class MockAssetManager {
    constructor() {
        this.tilesets = {
            "GR": { sprite: ",", color: "green", name: "Grass" },
            "WS": { sprite: "~", color: "blue", name: "Shallow Water" },
            "WD": { sprite: "~", color: "darkblue", name: "Deep Water" },
            "TB": { sprite: "T", color: "brown", name: "Table" },
            "WALL": { sprite: "#", color: "grey", name: "Brick Wall", tags: ["solid_terrain_top"] },
            "apple": { sprite: "o", color: "red", name: "Apple" }
        };
    }
    getItem(id) {
        return this.tilesets[id];
    }
}
global.assetManager = new MockAssetManager();
global.window.assetManager = global.assetManager;

// Mock GameState
global.gameState = {
    player: { x: 5, y: 5, z: 0 },
    npcs: [],
    vehicles: [],
    floorItems: []
};
global.window.gameState = global.gameState;

// Mock WaterManager
global.waterManager = {
    getWaterAt: (x, y, z) => {
        // Assume water at (6, 5)
        if (x === 6 && y === 5 && z === 0) return { depth: 1 }; // Shallow
        if (x === 7 && y === 5 && z === 0) return { depth: 2 }; // Deep
        return null;
    }
};
global.window.waterManager = global.waterManager;

// Mock VehicleManager
global.vehicleManager = {
    vehicleTemplates: {},
    vehicleParts: {}
};
global.window.vehicleManager = global.vehicleManager;

// Mock MapRenderer
global.mapRenderer = {
    getCurrentMapData: () => {
        const width = 10;
        const height = 10;
        const createLayer = (fill) => Array(height).fill().map(() => Array(width).fill(fill));

        return {
            dimensions: { width, height },
            levels: {
                "0": {
                    // Scenario 1: Grass everywhere (landscape)
                    landscape: createLayer("GR"),
                    // Scenario 2: Table at (4, 5) (building)
                    building: (() => {
                        const l = createLayer("");
                        l[5][4] = "TB";
                        l[5][3] = "WALL"; // Wall at (3,5)
                        return l;
                    })(),
                    // Scenario 3: Item layer empty, but we might test fallback
                    item: createLayer(""),
                    // Ensure middle/bottom are checked if landscape/building fail
                    middle: createLayer(""), // Should populate from building/item in real map loader, but here explicit
                    bottom: createLayer("GR")
                },
                "1": {
                    // Scenario 4: Z=1, Standing on Wall at (3,5)
                    landscape: createLayer(""),
                    building: createLayer(""),
                    item: createLayer(""),
                    middle: createLayer(""),
                    bottom: createLayer("") // Empty bottom
                }
            }
        };
    }
};
global.window.mapRenderer = global.mapRenderer;

// --- LOAD UI CODE ---
const uiPath = path.resolve(__dirname, '../js/ui/surroundingsUI.js');
const uiCode = fs.readFileSync(uiPath, 'utf8');
eval(uiCode);

// --- TESTS ---

function assert(condition, message) {
    if (!condition) {
        console.error(`FAIL: ${message}`);
        process.exit(1);
    } else {
        console.log(`PASS: ${message}`);
    }
}

async function runTests() {
    console.log("Starting SurroundingsUI Tests (Multi-Row)...");
    const ui = new global.window.SurroundingsUI();

    // 1. Test Center Cell (Player)
    ui.update();
    const centerCell = ui.cells.find(c => c.dx === 0 && c.dy === 0);
    // Should have rows for Player and Grass

    // DEBUG: Print innerHTML
    if (!centerCell.element.innerHTML.includes("You")) {
        console.log("DEBUG: Center Cell HTML:", centerCell.element.innerHTML);
    }

    assert(centerCell.element.innerHTML.includes("You"), "Center should show 'You'");
    assert(centerCell.element.innerHTML.includes("Grass"), "Center should show 'Grass'");

    // 2. Test Neighbor with Water (Shallow) at (6, 5). Player is at (5, 5). dx=1, dy=0.
    const waterCell = ui.cells.find(c => c.dx === 1 && c.dy === 0); // (6, 5)
    // Water is shallow, so it's Bottom content. Top should be empty?
    // Wait, Shallow Water overrides Bottom.
    assert(waterCell.element.innerHTML.includes("Shallow Water"), "Cell (6,5) should show 'Shallow Water'");
    assert(!waterCell.element.innerHTML.includes("Empty"), "Cell (6,5) should not be 'Empty' overall");

    // 3. Test Neighbor with Table at (4, 5). dx=-1, dy=0.
    const tableCell = ui.cells.find(c => c.dx === -1 && c.dy === 0);
    // Table is in 'building' layer
    assert(tableCell.element.innerHTML.includes("Table"), "Cell (4,5) should show 'Table'");
    assert(tableCell.element.innerHTML.includes("Grass"), "Cell (4,5) should show 'Grass'");

    // 4. Test Floor Item (Apple) at (5, 4). dx=0, dy=-1.
    global.gameState.floorItems = [{ id: "apple", x: 5, y: 4, z: 0, name: "Apple" }];
    ui.update();
    const itemCell = ui.cells.find(c => c.dx === 0 && c.dy === -1);
    assert(itemCell.element.innerHTML.includes("Apple"), "Cell (5,4) should show 'Apple' (Floor Item)");
    assert(itemCell.element.innerHTML.includes("Grass"), "Cell (5,4) should show 'Grass'");

    // 5. Test Multiple Items
    global.gameState.floorItems.push({ id: "apple", x: 5, y: 4, z: 0, name: "Another Apple" });
    ui.update();
    // Should show two apple rows
    const matches = itemCell.element.innerHTML.match(/Apple/g);
    assert(matches && matches.length >= 2, "Cell (5,4) should show multiple apples");

    // 6. Test Standing Logic (Z-1 Fallback)
    global.gameState.player = { x: 3, y: 5, z: 1 };

    ui.update();
    const z1Cell = ui.cells.find(c => c.dx === 0 && c.dy === 0); // Player pos

    assert(z1Cell.element.innerHTML.includes("You"), "Z=1 Player should show 'You'");
    assert(z1Cell.element.innerHTML.includes("Brick Wall"), `Z=1 Player should show 'Brick Wall' (Support from Z=0). Actual: ${z1Cell.element.innerHTML}`);

    console.log("All Tests Passed!");
}

runTests();
