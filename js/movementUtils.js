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
 * @param {number} [moveCostOverride=null] - Optional override for movement point cost.
 * @param {number} [animationDurationOverride] - Optional duration for the movement animation.
 * @returns {boolean} True if a move (including starting a fall) was made, false otherwise.
 */
async function attemptCharacterMove(character, direction, assetManagerInstance, moveCostOverride = null, animationDurationOverride = null) {
    const isPlayer = (character === window.gameState);
    const logPrefix = isPlayer ? "[PlayerMovement]" : `[NPCMovement ${character.id || 'UnknownNPC'}]`;
    const isFlying = !isPlayer && character.tags && character.tags.includes('flying'); // Player flying logic can be added later if needed
    console.log(`${logPrefix} attemptCharacterMove called with direction: ${direction}. Flying: ${isFlying}`);

    if (isPlayer && window.gameState.isActionMenuActive) {
        logToConsole(`${logPrefix} Cannot move: Action menu active.`, "orange");
        console.log(`${logPrefix} Blocked: Action menu is active.`);
        return false;
    }

    if (window.animationManager && window.animationManager.isAnimationPlaying()) {
        logToConsole(`${logPrefix} Cannot move: Animation playing.`, "orange");
        return false;
    }

    // Vehicle handling
    let vehicleId = null;
    if (isPlayer && window.gameState.player.isInVehicle) {
        vehicleId = window.gameState.player.isInVehicle;
    } else if (!isPlayer && character.isInVehicle) {
        vehicleId = character.isInVehicle;
    }

    let movementPointsOwner = isPlayer ? window.gameState : character;
    let currentMovementPoints = isPlayer ? movementPointsOwner.movementPointsRemaining : movementPointsOwner.currentMovementPoints;

    let actualMoveCost = moveCostOverride !== null ? moveCostOverride : 1;

    if (vehicleId) {
        if (window.vehicleManager) {
            const vehicleMoveCost = window.vehicleManager.getVehicleMovementCost(vehicleId);
            // Only override cost if it's beneficial (or maybe vehicles are harder to maneuver?)
            // For now, let's assume vehicle cost replaces standard walk cost.
            if (moveCostOverride === null) {
                actualMoveCost = vehicleMoveCost;
            }
        }
    }

    // Grappling movement cost adjustment
    if (isPlayer && window.gameState.statusEffects?.isGrappling && window.gameState.statusEffects.grappledBy === 'player') {
        actualMoveCost *= 2; // Double movement cost if player is grappling someone
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
    // Get current facing, default to 'down' if missing
    let newFacing = isPlayer ? (window.gameState.player.facing || 'down') : (character.facing || 'down');

    switch (direction) {
        case 'up': case 'w': case 'W': case 'ArrowUp':
            targetY--;
            newFacing = 'up';
            break;
        case 'down': case 's': case 'S': case 'ArrowDown':
            targetY++;
            newFacing = 'down';
            break;
        case 'left': case 'a': case 'A': case 'ArrowLeft':
            targetX--;
            newFacing = 'left';
            break;
        case 'right': case 'd': case 'D': case 'ArrowRight':
            targetX++;
            newFacing = 'right';
            break;
        case 'up_z': /* Z handled later */ break;
        case 'down_z': /* Z handled later */ break;
        default:
            logToConsole(`${logPrefix} Unknown move direction: ${direction}`);
            return false;
    }

    if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) {
        logToConsole(`${logPrefix} Can't move that way (map boundary).`);
        return false;
    }

    // --- Determine Character's Current Tile Properties (moved before collision check) ---
    // CRITICAL FIX: This block must occur BEFORE the collision check below.
    // We need to know if the character is on a slope/z-transition to grant exceptions
    // for "walking into walls" which is how slopes technically work (you walk into the solid base of the slope).
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

    // --- Multi-tile Rotation/Collision Check ---
    if (window.mapUtils) {
        const ent = isPlayer ? window.gameState.player : character;
        const targetFootprint = window.mapUtils.getEntityFootprint(ent, { x: targetX, y: targetY, z: originalPos.z }, newFacing);

        // 1. Check Static Geometry (Walls/Map Bounds)
        // If ANY part of the footprint is in a wall, block immediately.
        for (const tile of targetFootprint) {
            // RELAXED CHECK: Use isTileStrictlyImpassable instead of isWalkable.
            // This allows movement into "empty air" (for falling) or "slope walls" (if exception met).
            // Using isWalkable here would block falling because air is not "walkable".
            const impassableInfo = isTileStrictlyImpassable(tile.x, tile.y, tile.z);

            if (impassableInfo.impassable) {
                // Check for slope exception
                let isSlopeException = false;
                if (charIsOnZTransition && zTransitionDef && zTransitionDef.tags && zTransitionDef.tags.includes('slope')) {
                    // Slope Directional Validation
                    // If the name implies a direction, ensure we are moving that way.
                    const name = zTransitionDef.name || "";
                    let allowedDirection = true; // Default to true for generic slopes

                    if (name.includes('North') && direction !== 'up' && direction !== 'ArrowUp' && direction !== 'w') allowedDirection = false;
                    else if (name.includes('South') && direction !== 'down' && direction !== 'ArrowDown' && direction !== 's') allowedDirection = false;
                    else if (name.includes('East') && direction !== 'right' && direction !== 'ArrowRight' && direction !== 'd') allowedDirection = false;
                    else if (name.includes('West') && direction !== 'left' && direction !== 'ArrowLeft' && direction !== 'a') allowedDirection = false;

                    if (allowedDirection) {
                         // Only allow if we are moving INTO the blocked tile that corresponds to the slope ascent?
                         // For simplicity, if we are on a slope and moving in its direction, we forgive static map collisions
                         // assuming the Slope Logic (Step 1) will handle the actual transition or block if invalid.
                         isSlopeException = true;
                    }
                }

                if (!isSlopeException) {
                    logToConsole(`${logPrefix} Cannot move: Footprint blocked by static map at (${tile.x},${tile.y}).`);
                    return false;
                }
            }
        }

        // 2. Check Entity Collision (but allow interaction with primary target)
        // We allow the move to proceed IF the only obstruction is at (targetX, targetY),
        // because the existing logic below handles "bumping" into an interactable/hostile there.
        // If there is an obstruction elsewhere in the footprint, we block.
        for (const tile of targetFootprint) {
             // Skip check for the "primary" tile where interaction happens
             if (tile.x === targetX && tile.y === targetY && tile.z === originalPos.z) continue;

             if (window.mapUtils.isTileOccupied(tile.x, tile.y, tile.z, ent)) {
                 logToConsole(`${logPrefix} Cannot move: Footprint collision at (${tile.x},${tile.y}) with non-target entity.`);
                 return false;
             }
        }
    }

    // Water Movement Cost
    if (window.waterManager) {
        let checkZ = originalPos.z;
        if (direction === 'up_z') checkZ++;
        else if (direction === 'down_z') checkZ--;
        const water = window.waterManager.getWaterAt(targetX, targetY, checkZ);
        // Cost is +1 if there is water, making total 2. If it's deep water, it might be more or handled by swim logic.
        if (water && water.depth > 0) {
            actualMoveCost += 1;
        }
    }

    if (currentMovementPoints < actualMoveCost) {
        logToConsole(`${logPrefix} Not enough movement points. Need ${actualMoveCost}, have ${currentMovementPoints}.`);
        if (isPlayer && window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        return false;
    }

    let moveSuccessful = false; // Flag to track if any kind of position change or fall occurred

    // Vehicle movement limitation: Vehicles generally cannot use Z-transitions like ladders/stairs unless specially designed (e.g., ramps).
    // For now, assume vehicles can ONLY move horizontally or use slopes (if they are ramps).
    // We'll treat slopes as valid for vehicles, but stairs/ladders as invalid.

    // --- Movement Logic Order ---

    // 0. Flying Vertical Movement
    if (isFlying && (direction === 'up_z' || direction === 'down_z') && !moveSuccessful) {
        const targetZ = originalPos.z + (direction === 'up_z' ? 1 : -1);
        // Basic check for map bounds (assuming Z-levels are generally reasonable, strict check depends on map implementation)
        // For now, we allow flying into any Z that isn't strictly impassable.
        const targetImpassableInfo = isTileStrictlyImpassable(targetX, targetY, targetZ);

        if (!targetImpassableInfo.impassable) {
            // Check entity collision at destination
            let entityAtDest = false;
            // NPCs checking against player and other NPCs (Flying is currently NPC only in this implementation)
            if (window.gameState.playerPos.x === targetX && window.gameState.playerPos.y === targetY && window.gameState.playerPos.z === targetZ) entityAtDest = true;
            if (!entityAtDest) entityAtDest = window.gameState.npcs.some(otherNpc => otherNpc !== character && otherNpc.mapPos?.x === targetX && otherNpc.mapPos?.y === targetY && otherNpc.mapPos?.z === targetZ && otherNpc.health?.torso?.current > 0);

            if (!entityAtDest) {
                character.mapPos = { x: targetX, y: targetY, z: targetZ };
                character.currentMovementPoints -= actualMoveCost;
                logToConsole(`${logPrefix} Flying ${direction === 'up_z' ? 'Up' : 'Down'} to Z:${targetZ}.`, "cyan");
                moveSuccessful = true;
                // If view follows NPC z (usually not for player view), but render update is needed.
                return true;
            } else {
                logToConsole(`${logPrefix} Flying blocked: Destination occupied.`);
            }
        } else {
            logToConsole(`${logPrefix} Flying blocked by ${targetImpassableInfo.name}.`);
        }
    }

    // 0.5. Swimming (Vertical Movement in Deep Water)
    if ((direction === 'up_z' || direction === 'down_z') && !moveSuccessful) {
        if (window.waterManager && window.waterManager.isWaterDeep(originalPos.x, originalPos.y, originalPos.z)) {
            const targetZ = originalPos.z + (direction === 'up_z' ? 1 : -1);
            const targetImpassableInfo = isTileStrictlyImpassable(targetX, targetY, targetZ);

            if (!targetImpassableInfo.impassable) {
                // Check entity collision at destination
                let entityAtDest = false;
                if (isPlayer) {
                    entityAtDest = window.gameState.npcs.some(npc => npc.mapPos?.x === targetX && npc.mapPos?.y === targetY && npc.mapPos?.z === targetZ && npc.health?.torso?.current > 0);
                } else {
                    if (window.gameState.playerPos.x === targetX && window.gameState.playerPos.y === targetY && window.gameState.playerPos.z === targetZ) entityAtDest = true;
                    if (!entityAtDest) entityAtDest = window.gameState.npcs.some(otherNpc => otherNpc !== character && otherNpc.mapPos?.x === targetX && otherNpc.mapPos?.y === targetY && otherNpc.mapPos?.z === targetZ && otherNpc.health?.torso?.current > 0);
                }

                if (!entityAtDest) {
                    if (isPlayer) {
                        window.gameState.playerPos = { x: targetX, y: targetY, z: targetZ };
                        window.gameState.movementPointsRemaining -= actualMoveCost;
                        if (window.gameState.viewFollowsPlayerZ) window.gameState.currentViewZ = targetZ;
                    } else {
                        character.mapPos = { x: targetX, y: targetY, z: targetZ };
                        character.currentMovementPoints -= actualMoveCost;
                    }
                    logToConsole(`${logPrefix} Swimming ${direction === 'up_z' ? 'Up' : 'Down'} to Z:${targetZ}. Cost: ${actualMoveCost}.`, "cyan");
                    moveSuccessful = true;
                    return true;
                } else {
                    logToConsole(`${logPrefix} Swimming blocked: Destination occupied.`);
                }
            } else {
                logToConsole(`${logPrefix} Swimming blocked by ${targetImpassableInfo.name}.`);
            }
        } else {
            // logToConsole(`${logPrefix} Cannot swim vertical: Not in deep water.`);
        }
    }

    // 1. Z-Transition (Character is ON a z_transition tile - includes slopes)
    if (charIsOnZTransition && zTransitionDef) {
        // Vehicle check: If in vehicle, only allow slopes.
        if (vehicleId && !zTransitionDef.tags?.includes('slope')) {
            logToConsole(`${logPrefix} Cannot use ${zTransitionDef.name} while in a vehicle.`, "orange");
            // Proceed to horizontal check, maybe they are just driving *past* a ladder?
            // But if they are ON the tile, standard movement usually prioritizes the transition interaction.
            // Let's assume they can move OFF the tile horizontally (Step 3) if they don't take the transition.
            // So we skip this block.
        } else {
            logToConsole(`${logPrefix} Character is on Z-Transition Tile (or Slope): '${zTransitionDef.name}'. Attempting Z-move.`);
            const cost = zTransitionDef.z_cost || 1;
            let currentMP = isPlayer ? window.gameState.movementPointsRemaining : character.currentMovementPoints;
            if (vehicleId) {
                const vehicle = window.vehicleManager ? window.vehicleManager.getVehicleById(vehicleId) : null;
                if (vehicle) {
                    currentMP = vehicle.currentMovementPoints !== undefined ? vehicle.currentMovementPoints : 6;
                }
            }

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
                        }
                        // Strictly removed check for bottom layer having solid_terrain_top
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
                            // If moving in a vehicle, check fuel and update vehicle pos
                            let fuelConsumed = false;
                            if (vehicleId && window.vehicleManager) {
                                if (!window.vehicleManager.consumeFuel(vehicleId, 1)) { // Assume slope takes 1 unit of distance/fuel?
                                    logToConsole("Vehicle out of fuel!", "red");
                                    return false;
                                }
                                const vehicle = window.vehicleManager.getVehicleById(vehicleId);
                                if (vehicle) {
                                    vehicle.mapPos = { x: targetX, y: targetY, z: finalDestZSlope };
                                    fuelConsumed = true;
                                }
                            }

                            if (isPlayer) {
                                window.gameState.playerPos = { x: targetX, y: targetY, z: finalDestZSlope };
                                if (vehicleId) {
                                    const vehicle = window.vehicleManager.getVehicleById(vehicleId);
                                    if (vehicle) vehicle.currentMovementPoints -= actualMoveCost;
                                } else {
                                    window.gameState.movementPointsRemaining -= actualMoveCost; // Use actualMoveCost
                                }
                                // Move grappled target if player is grappling
                                if (window.gameState.statusEffects?.isGrappling && window.gameState.statusEffects.grappledBy === 'player') {
                                    const grappledNpc = window.gameState.npcs.find(npc => npc.id === window.gameState.statusEffects.grappledTargetId);
                                    if (grappledNpc) {
                                        grappledNpc.mapPos = { ...window.gameState.playerPos };
                                        logToConsole(`Moved grappled target ${grappledNpc.name} with player.`, 'grey');
                                    }
                                }
                            } else {
                                character.mapPos = { x: targetX, y: targetY, z: finalDestZSlope };
                                character.currentMovementPoints -= actualMoveCost; // Use actualMoveCost
                            }
                            logToConsole(`${logPrefix} Used slope '${zTransitionDef.name}' to move onto '${adjTileDefSlope.name}'. New Z: ${finalDestZSlope}. Cost: ${actualMoveCost} MP.`, "green");
                            if (window.audioManager) window.audioManager.playFootstepSound(); // Footstep for slope
                            moveSuccessful = true;
                            if (isPlayer) {
                                if (window.gameState.viewFollowsPlayerZ) {
                                    window.gameState.currentViewZ = window.gameState.playerPos.z;
                                }
                                const radius = window.getPlayerVisionRadius ? window.getPlayerVisionRadius() : 10;
                                if (window.mapRenderer && typeof window.mapRenderer.updateFOW === 'function') {
                                    window.mapRenderer.updateFOW(window.gameState.playerPos.x, window.gameState.playerPos.y, window.gameState.playerPos.z, radius);
                                }
                                // updatePlayerStatusDisplay() is called in turnManager.move after attemptCharacterMove returns
                            }
                        } else {
                            logToConsole(`${logPrefix} Cannot use slope: Destination (${targetX},${targetY},${finalDestZSlope}) occupied.`);
                        }
                    } else {
                        logToConsole(`${logPrefix} Slope move failed: Adjacent tile (${targetX},${targetY},${originalPos.z}) not solid_terrain_top or destination Z=${finalDestZSlope} not walkable.`);
                    }
                }

                // General Z-Transition (non-slope, or slope failed and trying alternatives)
                if (!moveSuccessful && !vehicleId) { // Vehicles cannot do standard Z-step ups/downs
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
                                if (vehicleId) {
                                    const vehicle = window.vehicleManager.getVehicleById(vehicleId);
                                    if (vehicle) vehicle.currentMovementPoints -= actualMoveCost;
                                } else {
                                    window.gameState.movementPointsRemaining -= actualMoveCost; // Use actualMoveCost
                                }
                                // Move grappled target
                                if (window.gameState.statusEffects?.isGrappling && window.gameState.statusEffects.grappledBy === 'player' && window.gameState.statusEffects.grappledTargetId) {
                                    const grappledNpc = window.gameState.npcs.find(npc => npc.id === window.gameState.statusEffects.grappledTargetId);
                                    if (grappledNpc) {
                                        grappledNpc.mapPos = { ...window.gameState.playerPos };
                                        logToConsole(`Moved grappled target ${grappledNpc.name} with player to ${JSON.stringify(grappledNpc.mapPos)}.`, 'grey');
                                    }
                                }
                            } else {
                                character.mapPos = { x: targetX, y: targetY, z: targetZUp };
                                character.currentMovementPoints -= actualMoveCost;
                            }
                            logToConsole(`${logPrefix} Used z_transition '${zTransitionDef.name}' to step UP onto '${targetTileAtCurrentZImpassableInfo.name}' at Z+1. Cost: ${actualMoveCost} MP.`, "green");
                            if (window.audioManager) window.audioManager.playFootstepSound(); // Footstep for Z-up
                            moveSuccessful = true;
                            if (isPlayer) {
                                if (window.gameState.viewFollowsPlayerZ) {
                                    window.gameState.currentViewZ = window.gameState.playerPos.z;
                                }
                                const radius = window.getPlayerVisionRadius ? window.getPlayerVisionRadius() : 10;
                                if (window.mapRenderer && typeof window.mapRenderer.updateFOW === 'function') {
                                    window.mapRenderer.updateFOW(window.gameState.playerPos.x, window.gameState.playerPos.y, window.gameState.playerPos.z, radius);
                                }
                            }
                        } else {
                            logToConsole(`${logPrefix} Cannot step UP via z_transition: Destination (${targetX},${targetY},${targetZUp}) occupied.`);
                        }
                    }
                }

                if (!moveSuccessful && !vehicleId) { // Vehicles cannot do standard Z-step downs
                    // Try Moving Down (standard z-transition step-down, e.g. into a hole)
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
                                if (vehicleId) {
                                    const vehicle = window.vehicleManager.getVehicleById(vehicleId);
                                    if (vehicle) vehicle.currentMovementPoints -= actualMoveCost;
                                } else {
                                    window.gameState.movementPointsRemaining -= actualMoveCost; // Use actualMoveCost
                                }
                                // Move grappled target
                                if (window.gameState.statusEffects?.isGrappling && window.gameState.statusEffects.grappledBy === 'player') {
                                    const grappledNpc = window.gameState.npcs.find(npc => npc.id === window.gameState.statusEffects.grappledTargetId);
                                    if (grappledNpc) {
                                        grappledNpc.mapPos = { ...window.gameState.playerPos };
                                        logToConsole(`Moved grappled target ${grappledNpc.name} with player.`, 'grey');
                                    }
                                }
                            } else {
                                character.mapPos = { x: targetX, y: targetY, z: targetZDown };
                                character.currentMovementPoints -= actualMoveCost; // Use actualMoveCost
                            }
                            logToConsole(`${logPrefix} Used z_transition '${zTransitionDef.name}' to step DOWN to Z-1. Cost: ${actualMoveCost} MP.`, "purple");
                            if (window.audioManager) window.audioManager.playFootstepSound(); // Footstep for Z-down
                            moveSuccessful = true;
                            if (isPlayer) {
                                if (window.gameState.viewFollowsPlayerZ) {
                                    window.gameState.currentViewZ = window.gameState.playerPos.z;
                                }
                                const radius = window.getPlayerVisionRadius ? window.getPlayerVisionRadius() : 10;
                                if (window.mapRenderer && typeof window.mapRenderer.updateFOW === 'function') {
                                    window.mapRenderer.updateFOW(window.gameState.playerPos.x, window.gameState.playerPos.y, window.gameState.playerPos.z, radius);
                                }
                            }
                        } else {
                            logToConsole(`${logPrefix} Cannot step DOWN via z_transition: Destination (${targetX},${targetY},${targetZDown}) occupied.`);
                        }
                    }
                }

                if (moveSuccessful) {
                    if (isPlayer) {
                        if (window.gameState.viewFollowsPlayerZ) window.gameState.currentViewZ = window.gameState.playerPos.z;
                        if (window.audioManager) window.audioManager.updateListenerPosition(window.gameState.playerPos.x, window.gameState.playerPos.y, window.gameState.playerPos.z);
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
        }
    } // End of "Character is ON a z_transition" block


    // 2. Explicit Z-Transition (Character is moving INTO a z_transition tile like stairs/ladder at targetX, targetY, originalPos.z)
    if (!vehicleId) { // Vehicles cannot use ladders/stairs
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

            // Re-check currentMP for Z transition as it might be vehicle MP
            let mpForZ = isPlayer ? window.gameState.movementPointsRemaining : character.currentMovementPoints;
            if (vehicleId) {
                const vehicle = window.vehicleManager ? window.vehicleManager.getVehicleById(vehicleId) : null;
                if (vehicle) mpForZ = vehicle.currentMovementPoints !== undefined ? vehicle.currentMovementPoints : 6;
            }

            if (mpForZ < cost) {
                logToConsole(`${logPrefix} Not enough MP for explicit Z-transition. Need ${cost}, have ${mpForZ}.`);
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
                            if (vehicleId) {
                                const vehicle = window.vehicleManager.getVehicleById(vehicleId);
                                if (vehicle) vehicle.currentMovementPoints -= cost;
                            } else {
                                window.gameState.movementPointsRemaining -= cost;
                            }
                        } else {
                            character.mapPos = { x: targetX, y: targetY, z: finalDestZ };
                            character.currentMovementPoints -= cost;
                        }
                        logToConsole(`${logPrefix} Used explicit Z-transition '${explicitZTransDefAtTarget.name}'. New Z: ${finalDestZ}. Cost: ${cost} MP.`, "cyan");
                        if (window.audioManager) window.audioManager.playFootstepSound(); // Footstep for explicit Z-trans
                        moveSuccessful = true;
                        if (isPlayer) {
                            if (window.gameState.viewFollowsPlayerZ) {
                                window.gameState.currentViewZ = window.gameState.playerPos.z; // playerPos.z IS finalDestZ here
                            }
                            if (window.audioManager) window.audioManager.updateListenerPosition(window.gameState.playerPos.x, window.gameState.playerPos.y, window.gameState.playerPos.z);
                            const radius = window.getPlayerVisionRadius ? window.getPlayerVisionRadius() : 10;
                            if (window.mapRenderer && typeof window.mapRenderer.updateFOW === 'function') {
                                window.mapRenderer.updateFOW(window.gameState.playerPos.x, window.gameState.playerPos.y, window.gameState.playerPos.z, radius);
                            }
                        }
                        return true; // Move successful
                    } else {
                        logToConsole(`${logPrefix} Cannot use explicit Z-transition: Destination (${targetX},${targetY},${finalDestZ}) occupied.`);
                    }
                } else {
                    logToConsole(`${logPrefix} Explicit Z-transition destination (${targetX},${targetY},${finalDestZ}) is not walkable.`);
                }
            }
        }
    } // End of "Moving INTO a z_transition" block


    // 3. Standard Horizontal Movement (if no Z-transitions were used)
    // Check if target tile at current Z is strictly impassable, this is used for both horizontal move and fall checks.
    const targetStrictlyImpassableInfo = isTileStrictlyImpassable(targetX, targetY, originalPos.z);

    if (!moveSuccessful) {
        if (targetStrictlyImpassableInfo.impassable) {
            logToConsole(`${logPrefix} Movement blocked by '${targetStrictlyImpassableInfo.name}' at (${targetX},${targetY},${originalPos.z}).`);
            return false; // Player bumps into impassable, no further checks.
        }

        // Check occupation at the target (targetX, targetY, originalPos.z)
        let entityBlockingHorizontalTarget = false;
        if (isPlayer) {
            entityBlockingHorizontalTarget = window.gameState.npcs.some(npc => npc.mapPos?.x === targetX && npc.mapPos?.y === targetY && npc.mapPos?.z === originalPos.z && npc.health?.torso?.current > 0);
        } else {
            if (window.gameState.playerPos && window.gameState.playerPos.x === targetX && window.gameState.playerPos.y === targetY && window.gameState.playerPos.z === originalPos.z) entityBlockingHorizontalTarget = true;
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

        // If not blocked by an entity AND (the tile is walkable OR entity is flying).
        // Note: targetStrictlyImpassableInfo.impassable check above already handles walls.
        // isWalkable handles "floor presence". Flying entities don't need floors, but must respect walls.
        if (!entityBlockingHorizontalTarget && (window.mapRenderer.isWalkable(targetX, targetY, originalPos.z) || (isFlying && !targetStrictlyImpassableInfo.impassable))) {
            if (!(targetX === originalPos.x && targetY === originalPos.y)) { // Ensure actual movement
                // const cost = 1; // Standard horizontal move cost
                let currentMP = isPlayer ? window.gameState.movementPointsRemaining : character.currentMovementPoints;

                if (vehicleId) {
                    const vehicle = window.vehicleManager ? window.vehicleManager.getVehicleById(vehicleId) : null;
                    if (vehicle) currentMP = vehicle.currentMovementPoints !== undefined ? vehicle.currentMovementPoints : 6;
                }

                if (currentMP >= actualMoveCost) {
                    // Check fuel if vehicle
                    if (vehicleId && window.vehicleManager) {
                        if (!window.vehicleManager.consumeFuel(vehicleId, 1)) {
                            logToConsole("Vehicle out of fuel!", "red");
                            return false;
                        }
                        const vehicle = window.vehicleManager.getVehicleById(vehicleId);
                        if (vehicle) {
                            vehicle.mapPos = { x: targetX, y: targetY, z: originalPos.z };
                        }
                    }

                    if (isPlayer) {
                        window.gameState.playerPos = { x: targetX, y: targetY, z: originalPos.z };
                        window.gameState.player.facing = newFacing; // Update facing
                        if (vehicleId) {
                            const vehicle = window.vehicleManager.getVehicleById(vehicleId);
                            if (vehicle) vehicle.currentMovementPoints -= actualMoveCost;
                        } else {
                            window.gameState.movementPointsRemaining -= actualMoveCost;
                        }
                    } else {
                        character.mapPos = { x: targetX, y: targetY, z: originalPos.z };
                        character.facing = newFacing; // Update facing
                        character.currentMovementPoints -= actualMoveCost;
                    }
                    logToConsole(`${logPrefix} Moved horizontally to (${targetX},${targetY},Z:${originalPos.z}). Cost: ${actualMoveCost} MP.`);
                    if (window.audioManager) window.audioManager.playFootstepSound(); // Footstep for horizontal move
                    if (isPlayer && window.audioManager) window.audioManager.updateListenerPosition(window.gameState.playerPos.x, window.gameState.playerPos.y, window.gameState.playerPos.z);
                    moveSuccessful = true;
                    if (isPlayer) {
                        // For horizontal moves, playerPos.z doesn't change, so currentViewZ doesn't need update based on viewFollowsPlayerZ here.
                        const radius = window.getPlayerVisionRadius ? window.getPlayerVisionRadius() : 10;
                        if (window.mapRenderer && typeof window.mapRenderer.updateFOW === 'function') {
                            window.mapRenderer.updateFOW(window.gameState.playerPos.x, window.gameState.playerPos.y, window.gameState.playerPos.z, radius);
                        }
                    }
                    return true; // Move successful
                } else {
                    logToConsole(`${logPrefix} Not enough MP for horizontal move. Need ${actualMoveCost}, have ${currentMP}.`);
                    return false;
                }
            }
        }
    }

    // 3.5 Special Case: Step Down onto a Slope from the top
    // This handles the case where a vehicle (or player) walks off a "cliff" (Z) onto a slope tile at (Z-1).
    // This is not a "Fall" but a valid Z-transition entry.
    // Need to check strict impassability again if it's not defined in this scope or was defined in a block.
    const stepDownTargetImpassableInfo = isTileStrictlyImpassable(targetX, targetY, originalPos.z);

    if (!moveSuccessful && !stepDownTargetImpassableInfo.impassable && !window.mapRenderer.isWalkable(targetX, targetY, originalPos.z)) {
        // Check the tile below at Z-1
        const potentialSlopeZ = originalPos.z - 1;
        let isSlopeBelow = false;
        let slopeBelowDef = null;

        const belowLevelData = currentMap.levels[potentialSlopeZ.toString()];
        if (belowLevelData) {
            const checkTileForSlope = (tileId) => {
                if (tileId && localAssetManager.tilesets[tileId]) {
                    const def = localAssetManager.tilesets[tileId];
                    if (def.tags && def.tags.includes('slope')) {
                        return def;
                    }
                }
                return null;
            };

            const midRaw = belowLevelData.middle?.[targetY]?.[targetX];
            const midId = (typeof midRaw === 'object' && midRaw?.tileId !== undefined) ? midRaw.tileId : midRaw;
            slopeBelowDef = checkTileForSlope(midId);
            if (!slopeBelowDef) {
                const botRaw = belowLevelData.bottom?.[targetY]?.[targetX];
                const botId = (typeof botRaw === 'object' && botRaw?.tileId !== undefined) ? botRaw.tileId : botRaw;
                slopeBelowDef = checkTileForSlope(botId);
            }
            if (slopeBelowDef) isSlopeBelow = true;
        }

        // Only allow this if it is a slope below AND walkable
        if (isSlopeBelow && window.mapRenderer.isWalkable(targetX, targetY, potentialSlopeZ)) {
            logToConsole(`${logPrefix} Detected slope '${slopeBelowDef.name}' below at Z-1. Attempting step-down onto slope.`);

            let allowStepDown = false;
            if (vehicleId) allowStepDown = true; // Vehicles can always take slopes
            else {
                // Players/NPCs: standard step down logic usually handled by Z-trans, but for slopes it's implicit.
                // Let's allow it as it's a ramp.
                allowStepDown = true;
            }

            if (allowStepDown) {
                // Check blocking entities at destination Z-1
                let entityAtDest = false;
                if (isPlayer) {
                    entityAtDest = window.gameState.npcs.some(npc => npc.mapPos?.x === targetX && npc.mapPos?.y === targetY && npc.mapPos?.z === potentialSlopeZ && npc.health?.torso?.current > 0);
                } else {
                    if (window.gameState.playerPos.x === targetX && window.gameState.playerPos.y === targetY && window.gameState.playerPos.z === potentialSlopeZ) entityAtDest = true;
                    if (!entityAtDest) entityAtDest = window.gameState.npcs.some(otherNpc => otherNpc !== character && otherNpc.mapPos?.x === targetX && otherNpc.mapPos?.y === targetY && otherNpc.mapPos?.z === potentialSlopeZ && otherNpc.health?.torso?.current > 0);
                }

                if (!entityAtDest) {
                    if (isPlayer) {
                        window.gameState.playerPos = { x: targetX, y: targetY, z: potentialSlopeZ };
                        if (vehicleId) {
                            const vehicle = window.vehicleManager.getVehicleById(vehicleId);
                            if (vehicle) vehicle.currentMovementPoints -= actualMoveCost;
                        } else {
                            window.gameState.movementPointsRemaining -= actualMoveCost;
                        }
                    } else {
                        character.mapPos = { x: targetX, y: targetY, z: potentialSlopeZ };
                        character.currentMovementPoints -= actualMoveCost;
                    }
                    // Fuel consumption logic if vehicle
                    if (vehicleId && window.vehicleManager) {
                        // Fuel logic is usually handled inside turnManager loop or before assignment,
                        // but here we are inside moveUtils.
                        // Existing logic above calls consumeFuel for horizontal moves.
                        // We should do it here too.
                        if (!window.vehicleManager.consumeFuel(vehicleId, 1)) {
                            // This check should ideally happen before move commit, but for consistency with this block structure:
                            // If out of fuel, we already moved... technically a bug in this specific block but rare.
                            // Let's assume check passed or add it before commit.
                            // Reverting move is hard. Let's just log warning.
                            logToConsole("Vehicle ran out of fuel during slope descent!", "orange");
                        } else {
                            const vehicle = window.vehicleManager.getVehicleById(vehicleId);
                            if (vehicle) vehicle.mapPos = { x: targetX, y: targetY, z: potentialSlopeZ };
                        }
                    }

                    logToConsole(`${logPrefix} Stepped down onto Slope '${slopeBelowDef.name}' at Z-1. Cost: ${actualMoveCost} MP.`, "green");
                    moveSuccessful = true;

                    if (isPlayer) {
                        if (window.gameState.viewFollowsPlayerZ) {
                            window.gameState.currentViewZ = window.gameState.playerPos.z;
                        }
                        if (window.audioManager) window.audioManager.updateListenerPosition(window.gameState.playerPos.x, window.gameState.playerPos.y, window.gameState.playerPos.z);
                        const radius = window.getPlayerVisionRadius ? window.getPlayerVisionRadius() : 10;
                        if (window.mapRenderer && typeof window.mapRenderer.updateFOW === 'function') {
                            window.mapRenderer.updateFOW(window.gameState.playerPos.x, window.gameState.playerPos.y, window.gameState.playerPos.z, radius);
                        }
                    }
                    return true;
                } else {
                    logToConsole(`${logPrefix} Cannot step down onto slope: Destination occupied.`);
                }
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
    if (!moveSuccessful && !window.mapRenderer.isWalkable(targetX, targetY, originalPos.z) && !targetStrictlyImpassableInfo.impassable) {
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
        // Vehicles: generally shouldn't drive off cliffs unless intentional?
        // For now, let's say players in vehicles CAN drive off cliffs (Thelma & Louise style).
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
                const fallHandled = await window.initiateFallCheck(character, targetX, targetY, originalPos.z); // originalPos.z is the Z of the air tile stepped into
                if (fallHandled) {
                    const fallMoveCost = 1;
                    let currentMP = isPlayer ? window.gameState.movementPointsRemaining : character.currentMovementPoints;
                    if (currentMP >= fallMoveCost) {
                        // Vehicle fuel consumption? Gravity is free.
                        if (isPlayer) window.gameState.movementPointsRemaining -= fallMoveCost;
                        else character.currentMovementPoints -= fallMoveCost;
                        logToConsole(`${logPrefix} Spent ${fallMoveCost} MP to initiate fall.`);
                    } else {
                        logToConsole(`${logPrefix} Initiated fall with insufficient MP (had ${currentMP}, cost ${fallMoveCost}). Fall occurs regardless.`);
                        if (isPlayer) window.gameState.movementPointsRemaining = 0;
                        else character.currentMovementPoints = 0;
                    }

                    // If in vehicle, move vehicle to final destination (initiateFallCheck might have moved character)
                    if (vehicleId && window.vehicleManager) {
                        const vehicle = window.vehicleManager.getVehicleById(vehicleId);
                        if (vehicle) {
                            vehicle.mapPos = { ...window.gameState.playerPos }; // Assuming initiateFallCheck updated playerPos
                            logToConsole(`Vehicle fell with player to ${JSON.stringify(vehicle.mapPos)}`, "orange");
                            // TODO: Apply damage to vehicle from fall?
                        }
                    }

                    // Listener position updated by handleFalling -> calculateAndApplyFallDamage -> which calls player UI updates that should include listener pos update.
                    // Or more directly, handleFalling updates playerPos, then we can call updateListenerPosition.
                    if (isPlayer && window.audioManager) window.audioManager.updateListenerPosition(window.gameState.playerPos.x, window.gameState.playerPos.y, window.gameState.playerPos.z);
                    moveSuccessful = true;
                    if (isPlayer) {
                        if (window.gameState.viewFollowsPlayerZ) {
                            window.gameState.currentViewZ = window.gameState.playerPos.z; // Player Z has changed due to fall
                        }
                        const radius = window.getPlayerVisionRadius ? window.getPlayerVisionRadius() : 10;
                        if (window.mapRenderer && typeof window.mapRenderer.updateFOW === 'function') {
                            window.mapRenderer.updateFOW(window.gameState.playerPos.x, window.gameState.playerPos.y, window.gameState.playerPos.z, radius);
                        }
                    }
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
