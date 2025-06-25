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

    if (playerCurrentLevelData && window.assetManager?.tilesets) {
        // Check middle layer of player's current tile for slope
        let playerTileOnMiddleRaw = playerCurrentLevelData.middle?.[originalPos.y]?.[originalPos.x];
        let playerBaseIdMiddle = (typeof playerTileOnMiddleRaw === 'object' && playerTileOnMiddleRaw !== null && playerTileOnMiddleRaw.tileId !== undefined)
            ? playerTileOnMiddleRaw.tileId
            : playerTileOnMiddleRaw;
        if (playerBaseIdMiddle && window.assetManager.tilesets[playerBaseIdMiddle]?.tags?.includes('slope')) {
            slopeDef = window.assetManager.tilesets[playerBaseIdMiddle];
        }

        // If not on middle or middle not a slope, check bottom layer of player's current tile
        if (!slopeDef) {
            let playerTileOnBottomRaw = playerCurrentLevelData.bottom?.[originalPos.y]?.[originalPos.x];
            let playerBaseIdBottom = (typeof playerTileOnBottomRaw === 'object' && playerTileOnBottomRaw !== null && playerTileOnBottomRaw.tileId !== undefined)
                ? playerTileOnBottomRaw.tileId
                : playerTileOnBottomRaw;
            if (playerBaseIdBottom && window.assetManager.tilesets[playerBaseIdBottom]?.tags?.includes('slope')) {
                slopeDef = window.assetManager.tilesets[playerBaseIdBottom];
            }
        }
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

    // If none of the above movements were successful
    logToConsole("Can't move that way (target is not walkable, slope/z-transition failed, step-up/down failed, or occupied).");
}

window.turnManager = {
    updateTurnUI: updateTurnUI_internal,
    startTurn: startTurn_internal,
    dash: dash_internal,
    endTurn: endTurn_internal, // ensure this points to the new async function
    move: move_internal // already async
};