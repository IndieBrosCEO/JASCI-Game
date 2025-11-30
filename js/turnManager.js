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
    // If multiplayer, show status of local player
    const entity = window.gameState.player;
    if (!entity) return;

    // Use entity-specific turn points if they exist (for MP), otherwise fallback to global
    // But in single player, gameState.actionPointsRemaining is used.
    // Let's standardize: Use entity properties if available, else global (legacy).
    // Actually, script.js still uses global. Let's keep using global for "My Player"
    // OR migrate entirely. Migration is risky.
    // Compromise: Read from global for now as that's what script.js updates.

    // WAIT: In MP, each entity needs its own AP/MP.
    // If I switch to entity-based, I must ensure startTurn initializes them on the entity.

    // For now, let's assume 'gameState' vars represent the LOCAL player's turn state.

    const movementUI = document.getElementById("movementPointsUI");
    const actionUI = document.getElementById("actionPointsUI");
    if (movementUI) movementUI.textContent = "Moves Left: " + window.gameState.movementPointsRemaining;
    if (actionUI) actionUI.textContent = "Actions Left: " + window.gameState.actionPointsRemaining;

    // Vehicle UI
    let vehicleUI = document.getElementById("vehicleMovementPointsUI");
    if (entity.isInVehicle) {
        if (!vehicleUI) {
            vehicleUI = document.createElement("div");
            vehicleUI.id = "vehicleMovementPointsUI";
            vehicleUI.style.color = "cyan";
            if (movementUI && movementUI.parentNode) {
                movementUI.parentNode.insertBefore(vehicleUI, movementUI.nextSibling);
            }
        }

        const vehicle = window.vehicleManager ? window.vehicleManager.getVehicleById(entity.isInVehicle) : null;
        if (vehicle) {
            const cost = window.vehicleManager.getVehicleMovementCost(vehicle.id);
            const displayMoves = (vehicle.currentMovementPoints !== undefined && cost > 0) ? Math.floor(vehicle.currentMovementPoints / cost) : 0;
            vehicleUI.textContent = "Vehicle Moves Left: " + displayMoves;
            vehicleUI.style.display = "block";
        }
    } else {
        if (vehicleUI) {
            vehicleUI.style.display = "none";
        }
    }
}

function startTurn_internal() {
    window.gameState.movementPointsRemaining = 6;
    window.gameState.actionPointsRemaining = 1;
    window.gameState.hasDashed = false;

    // Reset vehicle MP
    if (window.gameState.vehicles) {
        window.gameState.vehicles.forEach(v => {
            v.currentMovementPoints = 6;
        });
    }

    logToConsole(`Turn ${window.gameState.currentTurn} started. Moves: ${window.gameState.movementPointsRemaining}, Actions: ${window.gameState.actionPointsRemaining}`);
    updateTurnUI_internal();
}

function dash_internal() {
    if (window.gameState.player && window.gameState.player.isInVehicle) {
        logToConsole("Cannot dash while in a vehicle.", "orange");
        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        return;
    }
    if (!window.gameState.hasDashed && window.gameState.actionPointsRemaining > 0) {
        window.gameState.movementPointsRemaining += 6;
        window.gameState.hasDashed = true;
        window.gameState.actionPointsRemaining--;
        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.7 });
        logToConsole(`Dashing activated. Moves now: ${window.gameState.movementPointsRemaining}, Actions left: ${window.gameState.actionPointsRemaining}`);
        updateTurnUI_internal();
    } else {
        logToConsole("Already dashed this turn or no actions left.");
        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
    }
}

async function endTurn_internal(entity = window.gameState.player) {
    let waitCount = 0;
    if (window.animationManager) {
        // console.log('[TurnManager] endTurn_internal: Starting wait loop.');
        while (window.animationManager.isAnimationPlaying()) {
            waitCount++;
            if (waitCount > 50) {
                // console.log('[TurnManager] endTurn_internal: STUCK in wait loop. Breaking.');
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    // MULTIPLAYER LOGIC
    if (window.networkManager && window.networkManager.isConnected) {
        // Mark this entity as ready
        entity.turnEnded = true;
        logToConsole(`${entity.name || 'Player'} ended their turn. Waiting for others...`, "info");

        // If Client: We are done. Send state update (handled by broadcast in handleKeyDown or explicit here).
        // Actually, explicit broadcast is safer here since this might be called by UI click 'T'.
        if (!window.networkManager.isHost) {
            // Client effectively just waits for Host to tick the turn
             if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav');
             // We can disable UI here until new turn starts
             return;
        }

        // If Host: Check if ALL players are ready
        const allPlayers = window.gameState.players || [window.gameState.player];
        const allReady = allPlayers.every(p => p.turnEnded);

        if (!allReady) {
            logToConsole(`Waiting for other players... (${allPlayers.filter(p=>p.turnEnded).length}/${allPlayers.length})`, "grey");
            return; // Do NOT process global turn yet
        }

        // All ready? Proceed to process turn.
        logToConsole("All players ready. Advancing turn.", "success");
        // Reset flags
        allPlayers.forEach(p => p.turnEnded = false);
    }
    // END MULTIPLAYER LOGIC

    logToConsole(`Turn ${window.gameState.currentTurn} ended.`);
    if (typeof window.updateHealthCrisis === 'function') {
        window.updateHealthCrisis(window.gameState);
    }

    // --- NPC Out-of-Combat Actions ---
    if (!window.gameState.isInCombat && window.gameState.npcs && window.gameState.npcs.length > 0) {
        logToConsole("Processing NPC out-of-combat turns...", "darkgrey");
        for (const npc of window.gameState.npcs) {
            if (npc && npc.health && npc.health.torso && npc.health.torso.current > 0) {
                if (window.combatManager && localAssetManager && typeof window.executeNpcTurn === 'function') {
                    await window.executeNpcTurn(npc, window.gameState, window.combatManager, localAssetManager);
                }
            }
        }
        logToConsole("Finished processing NPC out-of-combat turns.", "darkgrey");
    }

    if (window.weatherManager && typeof window.weatherManager.updateWeather === 'function') {
        window.weatherManager.updateWeather();
    }
    if (window.dynamicEventManager && typeof window.dynamicEventManager.masterUpdate === 'function') {
        window.dynamicEventManager.masterUpdate(window.gameState.currentTurn);
    }
    if (window.proceduralQuestManager && typeof window.proceduralQuestManager.updateProceduralQuests === 'function') {
        window.proceduralQuestManager.updateProceduralQuests(window.gameState.currentTurn);
    }
    if (window.constructionManager && typeof window.constructionManager.updateResourceProduction === 'function') {
        window.constructionManager.updateResourceProduction(window.gameState.currentTurn);
    }
    if (window.fireManager && typeof window.fireManager.processTurn === 'function') {
        window.fireManager.processTurn();
    }

    window.gameState.currentTurn++;
    startTurn_internal();
    window.mapRenderer.scheduleRender();
    updateTurnUI_internal();

    // If Host, broadcast the new turn state
    if (window.networkManager && window.networkManager.isHost) {
        window.networkManager.broadcastState();
    }
}

async function move_internal(direction, entity = window.gameState.player) {
    // If it's NOT the local player, we skip action menu checks?
    // Or we assume the caller (NetworkManager) handled validity?
    if (entity === window.gameState.player && window.gameState.isActionMenuActive) return;

    // console.log('[TurnManager] move_internal', direction, entity.name);

    let moveCost = 1;
    let moveSuccessful = false;

    if (entity.isInVehicle) {
        const vehicleId = entity.isInVehicle;
        const vehicle = window.vehicleManager ? window.vehicleManager.getVehicleById(vehicleId) : null;

        if (!vehicle) {
            logToConsole(`Error: Player is in vehicle ID ${vehicleId}, but vehicle not found.`, "error");
            return;
        }

        const vehicleMoveCost = window.vehicleManager.getVehicleMovementCost(vehicleId);
        const fuelPerMove = 1;

        if (vehicle.currentMovementPoints === undefined) vehicle.currentMovementPoints = 6;

        if (vehicle.currentMovementPoints < vehicleMoveCost) {
             // Only log to console if it's the local player to avoid spamming host console for client errors
            if (entity === window.gameState.player) {
                logToConsole(`Not enough vehicle movement points.`, "orange");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            }
            return;
        }
        if (vehicle.fuel < fuelPerMove) {
            if (entity === window.gameState.player) {
                logToConsole(`${vehicle.name} is out of fuel!`, "orange");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            }
            return;
        }

        // Pass 'entity' to attemptCharacterMove (it needs to support it)
        // Currently attemptCharacterMove uses gameState.playerPos.
        // We need to refactor attemptCharacterMove or temporarily swap gameState.player?
        // Let's assume attemptCharacterMove is NOT refactored yet.
        // HACK: Swap if entity !== gameState.player

        let swapped = false;
        const originalPlayer = window.gameState.player;
        if (entity !== originalPlayer) {
             window.gameState.player = entity;
             swapped = true;
        }

        try {
            const result = await window.attemptCharacterMove(window.gameState, direction, localAssetManager, vehicleMoveCost);
            if (result) moveSuccessful = true;
        } finally {
            if (swapped) window.gameState.player = originalPlayer;
        }

    } else {
        if (typeof window.gameState.playerPosture === 'undefined') {
             // Posture is currently GLOBAL in gameState.
             // Multiplayer TODO: Move posture to player entity.
        }

        if (window.gameState.playerPosture === 'crouching') {
            moveCost = 2;
        } else if (window.gameState.playerPosture === 'prone') {
            moveCost = 3;
        }

        // AP/MP Check
        // If Multiplayer, we should check entity specific MP.
        // Currently global gameState.movementPointsRemaining is used.
        // This means currently ALL players share the same AP/MP pool on the Host? No, that's bad.
        // We need to use entity.movementPointsRemaining if available.
        // But the game logic writes to global.

        // For this task, we will rely on the global variable being correct for the LOCAL processing context.
        // When Host processes Remote Entity, it should ideally load that entity's stats into global or refactor everything.
        // Refactoring everything is too big.
        // Strategy: Host swaps global vars when processing remote input?
        // Yes, NetworkManager.processRemoteInput should probably set `gameState.movementPointsRemaining = entity.mp`.

        if (window.gameState.movementPointsRemaining < moveCost) {
            if (entity === window.gameState.player) {
                logToConsole("Not enough movement points.", "orange");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            }
            return;
        }

        // HACK: Swap
        let swapped = false;
        const originalPlayer = window.gameState.player;
        if (entity !== originalPlayer) {
             window.gameState.player = entity;
             swapped = true;
        }

        try {
            const playerMoveResult = await window.attemptCharacterMove(window.gameState, direction, localAssetManager, moveCost);
            if (playerMoveResult) moveSuccessful = true;
        } finally {
             if (swapped) window.gameState.player = originalPlayer;
        }
    }


    if (moveSuccessful) {
        const finalPos = entity.mapPos;

        // Only update UI if it's local player
        if (entity === window.gameState.player) {
            updateTurnUI_internal();
            window.mapRenderer.scheduleRender();
            window.interaction.detectInteractableItems();
            window.interaction.showInteractableItems();
            if (window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
        } else {
            // If remote player moved, we still need to render
            window.mapRenderer.scheduleRender();
        }

        if (typeof window.checkAndHandlePortal === 'function') {
             // Portals logic likely relies on global player, might need update
             // window.checkAndHandlePortal(finalPos.x, finalPos.y);
        }

        // Passive trap check
        if (window.trapManager && typeof window.trapManager.checkForTraps === 'function') {
            window.trapManager.checkForTraps(entity, false, 0);
        }

    }
}

window.turnManager = {
    init: initTurnManager,
    updateTurnUI: updateTurnUI_internal,
    startTurn: startTurn_internal,
    dash: dash_internal,
    endTurn: endTurn_internal,
    move: move_internal
};
