// js/trapManager.js

class TrapManager {
    constructor(gameState, assetManager, combatManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.combatManager = combatManager; // For applying damage/status effects
        this.trapDefinitions = {};
        this.logPrefix = "[TrapManager]";
    }

    async initialize() {
        try {
            this.trapDefinitions = await this.assetManager.loadData('assets/definitions/traps.json');
            if (Object.keys(this.trapDefinitions).length === 0) {
                logToConsole(`${this.logPrefix} No trap definitions found or loaded.`, 'orange');
            } else {
                logToConsole(`${this.logPrefix} Initialized with ${Object.keys(this.trapDefinitions).length} trap definitions.`, 'blue');
            }
        } catch (error) {
            logToConsole(`${this.logPrefix} Error loading trap definitions: ${error.message}`, 'red');
            this.trapDefinitions = {}; // Ensure it's an empty object on error
        }
    }

    /**
     * Loads traps for the current map.
     * This would typically read trap placements from the map data.
     * For now, it can include hardcoded traps for testing.
     * @param {string} mapId - The ID of the map being loaded.
     */
    loadTrapsForMap(mapId) {
        this.gameState.currentMapTraps = []; // Clear traps from previous map

        // TODO: Replace this with actual map data loading
        // Example hardcoded traps for testing:
        if (mapId === "test_map_with_traps") { // Assume a mapId where we want to test traps
            this.gameState.currentMapTraps.push(
                { trapDefId: "spike_pit_simple", x: 5, y: 5, z: 0, state: "hidden", uniqueId: `trap_${Date.now()}_${Math.random()}` },
                { trapDefId: "pressure_plate_darts", x: 7, y: 7, z: 0, state: "hidden", uniqueId: `trap_${Date.now()}_${Math.random() + 1}` }
            );
            logToConsole(`${this.logPrefix} Loaded hardcoded traps for map '${mapId}'. Count: ${this.gameState.currentMapTraps.length}`, 'blue');
        } else if (mapId === "tutorial_map") { // Example for another map
            this.gameState.currentMapTraps.push(
                { trapDefId: "tripwire_alarm", x: 3, y: 8, z: 0, state: "hidden", uniqueId: `trap_${Date.now()}_${Math.random() + 2}` }
            );
            logToConsole(`${this.logPrefix} Loaded hardcoded traps for tutorial_map. Count: ${this.gameState.currentMapTraps.length}`, 'blue');
        }
        // Ensure all traps have a unique ID for easier reference
        this.gameState.currentMapTraps.forEach((trap, index) => {
            if (!trap.uniqueId) {
                trap.uniqueId = `trap_${mapId}_${index}_${trap.x}_${trap.y}_${trap.z}`;
            }
        });
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
        if (!entity || !entity.mapPos) {
            logToConsole(`${this.logPrefix} Cannot check for traps: entity or entity.mapPos is undefined.`, 'orange');
            return;
        }
        const { x: entityX, y: entityY, z: entityZ } = entity.mapPos;
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
            return;
        }
        if (trapInstance.state !== "detected") {
            logToConsole(`${this.logPrefix} Trap ${trapInstance.trapDefId} at (${trapInstance.x},${trapInstance.y}) is not in 'detected' state. Current state: ${trapInstance.state}`, 'orange');
            return;
        }

        const trapDef = this.getTrapDefinition(trapInstance.trapDefId);
        if (!trapDef) {
            logToConsole(`${this.logPrefix} Cannot disarm: Trap definition ${trapInstance.trapDefId} not found.`, 'red');
            return;
        }

        const skillToUse = trapDef.disarmSkill || "Investigation";
        const dc = trapDef.disarmDC || 15;
        const disarmRoll = rollDie(20);
        const skillModifier = getSkillModifier(skillToUse, entity);
        const totalRoll = disarmRoll + skillModifier;

        logToConsole(`${this.logPrefix} Attempting to disarm '${trapDef.name}'. Skill: ${skillToUse}, Roll: ${disarmRoll} + ${skillModifier} (mod) = ${totalRoll} vs DC: ${dc}`, 'silver');

        if (totalRoll >= dc) {
            // Success
            trapInstance.state = "disarmed";
            const successMsg = trapDef.messageOnDisarmSuccess || `Successfully disarmed ${trapDef.name}.`;
            logToConsole(successMsg, 'green');
            if (window.uiManager && entity === this.gameState.player) {
                window.uiManager.showToastNotification(successMsg, 'success');
            }

            if (trapDef.xpOnDisarm && entity === this.gameState.player) {
                this.gameState.playerXP += trapDef.xpOnDisarm;
                logToConsole(`${this.logPrefix} Player awarded ${trapDef.xpOnDisarm} XP for disarming. Total XP: ${this.gameState.playerXP}`, 'lime');
                // TODO: Check for level up if characterManager exists
                if (window.renderCharacterInfo) window.renderCharacterInfo();
            }

            if (trapDef.disarmedTile && window.mapManager && typeof window.mapManager.updateTileOnLayer === 'function') {
                // Assuming traps are primarily on 'item' or a dedicated 'trap' layer.
                // For now, let's assume 'item' layer for visual change.
                // This might need adjustment based on how traps are visually represented.
                // window.mapManager.updateTileOnLayer(trapInstance.x, trapInstance.y, trapInstance.z, 'item', trapDef.disarmedTile);
                logToConsole(`${this.logPrefix} TODO: Update map tile for disarmed trap (visual change). Tile: ${trapDef.disarmedTile}`, 'grey');
            }
            if (window.audioManager) window.audioManager.playUiSound('ui_positive_feedback_01.wav'); // Placeholder for disarm success sound

        } else {
            // Failure
            // Simple mishap: critical failure (natural 1) on roll OR roll significantly below DC
            const mishapChance = trapDef.mishapChanceOnFailure || 0.25; // Default 25% chance to trigger on fail
            const isMishap = disarmRoll === 1 || (Math.random() < mishapChance);

            if (isMishap) {
                const mishapMsg = trapDef.messageOnDisarmFailureMishap || `Disarm failed and triggered ${trapDef.name}!`;
                logToConsole(mishapMsg, 'red');
                if (window.uiManager && entity === this.gameState.player) {
                    window.uiManager.showToastNotification(mishapMsg, 'error');
                }
                this.triggerTrap(trapInstance.uniqueId, entity); // Trap triggers
                if (window.audioManager) window.audioManager.playUiSound('ui_error_02.wav'); // Placeholder for disarm fail + trigger sound
            } else {
                const safeFailMsg = trapDef.messageOnDisarmFailureSafe || `Failed to disarm ${trapDef.name}, but it didn't trigger.`;
                logToConsole(safeFailMsg, 'orange');
                if (window.uiManager && entity === this.gameState.player) {
                    window.uiManager.showToastNotification(safeFailMsg, 'warning');
                }
                // Trap remains 'detected'. Could add logic for increased DC or locking.
                if (window.audioManager) window.audioManager.playUiSound('ui_negative_feedback_01.wav'); // Placeholder for disarm safe fail sound
            }
        }
        if (window.mapRenderer) window.mapRenderer.scheduleRender();
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

        // Apply effects
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
                            this.combatManager.applyDamage({ name: trapDef.name, id: trapDef.id }, victimEntity, "Torso", rolledDamage, damageType, { name: trapDef.name });
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
            });
        }

        if (trapDef.triggeredTile && window.mapManager && typeof window.mapManager.updateTileOnLayer === 'function') {
            // window.mapManager.updateTileOnLayer(trapInstance.x, trapInstance.y, trapInstance.z, 'item', trapDef.triggeredTile);
            logToConsole(`${this.logPrefix} TODO: Update map tile for triggered trap (visual change). Tile: ${trapDef.triggeredTile}`, 'grey');
        }

        // Standard trap trigger sound
        if (window.audioManager) {
            // Choose sound based on trap type if possible, e.g., spike_trap_trigger.wav, dart_trap_fire.wav
            window.audioManager.playSoundAtLocation('ui_error_02.wav', trapInstance, { volume: 0.7 }); // Generic trigger sound
        }

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
}

// Make it globally accessible
window.TrapManager = TrapManager;

// Example of how it might be instantiated and initialized in your main script:
// if (!window.trapManager) {
//     window.trapManager = new TrapManager(window.gameState, window.assetManager, window.combatManager);
//     window.trapManager.initialize();
//     // Call loadTrapsForMap when a map is loaded, e.g., in your mapManager.loadMap function
// }
