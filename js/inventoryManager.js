// js/inventoryManager.js

const InventoryManager = {
    /**
     * Counts the number of items with a specific itemId in an inventory list.
     * Handles stackable items by summing their quantities.
     * @param {string} itemId - The ID of the item to count.
     * @param {Array<object>} inventoryItems - The list of items in the inventory.
     * @returns {number} The total quantity of the specified item.
     */
    countItems: function (itemId, inventoryItems) {
        let count = 0;
        if (!inventoryItems || !Array.isArray(inventoryItems)) {
            return 0;
        }
        for (const item of inventoryItems) {
            if (item && item.id === itemId) {
                count += (item.quantity || 1); // Sum quantities for stackable items
            }
        }
        return count;
    },

    /**
     * Removes a specified quantity of an item from an inventory list.
     * Handles stackable items correctly.
     * @param {string} itemId - The ID of the item to remove.
     * @param {number} quantityToRemove - The quantity to remove.
     * @param {Array<object>} inventoryItems - The list of items in the inventory (will be modified directly).
     * @returns {boolean} True if removal was successful, false otherwise (e.g., not enough items).
     */
    removeItems: function (itemId, quantityToRemove, inventoryItems) {
        if (!inventoryItems || !Array.isArray(inventoryItems) || quantityToRemove <= 0) {
            return false;
        }

        let totalAvailable = this.countItems(itemId, inventoryItems);
        if (totalAvailable < quantityToRemove) {
            return false; // Not enough items
        }

        let remainingToRemove = quantityToRemove;
        for (let i = inventoryItems.length - 1; i >= 0; i--) {
            if (remainingToRemove <= 0) break;
            const item = inventoryItems[i];
            if (item && item.id === itemId) {
                if (item.stackable && item.quantity > 0) {
                    if (item.quantity > remainingToRemove) {
                        item.quantity -= remainingToRemove;
                        remainingToRemove = 0;
                    } else {
                        remainingToRemove -= item.quantity;
                        inventoryItems.splice(i, 1); // Remove the stack
                    }
                } else { // Non-stackable or old item without quantity
                    inventoryItems.splice(i, 1);
                    remainingToRemove--;
                }
            }
        }
        return remainingToRemove === 0;
    },

    /**
     * Adds an item (or multiple of a stackable item) to an inventory list.
     * Handles stacking if the item is stackable and a stack already exists.
     * @param {object} itemToAddInstance - An instance of the item to add (should have id, name, stackable, maxStack, quantity=1 if new).
     * @param {number} quantity - The number of this item to add.
     * @param {Array<object>} inventoryItems - The list of items in the inventory (will be modified).
     * @param {number} maxSlots - The maximum number of slots in this inventory.
     * @returns {boolean} True if the item(s) were successfully added, false otherwise (e.g., inventory full).
     */
    addItemToInventory: function (itemToAddInstance, quantity, inventoryItems, maxSlots) {
        if (!itemToAddInstance || !itemToAddInstance.id || quantity <= 0) {
            logToConsole("[InventoryManager] addItemToInventory: Invalid item or quantity.", "warn", { itemToAddInstance, quantity });
            return false;
        }
        if (!inventoryItems || !Array.isArray(inventoryItems)) {
            logToConsole("[InventoryManager] addItemToInventory: inventoryItems is not a valid array.", "error");
            return false; // Should not happen if gameState is managed well
        }

        const itemDef = window.assetManager ? window.assetManager.getItem(itemToAddInstance.id) : itemToAddInstance; // Get definition for stack info
        const isStackable = itemDef.stackable || false;
        const maxStack = itemDef.maxStack || 1; // Default maxStack to 1 if not defined (effectively non-stackable by default)

        let remainingQuantityToAdd = quantity;

        if (isStackable) {
            for (const existingItem of inventoryItems) {
                if (remainingQuantityToAdd <= 0) break;
                if (existingItem.id === itemToAddInstance.id && (existingItem.quantity || 0) < maxStack) {
                    const canAddToStack = maxStack - (existingItem.quantity || 0);
                    const amountToAddToStack = Math.min(remainingQuantityToAdd, canAddToStack);

                    existingItem.quantity = (existingItem.quantity || 0) + amountToAddToStack;
                    remainingQuantityToAdd -= amountToAddToStack;
                }
            }
        }

        // If items still remain to be added (either non-stackable or filled existing stacks)
        while (remainingQuantityToAdd > 0) {
            if (inventoryItems.length >= maxSlots) {
                logToConsole(`[InventoryManager] Inventory full (${inventoryItems.length}/${maxSlots}). Cannot add remaining ${remainingQuantityToAdd} of ${itemToAddInstance.name}.`, 'orange');
                return quantity > remainingQuantityToAdd; // Return true if some were added, false if none
            }

            const amountForThisNewStack = isStackable ? Math.min(remainingQuantityToAdd, maxStack) : 1;

            // Create a new item instance for the inventory
            // Important: Use the itemToAddInstance as a base, but ensure quantity is set for this stack
            const newItemStack = JSON.parse(JSON.stringify(itemToAddInstance)); // Create a new distinct object
            newItemStack.quantity = amountForThisNewStack;
            // Ensure other instance-specific properties like 'currentAmmo' are handled if itemToAddInstance is a template
            if (itemToAddInstance.currentAmmo !== undefined && newItemStack.currentAmmo === undefined) {
                newItemStack.currentAmmo = itemToAddInstance.currentAmmo;
            }


            inventoryItems.push(newItemStack);
            remainingQuantityToAdd -= amountForThisNewStack;
            if (!isStackable && remainingQuantityToAdd > 0) { // For non-stackable, each one takes a slot
                continue;
            } else if (isStackable && remainingQuantityToAdd > 0) {
                continue; // Need to create another stack
            }
        }

        // If we reach here, all items were added (or as many as possible if inventory filled up mid-way)
        return true;
    },

    // --- Weapon Modding Functions ---

    /**
     * Applies a mod item to a weapon item instance.
     * @param {object} weaponItemInstance - The weapon instance from inventory/hands.
     * @param {object} modItemInstance - The mod item instance from inventory.
     * @param {string} targetSlotType - The specific slot type on the weapon to attach the mod (e.g., "scope", "muzzle").
     * @returns {boolean} True if mod was successfully applied, false otherwise.
     */
    applyMod: function (weaponItemInstance, modItemInstance, targetSlotType) {
        if (!weaponItemInstance || !modItemInstance || !targetSlotType) {
            logToConsole("[InventoryManager.applyMod] Invalid arguments.", "red");
            return false;
        }

        const weaponDef = window.assetManager.getItem(weaponItemInstance.id);
        const modDef = window.assetManager.getItem(modItemInstance.id);

        if (!weaponDef || !modDef) {
            logToConsole("[InventoryManager.applyMod] Weapon or Mod definition not found.", "red");
            return false;
        }

        // Initialize modSlots and modsAttached if they don't exist on the instance
        if (!weaponItemInstance.modSlots) weaponItemInstance.modSlots = weaponDef.modSlots ? [...weaponDef.modSlots] : [];
        if (!weaponItemInstance.modsAttached) weaponItemInstance.modsAttached = weaponDef.modsAttached ? JSON.parse(JSON.stringify(weaponDef.modsAttached)) : {};


        // 1. Check compatibility
        if (!weaponItemInstance.modSlots.includes(targetSlotType)) {
            logToConsole(`[InventoryManager.applyMod] Weapon '${weaponDef.name}' does not have a '${targetSlotType}' slot.`, "orange");
            return false;
        }
        if (modDef.modType !== targetSlotType) {
            logToConsole(`[InventoryManager.applyMod] Mod '${modDef.name}' (type: ${modDef.modType}) is not compatible with slot type '${targetSlotType}'.`, "orange");
            return false;
        }
        if (modDef.appliesToWeaponCategory && !weaponDef.tags.some(tag => modDef.appliesToWeaponCategory.includes(tag))) {
            logToConsole(`[InventoryManager.applyMod] Mod '${modDef.name}' does not apply to weapon category/tags of '${weaponDef.name}'.`, "orange");
            return false;
        }
        if (modDef.appliesToAmmoType && weaponDef.ammoType !== modDef.appliesToAmmoType) {
            logToConsole(`[InventoryManager.applyMod] Mod '${modDef.name}' requires ammo type '${modDef.appliesToAmmoType}', but weapon uses '${weaponDef.ammoType}'.`, "orange");
            return false;
        }


        // 2. If slot is occupied, unequip old mod
        if (weaponItemInstance.modsAttached[targetSlotType]) {
            const oldModId = weaponItemInstance.modsAttached[targetSlotType];
            this.removeModStatEffects(weaponItemInstance, oldModId); // Remove old mod's stats

            const oldModDef = window.assetManager.getItem(oldModId);
            if (oldModDef) {
                this.addItemToInventory(JSON.parse(JSON.stringify(oldModDef)), 1, this.gameState.inventory.container.items, this.gameState.inventory.container.maxSlots);
                logToConsole(`[InventoryManager.applyMod] Returned previous mod '${oldModDef.name}' to inventory.`, "silver");
            }
        }

        // 3. Attach new mod
        weaponItemInstance.modsAttached[targetSlotType] = modItemInstance.id;

        // 4. Apply stat changes from new mod
        this.applyModStatEffects(weaponItemInstance, modItemInstance.id);

        // 5. Consume modItemInstance from player's inventory
        // Assuming modItemInstance is the one from player's inventory, and it's a single item.
        // If mods are stackable and player has multiple, this needs to pick one.
        // For simplicity, assume we're passing a specific instance to be consumed.
        this.removeItems(modItemInstance.id, 1, this.gameState.inventory.container.items);

        logToConsole(`[InventoryManager.applyMod] Applied mod '${modDef.name}' to '${weaponDef.name}' in slot '${targetSlotType}'.`, "green");
        if (window.updateInventoryUI) window.updateInventoryUI();
        if (window.renderCharacterInfo) window.renderCharacterInfo(); // If weapon stats are shown there
        return true;
    },

    /**
     * Removes a mod from a weapon item instance.
     * @param {object} weaponItemInstance - The weapon instance.
     * @param {string} slotTypeToRemove - The slot type from which to remove the mod.
     * @returns {boolean} True if mod was successfully removed, false otherwise.
     */
    removeMod: function (weaponItemInstance, slotTypeToRemove) {
        if (!weaponItemInstance || !weaponItemInstance.modsAttached || !weaponItemInstance.modsAttached[slotTypeToRemove]) {
            logToConsole(`[InventoryManager.removeMod] No mod found in slot '${slotTypeToRemove}' for weapon '${weaponItemInstance?.name || weaponItemInstance?.id}'.`, "orange");
            return false;
        }

        const modIdToRemove = weaponItemInstance.modsAttached[slotTypeToRemove];
        this.removeModStatEffects(weaponItemInstance, modIdToRemove); // Remove stat effects

        weaponItemInstance.modsAttached[slotTypeToRemove] = null; // Clear the slot

        // Add mod item back to player's inventory
        const modDef = window.assetManager.getItem(modIdToRemove);
        if (modDef) {
            this.addItemToInventory(JSON.parse(JSON.stringify(modDef)), 1, this.gameState.inventory.container.items, this.gameState.inventory.container.maxSlots);
            logToConsole(`[InventoryManager.removeMod] Removed mod '${modDef.name}' from '${weaponItemInstance.name}' and returned to inventory.`, "green");
        } else {
            logToConsole(`[InventoryManager.removeMod] Removed mod ID '${modIdToRemove}' from '${weaponItemInstance.name}', but definition not found to return item.`, "warn");
        }

        if (window.updateInventoryUI) window.updateInventoryUI();
        if (window.renderCharacterInfo) window.renderCharacterInfo();
        return true;
    },

    /**
     * Helper to apply stat effects of a mod to a weapon instance.
     * Modifies weaponItemInstance directly.
     */
    applyModStatEffects: function (weaponItemInstance, modId) {
        const modDef = window.assetManager.getItem(modId);
        if (!modDef || !modDef.effects) return;

        for (const effectKey in modDef.effects) {
            const effectValue = modDef.effects[effectKey];
            if (typeof weaponItemInstance[effectKey] === 'number') {
                weaponItemInstance[effectKey] += effectValue;
            } else if (effectKey === 'magazineSizeBonus' && typeof weaponItemInstance.magazineSize === 'number') {
                weaponItemInstance.magazineSize += effectValue;
                // Optionally, adjust currentAmmo if new mag size is smaller, or fully load if larger.
                // For simplicity, just increasing capacity. Player might need to reload.
            } else {
                // For non-numeric stats or complex effects, more specific handling is needed.
                // Example: weaponItemInstance.tags.push("silenced");
                // logToConsole(`[InventoryManager] Applying mod effect: ${effectKey} = ${effectValue} (custom logic may be needed)`, "debug");
            }
        }
        // Ensure base stats are present if mod effects try to modify them before they exist on instance
        // This is more for dynamic application rather than initial setup
        // e.g. if weapon instance doesn't have 'accuracy' but mod adds 'accuracyBonus'
        // weaponItemInstance.accuracy = (weaponItemInstance.accuracy || baseWeaponDef.accuracy || 0) + (modDef.effects.accuracyBonus || 0);

        // Recalculate derived stats if any depend on these (e.g. display strings)
    },

    /**
     * Helper to remove stat effects of a mod from a weapon instance.
     * Modifies weaponItemInstance directly.
     */
    removeModStatEffects: function (weaponItemInstance, modId) {
        const modDef = window.assetManager.getItem(modId);
        if (!modDef || !modDef.effects) return;

        for (const effectKey in modDef.effects) {
            const effectValue = modDef.effects[effectKey];
            if (typeof weaponItemInstance[effectKey] === 'number') {
                weaponItemInstance[effectKey] -= effectValue; // Subtract the bonus
            } else if (effectKey === 'magazineSizeBonus' && typeof weaponItemInstance.magazineSize === 'number') {
                weaponItemInstance.magazineSize -= effectValue;
                if (weaponItemInstance.magazineSize < 0) weaponItemInstance.magazineSize = 0; // Prevent negative
                if (weaponItemInstance.currentAmmo > weaponItemInstance.magazineSize) {
                    weaponItemInstance.currentAmmo = weaponItemInstance.magazineSize; // Adjust current ammo
                }
            } else {
                // Handle removal of tags or other complex effects
            }
        }
    }
};

// Make it globally accessible
window.inventoryManager = InventoryManager;

logToConsole("InventoryManager initialized.", "blue");
