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
        // AssetManager now loads constructionDefinitions directly.
        // ConstructionManager just needs to reference them.
        if (this.assetManager && this.assetManager.constructionDefinitions) {
            this.constructionDefinitions = this.assetManager.constructionDefinitions;
            const count = Object.keys(this.constructionDefinitions).length;
            if (count > 0) {
                logToConsole(`${this.logPrefix} Successfully referenced ${count} construction definitions from AssetManager.`, 'green');
                // Log the actual definitions for verification
                try {
                    logToConsole(`${this.logPrefix} this.constructionDefinitions content after referencing:`, JSON.parse(JSON.stringify(this.constructionDefinitions)));
                } catch (e) {
                    logToConsole(`${this.logPrefix} Error logging this.constructionDefinitions: ${e}`, 'red', this.constructionDefinitions);
                }
            } else {
                logToConsole(`${this.logPrefix} AssetManager provided constructionDefinitions, but it was empty.`, 'orange');
            }
        } else {
            logToConsole(`${this.logPrefix} AssetManager or assetManager.constructionDefinitions not available. Construction will be unavailable.`, 'red');
            this.constructionDefinitions = {}; // Ensure it's an empty object
        }
    }

    /**
     * Gets all construction definitions and augments them with skill requirement status.
     * Does NOT check for components or placement validity beyond skill.
     * @returns {Array<object>} An array of all construction definitions, each augmented with a `meetsSkillReqs` boolean.
     */
    getAllConstructionDefinitionsWithStatus() {
        const allDefinitionsWithStatus = [];
        const player = this.gameState;
        const constructionDefs = this.constructionDefinitions || {}; // Ensure it's an object
        const totalDefinitions = Object.keys(constructionDefs).length;
        let definitionsProcessed = 0;

        logToConsole(`${this.logPrefix} getAllConstructionDefinitionsWithStatus() CALLED. Total raw definitions in this.constructionDefinitions: ${totalDefinitions}`, "debug");
        if (totalDefinitions === 0) {
            logToConsole(`${this.logPrefix} getAllConstructionDefinitionsWithStatus: this.constructionDefinitions is empty. Returning empty array.`, "warn");
            return [];
        }

        for (const defId in constructionDefs) {
            const originalDefinition = constructionDefs[defId];
            const augmentedDefinition = { ...originalDefinition }; // Shallow copy
            augmentedDefinition.meetsSkillReqs = true; // Assume true initially

            if (originalDefinition.skillRequired && originalDefinition.skillLevelRequired) {
                const playerScore = getSkillValue(originalDefinition.skillRequired, player); // Ensure getSkillValue is accessible
                if (playerScore < originalDefinition.skillLevelRequired) {
                    augmentedDefinition.meetsSkillReqs = false;
                }
            }
            // No pre-filtering, just augment and add to list
            allDefinitionsWithStatus.push(augmentedDefinition);
            definitionsProcessed++;
        }

        logToConsole(`${this.logPrefix} getAllConstructionDefinitionsWithStatus() processed ${definitionsProcessed} definitions. Returning all definitions with skill status. (Count: ${allDefinitionsWithStatus.length})`, "debug", JSON.parse(JSON.stringify(allDefinitionsWithStatus)));
        return allDefinitionsWithStatus;
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

        // Adjacency checks
        if (definition.buildRequiresAdjacent && definition.buildRequiresAdjacent.length > 0) {
            let foundRequiredAdjacency = false;
            const { x, y, z } = targetTilePos; // Assuming 1x1 for simplicity of this TODO.
            // Multi-tile would need to check perimeter based on definition.size.

            const neighbors = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
            for (const n of neighbors) {
                const nx = x + n.dx;
                const ny = y + n.dy;

                if (nx >= 0 && nx < mapData.dimensions.width && ny >= 0 && ny < mapData.dimensions.height) {
                    const adjLevelData = mapData.levels[z.toString()];
                    if (adjLevelData) {
                        // Check building layer primarily for structural adjacencies
                        const adjTileRaw = adjLevelData.building?.[ny]?.[nx] || adjLevelData.middle?.[ny]?.[nx]; // Check building then middle
                        const adjTileId = (typeof adjTileRaw === 'object' && adjTileRaw?.tileId !== undefined) ? adjTileRaw.tileId : adjTileRaw;

                        if (adjTileId && this.assetManager.tilesets[adjTileId]) {
                            const adjTileDef = this.assetManager.tilesets[adjTileId];
                            if (adjTileDef.tags) {
                                if (definition.buildRequiresAdjacent.some(reqTag => adjTileDef.tags.includes(reqTag))) {
                                    foundRequiredAdjacency = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            if (!foundRequiredAdjacency) {
                logToConsole(`${this.logPrefix} Invalid placement for '${definition.name}': Missing required adjacent tile (e.g., wall for a window). Requires one of: [${definition.buildRequiresAdjacent.join(', ')}]`, "orange");
                return false;
            }
        }

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
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); // Sound for failure
            return false;
        }

        const definition = this.constructionDefinitions[constructionId];
        if (!this.isValidPlacement(definition, targetTilePos)) {
            if (window.uiManager) window.uiManager.showToastNotification("Cannot build here: Invalid placement.", "error");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); // Sound for failure
            return false;
        }

        // Consume components
        for (const component of definition.components) {
            if (!this.inventoryManager.removeItems(component.itemId, component.quantity, this.gameState.inventory.container.items)) {
                logToConsole(`${this.logPrefix} CRITICAL ERROR: Failed to remove component ${component.itemId} during construction of '${definition.name}'.`, 'red');
                if (window.uiManager) window.uiManager.showToastNotification("Construction failed: component error.", "error");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); // Sound for failure
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
                        logToConsole(`${this.logPrefix} CRITICAL ERROR: Cannot place tile for '${definition.name}' at (${currentX},${currentY},${z}). mapManager or map data invalid. Rolling back components.`, "red");
                        // Rollback consumed components
                        for (const component of definition.components) {
                            this.inventoryManager.addItemToInventoryById(component.itemId, component.quantity); // Assuming addItemToInventoryById exists and handles stacking
                        }
                        if (window.updateInventoryUI) window.updateInventoryUI();
                        if (window.uiManager) window.uiManager.showToastNotification("Construction failed: map error (components restored).", "error");
                        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); // Sound for failure
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

window.ConstructionManager = ConstructionManager;
