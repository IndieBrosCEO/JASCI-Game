
// verify_repair_consumption.js

// Mocking the environment
global.window = global;

global.logToConsole = (msg, type) => {
    // console.log(`[${type || 'info'}] ${msg}`);
};

// Mock dependencies
const gameState = {
    player: { name: "Player" },
    inventory: {
        container: {
            items: [],
            maxSlots: 10
        },
        handSlots: []
    },
    vehicles: []
};
global.gameState = gameState;

// Mock AssetManager
const assetManager = {
    vehiclePartDefinitions: {
        "engine_v8": {
            id: "engine_v8",
            name: "V8 Engine",
            type: "engine",
            durability: 100,
            repairDC: 10,
            repairMaterials: [{ itemId: "metal_scraps", quantity: 2 }]
        },
        "chassis_sedan": {
            id: "chassis_sedan",
            name: "Sedan Chassis",
            weight: 1000,
            durability: 500,
            slotPoints: { "engine": 1 }
        }
    },
    vehicleTemplateDefinitions: {},
    getItem: (id) => ({ id, name: id, itemCategory: "material" })
};

// Mock InventoryManager (Partial)
class InventoryManager {
    constructor() {}
    countItems(itemId, items) {
        items = items || gameState.inventory.container.items;
        return items.filter(i => i.id === itemId).reduce((acc, i) => acc + (i.quantity || 1), 0);
    }
    hasItem(itemId, quantity, items) {
        return this.countItems(itemId, items) >= quantity;
    }
    removeItem(itemId, quantity) {
        const items = gameState.inventory.container.items;
        let remaining = quantity;
        let removed = false;

        for (let i = items.length - 1; i >= 0; i--) {
            if (items[i].id === itemId) {
                if (items[i].quantity > remaining) {
                    items[i].quantity -= remaining;
                    remaining = 0;
                    removed = true;
                } else {
                    remaining -= items[i].quantity;
                    items.splice(i, 1);
                    removed = true;
                }
            }
            if (remaining <= 0) break;
        }
        return (remaining === 0 && removed) ? {} : null; // Return object on success, null on failure
    }
}
global.window.inventoryManager = new InventoryManager();
global.window.getSkillModifier = () => 5; // Valid skill
global.window.rollDie = () => 20; // Success

// Load VehicleManager code manually to test it
const fs = require('fs');
let vmCode = fs.readFileSync('./js/vehicleManager.js', 'utf8');

// Hack to export VehicleManager from the file content for this test script
vmCode += "\nmodule.exports = VehicleManager;";

// Use a temporary file to load the module
const tempFile = './temp_vehicleManager.js';
fs.writeFileSync(tempFile, vmCode);

const VehicleManager = require(tempFile);
fs.unlinkSync(tempFile);


// Setup Test
const vm = new VehicleManager(gameState, assetManager);
vm.initialize();

// Create a vehicle manually
const vehicle = {
    id: "v1",
    name: "Test Car",
    chassis: "chassis_sedan",
    durability: {
        "engine_v8": 50 // Damaged
    },
    attachedParts: { engine: ["engine_v8"] },
    mapPos: {x:0, y:0, z:0}
};
gameState.vehicles.push(vehicle);

// TEST 1: Sufficient materials
gameState.inventory.container.items = [{ id: "metal_scraps", quantity: 5 }];
console.log("Initial Inventory Metal Scraps:", global.window.inventoryManager.countItems("metal_scraps"));

const materials = [{ itemId: "metal_scraps", quantity: 2 }];
const success1 = vm.repairVehiclePart("v1", "engine_v8", 100, materials);

console.log("Repair Success (Expect True):", success1);
console.log("Inventory Metal Scraps (Expect 3):", global.window.inventoryManager.countItems("metal_scraps"));

// TEST 2: Insufficient materials
gameState.inventory.container.items = [{ id: "metal_scraps", quantity: 1 }]; // Only 1, need 2
vehicle.durability["engine_v8"] = 50; // Reset durability

const success2 = vm.repairVehiclePart("v1", "engine_v8", 100, materials);

console.log("Repair Success (Expect False):", success2);
console.log("Inventory Metal Scraps (Expect 1):", global.window.inventoryManager.countItems("metal_scraps"));

if (success1 === true && global.window.inventoryManager.countItems("metal_scraps") === 1 && success2 === false) {
    console.log("VERIFICATION PASS: Materials consumed correctly and insufficient materials blocked repair.");
} else {
    console.log("VERIFICATION FAIL.");
}
