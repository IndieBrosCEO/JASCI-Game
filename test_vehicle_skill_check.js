
const assert = require('assert');

// Mock window and global objects
global.window = {};
global.logToConsole = function(msg, color, type) {
    console.log(`[${type || 'LOG'}] ${msg}`);
};
global.window.logToConsole = global.logToConsole;
global.window.uiManager = {
    showToastNotification: (msg, type) => console.log(`[TOAST] ${msg}`)
};
global.window.audioManager = {
    playSound: () => {},
    playSoundAtLocation: () => {}
};

// Mock gameState
global.gameState = {
    player: {
        skills: [
            { name: "Repair", points: 5 },
            { name: "Mechanics", points: 10 } // Mocking a Mechanics skill
        ]
    },
    vehicles: []
};
global.window.gameState = global.gameState;

// Load VehicleManager code
const fs = require('fs');
const vmContent = fs.readFileSync('js/vehicleManager.js', 'utf8');

// Evaluate the class definition in global scope.
try {
    eval(vmContent + "; global.VehicleManager = VehicleManager;");
} catch (e) {
    console.error("Eval error:", e);
}


// Mock AssetManager
const assetManager = {
    vehiclePartDefinitions: {
        "part_high_skill": {
            id: "part_high_skill",
            name: "Complex Part",
            type: "utility_small",
            skillRequirements: {
                "Repair": 20
            },
            durability: 100
        },
        "part_low_skill": {
             id: "part_low_skill",
             name: "Simple Part",
             type: "utility_small",
             skillRequirements: {
                 "Repair": 1
             },
             durability: 100
        },
        "part_mechanics_skill": {
             id: "part_mechanics_skill",
             name: "Mechanical Part",
             type: "utility_small",
             skillRequirements: {
                 "Mechanics": 15 // Req 15, player has 10
             },
             durability: 100
        },
        "chassis_test": {
            id: "chassis_test",
            slotPoints: { "utility_small": 1 }
        }
    },
    vehicleTemplateDefinitions: {}
};

// Implement getSkillValue as in utils.js
global.window.getSkillValue = function(skillName, entity) {
    const skill = entity.skills.find(s => s.name === skillName);
    return skill ? skill.points : 0;
};

// Instantiate VehicleManager
// Check if VehicleManager is defined
if (typeof global.VehicleManager === 'undefined') {
    throw new Error('VehicleManager class was not defined by eval().');
}

const vehicleManager = new global.VehicleManager(global.gameState, assetManager);
vehicleManager.initialize();

// Create a test vehicle
const vehicleId = "v1";
global.gameState.vehicles.push({
    id: vehicleId,
    name: "Test Vehicle",
    chassis: "chassis_test",
    attachedParts: { "utility_small": [null] },
    durability: {},
    mapPos: {x:0,y:0,z:0}
});

console.log("--- Test Case 1: High Skill Requirement (Fail) ---");
const result1 = vehicleManager.addPartToVehicle(vehicleId, "part_high_skill", "utility_small", 0);
// EXPECTED TO FAIL NOW (because I haven't implemented the check yet, but wait, the default code DOES NOT check, so it should PASS currently)
// I want to confirm it PASSES (returns true) before I fix it, or rather, I want to confirm the current behavior.
// Current behavior: No check. So it returns true.
console.log("Result 1 (Before fix, expects true):", result1);
if (result1 === false) console.log("Note: It failed, maybe due to other reasons?");

console.log("--- Test Case 2: Low Skill Requirement (Pass) ---");
const result2 = vehicleManager.addPartToVehicle(vehicleId, "part_low_skill", "utility_small", 0);
console.log("Result 2 (Before fix, expects true):", result2);
// Clean up slot
global.gameState.vehicles[0].attachedParts["utility_small"][0] = null;


console.log("Done preliminary check.");
