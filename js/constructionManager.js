// js/constructionManager.js

class ConstructionManager {
    constructor(gameState, assetManager, inventoryManager, timeManager, xpManager, mapManager, trapManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.inventoryManager = inventoryManager;
        this.timeManager = timeManager;
        this.xpManager = xpManager;
        this.mapManager = mapManager; // For updating map tiles
        this.trapManager = trapManager; // For placing traps
        this.constructionDefinitions = {};
        this.logPrefix = "[ConstructionManager]";

        if (!this.gameState.mapStructures) {
            this.gameState.mapStructures = []; // Initialize if not present
        }
    }

    async initialize() {
        try {
            this.constructionDefinitions = await this.assetManager.loadData('assets/definitions/constructions.json');
            if (Object.keys(this.constructionDefinitions).length === 0) {
                logToConsole(`${this.logPrefix} No construction definitions found or loaded.`, 'orange');
            } else {
                logToConsole(`${this.logPrefix} Initialized with ${Object.keys(this.constructionDefinitions).length} construction definitions.`, 'blue');
            }
        } catch (error) {
            logToConsole(`${this.logPrefix} Error loading construction recipes: ${error.message}`, 'red');
            this.constructionDefinitions = {};
        }
    }

    /**
     * Gets all construction recipes the player currently meets the skill requirements for.
     * Does NOT check for components or placement validity.
     * @returns {Array<object>} An array of construction definitions.
     */
    getBuildableList() {
        const buildable = [];
        const player = this.gameState; // Assuming player skills are on gameState or gameState.player

        for (const defId in this.constructionDefinitions) {
            const definition = this.constructionDefinitions[defId];
            let canAttempt = true;

            if (definition.skillRequired && definition.skillLevelRequired) {
                const playerScore = getSkillValue(definition.skillRequired, player);
                if (playerScore < definition.skillLevelRequired) {
                    canAttempt = false;
                }
            }
            // Future: Could check for known blueprints if not all are known by default

            if (canAttempt) {
                buildable.push(definition);
            }
        }
        return buildable;
    }

    /**
     * Checks if the player has the required components and meets skill requirements for a specific construction.
     * @param {string} constructionId - The ID of the construction.
     * @returns {boolean} True if the player can build it, false otherwise.
     */
    canBuild(constructionId) {
        const definition = this.constructionDefinitions[constructionId];
        if (!definition) {
            logToConsole(`${this.logPrefix} Construction ID '${constructionId}' not found.`, 'red');
            return false;
        }

        const player = this.gameState;
        if (definition.skillRequired && definition.skillLevelRequired) {
            if (getSkillValue(definition.skillRequired, player) < definition.skillLevelRequired) {
                // logToConsole(`${this.logPrefix} Cannot build '${definition.name}'. Skill ${definition.skillRequired} too low. Need ${definition.skillLevelRequired}, have ${getSkillValue(definition.skillRequired, player)}.`, 'orange');
                return false;
            }
        }

        // Check components
        for (const component of definition.components) {
            const count = this.inventoryManager.countItems(component.itemId, this.gameState.inventory.container.items);
            if (count < component.quantity) {
                // logToConsole(`${this.logPrefix} Cannot build '${definition.name}'. Missing ${component.quantity - count} of ${component.itemId}.`, 'orange');
                return false;
            }
        }
        return true;
    }

    /**
     * Validates if a construction can be placed at the target tile.
     * @param {object} definition - The construction definition.
     * @param {object} targetTilePos - {x, y, z} for placement.
     * @returns {boolean} True if placement is valid.
     */
    isValidPlacement(definition, targetTilePos) {
        if (!window.mapRenderer || !this.assetManager || !this.assetManager.tilesets) {
            logToConsole(`${this.logPrefix} Core managers (mapRenderer, assetManager) not available for placement check.`, "error");
            return false;
        }

        const mapData = window.mapRenderer.getCurrentMapData();
        if (!mapData || !mapData.dimensions || !mapData.levels) {
            logToConsole(`${this.logPrefix} Invalid map data for placement check.`, "error");
            return false;
        }

        const size = definition.size || { width: 1, height: 1 };
        const { x: startX, y: startY, z } = targetTilePos;

        for (let dy = 0; dy < size.height; dy++) {
            for (let dx = 0; dx < size.width; dx++) {
                const currentX = startX + dx;
                const currentY = startY + dy;

                // 1. Bounds check
                if (currentX < 0 || currentX >= mapData.dimensions.width || currentY < 0 || currentY >= mapData.dimensions.height) {
                    logToConsole(`${this.logPrefix} Invalid placement for '${definition.name}': Out of map bounds at (${currentX},${currentY},${z}).`, "orange");
                    return false;
                }

                const levelData = mapData.levels[z.toString()];
                if (!levelData) {
                    logToConsole(`${this.logPrefix} Invalid placement for '${definition.name}': Level Z:${z} data missing.`, "orange");
                    return false;
                }

                // 2. Check if target tile on 'building' and 'middle' layers is empty
                // (Structures are typically placed on 'building', items/some interactables on 'middle')
                const buildingTileRaw = levelData.building?.[currentY]?.[currentX];
                const middleTileRaw = levelData.middle?.[currentY]?.[currentX];
                const buildingTileId = typeof buildingTileRaw === 'object' ? buildingTileRaw?.tileId : buildingTileRaw;
                const middleTileId = typeof middleTileRaw === 'object' ? middleTileRaw?.tileId : middleTileRaw;

                if ((buildingTileId && buildingTileId !== "") || (middleTileId && middleTileId !== "")) {
                    logToConsole(`${this.logPrefix} Invalid placement for '${definition.name}' at (${currentX},${currentY},${z}): Tile occupied on building/middle layer.`, "orange");
                    return false;
                }

                // 3. Check allowedTileTags against the underlying 'bottom' (landscape/floor) tile
                if (definition.allowedTileTags && definition.allowedTileTags.length > 0) {
                    const bottomTileRaw = levelData.bottom?.[currentY]?.[currentX];
                    const bottomTileId = typeof bottomTileRaw === 'object' ? bottomTileRaw?.tileId : bottomTileRaw;
                    const bottomTileDef = bottomTileId ? this.assetManager.tilesets[bottomTileId] : null;

                    if (!bottomTileDef || !bottomTileDef.tags) {
                        logToConsole(`${this.logPrefix} Invalid placement for '${definition.name}' at (${currentX},${currentY},${z}): Underlying tile has no definition or tags.`, "orange");
                        return false;
                    }
                    const underlyingTileTags = bottomTileDef.tags;
                    const canPlace = definition.allowedTileTags.some(reqTag => underlyingTileTags.includes(reqTag));
                    if (!canPlace) {
                        logToConsole(`${this.logPrefix} Invalid placement for '${definition.name}' at (${currentX},${currentY},${z}): Underlying tile tags [${underlyingTileTags.join(', ')}] do not meet requirements [${definition.allowedTileTags.join(', ')}].`, "orange");
                        return false;
                    }
                }
            }
        }

        // TODO: Implement adjacency checks (e.g., for walls, doors) based on definition.buildRequiresAdjacent

        logToConsole(`${this.logPrefix} Placement for '${definition.name}' at (${startX},${startY},${z}) seems valid.`, "silver");
        return true;
    }


    /**
     * Attempts to place a construction on the map.
     * @param {string} constructionId - The ID of the construction to place.
     * @param {object} targetTilePos - {x, y, z} where to place it.
     * @returns {boolean} True if construction was successful, false otherwise.
     */
    async placeConstruction(constructionId, targetTilePos) {
        if (!this.canBuild(constructionId)) {
            logToConsole(`${this.logPrefix} Pre-build check failed for '${constructionId}'. Player may be missing components or skill.`, 'orange');
            if (window.uiManager) window.uiManager.showToastNotification("Cannot build: missing components or skill.", "error");
            return false;
        }

        const definition = this.constructionDefinitions[constructionId];
        if (!this.isValidPlacement(definition, targetTilePos)) {
            if (window.uiManager) window.uiManager.showToastNotification("Cannot build here: Invalid placement.", "error");
            return false;
        }

        // Consume components
        for (const component of definition.components) {
            if (!this.inventoryManager.removeItems(component.itemId, component.quantity, this.gameState.inventory.container.items)) {
                logToConsole(`${this.logPrefix} CRITICAL ERROR: Failed to remove component ${component.itemId} during construction of '${definition.name}'.`, 'red');
                if (window.uiManager) window.uiManager.showToastNotification("Construction failed: component error.", "error");
                return false;
            }
        }

        // Place the tile(s) on the map
        const size = definition.size || { width: 1, height: 1 };
        const { x: startX, y: startY, z } = targetTilePos;

        for (let dy = 0; dy < size.height; dy++) {
            for (let dx = 0; dx < size.width; dx++) {
                const currentX = startX + dx;
                const currentY = startY + dy;
                // For multi-tile objects, the primary tileIdPlaced might only go on the origin (dx=0,dy=0)
                // or a more complex system for multi-tile sprites is needed.
                // For now, place the main tileId at the origin, potentially other parts or empty markers elsewhere.
                // Simplified: place the same tileId on all occupied cells if it's a simple block.
                // More realistically, a multi-tile object would have one main entry in mapStructures
                // and occupy multiple visual tiles. The mapManager.updateTileOnLayer should handle this.

                // For now, this simplified logic will place the *same* tile ID on all cells the structure occupies.
                // This is okay for simple things like a 2x1 workbench if both tiles look the same.
                // For complex multi-tile sprites, this needs a more advanced tile placement system.
                if (this.mapManager && typeof this.mapManager.updateTileOnLayer === 'function') {
                    this.mapManager.updateTileOnLayer(currentX, currentY, z, 'building', definition.tileIdPlaced);
                } else {
                    const mapData = window.mapRenderer.getCurrentMapData();
                    const levelData = mapData.levels[z.toString()];
                    if (levelData && levelData.building) {
                        levelData.building[currentY][currentX] = definition.tileIdPlaced;
                    } else {
                        logToConsole(`${this.logPrefix} CRITICAL ERROR: Cannot place tile for '${definition.name}' at (${currentX},${currentY},${z}). mapManager or map data invalid.`, "red");
                        // TODO: Rollback consumed components
                        return false;
                    }
                }
            }
        }
        if (size.width > 1 || size.height > 1) {
            logToConsole(`${this.logPrefix} Fallback: Directly updated map data for multi-tile '${definition.name}'.`, "grey");
        } else if (this.mapManager === undefined || typeof this.mapManager.updateTileOnLayer !== 'function') {
            logToConsole(`${this.logPrefix} Fallback: Directly updated map data for '${definition.name}'.`, "grey");
        }


        // If it's a trap, add it to trapManager
        // For multi-tile constructions that are traps, this assumes the trap effect is at the origin targetTilePos
        if (definition.trapToPlace && this.trapManager) {
            const trapDefFromConstructions = this.trapManager.getTrapDefinition(definition.trapToPlace);
            if (trapDefFromConstructions) {
                this.gameState.currentMapTraps.push({
                    trapDefId: definition.trapToPlace,
                    x: targetTilePos.x, // Trap placed at the origin of the construction
                    y: targetTilePos.y,
                    z: targetTilePos.z,
                    state: "hidden",
                    uniqueId: `trap_${Date.now()}_${Math.random()}`
                });
                logToConsole(`${this.logPrefix} Placed trap '${trapDefFromConstructions.name}' via construction at origin.`, 'lime');
            } else {
                logToConsole(`${this.logPrefix} Warning: Construction '${definition.name}' specified trapToPlace '${definition.trapToPlace}', but trap definition not found.`, 'orange');
            }
        }

        // Add to mapStructures if it has health, is a container, or a resource producer
        if (definition.health || definition.tags?.includes('container') || definition.category === 'resource_production') {
            const newStructure = {
                uniqueId: `struct_${Date.now()}_${Math.random()}`,
                constructionId: definition.id,
                x: targetTilePos.x, // Origin point
                y: targetTilePos.y,
                z: targetTilePos.z,
                currentHealth: definition.health || null,
                maxHealth: definition.health || null,
                definition: definition // Store a reference to its definition for quick access
            };
            if (definition.tags?.includes('container') && definition.containerCapacity) {
                newStructure.container = new InventoryContainer(definition.name, definition.containerCapacity, []);
            }
            if (definition.category === 'resource_production') {
                newStructure.internalStorage = []; // [{itemId, quantity}]
                newStructure.currentProductionProgress = 0;
                if (definition.requiresInputItemId) {
                    newStructure.inputStorage = []; // [{itemId, quantity}]
                }
            }
            this.gameState.mapStructures.push(newStructure);
        }

        // Advance time
        if (this.timeManager && typeof this.timeManager.advanceTime === 'function' && definition.timeToBuild > 0) {
            this.timeManager.advanceTime(this.gameState, definition.timeToBuild);
        }

        // Award XP
        if (definition.xpAward && this.xpManager && typeof this.xpManager.awardXp === 'function') {
            this.xpManager.awardXp(definition.xpAward, this.gameState);
        }

        logToConsole(`${this.logPrefix} Successfully built ${definition.name} at (${targetTilePos.x},${targetTilePos.y},${targetTilePos.z}).`, 'green');
        if (window.uiManager) window.uiManager.showToastNotification(`Built ${definition.name}!`, "success");
        if (window.audioManager) window.audioManager.playUiSound('ui_construction_complete_01.wav'); // Placeholder

        if (window.updateInventoryUI) window.updateInventoryUI();
        if (window.mapRenderer) window.mapRenderer.scheduleRender();

        return true;
    }

    getStructureByUniqueId(uniqueId) {
        return this.gameState.mapStructures.find(s => s.uniqueId === uniqueId);
    }

    getStationType(structureUniqueId) {
        const structure = this.getStructureByUniqueId(structureUniqueId);
        if (structure && structure.definition && structure.definition.stationType) {
            return structure.definition.stationType;
        }
        return null;
    }

    updateResourceProduction(currentTick) { // currentTick might be gameState.currentTurn or a more precise game tick
        if (!this.gameState.mapStructures || this.gameState.mapStructures.length === 0) return;

        this.gameState.mapStructures.forEach(structure => {
            if (structure.definition && structure.definition.category === 'resource_production' && structure.definition.producesItemId) {
                const def = structure.definition;
                structure.currentProductionProgress = (structure.currentProductionProgress || 0) + (def.productionRatePerTick || 0.001);

                if (structure.currentProductionProgress >= 1) {
                    const itemsToProduce = Math.floor(structure.currentProductionProgress);
                    structure.currentProductionProgress -= itemsToProduce;

                    // Check input requirements
                    if (def.requiresInputItemId) {
                        const inputItemInStorage = structure.inputStorage?.find(item => item.itemId === def.requiresInputItemId);
                        if (!inputItemInStorage || inputItemInStorage.quantity < itemsToProduce) {
                            // logToConsole(`${this.logPrefix} ${def.name} needs ${def.requiresInputItemId} to produce. Input storage: ${inputItemInStorage ? inputItemInStorage.quantity : 0}. Required: ${itemsToProduce}`, "info");
                            return; // Not enough input
                        }
                    }

                    let currentStoredAmount = 0;
                    const existingProduct = structure.internalStorage.find(item => item.itemId === def.producesItemId);
                    if (existingProduct) {
                        currentStoredAmount = existingProduct.quantity;
                    }

                    const canStoreAmount = (def.storageCapacity || 1) - currentStoredAmount;
                    const actualAmountToAdd = Math.min(itemsToProduce, canStoreAmount);

                    if (actualAmountToAdd > 0) {
                        if (def.requiresInputItemId) { // Consume input
                            const inputItemInStorage = structure.inputStorage.find(item => item.itemId === def.requiresInputItemId);
                            inputItemInStorage.quantity -= actualAmountToAdd;
                            if (inputItemInStorage.quantity <= 0) {
                                structure.inputStorage = structure.inputStorage.filter(item => item.itemId !== def.requiresInputItemId);
                            }
                        }

                        if (existingProduct) {
                            existingProduct.quantity += actualAmountToAdd;
                        } else {
                            structure.internalStorage.push({ itemId: def.producesItemId, quantity: actualAmountToAdd });
                        }
                        logToConsole(`${this.logPrefix} ${def.name} produced ${actualAmountToAdd} ${def.producesItemId}. Total in structure: ${existingProduct ? existingProduct.quantity : actualAmountToAdd}.`, 'info');
                    } else if (itemsToProduce > 0) {
                        // logToConsole(`${this.logPrefix} ${def.name} produced ${itemsToProduce} ${def.producesItemId}, but storage is full.`, 'info');
                    }
                }
            }
        });
    }

    collectFromResourceProducer(structureUniqueId) {
        const structure = this.getStructureByUniqueId(structureUniqueId);
        if (!structure || !structure.definition || structure.definition.category !== 'resource_production' || !structure.internalStorage || structure.internalStorage.length === 0) {
            logToConsole(`${this.logPrefix} Nothing to collect from ${structure?.definition?.name || 'structure'}.`, 'info');
            return false;
        }

        let collectedAnything = false;
        for (let i = structure.internalStorage.length - 1; i >= 0; i--) {
            const storedItemEntry = structure.internalStorage[i];
            // Attempt to add to player inventory
            if (this.inventoryManager.addItemToInventoryById(storedItemEntry.itemId, storedItemEntry.quantity)) {
                logToConsole(`${this.logPrefix} Collected ${storedItemEntry.quantity}x ${storedItemEntry.itemId} from ${structure.definition.name}.`, 'event-success');
                structure.internalStorage.splice(i, 1); // Remove collected item
                collectedAnything = true;
            } else {
                logToConsole(`${this.logPrefix} Could not collect ${storedItemEntry.itemId} from ${structure.definition.name}, player inventory full.`, 'orange');
                // Potentially break or only collect what fits
            }
        }
        if (collectedAnything && window.updateInventoryUI) window.updateInventoryUI();
        return collectedAnything;
    }

    addInputToResourceProducer(structureUniqueId, itemId, quantity = 1) {
        const structure = this.getStructureByUniqueId(structureUniqueId);
        if (!structure || !structure.definition || structure.definition.category !== 'resource_production' || !structure.definition.requiresInputItemId) {
            logToConsole(`${this.logPrefix} This structure does not require inputs or is invalid.`, 'warn');
            return false;
        }
        if (structure.definition.requiresInputItemId !== itemId) {
            logToConsole(`${this.logPrefix} ${structure.definition.name} requires ${structure.definition.requiresInputItemId}, not ${itemId}.`, 'warn');
            return false;
        }

        // Assume player has the item and it's consumed from their inventory by the caller (e.g., interaction.js)
        if (!structure.inputStorage) structure.inputStorage = [];

        const existingInput = structure.inputStorage.find(item => item.itemId === itemId);
        // Optional: check input capacity if defined on structure.definition.inputCapacity
        if (existingInput) {
            existingInput.quantity += quantity;
        } else {
            structure.inputStorage.push({ itemId: itemId, quantity: quantity });
        }
        logToConsole(`${this.logPrefix} Added ${quantity}x ${itemId} to ${structure.definition.name}'s input.`, 'info');
        return true;
    }

}

// Make globally accessible
// window.constructionManager = new ConstructionManager(window.gameState, window.assetManager, window.inventoryManager, window.TimeManager, window.xpManager, window.mapManager, window.trapManager);
// Initialization:
// if (window.constructionManager) window.constructionManager.initialize();
