
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
        playerPos: { x: 0, y: 0, z: 0 },
        floorItems: []
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
    console.log("Starting NPC Inventory Drop Verification...");

    const inventoryManager = new InventoryManager(window.gameState, window.assetManager);
    window.inventoryManager = inventoryManager;
    const npcManager = new NpcManager(window.gameState, window.assetManager, {});
    window.npcManager = npcManager;

    // 1. Create an NPC with items
    const npc = {
        id: 'npc_dead',
        name: 'Dead NPC',
        mapPos: { x: 5, y: 5, z: 0 },
        health: { torso: { current: 0 } },
        definitionId: 'test_npc',
        inventory: {
            container: { items: [], maxSlots: 5, name: "Pockets" },
            handSlots: [null, null]
        },
        wornClothing: {}
    };

    // Add items to NPC
    const apple = new window.Item({ id: 'apple', name: 'Apple' });
    const sword = new window.Item({ id: 'sword', name: 'Sword' });
    inventoryManager.addItem(apple, npc.inventory.container.items, npc.inventory.container.maxSlots);
    inventoryManager.equipItem('sword', 0, npc.inventory.container.items, npc.inventory.handSlots);
    // Manually add sword to hand since equipItem logic relies on it being in inventory first, which we did implicitly above if addItem failed?
    // Wait, equipItem requires item to be in inventory. Let's add sword to inventory first.
    inventoryManager.addItem(sword, npc.inventory.container.items, npc.inventory.container.maxSlots);
    inventoryManager.equipItem('sword', 0, npc.inventory.container.items, npc.inventory.handSlots);

    console.log("NPC Inventory before death:", JSON.stringify(npc.inventory));
    console.log("Floor items before death:", window.gameState.floorItems.length);

    // 2. Trigger dropInventory
    inventoryManager.dropInventory(npc);

    // 3. Verify items are on the floor
    console.log("Floor items after death:", window.gameState.floorItems.length);
    const droppedApple = window.gameState.floorItems.find(fi => fi.item.id === 'apple');
    const droppedSword = window.gameState.floorItems.find(fi => fi.item.id === 'sword');

    if (droppedApple && droppedApple.x === 5 && droppedApple.y === 5) {
        console.log("SUCCESS: Apple found on floor at NPC position.");
    } else {
        console.log("FAIL: Apple not found on floor.");
    }

    if (droppedSword && droppedSword.x === 5 && droppedSword.y === 5) {
        console.log("SUCCESS: Sword found on floor at NPC position.");
    } else {
        console.log("FAIL: Sword not found on floor.");
    }

    // 4. Verify NPC inventory is empty
    if (npc.inventory.container.items.length === 0 && !npc.inventory.handSlots[0]) {
        console.log("SUCCESS: NPC inventory is empty.");
    } else {
        console.log("FAIL: NPC inventory is not empty.");
    }
}

runTest();
