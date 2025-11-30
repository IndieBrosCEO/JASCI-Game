// js/npcDecisions.js

// This file will contain NPC-specific decision-making logic, like whether to take a risky fall.

/**
 * Determines if an NPC should willingly take a fall based on height, leg health, and willpower.
 * @param {object} npc - The NPC object. Must have npc.stats, npc.health.leftLeg, npc.health.rightLeg.
 * @param {number} fallHeight - The number of Z-levels the NPC would fall.
 * @returns {boolean} True if the NPC decides to take the fall, false otherwise.
 */
function npcShouldTakeFall(npc, fallHeight) {
    const logPrefix = `[NPC Fall Decision ${npc.id || npc.name || 'UnknownNPC'}]:`;

    if (fallHeight <= 0) {
        logToConsole(`${logPrefix} No fall or falling up? Height: ${fallHeight}. Allowing (no risk).`, 'grey');
        return true; // Not a fall, or falling up (which shouldn't happen here)
    }

    if (fallHeight <= 1) {
        logToConsole(`${logPrefix} Fall height is ${fallHeight} (<=1). Safe to drop.`, 'green');
        return true; // Safe to drop one level
    }

    let leftLegPercent = 0;
    if (npc.health && npc.health.leftLeg && npc.health.leftLeg.max > 0) {
        leftLegPercent = Math.max(0, npc.health.leftLeg.current) / npc.health.leftLeg.max;
    } else {
        logToConsole(`${logPrefix} Warning: NPC missing left leg health data or max HP is 0. Assuming 0% health for left leg.`, 'orange');
    }

    let rightLegPercent = 0;
    if (npc.health && npc.health.rightLeg && npc.health.rightLeg.max > 0) {
        rightLegPercent = Math.max(0, npc.health.rightLeg.current) / npc.health.rightLeg.max;
    } else {
        logToConsole(`${logPrefix} Warning: NPC missing right leg health data or max HP is 0. Assuming 0% health for right leg.`, 'orange');
    }

    const averageLegHealthPercent = (leftLegPercent + rightLegPercent) / 2;
    logToConsole(`${logPrefix} Leg Health: L=${(leftLegPercent * 100).toFixed(0)}%, R=${(rightLegPercent * 100).toFixed(0)}%, Avg=${(averageLegHealthPercent * 100).toFixed(0)}%`);

    // DC = Base + PenaltyForHeight - BonusForLegHealth
    // Base DC for a multi-level fall could be 10.
    // Height penalty: +2 per Z-level beyond the first free one.
    // Leg health bonus: Max 10 (for 100% health), min 0. (10 * averageLegHealthPercent)
    let dc = 10 + ((fallHeight - 1) * 2) - Math.floor(averageLegHealthPercent * 10);
    dc = Math.max(5, Math.min(dc, 25)); // Clamp DC between 5 and 25.

    // Use getStatValue (from utils.js, robust for different stat structures) to get Willpower.
    // Default to a low value (e.g., 3) if stat is missing, affecting the modifier.
    const willpowerStatValue = (typeof getStatValue === 'function') ? getStatValue("Willpower", npc) : 3;
    if (typeof getStatValue !== 'function') {
        logToConsole(`${logPrefix} CRITICAL: getStatValue function not found. Willpower check will be unreliable.`, "red");
    }
    if (npc.stats && ((Array.isArray(npc.stats) && !npc.stats.find(s => s.name === "Willpower")) || (!Array.isArray(npc.stats) && !npc.stats["Willpower"]))) {
        logToConsole(`${logPrefix} NPC has no Willpower stat defined in .stats. Using default value ${willpowerStatValue} for calculation.`, "orange");
    }


    // The prompt implies a direct willpower check, not necessarily a modifier added to a roll vs. DC.
    // However, "1d20 where the dice challenge is proportionate" suggests a roll against a DC.
    // The existing DC calculation is: dc = 10 + ((fallHeight - 1) * 2) - Math.floor(averageLegHealthPercent * 10);
    // Let's use a standard stat modifier for Willpower to affect the roll.
    // getStatModifier(statName, entity) returns Math.floor(statPoints / 2) - 1. (e.g. 3 WP -> 0, 5 WP -> 1, 7 WP-> 2)
    // This seems more standard than `willpowerPoints - 3`.
    let willpowerModifier = 0;
    if (typeof getStatModifier === 'function') {
        willpowerModifier = getStatModifier("Willpower", npc);
    } else {
        logToConsole(`${logPrefix} CRITICAL: getStatModifier function not found. Willpower modifier will be 0.`, "red");
        // Fallback simple modifier if getStatModifier is missing
        willpowerModifier = Math.floor(willpowerStatValue / 2) - 1;
    }

    const roll = (typeof rollDie === 'function') ? rollDie(20) : Math.floor(Math.random() * 20) + 1;
    if (typeof rollDie !== 'function') {
        logToConsole(`${logPrefix} CRITICAL: rollDie function not found. Using Math.random.`, "red");
    }
    const totalRoll = roll + willpowerModifier;

    const success = totalRoll >= dc;

    logToConsole(`${logPrefix} Fall Height: ${fallHeight}. Leg Health Avg: ${(averageLegHealthPercent * 100).toFixed(0)}%. Willpower Stat: ${willpowerStatValue} (Mod: ${willpowerModifier}). DC: ${dc}. Roll: ${roll} + ${willpowerModifier} = ${totalRoll}. Success: ${success}.`, success ? 'green' : 'red');

    return success;
}

// Constants for NPC behavior (moved from combatManager.js)
const MEMORY_DURATION_THRESHOLD = 20; // Turns an NPC remembers a last seen position
const RECENTLY_VISITED_MAX_SIZE = 5; // Max number of tiles to keep in recent memory for exploration
const NPC_EXPLORATION_RADIUS = 10; // How far an NPC might pick a random exploration point
const MAX_EXPLORATION_TARGET_ATTEMPTS = 10; // How many times to try finding a new random exploration target


// Make it globally accessible
if (typeof window !== 'undefined') {
    window.npcShouldTakeFall = npcShouldTakeFall;
}

// Helper function (moved from combatManager.js)
// Checks if a tile is occupied by player or another NPC.
function _isTileOccupied(x, y, z, gameState, currentNpcId = null) {
    if (gameState.playerPos.x === x && gameState.playerPos.y === y && gameState.playerPos.z === z) {
        return true; // Occupied by player
    }
    return gameState.npcs.some(npc => {
        if (currentNpcId && npc.id === currentNpcId) {
            return false;
        }
        return npc.mapPos?.x === x &&
            npc.mapPos?.y === y &&
            npc.mapPos?.z === z &&
            npc.health?.torso?.current > 0;
    });
}
window._isTileOccupied = _isTileOccupied; // Make global if needed by other modules, or keep local

// Helper function (moved from combatManager.js)
// Checks if a tile is passable (walkable) and not occupied by another entity.
function _isTilePassableAndUnoccupiedForNpc(x, y, z, npcId, gameState) {
    const isPassable = window.mapRenderer && typeof window.mapRenderer.isWalkable === 'function' ?
        window.mapRenderer.isWalkable(x, y, z) : false;
    if (!isPassable) {
        // logToConsole(`_isTilePassableAndUnoccupiedForNpc: Tile (${x},${y},${z}) is not walkable.`, 'debug');
    }
    const isOccupied = _isTileOccupied(x, y, z, gameState, npcId);
    if (isOccupied) {
        // logToConsole(`_isTilePassableAndUnoccupiedForNpc: Tile (${x},${y},${z}) is occupied.`, 'debug');
    }
    return isPassable && !isOccupied;
}
window._isTilePassableAndUnoccupiedForNpc = _isTilePassableAndUnoccupiedForNpc; // Make global if needed


// NPC Movement function (moved from combatManager.js)
async function moveNpcTowardsTarget(npc, targetPos, gameState, assetManager, animationDuration = null) { // Added animationDuration
    if (!npc.mapPos || npc.currentMovementPoints <= 0 || !targetPos) return false;

    const path = window.findPath3D(npc.mapPos, targetPos, npc, window.mapRenderer.getCurrentMapData(), assetManager.tilesets);

    if (!path || path.length <= 1) {
        logToConsole(`NPC ${npc.name || npc.id}: No path to target or already at target. Path: ${JSON.stringify(path)}`, 'grey');
        return false;
    }

    const nextStep = path[1];

    // Check if the next step is a closed door that needs opening
    const nextStepTileIdRaw = gameState.mapLevels[nextStep.z.toString()]?.building?.[nextStep.y]?.[nextStep.x];
    const nextStepTileId = (typeof nextStepTileIdRaw === 'object' && nextStepTileIdRaw.tileId) ? nextStepTileIdRaw.tileId : nextStepTileIdRaw;
    let openedDoorInThisStep = false;

    if (nextStepTileId && assetManager.tilesets[nextStepTileId]) {
        const nextStepTileDef = assetManager.tilesets[nextStepTileId];
        if (nextStepTileDef.tags && nextStepTileDef.tags.includes("door") && nextStepTileDef.tags.includes("closed") && nextStepTileDef.isLocked !== true) {
            logToConsole(`NPC ${npc.name || npc.id}: Path leads to closed door '${nextStepTileDef.name}' at (${nextStep.x},${nextStep.y},${nextStep.z}). Attempting to open.`, 'cyan');
            if (await attemptOpenDoor(npc, nextStep, gameState, assetManager)) {
                openedDoorInThisStep = true; // Door opened, NPC can now attempt to move into it
            } else {
                logToConsole(`NPC ${npc.name || npc.id}: Failed to open door or insufficient MP. Move aborted.`, 'orange');
                return false; // Cannot open door, so cannot move there this turn
            }
        }
    }

    // Now check passability *after* attempting to open a door
    if (!openedDoorInThisStep && !_isTilePassableAndUnoccupiedForNpc(nextStep.x, nextStep.y, nextStep.z, npc.id, gameState)) {
        logToConsole(`NPC ${npc.name || npc.id}: Next step (${nextStep.x},${nextStep.y},${nextStep.z}) on path is blocked or occupied (after door check). Recalculate or wait.`, 'orange');
        return false;
    }
    // If a door was opened, the tile is now passable (the open version), so _isTilePassableAndUnoccupiedForNpc should pass for the new tile state.
    // However, the original check for passability is fine if the door opening attempt happens first and updates the map.
    // The cost of opening the door is handled in attemptOpenDoor. The move itself (1 MP) is handled by attemptCharacterMove.

    const originalPos = { ...npc.mapPos };
    let direction = null;

    if (nextStep.x > originalPos.x) direction = 'right';
    else if (nextStep.x < originalPos.x) direction = 'left';
    else if (nextStep.y > originalPos.y) direction = 'down';
    else if (nextStep.y < originalPos.y) direction = 'up';

    if (!direction) {
        logToConsole(`NPC ${npc.name || npc.id}: No clear cardinal direction to next step (${nextStep.x},${nextStep.y},${nextStep.z}) from (${originalPos.x},${originalPos.y},${originalPos.z}). Evaluating Z-change.`, 'grey');
        if (nextStep.z !== originalPos.z) {
            let canTransitionFromCurrentTile = false;
            const currentTileZStr = originalPos.z.toString();
            const currentMapData = window.mapRenderer.getCurrentMapData();
            const currentLevelData = currentMapData?.levels?.[currentTileZStr];
            let zTransitionDef = null;
            if (currentLevelData && assetManager?.tilesets) {
                const checkTileForZTransition = (tileIdOnLayer) => {
                    if (!tileIdOnLayer) return null;
                    const baseId = (typeof tileIdOnLayer === 'object' && tileIdOnLayer.tileId !== undefined) ? tileIdOnLayer.tileId : tileIdOnLayer;
                    if (baseId && assetManager.tilesets[baseId]) {
                        const def = assetManager.tilesets[baseId];
                        if (def.tags?.includes('z_transition') && def.target_dz !== undefined) {
                            if (originalPos.z + def.target_dz === nextStep.z) return def;
                        }
                    }
                    return null;
                };
                let npcTileOnMiddleRaw = currentLevelData.middle?.[originalPos.y]?.[originalPos.x];
                zTransitionDef = checkTileForZTransition(npcTileOnMiddleRaw);
                if (!zTransitionDef) {
                    let npcTileOnBottomRaw = currentLevelData.bottom?.[originalPos.y]?.[originalPos.x];
                    zTransitionDef = checkTileForZTransition(npcTileOnBottomRaw);
                }
                if (zTransitionDef) {
                    canTransitionFromCurrentTile = true;
                    logToConsole(`NPC ${npc.name || npc.id}: Is on a Z-transition tile ('${zTransitionDef.name}') that allows Z-change from ${originalPos.z} to ${nextStep.z}. Proceeding.`, 'grey');
                    direction = 'right'; // Arbitrary horizontal for attemptCharacterMove to handle Z
                } else {
                    logToConsole(`NPC ${npc.name || npc.id}: Path suggests Z-change from ${originalPos.z} to ${nextStep.z} at same X,Y, but NPC is not on a matching Z-transition tile. Move blocked.`, 'orange');
                    return false;
                }
            } else {
                logToConsole(`NPC ${npc.name || npc.id}: Lacking map data or tilesets to verify Z-transition at current location. Move blocked.`, 'orange');
                return false;
            }
        } else {
            logToConsole(`NPC ${npc.name || npc.id}: Path results in no change in X,Y,Z. Halting.`, 'orange');
            return false;
        }
    }
    if (!direction) {
        logToConsole(`NPC ${npc.name || npc.id}: Direction not set after path step evaluation. Halting.`, 'red');
        return false;
    }

    // Pass the animationDuration to attemptCharacterMove.
    // attemptCharacterMove itself doesn't play the animation; it just changes position.
    // The animation is played *after* a successful move.
    const moveSuccessful = await window.attemptCharacterMove(npc, direction, assetManager);

    if (moveSuccessful) {
        npc.movedThisTurn = true; // This flag is more relevant for combat.
        if (window.animationManager) {
            const finalAnimationDuration = animationDuration !== null ? animationDuration : (gameState.isInCombat ? 300 : 50); // Default combat:300, OOC:50
            await window.animationManager.playAnimation('movement', {
                entity: npc, startPos: originalPos, endPos: { ...npc.mapPos },
                sprite: npc.sprite, color: npc.color, duration: finalAnimationDuration
            });
        }
        logToConsole(`ACTION: ${npc.name || npc.id} moved ${direction}. New Pos: (${npc.mapPos.x},${npc.mapPos.y}, Z:${npc.mapPos.z}). MP Left: ${npc.currentMovementPoints}`, 'gold');
        if (gameState.combatCurrentAttacker === npc) { // This check might be less relevant if called OOC
            gameState.attackerMapPos = { ...npc.mapPos };
        }
        window.mapRenderer.scheduleRender();
        if (window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
        return true;
    } else {
        logToConsole(`NPC ${npc.name || npc.id}: attemptCharacterMove failed for direction ${direction}.`, 'orange');
        return false;
    }
}
window.moveNpcTowardsTarget = moveNpcTowardsTarget;

/**
 * Allows an NPC to attempt to open a door.
 * @param {object} npc - The NPC attempting to open the door.
 * @param {object} doorPos - The position {x, y, z} of the door tile.
 * @param {object} gameState - The global game state.
 * @param {object} assetManager - Instance of the AssetManager.
 * @returns {Promise<boolean>} True if the door was successfully opened, false otherwise.
 */
async function attemptOpenDoor(npc, doorPos, gameState, assetManager) {
    const { x, y, z } = doorPos;
    const zStr = z.toString();
    const mapLevels = gameState.mapLevels; // Assuming direct access or via mapRenderer.getCurrentMapData().levels
    const tileset = assetManager.tilesets;

    if (!mapLevels || !mapLevels[zStr] || !mapLevels[zStr].building) {
        logToConsole(`NPC ${npc.id}: Cannot open door at (${x},${y},${z}). Map data missing.`, "orange");
        return false;
    }

    const currentTileIdRaw = mapLevels[zStr].building[y]?.[x];
    const currentTileId = (typeof currentTileIdRaw === 'object' && currentTileIdRaw.tileId) ? currentTileIdRaw.tileId : currentTileIdRaw;

    if (currentTileId && tileset[currentTileId]) {
        const tileDef = tileset[currentTileId];
        if (tileDef.tags && tileDef.tags.includes("door") && tileDef.tags.includes("closed")) {
            if (tileDef.isLocked === true) {
                logToConsole(`NPC ${npc.id}: Door at (${x},${y},${z}) is locked. Cannot open.`, "orange");
                return false;
            }

            const openDoorCost = tileDef.openCost || 1; // Use defined openCost or default to 1 MP
            if (npc.currentMovementPoints < openDoorCost) {
                logToConsole(`NPC ${npc.id}: Not enough MP to open door at (${x},${y},${z}). Needs ${openDoorCost}, has ${npc.currentMovementPoints}.`, "orange");
                return false;
            }

            if (tileDef.opensToTileId && tileset[tileDef.opensToTileId]) {
                // Update the map data
                // If map stores full tile objects: { tileId: 'WOH', ...otherProps }
                // If map stores only IDs: 'WOH'
                // Assuming map stores object if currentTileIdRaw was object, else ID.
                if (typeof currentTileIdRaw === 'object') {
                    mapLevels[zStr].building[y][x] = { ...currentTileIdRaw, tileId: tileDef.opensToTileId };
                } else {
                    mapLevels[zStr].building[y][x] = tileDef.opensToTileId;
                }

                npc.currentMovementPoints -= openDoorCost;
                logToConsole(`NPC ${npc.id}: Opened door '${tileDef.name}' at (${x},${y},${z}). Cost: ${openDoorCost} MP. Remaining MP: ${npc.currentMovementPoints}.`, "cyan");

                // Play door opening sound/animation (optional)
                if (window.animationManager) {
                    // Could add a specific door opening animation if one exists
                    // window.animationManager.playAnimation('doorOpen', { pos: doorPos, duration: 300 });
                }
                window.mapRenderer.scheduleRender(); // Update visual
                return true;
            } else {
                logToConsole(`NPC ${npc.id}: Door '${tileDef.name}' at (${x},${y},${z}) has no opensToTileId or target tile def missing. Cannot open.`, "red");
                return false;
            }
        } else {
            // logToConsole(`NPC ${npc.id}: Tile at (${x},${y},${z}) is not a closed door. Current ID: ${currentTileId}`, "grey");
            return false; // Not a closed door
        }
    }
    // logToConsole(`NPC ${npc.id}: No tile/definition found at (${x},${y},${z}) to open.`, "grey");
    return false;
}
window.attemptOpenDoor = attemptOpenDoor;


// Helper to find nearest tile with specific tag or property
function findNearestInterestingTile(npc, gameState, assetManager, criteriaFn, radius = 20) {
    const mapData = window.mapRenderer.getCurrentMapData();
    if (!mapData || !mapData.levels) return null;

    let bestTile = null;
    let bestDist = Infinity;

    const startX = Math.max(0, npc.mapPos.x - radius);
    const endX = Math.min(mapData.dimensions.width, npc.mapPos.x + radius);
    const startY = Math.max(0, npc.mapPos.y - radius);
    const endY = Math.min(mapData.dimensions.height, npc.mapPos.y + radius);
    const z = npc.mapPos.z; // Search on same Z level for now

    const levelData = mapData.levels[z.toString()];
    if (!levelData) return null;

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            // Check both layers
            const bottomTileRaw = levelData.bottom?.[y]?.[x];
            const middleTileRaw = levelData.middle?.[y]?.[x];

            const bottomId = (typeof bottomTileRaw === 'object' && bottomTileRaw.tileId) ? bottomTileRaw.tileId : bottomTileRaw;
            const middleId = (typeof middleTileRaw === 'object' && middleTileRaw.tileId) ? middleTileRaw.tileId : middleTileRaw;

            const bottomDef = assetManager.tilesets[bottomId];
            const middleDef = assetManager.tilesets[middleId];

            if (criteriaFn(bottomDef, bottomTileRaw) || criteriaFn(middleDef, middleTileRaw)) {
                const dist = Math.abs(npc.mapPos.x - x) + Math.abs(npc.mapPos.y - y);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestTile = { x, y, z };
                }
            }
        }
    }
    return bestTile;
}
if (typeof window !== 'undefined') window.findNearestInterestingTile = findNearestInterestingTile; // Expose for testing

// Out-of-Combat Behavior (moved from combatManager.js)
async function handleNpcOutOfCombatTurn(npc, gameState, assetManager, maxMovesPerCycle = 3) {
    const npcName = npc.name || npc.id || "NPC_OOC";
    if (!npc || npc.health?.torso?.current <= 0 || npc.health?.head?.current <= 0) return;
    if (!npc.mapPos) return;

    if (gameState.currentTurn % gameState.npcMovementInterval !== 0) {
        return;
    }

    if (!npc.memory) {
        npc.memory = {
            lastSeenTargetPos: null, lastSeenTargetTimestamp: 0,
            recentlyVisitedTiles: [], explorationTarget: null,
            lastKnownSafePos: { ...npc.mapPos },
            actionCooldown: 0
        };
    }

    // Cooldown decrement
    if (npc.memory.actionCooldown > 0) {
        npc.memory.actionCooldown--;
        if (npc.memory.actionCooldown > 0) return; // Busy performing action
    }

    // Ensure companion specific fields are present if they are following
    if (npc.isFollowingPlayer && npc.currentOrders === undefined) {
        npc.currentOrders = "follow_close"; // Default order
    }


    let movesMadeThisCycle = 0;
    let pathfindingTarget = null; // Reset pathfinding target each turn for OOC companions unless specific order dictates otherwise

    // Companion Logic
    if (npc.isFollowingPlayer) {
        const FOLLOW_DISTANCE_THRESHOLD = 3; // Tiles
        const SCAVENGE_RADIUS = 5;

        switch (npc.currentOrders) {
            case "follow_close":
                const playerPos = gameState.playerPos;
                const distToPlayer = getDistance3D(npc.mapPos, playerPos);
                if (distToPlayer > FOLLOW_DISTANCE_THRESHOLD) {
                    pathfindingTarget = { ...playerPos };
                    // logToConsole(`NPC_OOC Companion ${npcName}: Following player. Target: (${playerPos.x},${playerPos.y},${playerPos.z})`, 'lime');
                } else {
                    // logToConsole(`NPC_OOC Companion ${npcName}: Close to player. Idling.`, 'lime');
                    npc.memory.explorationTarget = null; // Clear any old exploration target
                }
                break;
            case "wait_here":
                // logToConsole(`NPC_OOC Companion ${npcName}: Waiting at (${npc.mapPos.x},${npc.mapPos.y},${npc.mapPos.z}).`, 'lime');
                npc.memory.explorationTarget = null;
                // No movement, pathfindingTarget remains null.
                break;
            case "scavenge_area":
                if (!npc.memory.explorationTarget || (npc.mapPos.x === npc.memory.explorationTarget.x && npc.mapPos.y === npc.memory.explorationTarget.y && npc.mapPos.z === npc.memory.explorationTarget.z)) {
                    // Pick a new random point within SCAVENGE_RADIUS of current position
                    const mapData = window.mapRenderer.getCurrentMapData();
                    if (mapData && mapData.dimensions) {
                        let attempts = 0;
                        while (attempts < MAX_EXPLORATION_TARGET_ATTEMPTS) {
                            const angle = Math.random() * 2 * Math.PI;
                            const radius = 1 + Math.floor(Math.random() * (SCAVENGE_RADIUS - 1));
                            const targetX = Math.max(0, Math.min(mapData.dimensions.width - 1, Math.floor(npc.mapPos.x + Math.cos(angle) * radius)));
                            const targetY = Math.max(0, Math.min(mapData.dimensions.height - 1, Math.floor(npc.mapPos.y + Math.sin(angle) * radius)));
                            const targetZ = npc.mapPos.z; // Scavenge on same Z for now
                            if (window.mapRenderer.isWalkable(targetX, targetY, targetZ) && !_isTileOccupied(targetX, targetY, targetZ, gameState, npc.id)) {
                                npc.memory.explorationTarget = { x: targetX, y: targetY, z: targetZ };
                                break;
                            }
                            attempts++;
                        }
                    }
                }
                pathfindingTarget = npc.memory.explorationTarget;
                if (pathfindingTarget) {
                    // logToConsole(`NPC_OOC Companion ${npcName}: Scavenging towards (${pathfindingTarget.x},${pathfindingTarget.y},${pathfindingTarget.z}).`, 'lime');
                } else {
                    // logToConsole(`NPC_OOC Companion ${npcName}: Scavenging, but no valid exploration target found. Idling.`, 'lime');
                }
                break;
            default: // Same as follow_close
                const defaultPlayerPos = gameState.playerPos;
                const defaultDistToPlayer = getDistance3D(npc.mapPos, defaultPlayerPos);
                if (defaultDistToPlayer > FOLLOW_DISTANCE_THRESHOLD) {
                    pathfindingTarget = { ...defaultPlayerPos };
                }
                break;
        }

        // If player enters combat, companions should be aware and potentially join
        if (gameState.isInCombat && window.combatManager) {
            const playerIsInvolved = combatManager.initiativeTracker.some(e => e.entity === gameState.player);
            const companionInCombat = combatManager.initiativeTracker.some(e => e.entity === npc);
            if (playerIsInvolved && !companionInCombat) {
                // This is tricky: ideally combatManager handles adding participants.
                // For now, we can set a flag or ensure their AI switches to combat mode next turn.
                // Their combat AI (handleNpcCombatTurn) will then handle targeting.
                logToConsole(`NPC_OOC Companion ${npcName}: Player entered combat. ${npcName} will engage next turn if possible.`, "yellow");
                // Force an aggro update if possible?
                // Or simply rely on handleNpcCombatTurn's LOS checks.
            }
        }

    } else { // Standard Non-Companion OOC Logic & Goal Behaviors
        const npcBehavior = npc.behavior || "idle";

        // 1. Goal-Oriented Behavior
        let goalTarget = null;

        if (npcBehavior === "fish") {
            goalTarget = findNearestInterestingTile(npc, gameState, assetManager, (def) => def && def.tags && def.tags.includes('water'));
            if (goalTarget && getDistance3D(npc.mapPos, goalTarget) <= 1.5) {
                logToConsole(`NPC ${npcName} is fishing.`, 'cyan');
                npc.memory.actionCooldown = 5; // Busy for 5 cycles
                return;
            }
        } else if (npcBehavior === "chop_wood") {
            goalTarget = findNearestInterestingTile(npc, gameState, assetManager, (def) => def && (def.id === 'TRK' || (def.tags && (def.tags.includes('scavenge:wood') || def.tags.includes('tree')))));
            if (goalTarget && getDistance3D(npc.mapPos, goalTarget) <= 1.5) {
                logToConsole(`NPC ${npcName} is chopping wood.`, 'cyan');
                npc.memory.actionCooldown = 10;
                return;
            }
        } else if (npcBehavior === "farm") {
            goalTarget = findNearestInterestingTile(npc, gameState, assetManager, (def) => def && (def.tags && (def.tags.includes('farmland') || def.tags.includes('plantable'))));
            if (goalTarget && getDistance3D(npc.mapPos, goalTarget) <= 1) {
                logToConsole(`NPC ${npcName} is farming.`, 'cyan');
                npc.memory.actionCooldown = 8;
                return;
            }
        } else if (npcBehavior === "craft") {
            goalTarget = findNearestInterestingTile(npc, gameState, assetManager, (def) => def && (def.tags && def.tags.includes('crafting_station')));
            if (goalTarget && getDistance3D(npc.mapPos, goalTarget) <= 1.5) {
                logToConsole(`NPC ${npcName} is crafting.`, 'cyan');
                npc.memory.actionCooldown = 15;
                return;
            }
        } else if (npcBehavior === "scavenge") {
            goalTarget = findNearestInterestingTile(npc, gameState, assetManager, (def) => def && (def.tags && (def.tags.includes('container') || def.tags.includes('loose_item'))));
            if (goalTarget && getDistance3D(npc.mapPos, goalTarget) <= 1.5) {
                logToConsole(`NPC ${npcName} is scavenging.`, 'cyan');
                npc.memory.actionCooldown = 5;
                return;
            }
        } else if (npcBehavior === "patrol") {
            // Patrol logic: Move between random points or defined patrol points
            // For now, simple random patrol points
            if (!npc.memory.explorationTarget) {
                const mapData = window.mapRenderer.getCurrentMapData();
                if (mapData) {
                    let attempts = 0;
                    while (attempts < 5) {
                        const dist = 5 + Math.floor(Math.random() * 10);
                        const angle = Math.random() * 2 * Math.PI;
                        const tx = Math.floor(npc.mapPos.x + Math.cos(angle) * dist);
                        const ty = Math.floor(npc.mapPos.y + Math.sin(angle) * dist);
                        const tz = npc.mapPos.z;
                        if (tx >= 0 && tx < mapData.dimensions.width && ty >= 0 && ty < mapData.dimensions.height && window.mapRenderer.isWalkable(tx, ty, tz)) {
                            npc.memory.explorationTarget = { x: tx, y: ty, z: tz };
                            break;
                        }
                        attempts++;
                    }
                }
            }
            goalTarget = npc.memory.explorationTarget;
        } else if (npcBehavior === "guard_area") {
            // Guard logic: Return to spawn/safe pos if far, otherwise idle/scan
            const anchorPos = npc.memory.lastKnownSafePos || npc.mapPos;
            if (getDistance3D(npc.mapPos, anchorPos) > 5) {
                goalTarget = anchorPos;
            } else {
                // Idle / turn in place (simulated by small random move or no move)
                if (Math.random() < 0.2) {
                     // Pick a spot 1 tile away
                     // ... reuse finding code or let standard wander handle small moves
                }
            }
        } else if (npcBehavior === "search_for_people") {
             // Search for nearest living entity (player or NPC)
             let bestDist = Infinity;
             let bestTarget = null;

             // Check NPCs
             if (gameState.npcs) {
                 for (const otherNpc of gameState.npcs) {
                     if (otherNpc === npc || otherNpc.health.torso.current <= 0) continue;
                     const d = getDistance3D(npc.mapPos, otherNpc.mapPos);
                     if (d < bestDist) {
                         bestDist = d;
                         bestTarget = otherNpc.mapPos;
                     }
                 }
             }

             // Check Player
             const dPlayer = getDistance3D(npc.mapPos, gameState.playerPos);
             if (dPlayer < bestDist) {
                 bestDist = dPlayer;
                 bestTarget = gameState.playerPos;
             }

             goalTarget = bestTarget;

             if (goalTarget && bestDist <= 3) {
                 logToConsole(`NPC ${npcName} found someone.`, 'cyan');
                 npc.memory.actionCooldown = 5; // Chatting?
                 return;
             }
        }

        // --- NPC vs NPC Combat Initiation Check ---
        // Scan for hostile entities nearby to start combat
        if (!gameState.isInCombat) {
            let potentialCombatTarget = null;
            let bestThreatDist = Infinity;

            // Check Player
            if (npc.teamId !== gameState.player.teamId && getDistance3D(npc.mapPos, gameState.playerPos) <= 10) {
                // Simple LOS check (can use window.hasLineOfSight3D if available, here simple dist)
                if (window.hasLineOfSight3D && window.hasLineOfSight3D(npc.mapPos, gameState.playerPos, assetManager.tilesets, window.mapRenderer.getCurrentMapData())) {
                    potentialCombatTarget = gameState.player; // Target entity, not just pos
                    bestThreatDist = getDistance3D(npc.mapPos, gameState.playerPos);
                }
            }

            // Check other NPCs
            if (gameState.npcs) {
                for (const otherNpc of gameState.npcs) {
                    if (otherNpc === npc || otherNpc.health.torso.current <= 0) continue;
                    if (npc.teamId !== otherNpc.teamId) {
                        const d = getDistance3D(npc.mapPos, otherNpc.mapPos);
                        if (d <= 10 && d < bestThreatDist) {
                             if (window.hasLineOfSight3D && window.hasLineOfSight3D(npc.mapPos, otherNpc.mapPos, assetManager.tilesets, window.mapRenderer.getCurrentMapData())) {
                                potentialCombatTarget = otherNpc;
                                bestThreatDist = d;
                             }
                        }
                    }
                }
            }

            if (potentialCombatTarget) {
                logToConsole(`NPC ${npcName} spotted hostile ${potentialCombatTarget.name || "Target"}. Initiating combat!`, 'red');
                // Initiate combat. We must include the player in the participants list to ensure global combat state works correctly.
                // even if the player isn't the direct target.
                const participants = [npc, potentialCombatTarget];
                // Ensure player is included if not already
                if (potentialCombatTarget !== gameState.player) {
                    participants.push(gameState);
                } else {
                    participants[1] = gameState; // Ensure reference is correct
                }

                if (window.combatManager) {
                    window.combatManager.startCombat(participants, potentialCombatTarget === gameState ? gameState : potentialCombatTarget);
                    return; // End OOC turn immediately
                }
            }
        }
        // ------------------------------------------

        if (goalTarget) {
            pathfindingTarget = goalTarget;
        } else {
            // 2. Idle / No Goal Wandering (Low Chance)
            const wanderChance = 0.1; // 10% chance to start wandering if idle
            if (!npc.memory.explorationTarget && Math.random() < wanderChance) {
                // Pick a random target 1-6 tiles away
                const mapData = window.mapRenderer.getCurrentMapData();
                if (mapData) {
                    let attempts = 0;
                    while (attempts < 5) {
                        const dist = 1 + Math.floor(Math.random() * 6);
                        const angle = Math.random() * 2 * Math.PI;
                        const tx = Math.floor(npc.mapPos.x + Math.cos(angle) * dist);
                        const ty = Math.floor(npc.mapPos.y + Math.sin(angle) * dist);
                        const tz = npc.mapPos.z;

                        if (tx >= 0 && tx < mapData.dimensions.width && ty >= 0 && ty < mapData.dimensions.height &&
                            window.mapRenderer.isWalkable(tx, ty, tz)) {
                            npc.memory.explorationTarget = { x: tx, y: ty, z: tz };
                            break;
                        }
                        attempts++;
                    }
                }
            }
            pathfindingTarget = npc.memory.explorationTarget;
        }

        // Reaching target logic
        if (pathfindingTarget && npc.mapPos.x === pathfindingTarget.x && npc.mapPos.y === pathfindingTarget.y && npc.mapPos.z === pathfindingTarget.z) {
            // logToConsole(`NPC_OOC ${npcName}: Reached target.`, 'cyan');
            pathfindingTarget = null;
            npc.memory.explorationTarget = null;
        }

        if (pathfindingTarget && movesMadeThisCycle < maxMovesPerCycle) {
            const originalCombatMP = npc.currentMovementPoints; // Store and restore combat MP
            npc.currentMovementPoints = maxMovesPerCycle - movesMadeThisCycle; // Budget for OOC moves

            if (npc.currentMovementPoints > 0) {
                // Determine animation speed for OOC movement
                const oocAnimationDuration = 50; // Fast animation for out-of-combat

                // Call the moveNpcTowardsTarget now in npcDecisions.js, passing the animation duration
                if (await moveNpcTowardsTarget(npc, pathfindingTarget, gameState, assetManager, oocAnimationDuration)) {
                    // movesMadeThisCycle calculation is implicitly handled by loop limit, but we should update it
                    // effectively if we want to be strict. For now simple checks suffice.
                    npc.memory.lastKnownSafePos = { ...npc.mapPos };
                    const visitedKey = `${npc.mapPos.x},${npc.mapPos.y},${npc.mapPos.z}`;
                    if (!npc.memory.recentlyVisitedTiles.includes(visitedKey)) {
                        npc.memory.recentlyVisitedTiles.push(visitedKey);
                        if (npc.memory.recentlyVisitedTiles.length > RECENTLY_VISITED_MAX_SIZE) {
                            npc.memory.recentlyVisitedTiles.shift();
                        }
                    }
                    if (npc.memory.explorationTarget && npc.mapPos.x === npc.memory.explorationTarget.x && npc.mapPos.y === npc.memory.explorationTarget.y && npc.mapPos.z === npc.memory.explorationTarget.z) {
                        // logToConsole(`NPC_OOC ${npcName}: Reached OOC target. Clearing.`, 'cyan');
                        npc.memory.explorationTarget = null;
                    }
                } else {
                    if (npc.memory.explorationTarget && npc.memory.explorationTarget.x === pathfindingTarget.x && npc.memory.explorationTarget.y === pathfindingTarget.y && npc.memory.explorationTarget.z === pathfindingTarget.z) {
                        logToConsole(`NPC_OOC ${npcName}: Could not move to OOC target. Clearing.`, 'orange');
                        npc.memory.explorationTarget = null;
                    }
                }
            }
            npc.currentMovementPoints = originalCombatMP; // Restore combat MP
        }
    }
}
window.handleNpcOutOfCombatTurn = handleNpcOutOfCombatTurn;

// NPC Target Selection Logic for Combat (moved from combatManager.js)
function selectNpcCombatTarget(npc, gameState, initiativeTracker, assetManager) {
    const npcName = npc.name || npc.id || "NPC";
    const currentTilesets = window.assetManager ? window.assetManager.tilesets : null;
    const currentMapData = window.mapRenderer ? window.mapRenderer.getCurrentMapData() : null;

    logToConsole(`[selectNpcCombatTarget Entry for ${npcName}] assetManager valid: ${!!window.assetManager}, mapRenderer valid: ${!!window.mapRenderer}. currentTilesets keys: ${currentTilesets ? Object.keys(currentTilesets).length : 'N/A'}, currentMapData levels: ${currentMapData ? !!currentMapData.levels : 'N/A'}`, 'purple');

    gameState.combatCurrentDefender = null; // Reset before selection
    gameState.defenderMapPos = null;    // Reset before selection

    let potentialTargets = [];

    // 1. Consider existing aggro list (highest threat with LOS)
    if (npc.aggroList?.length > 0) {
        for (const aggroEntry of npc.aggroList) {
            const target = aggroEntry.entityRef;
            const isPlayer = target === gameState;
            const targetPos = isPlayer ? gameState.playerPos : target.mapPos;
            const targetHealth = isPlayer ? gameState.player.health : target.health;
            const targetTeamId = isPlayer ? gameState.player.teamId : target.teamId;

            if (target && target !== npc && targetHealth?.torso?.current > 0 && targetHealth?.head?.current > 0 &&
                targetTeamId !== npc.teamId && targetPos && initiativeTracker.find(e => e.entity === target)) {
                if (window.hasLineOfSight3D(npc.mapPos, targetPos, currentTilesets, currentMapData)) {
                    potentialTargets.push({ entity: target, pos: targetPos, threat: aggroEntry.threat, type: 'aggro' });
                }
            }
        }
    }

    // 2. Consider all enemies in initiative with LOS
    initiativeTracker.forEach(entry => {
        const candidate = entry.entity;
        const isPlayer = candidate === gameState;
        const candPos = isPlayer ? gameState.playerPos : candidate.mapPos;
        const candHealth = isPlayer ? gameState.player.health : candidate.health;
        const candTeamId = isPlayer ? gameState.player.teamId : candidate.teamId;

        if (candidate !== npc && candHealth?.torso?.current > 0 && candHealth?.head?.current > 0 &&
            candTeamId !== npc.teamId && npc.mapPos && candPos) {
            if (window.hasLineOfSight3D(npc.mapPos, candPos, currentTilesets, currentMapData)) {
                const dist = getDistance3D(npc.mapPos, candPos);
                // Add if not already in potentialTargets from aggro list
                if (!potentialTargets.some(pt => pt.entity === candidate)) {
                    potentialTargets.push({ entity: candidate, pos: candPos, distance: dist, type: 'initiative' });
                }
            }
        }
    });

    if (potentialTargets.length === 0) {
        // logToConsole(`NPC TARGETING: ${npcName} found no valid targets with LOS.`, 'orange');
        return false;
    }

    // Companion-specific targeting modifications
    if (npc.isFollowingPlayer) {
        const player = gameState; // Assuming player is always gameState for now
        const companions = gameState.companions.map(id => gameState.npcs.find(n => n.id === id)).filter(c => c);

        potentialTargets.forEach(pt => {
            pt.score = 0;
            // Base score: higher threat is better, closer is better for non-aggro
            if (pt.type === 'aggro') {
                pt.score += pt.threat * 10; // Weight threat heavily
            } else { // 'initiative' type
                pt.score -= pt.distance; // Closer is better
            }

            // Is target attacking player or a companion?
            // This is hard to determine directly without knowing who *target* is targeting.
            // Simplified: if target is close to player/companion and hostile, it's a threat.
            if (pt.entity !== player && !companions.includes(pt.entity)) { // Target is an enemy
                const distToPlayer = getDistance3D(pt.pos, player.playerPos);
                if (distToPlayer <= 5) pt.score += 50; // Threatening player

                companions.forEach(comp => {
                    if (comp && comp.mapPos) {
                        const distToComp = getDistance3D(pt.pos, comp.mapPos);
                        if (distToComp <= 3) pt.score += 30; // Threatening other companion
                    }
                });
            }
            // TODO: Add logic for companionBehaviorProfile (e.g., "healer_support" might de-prioritize attacking if allies need healing)
        });
        // TODO: Add more sophisticated target prioritization (e.g., wounded, high threat, squishy)
        // Example enhancements to pt.score:
        // - If pt.entity is "wounded" (e.g., <30% HP), pt.score += 20
        // - If pt.entity is "high_threat" (e.g., player, or specific NPC type), pt.score += 30
        // - If pt.entity is "squishy" (e.g., low armor/HP), pt.score += 10 (to finish off)
        // These would require access to target's health, definition, or dynamic threat assessment.

        potentialTargets.sort((a, b) => b.score - a.score); // Highest score first

    } else { // Non-companion: sort by threat then distance
        // TODO: Add more sophisticated target prioritization here too for non-companions.
        // Factors could include:
        // - Target is "wounded": Prioritize finishing them off.
        // - Target is "high threat": e.g., player character, heavily armed NPC.
        // - Target is "squishy": Easier to kill.
        // - Target is attacking NPC's allies (if NPC has allies and awareness).
        // This would involve calculating a 'priority_score' for each potential target.
        potentialTargets.sort((a, b) => {
            if (a.type === 'aggro' && b.type !== 'aggro') return -1;
            if (b.type === 'aggro' && a.type !== 'aggro') return 1;
            if (a.type === 'aggro' && b.type === 'aggro') return b.threat - a.threat; // Higher threat first
            return a.distance - b.distance; // Closer distance first for non-aggro
        });
    }

    const bestTarget = potentialTargets[0];
    if (bestTarget) {
        gameState.combatCurrentDefender = bestTarget.entity;
        gameState.defenderMapPos = { ...bestTarget.pos };
        logToConsole(`NPC TARGETING: ${npcName} selected ${bestTarget.entity === gameState ? "Player" : (bestTarget.entity.name || bestTarget.entity.id)}. Score/Details: ${JSON.stringify({ score: bestTarget.score, threat: bestTarget.threat, dist: bestTarget.distance })}`, 'gold');

        if (npc.memory) {
            npc.memory.lastSeenTargetPos = { ...gameState.defenderMapPos };
            npc.memory.lastSeenTargetTimestamp = gameState.currentTime?.totalTurns || 0;
            npc.memory.explorationTarget = null;
        }
        return true;
    }

    return false;
}
window.selectNpcCombatTarget = selectNpcCombatTarget;

/**
 * Evaluates and potentially executes a tactical drop for an NPC.
 * Moved from CombatManager.
 * @param {object} npc - The NPC considering the drop.
 * @param {object} gameState - The global game state.
 * @param {object} assetManager - Instance of the AssetManager.
 * @returns {Promise<boolean>} True if a drop action was successfully initiated, false otherwise.
 */
async function _evaluateAndExecuteNpcDrop(npc, gameState, assetManager) {
    if (!npc.mapPos || !gameState.combatCurrentDefender || !gameState.defenderMapPos || typeof window.mapRenderer?.isTileEmpty !== 'function' || typeof window.mapRenderer?.isWalkable !== 'function' || typeof window.npcShouldTakeFall !== 'function') {
        return false;
    }

    const currentTargetPos = gameState.defenderMapPos;
    const possibleDrops = [];
    const adjacentOffsets = [
        { dx: 0, dy: -1, dir: 'up' }, { dx: 0, dy: 1, dir: 'down' },
        { dx: -1, dy: 0, dir: 'left' }, { dx: 1, dy: 0, dir: 'right' }
    ];
    const mapData = window.mapRenderer.getCurrentMapData();
    if (!mapData || !mapData.dimensions) return false;

    for (const offset of adjacentOffsets) {
        const adjX = npc.mapPos.x + offset.dx;
        const adjY = npc.mapPos.y + offset.dy;
        const adjZ = npc.mapPos.z;

        if (adjX < 0 || adjX >= mapData.dimensions.width || adjY < 0 || adjY >= mapData.dimensions.height) continue;

        if (window.mapRenderer.isTileEmpty(adjX, adjY, adjZ)) {
            let landingZ = -Infinity;
            let currentScanZ = adjZ - 1;
            let foundLandingSpot = false;
            const minZLevel = Object.keys(mapData.levels).reduce((min, k) => Math.min(min, parseInt(k)), Infinity);

            for (let i = 0; i < 100 && currentScanZ >= minZLevel; i++) {
                if (window.mapRenderer.isWalkable(adjX, adjY, currentScanZ)) {
                    landingZ = currentScanZ;
                    foundLandingSpot = true;
                    break;
                }
                currentScanZ--;
            }

            if (foundLandingSpot) {
                const fallHeight = adjZ - landingZ;
                if (fallHeight > 0) {
                    if (window.npcShouldTakeFall(npc, fallHeight)) {
                        possibleDrops.push({
                            targetDropTile: { x: adjX, y: adjY, z: adjZ },
                            landingPos: { x: adjX, y: adjY, z: landingZ },
                            fallHeight: fallHeight,
                            direction: offset.dir
                        });
                    }
                }
            }
        }
    }

    if (possibleDrops.length > 0) {
        let bestDrop = null;
        let bestDropScore = -Infinity;

        for (const drop of possibleDrops) {
            let score = 0;
            const distToTargetAfterDrop = getDistance3D(drop.landingPos, currentTargetPos);
            score -= distToTargetAfterDrop;
            if (drop.landingPos.z === currentTargetPos.z) {
                score += 50;
                if (currentTargetPos.z < npc.mapPos.z) score += 25;
            }
            score -= drop.fallHeight * 2;
            if (score > bestDropScore) {
                bestDropScore = score;
                bestDrop = drop;
            }
        }

        if (bestDrop && (currentTargetPos.z < npc.mapPos.z && bestDrop.landingPos.z === currentTargetPos.z)) {
            logToConsole(`NPC ${npc.name || npc.id}: Decided tactical drop to (${bestDrop.targetDropTile.x},${bestDrop.targetDropTile.y}) -> Z:${bestDrop.landingPos.z}. Score: ${bestDropScore.toFixed(1)}`, "yellow");
            if (npc.currentMovementPoints > 0) {
                const mpBeforeMove = npc.currentMovementPoints;
                const moveSuccessful = await window.attemptCharacterMove(npc, bestDrop.direction, assetManager);
                if (moveSuccessful) {
                    if (npc.currentMovementPoints < mpBeforeMove) npc.movedThisTurn = true;
                    gameState.attackerMapPos = { ...npc.mapPos };
                    window.mapRenderer.scheduleRender();
                    if (window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
                    return true;
                } else {
                    logToConsole(`NPC ${npc.name || npc.id}: Tactical drop move initiation failed for direction ${bestDrop.direction}.`, "orange");
                }
            } else {
                logToConsole(`NPC ${npc.name || npc.id}: Wanted to drop but no MP.`, "orange");
            }
        }
    }
    return false;
}
// No window assignment for _evaluateAndExecuteNpcDrop as it's a local helper for handleNpcCombatTurn


/**
 * Handles the decision-making logic for an NPC's turn in combat.
 * @param {object} npc - The NPC object.
 * @param {object} gameState - The global game state.
 * @param {object} combatManager - Instance of CombatManager (for calling attack resolution).
 * @param {object} assetManager - Instance of AssetManager.
 * @returns {Promise<boolean>} True if an attack action was initiated (requiring combatManager to proceed), false otherwise.
 */
async function handleNpcCombatTurn(npc, gameState, combatManager, assetManager) {
    const npcName = npc.name || npc.id || "NPC";
    logToConsole(`NPC DECISIONS: ${npcName} starting combat turn (AP:${npc.currentActionPoints}, MP:${npc.currentMovementPoints})`, 'gold');

    // TODO: Overall NPC Combat AI Enhancements:
    // - Fleeing Behavior: If health is critically low (e.g., < 25%) and/or morale is broken (if morale system added),
    //   NPC should prioritize moving away from threats to a safe distance or off-map.
    //   This might involve finding the furthest valid tile from the highest threat.
    // - Alert Ally Behavior: If NPC encounters a threat and has allies nearby not in combat,
    //   it could spend an action/turn to "alert" them. Alerted allies would then join combat or become aware.
    //   Requires defining alert range and mechanism.
    // - Nuanced "Can't Reach" Logic: If pathfinding to primary target fails or no direct attack is possible:
    //   - Consider switching to a secondary target if available.
    //   - Reposition: Move to get better LOS, flank, or reach cover.
    //   - Use ranged attacks if melee is blocked, or vice-versa if possible.
    //   - If truly stuck, take defensive action or wait/delay turn.
    // - Utility Actions: If no good attack, consider:
    //   - Reloading: If weapon needs it (already partially handled in _handleRangedAttack).
    //   - Using beneficial items: Stimpacks if injured, combat drugs if available.
    //   - Using tactical items: Smoke grenades for cover, flashbangs to disorient.
    // - Out of Ammo Logic: If primary ranged weapon is out of all ammo (not just current mag):
    //   - Switch to secondary weapon (if any).
    //   - Switch to melee weapon (if any).
    //   - Attempt to find more ammo on the map (if scavenging AI is advanced).
    //   - Flee.
    // - Sophisticated Defensive Choices (in _handleDefensiveAction or similar):
    //   - Seek Cover: Identify nearby tiles offering cover from current threats and move there.
    //   - Use Defensive Items: e.g., painkiller, medkit if injured and safe to do so.
    //   - Fall Back: If outnumbered or taking heavy fire, move to a more defensible position.

    // Target selection using the function now in npcDecisions.js
    // selectNpcCombatTarget needs initiativeTracker, which combatManager holds.
    // This is a bit awkward. combatManager.executeNpcCombatTurn could pass its initiativeTracker.
    // For now, let's assume combatManager calls selectNpcCombatTarget itself before calling handleNpcCombatTurn,
    // or selectNpcCombatTarget is passed the tracker.
    // Plan update: selectNpcCombatTarget now takes initiativeTracker.
    // We'll need to ensure combatManager.initiativeTracker is passed here.
    // For now, this function will assume targeting is done if gameState.combatCurrentDefender is set.

    if (!gameState.combatCurrentDefender && !selectNpcCombatTarget(npc, gameState, combatManager.initiativeTracker, assetManager)) {
        logToConsole(`NPC ${npcName}: No primary combat target found. Considering secondary objectives or fallback movement.`, 'gold');

        // TODO: If no primary target, consider secondary objectives:
        // 1. Guard Point: If npc.behavior === "guard" and npc.guardPoint defined, move towards/scan around it.
        //    (Partially handled if handleNpcOutOfCombatTurn considers npc.memory.lastKnownSafePos as a guard point)
        // 2. Assist Ally: If allies are in combat nearby, move to support.
        //    - Find nearest ally in combat.
        //    - If ally is engaged in melee, consider moving to engage their attacker if possible.
        //    - If ally is ranged, consider moving to a position that offers covering fire or better LOS on ally's target.
        // 3. Use Item: If low health and has healing items, use one. If tactical advantage, use grenade/smoke.
        //    (Requires inventory and item use AI)
        // 4. Fallback to current behavior: exploration/memory movement (handleNpcOutOfCombatTurn).

        // Current fallback: OOC-like movement (exploration or returning to a point).
        const oocMoveBudget = Math.min(npc.currentMovementPoints, 2);
        if (oocMoveBudget > 0) {
            const tempOOCPoints = npc.currentMovementPoints;
            npc.currentMovementPoints = oocMoveBudget;
            await handleNpcOutOfCombatTurn(npc, gameState, assetManager, oocMoveBudget);
            npc.currentMovementPoints = tempOOCPoints - (oocMoveBudget - npc.currentMovementPoints); // Restore and deduct used OOC MP
        }
        return false; // No attack initiated
    }

    // Loop for combat actions (attack, move to attack, drop)
    for (let iter = 0; (npc.currentActionPoints > 0 || npc.currentMovementPoints > 0) && iter < 10; iter++) {
        // Re-evaluate target each iteration, in case it died or a higher priority one appears
        if (!selectNpcCombatTarget(npc, gameState, combatManager.initiativeTracker, assetManager)) {
            logToConsole(`NPC ${npcName}: Target lost mid-turn or no new target. Ending actions.`, 'orange');
            return false; // No attack can be made
        }
        let currentTarget = gameState.combatCurrentDefender;
        let currentTargetPos = gameState.defenderMapPos;

        if (!currentTarget || currentTarget.health?.torso?.current <= 0 || currentTarget.health?.head?.current <= 0) {
            if (!selectNpcCombatTarget(npc, gameState, combatManager.initiativeTracker, assetManager)) {
                logToConsole(`NPC ${npcName}: Target lost/defeated and no new target found. Ending combat actions.`, 'orange');
                return false; // No attack initiated
            }
            currentTarget = gameState.combatCurrentDefender;
            currentTargetPos = gameState.defenderMapPos;
            if (!currentTarget) break; // Break loop if still no target
        }

        let actionTakenInIter = false;
        const weaponToUse = npc.equippedWeaponId ? assetManager.getItem(npc.equippedWeaponId) : null;
        const attackType = weaponToUse ? (weaponToUse.type.includes("melee") ? "melee" : (weaponToUse.type.includes("firearm") || weaponToUse.type.includes("bow") || weaponToUse.type.includes("crossbow") || weaponToUse.type.includes("weapon_ranged_other") || weaponToUse.type.includes("thrown") ? "ranged" : "melee")) : "melee";
        const fireMode = weaponToUse?.fireModes?.includes("burst") ? "burst" : (weaponToUse?.fireModes?.[0] || "single");
        const distanceToTarget3D = npc.mapPos && currentTargetPos ? getDistance3D(npc.mapPos, currentTargetPos) : Infinity;

        // LOS check for ranged attacks (melee is implicitly LOS by distance 1.8)
        let hasLOStoTarget = false;
        if (attackType === 'ranged') {
            const currentTilesets = window.assetManager ? window.assetManager.tilesets : null;
            const currentMapData = window.mapRenderer ? window.mapRenderer.getCurrentMapData() : null;
            hasLOStoTarget = window.hasLineOfSight3D(npc.mapPos, currentTargetPos, currentTilesets, currentMapData);
        } else { // Melee
            hasLOStoTarget = (distanceToTarget3D <= 1.8); // Melee implies LOS if adjacent
        }

        const canAttack = ((attackType === 'melee' && distanceToTarget3D <= 1.8) || (attackType === 'ranged' && hasLOStoTarget));

        // TODO: Consider if NPC should use special abilities or items if available
        // - Check npc.abilities (if defined in their definition) for usable combat abilities (cooldowns, conditions).
        // - Check npc.inventory for usable items (grenades, stimpacks, special ammo).
        // - Decision logic:
        //   - If low health & has heal item -> use heal.
        //   - If multiple enemies clustered & has grenade -> use grenade.
        //   - If special attack available & conditions met (e.g., target flanked, NPC buffed) -> use ability.
        //   - Otherwise, standard weapon attack.
        // This would involve setting gameState.pendingCombatAction to a different actionType.

        if (canAttack && npc.currentActionPoints > 0) {
            logToConsole(`NPC DECISIONS: ${npcName} attacks ${currentTarget.name || "Player"} with ${weaponToUse ? weaponToUse.name : "Unarmed"}. Dist: ${distanceToTarget3D.toFixed(1)}, LOS: ${hasLOStoTarget}`, 'gold');
            gameState.pendingCombatAction = {
                target: currentTarget, weapon: weaponToUse, attackType,
                bodyPart: "torso", fireMode, actionType: "attack", entity: npc,
                actionDescription: `${attackType} by ${npcName}`
            };
            npc.currentActionPoints--;
            actionTakenInIter = true;
            return true; // Attack initiated, combatManager should handle the rest of the sequence
        } else if (npc.currentMovementPoints > 0) { // Try to move if cannot attack or need better position
            let moveTargetPos = currentTargetPos; // Default move towards current combat target

            if (npc.isFollowingPlayer) {
                const playerDist = getDistance3D(npc.mapPos, gameState.playerPos);
                const DEFEND_PLAYER_RADIUS = 3; // Stay within this radius of player if defending

                if ((npc.currentOrders === "defend_point" || npc.currentOrders === "follow_close" || npc.companionBehaviorProfile === "healer_support") &&
                    playerDist > DEFEND_PLAYER_RADIUS) {
                    // If too far from player while defending/following closely, prioritize moving towards player
                    moveTargetPos = gameState.playerPos;
                    logToConsole(`NPC ${npcName} (Companion): Prioritizing move towards player (Order: ${npc.currentOrders}, Profile: ${npc.companionBehaviorProfile}).`, 'lime');
                }
                // If "wait_here", NPC should not move to attack unless target is already in range (handled by `canAttack`)
                if (npc.currentOrders === "wait_here") {
                    logToConsole(`NPC ${npcName} (Companion): Holding position due to 'wait_here' order.`, 'lime');
                    moveTargetPos = null; // Prevent movement
                }
            }

            if (moveTargetPos) { // Only move if a valid moveTargetPos is set
                if (await _evaluateAndExecuteNpcDrop(npc, gameState, assetManager)) { // Drop is higher priority move
                    actionTakenInIter = true;
                } else {
                    // Pass current combat animation duration (e.g., 300ms)
                    if (await moveNpcTowardsTarget(npc, moveTargetPos, gameState, assetManager, 300)) {
                        actionTakenInIter = true;
                    }
                }
            }
        }

        if (!actionTakenInIter) {
            logToConsole(`NPC ${npcName}: No further action possible this iteration. AP:${npc.currentActionPoints}, MP:${npc.currentMovementPoints}`, 'grey');
            break; // No action taken, end NPC's combat actions for this turn
        }
        if (npc.currentActionPoints === 0 && npc.currentMovementPoints === 0) {
            logToConsole(`NPC ${npcName}: Out of AP and MP.`, 'grey');
            break; // Out of points
        }
    }
    return false; // No attack initiated, or ran out of iterations/points before attacking
}
window.handleNpcCombatTurn = handleNpcCombatTurn;


/**
 * Main entry point for an NPC's turn, called from combatManager or turnManager.
 * It determines if the NPC is in or out of combat and calls the appropriate handler.
 * @param {object} npc - The NPC object.
 * @param {object} gameState - The global game state.
 * @param {object} combatManager - Instance of the CombatManager.
 * @param {object} assetManager - Instance of the AssetManager.
 */
async function executeNpcTurn(npc, gameState, combatManager, assetManager) {
    if (!npc || npc.health?.torso?.current <= 0 || npc.health?.head?.current <= 0) {
        // logToConsole(`NPC ${npc?.id || 'Unknown'} is incapacitated. Skipping turn.`);
        return;
    }

    if (gameState.isInCombat) {
        // logToConsole(`NPC ${npc.id || npc.name}: Executing COMBAT turn.`);
        // Placeholder for actual combat logic call which will be moved here
        // await handleNpcCombatTurn(npc, gameState, combatManager, assetManager);
        if (combatManager && typeof combatManager.executeNpcCombatTurn === 'function') {
            await combatManager.executeNpcCombatTurn(npc); // Still calls old combatManager logic for now
        } else {
            logToConsole(`ERROR: combatManager.executeNpcCombatTurn not found for NPC ${npc.id}`, "red");
        }
    } else {
        // logToConsole(`NPC ${npc.id || npc.name}: Executing OUT-OF-COMBAT turn.`);
        await handleNpcOutOfCombatTurn(npc, gameState, assetManager); // Call the new local function
    }
}
window.executeNpcTurn = executeNpcTurn;