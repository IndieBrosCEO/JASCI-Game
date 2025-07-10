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

        // Award XP
        // TODO: Consider making xpAward data-driven from recipe definition itself.
        const xpGainedFromCrafting = 5; // Small fixed amount for now
        if (this.xpManager && typeof this.xpManager.awardXp === 'function') {
            this.xpManager.awardXp(xpGainedFromCrafting, this.gameState);
        } else {
            logToConsole(`${this.logPrefix} xpManager not available, cannot award XP for crafting.`, 'warn');
        }

        logToConsole(`${this.logPrefix} Successfully crafted ${recipe.resultQuantity || 1}x ${resultItemDef.name}. Awarded ${xpGainedFromCrafting} XP.`, 'green');
        if (window.uiManager) window.uiManager.showToastNotification(`Crafted ${resultItemDef.name}!`, "success");
        if (window.audioManager) window.audioManager.playUiSound('ui_craft_success_01.wav'); // Placeholder

        if (window.updateInventoryUI) window.updateInventoryUI();
        if (window.renderCharacterInfo) window.renderCharacterInfo(); // If XP or skills affect display

        return true;
    }

    // --- Weapon Modding ---
    getApplicableMods(weaponItemInstance) {
        if (!weaponItemInstance || !this.gameState.inventory || !this.gameState.inventory.container || !this.assetManager) {
            logToConsole(`${this.logPrefix} getApplicableMods: Invalid weapon instance or missing managers/inventory.`, "warn");
            return [];
        }

        const applicableMods = [];
        const weaponDef = this.assetManager.getItem(weaponItemInstance.id);
        if (!weaponDef) {
            logToConsole(`${this.logPrefix} getApplicableMods: Weapon definition not found for ${weaponItemInstance.id}.`, "warn");
            return [];
        }

        const weaponSlots = weaponItemInstance.modSlots || weaponDef.modSlots || [];

        this.gameState.inventory.container.items.forEach(itemInInventory => {
            const modDef = this.assetManager.getItem(itemInInventory.id); // itemInInventory is an instance, get its base definition
            if (modDef && (modDef.itemCategory === 'weapon_mod' || modDef.isMod)) { // Check if it's a mod
                // Check slot compatibility: modDef.modType should be one of the weapon's available slot types
                if (weaponSlots.includes(modDef.modType)) {
                    let compatible = true;
                    // Check weapon category/tag compatibility
                    if (modDef.appliesToWeaponCategory && modDef.appliesToWeaponCategory.length > 0) {
                        if (!weaponDef.tags || !weaponDef.tags.some(tag => modDef.appliesToWeaponCategory.includes(tag))) {
                            compatible = false;
                        }
                    }
                    // Check ammo type compatibility
                    if (compatible && modDef.appliesToAmmoType) {
                        if (weaponDef.ammoType !== modDef.appliesToAmmoType) {
                            compatible = false;
                        }
                    }

                    if (compatible) {
                        applicableMods.push(itemInInventory); // Add the item instance from inventory
                    }
                }
            }
        });
        logToConsole(`${this.logPrefix} Found ${applicableMods.length} applicable mods for ${weaponDef.name}.`, "info");
        return applicableMods;
    }

    applyMod(weaponItemInstance, modItemInstance, slotType) {
        // This function in CraftingManager will now be a wrapper for InventoryManager.applyMod
        if (!window.inventoryManager || typeof window.inventoryManager.applyMod !== 'function') {
            logToConsole(`${this.logPrefix} applyMod: InventoryManager or its applyMod function is not available.`, "error");
            return false;
        }
        // The CraftingUI will pass the weapon *instance* from handSlots/inventory and mod *instance* from inventory.
        // InventoryManager.applyMod should handle these instances.
        const success = window.inventoryManager.applyMod(weaponItemInstance, modItemInstance, slotType);
        if (success) {
            logToConsole(`${this.logPrefix} Mod application delegated to InventoryManager and was successful.`, "info");
            // UI updates (inventory, character info if weapon stats displayed) handled by InventoryManager or CraftingUI
        } else {
            logToConsole(`${this.logPrefix} Mod application delegated to InventoryManager and failed.`, "warn");
        }
        return success;
    }

    removeMod(weaponItemInstance, slotType) {
        // This function in CraftingManager will now be a wrapper for InventoryManager.removeMod
        if (!window.inventoryManager || typeof window.inventoryManager.removeMod !== 'function') {
            logToConsole(`${this.logPrefix} removeMod: InventoryManager or its removeMod function is not available.`, "error");
            return false;
        }
        const success = window.inventoryManager.removeMod(weaponItemInstance, slotType);
        if (success) {
            logToConsole(`${this.logPrefix} Mod removal delegated to InventoryManager and was successful.`, "info");
        } else {
            logToConsole(`${this.logPrefix} Mod removal delegated to InventoryManager and failed.`, "warn");
        }
        return success;
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

window.CraftingManager = CraftingManager;
