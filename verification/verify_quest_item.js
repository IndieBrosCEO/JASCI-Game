
// Verification script for Quest Item ID feature
const assert = require('assert');
const fs = require('fs');

// Mock browser environment
global.window = {};
global.logToConsole = console.log;
global.InventorySizes = { "S": 10, "M": 20 };
global.document = {
    getElementById: () => ({ innerHTML: "", appendChild: () => {}, classList: { add:()=>{}, remove:()=>{} }, style: {} }),
    createElement: () => ({ innerHTML: "", appendChild: () => {}, classList: { add:()=>{}, remove:()=>{} }, style: {} }),
    querySelectorAll: () => []
};

// Mock AssetManager
class MockAssetManager {
    constructor() {
        this.tilesets = {}; // needed for _getActionsForItem in inventoryManager (though we mock that too?)
    }
    getItem(id) {
        if (id === 'paper') {
            return { id: 'paper', name: 'Paper', stackable: true, maxStack: 10 };
        }
        return null;
    }
}

// Mock QuestManager
class MockQuestManager {
    constructor() {
        this.updates = [];
    }
    updateObjective(type, target, amount) {
        console.log(`Quest update: ${type} ${target} ${amount}`);
        this.updates.push({ type, target, amount });
    }
}

// Mock GameState
const gameState = {
    inventory: {
        container: {
            items: [],
            maxSlots: 10
        }
    },
    player: { wornClothing: {} }
};

async function runTest() {
    // Read and eval InventoryManager
    let invManagerCode = fs.readFileSync('js/inventoryManager.js', 'utf8');
    // Hack to export the class in Node env
    invManagerCode += "\nglobal.InventoryManager = InventoryManager;\n";
    eval(invManagerCode);

    const assetManager = new MockAssetManager();
    const questManager = new MockQuestManager();
    window.questManager = questManager;
    window.assetManager = assetManager;

    const inventoryManager = new global.InventoryManager(gameState, assetManager);

    console.log("--- Test 1: Add Unique Quest Item ---");
    const questItem = { id: 'paper', quantity: 1, questItemId: 'password_note' };
    inventoryManager.addItem(questItem);

    // Check if item ended up in inventory with the ID
    const addedItem = gameState.inventory.container.items.find(i => i.questItemId === 'password_note');
    if (!addedItem) {
        console.log("FAILED: Item with questItemId not found in inventory.");
    } else {
        console.log("PASSED: Item found in inventory.");
    }

    // Check if QuestManager was notified
    const update = questManager.updates.find(u => u.type === 'collect' && u.target === 'password_note');
    if (!update) {
        console.log("FAILED: QuestManager not notified with unique ID.");
    } else {
        console.log("PASSED: QuestManager notified.");
    }

    console.log("--- Test 2: Stacking Behavior ---");
    // Add generic paper
    inventoryManager.addItem({ id: 'paper', quantity: 1 });
    // Add another quest paper
    inventoryManager.addItem({ id: 'paper', quantity: 1, questItemId: 'password_note' });

    const stacks = gameState.inventory.container.items;
    console.log("Inventory items count:", stacks.length);
    stacks.forEach(s => console.log(`- ${s.name} x${s.quantity} (questId: ${s.questItemId})`));

    // Expected:
    // 1. "password_note" stack of 2 (initial add + second add)
    // 2. "generic" stack of 1

    const questStack = gameState.inventory.container.items.find(i => i.questItemId === 'password_note');
    const genericStack = gameState.inventory.container.items.find(i => !i.questItemId && i.id === 'paper');

    if (questStack && questStack.quantity === 2) {
        console.log("PASSED: Quest items stacked with each other.");
    } else {
         console.log(`FAILED: Quest items did not stack correctly. Qty: ${questStack ? questStack.quantity : 0}`);
    }

    if (genericStack && genericStack.quantity === 1) {
        console.log("PASSED: Generic item did not stack with quest item.");
    } else {
        console.log("FAILED: Generic item issue.");
    }
}

runTest();
