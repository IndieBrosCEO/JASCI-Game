
// Mock Browser Environment
global.window = {};
global.document = {
    getElementById: (id) => {
        if (!global.mockElements[id]) {
            global.mockElements[id] = {
                textContent: '', innerHTML: '', style: {},
                classList: { add: () => {}, remove: () => {} },
                appendChild: (child) => {},
                querySelector: (sel) => null,
            };
        }
        return global.mockElements[id];
    },
    createElement: (tag) => {
        return { innerHTML: '', appendChild: () => {}, classList: { add:()=>{}, remove:()=>{} }, style: {}, onclick: null };
    },
    addEventListener: () => {},
};
global.mockElements = {};

// Mock Game State
global.gameState = {
    player: { wornClothing: {} },
    inventory: {
        container: {
            maxSlots: 10,
            items: [
                { id: "test_weapon", name: "TestWeapon", canEquip: true, quantity: 1 },
                { id: "test_item", name: "TestItem", quantity: 1 }
            ]
        },
        handSlots: [null, null],
        open: true,
        cursor: 0,
        currentlyDisplayedItems: [],
        targetEntity: null // Will simulate world container by setting worldContainers array
    },
    worldContainers: [],
    playerPos: { x: 0, y: 0, z: 0 },
    stats: [{name: "Strength", points: 5}]
};

// Mock Helper Functions
global.logToConsole = (msg) => { console.log(`[LOG]: ${msg}`); };
global.window.logToConsole = global.logToConsole;
global.window.gameState = global.gameState;
global.window.audioManager = { playUiSound: () => {} };
global.window.ClothingLayers = { TORSO: "torso" }; // Minimal
global.window.InventorySizes = { "Body Pockets": 5 };

// Mock Asset Manager
global.window.assetManager = {
    getItem: (id) => {
        if (id === "test_weapon") return { id: "test_weapon", name: "TestWeapon", canEquip: true };
        if (id === "test_item") return { id: "test_item", name: "TestItem" };
        return { id: id, name: id };
    },
    tilesets: {},
    lootTables: {}
};

// Load inventoryManager.js code
const fs = require('fs');
const invFileContent = fs.readFileSync('js/inventoryManager.js', 'utf8');
try { eval(invFileContent); } catch (e) { console.error("Error loading js/inventoryManager.js:", e.message); }

// Initialize
global.window.inventoryManager = new window.InventoryManager(global.gameState, global.window.assetManager);
global.window.inventoryManager.initialize();

// Setup Test Scenario
// 1. Create a world container with items
const worldContainer = {
    id: "world_crate",
    name: "Crate",
    items: [],
    maxSlots: 10
};
global.gameState.worldContainers = [worldContainer];

// 2. Select the "test_weapon" in player inventory
// We need to simulate how renderInventoryMenu populates currentlyDisplayedItems
// But for this test we can just manually populate it as if render happened.
global.gameState.inventory.currentlyDisplayedItems = [
    {
        id: "test_weapon",
        name: "TestWeapon",
        canEquip: true,
        equipped: false,
        source: 'container',
        globalIndex: 0
    }
];
global.gameState.inventory.cursor = 0;

console.log("--- Testing 'F' Key Behavior (interactInventoryItem) ---");
console.log("Initial Hand Slot 0:", global.gameState.inventory.handSlots[0]);
console.log("Initial World Container Items:", worldContainer.items.length);

// Call interactInventoryItem (Simulating 'F')
global.window.inventoryManager.interactInventoryItem();

// Check Result
const itemInHand = global.gameState.inventory.handSlots[0];
const itemInContainer = worldContainer.items.find(i => i.id === "test_weapon");

if (itemInContainer) {
    console.log("FAILURE: Item was transferred to container instead of equipped.");
} else if (itemInHand && itemInHand.id === "test_weapon") {
    console.log("SUCCESS: Item was equipped.");
} else {
    console.log("FAILURE: Item neither equipped nor transferred (or failed to equip).");
    console.log("Hand Slot 0:", itemInHand);
    console.log("World Container Items:", worldContainer.items);
}

// Reset for 'E' Key Test
console.log("\n--- Resetting for 'E' Key Test (handleTransferKey) ---");
global.window.inventoryManager.unequipItem(0); // Unequip back to inventory
// Check it's back
if (!global.gameState.inventory.container.items.find(i => i.id === "test_weapon")) {
    console.error("Setup Error: Failed to unequip item back to inventory.");
}
global.gameState.inventory.handSlots[0] = null;
worldContainer.items = []; // Ensure empty

// Re-setup display items (unequip might have refreshed UI if it was running fully, but here we mock)
global.gameState.inventory.currentlyDisplayedItems = [
    {
        id: "test_weapon",
        name: "TestWeapon",
        canEquip: true,
        equipped: false,
        source: 'container',
        globalIndex: 0
    }
];

console.log("--- Testing 'E' Key Behavior (handleTransferKey) ---");
global.window.inventoryManager.handleTransferKey();

const itemInContainerE = worldContainer.items.find(i => i.id === "test_weapon");
const itemInHandE = global.gameState.inventory.handSlots[0];

if (itemInContainerE) {
    console.log("SUCCESS: Item was transferred to container.");
} else {
    console.log("FAILURE: Item was NOT transferred to container.");
    console.log("Hand Slot 0:", itemInHandE);
    console.log("World Container Items:", worldContainer.items);
}
