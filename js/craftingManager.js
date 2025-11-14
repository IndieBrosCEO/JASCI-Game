// js/craftingManager.js

class CraftingManager {
    constructor(gameState, assetManager, inventoryManager, xpManager, timeManager, recipeResolver) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.inventoryManager = inventoryManager;
        this.xpManager = xpManager;
        this.timeManager = timeManager;
        this.recipeResolver = recipeResolver;
        this.recipes = {};
        this.logPrefix = "[CraftingManager]";
    }

    async initialize() {
        this.recipes = {};

        if (!this.assetManager || !this.assetManager.itemsById) {
            return;
        }

        const allItemDefinitions = this.assetManager.itemsById;

        for (const itemId in allItemDefinitions) {
            const itemDef = allItemDefinitions[itemId];
            if (itemDef && itemDef.recipe) {
                this.recipes[itemDef.id] = {
                    ...itemDef.recipe,
                    resultItemId: itemDef.id,
                    resultQuantity: itemDef.recipe.resultQuantity || 1,
                    name: itemDef.name
                };
            }
        }
    }

    getAllRecipes() {
        return Object.values(this.recipes);
    }

    canCraft(recipeId, playerInventory) {
        const recipe = this.recipes[recipeId];
        if (!recipe) {
            return false;
        }

        const player = this.gameState;
        if (recipe.skillRequired && recipe.skillLevelRequired) {
            if (getSkillValue(recipe.skillRequired, player) < recipe.skillLevelRequired) {
                return false;
            }
        }

        if (recipe.requiredStationType) {
            if (!this.gameState.activeCraftingStationType || this.gameState.activeCraftingStationType !== recipe.requiredStationType) {
                return false;
            }
        }

        for (const component of recipe.components) {
            const matchingItemDefinitions = this.recipeResolver.findMatchingItemDefinitions(component);
            if (matchingItemDefinitions.length === 0) {
                return false;
            }

            let totalCount = 0;
            for (const itemDef of matchingItemDefinitions) {
                totalCount += this.inventoryManager.countItems(itemDef.id, playerInventory);
            }

            if (totalCount < component.quantity) {
                return false;
            }
        }
        return true;
    }

    async craftItem(recipeId) {
        const playerInventoryItems = this.gameState.inventory.container.items;
        if (!this.canCraft(recipeId, playerInventoryItems)) {
            return false;
        }

        const recipe = this.recipes[recipeId];

        for (const component of recipe.components) {
            const matchingItemDefinitions = this.recipeResolver.findMatchingItemDefinitions(component);
            let remainingQuantity = component.quantity;

            for (const itemDef of matchingItemDefinitions) {
                const countInInventory = this.inventoryManager.countItems(itemDef.id, playerInventoryItems);
                const quantityToRemove = Math.min(remainingQuantity, countInInventory);

                if (quantityToRemove > 0) {
                    this.inventoryManager.removeItems(itemDef.id, quantityToRemove, playerInventoryItems);
                    remainingQuantity -= quantityToRemove;
                }

                if (remainingQuantity === 0) {
                    break;
                }
            }
        }

        const resultItemDef = await this.assetManager.getItem(recipe.resultItemId);
        for (let i = 0; i < (recipe.resultQuantity || 1); i++) {
            const newItemInstance = JSON.parse(JSON.stringify(resultItemDef));
            this.inventoryManager.addItemToInventory(newItemInstance, 1, playerInventoryItems, this.gameState.inventory.container.maxSlots);
        }

        if (this.timeManager && recipe.timeToCraft > 0) {
            this.timeManager.advanceTime(this.gameState, recipe.timeToCraft);
        }

        const xpGainedFromCrafting = 5;
        if (this.xpManager) {
            this.xpManager.awardXp(xpGainedFromCrafting, this.gameState);
        }

        if (window.updateInventoryUI) window.updateInventoryUI();
        if (window.renderCharacterInfo) window.renderCharacterInfo();

        return true;
    }
}
window.CraftingManager = CraftingManager;
