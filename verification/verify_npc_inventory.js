
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

// Mock browser environment
global.window = {
    inventoryManager: {},
    assetManager: {
        getItem: (id) => ({ id, name: id, type: 'misc', stackable: true, canEquip: true }),
        getNpc: (id) => ({ id, name: 'Test NPC', behavior: 'idle' }),
        tilesets: {}
    },
    mapRenderer: {
        scheduleRender: () => {},
        getCurrentMapData: () => ({ dimensions: { width: 10, height: 10 } })
    },
    gameState: {
        inventory: { container: { items: [], maxSlots: 10 }, handSlots: [null, null] },
        player: { health: { torso: { current: 10 } }, wornClothing: {} },
        npcs: [],
        playerPos: { x: 0, y: 0, z: 0 }
    },
    InventorySizes: { 'S': 10 },
    ClothingLayers: {},
    audioManager: { playUiSound: () => {} },
    questManager: { updateObjective: () => {} }
};
global.logToConsole = console.log;

function loadFile(filePath) {
    const content = fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
    vm.runInThisContext(content, { filename: filePath });
}

loadFile('js/inventoryManager.js');
loadFile('js/npcManager.js');

async function runTest() {
    console.log("Starting NPC Inventory Verification...");

    const inventoryManager = new InventoryManager(window.gameState, window.assetManager);
    window.inventoryManager = inventoryManager;
    const npcManager = new NpcManager(window.gameState, window.assetManager, {});
    window.npcManager = npcManager;

    // 1. Spawn an NPC
    // Manually create an NPC structure as it appears after initialization
    const npc = {
        id: 'npc_1',
        name: 'Test NPC',
        mapPos: { x: 5, y: 5, z: 0 },
        health: { torso: { current: 10 } },
        definitionId: 'test_npc',
        inventory: {
            container: { items: [], maxSlots: 5, name: "Pockets" },
            handSlots: [null, null]
        }
    };
    window.gameState.npcs.push(npc);

    console.log("NPC Initialized with Inventory:", npc.inventory);

    // 2. Check if NPC has inventory
    if (!npc.inventory) {
        console.log("FAIL: NPC does not have an inventory property.");
    } else {
        console.log("SUCCESS: NPC has an inventory property.");
    }

    // 3. Try to add an item to NPC inventory (simulating pickup)
    try {
        const item = new window.Item({ id: 'apple', name: 'Apple' });
        // Use new API with target inventory
        const success = inventoryManager.addItem(item, npc.inventory.container.items, npc.inventory.container.maxSlots);

        if (success && npc.inventory.container.items.length > 0 && npc.inventory.container.items[0].id === 'apple') {
            console.log("InventoryManager Check: addItem works for NPC inventory (SUCCESS).");
        } else {
            console.log("InventoryManager Check: addItem FAILED for NPC inventory.");
        }

    } catch (e) {
        console.log("ERROR during item addition:", e);
    }

    // 4. Check interaction: Equipping Item for NPC
    try {
        console.log("Testing equipItem for NPC...");

        // Add a sword to inventory first
        const sword = new window.Item({ id: 'sword', name: 'Sword', canEquip: true });
        inventoryManager.addItem(sword, npc.inventory.container.items, npc.inventory.container.maxSlots);

        // Use new API with target entity slots
        inventoryManager.equipItem('sword', 0, npc.inventory.container.items, npc.inventory.handSlots);

        if (npc.inventory.handSlots[0] && npc.inventory.handSlots[0].id === 'sword') {
             console.log("SUCCESS: Equipped sword to NPC hand slot.");
        } else {
             console.log("FAIL: Failed to equip sword to NPC hand slot.");
             console.log("NPC Hand Slots:", npc.inventory.handSlots);
             console.log("NPC Inventory:", npc.inventory.container.items);
        }

    } catch (e) {
        console.log("ERROR during equip test:", e);
    }
}

runTest();
