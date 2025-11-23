
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
                         global.mockElements[id] = newChild;
                    }
                },
                cloneNode: () => {
                     return {
                        onclick: null,
                        classList: { add:()=>{}, remove:()=>{} },
                        parentNode: { replaceChild: ()=>{} },
                        disabled: false
                     };
                },
                querySelector: (sel) => { return { value: 'skill' }; }
            };
        }
        return global.mockElements[id];
    },
    querySelector: (sel) => {
        if (sel === 'input[name="treatmentMethod"]:checked') {
             return { value: 'skill' };
        }
        if (sel === "#healthTable tbody") {
             return { innerHTML: '', appendChild: ()=>{} };
        }
        return { innerHTML: '', appendChild: () => {} };
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

// Mock Game State - Player WITHOUT a name property on parts or character
global.gameState = {
    player: {
        id: "player",
        // Missing 'name' property on player
        health: {
            head: { current: 3, max: 5, crisisTimer: 0 } // Missing 'name' property on part
        }
    },
    inventory: {
        container: {
            items: []
        }
    },
    actionPointsRemaining: 2
};

// Mock Functions
global.logToConsole = (msg, color) => { console.log(`[LOG]: ${msg}`); };
global.window.logToConsole = global.logToConsole;

global.window.gameState = global.gameState;

// Mock getSkillValue
global.window.getSkillValue = (skill) => { return 0; }; // Return 0 as per user report
global.getSkillValue = global.window.getSkillValue;

global.rollDie = (sides) => { return 12; }; // Return 12 (matches user log "12 + 0 = 12")
global.window.rollDie = global.rollDie;

global.window.updateTurnStatusDisplay = () => { };
global.window.formatBodyPartName = (name) => name; // Mock implementation
global.window.audioManager = { playUiSound: () => {} };

global.window.inventoryManager = {
    removeItem: (item) => {}
};

const fs = require('fs');
const path = require('path');
const charFileContent = fs.readFileSync('js/character.js', 'utf8');

try {
    eval(charFileContent);
} catch (e) {
    console.error("Error loading js/character.js:", e.message);
}

console.log("--- Reproducing 'Undefined' Log ---");
// Call performMedicalTreatment which calls applyTreatment
// We pass 'head' as bodyPartKey.
// In applyTreatment, it tries to access gameState.player.health['head'].name -> undefined
// And gameState.player.name -> undefined
if (typeof window.performMedicalTreatment === 'function') {
    window.performMedicalTreatment('head', 'skill');
} else {
    console.error("performMedicalTreatment not found");
}
