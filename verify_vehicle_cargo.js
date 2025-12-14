
// Mock Browser Environment
global.window = global;
global.document = {
    getElementById: () => ({
        style: {},
        innerHTML: "",
        querySelector: () => ({ textContent: "" }),
        classList: {
            add: () => {},
            remove: () => {},
            contains: () => false
        },
        appendChild: () => {},
        remove: () => {} // Mock remove
    }),
    createElement: () => ({
        className: "",
        textContent: "",
        classList: {
            add: () => {},
            remove: () => {},
            contains: () => false
        },
        style: {},
        onclick: null,
        remove: () => {} // Mock remove
    }),
    querySelectorAll: () => []
};
global.console = console;

// Mock Dependencies
global.logToConsole = (msg) => console.log("[LOG]", msg);
global.Item = function(def) { Object.assign(this, def); this.quantity = def.quantity || 1; };

// Load Code
const fs = require('fs');
const path = require('path');

function loadFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Hack to expose InventoryManager class
    if (filePath.includes('inventoryManager.js')) {
        content += "\nglobal.InventoryManager = InventoryManager;";
    }
    eval(content);
}

// Load InventoryManager
loadFile('js/inventoryManager.js');

// Test Setup
const mockGameState = {
    inventory: {
        open: false,
        container: { items: [], maxSlots: 10 },
        handSlots: [null, null],
        currentlyDisplayedItems: []
    },
    player: {
        wornClothing: {},
        name: "Player"
    },
    worldContainers: [],
    containers: [],
    playerPos: { x: 0, y: 0, z: 0 }
};

const mockAssetManager = {
    getItem: (id) => ({ id, name: id, stackable: true })
};

const inventoryManager = new InventoryManager(mockGameState, mockAssetManager);

// Create a Mock Vehicle
const mockVehicle = {
    id: "veh1",
    name: "Test Buggy",
    cargoDetails: {
        capacity: 20,
        items: [
            new Item({ id: "scrap_metal", name: "Scrap Metal", quantity: 5 }),
            new Item({ id: "wrench", name: "Wrench", quantity: 1 })
        ]
    }
};

console.log("--- Starting Test: Vehicle Cargo UI ---");

// Test 1: Toggle Inventory with Vehicle
console.log("Opening inventory with vehicle...");
inventoryManager.toggleInventoryMenu(mockVehicle);

// Verify
const displayedItems = mockGameState.inventory.currentlyDisplayedItems;
console.log("Displayed Items Count:", displayedItems.length);

const vehicleItems = displayedItems.filter(i => i.source === 'vehicle' || (i.targetEntity === mockVehicle));
console.log("Vehicle Items Found:", vehicleItems.length);

if (vehicleItems.length > 0) {
    console.log("SUCCESS: Vehicle items detected in UI list.");
    console.log("Items:", vehicleItems.map(i => i.name));
} else {
    console.log("FAILURE: No vehicle items found in UI list.");
}

// Check if source was set to 'vehicle' (what we aim for) or if it defaulted to 'companion' (what might happen if we don't distinguish)
const vehicleSourceItems = displayedItems.filter(i => i.source === 'vehicle');
console.log("Items with source='vehicle':", vehicleSourceItems.length);
console.log("Items with source='companion':", displayedItems.filter(i => i.source === 'companion').length);
