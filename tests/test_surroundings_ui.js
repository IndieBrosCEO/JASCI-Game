const assert = require('assert');
const fs = require('fs');
const path = require('path');

// --- MOCK ENVIRONMENT ---
global.window = {};

// Mock Element Factory
function createMockElement(tagName) {
    return {
        tagName: tagName.toUpperCase(),
        style: {},
        classList: {
            contains: () => false,
            remove: () => {},
            add: () => {}
        },
        children: [],
        _innerHTML: '',
        get innerHTML() { return this._innerHTML; },
        set innerHTML(val) {
            this._innerHTML = val;
            if (val === '') this.children = [];
        },
        appendChild: function(child) {
            this.children.push(child);
        }
    };
}

global.document = {
    getElementById: (id) => {
        if (!global.mockElements[id]) {
            global.mockElements[id] = createMockElement('DIV');
            global.mockElements[id].id = id;
        }
        return global.mockElements[id];
    },
    createElement: (tag) => {
        return createMockElement(tag);
    }
};
global.mockElements = {};

// --- LOAD UI CODE ---
const uiPath = path.resolve(__dirname, '../js/ui/surroundingsUI.js');
const uiCode = fs.readFileSync(uiPath, 'utf8');
eval(uiCode);

// --- TEST SUITE ---
async function runTests() {
    console.log("Starting SurroundingsUI Tests (Multi-Row with Labels)...");

    // Setup Mock Game State
    global.window.gameState = {
        playerPos: { x: 5, y: 5, z: 0 },
        floorItems: [],
        npcs: [],
        vehicles: []
    };

    // Mock AssetManager
    global.window.assetManager = {
        tilesets: {
            'grass': { sprite: '.', color: 'green', name: 'Grass' },
            'wall': { sprite: '#', color: 'grey', name: 'Wall' },
            'water': { sprite: '~', color: 'blue', name: 'Water' },
            'stone': { sprite: '=', color: 'grey', name: 'Stone' },
            'rock_wall': { sprite: 'X', color: 'darkgrey', name: 'Rock Wall', tags: ['solid_terrain_top'] },
            'rock_floor': { sprite: '_', color: 'darkgrey', name: 'Rock Floor' },
            'sword': { sprite: '/', color: 'silver', name: 'Sword' },
            'WD': { sprite: '~', color: 'darkblue', name: 'Deep Water' },
            'WS': { sprite: '~', color: 'lightblue', name: 'Shallow Water' }
        },
        getItem: (id) => {
            if (id === 'sword') return global.window.assetManager.tilesets['sword'];
            return null;
        }
    };

    // Mock MapRenderer
    global.window.mapRenderer = {
        getCurrentMapData: () => {
            return {
                dimensions: { width: 10, height: 10 },
                levels: {
                    '0': {
                        bottom: [
                            [null, null, null, null, null, null, null, null, null, null],
                            [null, null, null, null, null, null, null, null, null, null],
                            [null, null, null, null, null, null, null, null, null, null],
                            [null, null, null, null, null, null, null, null, null, null],
                            [null, null, null, null, null, null, null, null, null, null],
                            // Updated: Index 4 is null to allow Z-1 check
                            [null, null, null, null, null, 'grass', 'grass', null, null, null], // Row 5
                            [null, null, null, null, 'grass', 'grass', 'grass', null, null, null], // Row 6
                            [null, null, null, null, 'grass', 'grass', 'grass', null, null, null], // Row 7
                        ],
                        middle: [
                             // Let's put a wall at 6,5 (Right of player)
                            [null, null, null, null, null, null, null, null, null, null],
                            [null, null, null, null, null, null, null, null, null, null],
                            [null, null, null, null, null, null, null, null, null, null],
                            [null, null, null, null, null, null, null, null, null, null],
                            [null, null, null, null, null, null, null, null, null, null],
                            [null, null, null, null, null, null, 'wall', null, null, null], // Row 5
                        ]
                    },
                    '-1': {
                        // Z-1 for falling checks
                         middle: [
                            // 5,5 is empty bottom at Z=0? No, it's grass.
                            // Let's make 4,5 (Left) empty at Z=0, but have a wall at Z=-1
                            [null, null, null, null, null, null, null, null, null, null],
                            [null, null, null, null, null, null, null, null, null, null],
                            [null, null, null, null, null, null, null, null, null, null],
                            [null, null, null, null, null, null, null, null, null, null],
                            [null, null, null, null, null, null, null, null, null, null],
                            [null, null, null, null, 'rock_wall', null, null, null, null, null], // Row 5 (x=4)
                        ]
                    }
                }
            };
        }
    };

    // Mock WaterManager
    global.window.waterManager = {
        getWaterAt: (x, y, z) => {
             if (x === 5 && y === 6 && z === 0) return { depth: 1 }; // South = Shallow
             if (x === 6 && y === 6 && z === 0) return { depth: 3 }; // SouthEast = Deep
             return null;
        }
    };

    // Instantiate UI
    const ui = new window.SurroundingsUI();

    // 1. Test Center Cell (Player + Grass)
    // Player at 5,5,0.
    // Map data has 'grass' at 5,5 bottom.
    ui.update();

    // The center cell is index 4 (0,1,2, 3,4,5, 6,7,8 for 3x3 grid)
    const centerCell = ui.cells.find(c => c.dx === 0 && c.dy === 0).element;

    // Helper to verify mock content
    function getCellText(cell) {
        if (!cell.children || cell.children.length === 0) return cell.innerHTML;
        return cell.children.map(row => row.innerHTML).join(' | ');
    }

    const centerText = getCellText(centerCell);
    console.log("Center Cell Content:", centerText);

    if (!centerText.includes('You')) throw new Error("Center should show 'You'");
    if (!centerText.includes('Entity:')) throw new Error("Center should label 'Entity'");
    if (!centerText.includes('Grass')) throw new Error("Center should show 'Grass'");
    if (!centerText.includes('Bottom:')) throw new Error("Center should label 'Bottom'");

    console.log("PASS: Center Cell (Player + Grass)");


    // 2. Test Right Cell (Wall + Grass)
    // 6,5. Middle has 'wall'. Bottom has 'grass'.
    const rightCell = ui.cells.find(c => c.dx === 1 && c.dy === 0).element;
    const rightText = getCellText(rightCell);
    console.log("Right Cell Content:", rightText);

    if (!rightText.includes('Wall')) throw new Error("Right should show 'Wall'");
    if (!rightText.includes('Middle:')) throw new Error("Right should label 'Middle'");
    if (!rightText.includes('Grass')) throw new Error("Right should show 'Grass'");
    if (!rightText.includes('Bottom:')) throw new Error("Right should label 'Bottom'");

    console.log("PASS: Right Cell (Wall + Grass)");


    // 3. Test Left Cell (Z-1 Support)
    // 4,5. Z=0 Bottom is null. Z=-1 Middle is 'rock_wall' (solid_terrain_top).
    const leftCell = ui.cells.find(c => c.dx === -1 && c.dy === 0).element;
    const leftText = getCellText(leftCell);
    console.log("Left Cell Content:", leftText);

    if (!leftText.includes('Rock Wall')) throw new Error("Left should show 'Rock Wall' from Z-1");
    if (!leftText.includes('Below:')) throw new Error("Left should label 'Below'");

    console.log("PASS: Left Cell (Z-1 Support)");


    // 4. Test South Cell (Shallow Water)
    // 5,6. Water Depth 1.
    const southCell = ui.cells.find(c => c.dx === 0 && c.dy === 1).element;
    const southText = getCellText(southCell);
    console.log("South Cell Content:", southText);

    if (!southText.includes('Shallow Water')) throw new Error("South should show 'Shallow Water'");
    if (!southText.includes('Bottom:')) throw new Error("South should label 'Bottom'");

    console.log("PASS: South Cell (Shallow Water)");


    // 5. Test SouthEast Cell (Deep Water)
    // 6,6. Water Depth 3. Should be Middle layer.
    const seCell = ui.cells.find(c => c.dx === 1 && c.dy === 1).element;
    const seText = getCellText(seCell);
    console.log("SE Cell Content:", seText);

    if (!seText.includes('Deep Water')) throw new Error("SE should show 'Deep Water'");
    if (!seText.includes('Middle:')) throw new Error("SE should label 'Middle'");

    console.log("PASS: SE Cell (Deep Water)");


    // 6. Test Item Stacking
    // Add item to 5,5 (Center)
    global.window.gameState.floorItems.push({ x: 5, y: 5, z: 0, id: 'sword', name: 'Excalibur' });
    ui.update();

    const centerTextWithItem = getCellText(centerCell);
    console.log("Center Cell Content (Item):", centerTextWithItem);

    if (!centerTextWithItem.includes('Sword')) throw new Error("Center should show Sword (Generic Name from Def)");
    if (!centerTextWithItem.includes('Item:')) throw new Error("Center should label 'Item'");
    if (!centerTextWithItem.includes('You')) throw new Error("Center should still show 'You'");

    console.log("PASS: Item Stacking");

    console.log("All Tests Passed!");
}

runTests().catch(err => {
    console.error("FAIL:", err.message);
    process.exit(1);
});
