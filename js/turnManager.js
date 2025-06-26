// js/turnManager.js

// Assumes gameState, logToConsole, window.mapRenderer, window.interaction, window.character are globally available

// Define movement costs for automatic Z-stepping
const Z_STEP_UP_COST = 2;
const Z_STEP_DOWN_COST = 1;

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

    // Check for NPC occupation at the target XY on the current Z for standard horizontal moves.
    // For Z-transitions or slope movements, NPC check will be done for the *final* destination.
    let npcBlockingHorizontalMove = false;
    if (gameState.npcs && gameState.npcs.length > 0) {
        for (const npc of gameState.npcs) {
            if (npc.mapPos && npc.mapPos.x === targetX && npc.mapPos.y === targetY && npc.mapPos.z === targetZ &&
                npc.health && npc.health.torso && npc.health.torso.current > 0) {
                // This specific log will be conditional later if slope logic bypasses this exact targetZ check
                // logToConsole(`NPC ${npc.name} is at potential horizontal target (${targetX},${targetY},${targetZ}).`);
                npcBlockingHorizontalMove = true; // Mark for now, will be used if standard horizontal move is attempted
                break;
            }
        }
    }

    // --- NEW: Slope Movement Logic ---
    const playerCurrentLevelData = currentMap.levels[originalPos.z.toString()];
    let playerIsOnSlope = null;
    let slopeDef = null;
    let playerIsOnZTransition = false; // Declare and initialize
    let zTransitionDef = null;      // Declare and initialize

    if (playerCurrentLevelData && window.assetManager?.tilesets) {
        // Check middle layer of player's current tile for slope
        let playerTileOnMiddleRaw = playerCurrentLevelData.middle?.[originalPos.y]?.[originalPos.x];
        let playerBaseIdMiddle = (typeof playerTileOnMiddleRaw === 'object' && playerTileOnMiddleRaw !== null && playerTileOnMiddleRaw.tileId !== undefined)
            ? playerTileOnMiddleRaw.tileId
            : playerTileOnMiddleRaw;

        if (playerBaseIdMiddle && window.assetManager.tilesets[playerBaseIdMiddle]) {
            const tileDef = window.assetManager.tilesets[playerBaseIdMiddle];
            if (tileDef.tags?.includes('slope')) {
                slopeDef = tileDef;
            }
            // Check if it's a z_transition tile (but not a slope, as slopes are handled separately)
            if (tileDef.tags?.includes('z_transition') && !tileDef.tags?.includes('slope')) {
                zTransitionDef = tileDef; // Player is on a non-slope z_transition tile
                playerIsOnZTransition = true;
            }
        }

        // If not on middle or not the right type, check bottom layer of player's current tile
        if (!slopeDef && !zTransitionDef) { // Only check bottom if nothing relevant found on middle
            let playerTileOnBottomRaw = playerCurrentLevelData.bottom?.[originalPos.y]?.[originalPos.x];
            let playerBaseIdBottom = (typeof playerTileOnBottomRaw === 'object' && playerTileOnBottomRaw !== null && playerTileOnBottomRaw.tileId !== undefined)
                ? playerTileOnBottomRaw.tileId
                : playerTileOnBottomRaw;

            if (playerBaseIdBottom && window.assetManager.tilesets[playerBaseIdBottom]) {
                const tileDef = window.assetManager.tilesets[playerBaseIdBottom];
                if (tileDef.tags?.includes('slope')) {
                    slopeDef = tileDef;
                }
                if (tileDef.tags?.includes('z_transition') && !tileDef.tags?.includes('slope')) {
                    zTransitionDef = tileDef;
                    playerIsOnZTransition = true;
                }
            }
        }
    }

    // Rule for z_transition tiles: Player is ON a z_transition tile
    if (playerIsOnZTransition && zTransitionDef) {
        logToConsole(`Player is on a Z-Transition tile: ${zTransitionDef.name}`);
        const cost = zTransitionDef.z_cost || 1;
        if (gameState.movementPointsRemaining < cost) {
            logToConsole("Not enough movement points for z_transition assisted move.");
            // return; // Don't return, allow to fall through to other move types if this fails
        } else {
            // Scenario 1: Transitioning to an adjacent "impassable" surface at same Z, landing on Z+1
            const targetZPlus1 = originalPos.z + 1;
            const targetTileOnCurrentZ_MiddleRaw = currentMap.levels[originalPos.z.toString()]?.middle?.[targetY]?.[targetX];
            const targetTileOnCurrentZ_BottomRaw = currentMap.levels[originalPos.z.toString()]?.bottom?.[targetY]?.[targetX];

            const effTargetMiddleCurrentZ = (typeof targetTileOnCurrentZ_MiddleRaw === 'object' && targetTileOnCurrentZ_MiddleRaw?.tileId !== undefined) ? targetTileOnCurrentZ_MiddleRaw.tileId : targetTileOnCurrentZ_MiddleRaw;
            const effTargetBottomCurrentZ = (typeof targetTileOnCurrentZ_BottomRaw === 'object' && targetTileOnCurrentZ_BottomRaw?.tileId !== undefined) ? targetTileOnCurrentZ_BottomRaw.tileId : targetTileOnCurrentZ_BottomRaw;

            const targetDefMiddleCurrentZ = assetManagerInstance.tilesets[effTargetMiddleCurrentZ];
            const targetDefBottomCurrentZ = assetManagerInstance.tilesets[effTargetBottomCurrentZ];

            let isTargetImpassableSurfaceCurrentZ = (targetDefMiddleCurrentZ?.tags?.includes('impassable') || targetDefMiddleCurrentZ?.tags?.includes('solid_terrain_top')) ||
                (targetDefBottomCurrentZ?.tags?.includes('impassable') || targetDefBottomCurrentZ?.tags?.includes('solid_terrain_top'));

            // Ensure the "impassable" surface isn't itself a z_transition that would lead elsewhere
            if (targetDefMiddleCurrentZ?.tags?.includes('z_transition') || targetDefBottomCurrentZ?.tags?.includes('z_transition')) {
                isTargetImpassableSurfaceCurrentZ = false;
            }

            if (isTargetImpassableSurfaceCurrentZ && window.mapRenderer.isWalkable(targetX, targetY, targetZPlus1)) {
                let npcAtFinalDest = gameState.npcs.some(npc => npc.mapPos?.x === targetX && npc.mapPos?.y === targetY && npc.mapPos?.z === targetZPlus1 && npc.health?.torso?.current > 0);
                if (!npcAtFinalDest) {
                    gameState.playerPos = { x: targetX, y: targetY, z: targetZPlus1 };
                    gameState.movementPointsRemaining -= cost;
                    logToConsole(`Used z_transition '${zTransitionDef.name}' to step onto surface at Z+1. Cost: ${cost} MP.`, "green");
                    if (gameState.viewFollowsPlayerZ) gameState.currentViewZ = targetZPlus1;
                    // Common post-move updates (simplified)
                    updateTurnUI_internal(); window.mapRenderer.scheduleRender(); window.interaction.detectInteractableItems(); window.interaction.showInteractableItems();
                    return; // Assisted Z-move complete
                } else {
                    logToConsole(`Cannot use z_transition to step onto surface at Z+1: Destination occupied by NPC.`);
                }
            }

            // Scenario 2: Transitioning safely downwards to an adjacent Z-1 tile
            const targetZMinus1 = originalPos.z - 1;
            if (window.mapRenderer.isWalkable(targetX, targetY, targetZMinus1)) {
                let npcAtFinalDest = gameState.npcs.some(npc => npc.mapPos?.x === targetX && npc.mapPos?.y === targetY && npc.mapPos?.z === targetZMinus1 && npc.health?.torso?.current > 0);
                if (!npcAtFinalDest) {
                    gameState.playerPos = { x: targetX, y: targetY, z: targetZMinus1 };
                    gameState.movementPointsRemaining -= cost;
                    logToConsole(`Used z_transition '${zTransitionDef.name}' to step down to Z-1. Cost: ${cost} MP.`, "purple");
                    if (gameState.viewFollowsPlayerZ) gameState.currentViewZ = targetZMinus1;
                    // Common post-move updates (simplified)
                    updateTurnUI_internal(); window.mapRenderer.scheduleRender(); window.interaction.detectInteractableItems(); window.interaction.showInteractableItems();
                    return; // Assisted Z-move complete
                } else {
                    logToConsole(`Cannot use z_transition to step down to Z-1: Destination occupied by NPC.`);
                }
            }
        }
        // If z_transition assisted move didn't happen, fall through to slope, explicit z-trans, etc.
    }


    if (slopeDef && slopeDef.target_dz !== undefined) {
        playerIsOnSlope = true;
        logToConsole(`Player is on a slope: ${slopeDef.name} with target_dz: ${slopeDef.target_dz}`);

        const adjacentTileLevelData = currentMap.levels[originalPos.z.toString()]; // Adjacent tile check is on the same Z initially
        let adjacentTileDef = null;
        if (adjacentTileLevelData && window.assetManager?.tilesets) {
            // Check middle layer of adjacent tile
            let adjTileOnMiddleRaw = adjacentTileLevelData.middle?.[targetY]?.[targetX];
            let adjBaseIdMiddle = (typeof adjTileOnMiddleRaw === 'object' && adjTileOnMiddleRaw !== null && adjTileOnMiddleRaw.tileId !== undefined)
                ? adjTileOnMiddleRaw.tileId
                : adjTileOnMiddleRaw;
            if (adjBaseIdMiddle && window.assetManager.tilesets[adjBaseIdMiddle]) {
                adjacentTileDef = window.assetManager.tilesets[adjBaseIdMiddle];
            }

            // If not on middle or middle empty, check bottom layer of adjacent tile
            if (!adjacentTileDef || !adjacentTileDef.tags?.includes('solid_terrain_top')) { // Only check bottom if middle wasn't solid_terrain_top
                let adjTileOnBottomRaw = adjacentTileLevelData.bottom?.[targetY]?.[targetX];
                let adjBaseIdBottom = (typeof adjTileOnBottomRaw === 'object' && adjTileOnBottomRaw !== null && adjTileOnBottomRaw.tileId !== undefined)
                    ? adjTileOnBottomRaw.tileId
                    : adjTileOnBottomRaw;
                if (adjBaseIdBottom && window.assetManager.tilesets[adjBaseIdBottom]) {
                    // If middle was something (but not solid_terrain_top), don't let bottom override unless bottom is solid_terrain_top
                    // If middle was empty, then bottom can define the tile.
                    if (!adjacentTileDef || (adjacentTileDef && window.assetManager.tilesets[adjBaseIdBottom].tags?.includes('solid_terrain_top'))) {
                        adjacentTileDef = window.assetManager.tilesets[adjBaseIdBottom];
                    }
                }
            }
        }

        if (adjacentTileDef && adjacentTileDef.tags?.includes('solid_terrain_top')) {
            logToConsole(`Adjacent tile (${targetX},${targetY},${originalPos.z}) is solid_terrain_top: ${adjacentTileDef.name}`);
            const cost = slopeDef.z_cost || 1; // Use slope's z_cost
            if (gameState.movementPointsRemaining < cost) {
                logToConsole("Not enough movement points for slope Z-transition.");
                return;
            }

            const finalDestZ = originalPos.z + slopeDef.target_dz;
            logToConsole(`Attempting slope movement to (${targetX},${targetY},${finalDestZ})`);

            // Simplified walkability check for the destination:
            // Check if the tile at finalDestZ is not 'impassable' on its middle layer.
            // And ensure it's generally a walkable spot (e.g. has a floor or is supported)
            let isFinalDestWalkable = false;
            const finalDestLevelData = currentMap.levels[finalDestZ.toString()];
            if (finalDestLevelData) {
                let finalDestTileOnMiddleRaw = finalDestLevelData.middle?.[targetY]?.[targetX];
                let finalDestBaseIdMiddle = (typeof finalDestTileOnMiddleRaw === 'object' && finalDestTileOnMiddleRaw !== null && finalDestTileOnMiddleRaw.tileId !== undefined)
                    ? finalDestTileOnMiddleRaw.tileId
                    : finalDestTileOnMiddleRaw;

                let isBlockedByImpassableMiddle = false;
                if (finalDestBaseIdMiddle && window.assetManager?.tilesets[finalDestBaseIdMiddle]?.tags?.includes('impassable')) {
                    isBlockedByImpassableMiddle = true;
                }

                if (!isBlockedByImpassableMiddle) {
                    // Use the more comprehensive isWalkable for the final destination.
                    // This ensures there's a floor or it's supported from below at the new Z level.
                    isFinalDestWalkable = window.mapRenderer.isWalkable(targetX, targetY, finalDestZ);
                }
            }


            if (isFinalDestWalkable) {
                let npcAtFinalDest = false;
                if (gameState.npcs && gameState.npcs.length > 0) {
                    for (const npc of gameState.npcs) {
                        if (npc.mapPos && npc.mapPos.x === targetX && npc.mapPos.y === targetY && npc.mapPos.z === finalDestZ &&
                            npc.health && npc.health.torso && npc.health.torso.current > 0) {
                            logToConsole(`Cannot use slope to (${targetX},${targetY},${finalDestZ}): Destination occupied by ${npc.name}.`);
                            npcAtFinalDest = true;
                            break;
                        }
                    }
                }

                if (!npcAtFinalDest) {
                    gameState.playerPos = { x: targetX, y: targetY, z: finalDestZ };
                    gameState.movementPointsRemaining -= cost;
                    logToConsole(`Player used slope ${slopeDef.name} to move onto ${adjacentTileDef.name}. Moved from Z=${originalPos.z} to Z=${finalDestZ}. Cost: ${cost} MP.`, "green");

                    if (gameState.viewFollowsPlayerZ) {
                        gameState.currentViewZ = finalDestZ;
                        const newPlayerZStr = finalDestZ.toString();
                        if (currentMap.dimensions) {
                            const H = currentMap.dimensions.height;
                            const W = currentMap.dimensions.width;
                            if (H > 0 && W > 0 && !gameState.fowData[newPlayerZStr]) {
                                gameState.fowData[newPlayerZStr] = Array(H).fill(null).map(() => Array(W).fill('hidden'));
                                logToConsole(`FOW data initialized for Z-level ${newPlayerZStr} after slope Z-transition.`);
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
                    return; // Slope movement action complete
                }
            } else {
                logToConsole(`Slope movement destination (${targetX},${targetY},${finalDestZ}) is not walkable or is blocked.`);
                // Do not return yet, fall through to standard z-transition/horizontal checks
            }
        }
    }
    // --- END OF NEW Slope Movement Logic ---

    // --- Existing Z-Transition Logic (Stairs, Ladders) ---
    // This logic is for explicit z-transition tiles AT the target location.
    let explicitZTransitionDef = null;
    const levelDataForExplicitZ = currentMap.levels[originalPos.z.toString()];

    if (levelDataForExplicitZ) {
        let tileOnMiddleRaw = levelDataForExplicitZ.middle?.[targetY]?.[targetX];
        let baseIdMiddle = (typeof tileOnMiddleRaw === 'object' && tileOnMiddleRaw !== null && tileOnMiddleRaw.tileId !== undefined) ? tileOnMiddleRaw.tileId : tileOnMiddleRaw;
        if (baseIdMiddle && window.assetManager?.tilesets[baseIdMiddle]?.tags?.includes('z_transition') && !window.assetManager?.tilesets[baseIdMiddle]?.tags?.includes('slope')) {
            explicitZTransitionDef = window.assetManager.tilesets[baseIdMiddle];
        }
        if (!explicitZTransitionDef) {
            let tileOnBottomRaw = levelDataForExplicitZ.bottom?.[targetY]?.[targetX];
            let baseIdBottom = (typeof tileOnBottomRaw === 'object' && tileOnBottomRaw !== null && tileOnBottomRaw.tileId !== undefined) ? tileOnBottomRaw.tileId : tileOnBottomRaw;
            if (baseIdBottom && window.assetManager?.tilesets[baseIdBottom]?.tags?.includes('z_transition') && !window.assetManager?.tilesets[baseIdBottom]?.tags?.includes('slope')) {
                explicitZTransitionDef = window.assetManager.tilesets[baseIdBottom];
            }
        }
    }

    if (explicitZTransitionDef) {
        const cost = explicitZTransitionDef.z_cost || 1;
        if (gameState.movementPointsRemaining < cost) {
            logToConsole("Not enough movement points for explicit Z-transition.");
            return;
        }
        const finalDestZ = originalPos.z + explicitZTransitionDef.target_dz;
        if (window.mapRenderer.isWalkable(targetX, targetY, finalDestZ)) {
            let npcAtFinalDest = false;
            // NPC Check for explicit Z-transition destination
            if (gameState.npcs && gameState.npcs.length > 0) {
                for (const npc of gameState.npcs) {
                    if (npc.mapPos && npc.mapPos.x === targetX && npc.mapPos.y === targetY && npc.mapPos.z === finalDestZ && npc.health?.torso?.current > 0) {
                        logToConsole(`Cannot use explicit Z-transition to (${targetX},${targetY},${finalDestZ}): Destination occupied by ${npc.name}.`);
                        npcAtFinalDest = true;
                        break;
                    }
                }
            }
            if (!npcAtFinalDest) {
                gameState.playerPos = { x: targetX, y: targetY, z: finalDestZ };
                gameState.movementPointsRemaining -= cost;
                logToConsole(`Player used explicit Z-transition: ${explicitZTransitionDef.name}. Moved from Z=${originalPos.z} to Z=${finalDestZ}. Cost: ${cost} MP.`, "cyan");
                // Common post-move updates
                if (gameState.viewFollowsPlayerZ) {
                    gameState.currentViewZ = finalDestZ;
                    const newPlayerZStr = finalDestZ.toString();
                    if (currentMap.dimensions) {
                        const H = currentMap.dimensions.height;
                        const W = currentMap.dimensions.width;
                        if (H > 0 && W > 0 && !gameState.fowData[newPlayerZStr]) {
                            gameState.fowData[newPlayerZStr] = Array(H).fill(null).map(() => Array(W).fill('hidden'));
                            logToConsole(`FOW data initialized for Z-level ${newPlayerZStr} after Z-transition.`);
                        }
                    }
                }
                if (gameState.isInCombat && gameState.combatCurrentAttacker === gameState) gameState.attackerMapPos = { ...gameState.playerPos };
                gameState.playerMovedThisTurn = true;
                updateTurnUI_internal();
                window.mapRenderer.scheduleRender();
                window.interaction.detectInteractableItems();
                window.interaction.showInteractableItems();
                return;
            }
        } else {
            logToConsole(`Explicit Z-transition '${explicitZTransitionDef.name}' destination (${targetX},${targetY},${finalDestZ}) is not walkable.`);
            // Do not return yet, allow falling through to auto step up/down or horizontal.
        }
    }

    // --- New Step-Up/Step-Down Logic ---
    const Z_STEP_UP_COST = 2; // Define cost for stepping up
    const Z_STEP_DOWN_COST = 1; // Define cost for stepping down

    // Attempt 1: Move on Current Z-Level (targetZ is originalPos.z here)
    let movedHorizontally = false;
    if (!npcBlockingHorizontalMove && window.mapRenderer.isWalkable(targetX, targetY, originalPos.z)) {
        if (!(targetX === originalPos.x && targetY === originalPos.y)) { // Ensure actual movement
            gameState.playerPos = { x: targetX, y: targetY, z: originalPos.z };
            gameState.movementPointsRemaining--; // Standard horizontal cost
            logToConsole(`Moved horizontally to (${gameState.playerPos.x}, ${gameState.playerPos.y}, Z:${gameState.playerPos.z}). Moves left: ${gameState.movementPointsRemaining}`);
            movedHorizontally = true;
        }
    }

    if (movedHorizontally) {
        // Common post-move updates
        if (gameState.isInCombat && gameState.combatCurrentAttacker === gameState) gameState.attackerMapPos = { ...gameState.playerPos };
        gameState.playerMovedThisTurn = true;
        updateTurnUI_internal();
        window.mapRenderer.scheduleRender();
        window.interaction.detectInteractableItems();
        window.interaction.showInteractableItems();
        return;
    }

    // If horizontal move on current Z didn't happen (blocked or occupied by NPC for horizontal)
    // Attempt 2: Step Up
    if (gameState.movementPointsRemaining >= Z_STEP_UP_COST) {
        const zUp = originalPos.z + 1;
        let isTargetCurrentZBlocked = !window.mapRenderer.isWalkable(targetX, targetY, originalPos.z); // Check if current Z is blocked
        // Further refine "blocked": is it a low obstacle? For now, any non-walkable tile at current Z is a candidate for stepping over.
        // This could be enhanced by checking the specific type of tile at (targetX, targetY, originalPos.z)

        if (isTargetCurrentZBlocked && window.mapRenderer.isWalkable(targetX, targetY, zUp)) {
            let npcAtStepUpDest = false;
            if (gameState.npcs && gameState.npcs.length > 0) {
                for (const npc of gameState.npcs) {
                    if (npc.mapPos && npc.mapPos.x === targetX && npc.mapPos.y === targetY && npc.mapPos.z === zUp && npc.health?.torso?.current > 0) {
                        npcAtStepUpDest = true; break;
                    }
                }
            }
            if (!npcAtStepUpDest) {
                gameState.playerPos = { x: targetX, y: targetY, z: zUp };
                gameState.movementPointsRemaining -= Z_STEP_UP_COST;
                logToConsole(`Stepped UP to (${targetX},${targetY},${zUp}). Cost: ${Z_STEP_UP_COST} MP.`, "blue");
                // Common post-move updates
                if (gameState.viewFollowsPlayerZ) {
                    gameState.currentViewZ = zUp;
                    const newPlayerZStr = zUp.toString();
                    if (currentMap.dimensions) {
                        const H = currentMap.dimensions.height;
                        const W = currentMap.dimensions.width;
                        if (H > 0 && W > 0 && !gameState.fowData[newPlayerZStr]) {
                            gameState.fowData[newPlayerZStr] = Array(H).fill(null).map(() => Array(W).fill('hidden'));
                            logToConsole(`FOW data initialized for Z-level ${newPlayerZStr} after step-up.`);
                        }
                    }
                }
                if (gameState.isInCombat && gameState.combatCurrentAttacker === gameState) gameState.attackerMapPos = { ...gameState.playerPos };
                gameState.playerMovedThisTurn = true;
                updateTurnUI_internal();
                window.mapRenderer.scheduleRender();
                window.interaction.detectInteractableItems();
                window.interaction.showInteractableItems();
                return;
            }
        }
    }

    // Attempt 3: Step Down
    if (gameState.movementPointsRemaining >= Z_STEP_DOWN_COST) {
        const zDown = originalPos.z - 1;
        // Condition for stepping down: current Z is "empty" or "void-like"
        // This can be inferred if (targetX, targetY, originalPos.z) is NOT walkable,
        // AND there isn't a high wall/solid_terrain_top preventing downward view/movement.
        // For simplicity, we'll use !isWalkable for current Z again.
        // A more precise check might involve looking at tile tags at (targetX, targetY, originalPos.z) for 'transparent_floor' or similar.
        let isTargetCurrentZEmptyOrVoid = !window.mapRenderer.isWalkable(targetX, targetY, originalPos.z);


        if (isTargetCurrentZEmptyOrVoid && window.mapRenderer.isWalkable(targetX, targetY, zDown)) {
            let npcAtStepDownDest = false;
            if (gameState.npcs && gameState.npcs.length > 0) {
                for (const npc of gameState.npcs) {
                    if (npc.mapPos && npc.mapPos.x === targetX && npc.mapPos.y === targetY && npc.mapPos.z === zDown && npc.health?.torso?.current > 0) {
                        npcAtStepDownDest = true; break;
                    }
                }
            }
            if (!npcAtStepDownDest) {
                gameState.playerPos = { x: targetX, y: targetY, z: zDown };
                gameState.movementPointsRemaining -= Z_STEP_DOWN_COST;
                logToConsole(`Stepped DOWN to (${targetX},${targetY},${zDown}). Cost: ${Z_STEP_DOWN_COST} MP.`, "purple");
                // Common post-move updates
                if (gameState.viewFollowsPlayerZ) {
                    gameState.currentViewZ = zDown;
                    const newPlayerZStr = zDown.toString();
                    if (currentMap.dimensions) {
                        const H = currentMap.dimensions.height;
                        const W = currentMap.dimensions.width;
                        if (H > 0 && W > 0 && !gameState.fowData[newPlayerZStr]) {
                            gameState.fowData[newPlayerZStr] = Array(H).fill(null).map(() => Array(W).fill('hidden'));
                            logToConsole(`FOW data initialized for Z-level ${newPlayerZStr} after step-down.`);
                        }
                    }
                }
                if (gameState.isInCombat && gameState.combatCurrentAttacker === gameState) gameState.attackerMapPos = { ...gameState.playerPos };
                gameState.playerMovedThisTurn = true;
                updateTurnUI_internal();
                window.mapRenderer.scheduleRender();
                window.interaction.detectInteractableItems();
                window.interaction.showInteractableItems();
                return;
            }
        }
    }

    // If none of the above movements were successful (horizontal, slope, explicit z-trans, step-up, step-down)
    // This implies the player is trying to move to (targetX, targetY) at originalPos.z,
    // but that spot is not directly walkable via the preceding specialized movements.

    // First, explicitly check if the target (targetX, targetY, originalPos.z) is walkable.
    // If it IS walkable, but we reached here, it means it was blocked by an NPC earlier,
    // or some other specific movement logic prevented it. No fall should occur.
    if (window.mapRenderer.isWalkable(targetX, targetY, originalPos.z)) {
        logToConsole(`Cannot move to (${targetX},${targetY}, Z:${originalPos.z}): Path blocked by NPC or other reason (tile itself is walkable).`);
        return;
    }

    // If target (targetX, targetY, originalPos.z) is NOT walkable, determine if it's a solid obstacle or empty air.
    let isSolidObstacle = false;
    const targetLevelData = currentMap.levels[originalPos.z.toString()];
    if (targetLevelData && window.assetManager?.tilesets) {
        const tileOnMiddleRaw = targetLevelData.middle?.[targetY]?.[targetX];
        const effMid = (typeof tileOnMiddleRaw === 'object' && tileOnMiddleRaw !== null && tileOnMiddleRaw.tileId !== undefined) ? tileOnMiddleRaw.tileId : tileOnMiddleRaw;
        const tileDefMiddle = window.assetManager.tilesets[effMid];

        if (tileDefMiddle && (tileDefMiddle.tags?.includes("impassable") || tileDefMiddle.tags?.includes("solid_terrain_top")) &&
            !tileDefMiddle.tags?.includes("z_transition") && !tileDefMiddle.tags?.includes("walkable_on_z")) {
            // Consider it a solid obstacle if it's impassable or solid_terrain_top, AND not a special passable type.
            isSolidObstacle = true;
            logToConsole(`Target (${targetX},${targetY},Z:${originalPos.z}) blocked by solid obstacle on middle layer: ${effMid}`);
        }

        if (!isSolidObstacle) {
            const tileOnBottomRaw = targetLevelData.bottom?.[targetY]?.[targetX];
            const effBot = (typeof tileOnBottomRaw === 'object' && tileOnBottomRaw !== null && tileOnBottomRaw.tileId !== undefined) ? tileOnBottomRaw.tileId : tileOnBottomRaw;
            const tileDefBottom = window.assetManager.tilesets[effBot];

            if (tileDefBottom) {
                logToConsole(`[TurnManager-ObstacleCheck-Bottom] Tile: ${effBot}, Tags: ${JSON.stringify(tileDefBottom.tags)}`);
                const hasImpassable = tileDefBottom.tags?.includes("impassable");
                const isZTransition = tileDefBottom.tags?.includes("z_transition");
                logToConsole(`[TurnManager-ObstacleCheck-Bottom] HasImpassable: ${hasImpassable}, IsZTransition: ${isZTransition}`);

                if (hasImpassable && !isZTransition) {
                    isSolidObstacle = true;
                    logToConsole(`Target (${targetX},${targetY},Z:${originalPos.z}) blocked by IMPASSABLE tile on bottom layer: ${effBot}`);
                }
            } else {
                logToConsole(`[TurnManager-ObstacleCheck-Bottom] No tile definition for '${effBot}'`);
            }
        }
    } else if (!targetLevelData) {
        // No data for target Z level at all, implies it's empty air (or beyond map bounds, already checked).
        // isWalkable would have returned based on supportedFromBelow if this was the case.
        // This path here means isWalkable returned false for originalPos.z for *some other reason* if targetLevelData is null.
        // For safety, assume it might be a void if no level data.
        logToConsole(`Target (${targetX},${targetY},Z:${originalPos.z}) has no level data. Considering for fall check (though isWalkable should have handled this scenario if it was truly empty & supported).`);
    }

    if (isSolidObstacle) {
        logToConsole("Can't move that way (blocked by solid obstacle).");
        return;
    } else {
        // If it's not a solid obstacle at originalPos.z, and also not walkable at originalPos.z,
        // then it's likely empty air. Initiate fall check.
        logToConsole(`Target tile (${targetX},${targetY},Z:${originalPos.z}) is not walkable and not a solid obstacle. Initiating fall check.`);
        let fallCheckInitiated = false;
        if (typeof window.initiateFallCheck === 'function') {
            fallCheckInitiated = window.initiateFallCheck(gameState, targetX, targetY, originalPos.z);
        } else {
            logToConsole(`[TURN_MANAGER_CRITICAL] window.initiateFallCheck is NOT a function. Cannot process fall.`, "error");
        }

        if (fallCheckInitiated) {
            if (gameState.movementPointsRemaining > 0) {
                gameState.movementPointsRemaining--;
            } else {
                logToConsole("Stepped into void but had 0 MP. Fall processed, no additional MP cost.", "orange");
            }
            updateTurnUI_internal();
            if (gameState.isInCombat && gameState.combatCurrentAttacker === gameState) {
                gameState.attackerMapPos = { ...gameState.playerPos };
            }
            gameState.playerMovedThisTurn = true;
            return;
        } else {
            logToConsole("Can't move that way (fall check determined no fall or error in fall logic).");
        }
    }
}

window.turnManager = {
    updateTurnUI: updateTurnUI_internal,
    startTurn: startTurn_internal,
    dash: dash_internal,
    endTurn: endTurn_internal, // ensure this points to the new async function
    move: move_internal // already async
};