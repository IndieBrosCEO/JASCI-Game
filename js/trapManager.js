// js/trapManager.js

class TrapManager {
    constructor(gameState, assetManager, combatManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.combatManager = combatManager; // For applying damage/status effects
        this.trapDefinitions = {};
        this.logPrefix = "[TrapManager]";
    }

    async initialize() { // Keep async if other managers' initialize methods are, for consistency
        if (this.assetManager && this.assetManager.trapDefinitionsData) {
            this.trapDefinitions = this.assetManager.trapDefinitionsData;
            if (Object.keys(this.trapDefinitions).length === 0) {
                logToConsole(`${this.logPrefix} No trap definitions found or loaded from AssetManager.`, 'orange');
            } else {
                logToConsole(`${this.logPrefix} Initialized with ${Object.keys(this.trapDefinitions).length} trap definitions.`, 'blue');
            }
        } else {
            logToConsole(`${this.logPrefix} Error: Trap definitions (trapDefinitionsData) not found on AssetManager instance. Ensure 'traps.json' is loaded by AssetManager.`, 'red');
            this.trapDefinitions = {};
        }
        return true; // Indicate successful initialization, even if no traps loaded
    }

    /**
     * Loads traps for the current map from the provided map data.
     * @param {object} mapData - The loaded map data object containing a 'traps' array.
     */
    loadTrapsFromMapData(mapData) {
        this.gameState.currentMapTraps = []; // Clear traps from previous map

        if (mapData && mapData.traps && Array.isArray(mapData.traps)) {
            mapData.traps.forEach(trapData => {
                const newTrap = { ...trapData }; // Clone data
                // Ensure Z coordinate defaults to 0 if missing
                if (newTrap.z === undefined) {
                    newTrap.z = 0;
                }
                if (!newTrap.uniqueId) {
                    newTrap.uniqueId = `trap_${mapData.id}_${this.gameState.currentMapTraps.length}_${newTrap.x}_${newTrap.y}_${newTrap.z}_${Date.now()}`;
                }
                // Ensure state defaults to hidden if not specified
                if (!newTrap.state) {
                    newTrap.state = "hidden";
                }
                this.gameState.currentMapTraps.push(newTrap);
            });
            if (this.gameState.currentMapTraps.length > 0) {
                logToConsole(`${this.logPrefix} Loaded ${this.gameState.currentMapTraps.length} traps for map '${mapData.id}'.`, 'blue');
            }
        } else {
            // logToConsole(`${this.logPrefix} No traps found in map data for '${mapData ? mapData.id : "unknown"}'.`, 'grey');
        }
    }

    getTrapAt(x, y, z) {
        return this.gameState.currentMapTraps.find(trap => trap.x === x && trap.y === y && trap.z === z);
    }

    getTrapDefinition(trapDefId) {
        return this.trapDefinitions[trapDefId];
    }

    // --- Detection Logic ---
    /**
     * Checks for traps around the given entity's position.
     * Can be called on entity move or when an entity actively searches.
     * @param {object} entity - The entity (player or NPC with perception capabilities) checking for traps.
     * @param {boolean} isActiveSearch - True if entity is using an "Search for Traps" action.
     * @param {number} searchRadius - How many tiles away to check (e.g., 1 for adjacent, 0 for current tile).
     */
    checkForTraps(entity, isActiveSearch = false, searchRadius = 1) {
        if (!entity) {
            logToConsole(`${this.logPrefix} Cannot check for traps: entity is undefined.`, 'orange');
            return;
        }

        let entityMapPos = entity.mapPos;
        // If entity is player, use global playerPos if mapPos is missing (historical structure)
        if (!entityMapPos && entity === this.gameState.player) {
            entityMapPos = this.gameState.playerPos;
        }

        if (!entityMapPos) {
            // logToConsole(`${this.logPrefix} Cannot check for traps: entity.mapPos is undefined.`, 'orange');
            return;
        }

        const { x: entityX, y: entityY, z: entityZ } = entityMapPos;
        let trapsDetectedThisCheck = 0;

        this.gameState.currentMapTraps.forEach(trapInstance => {
            if (trapInstance.state === "hidden") {
                const distance = Math.max(Math.abs(trapInstance.x - entityX), Math.abs(trapInstance.y - entityY));
                if (trapInstance.z === entityZ && distance <= searchRadius) {
                    const trapDef = this.getTrapDefinition(trapInstance.trapDefId);
                    if (!trapDef) {
                        logToConsole(`${this.logPrefix} Trap definition ${trapInstance.trapDefId} not found for a trap at ${trapInstance.x},${trapInstance.y},${trapInstance.z}.`, 'red');
                        return;
                    }

                    let detectionRoll = rollDie(20) + getSkillModifier("Investigation", entity);
                    let dc = trapDef.detectionDC || 15; // Default DC if not specified

                    if (isActiveSearch) {
                        detectionRoll += 2; // Bonus for active search
                        logToConsole(`${this.logPrefix} Active search for trap '${trapDef.name}'. Bonus +2.`, 'silver');
                    }
                    // Optional: distance penalty for passive checks, but active search might be for adjacent.
                    // For simplicity, active search here implies focused effort on nearby tiles.

                    logToConsole(`${this.logPrefix} Checking for trap '${trapDef.name}' at (${trapInstance.x},${trapInstance.y}). Entity Invest. Roll: ${detectionRoll} vs DC: ${dc}`, 'grey');

                    if (detectionRoll >= dc) {
                        trapInstance.state = "detected";
                        trapsDetectedThisCheck++;
                        const detectionMessage = trapDef.messageOnDetect || `You spot a ${trapDef.name}!`;
                        logToConsole(detectionMessage, 'lime');
                        if (window.uiManager && entity === this.gameState.player) { // Show message to player
                            window.uiManager.showToastNotification(detectionMessage, 'info');
                        }
                        // TODO: Add to a list of things to announce to player at end of their action/turn
                    }
                }
            }
        });

        if (trapsDetectedThisCheck > 0) {
            if (window.mapRenderer) window.mapRenderer.scheduleRender(); // Update map to show detected traps
        }
        if (isActiveSearch && trapsDetectedThisCheck === 0 && entity === this.gameState.player) {
            if (window.uiManager) window.uiManager.showToastNotification("You search the area but find no traps.", 'info');
            logToConsole(`${this.logPrefix} Active search by player yielded no traps in radius ${searchRadius}.`, 'silver');
        }
    }

    // --- Disarm Logic ---
    /**
     * Player attempts to disarm a detected trap.
     * @param {string} trapUniqueId - The unique ID of the trap instance.
     * @param {object} entity - The entity attempting to disarm (usually player).
     */
    attemptDisarmTrap(trapUniqueId, entity) {
        const trapInstance = this.gameState.currentMapTraps.find(t => t.uniqueId === trapUniqueId);

        if (!trapInstance) {
            logToConsole(`${this.logPrefix} Attempted to disarm non-existent trap: ${trapUniqueId}`, 'red');
            return false; // Indicate failure
        }
        if (trapInstance.state !== "detected") {
            logToConsole(`${this.logPrefix} Trap ${trapInstance.trapDefId} at (${trapInstance.x},${trapInstance.y}) is not in 'detected' state. Current state: ${trapInstance.state}`, 'orange');
            // Optionally, allow disarming 'hidden' traps if player has some special ability or is very lucky, but typically requires detection.
            return false; // Indicate failure
        }

        const trapDef = this.getTrapDefinition(trapInstance.trapDefId);
        if (!trapDef) {
            logToConsole(`${this.logPrefix} Cannot disarm: Trap definition ${trapInstance.trapDefId} not found.`, 'red');
            return false; // Indicate failure
        }

        // TODO: Implement trap disarming mechanics (skill checks, tools)
        // This section is the primary implementation of the TODO.

        const skillToUse = trapDef.disarmSkill || "Sleight of Hand"; // Changed default from "Thievery" (invalid) to "Sleight of Hand"
        const dc = trapDef.disarmDC || 15;
        let skillModifier = getSkillModifier(skillToUse, entity); // Assumes getSkillModifier is globally available
        let toolUsed = null;

        // Resolve inventory to use (Player uses gameState.inventory, NPCs use entity.inventory)
        let inventoryItems = entity.inventory?.container?.items;
        if (entity === this.gameState.player) {
            inventoryItems = this.gameState.inventory.container ? this.gameState.inventory.container.items : null;
        }

        // Check for required tool and apply bonus/consumption
        if (trapDef.toolRequiredToDisarm) {
            const toolDef = trapDef.toolRequiredToDisarm;
            if (!window.inventoryManager || !window.inventoryManager.hasItem(toolDef.itemId, 1, inventoryItems)) {
                const toolName = window.assetManager ? (window.assetManager.getItem(toolDef.itemId)?.name || toolDef.itemId) : toolDef.itemId;
                logToConsole(`${this.logPrefix} Cannot attempt to disarm '${trapDef.name}'. Missing tool: ${toolName}.`, 'orange');
                if (window.uiManager && entity === this.gameState.player) window.uiManager.showToastNotification(`Missing ${toolName} to disarm!`, "error");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
                return false; // Cannot attempt without tool
            }
            toolUsed = toolDef.itemId;
            if (toolDef.bonus) {
                skillModifier += toolDef.bonus;
                logToConsole(`${this.logPrefix} Used ${toolUsed}, bonus +${toolDef.bonus} to disarm check.`, 'silver');
            }
        }

        const disarmRoll = rollDie(20);
        const totalRoll = disarmRoll + skillModifier;

        logToConsole(`${this.logPrefix} Attempting to disarm '${trapDef.name}'. Skill: ${skillToUse}, Roll: ${disarmRoll} + ${skillModifier} (mod) = ${totalRoll} vs DC: ${dc}`, 'silver');

        let disarmSuccess = false;
        if (totalRoll >= dc) {
            // Success
            disarmSuccess = true;
            trapInstance.state = "disarmed";
            const successMsg = trapDef.messageOnDisarmSuccess || `Successfully disarmed ${trapDef.name}.`;
            logToConsole(successMsg, 'green');
            if (window.uiManager && entity === this.gameState.player) {
                window.uiManager.showToastNotification(successMsg, 'success');
            }

            if (trapDef.xpOnDisarm && entity === this.gameState.player && window.xpManager) {
                window.xpManager.awardXp('disarm_trap', trapDef.xpOnDisarm, entity); // Use xpManager
                // logToConsole(`${this.logPrefix} Player awarded ${trapDef.xpOnDisarm} XP for disarming.`, 'lime'); // xpManager handles logging
            }

            if (trapDef.disarmedTileId && window.mapManager && typeof window.mapManager.updateTileOnLayer === 'function') {
                // Example: change the tile sprite to a "disarmed trap" sprite
                // window.mapManager.updateTileOnLayer(trapInstance.x, trapInstance.y, trapInstance.z, 'objects', trapDef.disarmedTileId);
                logToConsole(`${this.logPrefix} TODO: Update map tile for disarmed trap (visual change). Tile ID: ${trapDef.disarmedTileId}`, 'grey');
            }
            if (window.audioManager) window.audioManager.playSoundAtLocation('trap_disarm_success_01.wav', trapInstance, {}, { falloff: 'linear', maxDistance: 15 }); // Placeholder sound

        } else {
            // Failure
            disarmSuccess = false;
            const mishapChance = trapDef.mishapChanceOnFailure || 0.25; // Default 25% chance to trigger on fail
            const isCriticalFailure = disarmRoll === 1; // Natural 1 always a mishap?
            const isMishap = isCriticalFailure || (Math.random() < mishapChance);

            if (isMishap) {
                const mishapMsg = trapDef.messageOnDisarmFailureMishap || `Disarm failed and triggered ${trapDef.name}!`;
                logToConsole(mishapMsg, 'red');
                if (window.uiManager && entity === this.gameState.player) {
                    window.uiManager.showToastNotification(mishapMsg, 'error');
                }
                this.triggerTrap(trapInstance.uniqueId, entity); // Trap triggers
                if (window.audioManager) window.audioManager.playSoundAtLocation('trap_disarm_fail_trigger_01.wav', trapInstance, {}, { falloff: 'linear', maxDistance: 15 }); // Placeholder
            } else {
                const safeFailMsg = trapDef.messageOnDisarmFailureSafe || `Failed to disarm ${trapDef.name}, but it didn't trigger.`;
                logToConsole(safeFailMsg, 'orange');
                if (window.uiManager && entity === this.gameState.player) {
                    window.uiManager.showToastNotification(safeFailMsg, 'warning');
                }
                if (window.audioManager) window.audioManager.playSoundAtLocation('trap_disarm_fail_safe_01.wav', trapInstance, {}, { falloff: 'linear', maxDistance: 10 }); // Placeholder
            }
        }

        // Handle tool consumption based on success/failure and definition
        if (toolUsed && trapDef.toolRequiredToDisarm.consumes) {
            let consumeTool = false;
            if (trapDef.toolRequiredToDisarm.consumeCondition === "always") {
                consumeTool = true;
            } else if (trapDef.toolRequiredToDisarm.consumeCondition === "on_success" && disarmSuccess) {
                consumeTool = true;
            } else if (trapDef.toolRequiredToDisarm.consumeCondition === "on_failure" && !disarmSuccess) {
                consumeTool = true;
            } else if (!trapDef.toolRequiredToDisarm.consumeCondition) { // Default: consume on use (always)
                consumeTool = true;
            }

            if (consumeTool && window.inventoryManager) {
                window.inventoryManager.removeItems(toolUsed, 1, inventoryItems);
                const toolName = window.assetManager ? (window.assetManager.getItem(toolUsed)?.name || toolUsed) : toolUsed;
                logToConsole(`${this.logPrefix} Tool ${toolName} consumed.`, "grey");
                if (window.uiManager && entity === this.gameState.player) window.uiManager.showToastNotification(`${toolName} consumed.`, "info_minor");
            }
        }

        if (window.mapRenderer) window.mapRenderer.scheduleRender();
        return disarmSuccess;
    }

    // --- Trigger Logic ---
    /**
     * Triggers a specific trap.
     * @param {string} trapUniqueId - The unique ID of the trap instance.
     * @param {object} victimEntity - The entity that triggered the trap (player or NPC).
     */
    triggerTrap(trapUniqueId, victimEntity) {
        const trapInstance = this.gameState.currentMapTraps.find(t => t.uniqueId === trapUniqueId);

        if (!trapInstance) {
            logToConsole(`${this.logPrefix} Cannot trigger: Trap ${trapUniqueId} not found.`, 'red');
            return;
        }
        if (trapInstance.state === "disarmed" || trapInstance.state === "triggered") {
            logToConsole(`${this.logPrefix} Trap ${trapInstance.trapDefId} at (${trapInstance.x},${trapInstance.y}) already ${trapInstance.state}. Cannot trigger again.`, 'grey');
            return;
        }

        const trapDef = this.getTrapDefinition(trapInstance.trapDefId);
        if (!trapDef) {
            logToConsole(`${this.logPrefix} Cannot trigger: Trap definition ${trapInstance.trapDefId} not found.`, 'red');
            return;
        }

        const victimName = (victimEntity === this.gameState.player) ? "Player" : (victimEntity.name || victimEntity.id || "An entity");
        const triggerMessage = trapDef.messageOnTrigger || `${victimName} triggered a ${trapDef.name}!`;
        logToConsole(triggerMessage, 'red');
        if (window.uiManager && victimEntity === this.gameState.player) {
            window.uiManager.showToastNotification(triggerMessage, 'danger');
        }

        trapInstance.state = "triggered";

        // TODO: Play trap activation sound (specific to trapDef.id or type, e.g., trap_spike_trigger_01.wav)
        if (window.audioManager) {
            const soundName = trapDef.soundOnTrigger || 'trap_default_trigger_01.wav'; // Use specific or default
            window.audioManager.playSoundAtLocation(soundName, trapInstance, {}, { falloff: 'linear', maxDistance: 20 });
        }

        // Visual effect for trap activation (e.g., via AnimationManager)
        if (window.animationManager && trapDef.visualEffectOnTrigger) {
            const effectDef = trapDef.visualEffectOnTrigger;
            const animType = effectDef.type;

            // Construct data object for animation manager, merging trap instance data with definition data
            const animData = {
                ...effectDef,
                x: trapInstance.x,
                y: trapInstance.y,
                z: trapInstance.z,
                centerPos: { x: trapInstance.x, y: trapInstance.y, z: trapInstance.z }, // For explosion/gas
                startPos: { x: trapInstance.x, y: trapInstance.y, z: trapInstance.z }, // For projectiles
                attacker: { mapPos: { x: trapInstance.x, y: trapInstance.y, z: trapInstance.z }, name: trapDef.name }, // Trap acts as attacker
                entity: victimEntity // For effects on entity
            };

            // Determine target position
            if (effectDef.target === 'victim' && victimEntity && victimEntity.mapPos) {
                animData.targetPos = { ...victimEntity.mapPos };
                animData.endPos = { ...victimEntity.mapPos };
                animData.defender = victimEntity;
            } else {
                 // Default target/end to trap location if not victim (e.g. self-centered effect)
                 animData.targetPos = { x: trapInstance.x, y: trapInstance.y, z: trapInstance.z };
                 animData.endPos = { x: trapInstance.x, y: trapInstance.y, z: trapInstance.z };
            }

            // Specific overrides based on animation type if needed
            if (animType === 'explosion') {
                 animData.radius = effectDef.radius || 3;
            }

            window.animationManager.playAnimation(animType, animData);
            logToConsole(`${this.logPrefix} Playing visual effect '${animType}' for trap ${trapDef.name}.`, 'silver');
        }


        // Apply effects
        // TODO: Traps could have different effects: damage, status effects, alerts (This is the implementation area)
        if (trapDef.effects && Array.isArray(trapDef.effects)) {
            trapDef.effects.forEach(effect => {
                if (effect.type === "damage" && this.combatManager) {
                    const damageAmountStr = effect.amount || "1d4";
                    const damageType = effect.damageType || "Untyped";
                    const numProjectiles = effect.numProjectiles ? rollDiceNotation(parseDiceNotation(effect.numProjectiles)) : 1;

                    for (let i = 0; i < numProjectiles; i++) {
                        const rolledDamage = rollDiceNotation(parseDiceNotation(damageAmountStr));
                        if (rolledDamage > 0) {
                            logToConsole(`${this.logPrefix} Applying damage from '${trapDef.name}': ${rolledDamage} ${damageType} to ${victimName} (Projectile ${i + 1}/${numProjectiles}).`, 'orange');
                            // applyDamage(attacker, entity, bodyPartName, damageAmount, damageType, weapon)
                            // For traps, attacker can be null or a generic "Trap" entity. Body part is often random or torso.
                            this.combatManager.applyDamage({ name: trapDef.name, id: trapDef.id }, victimEntity, "torso", rolledDamage, damageType, { name: trapDef.name });
                        }
                    }
                } else if (effect.type === "status" && typeof window.statusEffectsManager?.applyStatusEffect === 'function') {
                    const target = (effect.target === "victim" || !effect.target) ? victimEntity : null; // Basic target logic
                    if (target) {
                        let apply = true;
                        if (effect.applyChance !== undefined && Math.random() > effect.applyChance) {
                            apply = false;
                        }
                        if (apply) {
                            logToConsole(`${this.logPrefix} Applying status effect '${effect.effectId}' from '${trapDef.name}' to ${victimName}. Duration: ${effect.duration}`, 'orange');
                            window.statusEffectsManager.applyStatusEffect(target, effect.effectId, effect.duration, trapDef.id);
                        } else {
                            logToConsole(`${this.logPrefix} Status effect '${effect.effectId}' from '${trapDef.name}' resisted by ${victimName} (chance).`, 'grey');
                        }
                    }
                } else if (effect.type === "alert") {
                    logToConsole(`${this.logPrefix} Trap '${trapDef.name}' sends out an alert: "${effect.message}". Radius: ${effect.radius || 10}`, 'yellow');
                    // TODO: Implement NPC alerting logic based on radius and sound propagation.
                    if (window.audioManager) window.audioManager.playSoundAtLocation('ui_alarm_01.wav', trapInstance, { volume: 0.8 }); // Placeholder
                }
                // Note: The structure supports various effects (damage, status, alert).
                // Status effect application depends on a global window.statusEffectsManager.
            });
        }

        if (trapDef.triggeredTile && window.mapManager && typeof window.mapManager.updateTileOnLayer === 'function') {
            // window.mapManager.updateTileOnLayer(trapInstance.x, trapInstance.y, trapInstance.z, 'item', trapDef.triggeredTile);
            logToConsole(`${this.logPrefix} TODO: Update map tile for triggered trap (visual change). Tile: ${trapDef.triggeredTile}`, 'grey');
        }

        // Sound was moved up to play before effects for better immediate feedback.

        if (window.mapRenderer) window.mapRenderer.scheduleRender();
    }

    /**
     * Called when a character enters a tile, to check for "onEnter" traps.
     * @param {object} characterEntity - The entity (player or NPC) entering the tile.
     * @param {number} x - Tile x-coordinate.
     * @param {number} y - Tile y-coordinate.
     * @param {number} z - Tile z-coordinate.
     */
    onCharacterEnterTile(characterEntity, x, y, z) {
        const trapInstance = this.getTrapAt(x, y, z);
        if (trapInstance && trapInstance.state === "hidden") { // Only hidden traps can be unknowingly triggered
            const trapDef = this.getTrapDefinition(trapInstance.trapDefId);
            if (trapDef && trapDef.triggerType === "onEnter") {
                logToConsole(`${this.logPrefix} Character ${characterEntity.name || characterEntity.id || 'Player'} entered tile with hidden '${trapDef.name}'. Triggering.`, 'magenta');
                this.triggerTrap(trapInstance.uniqueId, characterEntity);
            }
        } else if (trapInstance && trapInstance.state === "detected") {
            // If trap is detected, player might still trigger it if they choose to walk on it.
            // Or, NPCs might blunder into detected traps if their AI isn't smart enough.
            const trapDef = this.getTrapDefinition(trapInstance.trapDefId);
            if (trapDef && trapDef.triggerType === "onEnter") {
                logToConsole(`${this.logPrefix} Character ${characterEntity.name || characterEntity.id || 'Player'} entered tile with DETECTED '${trapDef.name}'. Triggering.`, 'magenta');
                // This assumes walking onto a detected "onEnter" trap still triggers it.
                // Some games might require an explicit "ignore and walk" action.
                this.triggerTrap(trapInstance.uniqueId, characterEntity);
            }
        }
    }

    // TODO: Player should be able to place traps from inventory. This would involve:
    // 1. UI for selecting a trap item from inventory.
    // 2. Entering a placement mode (similar to construction).
    // 3. Map click to choose location, with validation (e.g., valid surface, not on existing trap/object).
    // 4. Consuming the trap item.
    // 5. Adding a new trap instance to gameState.currentMapTraps.
    // 6. Potential skill check (e.g., Traps/Survival) for successful placement or effectiveness.
    // 7. AP/Time cost.
    // A new method like `placePlayerTrap(trapItemId, x, y, z, placerEntity)` would be needed.

    /**
     * Player attempts to place a trap item from their inventory.
     * @param {string} trapItemId - The item ID of the trap to place.
     * @param {number} x - Target x-coordinate.
     * @param {number} y - Target y-coordinate.
     * @param {number} z - Target z-coordinate.
     * @param {object} placerEntity - The entity placing the trap (usually player).
     * @returns {boolean} True if placement was successful, false otherwise.
     */
    attemptPlaceTrap(trapItemId, x, y, z, placerEntity) {
        // Handle Player entity vs NPC entity structure difference
        let inventoryToUse = placerEntity.inventory;
        let mapPosToUse = placerEntity.mapPos;

        if (placerEntity === this.gameState.player) {
             inventoryToUse = this.gameState.inventory;
             mapPosToUse = this.gameState.playerPos;
        }

        if (!placerEntity || !inventoryToUse || !mapPosToUse) {
            logToConsole(`${this.logPrefix} Invalid placer entity for trap placement.`, 'red');
            return false;
        }

        const trapItemDef = this.assetManager.getItem(trapItemId);
        if (!trapItemDef || trapItemDef.type !== "TRAP_ITEM") { // Assuming a type for placeable trap items
            logToConsole(`${this.logPrefix} Item ${trapItemId} is not a placeable trap.`, 'orange');
            if (window.uiManager) window.uiManager.showToastNotification("Not a placeable trap.", "warning");
            return false;
        }

        const trapDefId = trapItemDef.placesTrapId; // The actual trap definition ID this item places
        const trapDef = this.getTrapDefinition(trapDefId);
        if (!trapDef) {
            logToConsole(`${this.logPrefix} Trap definition ${trapDefId} not found for item ${trapItemId}.`, 'red');
            return false;
        }

        // 1. Validate location (e.g., valid surface, not on existing trap/object, not in wall)
        if (window.mapUtils && !window.mapUtils.isTilePassable(x, y, z, placerEntity, false)) { // Check if generally placeable, ignore entities for now
            logToConsole(`${this.logPrefix} Cannot place trap at (${x},${y},${z}): Location not suitable (e.g. wall).`, 'orange');
            if (window.uiManager) window.uiManager.showToastNotification("Cannot place trap there (obstructed).", "warning");
            return false;
        }
        if (this.getTrapAt(x, y, z)) {
            logToConsole(`${this.logPrefix} Cannot place trap at (${x},${y},${z}): Another trap already exists there.`, 'orange');
            if (window.uiManager) window.uiManager.showToastNotification("Another trap is already here.", "warning");
            return false;
        }

        // Validate terrain requirements
        if (trapDef.placeableOnTerrain && Array.isArray(trapDef.placeableOnTerrain)) {
            const tileData = window.mapManager.getTileAt(x, y, z, 'bottom'); // Check bottom layer for terrain type
            let isValidTerrain = false;

            if (tileData) {
                // tileData can be a string ID or an object { tileId: "ID", ... }
                const tileId = (typeof tileData === 'object' && tileData.tileId) ? tileData.tileId : tileData;
                if (tileId && this.assetManager.tilesets[tileId]) {
                    const tileDef = this.assetManager.tilesets[tileId];
                    const tileTags = tileDef.tags || [];
                    // Check if any required terrain tag matches the tile's tags
                    isValidTerrain = trapDef.placeableOnTerrain.some(reqTag => tileTags.includes(reqTag));
                }
            } else {
                // If checking tags directly from a mock or simple data structure (fallback)
                if (tileData && tileData.tags) {
                    isValidTerrain = trapDef.placeableOnTerrain.some(reqTag => tileData.tags.includes(reqTag));
                }
            }

            if (!isValidTerrain) {
                logToConsole(`${this.logPrefix} Cannot place trap at (${x},${y},${z}): Terrain not suitable. Requires: ${trapDef.placeableOnTerrain.join(', ')}`, 'orange');
                if (window.uiManager) window.uiManager.showToastNotification(`Must be placed on: ${trapDef.placeableOnTerrain.join(' or ')}`, "warning");
                return false;
            }
        }

        // 2. Skill Check (e.g., Traps/Survival) for successful placement or effectiveness.
        const skillToUse = trapDef.placementSkill || "Survival"; // Or "Traps" if such a skill exists
        const placementDC = trapDef.placementDC || 10;
        const skillModifier = getSkillModifier(skillToUse, placerEntity);
        const placementRoll = rollDie(20) + skillModifier;

        logToConsole(`${this.logPrefix} Attempting to place trap '${trapDef.name}'. Skill: ${skillToUse}, Roll: ${placementRoll} vs DC: ${placementDC}`, 'silver');

        if (placementRoll < placementDC) {
            logToConsole(`${this.logPrefix} Failed to place trap '${trapDef.name}'. Skill check failed.`, 'orange');
            if (window.uiManager && placerEntity === this.gameState.player) window.uiManager.showToastNotification(`Failed to place ${trapDef.name} (skill check).`, "warning");
            // Optional: Consume item even on failure? Or only on critical failure?
            if (rollDie(4) === 1) { // 25% chance to consume item on placement failure
                window.inventoryManager.removeItems(trapItemId, 1, inventoryToUse.container.items);
                if (window.uiManager && placerEntity === this.gameState.player) window.uiManager.showToastNotification(`${trapItemDef.name} was wasted!`, "error");
            }
            if (window.audioManager) window.audioManager.playSoundAtLocation('trap_place_fail_01.wav', { x, y, z }, {}, { falloff: 'linear', maxDistance: 10 });
            return false;
        }

        // 3. Consume the trap item.
        if (!window.inventoryManager.removeItems(trapItemId, 1, inventoryToUse.container.items)) {
            logToConsole(`${this.logPrefix} Failed to place trap: Could not remove ${trapItemId} from inventory (should not happen if hasItem was checked prior).`, 'red');
            return false; // Should have been checked before calling this
        }

        // 4. Add a new trap instance to gameState.currentMapTraps.
        const newTrapInstance = {
            trapDefId: trapDefId,
            x: x,
            y: y,
            z: z,
            state: "hidden", // Placed traps are initially hidden
            uniqueId: `trap_${this.gameState.currentMapId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            placedBy: placerEntity.id // Optional: track who placed it
        };
        this.gameState.currentMapTraps.push(newTrapInstance);

        const successMsg = trapDef.messageOnPlaceSuccess || `Successfully placed ${trapDef.name}.`;
        logToConsole(successMsg, 'green');
        if (window.uiManager && placerEntity === this.gameState.player) {
            window.uiManager.showToastNotification(successMsg, 'success');
        }
        if (window.audioManager) window.audioManager.playSoundAtLocation(trapDef.soundOnPlace || 'trap_place_success_01.wav', { x, y, z }, {}, { falloff: 'linear', maxDistance: 15 });


        // 5. AP/Time cost - should be handled by the caller (e.g., Interaction.js or TurnManager.js)
        // Example: placerEntity.spendActionPoints(AP_COST_PLACE_TRAP);

        // 6. XP Award
        if (trapDef.xpOnPlace && placerEntity === this.gameState.player && window.xpManager) {
            window.xpManager.awardXp('place_trap', trapDef.xpOnPlace, placerEntity);
        }

        if (window.mapRenderer) window.mapRenderer.scheduleRender(); // To show the trap if it has a visible "hidden" state sprite
        return true;
    }
}

// Make it globally accessible
window.TrapManager = TrapManager;

// Example of how it might be instantiated and initialized in your main script:
// if (!window.trapManager) {
//     window.trapManager = new TrapManager(window.gameState, window.assetManager, window.combatManager);
//     window.trapManager.initialize();
//     // Call loadTrapsForMap when a map is loaded, e.g., in your mapManager.loadMap function
// }
