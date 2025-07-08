// js/turnManager.js

// Assumes gameState, logToConsole, window.mapRenderer, window.interaction, window.character are globally available

let localAssetManager = null; // To store the assetManager instance

// Define movement costs for automatic Z-stepping
const Z_STEP_UP_COST = 2;
const Z_STEP_DOWN_COST = 1;

function initTurnManager(assetMgr) {
    localAssetManager = assetMgr;
    if (localAssetManager && localAssetManager.tilesets) {
        console.log("TurnManager initialized with AssetManager. Tilesets available.");
    } else {
        console.error("TurnManager initialized WITHOUT valid AssetManager or tilesets!");
    }
}

function updateTurnUI_internal() {
    const movementUI = document.getElementById("movementPointsUI");
    const actionUI = document.getElementById("actionPointsUI");
    if (movementUI) movementUI.textContent = "Moves Left: " + gameState.movementPointsRemaining;
    if (actionUI) actionUI.textContent = "Actions Left: " + gameState.actionPointsRemaining;
}

function startTurn_internal() {
    gameState.movementPointsRemaining = 6;
    gameState.actionPointsRemaining = 1;
    gameState.hasDashed = false;
    logToConsole(`Turn ${gameState.currentTurn} started. Moves: ${gameState.movementPointsRemaining}, Actions: ${gameState.actionPointsRemaining}`);
    updateTurnUI_internal();
}

function dash_internal() {
    if (!gameState.hasDashed && gameState.actionPointsRemaining > 0) {
        gameState.movementPointsRemaining += 6;
        gameState.hasDashed = true;
        gameState.actionPointsRemaining--;
        // TODO: Play move_dash_01.wav
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.7 }); // Placeholder for dash
        logToConsole(`Dashing activated. Moves now: ${gameState.movementPointsRemaining}, Actions left: ${gameState.actionPointsRemaining}`);
        updateTurnUI_internal();
    } else {
        logToConsole("Already dashed this turn or no actions left.");
        // TODO: Play ui_error_01.wav if attempting to dash without AP or already dashed
        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
    }
}

async function endTurn_internal() { // Make async
    let waitCount = 0; // Counter for stuck log
    // Wait for any ongoing animations to complete (e.g. player movement)
    if (window.animationManager) {
        console.log('[TurnManager] endTurn_internal: Starting wait loop. isAnimationPlaying:', window.animationManager.isAnimationPlaying());
        while (window.animationManager.isAnimationPlaying()) {
            waitCount++;
            if (waitCount > 50) { // Approx 2.5 seconds if timeout is 50ms
                console.log('[TurnManager] endTurn_internal: STUCK in wait loop. Count:', waitCount, 'isAnimationPlaying:', window.animationManager.isAnimationPlaying());
                if (waitCount > 100) {
                    console.log('[TurnManager] endTurn_internal: Breaking wait loop due to excessive count.');
                    break; // Break to prevent infinite loop in bad state
                }
            }
            await new Promise(resolve => setTimeout(resolve, 50)); // Wait 50ms
        }
    }

    logToConsole(`Turn ${gameState.currentTurn} ended.`);
    // Assuming character.js exports updateHealthCrisis to window.character
    if (typeof window.updateHealthCrisis === 'function') {
        window.updateHealthCrisis(gameState);
    } else {
        console.error("window.updateHealthCrisis is not available. Health crisis cannot be updated.");
    }

    // --- NPC Out-of-Combat Actions ---
    if (!gameState.isInCombat && gameState.npcs && gameState.npcs.length > 0) {
        logToConsole("Processing NPC out-of-combat turns...", "darkgrey");
        for (const npc of gameState.npcs) {
            // Ensure NPC is alive before processing their turn
            if (npc && npc.health && typeof npc.health.torso?.current === 'number' && typeof npc.health.head?.current === 'number' && npc.health.torso.current > 0 && npc.health.head.current > 0) {
                // Ensure combatManager and localAssetManager (assetManager) are available
                if (window.combatManager && localAssetManager && typeof window.executeNpcTurn === 'function') {
                    // NPC OOC turns are also async if they involve movement animations
                    await window.executeNpcTurn(npc, gameState, window.combatManager, localAssetManager);
                } else {
                    if (!window.combatManager) logToConsole(`ERROR: global combatManager not found for NPC ${npc.id} OOC turn.`, "red");
                    if (!localAssetManager) logToConsole(`ERROR: localAssetManager not found for NPC ${npc.id} OOC turn.`, "red");
                    if (typeof window.executeNpcTurn !== 'function') logToConsole(`ERROR: window.executeNpcTurn not found for NPC ${npc.id} OOC turn.`, "red");
                }
            } else {
                logToConsole(`Skipping out-of-combat turn for NPC ${npc?.id || 'UnknownID'} as they are incapacitated or health data is missing.`, "grey");
            }
        }
        logToConsole("Finished processing NPC out-of-combat turns.", "darkgrey");
    }
    // --- End NPC Out-of-Combat Actions ---

    gameState.currentTurn++;
    startTurn_internal(); // Call internal startTurn
    window.mapRenderer.scheduleRender();
    updateTurnUI_internal(); // Call internal updateTurnUI
}

// Make move_internal async
async function move_internal(direction) {
    if (gameState.isActionMenuActive) return;
    console.log('[TurnManager] move_internal: Checking isAnimationPlaying. Flag:', (window.animationManager ? window.animationManager.isAnimationPlaying() : 'N/A'));
    // Check if an animation is playing. If so, prevent movement.
    // Delegate movement to the new shared function
    // Ensure localAssetManager is available and passed
    if (!localAssetManager) {
        logToConsole("Error: localAssetManager not available in turnManager.move_internal.", "red");
        return;
    }

    const moveResult = await window.attemptCharacterMove(gameState, direction, localAssetManager);

    if (moveResult) {
        // Original position might have changed due to fall or z-transition,
        // so playerPos in gameState is the source of truth now.
        const finalPlayerPos = gameState.playerPos; // This is the new position after attemptCharacterMove

        // Player-specific UI updates and interactions
        updateTurnUI_internal(); // Update MP/AP display
        window.mapRenderer.scheduleRender();
        window.interaction.detectInteractableItems();
        window.interaction.showInteractableItems();
        if (window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();


        // Check for portal after successful movement or fall initiation
        // The checkAndHandlePortal function in script.js uses gameState.playerPos
        if (typeof window.checkAndHandlePortal === 'function') {
            // We need to pass the new player coordinates to checkAndHandlePortal
            // However, checkAndHandlePortal currently reads directly from gameState.playerPos.
            // Since attemptCharacterMove updates gameState.playerPos directly, this should be fine.
            window.checkAndHandlePortal(finalPlayerPos.x, finalPlayerPos.y);
        }

        // After successful move, if in combat, update LOS line
        if (gameState.isInCombat && window.combatManager && typeof window.combatManager.updateCombatLOSLine === 'function') {
            const combatWeaponSelect = document.getElementById('combatWeaponSelect');
            let weaponForLOS = null;
            if (combatWeaponSelect) { // Check if UI element exists
                const selectedOption = combatWeaponSelect.options[combatWeaponSelect.selectedIndex];
                if (selectedOption) { // Check if an option is selected
                    if (selectedOption.value === "unarmed") {
                        weaponForLOS = null;
                    } else if (selectedOption.dataset.itemData) {
                        weaponForLOS = JSON.parse(selectedOption.dataset.itemData);
                    } else if (window.assetManager) { // Ensure assetManager is available
                        weaponForLOS = window.assetManager.getItem(selectedOption.value);
                    }
                }
            }
            // Target is from gameState.combatCurrentDefender or gameState.defenderMapPos
            window.combatManager.updateCombatLOSLine(gameState, gameState.combatCurrentDefender || gameState.defenderMapPos, weaponForLOS);
        }

    } else {
        // logToConsole("Move attempt failed or no actual movement occurred.");
        // No UI updates needed if move didn't happen.
        // The attemptCharacterMove function would have logged the reason.
    }
}

window.turnManager = {
    init: initTurnManager, // Add this line
    updateTurnUI: updateTurnUI_internal,
    startTurn: startTurn_internal,
    dash: dash_internal,
    endTurn: endTurn_internal, // ensure this points to the new async function
    move: move_internal // already async
};