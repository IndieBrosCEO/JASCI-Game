
// Mock environment
const window = {
    audioManager: { playUiSound: () => {} },
    gameState: { gameStarted: false },
    mapRenderer: {
        isWalkable: (x, y, z) => {
            // Mock map: Z=2 is air, Z=1 is floor.
            if (z === 2) return false;
            if (z === 1) return true;
            return false;
        },
        ensureLevelExists: () => true,
        getCurrentMapData: () => ({ levels: { "0": {}, "1": {}, "2": {} } }),
        scheduleRender: () => {}
    },
    animationManager: { playAnimation: () => Promise.resolve() }
};
global.window = window;
global.gameState = window.gameState;
global.alert = (msg) => console.log("ALERT:", msg);

// Read character.js content to eval (since it's not a module)
const fs = require('fs');
const characterJs = fs.readFileSync('js/character.js', 'utf8');

// Helper to extract function code or just eval the whole thing if possible.
window.document = {
    getElementById: () => ({ addEventListener: () => {}, textContent: "" }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
};
global.document = window.document;
global.logToConsole = (msg) => console.log("LOG:", msg);

// Evaluate character.js
eval(characterJs);

// --- Test 1: updateStat with "0" ---
console.log("\n--- Test 1: updateStat with 0 ---");
const char = {
    stats: [
        { name: "Strength", points: 10 }
    ],
    MIN_STAT_VALUE: 0, // Set min to 0 to allow 0
    MAX_STAT_VALUE: 20,
    MAX_TOTAL_STAT_POINTS: 50
};

// Try setting to 0
char.stats[0].points = 10;
updateStat("Strength", "0", char);
console.log("Stats after updateStat('Strength', '0') with min 0:", char.stats[0].points);
if (char.stats[0].points === 0) {
    console.log("PASS: 0 is accepted.");
} else {
    console.log("FAIL: 0 became", char.stats[0].points);
}

// --- Test 2: Stat Cap Consistency ---
console.log("\n--- Test 2: Stat Cap Consistency ---");
char.MAX_STAT_VALUE = 100; // Allow high individual stats to test total cap
char.stats[0].points = 30;
char.MAX_TOTAL_STAT_POINTS = 100; // Custom total cap

updateStat("Strength", 31, char); // 30 -> 31. Total 31.
console.log(`Updated to 31. Points: ${char.stats[0].points}`);

// Try going above 35 (which was the old hardcoded limit)
char.stats[0].points = 35;
updateStat("Strength", 36, char); // 35 -> 36. Total 36.

if (char.stats[0].points === 36) {
    console.log("PASS: updateStat allowed > 35 (respected MAX_TOTAL_STAT_POINTS)");
} else {
    console.log("FAIL: updateStat blocked > 35");
}

// Try going above MAX_TOTAL_STAT_POINTS (100)
char.stats[0].points = 100;
updateStat("Strength", 101, char);
if (char.stats[0].points === 100) {
    console.log("PASS: updateStat blocked > 100 (respected MAX_TOTAL_STAT_POINTS)");
} else {
    console.log("FAIL: updateStat allowed > 100");
}
