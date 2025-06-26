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

    // Helper function to determine if a tile at (x, y, z) is strictly impassable due to its own layers.
    // This does not consider if the tile is "walkable" due to support from below, etc.
    // It's about whether the tile *itself* at (x,y,z) presents an impassable barrier.
    function isTileStrictlyImpassable(checkX, checkY, checkZ) {
        const levelData = currentMap.levels[checkZ.toString()];
        if (!levelData || !localAssetManager?.tilesets) {
            // logToConsole(`isTileStrictlyImpassable: No level data or assets for Z:${checkZ}. Assuming not strictly impassable.`);
            return { impassable: false, name: "Unknown (No level data)" };
        }

        const tilesets = localAssetManager.tilesets;

        // Check middle layer
        const midTileRaw = levelData.middle?.[checkY]?.[checkX];
        const midEffId = (typeof midTileRaw === 'object' && midTileRaw?.tileId !== undefined) ? midTileRaw.tileId : midTileRaw;
        if (midEffId && tilesets[midEffId]) {
            const midDef = tilesets[midEffId];
            if (midDef.tags && midDef.tags.includes("impassable")) {
                // logToConsole(`isTileStrictlyImpassable: Middle layer ${midEffId} at (${checkX},${checkY},${checkZ}) is impassable.`);
                return { impassable: true, name: midDef.name || midEffId };
            }
        }

        // Check bottom layer
        const botTileRaw = levelData.bottom?.[checkY]?.[checkX];
        const botEffId = (typeof botTileRaw === 'object' && botTileRaw?.tileId !== undefined) ? botTileRaw.tileId : botTileRaw;
        if (botEffId && tilesets[botEffId]) {
            const botDef = tilesets[botEffId];
            if (botDef.tags && botDef.tags.includes("impassable")) {
                // logToConsole(`isTileStrictlyImpassable: Bottom layer ${botEffId} at (${checkX},${checkY},${checkZ}) is impassable.`);
                return { impassable: true, name: botDef.name || botEffId };
            }
        }
        // logToConsole(`isTileStrictlyImpassable: No impassable layers found at (${checkX},${checkY},${checkZ}).`);
        return { impassable: false, name: "Passable layers" };
    }


    if (!currentMap || !currentMap.dimensions) {
        logToConsole("Cannot move: Map data not loaded.");
        return;
    }
    const width = currentMap.dimensions.width;
    const height = currentMap.dimensions.height;
    const originalPos = { ...gameState.playerPos };
    let targetX = originalPos.x;
    let targetY = originalPos.y;
    // targetZ will be determined by movement type, defaults to originalPos.z for horizontal

    switch (direction) {
        case 'up': case 'w': case 'ArrowUp': targetY--; break;
        case 'down': case 's': case 'ArrowDown': targetY++; break;
        case 'left': case 'a': case 'ArrowLeft': targetX--; break;
        case 'right': case 'd': case 'ArrowRight': targetX++; break;
        default: return; // Unknown direction
    }

    // Boundary checks
    if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) {
        logToConsole("Can't move that way (map boundary).");
        return;
    }

    // --- Determine Player's Current Tile Properties ---
    const playerCurrentLevelData = currentMap.levels[originalPos.z.toString()];
    let playerIsOnZTransition = false;
    let zTransitionDef = null; // Definition of the z_transition tile player is ON (this will include slopes)

    if (playerCurrentLevelData && localAssetManager?.tilesets) {
        const checkTileForZTransition = (tileId) => {
            if (tileId && localAssetManager.tilesets[tileId]) {
                const def = localAssetManager.tilesets[tileId];
                if (def.tags && def.tags.includes('z_transition')) { // Slopes are z_transitions
                    playerIsOnZTransition = true;
                    zTransitionDef = def;
                }
            }
        };
        // Check middle layer first
        let playerTileOnMiddleRaw = playerCurrentLevelData.middle?.[originalPos.y]?.[originalPos.x];
        let playerBaseIdMiddle = (typeof playerTileOnMiddleRaw === 'object' && playerTileOnMiddleRaw?.tileId !== undefined) ? playerTileOnMiddleRaw.tileId : playerTileOnMiddleRaw;
        checkTileForZTransition(playerBaseIdMiddle);

        // If not found on middle, check bottom layer
        if (!playerIsOnZTransition) {
            let playerTileOnBottomRaw = playerCurrentLevelData.bottom?.[originalPos.y]?.[originalPos.x];
            let playerBaseIdBottom = (typeof playerTileOnBottomRaw === 'object' && playerTileOnBottomRaw?.tileId !== undefined) ? playerTileOnBottomRaw.tileId : playerTileOnBottomRaw;
            checkTileForZTransition(playerBaseIdBottom);
        }
    }

    // --- Movement Logic Order ---
    // 1. Z-Transition (Player is ON a z_transition tile - includes slopes)
    // 2. Explicit Z-Transition (Player is moving INTO a z_transition tile)
    // 3. Standard Horizontal Movement
    // 4. Fall Check (if none of the above and target is not strictly impassable)

    // 1. Z-Transition (Player is ON a z_transition tile - includes slopes)
    if (playerIsOnZTransition && zTransitionDef) {
        logToConsole(`Player is on Z-Transition Tile (or Slope): '${zTransitionDef.name}'. Attempting Z-move.`);
        const cost = zTransitionDef.z_cost || 1;
        let moveSuccessful = false;

        if (gameState.movementPointsRemaining >= cost) {
            if (zTransitionDef.tags?.includes('slope') && zTransitionDef.target_dz !== undefined) {
                // Slope-specific logic (stepping onto adjacent solid_terrain_top)
                const finalDestZSlope = originalPos.z + zTransitionDef.target_dz;
                const adjLevelDataSlope = currentMap.levels[originalPos.z.toString()];
                let adjTileDefSlope = null;
                if (adjLevelDataSlope) {
                    const midRawSlope = adjLevelDataSlope.middle?.[targetY]?.[targetX];
                    const midIdSlope = (typeof midRawSlope === 'object' && midRawSlope?.tileId !== undefined) ? midRawSlope.tileId : midRawSlope;
                    if (midIdSlope && localAssetManager.tilesets[midIdSlope]?.tags?.includes('solid_terrain_top')) {
                        adjTileDefSlope = localAssetManager.tilesets[midIdSlope];
                    } else {
                        const botRawSlope = adjLevelDataSlope.bottom?.[targetY]?.[targetX];
                        const botIdSlope = (typeof botRawSlope === 'object' && botRawSlope?.tileId !== undefined) ? botRawSlope.tileId : botRawSlope;
                        if (botIdSlope && localAssetManager.tilesets[botIdSlope]?.tags?.includes('solid_terrain_top')) {
                            adjTileDefSlope = localAssetManager.tilesets[botIdSlope];
                        }
                    }
                }

                if (adjTileDefSlope && window.mapRenderer.isWalkable(targetX, targetY, finalDestZSlope)) {
                    let npcAtDest = gameState.npcs.some(npc => npc.mapPos?.x === targetX && npc.mapPos?.y === targetY && npc.mapPos?.z === finalDestZSlope && npc.health?.torso?.current > 0);
                    if (!npcAtDest) {
                        gameState.playerPos = { x: targetX, y: targetY, z: finalDestZSlope };
                        gameState.movementPointsRemaining -= cost;
                        logToConsole(`Used slope '${zTransitionDef.name}' to move onto '${adjTileDefSlope.name}'. New Z: ${finalDestZSlope}. Cost: ${cost} MP.`, "green");
                        moveSuccessful = true;
                    } else {
                        logToConsole(`Cannot use slope: Destination (${targetX},${targetY},${finalDestZSlope}) occupied by NPC.`);
                    }
                } else {
                    logToConsole(`Slope move failed: Adjacent tile not solid_terrain_top or destination Z=${finalDestZSlope} not walkable.`);
                }
            }

            if (!moveSuccessful) { // General Z-Transition (non-slope, or slope failed)
                // Try Moving Up (standard z-transition step-up)
                const targetZUp = originalPos.z + 1;
                const targetTileAtCurrentZImpassableInfo = isTileStrictlyImpassable(targetX, targetY, originalPos.z);
                const isTargetTileAtCurrentZImpassable = targetTileAtCurrentZImpassableInfo.impassable;

                if (isTargetTileAtCurrentZImpassable &&
                    window.mapRenderer.isTileEmpty(originalPos.x, originalPos.y, targetZUp) && // Headroom
                    window.mapRenderer.isWalkable(targetX, targetY, targetZUp)) { // Landing spot

                    let npcAtDest = gameState.npcs.some(npc => npc.mapPos?.x === targetX && npc.mapPos?.y === targetY && npc.mapPos?.z === targetZUp && npc.health?.torso?.current > 0);
                    if (!npcAtDest) {
                        gameState.playerPos = { x: targetX, y: targetY, z: targetZUp };
                        gameState.movementPointsRemaining -= cost;
                        logToConsole(`Used z_transition '${zTransitionDef.name}' to step UP onto '${targetTileAtCurrentZImpassableInfo.name}' at Z+1. Cost: ${cost} MP.`, "green");
                        moveSuccessful = true;
                    } else {
                        logToConsole(`Cannot step UP via z_transition: Destination (${targetX},${targetY},${targetZUp}) occupied by NPC.`);
                    }
                }
            }

            if (!moveSuccessful) { // Try Moving Down
                const targetZDown = originalPos.z - 1;
                if (window.mapRenderer.isTileEmpty(targetX, targetY, originalPos.z) && // Space to step into at current Z
                    window.mapRenderer.isWalkable(targetX, targetY, targetZDown)) { // Landing spot

                    let npcAtDest = gameState.npcs.some(npc => npc.mapPos?.x === targetX && npc.mapPos?.y === targetY && npc.mapPos?.z === targetZDown && npc.health?.torso?.current > 0);
                    if (!npcAtDest) {
                        gameState.playerPos = { x: targetX, y: targetY, z: targetZDown };
                        gameState.movementPointsRemaining -= cost;
                        logToConsole(`Used z_transition '${zTransitionDef.name}' to step DOWN to Z-1. Cost: ${cost} MP.`, "purple");
                        moveSuccessful = true;
                    } else {
                        logToConsole(`Cannot step DOWN via z_transition: Destination (${targetX},${targetY},${targetZDown}) occupied by NPC.`);
                    }
                }
            }
            if (moveSuccessful) {
                if (gameState.viewFollowsPlayerZ) gameState.currentViewZ = gameState.playerPos.z;
                updateTurnUI_internal(); window.mapRenderer.scheduleRender(); window.interaction.detectInteractableItems(); window.interaction.showInteractableItems();
                return;
            } else {
                logToConsole(`Z-Transition/Slope ON tile: Conditions for any Z-move not met or failed.`);
            }
        } else {
            logToConsole("Not enough MP for z_transition/slope assisted move.");
        }
    }


    // 2. Explicit Z-Transition (Player is moving INTO a z_transition tile like stairs/ladder)
    // This tile is at (targetX, targetY, originalPos.z)
    let explicitZTransDefAtTarget = null;
    const targetLevelDataForExplicitZ = currentMap.levels[originalPos.z.toString()];
    if (targetLevelDataForExplicitZ) {
        const checkTileForExplicitZ = (tileId) => {
            if (tileId && localAssetManager.tilesets[tileId]) {
                const def = localAssetManager.tilesets[tileId];
                if (def.tags?.includes('z_transition') && !def.tags?.includes('slope')) { // Ensure it's not a slope
                    return def;
                }
            }
            return null;
        };
        const midRaw = targetLevelDataForExplicitZ.middle?.[targetY]?.[targetX];
        const midId = (typeof midRaw === 'object' && midRaw?.tileId !== undefined) ? midRaw.tileId : midRaw;
        explicitZTransDefAtTarget = checkTileForExplicitZ(midId);
        if (!explicitZTransDefAtTarget) {
            const botRaw = targetLevelDataForExplicitZ.bottom?.[targetY]?.[targetX];
            const botId = (typeof botRaw === 'object' && botRaw?.tileId !== undefined) ? botRaw.tileId : botRaw;
            explicitZTransDefAtTarget = checkTileForExplicitZ(botId);
        }
    }

    if (explicitZTransDefAtTarget) {
        logToConsole(`Target tile (${targetX},${targetY},${originalPos.z}) is an Explicit Z-Transition: '${explicitZTransDefAtTarget.name}'.`);
        const cost = explicitZTransDefAtTarget.z_cost || 1;
        if (gameState.movementPointsRemaining < cost) {
            logToConsole("Not enough MP for explicit Z-transition.");
        } else {
            const finalDestZ = originalPos.z + explicitZTransDefAtTarget.target_dz;
            if (window.mapRenderer.isWalkable(targetX, targetY, finalDestZ)) {
                let npcAtDest = gameState.npcs.some(npc => npc.mapPos?.x === targetX && npc.mapPos?.y === targetY && npc.mapPos?.z === finalDestZ && npc.health?.torso?.current > 0);
                if (!npcAtDest) {
                    gameState.playerPos = { x: targetX, y: targetY, z: finalDestZ };
                    gameState.movementPointsRemaining -= cost;
                    logToConsole(`Used explicit Z-transition '${explicitZTransDefAtTarget.name}'. New Z: ${finalDestZ}. Cost: ${cost} MP.`, "cyan");
                    if (gameState.viewFollowsPlayerZ) gameState.currentViewZ = finalDestZ;
                    updateTurnUI_internal(); window.mapRenderer.scheduleRender(); window.interaction.detectInteractableItems(); window.interaction.showInteractableItems();
                    return;
                } else {
                    logToConsole(`Cannot use explicit Z-transition: Destination (${targetX},${targetY},${finalDestZ}) occupied by NPC.`);
                }
            } else {
                logToConsole(`Explicit Z-transition destination (${targetX},${targetY},${finalDestZ}) is not walkable.`);
            }
        }
    }

    // 4. Standard Horizontal Movement
    // Check if target tile at current Z is strictly impassable
    const targetStrictlyImpassableInfo = isTileStrictlyImpassable(targetX, targetY, originalPos.z);
    if (targetStrictlyImpassableInfo.impassable) {
        logToConsole(`Movement blocked by '${targetStrictlyImpassableInfo.name}' at (${targetX},${targetY},${originalPos.z}).`);
        return; // Player bumps into impassable, no further checks.
    }

    // Check NPC occupation at the target (targetX, targetY, originalPos.z)
    let npcAtHorizontalTarget = gameState.npcs.some(npc => npc.mapPos?.x === targetX && npc.mapPos?.y === targetY && npc.mapPos?.z === originalPos.z && npc.health?.torso?.current > 0);
    if (npcAtHorizontalTarget) {
        logToConsole(`Cannot move horizontally to (${targetX},${targetY},${originalPos.z}): Occupied by NPC.`);
        // Do not return yet, might still fall if the tile below NPC is not walkable for player
    }

    if (!npcAtHorizontalTarget && window.mapRenderer.isWalkable(targetX, targetY, originalPos.z)) {
        if (!(targetX === originalPos.x && targetY === originalPos.y)) { // Ensure actual movement
            gameState.playerPos = { x: targetX, y: targetY, z: originalPos.z };
            gameState.movementPointsRemaining--;
            logToConsole(`Moved horizontally to (${gameState.playerPos.x},${gameState.playerPos.y},Z:${gameState.playerPos.z}). Cost: 1 MP.`);
            updateTurnUI_internal(); window.mapRenderer.scheduleRender(); window.interaction.detectInteractableItems(); window.interaction.showInteractableItems();
            return;
        }
    }

    // 5. Fall Check
    // If we reach here, it means:
    // - No Z-transition or slope movement occurred.
    // - The target tile (targetX, targetY, originalPos.z) was NOT strictly impassable (e.g., not a wall).
    // - The target tile (targetX, targetY, originalPos.z) was either:
    //   a) Occupied by an NPC (if so, fall check might still be relevant if player *could* enter the space if NPC wasn't there and it was a hole)
    //   b) Not walkable for other reasons (e.g., empty air, a pit).

    // A fall check should only occur if the target tile (targetX, targetY, originalPos.z) is NOT walkable
    // AND it was NOT strictly impassable.
    if (!window.mapRenderer.isWalkable(targetX, targetY, originalPos.z) && !targetStrictlyImpassableInfo.impassable) {
        logToConsole(`Target (${targetX},${targetY},Z:${originalPos.z}) is not walkable and not strictly impassable. Initiating fall check.`);
        if (typeof window.initiateFallCheck === 'function') {
            window.initiateFallCheck(gameState, targetX, targetY, originalPos.z);
            // Post-fall updates (like UI, render) are handled within initiateFallCheck/handleFalling
        } else {
            logToConsole(`[TURN_MANAGER_CRITICAL] window.initiateFallCheck is NOT a function. Cannot process fall.`, "error");
        }
        return; // Fall check is the final action for this move attempt.
    }

    // If none of the above, it means the target was walkable but NPC blocked, or some other edge case.
    if (!targetStrictlyImpassableInfo.impassable && npcAtHorizontalTarget) {
        // Already logged NPC block
    } else if (!targetStrictlyImpassableInfo.impassable && !window.mapRenderer.isWalkable(targetX, targetY, originalPos.z)) {
        // This case should have been caught by fall check logic if not strictly impassable.
        // This might indicate an issue in fall check condition or isWalkable.
        logToConsole(`Could not move to (${targetX},${targetY},${originalPos.z}). Tile is not strictly impassable, but also not walkable, and fall check did not occur. Review logic.`, "orange");
    } else {
        // Default "cannot move" if no specific reason logged yet.
        logToConsole(`Cannot move to (${targetX},${targetY},${originalPos.z}). Reason unclear or already logged.`);
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