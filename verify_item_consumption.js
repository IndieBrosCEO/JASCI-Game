
// Mock Browser Environment
global.window = {};
global.document = {
    getElementById: (id) => {
        if (!global.mockElements[id]) {
            global.mockElements[id] = {
                textContent: '', innerHTML: '', style: {},
                classList: { add: () => {}, remove: () => {} },
                appendChild: (child) => {},
                parentNode: { replaceChild: (n, o) => { global.mockElements[id] = n; } },
                cloneNode: () => { return { onclick: null, classList: { add:()=>{}, remove:()=>{} }, parentNode: { replaceChild: ()=>{} }, disabled: false }; },
                querySelector: (sel) => { return { value: 'bandage' }; }
            };
        }
        return global.mockElements[id];
    },
    querySelector: (sel) => {
        if (sel === 'input[name="treatmentMethod"]:checked') return { value: 'bandage' };
        if (sel === "#healthTable tbody") return { innerHTML: '', appendChild: ()=>{} };
        return { innerHTML: '', appendChild: () => {} };
    },
    createElement: (tag) => {
        return { innerHTML: '', appendChild: () => {}, classList: { add:()=>{}, remove:()=>{} }, style: {} };
    },
    addEventListener: (event, cb) => { }
};
global.mockElements = {};

// Mock Game State
global.gameState = {
    player: { health: { head: { name: "Head", current: 3, max: 5, crisisTimer: 0 } } },
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
global.window.getSkillValue = (skill) => { return 0; };
global.window.rollDie = (sides) => { return 10; };
global.window.updateTurnStatusDisplay = () => { };
global.window.formatBodyPartName = (name) => name;
global.window.audioManager = { playUiSound: () => {} };

// Mock Inventory Manager
let removedItemId = null;
let removedItemQty = null;
global.window.inventoryManager = {
    removeItem: (id, qty) => {
        console.log(`[INV] Removing item ID: ${id}, Qty: ${qty}`);
        removedItemId = id;
        removedItemQty = qty;
    }
};

const fs = require('fs');
const charFileContent = fs.readFileSync('js/character.js', 'utf8');
try { eval(charFileContent); } catch (e) { console.error("Error loading js/character.js:", e.message); }

console.log("--- Testing Item Consumption ---");
// Ensure getMedicalItems is available
if (typeof window.getMedicalItems !== 'function') {
    console.error("FAILURE: getMedicalItems not defined.");
} else {
    // Call performMedicalTreatment with 'bandage'
    if (typeof window.performMedicalTreatment === 'function') {
        window.performMedicalTreatment('head', 'bandage');
    } else {
        console.error("performMedicalTreatment not found");
    }
}

// Verify
if (removedItemId === 'bandage' && removedItemQty === 1) {
    console.log("SUCCESS: Correct item ID and quantity removed.");
} else {
    console.error(`FAILURE: Expected removal of 'bandage' x1. Got ID: ${removedItemId}, Qty: ${removedItemQty}`);
}
