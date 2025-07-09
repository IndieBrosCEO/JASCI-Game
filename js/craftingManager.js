// js/craftingManager.js

class CraftingManager {
    constructor(gameState, assetManager, inventoryManager, xpManager, timeManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.inventoryManager = inventoryManager;
        this.xpManager = xpManager;
        this.timeManager = timeManager; // For advancing game time
        this.recipes = {};
        this.logPrefix = "[CraftingManager]";
    }

    async initialize() {
        this.recipes = {}; // Initialize as an empty object

        if (!this.assetManager || !this.assetManager.itemsById) {
            logToConsole(`${this.logPrefix} AssetManager or itemsById not available. Cannot load recipes from items.`, 'red');
            return;
        }

        const allItemDefinitions = this.assetManager.itemsById;
        let recipesFoundCount = 0;

        for (const itemId in allItemDefinitions) {
            if (allItemDefinitions.hasOwnProperty(itemId)) {
                const itemDef = allItemDefinitions[itemId];
                if (itemDef && itemDef.recipe) {
                    // Validate the recipe structure a bit (optional, but good practice)
                    if (!itemDef.recipe.components || !Array.isArray(itemDef.recipe.components)) {
                        logToConsole(`${this.logPrefix} Item '${itemDef.id}' has a recipe defined, but 'components' are missing or not an array. Skipping recipe.`, 'orange');
                        continue;
                    }

                    // The recipe key will be the ID of the item that is produced
                    this.recipes[itemDef.id] = {
                        ...itemDef.recipe, // Spread all properties from the item's recipe object
                        resultItemId: itemDef.id, // Implicitly the item itself
                        resultQuantity: itemDef.recipe.resultQuantity || 1, // Default to 1 if not specified
                        name: itemDef.name // Use the item's name for the recipe name
                    };
                    recipesFoundCount++;
                }
            }
        }

        if (recipesFoundCount === 0) {
            logToConsole(`${this.logPrefix} No craftable items with recipes found in item definitions. Crafting will be limited.`, 'orange');
        } else {
            logToConsole(`${this.logPrefix} Initialized with ${recipesFoundCount} crafting recipes from item definitions.`, 'blue');
        }
    }

    /**
     * Gets all recipes the player currently meets the skill and workbench requirements for.
     * Does NOT check for components.
     * @returns {Array<object>} An array of recipe definitions.
     */
    getKnownAndAvailableRecipes() {
        // For now, player knows all recipes. Future: implement recipe learning.
        const available = [];
        const player = this.gameState; // Assuming player skills are on gameState or gameState.player

        for (const recipeId in this.recipes) {
            const recipe = this.recipes[recipeId];
            let canAttempt = true;

            // Check skill requirement
            if (recipe.skillRequired && recipe.skillLevelRequired) {
                const playerScore = getSkillValue(recipe.skillRequired, player);
                if (playerScore < recipe.skillLevelRequired) {
                    canAttempt = false;
                }
            }

            // Check workbench requirement
            // This needs a way to know what workbenches are nearby or being interacted with.
            // For now, assume no workbench needed unless specified, or player is at a generic one.
            // A more complex system would pass a nearbyWorkbenchId or check player's surroundings.
            if (recipe.workbenchRequired) {
                // Placeholder: Assume player is NOT at the required workbench for now if one is needed.
                // This will be refined when base building / interactable workbenches are implemented.
                // canAttempt = false; 
                // For testing, let's assume for now that if a workbench is required, the player is magically at one.
                // logToConsole(`${this.logPrefix} Recipe ${recipe.name} requires workbench ${recipe.workbenchRequired}. (Workbench check not fully implemented yet)`, 'grey');
            }

            if (canAttempt) {
                available.push(recipe);
            }
        }
        return available;
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
            logToConsole(`${this.logPrefix} Recipe ID '${recipeId}' not found.`, 'red');
            return false;
        }

        // Re-check skill and workbench (though getKnownAndAvailableRecipes should pre-filter)
        const player = this.gameState;
        if (recipe.skillRequired && recipe.skillLevelRequired) {
            if (getSkillValue(recipe.skillRequired, player) < recipe.skillLevelRequired) return false;
        }

        // NEW: Check requiredStationType against gameState.activeCraftingStationType
        if (recipe.requiredStationType) {
            if (!this.gameState.activeCraftingStationType || this.gameState.activeCraftingStationType !== recipe.requiredStationType) {
                // logToConsole(`${this.logPrefix} Cannot craft '${recipe.name}'. Requires station '${recipe.requiredStationType}', but currently at '${this.gameState.activeCraftingStationType || "no station"}'.`, 'orange');
                return false;
            }
        }
        // Old workbenchRequired check is removed as it's replaced by requiredStationType

        // Check components
        for (const component of recipe.components) {
            const count = this.inventoryManager.countItems(component.itemId, playerInventory);
            if (count < component.quantity) {
                // logToConsole(`${this.logPrefix} Cannot craft '${recipe.name}'. Missing ${component.quantity - count} of ${component.itemId}.`, 'orange');
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
        const playerInventoryItems = this.gameState.inventory.container.items; // Direct access for now
        if (!this.canCraft(recipeId, playerInventoryItems)) {
            logToConsole(`${this.logPrefix} Pre-craft check failed for '${recipeId}'. Player may be missing components, skill, or workbench.`, 'orange');
            if (window.uiManager) window.uiManager.showToastNotification("Cannot craft: missing components, skill, or required workbench.", "error");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return false;
        }

        const recipe = this.recipes[recipeId];

        // Consume components
        for (const component of recipe.components) {
            if (!this.inventoryManager.removeItems(component.itemId, component.quantity, playerInventoryItems)) {
                // This should not happen if canCraft passed, but as a safeguard:
                logToConsole(`${this.logPrefix} CRITICAL ERROR: Failed to remove component ${component.itemId} during crafting of '${recipe.name}', though canCraft was true.`, 'red');
                if (window.uiManager) window.uiManager.showToastNotification("Crafting failed: component inconsistency.", "error");
                // Potentially roll back any previously removed components if implementing transactions
                return false;
            }
        }

        // Add result item(s)
        const resultItemDef = await this.assetManager.getItem(recipe.resultItemId);
        if (!resultItemDef) {
            logToConsole(`${this.logPrefix} CRITICAL ERROR: Result item definition '${recipe.resultItemId}' not found for recipe '${recipe.name}'.`, 'red');
            // Need to decide how to handle this - roll back consumed components?
            if (window.uiManager) window.uiManager.showToastNotification("Crafting failed: result item definition missing.", "error");
            return false;
        }

        for (let i = 0; i < (recipe.resultQuantity || 1); i++) {
            // Create a new instance of the item
            const newItemInstance = JSON.parse(JSON.stringify(resultItemDef)); // Simple deep clone
            // Any specific instance properties for crafted items would be set here if needed.
            if (!this.inventoryManager.addItemToInventory(newItemInstance, 1, playerInventoryItems, this.gameState.inventory.container.maxSlots)) {
                logToConsole(`${this.logPrefix} Failed to add crafted item '${newItemInstance.name}' to inventory (perhaps full?). Item lost.`, 'red');
                if (window.uiManager) window.uiManager.showToastNotification(`Inventory full. Crafted ${newItemInstance.name} lost!`, "error");
                // No rollback of components for now, item is lost if inventory full.
            }
        }

        // Advance time
        if (this.timeManager && typeof this.timeManager.advanceTime === 'function' && recipe.timeToCraft > 0) {
            this.timeManager.advanceTime(this.gameState, recipe.timeToCraft); // Assuming timeToCraft is in game turns/ticks
        }

        // Award XP (placeholder for now)
        if (recipe.xpAward && this.xpManager && typeof this.xpManager.awardXp === 'function') {
            this.xpManager.awardXp(recipe.xpAward, this.gameState);
        }

        logToConsole(`${this.logPrefix} Successfully crafted ${recipe.resultQuantity || 1}x ${resultItemDef.name}.`, 'green');
        if (window.uiManager) window.uiManager.showToastNotification(`Crafted ${resultItemDef.name}!`, "success");
        if (window.audioManager) window.audioManager.playUiSound('ui_craft_success_01.wav'); // Placeholder

        if (window.updateInventoryUI) window.updateInventoryUI();
        if (window.renderCharacterInfo) window.renderCharacterInfo(); // If XP or skills affect display

        return true;
    }

    // --- Weapon Modding (Placeholders) ---
    getApplicableMods(weaponInstance) {
        // TODO: Find all mod items in player inventory that are compatible with weaponInstance.modSlots and weaponInstance.type/tags
        return [];
    }

    applyMod(weaponInstance, modItemInstance, slotType) {
        // TODO:
        // 1. Check compatibility (slotType on weapon, modItem.modType, modItem.appliesToWeaponType vs weaponInstance.type/tags)
        // 2. If slot is occupied, unequip old mod (return to inventory or destroy)
        // 3. Attach new mod: weaponInstance.modsAttached[slotType] = modItemInstance.id
        // 4. Apply stat changes from modItemInstance to weaponInstance (e.g. accuracy, damage, range)
        // 5. Consume modItemInstance from inventory if it's a one-time use.
        // 6. Update UI.
        logToConsole(`${this.logPrefix} ApplyMod (Not implemented): Attempt to apply ${modItemInstance?.name} to ${weaponInstance?.name} in slot ${slotType}.`, 'grey');
        return false;
    }

    removeMod(weaponInstance, slotType) {
        // TODO:
        // 1. Check if slotType has a mod.
        // 2. Get modItemDef for the attached mod.
        // 3. Remove stat changes from weaponInstance.
        // 4. Add mod item back to player inventory (if not destroyed on removal).
        // 5. Clear slot: weaponInstance.modsAttached[slotType] = null.
        // 6. Update UI.
        logToConsole(`${this.logPrefix} RemoveMod (Not implemented): Attempt to remove mod from ${weaponInstance?.name}'s ${slotType} slot.`, 'grey');
        return false;
    }
}

// Make globally accessible or manage through a central game object
// window.craftingManager = new CraftingManager(window.gameState, window.assetManager, window.inventoryManager, window.xpManager, window.TimeManager);
// Initialization (loading recipes) would often be async and happen during main game setup.
// Example:
// if (!window.craftingManager && window.gameState && window.assetManager && window.inventoryManager && window.xpManager && window.TimeManager) {
//     window.craftingManager = new CraftingManager(window.gameState, window.assetManager, window.inventoryManager, window.xpManager, window.TimeManager);
//     window.craftingManager.initialize().then(() => {
//         logToConsole("CraftingManager initialized and recipes loaded.");
//     });
// }
