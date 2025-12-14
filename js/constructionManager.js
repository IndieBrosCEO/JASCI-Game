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

        // Check components using RecipeResolver
        // construction definitions use 'recipe.components' if using new format, or top-level 'components' if legacy/converted
        // The AssetManager loads 'components' from 'recipe.components' into the top level object if standardized,
        // but let's check where they are.
        const recipeToUse = definition.recipe || definition;
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
                // If definition specifies a targetLayer (e.g. 'bottom' for floors), use that.
                const targetLayer = definition.targetLayer || 'middle';

                // We should also check 'middle' if placing on 'building' (legacy) or vice versa if we want to be strict,
                // but moving forward we use 'middle'.
                // However, to be safe against existing map data, we check if the SPECIFIC target layer is occupied.
                // AND if we are placing on 'middle', we double check 'building' isn't there (legacy conflict).

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

                // 3. Check allowedTileTags against the underlying 'bottom' (landscape/floor) tile
                // REMOVED: User spec says no "inside" or "outside" tags and relies on layer occupancy only.
                // The loop below is removed to allow placement based purely on target layer availability.
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

    async dismantleStructure(uniqueId) {
        const structureIndex = this.gameState.mapStructures.findIndex(s => s.uniqueId === uniqueId);
        if (structureIndex === -1) {
            logToConsole(`${this.logPrefix} Cannot dismantle: Structure with ID ${uniqueId} not found.`, 'error');
            return false;
        }
        const structure = this.gameState.mapStructures[structureIndex];
        const definition = structure.definition;

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
                                 // Inventory full, drop to floor
                                 if (!this.gameState.floorItems) this.gameState.floorItems = [];
                                 this.gameState.floorItems.push({
                                     x: this.gameState.playerPos.x,
                                     y: this.gameState.playerPos.y,
                                     z: this.gameState.playerPos.z,
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

                    // Clear target layer
                    if (levelData[targetLayer] && levelData[targetLayer][cy]) {
                        // Check if the tile actually matches what we expect (optional safety)
                        // But for now, just clear it.
                        // We set it to "" (empty string) which represents empty in this system
                        levelData[targetLayer][cy][cx] = "";
                    }

                    // Also clear 'building' layer if it was used (legacy safety, similar to placement logic)
                    if (targetLayer === 'middle' && levelData.building && levelData.building[cy]) {
                         const bTile = levelData.building[cy][cx];
                         // Only clear if it looks like our tile? Or just force clear?
                         // To be safe, maybe only clear if it matches tileIdPlaced?
                         // Let's just assume the structure occupies this space.
                         // Actually, we should check if tileIdPlaced matches.
                         // But for now, forceful clear is probably what "Dismantle" implies.
                         // Let's stick to targetLayer primarily.
                    }
                }
            }
        }

        // 3. Remove Trap if applicable
        if (definition.trapToPlace && this.trapManager) {
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
        if (window.audioManager) window.audioManager.playUiSound('ui_construction_complete_01.wav'); // Reuse sound or find a deconstruct one

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
        const recipeToUse = definition.recipe || definition;
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

                // Determine target layer (default 'middle')
                const targetLayer = definition.targetLayer || 'middle';

                // For now, this simplified logic will place the *same* tile ID on all cells the structure occupies.
                // This is okay for simple things like a 2x1 workbench if both tiles look the same.
                // For complex multi-tile sprites, this needs a more advanced tile placement system.
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
                        logToConsole(`${this.logPrefix} CRITICAL ERROR: Cannot place tile for '${definition.name}' at (${currentX},${currentY},${z}). mapManager or map data invalid. Rolling back components.`, "red");
                        // Rollback consumed components
                        const recipeToUse = definition.recipe || definition; // Use the correct recipe object
                        const componentsToRollback = recipeToUse.components || [];
                        for (const component of componentsToRollback) {
                            // Note: component.itemId is not standard in recipe components, usually family/require.
                            // If it's a specific item recipe, it might have itemId.
                            // However, we consumed based on resolved items.
                            // Ideally we track exactly what was consumed.
                            // For now, we try to refund based on component requirement, but this is imperfect if family was used.
                            // Warning: This rollback logic is weak without resolved item tracking.
                            // But fixing the crash:
                            logToConsole(`${this.logPrefix} Rollback: Cannot perfectly restore generic components.`, "orange");
                        }
                        if (window.inventoryManager && window.inventoryManager.updateInventoryUI) window.inventoryManager.updateInventoryUI();
                        if (window.uiManager) window.uiManager.showToastNotification("Construction failed: map error.", "error");
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
        if (collectedAnything && window.inventoryManager && window.inventoryManager.updateInventoryUI) window.inventoryManager.updateInventoryUI();
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
