// js/movementUtils.js

// This file will contain shared movement logic for players and NPCs.

// Dependencies that will be needed (either passed in or accessed globally)
// - gameState
// - window.mapRenderer
// - localAssetManager (from turnManager, or a global assetManagerInstance)
// - window.interaction (for player-specific updates)
// - logToConsole
// - window.initiateFallCheck (from character.js)
// - updateTurnUI_internal (if called directly, or manage MP within this function)

/**
 * Attempts to move a character (player or NPC) in a given direction,
 * handling Z-level transitions, falls, and other movement complexities.
 *
 * @param {object} character - The character object (gameState for player, or NPC object).
 * @param {string} direction - The direction of movement (e.g., 'up', 'down', 'left', 'right').
 * @param {object} assetManagerInstance - Instance of the asset manager.
 * @returns {boolean} True if a move (including starting a fall) was made, false otherwise.
 */
async function attemptCharacterMove(character, direction, assetManagerInstance) {
    const isPlayer = (character === window.gameState);
    const logPrefix = isPlayer ? "[PlayerMovement]" : `[NPCMovement ${character.id || 'UnknownNPC'}]`;

    if (isPlayer && window.gameState.isActionMenuActive) {
        logToConsole(`${logPrefix} Cannot move: Action menu active.`, "orange");
        return false;
    }

    if (window.animationManager && window.animationManager.isAnimationPlaying()) {
        logToConsole(`${logPrefix} Cannot move: Animation playing.`, "orange");
        return false;
    }

    let movementPointsOwner = isPlayer ? window.gameState : character;
    if (movementPointsOwner.movementPointsRemaining <= 0 && isPlayer) { // NPCs might have different MP system
        logToConsole(`${logPrefix} No movement points remaining.`);
        return false;
    }
    if (!isPlayer && movementPointsOwner.currentMovementPoints <= 0) {
        logToConsole(`${logPrefix} No movement points remaining.`);
        return false;
    }


    const currentMap = window.mapRenderer.getCurrentMapData();
    if (!currentMap || !currentMap.dimensions || !currentMap.levels) {
        logToConsole(`${logPrefix} Cannot move: Map data not loaded or invalid.`);
        return false;
    }

    const tilesets = assetManagerInstance ? assetManagerInstance.tilesets : null;
    if (!tilesets) {
        logToConsole(`${logPrefix} Cannot move: Tilesets not available via assetManagerInstance.`);
        return false;
    }

    const localAssetManager = assetManagerInstance; // Alias for consistency with original turnManager code

    // Helper function to determine if a tile at (x, y, z) is strictly impassable due to its own layers.
    // This is copied from turnManager.js and adapted to use the passed assetManagerInstance.
    function isTileStrictlyImpassable(checkX, checkY, checkZ) {
        const levelData = currentMap.levels[checkZ.toString()];
        if (!levelData) {
            return { impassable: false, name: "Unknown (No level data for Z)" };
        }

        // Check middle layer
        const midTileRaw = levelData.middle?.[checkY]?.[checkX];
        const midEffId = (typeof midTileRaw === 'object' && midTileRaw?.tileId !== undefined) ? midTileRaw.tileId : midTileRaw;
        if (midEffId && tilesets[midEffId]) {
            const midDef = tilesets[midEffId];
            if (midDef.tags && midDef.tags.includes("impassable")) {
                return { impassable: true, name: midDef.name || midEffId };
            }
        }

        // Check bottom layer
        const botTileRaw = levelData.bottom?.[checkY]?.[checkX];
        const botEffId = (typeof botTileRaw === 'object' && botTileRaw?.tileId !== undefined) ? botTileRaw.tileId : botTileRaw;
        if (botEffId && tilesets[botEffId]) {
            const botDef = tilesets[botEffId];
            if (botDef.tags && botDef.tags.includes("impassable")) {
                return { impassable: true, name: botDef.name || botEffId };
            }
        }
        return { impassable: false, name: "Passable layers" };
    }


    const width = currentMap.dimensions.width;
    const height = currentMap.dimensions.height;
    const originalPos = isPlayer ? { ...window.gameState.playerPos } : { ...character.mapPos };
    let targetX = originalPos.x;
    let targetY = originalPos.y;

    switch (direction) {
        case 'up': case 'w': case 'ArrowUp': targetY--; break;
        case 'down': case 's': case 'ArrowDown': targetY++; break;
        case 'left': case 'a': case 'ArrowLeft': targetX--; break;
        case 'right': case 'd': case 'ArrowRight': targetX++; break;
        default:
            logToConsole(`${logPrefix} Unknown move direction: ${direction}`);
            return false;
    }

    if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) {
        logToConsole(`${logPrefix} Can't move that way (map boundary).`);
        return false;
    }

    // --- Determine Character's Current Tile Properties ---
    const charCurrentLevelData = currentMap.levels[originalPos.z.toString()];
    let charIsOnZTransition = false;
    let zTransitionDef = null;

    if (charCurrentLevelData && localAssetManager?.tilesets) {
        const checkTileForZTransition = (tileId) => {
            if (tileId && localAssetManager.tilesets[tileId]) {
                const def = localAssetManager.tilesets[tileId];
                if (def.tags && def.tags.includes('z_transition')) {
                    charIsOnZTransition = true;
                    zTransitionDef = def;
                }
            }
        };
        let charTileOnMiddleRaw = charCurrentLevelData.middle?.[originalPos.y]?.[originalPos.x];
        let charBaseIdMiddle = (typeof charTileOnMiddleRaw === 'object' && charTileOnMiddleRaw?.tileId !== undefined) ? charTileOnMiddleRaw.tileId : charTileOnMiddleRaw;
        checkTileForZTransition(charBaseIdMiddle);

        if (!charIsOnZTransition) {
            let charTileOnBottomRaw = charCurrentLevelData.bottom?.[originalPos.y]?.[originalPos.x];
            let charBaseIdBottom = (typeof charTileOnBottomRaw === 'object' && charTileOnBottomRaw?.tileId !== undefined) ? charTileOnBottomRaw.tileId : charTileOnBottomRaw;
            checkTileForZTransition(charBaseIdBottom);
        }
    }

    let moveSuccessful = false; // Flag to track if any kind of position change or fall occurred

    // --- Movement Logic Order ---
    // 1. Z-Transition (Character is ON a z_transition tile - includes slopes)
    if (charIsOnZTransition && zTransitionDef) {
        logToConsole(`${logPrefix} Character is on Z-Transition Tile (or Slope): '${zTransitionDef.name}'. Attempting Z-move.`);
        const cost = zTransitionDef.z_cost || 1;
        let currentMP = isPlayer ? window.gameState.movementPointsRemaining : character.currentMovementPoints;

        if (currentMP >= cost) {
            if (zTransitionDef.tags?.includes('slope') && zTransitionDef.target_dz !== undefined) {
                const finalDestZSlope = originalPos.z + zTransitionDef.target_dz;
                // Check if the target tile (targetX, targetY) at originalPos.z is a solid_terrain_top,
                // as slopes typically lead onto the top of an adjacent solid block.
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

                // The destination for a slope move is (targetX, targetY) at finalDestZSlope.
                // isWalkable should check if (targetX, targetY, finalDestZSlope) is a valid standing spot.
                if (adjTileDefSlope && window.mapRenderer.isWalkable(targetX, targetY, finalDestZSlope)) {
                    let npcAtDest = false;
                    if (isPlayer) { // Player checking against NPCs
                        npcAtDest = window.gameState.npcs.some(npc => npc.mapPos?.x === targetX && npc.mapPos?.y === targetY && npc.mapPos?.z === finalDestZSlope && npc.health?.torso?.current > 0);
                    } else { // NPC checking against player and other NPCs
                        if (window.gameState.playerPos.x === targetX && window.gameState.playerPos.y === targetY && window.gameState.playerPos.z === finalDestZSlope) npcAtDest = true;
                        if (!npcAtDest) npcAtDest = window.gameState.npcs.some(otherNpc => otherNpc !== character && otherNpc.mapPos?.x === targetX && otherNpc.mapPos?.y === targetY && otherNpc.mapPos?.z === finalDestZSlope && otherNpc.health?.torso?.current > 0);
                    }

                    if (!npcAtDest) {
                        if (isPlayer) {
                            window.gameState.playerPos = { x: targetX, y: targetY, z: finalDestZSlope };
                            window.gameState.movementPointsRemaining -= cost;
                        } else {
                            character.mapPos = { x: targetX, y: targetY, z: finalDestZSlope };
                            character.currentMovementPoints -= cost;
                        }
                        logToConsole(`${logPrefix} Used slope '${zTransitionDef.name}' to move onto '${adjTileDefSlope.name}'. New Z: ${finalDestZSlope}. Cost: ${cost} MP.`, "green");
                        moveSuccessful = true;
                    } else {
                        logToConsole(`${logPrefix} Cannot use slope: Destination (${targetX},${targetY},${finalDestZSlope}) occupied.`);
                    }
                } else {
                    logToConsole(`${logPrefix} Slope move failed: Adjacent tile (${targetX},${targetY},${originalPos.z}) not solid_terrain_top or destination Z=${finalDestZSlope} not walkable.`);
                }
            }

            // General Z-Transition (non-slope, or slope failed and trying alternatives)
            if (!moveSuccessful) {
                // Try Moving Up (standard z-transition step-up)
                const targetZUp = originalPos.z + 1;
                // Check if the tile at (targetX, targetY, originalPos.z) is impassable (e.g., a wall to step onto)
                const targetTileAtCurrentZImpassableInfo = isTileStrictlyImpassable(targetX, targetY, originalPos.z);
                const isTargetTileAtCurrentZImpassable = targetTileAtCurrentZImpassableInfo.impassable;

                // Character needs headroom at their current X,Y but at targetZUp
                // And the landing spot (targetX, targetY, targetZUp) must be walkable
                if (isTargetTileAtCurrentZImpassable &&
                    window.mapRenderer.isTileEmpty(originalPos.x, originalPos.y, targetZUp) &&
                    window.mapRenderer.isWalkable(targetX, targetY, targetZUp)) {

                    let entityAtDest = false;
                    if (isPlayer) {
                        entityAtDest = window.gameState.npcs.some(npc => npc.mapPos?.x === targetX && npc.mapPos?.y === targetY && npc.mapPos?.z === targetZUp && npc.health?.torso?.current > 0);
                    } else {
                        if (window.gameState.playerPos.x === targetX && window.gameState.playerPos.y === targetY && window.gameState.playerPos.z === targetZUp) entityAtDest = true;
                        if (!entityAtDest) entityAtDest = window.gameState.npcs.some(otherNpc => otherNpc !== character && otherNpc.mapPos?.x === targetX && otherNpc.mapPos?.y === targetY && otherNpc.mapPos?.z === targetZUp && otherNpc.health?.torso?.current > 0);
                    }

                    if (!entityAtDest) {
                        if (isPlayer) {
                            window.gameState.playerPos = { x: targetX, y: targetY, z: targetZUp };
                            window.gameState.movementPointsRemaining -= cost;
                        } else {
                            character.mapPos = { x: targetX, y: targetY, z: targetZUp };
                            character.currentMovementPoints -= cost;
                        }
                        logToConsole(`${logPrefix} Used z_transition '${zTransitionDef.name}' to step UP onto '${targetTileAtCurrentZImpassableInfo.name}' at Z+1. Cost: ${cost} MP.`, "green");
                        moveSuccessful = true;
                    } else {
                        logToConsole(`${logPrefix} Cannot step UP via z_transition: Destination (${targetX},${targetY},${targetZUp}) occupied.`);
                    }
                }
            }

            if (!moveSuccessful) { // Try Moving Down (standard z-transition step-down, e.g. into a hole)
                const targetZDown = originalPos.z - 1;
                // Character needs clear space at (targetX, targetY, originalPos.z) to step "into" before dropping
                // And the landing spot (targetX, targetY, targetZDown) must be walkable
                if (window.mapRenderer.isTileEmpty(targetX, targetY, originalPos.z) &&
                    window.mapRenderer.isWalkable(targetX, targetY, targetZDown)) {

                    let entityAtDest = false;
                    if (isPlayer) {
                        entityAtDest = window.gameState.npcs.some(npc => npc.mapPos?.x === targetX && npc.mapPos?.y === targetY && npc.mapPos?.z === targetZDown && npc.health?.torso?.current > 0);
                    } else {
                        if (window.gameState.playerPos.x === targetX && window.gameState.playerPos.y === targetY && window.gameState.playerPos.z === targetZDown) entityAtDest = true;
                        if (!entityAtDest) entityAtDest = window.gameState.npcs.some(otherNpc => otherNpc !== character && otherNpc.mapPos?.x === targetX && otherNpc.mapPos?.y === targetY && otherNpc.mapPos?.z === targetZDown && otherNpc.health?.torso?.current > 0);
                    }

                    if (!entityAtDest) {
                        if (isPlayer) {
                            window.gameState.playerPos = { x: targetX, y: targetY, z: targetZDown };
                            window.gameState.movementPointsRemaining -= cost;
                        } else {
                            character.mapPos = { x: targetX, y: targetY, z: targetZDown };
                            character.currentMovementPoints -= cost;
                        }
                        logToConsole(`${logPrefix} Used z_transition '${zTransitionDef.name}' to step DOWN to Z-1. Cost: ${cost} MP.`, "purple");
                        moveSuccessful = true;
                    } else {
                        logToConsole(`${logPrefix} Cannot step DOWN via z_transition: Destination (${targetX},${targetY},${targetZDown}) occupied.`);
                    }
                }
            }

            if (moveSuccessful) {
                if (isPlayer) {
                    if (window.gameState.viewFollowsPlayerZ) window.gameState.currentViewZ = window.gameState.playerPos.z;
                    // Player specific UI updates will be handled by the caller (turnManager.js)
                }
                // Caller (turnManager or combatManager) will handle UI/render updates.
                return true;
            } else {
                logToConsole(`${logPrefix} Z-Transition/Slope ON tile: Conditions for any Z-move not met or failed.`);
            }
        } else if (charIsOnZTransition && zTransitionDef) { // Not enough MP
            logToConsole(`${logPrefix} Not enough MP for z_transition/slope assisted move. Need ${cost}, have ${currentMP}.`);
        }
    } // End of "Character is ON a z_transition" block


    // 2. Explicit Z-Transition (Character is moving INTO a z_transition tile like stairs/ladder at targetX, targetY, originalPos.z)
    let explicitZTransDefAtTarget = null;
    const targetLevelDataForExplicitZ = currentMap.levels[originalPos.z.toString()];
    if (targetLevelDataForExplicitZ) {
        const checkTileForExplicitZ = (tileId) => {
            if (tileId && localAssetManager.tilesets[tileId]) {
                const def = localAssetManager.tilesets[tileId];
                // Ensure it's a z_transition but NOT a slope (slopes are handled by being ON them)
                if (def.tags?.includes('z_transition') && !def.tags?.includes('slope')) {
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
        logToConsole(`${logPrefix} Target tile (${targetX},${targetY},${originalPos.z}) is an Explicit Z-Transition: '${explicitZTransDefAtTarget.name}'.`);
        const cost = explicitZTransDefAtTarget.z_cost || 1;
        let currentMP = isPlayer ? window.gameState.movementPointsRemaining : character.currentMovementPoints;

        if (currentMP < cost) {
            logToConsole(`${logPrefix} Not enough MP for explicit Z-transition. Need ${cost}, have ${currentMP}.`);
        } else {
            const finalDestZ = originalPos.z + explicitZTransDefAtTarget.target_dz;
            if (window.mapRenderer.isWalkable(targetX, targetY, finalDestZ)) {
                let entityAtDest = false;
                if (isPlayer) {
                    entityAtDest = window.gameState.npcs.some(npc => npc.mapPos?.x === targetX && npc.mapPos?.y === targetY && npc.mapPos?.z === finalDestZ && npc.health?.torso?.current > 0);
                } else {
                    if (window.gameState.playerPos.x === targetX && window.gameState.playerPos.y === targetY && window.gameState.playerPos.z === finalDestZ) entityAtDest = true;
                    if (!entityAtDest) entityAtDest = window.gameState.npcs.some(otherNpc => otherNpc !== character && otherNpc.mapPos?.x === targetX && otherNpc.mapPos?.y === targetY && otherNpc.mapPos?.z === finalDestZ && otherNpc.health?.torso?.current > 0);
                }

                if (!entityAtDest) {
                    if (isPlayer) {
                        window.gameState.playerPos = { x: targetX, y: targetY, z: finalDestZ };
                        window.gameState.movementPointsRemaining -= cost;
                    } else {
                        character.mapPos = { x: targetX, y: targetY, z: finalDestZ };
                        character.currentMovementPoints -= cost;
                    }
                    logToConsole(`${logPrefix} Used explicit Z-transition '${explicitZTransDefAtTarget.name}'. New Z: ${finalDestZ}. Cost: ${cost} MP.`, "cyan");
                    moveSuccessful = true;
                    if (isPlayer) {
                        if (window.gameState.viewFollowsPlayerZ) window.gameState.currentViewZ = finalDestZ;
                    }
                    return true; // Move successful
                } else {
                    logToConsole(`${logPrefix} Cannot use explicit Z-transition: Destination (${targetX},${targetY},${finalDestZ}) occupied.`);
                }
            } else {
                logToConsole(`${logPrefix} Explicit Z-transition destination (${targetX},${targetY},${finalDestZ}) is not walkable.`);
            }
        }
    } // End of "Moving INTO a z_transition" block


    // 3. Standard Horizontal Movement (if no Z-transitions were used)
    // Check if target tile at current Z is strictly impassable
    const targetStrictlyImpassableInfo = isTileStrictlyImpassable(targetX, targetY, originalPos.z);
    if (targetStrictlyImpassableInfo.impassable) {
        logToConsole(`${logPrefix} Movement blocked by '${targetStrictlyImpassableInfo.name}' at (${targetX},${targetY},${originalPos.z}).`);
        return false; // Player bumps into impassable, no further checks.
    }

    // Check occupation at the target (targetX, targetY, originalPos.z)
    let entityBlockingHorizontalTarget = false;
    if (isPlayer) {
        entityBlockingHorizontalTarget = window.gameState.npcs.some(npc => npc.mapPos?.x === targetX && npc.mapPos?.y === targetY && npc.mapPos?.z === originalPos.z && npc.health?.torso?.current > 0);
    } else {
        if (window.gameState.playerPos.x === targetX && window.gameState.playerPos.y === targetY && window.gameState.playerPos.z === originalPos.z) entityBlockingHorizontalTarget = true;
        if (!entityBlockingHorizontalTarget) {
            entityBlockingHorizontalTarget = window.gameState.npcs.some(otherNpc => otherNpc !== character && otherNpc.mapPos?.x === targetX && otherNpc.mapPos?.y === targetY && otherNpc.mapPos?.z === originalPos.z && otherNpc.health?.torso?.current > 0);
        }
    }

    if (entityBlockingHorizontalTarget) {
        logToConsole(`${logPrefix} Cannot move horizontally to (${targetX},${targetY},${originalPos.z}): Occupied.`);
        // Do not return yet for NPCs, they might still fall if the tile below entity is not walkable for them.
        // For players, this is usually a stop.
        if (isPlayer) return false;
    }

    // If not blocked by an entity AND the tile is walkable at the same Z.
    if (!entityBlockingHorizontalTarget && window.mapRenderer.isWalkable(targetX, targetY, originalPos.z)) {
        if (!(targetX === originalPos.x && targetY === originalPos.y)) { // Ensure actual movement
            const cost = 1; // Standard horizontal move cost
            let currentMP = isPlayer ? window.gameState.movementPointsRemaining : character.currentMovementPoints;
            if (currentMP >= cost) {
                if (isPlayer) {
                    window.gameState.playerPos = { x: targetX, y: targetY, z: originalPos.z };
                    window.gameState.movementPointsRemaining -= cost;
                } else {
                    character.mapPos = { x: targetX, y: targetY, z: originalPos.z };
                    character.currentMovementPoints -= cost;
                }
                logToConsole(`${logPrefix} Moved horizontally to (${targetX},${targetY},Z:${originalPos.z}). Cost: ${cost} MP.`);
                moveSuccessful = true;
                return true; // Move successful
            } else {
                logToConsole(`${logPrefix} Not enough MP for horizontal move. Need ${cost}, have ${currentMP}.`);
                return false;
            }
        }
    }

    // 4. Fall Check
    // If we reach here, it means:
    // - No Z-transition or slope movement occurred.
    // - The target tile (targetX, targetY, originalPos.z) was NOT strictly impassable (e.g., not a wall).
    // - The target tile (targetX, targetY, originalPos.z) was either:
    //   a) Occupied by an entity (if so, fall check might still be relevant if char *could* enter the space if entity wasn't there and it was a hole)
    //   b) Not walkable for other reasons (e.g., empty air, a pit).

    // A fall check should only occur if the target tile (targetX, targetY, originalPos.z) is NOT walkable
    // AND it was NOT strictly impassable.
    if (!window.mapRenderer.isWalkable(targetX, targetY, originalPos.z) && !targetStrictlyImpassableInfo.impassable) {
        logToConsole(`${logPrefix} Target (${targetX},${targetY},Z:${originalPos.z}) is not walkable and not strictly impassable. Evaluating potential fall.`);

        // Scan downwards to find landing spot and calculate fall height
        let landingZ = -Infinity;
        let currentScanZ = originalPos.z - 1;
        let foundLandingSpot = false;
        const minZ = -100; // Or get from map data if available

        while (currentScanZ >= minZ) {
            if (window.mapRenderer.isWalkable(targetX, targetY, currentScanZ)) {
                landingZ = currentScanZ;
                foundLandingSpot = true;
                break;
            }
            if (originalPos.z - currentScanZ > 50) break; // Max fall scan depth
            currentScanZ--;
        }

        const fallHeight = foundLandingSpot ? (originalPos.z - landingZ) : (originalPos.z - (currentScanZ + 1)); // If no spot, fallHeight is to the abyss

        if (fallHeight <= 0 && foundLandingSpot) { // e.g. landingZ is originalPos.z or higher, should not happen if initial check failed.
            logToConsole(`${logPrefix} Calculated non-positive fall height (${fallHeight}) to a walkable spot. This is unexpected. No fall.`, "orange");
            return false;
        }

        let proceedWithFall = false;
        if (isPlayer) {
            proceedWithFall = true; // Players always commit to the fall if they walk off
        } else { // NPC
            if (typeof window.npcShouldTakeFall === 'function') {
                if (foundLandingSpot) { // Only ask NPC if there's a known landing spot
                    proceedWithFall = window.npcShouldTakeFall(character, fallHeight);
                    if (!proceedWithFall) {
                        logToConsole(`${logPrefix} NPC decided NOT to take the ${fallHeight}-level fall. Move aborted.`, "yellow");
                        return false; // NPC refuses the fall
                    }
                } else {
                    // NPC falling into abyss? Generally, they should avoid this unless pathfinding is desperate.
                    // For now, let's say NPCs refuse to fall into an abyss unless pushed.
                    // npcShouldTakeFall could be enhanced for this, or we can assume they avoid it.
                    // If there's no landing spot found, it's an "infinite" fall.
                    // The current npcShouldTakeFall might return true for a very high fallHeight if willpower is high.
                    // Let's assume for now, if no valid landing spot, NPC won't jump.
                    logToConsole(`${logPrefix} No valid landing spot found below (${targetX},${targetY},${originalPos.z - 1}). NPC avoids falling into unknown.`, "orange");
                    return false;
                }
            } else {
                logToConsole(`${logPrefix} CRITICAL: window.npcShouldTakeFall is NOT a function. NPC cannot decide on fall. Assuming NO FALL.`, "red");
                return false;
            }
        }

        if (proceedWithFall) {
            if (typeof window.initiateFallCheck === 'function') {
                const fallHandled = window.initiateFallCheck(character, targetX, targetY, originalPos.z); // originalPos.z is the Z of the air tile stepped into
                if (fallHandled) {
                    const fallMoveCost = 1;
                    let currentMP = isPlayer ? window.gameState.movementPointsRemaining : character.currentMovementPoints;
                    if (currentMP >= fallMoveCost) {
                        if (isPlayer) window.gameState.movementPointsRemaining -= fallMoveCost;
                        else character.currentMovementPoints -= fallMoveCost;
                        logToConsole(`${logPrefix} Spent ${fallMoveCost} MP to initiate fall.`);
                    } else {
                        logToConsole(`${logPrefix} Initiated fall with insufficient MP (had ${currentMP}, cost ${fallMoveCost}). Fall occurs regardless.`);
                        if (isPlayer) window.gameState.movementPointsRemaining = 0;
                        else character.currentMovementPoints = 0;
                    }
                    moveSuccessful = true;
                    return true;
                } else {
                    logToConsole(`${logPrefix} Fall check initiated, but initiateFallCheck reported no fall occurred. This is unexpected.`, "orange");
                    return false;
                }
            } else {
                logToConsole(`${logPrefix} CRITICAL: window.initiateFallCheck is NOT a function. Cannot process fall.`, "error");
                return false;
            }
        }
        // If !proceedWithFall (e.g. NPC refused), we've already returned false.
    }

    // Fallback logging if no other condition was met
    if (!moveSuccessful) {
        if (!targetStrictlyImpassableInfo.impassable && entityBlockingHorizontalTarget && window.mapRenderer.isWalkable(targetX, targetY, originalPos.z)) {
            logToConsole(`${logPrefix} Final check: Movement blocked by entity on a walkable tile.`);
        } else if (!targetStrictlyImpassableInfo.impassable && !window.mapRenderer.isWalkable(targetX, targetY, originalPos.z)) {
            // This path means it wasn't a fall the character was willing to take or could execute.
            logToConsole(`${logPrefix} Final check: Could not move. Target is not strictly impassable, but also not walkable, and fall was not executed. Review logic.`, "orange");
        } else if (targetStrictlyImpassableInfo.impassable) {
            // This should have been caught earlier.
            logToConsole(`${logPrefix} Final check: Target was strictly impassable. Should have been handled.`, "orange");
        }
        else {
            logToConsole(`${logPrefix} Could not move. Reason unclear or already logged.`);
        }
    }
    return false; // No move made
}

// Make it globally accessible if not using ES6 modules
if (typeof window !== 'undefined') {
    window.attemptCharacterMove = attemptCharacterMove;
}
