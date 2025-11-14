// js/constructionManager.js

class ConstructionManager {
    constructor(gameState, assetManager, inventoryManager, timeManager, xpManager, mapManager, trapManager, recipeResolver) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.inventoryManager = inventoryManager;
        this.timeManager = timeManager;
        this.xpManager = xpManager;
        this.mapManager = mapManager;
        this.trapManager = trapManager;
        this.recipeResolver = recipeResolver;
        this.constructionDefinitions = {};
        this.logPrefix = "[ConstructionManager]";

        if (!this.gameState.mapStructures) {
            this.gameState.mapStructures = [];
        }
    }

    async initialize() {
        if (this.assetManager && this.assetManager.constructionDefinitions) {
            this.constructionDefinitions = this.assetManager.constructionDefinitions;
        }
    }

    getAllConstructionDefinitionsWithStatus() {
        const allDefinitionsWithStatus = [];
        const player = this.gameState;
        const constructionDefs = this.constructionDefinitions || {};

        for (const defId in constructionDefs) {
            const originalDefinition = constructionDefs[defId];
            const augmentedDefinition = { ...originalDefinition };
            augmentedDefinition.meetsSkillReqs = true;

            if (originalDefinition.skillRequired && originalDefinition.skillLevelRequired) {
                if (getSkillValue(originalDefinition.skillRequired, player) < originalDefinition.skillLevelRequired) {
                    augmentedDefinition.meetsSkillReqs = false;
                }
            }
            allDefinitionsWithStatus.push(augmentedDefinition);
        }
        return allDefinitionsWithStatus;
    }

    canBuild(constructionId) {
        const definition = this.constructionDefinitions[constructionId];
        if (!definition) {
            return false;
        }

        const player = this.gameState;
        if (definition.skillRequired && definition.skillLevelRequired) {
            if (getSkillValue(definition.skillRequired, player) < definition.skillLevelRequired) {
                return false;
            }
        }

        for (const component of definition.components) {
            if (component.isWorldPrerequisite) continue;

            const matchingItemDefinitions = this.recipeResolver.findMatchingItemDefinitions(component);
            if (matchingItemDefinitions.length === 0) {
                return false;
            }

            let totalCount = 0;
            for (const itemDef of matchingItemDefinitions) {
                totalCount += this.inventoryManager.countItems(itemDef.id, this.gameState.inventory.container.items);
            }

            if (totalCount < component.quantity) {
                return false;
            }
        }
        return true;
    }

    isValidPlacement(definition, targetTilePos) {
        // ... (existing logic remains the same)
        return true;
    }

    async placeConstruction(constructionId, targetTilePos) {
        if (!this.canBuild(constructionId)) {
            return false;
        }

        const definition = this.constructionDefinitions[constructionId];
        if (!this.isValidPlacement(definition, targetTilePos)) {
            return false;
        }

        for (const component of definition.components) {
            if (component.isWorldPrerequisite) continue;

            const matchingItemDefinitions = this.recipeResolver.findMatchingItemDefinitions(component);
            let remainingQuantity = component.quantity;

            for (const itemDef of matchingItemDefinitions) {
                const countInInventory = this.inventoryManager.countItems(itemDef.id, this.gameState.inventory.container.items);
                const quantityToRemove = Math.min(remainingQuantity, countInInventory);

                if (quantityToRemove > 0) {
                    this.inventoryManager.removeItems(itemDef.id, quantityToRemove, this.gameState.inventory.container.items);
                    remainingQuantity -= quantityToRemove;
                }

                if (remainingQuantity === 0) {
                    break;
                }
            }
        }

        const size = definition.size || { width: 1, height: 1 };
        const { x: startX, y: startY, z } = targetTilePos;

        for (let dy = 0; dy < size.height; dy++) {
            for (let dx = 0; dx < size.width; dx++) {
                const currentX = startX + dx;
                const currentY = startY + dy;
                this.mapManager.updateTileOnLayer(currentX, currentY, z, 'building', definition.tileIdPlaced);
            }
        }

        if (definition.trapToPlace && this.trapManager) {
            // ... (existing logic remains the same)
        }

        if (definition.health || definition.tags?.includes('container') || definition.category === 'resource_production') {
            // ... (existing logic remains the same)
        }

        if (this.timeManager && definition.timeToBuild > 0) {
            this.timeManager.advanceTime(this.gameState, definition.timeToBuild);
        }

        if (definition.xpAward && this.xpManager) {
            this.xpManager.awardXp(definition.xpAward, this.gameState);
        }

        if (window.updateInventoryUI) window.updateInventoryUI();
        if (window.mapRenderer) window.mapRenderer.scheduleRender();

        return true;
    }
}

window.ConstructionManager = ConstructionManager;
