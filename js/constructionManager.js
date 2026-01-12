
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
        this.recipeResolver = new RecipeResolver(assetManager);
    }

    async initialize() {
        // AssetManager now loads constructionDefinitions directly.
        // ConstructionManager just needs to reference them.
        if (this.assetManager && this.assetManager.constructionDefinitions) {
            this.constructionDefinitions = this.assetManager.constructionDefinitions;
            const count = Object.keys(this.constructionDefinitions).length;
            if (count > 0) {
                logToConsole(`${this.logPrefix} Successfully referenced ${count} construction definitions from AssetManager.`, 'green');
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
        const gameStateRef = this.gameState; // Renamed from 'player' to avoid confusion, getSkillValue uses gameState
        const constructionDefs = this.constructionDefinitions || {}; // Ensure it's an object
        const totalDefinitions = Object.keys(constructionDefs).length;
        let definitionsProcessed = 0;

        if (totalDefinitions === 0) {
            return [];
        }

        for (const defId in constructionDefs) {
            const originalDefinition = constructionDefs[defId];
            const augmentedDefinition = { ...originalDefinition }; // Shallow copy
            augmentedDefinition.meetsSkillReqs = true; // Assume true initially

            if (originalDefinition.skillRequired && originalDefinition.skillLevelRequired) {
                const playerScore = getSkillValue(originalDefinition.skillRequired, gameStateRef); // Ensure getSkillValue is accessible
                if (playerScore < originalDefinition.skillLevelRequired) {
                    augmentedDefinition.meetsSkillReqs = false;
                }
            }
            // No pre-filtering, just augment and add to list
            allDefinitionsWithStatus.push(augmentedDefinition);
            definitionsProcessed++;
        }

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

        const gameStateRef = this.gameState; // Renamed from 'player'
        if (definition.skillRequired && definition.skillLevelRequired) {
            if (getSkillValue(definition.skillRequired, gameStateRef) < definition.skillLevelRequired) {
                return false;
            }
        }

        // Validate inventory existence
        if (!this.gameState.inventory || !this.gameState.inventory.container || !this.gameState.inventory.container.items) {
             return false;
        }

        const recipeToUse = definition.recipe || definition;

        // Check tools - Note: RecipeResolver.canCraft currently only checks components, not tools.
        if (recipeToUse.tools_required && Array.isArray(recipeToUse.tools_required)) {
            for (const toolId of recipeToUse.tools_required) {
                // Check player inventory (container items) for the tool
                // Using gameState.inventory.container.items because inventoryManager.hasItem signature supports custom list
                if (this.inventoryManager && typeof this.inventoryManager.hasItem === 'function') {
                    if (!this.inventoryManager.hasItem(toolId, 1, this.gameState.inventory.container.items)) {
                        return false;
                    }
                }
            }
        }

        // Check components using RecipeResolver
        return this.recipeResolver.canCraft(recipeToUse, this.gameState.inventory.container.items);
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

                // 2. Check if target tile on target layer is empty.
                // Default target layer is 'middle' (consistent with world logic: objects are on middle layer).
                const targetLayer = definition.targetLayer || 'middle';

                const targetLayerRaw = levelData[targetLayer]?.[currentY]?.[currentX];
                const targetLayerTileId = typeof targetLayerRaw === 'object' ? targetLayerRaw?.tileId : targetLayerRaw;

                if (targetLayerTileId && targetLayerTileId !== "") {
                     logToConsole(`${this.logPrefix} Invalid placement for '${definition.name}' at (${currentX},${currentY},${z}): Tile occupied on '${targetLayer}' layer.`, "orange");
                     return false;
                }

                // Extra check: if placing on middle, ensure building layer is empty too (legacy safety)
                if (targetLayer === 'middle') {
                    const buildingTileRaw = levelData.building?.[currentY]?.[currentX];
                    const buildingTileId = typeof buildingTileRaw === 'object' ? buildingTileRaw?.tileId : buildingTileRaw;
                    if (buildingTileId && buildingTileId !== "") {
                        logToConsole(`${this.logPrefix} Invalid placement for '${definition.name}' at (${currentX},${currentY},${z}): Legacy 'building' layer occupied.`, "orange");
                        return false;
                    }
                }
            }
        }

        // Adjacency checks - Improved for multi-tile structures
        if (definition.buildRequiresAdjacent && definition.buildRequiresAdjacent.length > 0) {
            let foundRequiredAdjacency = false;

            // Check adjacency for ALL tiles occupied by the structure
            for (let dy = 0; dy < size.height; dy++) {
                for (let dx = 0; dx < size.width; dx++) {
                    const currentX = startX + dx;
                    const currentY = startY + dy;

                    const neighbors = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
                    for (const n of neighbors) {
                        const nx = currentX + n.dx;
                        const ny = currentY + n.dy;

                        // Skip if neighbor is part of the structure itself
                        if (nx >= startX && nx < startX + size.width && ny >= startY && ny < startY + size.height) {
                            continue;
                        }

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
                    if (foundRequiredAdjacency) break;
                }
                if (foundRequiredAdjacency) break;
            }

            if (!foundRequiredAdjacency) {
                return false;
            }
        }

        return true;
    }

    async dismantleStructure(uniqueId) {
        const structureIndex = this.gameState.mapStructures.findIndex(s => s.uniqueId === uniqueId);
        if (structureIndex === -1) {
            logToConsole(`${this.logPrefix} Cannot dismantle: Structure with ID ${uniqueId} not found.`, 'error');
            return false;
        }
        const structure = this.gameState.mapStructures[structureIndex];

        // Prevent dismantling structures from other maps
        if (structure.mapId && this.gameState.currentMapId && structure.mapId !== this.gameState.currentMapId) {
             logToConsole(`${this.logPrefix} Cannot dismantle: Structure is on a different map (${structure.mapId}).`, 'error');
             return false;
        }

        // Retrieve definition via ID if reference is stale or missing, fallback to stored definition
        let definition = this.constructionDefinitions[structure.constructionId];
        if (!definition) definition = structure.definition;

        if (!definition) {
             logToConsole(`${this.logPrefix} Cannot dismantle: Definition missing for structure.`, 'error');
             return false;
        }

        logToConsole(`${this.logPrefix} Dismantling ${definition.name} at (${structure.x}, ${structure.y}, ${structure.z})...`, 'info');

        // 1. Calculate and Refund Materials
        const recipe = definition.recipe || definition;
        if (recipe && recipe.components) {
            for (const component of recipe.components) {
                const qty = component.quantity || 1;
                // Refund 50%
                let refundQty = Math.floor(qty / 2);
                if (qty === 1 && Math.random() < 0.5) refundQty = 1; // Chance to save single items

                if (refundQty > 0) {
                    // Find an item definition that matches the component requirement
                    let itemToRefundId = null;

                    // Case A: Component specifies itemId (simple/legacy recipes)
                    if (component.itemId) {
                        itemToRefundId = component.itemId;
                    }
                    // Case B: Component specifies family/require (new system)
                    else if (component.family) {
                        // We need to find an item in this family that meets requirements
                         const familyItems = this.assetManager.findItemsByFamily(component.family);
                         const match = familyItems.find(item => {
                             // Check requirements
                             if (component.require) {
                                 for (const key in component.require) {
                                     if (item[key] !== component.require[key]) return false;
                                 }
                             }
                             return true;
                         });
                         if (match) itemToRefundId = match.id;
                    }

                    if (itemToRefundId) {
                        const itemDef = this.assetManager.getItem(itemToRefundId);
                        if (itemDef) {
                            // Try to add to inventory
                             const itemInstance = new window.Item(itemDef);
                             itemInstance.quantity = refundQty;
                             if (!this.inventoryManager.addItem(itemInstance)) {
                                 // Inventory full, drop to structure location, not player location
                                 if (!this.gameState.floorItems) this.gameState.floorItems = [];
                                 this.gameState.floorItems.push({
                                     x: structure.x,
                                     y: structure.y,
                                     z: structure.z,
                                     item: itemInstance
                                 });
                                 logToConsole(`Inventory full. Dropped ${refundQty}x ${itemDef.name} on the ground.`, 'orange');
                             } else {
                                 logToConsole(`Refunded ${refundQty}x ${itemDef.name}.`, 'green');
                             }
                        }
                    } else {
                        logToConsole(`${this.logPrefix} Warning: Could not determine item to refund for family '${component.family}'.`, 'warn');
                    }
                }
            }
        }

        // 2. Clear Map Tiles
        const size = definition.size || { width: 1, height: 1 };
        const targetLayer = definition.targetLayer || 'middle';

        // We use the structure's origin (x,y,z)
        const mapData = window.mapRenderer.getCurrentMapData();
        const levelData = mapData.levels[structure.z.toString()];

        if (levelData) {
             for (let dy = 0; dy < size.height; dy++) {
                for (let dx = 0; dx < size.width; dx++) {
                    const cx = structure.x + dx;
                    const cy = structure.y + dy;

                    // Bounds Check
                    if (cx >= 0 && cx < mapData.dimensions.width && cy >= 0 && cy < mapData.dimensions.height) {
                        // Clear target layer
                        if (levelData[targetLayer] && levelData[targetLayer][cy]) {
                            levelData[targetLayer][cy][cx] = "";
                        }

                        // Also clear 'building' layer if it was used (legacy safety)
                        if (targetLayer === 'middle' && levelData.building && levelData.building[cy]) {
                             levelData.building[cy][cx] = "";
                        }
                    }
                }
            }
        }

        // 3. Remove Trap if applicable
        if (definition.trapToPlace && this.trapManager && this.gameState.currentMapTraps) {
             // Find and remove the trap instance associated with this location
             // Traps are stored in gameState.currentMapTraps
             const trapIndex = this.gameState.currentMapTraps.findIndex(t => t.x === structure.x && t.y === structure.y && t.z === structure.z && t.trapDefId === definition.trapToPlace);
             if (trapIndex !== -1) {
                 this.gameState.currentMapTraps.splice(trapIndex, 1);
                 logToConsole(`${this.logPrefix} Removed associated trap.`, 'info');
             }
        }

        // 4. Remove from mapStructures
        this.gameState.mapStructures.splice(structureIndex, 1);

        // 5. Update UI/Render
        if (window.inventoryManager && window.inventoryManager.updateInventoryUI) window.inventoryManager.updateInventoryUI();
        if (window.mapRenderer) window.mapRenderer.scheduleRender();
        if (window.audioManager) window.audioManager.playUiSound('ui_construction_complete_01.wav');

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
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return false;
        }

        const definition = this.constructionDefinitions[constructionId];
        if (!this.isValidPlacement(definition, targetTilePos)) {
            if (window.uiManager) window.uiManager.showToastNotification("Cannot build here: Invalid placement.", "error");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return false;
        }

        // Consuming components
        const recipeToUse = definition.recipe || definition;

        // Ensure inventory exists before consumption
        if (!this.gameState.inventory || !this.gameState.inventory.container || !this.gameState.inventory.container.items) {
             logToConsole(`${this.logPrefix} Inventory unavailable.`, 'red');
             return false;
        }

        for (const component of recipeToUse.components) {
            const resolved = this.recipeResolver.resolveComponent(component, this.gameState.inventory.container.items);
            if (!resolved) {
                logToConsole(`${this.logPrefix} CRITICAL ERROR: Failed to resolve component during construction of '${definition.name}'.`, 'red');
                return false;
            }

            for (const itemToConsume of resolved.items) {
                if (!this.inventoryManager.removeItems(itemToConsume.item.id, itemToConsume.count, this.gameState.inventory.container.items)) {
                    logToConsole(`${this.logPrefix} CRITICAL ERROR: Failed to remove component ${itemToConsume.item.id} during construction of '${definition.name}'.`, 'red');
                    return false;
                }
            }
        }

        // Place the tile(s) on the map
        const size = definition.size || { width: 1, height: 1 };
        const { x: startX, y: startY, z } = targetTilePos;
        let placementFailed = false;

        for (let dy = 0; dy < size.height; dy++) {
            for (let dx = 0; dx < size.width; dx++) {
                const currentX = startX + dx;
                const currentY = startY + dy;

                const targetLayer = definition.targetLayer || 'middle';

                if (this.mapManager && typeof this.mapManager.updateTileOnLayer === 'function') {
                    this.mapManager.updateTileOnLayer(currentX, currentY, z, targetLayer, definition.tileIdPlaced);
                } else {
                    const mapData = window.mapRenderer.getCurrentMapData();
                    const levelData = mapData.levels[z.toString()];
                    // Ensure layer exists
                    if (levelData && !levelData[targetLayer]) {
                        levelData[targetLayer] = Array(mapData.dimensions.height).fill(null).map(() => Array(mapData.dimensions.width).fill(""));
                    }

                    if (levelData && levelData[targetLayer]) {
                        levelData[targetLayer][currentY][currentX] = definition.tileIdPlaced;
                    } else {
                        logToConsole(`${this.logPrefix} CRITICAL ERROR: Cannot place tile for '${definition.name}' at (${currentX},${currentY},${z}). mapManager or map data invalid.`, "red");
                        placementFailed = true;
                    }
                }
            }
        }

        if (placementFailed) {
            // Rollback consumed components - Partial mitigation.
            // Ideally we track exactly what was resolved and refund it.
            // Since we don't store the exact resolved items list in scope, we can't perfectly refund specific IDs if multiple matched.
            logToConsole(`${this.logPrefix} Placement failed after component consumption. Materials lost.`, "red");
            if (window.uiManager) window.uiManager.showToastNotification("Construction failed: map error.", "error");
            return false;
        }

        // If it's a trap, add it to trapManager
        if (definition.trapToPlace && this.trapManager) {
            const trapDefFromConstructions = this.trapManager.getTrapDefinition(definition.trapToPlace);
            if (trapDefFromConstructions) {
                if (!this.gameState.currentMapTraps) this.gameState.currentMapTraps = []; // Ensure array exists

                this.gameState.currentMapTraps.push({
                    trapDefId: definition.trapToPlace,
                    x: targetTilePos.x,
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

        // Add to mapStructures
        if (definition.health || definition.tags?.includes('container') || definition.category === 'resource_production') {
            const newStructure = {
                uniqueId: `struct_${Date.now()}_${Math.random()}`,
                constructionId: definition.id,
                x: targetTilePos.x, // Origin point
                y: targetTilePos.y,
                z: targetTilePos.z,
                currentHealth: definition.health || null,
                maxHealth: definition.health || null,
                mapId: this.gameState.currentMapId, // Bind structure to current map
                definition: definition // Keep reference, but use constructionId for persistence if needed
            };
            if (definition.tags?.includes('container') && definition.containerCapacity) {
                newStructure.container = new InventoryContainer(definition.name, definition.containerCapacity, []);
            }
            if (definition.category === 'resource_production') {
                newStructure.internalStorage = []; // [{itemId, quantity}]
                newStructure.currentProductionProgress = 0;
                newStructure.inputStorage = []; // Initialize regardless of current requirement to be safe
            }
            this.gameState.mapStructures.push(newStructure);
        }

        // Advance time
        if (this.timeManager && typeof this.timeManager.advanceTime === 'function' && definition.timeToBuild > 0) {
            this.timeManager.advanceTime(this.gameState, definition.timeToBuild);
        }

        // Award XP
        let xpGained = 10;
        if (typeof definition.xpAward === 'number') {
            xpGained = definition.xpAward;
        } else if (typeof definition.skillLevelRequired === 'number') {
            if (definition.skillLevelRequired <= 3) xpGained = 10;
            else if (definition.skillLevelRequired <= 6) xpGained = 25;
            else xpGained = 75;
        }

        if (this.xpManager && typeof this.xpManager.awardXp === 'function') {
            this.xpManager.awardXp(xpGained, this.gameState);
        }

        logToConsole(`${this.logPrefix} Successfully built ${definition.name} at (${targetTilePos.x},${targetTilePos.y},${targetTilePos.z}).`, 'green');
        if (window.uiManager) window.uiManager.showToastNotification(`Built ${definition.name}!`, "success");
        if (window.audioManager) window.audioManager.playUiSound('ui_construction_complete_01.wav');

        if (window.inventoryManager && window.inventoryManager.updateInventoryUI) window.inventoryManager.updateInventoryUI();
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

    updateResourceProduction(currentTick) {
        if (!this.gameState.mapStructures || this.gameState.mapStructures.length === 0) return;

        this.gameState.mapStructures.forEach(structure => {
            // Only update structures on the current map
            if (structure.mapId && this.gameState.currentMapId && structure.mapId !== this.gameState.currentMapId) {
                return;
            }

            // Ensure definition is available (restore from ID if needed)
            if (!structure.definition && structure.constructionId) {
                structure.definition = this.constructionDefinitions[structure.constructionId];
            }

            if (structure.definition && structure.definition.category === 'resource_production' && structure.definition.producesItemId) {
                const def = structure.definition;

                // Ensure storages exist
                if (!structure.internalStorage) structure.internalStorage = [];
                if (!structure.inputStorage) structure.inputStorage = [];

                structure.currentProductionProgress = (structure.currentProductionProgress || 0) + (def.productionRatePerTick || 0.001);

                if (structure.currentProductionProgress >= 1) {
                    const itemsToProduce = Math.floor(structure.currentProductionProgress);
                    structure.currentProductionProgress -= itemsToProduce;

                    // Check input requirements
                    if (def.requiresInputItemId) {
                        const inputItemInStorage = structure.inputStorage.find(item => item.itemId === def.requiresInputItemId);
                        if (!inputItemInStorage || inputItemInStorage.quantity < itemsToProduce) {
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
                    }
                }
            }
        });
    }

    collectFromResourceProducer(structureUniqueId) {
        const structure = this.getStructureByUniqueId(structureUniqueId);

        // Ensure definition
        if (structure && !structure.definition && structure.constructionId) {
            structure.definition = this.constructionDefinitions[structure.constructionId];
        }

        if (!structure || !structure.definition || structure.definition.category !== 'resource_production' || !structure.internalStorage || structure.internalStorage.length === 0) {
            logToConsole(`${this.logPrefix} Nothing to collect from ${structure?.definition?.name || 'structure'}.`, 'info');
            return false;
        }

        // Map check
        if (structure.mapId && this.gameState.currentMapId && structure.mapId !== this.gameState.currentMapId) {
             logToConsole(`${this.logPrefix} Cannot collect: Structure is on a different map.`, 'orange');
             return false;
        }

        let collectedAnything = false;
        for (let i = structure.internalStorage.length - 1; i >= 0; i--) {
            const storedItemEntry = structure.internalStorage[i];
            // Attempt to add to player inventory
            if (this.inventoryManager.addItemToInventoryById(storedItemEntry.itemId, storedItemEntry.quantity)) {
                logToConsole(`${this.logPrefix} Collected ${storedItemEntry.quantity}x ${storedItemEntry.itemId} from ${structure.definition.name}.`, 'green');
                structure.internalStorage.splice(i, 1); // Remove collected item
                collectedAnything = true;
            } else {
                logToConsole(`${this.logPrefix} Could not collect ${storedItemEntry.itemId} from ${structure.definition.name}, player inventory full.`, 'orange');
            }
        }
        if (collectedAnything && window.inventoryManager && window.inventoryManager.updateInventoryUI) window.inventoryManager.updateInventoryUI();
        return collectedAnything;
    }

    addInputToResourceProducer(structureUniqueId, itemId, quantity = 1) {
        const structure = this.getStructureByUniqueId(structureUniqueId);

        // Ensure definition
        if (structure && !structure.definition && structure.constructionId) {
            structure.definition = this.constructionDefinitions[structure.constructionId];
        }

        if (!structure || !structure.definition || structure.definition.category !== 'resource_production' || !structure.definition.requiresInputItemId) {
            logToConsole(`${this.logPrefix} This structure does not require inputs or is invalid.`, 'warn');
            return false;
        }

        // Map check
        if (structure.mapId && this.gameState.currentMapId && structure.mapId !== this.gameState.currentMapId) {
             logToConsole(`${this.logPrefix} Cannot add input: Structure is on a different map.`, 'orange');
             return false;
        }

        if (structure.definition.requiresInputItemId !== itemId) {
            logToConsole(`${this.logPrefix} ${structure.definition.name} requires ${structure.definition.requiresInputItemId}, not ${itemId}.`, 'warn');
            return false;
        }

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

window.ConstructionManager = ConstructionManager;
