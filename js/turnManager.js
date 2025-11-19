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
    if (gameState.player && gameState.player.isInVehicle) {
        logToConsole("Cannot dash while in a vehicle.", "orange");
        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        return;
    }
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

    // Update Weather
    if (window.weatherManager && typeof window.weatherManager.updateWeather === 'function') {
        window.weatherManager.updateWeather();
    } else {
        // This might be noisy if logged every turn, consider a one-time warning during init if manager not found
        // console.warn("WeatherManager not found or updateWeather function is missing.");
    }

    // Update Dynamic Events & Procedural Quests (NEW)
    if (window.dynamicEventManager && typeof window.dynamicEventManager.masterUpdate === 'function') {
        window.dynamicEventManager.masterUpdate(gameState.currentTurn); // Pass current game tick/turn
    }
    if (window.proceduralQuestManager && typeof window.proceduralQuestManager.updateProceduralQuests === 'function') {
        window.proceduralQuestManager.updateProceduralQuests(gameState.currentTurn);
    }
    // TODO: Add periodic call to proceduralQuestManager.generateQuestOffer() for relevant factions,
    // e.g., every few game hours or when visiting a faction hub. This might live in a higher-level game clock manager.

    // Update Construction Resource Production (NEW)
    if (window.constructionManager && typeof window.constructionManager.updateResourceProduction === 'function') {
        window.constructionManager.updateResourceProduction(gameState.currentTurn);
    }


    gameState.currentTurn++;
    startTurn_internal(); // Call internal startTurn
    window.mapRenderer.scheduleRender();
    updateTurnUI_internal(); // Call internal updateTurnUI
}

// Make move_internal async
async function move_internal(direction) {
    if (gameState.isActionMenuActive) return;
    console.log('[TurnManager] move_internal: Checking isAnimationPlaying. Flag:', (window.animationManager ? window.animationManager.isAnimationPlaying() : 'N/A'));

    // Player posture cost adjustments
    let moveCost = 1;
    let moveSuccessful = false;

    if (gameState.player && gameState.player.isInVehicle) {
        const vehicleId = gameState.player.isInVehicle;
        const vehicle = window.vehicleManager ? window.vehicleManager.getVehicleById(vehicleId) : null;

        if (!vehicle) {
            logToConsole(`Error: Player is in vehicle ID ${vehicleId}, but vehicle not found.`, "error");
            return;
        }
        if (!window.vehicleManager) {
            logToConsole("Error: VehicleManager not available for vehicle movement.", "error");
            return;
        }

        // Vehicle movement cost & fuel
        const vehicleMoveCost = 1; // TODO: Base this on vehicle.calculatedStats.speed or engine type
        const fuelPerMove = 1;   // TODO: Base this on vehicle.calculatedStats.fuelEfficiency or engine type

        if (gameState.movementPointsRemaining < vehicleMoveCost) {
            logToConsole(`Not enough movement points to move ${vehicle.name}. Required: ${vehicleMoveCost}`, "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }
        if (vehicle.fuel < fuelPerMove) {
            logToConsole(`${vehicle.name} is out of fuel!`, "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); // Or a specific "out of fuel" sound
            return;
        }

        let dx = 0, dy = 0;
        switch (direction) {
            case 'up': case 'w': case 'W': dy = -1; break;
            case 'down': case 's': case 'S': dy = 1; break;
            case 'left': case 'a': case 'A': dx = -1; break;
            case 'right': case 'd': case 'D': dx = 1; break;
            default: logToConsole("Invalid move direction: " + direction, "warn"); return;
        }

        const currentVehiclePos = vehicle.mapPos;
        const nextX = currentVehiclePos.x + dx;
        const nextY = currentVehiclePos.y + dy;
        const nextZ = currentVehiclePos.z; // Vehicle Z-level changes are not handled by basic move yet

        // Basic collision check for vehicle (can be expanded)
        if (window.mapRenderer.isWalkable(nextX, nextY, nextZ)) {
            // Animate vehicle movement (placeholder, actual animation is complex)
            if (window.animationManager && typeof window.animationManager.startMovementAnimation === 'function') {
                // The entity passed to startMovementAnimation would be the vehicle object itself,
                // or an object that can have its .mapPos updated by the animation.
                // For now, we'll update directly and then schedule render.
                // await window.animationManager.startMovementAnimation(vehicle, nextX, nextY, nextZ, 200);
            }

            vehicle.mapPos = { x: nextX, y: nextY, z: nextZ };
            gameState.playerPos = { ...vehicle.mapPos }; // Player moves with the vehicle

            vehicle.fuel -= fuelPerMove;
            gameState.movementPointsRemaining -= vehicleMoveCost;

            logToConsole(`${vehicle.name} moved to (${nextX},${nextY},${nextZ}). Fuel: ${vehicle.fuel}. MP Left: ${gameState.movementPointsRemaining}`, "info");
            // TODO: Play vehicle move sound based on terrain/vehicle type
            if (window.audioManager) window.audioManager.playUiSound('ui_vehicle_move_01.wav');


            // Call calculateVehicleStats if fuel change might affect it (e.g. weight)
            // window.vehicleManager.calculateVehicleStats(vehicle.id); // Not strictly needed for just fuel change unless weight is affected

            moveSuccessful = true;
        } else {
            logToConsole(`${vehicle.name} cannot move to (${nextX},${nextY},${nextZ}): Path blocked.`, "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_blocked_01.wav');
        }

    } else { // Player is NOT in a vehicle, standard character movement
        // Defensive check and logging for gameState and playerPosture
        if (!window.gameState) {
            logToConsole("CRITICAL_ERROR: window.gameState is undefined in move_internal (player branch). Cannot proceed.", "red");
            return;
        }
        // logToConsole(`[TurnManager Debug] In move_internal (player branch): window.gameState.playerPosture = ${window.gameState.playerPosture}`, "grey");
        if (typeof window.gameState.playerPosture === 'undefined') {
            logToConsole("WARNING: window.gameState.playerPosture is undefined (player branch). Defaulting to 'standing' for this move.", "orange");
        }

        if (window.gameState.playerPosture === 'crouching') {
            moveCost = 2;
        } else if (window.gameState.playerPosture === 'prone') {
            moveCost = 3;
        }

        if (window.gameState.movementPointsRemaining < moveCost) {
            logToConsole("Not enough movement points for current posture.", "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }

        if (!localAssetManager) {
            logToConsole("Error: localAssetManager not available in turnManager.move_internal (player branch).", "red");
            return;
        }

        // Pass moveCost to attemptCharacterMove
        const playerMoveResult = await window.attemptCharacterMove(gameState, direction, localAssetManager, moveCost);
        if (playerMoveResult) {
            moveSuccessful = true;
        }
    }


    if (moveSuccessful) {
        const finalPos = gameState.playerPos; // This is the new position after move (either player or vehicle)

        updateTurnUI_internal();
        window.mapRenderer.scheduleRender();
        window.interaction.detectInteractableItems();
        window.interaction.showInteractableItems();
        if (window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();

        if (typeof window.checkAndHandlePortal === 'function') {
            window.checkAndHandlePortal(finalPos.x, finalPos.y); // Portal check uses playerPos
        }

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

        // After successful move, check for traps on the new tile (passive check)
        if (window.trapManager && typeof window.trapManager.checkForTraps === 'function') {
            // Pass the player entity (gameState itself for player skills/pos)
            // false for isActiveSearch, 0 for searchRadius (current tile only for passive check)
            window.trapManager.checkForTraps(window.gameState.player, false, 0);
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