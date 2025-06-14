// Import node-fetch for http/https URLs, and fs for file URLs
import nodeFetch from 'node-fetch';
import fs from 'fs/promises'; // For fs.readFile
import path from 'path'; // For path manipulation

// Mock window and CustomEvent
global.window = {
    dispatchEvent: function(event) { console.log(`Event dispatched: ${event.type}`, event.detail); },
    campaignManager: null,
    dialogueManager: null,
    globalStateManager: null,
    DialogueManager: null
};
global.CustomEvent = class CustomEvent {
    constructor(type, detail) { this.type = type; this.detail = detail; }
};

// Simplified Mock GlobalStateManager
class MockGlobalStateManager {
    constructor() { this.flags = {}; console.log("MockGlobalStateManager initialized."); }
    evaluateCondition(condition) { console.log("MockGSM: Eval condition:", condition); return true; }
    processAction(action, dialogueId) { console.log("MockGSM: Process action:", action, "from dialogue:", dialogueId); }
}
global.window.globalStateManager = new MockGlobalStateManager();

// Custom fetch implementation
global.fetch = async (urlInput, options) => {
    let urlString = typeof urlInput === 'string' ? urlInput : (urlInput instanceof URL ? urlInput.href : urlInput.url);
    let absoluteUrl = urlString.startsWith('file://') || urlString.startsWith('http') ? urlString : `file://${path.resolve(process.cwd(), urlString.replace(/^[\.\/]+/, ''))}`;

    // console.log(`Fetch: ${absoluteUrl}`); // Reduced verbosity for this test run

    if (absoluteUrl.startsWith('file://')) {
        const filePath = absoluteUrl.substring('file://'.length);
        try {
            let fileDataString = await fs.readFile(filePath, 'utf8');
            if (fileDataString.startsWith('\uFEFF')) {
                // console.log(`Stripped BOM from ${filePath}`); // Reduced verbosity
                fileDataString = fileDataString.substring(1);
            }
            return {
                ok: true, status: 200, statusText: 'OK',
                json: async () => JSON.parse(fileDataString),
                text: async () => fileDataString,
            };
        } catch (error) {
            // console.error(`Fetch Error reading file ${filePath}:`, error.code); // Reduced verbosity
            return {
                ok: false, status: error.code === 'ENOENT' ? 404 : 500,
                statusText: error.code === 'ENOENT' ? 'Not Found' : 'Internal Server Error',
                json: async () => { throw error; }, text: async () => { throw error; },
            };
        }
    } else {
        return nodeFetch(absoluteUrl, options);
    }
};

// Load CampaignManager script
const campaignManagerScriptPath = 'js/campaignManager.js';
const campaignManagerScriptContent = await fs.readFile(campaignManagerScriptPath, 'utf8');
const tempCampaignManagerSource = campaignManagerScriptContent.replace(
    "this.loadBaseNpcTemplates(); // Call new method",
    "// Constructor call to loadBaseNpcTemplates deferred"
);
try {
    eval(tempCampaignManagerSource);
    console.log("CampaignManager script evaluated.");
} catch (e) {
    console.error("Error evaluating CampaignManager.js:", e); process.exit(1);
}

// Load DialogueManager script
const dialogueManagerScriptPath = 'js/dialogueManager.js';
let dialogueManagerScriptContent = await fs.readFile(dialogueManagerScriptPath, 'utf8');
dialogueManagerScriptContent += "\nwindow.DialogueManager = DialogueManager;";
try {
    eval(dialogueManagerScriptContent);
    window.dialogueManager = new window.DialogueManager(window.campaignManager, window.globalStateManager);
    console.log("DialogueManager script evaluated and instance created.");
} catch (e) {
    console.error("Error evaluating DialogueManager.js:", e); process.exit(1);
}

// Main test execution
async function main() {
    console.log("--- Starting Campaign System Integration Test ---");
    if (!window.campaignManager || !window.dialogueManager) {
        console.error("Managers not initialized. Halting test."); return;
    }

    try {
        // Initialize CampaignManager fully
        await window.campaignManager.loadBaseNpcTemplates();
        console.log("Base NPC templates loaded.");
        await window.campaignManager.listAvailableCampaigns();
        console.log("Campaign index loaded.");

        // Activate Fallbrook campaign
        const campaignIdToTest = 'fallbrook_main_story';
        console.log(`\nActivating campaign: ${campaignIdToTest}...`);
        const activationSuccess = await window.campaignManager.activateCampaign(campaignIdToTest);
        if (!activationSuccess) {
            console.error(`Failed to activate campaign '${campaignIdToTest}'. Halting test.`);
            return;
        }
        console.log(`Campaign '${campaignIdToTest}' activated successfully.\n`);

        // --- NPC Templating Tests ---
        console.log("--- Testing NPC Data Retrieval (Templating) ---");
        window.campaignManager.getNpcData('fpd_nisleit');
        window.campaignManager.getNpcData('con_grayson');
        window.campaignManager.getNpcData('fallbrook_test_civilian');
        console.log("--- NPC Data Retrieval Tests Finished ---\n");

        // --- Dialogue Lazy Loading Tests ---
        console.log("--- Testing Dialogue Lazy Loading ---");
        // Test 1: First call for nisleit_default.json (should load from file)
        console.log("Test 1: Requesting 'dialogue/fpd/nisleit_default.json' (1st time)");
        await window.campaignManager.getDialogueData('dialogue/fpd/nisleit_default.json');

        // Test 2: Second call for nisleit_default.json (should hit cache)
        console.log("\nTest 2: Requesting 'dialogue/fpd/nisleit_default.json' (2nd time)");
        await window.campaignManager.getDialogueData('dialogue/fpd/nisleit_default.json');

        // Test 3: Call for dialogue_sample_placeholder.json (newly added NPC's dialogue)
        console.log("\nTest 3: Requesting 'dialogue/fallbrook/dialogue_sample_placeholder.json'");
        await window.campaignManager.getDialogueData('dialogue/fallbrook/dialogue_sample_placeholder.json');

        // Test 4: Call for a non-existent dialogue file
        console.log("\nTest 4: Requesting 'dialogue/non_existent_dialogue.json'");
        await window.campaignManager.getDialogueData('dialogue/non_existent_dialogue.json');
        console.log("--- Dialogue Lazy Loading Tests Finished ---\n");

    } catch (error) {
        console.error("Error during Node.js test execution:", error);
    }
    console.log("--- Campaign System Integration Test Finished ---");
}

main().catch(e => {
    console.error("Unhandled error in main:", e);
    process.exit(1);
});
