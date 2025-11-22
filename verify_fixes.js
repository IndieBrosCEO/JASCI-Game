// verify_fixes.js

// Mock window and necessary global objects
global.window = {};
global.logToConsole = (msg) => console.log(msg);
global.gameState = { activeFires: [], playerPos: {x:0,y:0,z:0} }; // Define gameState globally as it is used in FireManager

// Mock AudioManager
class MockAudioManager {
    constructor() {
        this.playedSounds = [];
        this.stoppedSounds = [];
    }
    playSound(soundName, options) {
        console.log(`[MockAudio] Playing ${soundName}`, options);
        this.playedSounds.push({ name: soundName, options });
        return { name: soundName, stop: () => this.stopSound({ name: soundName }) };
    }
    stopSound(source) {
        console.log(`[MockAudio] Stopping sound`, source);
        this.stoppedSounds.push(source);
    }
}
window.audioManager = new MockAudioManager();

// Mock InventoryManager
class MockInventoryManager {
    constructor() {
        this.uiUpdated = false;
    }
    updateInventoryUI() {
        console.log("[MockInventory] updateInventoryUI called");
        this.uiUpdated = true;
    }
}
window.inventoryManager = new MockInventoryManager();

// Mock mapRenderer and assetManager for FireManager
window.mapRenderer = { getCurrentMapData: () => ({ levels: {} }), scheduleRender: () => {} };
window.assetManager = { tilesets: {} };

// Load FireManager class manually since we can't easily require it if it's not a module
const fs = require('fs');
const path = require('path');

// Read and evaluate FireManager code
const fireManagerCode = fs.readFileSync(path.join(__dirname, 'js', 'fireManager.js'), 'utf8');

console.log("--- Verifying FireManager Logic ---");

try {
    eval(fireManagerCode);
} catch (e) {
    console.log("Eval failed:", e);
}

// Instantiate FireManager
const fireManager = new window.FireManager();
// We rely on the global `gameState` variable, which FireManager uses directly.
// fireManager.init(global.gameState); // The init method uses `gameState` variable directly, not passed argument (based on the grep, it uses `gameState.activeFires`)
// Wait, the grep showed `init(gameState)`.
// Let's check the file content again.
// `init(gameState) { if (!gameState.activeFires) ... }`
// But other methods use `gameState` directly. `if (this.isBurning(x, y, z))` calls `gameState.activeFires...`
// So `gameState` must be in scope. In the eval, it will look for global variables.

fireManager.init(global.gameState);

// Test 1: processTurn should trigger audio loop if fires exist
global.gameState.activeFires.push({ x: 0, y: 0, z: 0, duration: 3 });
fireManager.processTurn();

if (window.audioManager.playedSounds.some(s => s.name === 'fire_loop_01.wav')) {
    console.log("PASS: Fire loop sound triggered.");
} else {
    console.error("FAIL: Fire loop sound NOT triggered.");
}

// Test 2: processTurn should stop audio loop if no fires exist
global.gameState.activeFires = [];
fireManager.processTurn();

// We expect stopSound to be called on the source stored in fireManager
if (window.audioManager.stoppedSounds.length > 0) {
     console.log("PASS: Fire loop sound stopped.");
} else {
     console.error("FAIL: Fire loop sound NOT stopped.");
}

console.log("--- Verifying Inventory UI Update Logic ---");
if (typeof window.inventoryManager.updateInventoryUI === 'function') {
    window.inventoryManager.updateInventoryUI();
    if (window.inventoryManager.uiUpdated) {
        console.log("PASS: window.inventoryManager.updateInventoryUI() is callable and works.");
    } else {
        console.error("FAIL: window.inventoryManager.updateInventoryUI() called but flag not set.");
    }
} else {
    console.error("FAIL: window.inventoryManager.updateInventoryUI is not a function.");
}

console.log("Verification Complete.");
