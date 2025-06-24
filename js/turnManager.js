// js/turnManager.js

// Assumes gameState, logToConsole, window.mapRenderer, window.interaction, window.character are globally available

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
        logToConsole(`Dashing activated. Moves now: ${gameState.movementPointsRemaining}, Actions left: ${gameState.actionPointsRemaining}`);
        updateTurnUI_internal();
    } else {
        logToConsole("Already dashed this turn or no actions left.");
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
    if (window.animationManager && window.animationManager.isAnimationPlaying()) {
        logToConsole("Cannot move: Animation playing.", "orange");
        console.log('[TurnManager] move_internal: Prevented movement due to animation playing.');
        return;
    }
    if (gameState.movementPointsRemaining <= 0) {
        logToConsole("No movement points remaining. End your turn (press 't').");
        return;
    }
    const currentMap = window.mapRenderer.getCurrentMapData();
    if (!currentMap || !currentMap.dimensions) {
        logToConsole("Cannot move: Map data not loaded.");
        return;
    }
    const width = currentMap.dimensions.width;
    const height = currentMap.dimensions.height;
    const originalPos = { ...gameState.playerPos };
    let targetX = originalPos.x;
    let targetY = originalPos.y;
    let targetZ = originalPos.z; // Start with current Z

    switch (direction) {
        case 'up': case 'w': case 'ArrowUp': targetY--; break;
        case 'down': case 's': case 'ArrowDown': targetY++; break;
        case 'left': case 'a': case 'ArrowLeft': targetX--; break;
        case 'right': case 'd': case 'ArrowRight': targetX++; break;
        default: return; // Unknown direction
    }

    // Boundary checks (already handled by isWalkable, but good for early exit)
    if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) {
        logToConsole("Can't move that way (map boundary).");
        return;
    }

    // Check for NPC occupation at the target XY on the current Z.
    // This check happens before Z-transition or walkability for simplicity.
    // If moving through a Z-transition, NPC collision at the destination Z is more complex.
    if (gameState.npcs && gameState.npcs.length > 0) {
        for (const npc of gameState.npcs) {
            if (npc.mapPos && npc.mapPos.x === targetX && npc.mapPos.y === targetY && npc.mapPos.z === targetZ &&
                npc.health && npc.health.torso && npc.health.torso.current > 0) {
                logToConsole(`Cannot move to (${targetX},${targetY},${targetZ}): Tile occupied by ${npc.name}.`);
                return; // Prevent movement
            }
        }
    }

    // 1. Check for Z-Transition Tile at (targetX, targetY, currentZ)
    // This needs to check multiple layers for a z_transition tile.
    // Simplified: get the "topmost" tile ID that might be a transition.
    // More robust would be to iterate layers if needed.
    let transitionTileId = null;
    const zTransitionCheckLayers = ['item', 'building', 'landscape']; // Order might matter if transitions can overlap
    for (const layerName of zTransitionCheckLayers) {
        const layer = currentMap.levels[targetZ.toString()]?.[layerName];
        const tileId = layer?.[targetY]?.[targetX];
        if (tileId && window.assetManager && window.assetManager.tilesets[tileId]?.tags?.includes('z_transition')) {
            transitionTileId = tileId;
            break;
        }
    }

    if (transitionTileId) {
        const tileDef = window.assetManager.tilesets[transitionTileId];
        if (tileDef && tileDef.target_dz !== undefined) {
            const cost = tileDef.z_cost || 1; // Default z_cost to 1 if not defined
            if (gameState.movementPointsRemaining < cost) {
                logToConsole("Not enough movement points for Z-transition.");
                return;
            }

            const finalDestZ = targetZ + tileDef.target_dz;
            // Check if the destination of the Z-transition is walkable
            if (window.mapRenderer.isWalkable(targetX, targetY, finalDestZ)) {
                // Also check for NPC at destination of Z-transition
                let npcAtFinalDest = false;
                if (gameState.npcs && gameState.npcs.length > 0) {
                    for (const npc of gameState.npcs) {
                        if (npc.mapPos && npc.mapPos.x === targetX && npc.mapPos.y === targetY && npc.mapPos.z === finalDestZ &&
                            npc.health && npc.health.torso && npc.health.torso.current > 0) {
                            logToConsole(`Cannot use Z-transition to (${targetX},${targetY},${finalDestZ}): Destination occupied by ${npc.name}.`);
                            npcAtFinalDest = true;
                            break;
                        }
                    }
                }

                if (!npcAtFinalDest) {
                    gameState.playerPos = { x: targetX, y: targetY, z: finalDestZ };
                    gameState.movementPointsRemaining -= cost;
                    logToConsole(`Player used Z-transition: ${tileDef.name}. Moved from Z=${targetZ} to Z=${finalDestZ}. Cost: ${cost} MP.`, "cyan");

                    if (gameState.viewFollowsPlayerZ) {
                        gameState.currentViewZ = finalDestZ;
                        const newPlayerZStr = finalDestZ.toString();
                        if (currentMap.dimensions) { // currentMap is already defined
                            const H = currentMap.dimensions.height;
                            const W = currentMap.dimensions.width;
                            if (H > 0 && W > 0 && !gameState.fowData[newPlayerZStr]) {
                                gameState.fowData[newPlayerZStr] = Array(H).fill(null).map(() => Array(W).fill('hidden'));
                                logToConsole(`FOW data initialized for Z-level ${newPlayerZStr} after Z-transition.`);
                            }
                        }
                    }
                    // Common post-move updates
                    if (gameState.isInCombat && gameState.combatCurrentAttacker === gameState) {
                        gameState.attackerMapPos = { ...gameState.playerPos };
                    }
                    gameState.playerMovedThisTurn = true;
                    updateTurnUI_internal();
                    window.mapRenderer.scheduleRender();
                    window.interaction.detectInteractableItems();
                    window.interaction.showInteractableItems();
                    return; // Movement action complete
                }
            } else {
                logToConsole(`Z-transition '${tileDef.name}' destination (${targetX},${targetY},${finalDestZ}) is not walkable.`);
                // Do not proceed with this move. Player stays put.
                return;
            }
        }
    }

    // 2. Standard Horizontal Movement (if no Z-transition was taken)
    if (window.mapRenderer.isWalkable(targetX, targetY, targetZ)) {
        // NPC check was already done above for the current Z target.
        // If isWalkable is true, and no NPC, proceed.
        if (targetX === originalPos.x && targetY === originalPos.y && targetZ === originalPos.z) {
            // This case should ideally not be reached if isWalkable failed for a different tile
            // or if boundary checks failed. But as a fallback:
            logToConsole("Can't move that way (already there or initial check failed).");
            return;
        }

        gameState.playerPos = { x: targetX, y: targetY, z: targetZ };
        gameState.movementPointsRemaining--;
        logToConsole(`Moved to (${gameState.playerPos.x}, ${gameState.playerPos.y}, Z:${gameState.playerPos.z}). Moves left: ${gameState.movementPointsRemaining}`);

        // Common post-move updates
        if (gameState.isInCombat && gameState.combatCurrentAttacker === gameState) {
            gameState.attackerMapPos = { ...gameState.playerPos };
        }
        gameState.playerMovedThisTurn = true;
        updateTurnUI_internal();
        window.mapRenderer.scheduleRender();
        window.interaction.detectInteractableItems();
        window.interaction.showInteractableItems();
        return; // Movement action complete
    }

    // 3. Invalid Move (if neither Z-transition nor standard horizontal move was successful)
    logToConsole("Can't move that way (target is not walkable or z-transition failed).");
}

window.turnManager = {
    updateTurnUI: updateTurnUI_internal,
    startTurn: startTurn_internal,
    dash: dash_internal,
    endTurn: endTurn_internal, // ensure this points to the new async function
    move: move_internal // already async
};