// js/craftingManager.js

class CraftingManager {
    constructor(gameState, assetManager, inventoryManager, xpManager, timeManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.inventoryManager = inventoryManager;
        this.xpManager = xpManager;
        this.timeManager = timeManager; // For advancing game time
        this.recipes = {};
    }

    async initialize() {
        this.recipes = {}; // Initialize as an empty object

        if (!this.assetManager || !this.assetManager.itemsById) {
            return;
        }

        const allItemDefinitions = Object.values(this.assetManager.itemsById);

        allItemDefinitions.forEach(itemDef => {
            if (itemDef && itemDef.recipe) {
                if (!itemDef.recipe.components || !Array.isArray(itemDef.recipe.components)) {
                    return;
                }

                this.recipes[itemDef.id] = {
                    ...itemDef.recipe,
                    id: itemDef.id, // Ensure the recipe has an id
                    resultItemId: itemDef.id,
                    resultQuantity: itemDef.recipe.batch_size || 1,
                    name: `Recipe: ${itemDef.name}`
                };
            }
        });
    }

    /**
     * Gets all recipes known by the system.
     * Does NOT check for components, skills, or workbench.
     * @returns {Array<object>} An array of all recipe definitions.
     */
    getAllRecipes() {
        if (!this.recipes || typeof this.recipes !== 'object') {
            return [];
        }

        return Object.values(this.recipes);
    }

    /**
     * Checks if the player has the required components and meets other conditions for a specific recipe.
     * @param {string} recipeId - The ID of the recipe.
     * @param {object} playerInventory - The player's inventory (e.g., gameState.inventory.container.items).
     * @returns {boolean} True if the player can craft the item, false otherwise.
     */
    canCraft(recipeId, playerInventory) {
        const recipe = this.recipes[recipeId];
        if (!recipe) {
            return false;
        }

        // Check skill requirements
        const player = this.gameState;
        if (recipe.skillRequired && recipe.skillLevelRequired) {
            if (getSkillValue(recipe.skillRequired, player) < recipe.skillLevelRequired) return false;
        }

        // Check requiredStationType against gameState.activeCraftingStationType
        if (recipe.requiredStationType) {
            if (!this.gameState.activeCraftingStationType || this.gameState.activeCraftingStationType !== recipe.requiredStationType) {
                return false;
            }
        }

        // Check components
        for (const component of recipe.components) {
            const matchingItems = this.inventoryManager.findItemsByFamily(playerInventory, component.family, component.require);
            const count = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
            if (count < component.quantity) {
                return false;
            }
        }
        return true;
    }

    /**
     * Attempts to craft an item.
     * @param {string} recipeId - The ID of the recipe to craft.
     * @returns {boolean} True if crafting was successful, false otherwise.
     */
    async craftItem(recipeId) {
        const playerInventoryItems = this.gameState.inventory.container.items;
        if (!this.canCraft(recipeId, playerInventoryItems)) {
            return false;
        }

        const recipe = this.recipes[recipeId];

        // Consume components based on family and properties
        for (const component of recipe.components) {
            const itemsToRemove = this.inventoryManager.findItemsByFamily(playerInventoryItems, component.family, component.require);
            if (!this.inventoryManager.removeItemsByFamily(itemsToRemove, component.quantity, playerInventoryItems)) {
                return false;
            }
        }

        // Add result item(s)
        const resultItemDef = await this.assetManager.getItem(recipe.resultItemId);
        if (!resultItemDef) {
            if (window.uiManager) window.uiManager.showToastNotification("Crafting failed: result item definition missing.", "error");
            return false;
        }

        for (let i = 0; i < (recipe.resultQuantity || 1); i++) {
            const newItemInstance = JSON.parse(JSON.stringify(resultItemDef));
            if (!this.inventoryManager.addItemToInventory(newItemInstance, 1, playerInventoryItems, this.gameState.inventory.container.maxSlots)) {
                if (window.uiManager) window.uiManager.showToastNotification(`Inventory full. Crafted ${newItemInstance.name} lost!`, "error");
            }
        }

        // Advance time
        if (this.timeManager && typeof this.timeManager.advanceTime === 'function' && recipe.timeToCraft > 0) {
            this.timeManager.advanceTime(this.gameState, recipe.timeToCraft);
        }

        // Award XP
        const xpGainedFromCrafting = 5;
        if (this.xpManager && typeof this.xpManager.awardXp === 'function') {
            this.xpManager.awardXp(xpGainedFromCrafting, this.gameState);
        }

        if (window.uiManager) window.uiManager.showToastNotification(`Crafted ${resultItemDef.name}!`, "success");
        if (window.audioManager) window.audioManager.playUiSound('ui_craft_success_01.wav');

        if (window.updateInventoryUI) window.updateInventoryUI();
        if (window.renderCharacterInfo) window.renderCharacterInfo();

        return true;
    }

    getComponentDisplayName(component) {
        if (!component) return "Unknown";

        if (component.family) {
            let name = `Any ${component.family.replace(/_/g, ' ')}`;
            if (component.require) {
                const reqs = Object.entries(component.require).map(([key, value]) => {
                    if (Array.isArray(value)) return `${key}: ${value.join(' or ')}`;
                    return `${key}: ${value}`;
                }).join(', ');
                if (reqs) name += ` (${reqs})`;
            }
            return name;
        }

        // Fallback for old format, just in case
        if (component.itemId) {
            const itemDef = this.assetManager.getItem(component.itemId);
            return itemDef ? itemDef.name : component.itemId;
        }

        return "Invalid Component";
    }
}

window.CraftingManager = CraftingManager;
