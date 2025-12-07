// js/npcManager.js

class NpcManager {
    constructor(gameState, assetManager, mapUtils) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.mapUtils = mapUtils; // For area resolution and placement logic
        this.logPrefix = "[NpcManager]";
    }

    initialize() {
        // Placeholder for any specific initialization NpcManager might need
        logToConsole(`${this.logPrefix} Initialized.`, "blue");
    }

    getNpcById(npcId) {
        if (!this.gameState || !this.gameState.npcs) return null;
        return this.gameState.npcs.find(npc => npc.id === npcId);
    }

    /**
     * Spawns a group of NPCs based on a group ID or a single NPC definition ID into a specified area.
     * @param {string} groupIdOrDefId - ID of an NPC group definition or a single NPC definition.
     * @param {string} areaKey - A key representing the area to spawn in (e.g., "player_vicinity", "outpost_alpha").
     * @param {number|string} countOrDice - Number of NPCs to spawn, or dice notation (e.g., "1d4").
     * @param {string} [targetFactionIdForHostility=null] - Optional faction ID to make the spawned NPCs hostile towards.
     * @param {string} [eventInstanceId=null] - Optional ID of the event triggering this spawn, for tracking.
     * @returns {Array<string>} An array of IDs of the spawned NPC instances.
     */
    spawnNpcGroupInArea(groupIdOrDefId, areaKey, countOrDice, targetFactionIdForHostility = null, eventInstanceId = null) {
        const spawnedNpcIds = [];
        if (!this.assetManager || !this.gameState || !this.mapUtils || !window.mapRenderer) {
            logToConsole(`${this.logPrefix} Error: Missing core managers (asset, gameState, mapUtils, mapRenderer).`, "error");
            return spawnedNpcIds;
        }

        const count = typeof countOrDice === 'string' ? rollDiceNotation(parseDiceNotation(countOrDice)) : countOrDice;
        if (count <= 0) return spawnedNpcIds;

        // TODO: Implement NPC Group Definitions. For now, groupIdOrDefId is treated as a single NPC definition ID.
        const npcDef = this.assetManager.getNpc(groupIdOrDefId);
        if (!npcDef) {
            logToConsole(`${this.logPrefix} Error: NPC definition not found for ID/Tag: ${groupIdOrDefId}.`, "error");
            return spawnedNpcIds;
        }

        // Resolve areaKey to coordinates
        let centerX, centerY, centerZ;
        const spawnRadius = 10; // Default radius if areaKey doesn't specify one

        // Example areaKey resolution (needs to be more robust using mapUtils)
        if (areaKey === "player_vicinity_event") {
            centerX = this.gameState.playerPos.x;
            centerY = this.gameState.playerPos.y;
            centerZ = this.gameState.playerPos.z;
        } else {
            const namedLocation = this.mapUtils.getNamedLocationCoords(areaKey);
            if (namedLocation) {
                centerX = namedLocation.x;
                centerY = namedLocation.y;
                centerZ = namedLocation.z;
            } else {
                logToConsole(`${this.logPrefix} areaKey "${areaKey}" not specifically handled, defaulting to player vicinity.`, "warn");
                centerX = this.gameState.playerPos.x;
                centerY = this.gameState.playerPos.y;
                centerZ = this.gameState.playerPos.z;
            }
        }

        for (let i = 0; i < count; i++) {
            let spawnAttempts = 0;
            let spawned = false;
            while (spawnAttempts < 20 && !spawned) {
                const angle = Math.random() * 2 * Math.PI;
                const dist = Math.random() * spawnRadius;
                const spawnX = Math.floor(centerX + Math.cos(angle) * dist);
                const spawnY = Math.floor(centerY + Math.sin(angle) * dist);
                const spawnZ = centerZ; // Spawn on same Z as center for now

                const currentMapData = window.mapRenderer.getCurrentMapData();
                if (!currentMapData || !currentMapData.dimensions ||
                    spawnX < 0 || spawnX >= currentMapData.dimensions.width ||
                    spawnY < 0 || spawnY >= currentMapData.dimensions.height) {
                    spawnAttempts++;
                    continue; // Out of bounds
                }

                // Use the global _isTilePassableAndUnoccupiedForNpc from npcDecisions.js
                if (window._isTilePassableAndUnoccupiedForNpc && window._isTilePassableAndUnoccupiedForNpc(spawnX, spawnY, spawnZ, null, this.gameState)) {
                    const newNpcInstance = JSON.parse(JSON.stringify(npcDef));
                    newNpcInstance.id = `evt_${eventInstanceId ? eventInstanceId.slice(-4) : 'g'}_${npcDef.id.slice(0, 3)}_${i}_${Date.now() % 10000}`;
                    newNpcInstance.definitionId = npcDef.id;
                    newNpcInstance.mapPos = { x: spawnX, y: spawnY, z: spawnZ };
                    newNpcInstance.eventSourceId = eventInstanceId; // Tag NPC with event source

                    // Initialize biological stats
                    newNpcInstance.hunger = Math.floor(Math.random() * 30); // 0-30 hunger
                    newNpcInstance.reproductionCooldown = Math.floor(Math.random() * 500) + 100; // 100-600 turns

                    // Initialize behavior from definition if not present
                    if (!newNpcInstance.behavior) {
                        newNpcInstance.behavior = npcDef.behavior || "idle";
                    }

                    if (typeof window.initializeHealth === 'function') window.initializeHealth(newNpcInstance);
                    newNpcInstance.aggroList = [];
                    newNpcInstance.memory = {
                        lastKnownSafePos: { ...newNpcInstance.mapPos },
                        recentlyVisitedTiles: [],
                        explorationTarget: null
                    };
                    if (typeof window.initializeNpcFace === 'function') window.initializeNpcFace(newNpcInstance);

                    // Initialize Inventory for NPC
                    if (!newNpcInstance.inventory) {
                        // Create a simple inventory container for the NPC
                        // Assuming InventoryContainer is globally available via InventoryManager
                        if (window.InventoryContainer) {
                            newNpcInstance.inventory = {
                                container: new window.InventoryContainer("Pockets", "S"),
                                handSlots: [null, null]
                            };
                            newNpcInstance.inventory.container.maxSlots = 5; // Default small capacity for NPCs
                        } else {
                            // Fallback if class not available
                            newNpcInstance.inventory = {
                                container: { items: [], maxSlots: 5, name: "Pockets" },
                                handSlots: [null, null]
                            };
                        }
                    }

                    if (targetFactionIdForHostility === "player_faction_or_local" || targetFactionIdForHostility === "player") {
                        if (newNpcInstance.teamId !== this.gameState.player.teamId) {
                            newNpcInstance.aggroList.push({ entityRef: this.gameState.player, threat: 500 });
                        }
                    }
                    // TODO: More complex hostility based on targetFactionIdForHostility

                    this.gameState.npcs.push(newNpcInstance);
                    spawnedNpcIds.push(newNpcInstance.id);
                    logToConsole(`${this.logPrefix} Spawned ${newNpcInstance.name} (ID: ${newNpcInstance.id}) at (${spawnX},${spawnY},${spawnZ}).`, "info");
                    spawned = true;
                }
                spawnAttempts++;
            }
            if (!spawned) {
                logToConsole(`${this.logPrefix} Failed to find valid spawn location for an NPC of type ${npcDef.id} after ${spawnAttempts} attempts.`, "warn");
            }
        }
        if (spawnedNpcIds.length > 0 && window.mapRenderer) window.mapRenderer.scheduleRender();
        return spawnedNpcIds;
    }

    /**
     * Despawns (removes) a list of NPCs from the game.
     * @param {Array<string>} npcIds - An array of NPC instance IDs to despawn.
     */
    despawnNpcsByIds(npcIds) {
        if (!npcIds || npcIds.length === 0 || !this.gameState || !this.gameState.npcs) return;
        let despawnedCount = 0;
        this.gameState.npcs = this.gameState.npcs.filter(npc => {
            if (npcIds.includes(npc.id)) {
                // Drop inventory before removing
                if (window.inventoryManager && typeof window.inventoryManager.dropInventory === 'function') {
                    window.inventoryManager.dropInventory(npc);
                }

                logToConsole(`${this.logPrefix} Despawning NPC ${npc.name || npc.id} (ID: ${npc.id}).`, "info");
                despawnedCount++;
                // If in combat, remove from combatManager's initiative tracker
                if (this.gameState.isInCombat && window.combatManager) {
                    window.combatManager.initiativeTracker = window.combatManager.initiativeTracker.filter(entry => entry.entity !== npc);
                }
                return false; // Remove from gameState.npcs
            }
            return true; // Keep in gameState.npcs
        });
        if (despawnedCount > 0 && window.mapRenderer) window.mapRenderer.scheduleRender();
    }

    /**
     * Finds an NPC instance by various tags or specific ID.
     * Primarily for quest system use.
     * @param {string} tagOrId - The tag (e.g., "faction_leader", "quest_target_smith") or a specific NPC instance ID.
     * @param {string} [areaKey] - Optional area key to narrow down search.
     * @returns {object|null} The NPC instance or null.
     */
    findNpcByTagOrId(tagOrId, areaKey = null) {
        if (!this.gameState || !this.gameState.npcs) return null;

        // First, try by specific ID
        const byId = this.getNpcById(tagOrId);
        if (byId) return byId;

        // Then, search by tag
        let candidates = this.gameState.npcs.filter(npc =>
            npc.tags && npc.tags.includes(tagOrId) &&
            npc.health && npc.health.torso && npc.health.torso.current > 0 // Alive
        );

        if (areaKey && this.mapUtils) {
            // TODO: Filter candidates by areaKey proximity if mapUtils provides such a function
            // For now, if areaKey is given, we'll just log it.
            logToConsole(`${this.logPrefix} findNpcByTagOrId: Area key '${areaKey}' provided, but area filtering not fully implemented.`, "grey");
        }

        if (candidates.length > 0) {
            return candidates[Math.floor(Math.random() * candidates.length)]; // Return a random one if multiple match
        }
        return null;
    }
}

// Make globally accessible
window.NpcManager = NpcManager;
