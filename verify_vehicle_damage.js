const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock global objects
global.logToConsole = (msg, type) => {
    // console.log(`[${type}] ${msg}`);
};
global.window = {
    getSkillValue: () => 100, // Max skill for testing
    audioManager: {
        playSound: () => {},
        playSoundAtLocation: () => {}
    },
    inventoryManager: {
        removeItem: () => true
    }
};

// Load VehicleManager code
let vehicleManagerCode = fs.readFileSync('js/vehicleManager.js', 'utf8');
vehicleManagerCode += "\nthis.VehicleManager = VehicleManager;"; // Expose class

const context = {
    console: console,
    logToConsole: global.logToConsole,
    window: global.window,
    Set: Set
};
vm.createContext(context);
vm.runInContext(vehicleManagerCode, context);
const VehicleManager = context.VehicleManager;

// Load definitions
const vehicleParts = JSON.parse(fs.readFileSync('assets/definitions/vehicle_parts.json', 'utf8'));
const vehicleTemplates = JSON.parse(fs.readFileSync('assets/definitions/vehicle_templates.json', 'utf8'));

// Mock AssetManager
const assetManager = {
    vehiclePartDefinitions: {},
    vehicleTemplateDefinitions: {}
};

vehicleParts.forEach(part => {
    assetManager.vehiclePartDefinitions[part.id] = part;
});

vehicleTemplates.forEach(tmpl => {
    assetManager.vehicleTemplateDefinitions[tmpl.id] = tmpl;
});

// Mock GameState
const gameState = {
    vehicles: [],
    player: { skills: {} }
};

// Instantiate Manager
const vehicleManager = new VehicleManager(gameState, assetManager);
vehicleManager.initialize();

// Test: Spawn Scooter
console.log("Spawning scooter_vespa..."); // Corrected template ID
const vehicleId = vehicleManager.spawnVehicle("scooter_vespa", "map1", {x:0, y:0, z:0});
const vehicle = vehicleManager.getVehicleById(vehicleId);

if (!vehicle) {
    console.error("Failed to spawn vehicle");
    process.exit(1);
}

console.log(`Initial Stats: Speed=${vehicle.calculatedStats.speed}, Power=${vehicle.calculatedStats.power}`);

// Find engine part ID
const enginePartId = vehicle.attachedParts['engine'][0];
console.log(`Engine Part ID: ${enginePartId}`);

// Damage Engine to Destruction
console.log("Destroying engine...");
vehicleManager.applyDamageToVehicle(vehicleId, 1000, enginePartId);

// Check stats
console.log(`Post-Destruction Stats: Speed=${vehicle.calculatedStats.speed}, Power=${vehicle.calculatedStats.power}`);

if (vehicle.calculatedStats.speed !== 0) {
    console.log("FAIL: Speed should be 0 (or immobile) after engine destruction. Current: " + vehicle.calculatedStats.speed);
} else {
    console.log("PASS: Vehicle immobilized after engine destruction.");
}

// Repair Engine
console.log("Repairing engine...");
vehicle.durability[enginePartId] = 100; // Reset durability
vehicleManager.calculateVehicleStats(vehicleId);
console.log(`Stats after engine repair: Speed=${vehicle.calculatedStats.speed}`);

// Find Wheel ID
const wheelPartId = vehicle.attachedParts['wheel'][0];
console.log(`Wheel Part ID: ${wheelPartId}`);

// Destroy Wheels
console.log("Destroying wheels...");
vehicleManager.applyDamageToVehicle(vehicleId, 1000, wheelPartId);

console.log(`Post-Wheel-Destruction Stats: Speed=${vehicle.calculatedStats.speed}`);

// Check expectation: Speed should be significantly lower or 0.
if (vehicle.calculatedStats.speed >= 100) {
    console.log("FAIL/OBSERVATION: Speed is still high after wheel destruction. This confirms the need for a fix.");
} else {
    console.log("PASS?: Speed is low.");
}
