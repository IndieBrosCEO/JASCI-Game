
// Mock Browser Environment
global.window = {};
global.document = {
    getElementById: (id) => {
        if (!global.mockElements[id]) {
            global.mockElements[id] = {
                textContent: '',
                innerHTML: '',
                style: {},
                classList: {
                    add: (cls) => {},
                    remove: (cls) => {}
                },
                appendChild: (child) => {},
                parentNode: {
                    replaceChild: (newChild, oldChild) => {
                         // Mock replacing clone
                         global.mockElements[id] = newChild;
                    }
                },
                cloneNode: () => {
                     return {
                        onclick: null,
                        classList: { add:()=>{}, remove:()=>{} },
                        parentNode: { replaceChild: ()=>{} }
                     };
                },
                querySelector: (sel) => { return { value: 'bandage' }; } // Mock radio selection
            };
        }
        return global.mockElements[id];
    },
    querySelector: (sel) => {
        if (sel === 'input[name="treatmentMethod"]:checked') {
             return { value: 'bandage' };
        }
        // Mock finding tbody for renderHealthTable
        if (sel === "#healthTable tbody") {
             return { innerHTML: '', appendChild: ()=>{} };
        }
        return {
            innerHTML: '',
            appendChild: () => {}
        };
    },
    createElement: (tag) => {
        return {
            innerHTML: '',
            appendChild: () => {},
            classList: { add:()=>{}, remove:()=>{} },
            style: {}
        };
    },
    addEventListener: (event, cb) => { }
};

global.mockElements = {};

// Mock Game State
global.gameState = {
    player: {
        health: {
            head: { name: "Head", current: 3, max: 5, crisisTimer: 0 }
        }
    },
    inventory: {
        container: {
            items: [
                { id: "bandage", name: "Bandage" },
                { id: "other_item", name: "Rock" }
            ]
        }
    },
    actionPointsRemaining: 2
};

// Mock Functions
global.logToConsole = (msg, color) => { console.log(`[LOG]: ${msg}`); };
global.window.logToConsole = global.logToConsole;

global.window.gameState = global.gameState;

global.window.getSkillValue = (skill) => { return 3; }; // Medicine 3
global.getSkillValue = global.window.getSkillValue; // Ensure global access

global.rollDie = (sides) => { return 10; }; // Average roll
global.window.rollDie = global.rollDie;

global.window.updateTurnStatusDisplay = () => { console.log("Turn Status Updated"); };
global.window.formatBodyPartName = (name) => name;
global.window.audioManager = { playUiSound: () => {} };

// Mock Inventory Manager
global.window.inventoryManager = {
    removeItem: (item) => {
        console.log(`[INV] Removing item: ${item.name}`);
        const idx = global.gameState.inventory.container.items.indexOf(item);
        if (idx > -1) global.gameState.inventory.container.items.splice(idx, 1);
    }
};

const fs = require('fs');
const path = require('path');
const charFileContent = fs.readFileSync('js/character.js', 'utf8');

try {
    eval(charFileContent);
} catch (e) {
    console.error("Error loading js/character.js:", e.message);
}

// TEST SCENARIO
console.log("--- Starting Medical Action Verification ---");
console.log(`Initial AP: ${global.gameState.actionPointsRemaining}`);
console.log(`Initial Bandage Count: ${global.gameState.inventory.container.items.filter(i => i.id === 'bandage').length}`);

// Call performMedicalTreatment
console.log("Calling performMedicalTreatment('head', 'bandage')...");

if (typeof window.performMedicalTreatment !== 'function') {
    console.error("performMedicalTreatment is not defined! File load failed?");
} else {
    window.performMedicalTreatment('head', 'bandage');
}

// VERIFY
console.log(`Final AP: ${global.gameState.actionPointsRemaining}`);
console.log(`Final Bandage Count: ${global.gameState.inventory.container.items.filter(i => i.id === 'bandage').length}`);

if (global.gameState.actionPointsRemaining === 1) {
    console.log("SUCCESS: AP deducted correctly.");
} else {
    console.error("FAILURE: AP not deducted correctly.");
}

if (global.gameState.inventory.container.items.filter(i => i.id === 'bandage').length === 0) {
    console.log("SUCCESS: Bandage removed from inventory.");
} else {
    console.error("FAILURE: Bandage not removed.");
}

// Check logs for success
// Roll(10) + Skill(3) + Item(2) = 15 -> Well Tended.
// Well Tended + Short Rest (defaulted) -> Heals 2 HP.
// Initial HP 3 -> New HP 5.
console.log(`Final HP: ${global.gameState.player.health.head.current}`);
if (global.gameState.player.health.head.current === 5) {
     console.log("SUCCESS: Healing applied correctly (3 -> 5).");
} else {
     console.error(`FAILURE: Healing incorrect. Expected 5, got ${global.gameState.player.health.head.current}`);
}
