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
    },

    // --- Functions merged from inventory.js ---

    calculateCumulativeCapacity: function (playerGameState) {
        if (!playerGameState || !playerGameState.stats || !playerGameState.player || !playerGameState.player.wornClothing) {
            console.error("calculateCumulativeCapacity: Invalid playerGameState object provided.");
            return 0;
        }
        let totalCapacity = 0;
        const strengthStat = playerGameState.stats.find(stat => stat.name === "Strength");
        if (strengthStat && typeof strengthStat.points === 'number') {
            totalCapacity = strengthStat.points;
            if (totalCapacity < 1) {
                console.warn(`CumulativeCapacity: Strength stat (${totalCapacity}) is less than 1. Setting base capacity to 1.`);
                totalCapacity = 1;
            }
        } else {
            console.warn("CumulativeCapacity: Could not find Strength stat or points invalid. Defaulting base capacity to 5.");
            totalCapacity = 5;
        }
        for (const layer in playerGameState.player.wornClothing) {
            const item = playerGameState.player.wornClothing[layer];
            if (item && item.capacity && typeof item.capacity === 'number') {
                totalCapacity += item.capacity;
            }
        }
        return totalCapacity;
    },

    /**
     * Checks if the player's main inventory container has at least a certain quantity of an item.
     * @param {string} itemId - The ID of the item to check for.
     * @param {number} quantity - The minimum quantity required.
     * @returns {boolean} True if the player has enough of the item, false otherwise.
     */
    hasItem: function (itemId, quantity = 1) {
        if (!window.gameState || !window.gameState.inventory || !window.gameState.inventory.container || !window.gameState.inventory.container.items) {
            logToConsole("[InventoryManager.hasItem] Player inventory not available.", "warn");
            return false;
        }
        return this.countItems(itemId, window.gameState.inventory.container.items) >= quantity;
    },

    // Note: InventoryContainer and Item constructors will be defined outside this object, in the same file.
    // Or, they could be static methods/properties if InventoryManager becomes a class.

    canAddItem: function (itemInstance) { // Renamed item to itemInstance for clarity
        // This function is now less critical as addItemToInventory handles detailed slot and stack checks.
        // It was based on item.size, which is different from stackability/maxSlots.
        // For now, let's keep its original logic but acknowledge its potential redundancy or need for rework.
        if (!window.gameState.inventory.container) {
            logToConsole("Inventory container not initialized yet (canAddItem).");
            return false;
        }
        // Original logic: based on item.size vs maxSlots (which was InventorySizes[sizeLabel])
        // New logic should ideally use countItems and check against maxSlots if we're strictly slot-based.
        // If we maintain item.size as a concept distinct from stack slots:
        const usedSlots = window.gameState.inventory.container.items
            .reduce((sum, i) => sum + (i.size || 1), 0); // Default size to 1 if not present
        const itemSize = itemInstance.size || 1; // Default item size to 1

        // This check is simplistic and doesn't account for stacking.
        // addItemToInventory is the more robust check.
        // This function might be deprecated or refactored to check if *any* more distinct items can be added
        // (i.e., if inventoryItems.length < maxSlots), regardless of size or stacking.
        // For now, keeping original logic to minimize disruption, but it's a point of conflict.
        return usedSlots + itemSize <= window.gameState.inventory.container.maxSlots;
    },

    addItem: function (itemInstance) { // Renamed item to itemInstance
        // This is the higher-level addItem. It should use this.addItemToInventory.
        if (!window.gameState.inventory.container) {
            logToConsole("Inventory container not initialized. Cannot add item (addItem).");
            return false;
        }

        // The 'itemInstance' here is expected to be a fully formed item object.
        // this.addItemToInventory expects an item definition-like object and quantity.
        // We need to adapt. If itemInstance already has quantity, use it.
        const quantityToAdd = itemInstance.quantity || 1;

        if (this.addItemToInventory(itemInstance, quantityToAdd, window.gameState.inventory.container.items, window.gameState.inventory.container.maxSlots)) {
            logToConsole(`Added ${quantityToAdd}x ${itemInstance.name}.`);
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.5 });
            if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI(); // Ensure 'this' context
            return true;
        } else {
            // addItemToInventory already logs if full.
            logToConsole(`Failed to add ${itemInstance.name} (addItem wrapper).`);
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return false;
        }
    },

    removeItem: function (itemIdOrName, quantity = 1) { // Now takes ID or Name, and quantity
        if (!window.gameState.inventory.container) {
            logToConsole("Inventory container not initialized (removeItem).");
            return null; // Or false for consistency with removeItems
        }
        const inv = window.gameState.inventory.container.items;

        // Try to find by ID first, then by name if not found by ID or if it's not an ID-like string
        let itemToRemove = inv.find(i => i.id === itemIdOrName);
        let actualItemId = itemIdOrName;

        if (!itemToRemove) { // If not found by ID, try by name
            const itemByName = inv.find(i => i.name && i.name.toLowerCase() === itemIdOrName.toLowerCase());
            if (itemByName) {
                itemToRemove = itemByName; // Found by name
                actualItemId = itemByName.id; // Use its ID for removeItems
            }
        }

        if (!itemToRemove) {
            logToConsole(`Item '${itemIdOrName}' not found in inventory (removeItem).`);
            return null; // Or false
        }

        // Use the more robust removeItems for actual removal
        if (this.removeItems(actualItemId, quantity, inv)) {
            logToConsole(`Removed ${quantity}x ${itemToRemove.name}.`);
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.4 });
            if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();
            // The original removeItem returned the removed item, but this.removeItems returns boolean.
            // For simplicity, this wrapper can also return boolean or the itemDef if needed.
            // Returning the definition for now if one was removed.
            return window.assetManager.getItem(actualItemId);
        } else {
            logToConsole(`Failed to remove ${quantity}x ${itemToRemove.name} (not enough or error).`);
            return null; // Or false
        }
    },

    dropItem: function (itemName) {
        // This function should now use the new removeItem (which uses ID or Name)
        const itemDefToDrop = this.removeItem(itemName, 1); // Attempt to remove 1

        if (itemDefToDrop) { // If removeItem was successful (returned item def)
            if (!window.gameState.playerPos || typeof window.gameState.playerPos.x === 'undefined' || typeof window.gameState.playerPos.y === 'undefined') {
                logToConsole("Cannot drop item: Player position is unknown.", "error");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
                // Try to add it back (need a full instance, not just def)
                this.addItem(new Item(itemDefToDrop));
                return false;
            }
            if (!window.gameState.floorItems) {
                window.gameState.floorItems = [];
            }
            // We need to create a new instance for the floor from the definition
            const itemInstanceForFloor = new Item(itemDefToDrop);
            window.gameState.floorItems.push({
                x: window.gameState.playerPos.x,
                y: window.gameState.playerPos.y,
                z: window.gameState.playerPos.z, // Add Z for floor items
                item: itemInstanceForFloor
            });
            logToConsole(`Dropped ${itemInstanceForFloor.name} on the floor at (${window.gameState.playerPos.x}, ${window.gameState.playerPos.y}, Z:${window.gameState.playerPos.z}).`);
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.6 });
            if (typeof window.mapRenderer !== 'undefined' && typeof window.mapRenderer.scheduleRender === 'function') {
                window.mapRenderer.scheduleRender();
            }
            if (window.gameState.inventory.open && typeof this.renderInventoryMenu === 'function') {
                this.renderInventoryMenu();
            }
            return true;
        }
        return false;
    },

    equipItem: function (itemName, handIndex) {
        if (!window.gameState.inventory.container) {
            logToConsole("Inventory container not initialized (equipItem).");
            return;
        }
        const inv = window.gameState.inventory.container.items;
        const itemIndex = inv.findIndex(i => i.name === itemName);

        if (itemIndex === -1) {
            logToConsole(`Item "${itemName}" not found in inventory (equipItem).`);
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }
        const item = inv[itemIndex];

        if (item.isClothing) {
            logToConsole(`${item.name} is clothing. Use the 'Wear' action instead (equipItem).`);
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }

        if (!item.canEquip) {
            logToConsole(`Cannot equip "${itemName}" to a hand slot (equipItem).`);
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }

        if (window.gameState.inventory.handSlots[handIndex]) {
            logToConsole(`Hand slot ${handIndex + 1} is already occupied by ${window.gameState.inventory.handSlots[handIndex].name} (equipItem).`);
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }

        // Use this.removeItems to handle removal from inventory, ensuring stack logic if applicable (though typically weapons aren't stacked)
        if (this.removeItems(item.id, 1, inv)) {
            item.equipped = true;
            window.gameState.inventory.handSlots[handIndex] = item; // Item is already the instance taken from inv
            logToConsole(`Equipped ${item.name} to hand slot ${handIndex + 1}.`);
            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.8 });
            if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();

            if (window.gameState.isInCombat &&
                window.gameState.combatPhase === 'playerAttackDeclare' &&
                typeof window.combatManager !== 'undefined' &&
                typeof window.combatManager.populateWeaponSelect === 'function') {
                logToConsole("Combat attack UI active after equipping item, refreshing weapon select (equipItem).");
                window.combatManager.populateWeaponSelect();
            }
        } else {
            logToConsole(`Failed to remove ${item.name} from inventory during equip (equipItem).`, "error");
        }
    },

    unequipItem: function (handIndex) {
        if (!window.gameState.inventory.container) {
            logToConsole("Inventory container not initialized (unequipItem).");
            return;
        }
        const itemToUnequip = window.gameState.inventory.handSlots[handIndex];
        if (!itemToUnequip) {
            logToConsole(`No item in hand ${handIndex + 1} (unequipItem).`);
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }

        // Use the robust addItemToInventory
        if (this.addItemToInventory(itemToUnequip, 1, window.gameState.inventory.container.items, window.gameState.inventory.container.maxSlots)) {
            itemToUnequip.equipped = false;
            window.gameState.inventory.handSlots[handIndex] = null;
            logToConsole(`Unequipped ${itemToUnequip.name}.`);
            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.8 });
            if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();

            if (window.gameState.isInCombat &&
                window.gameState.combatPhase === 'playerAttackDeclare' &&
                typeof window.combatManager !== 'undefined' &&
                typeof window.combatManager.populateWeaponSelect === 'function') {
                logToConsole("Combat attack UI active after unequipping item, refreshing weapon select (unequipItem).");
                window.combatManager.populateWeaponSelect();
            }
        } else {
            logToConsole(`Not enough space to unequip ${itemToUnequip.name} (unequipItem).`);
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        }
    },

    equipClothing: function (itemName) {
        if (!window.gameState.inventory.container) {
            logToConsole("Inventory container not initialized (equipClothing).");
            return;
        }
        const inv = window.gameState.inventory.container.items;
        const itemIndex = inv.findIndex(i => i.name === itemName);

        if (itemIndex === -1) {
            logToConsole(`Error: Item "${itemName}" not found in inventory (equipClothing).`);
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }
        const item = inv[itemIndex];

        if (!item.isClothing) {
            logToConsole(`Error: "${itemName}" is not clothing (equipClothing).`);
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }
        if (!item.layer || !Object.values(window.ClothingLayers || {}).includes(item.layer)) {
            logToConsole(`Error: "${itemName}" has an invalid or missing clothing layer: ${item.layer} (equipClothing).`);
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }
        const targetLayer = item.layer;
        if (window.gameState.player.wornClothing[targetLayer]) {
            logToConsole(`Layer ${targetLayer} is already occupied by ${window.gameState.player.wornClothing[targetLayer].name} (equipClothing).`);
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }

        if (this.removeItems(item.id, 1, inv)) { // Remove from inventory
            window.gameState.player.wornClothing[targetLayer] = item;
            item.equipped = true;
            window.gameState.inventory.container.maxSlots = this.calculateCumulativeCapacity(window.gameState);
            logToConsole(`Equipped ${itemName} to ${targetLayer}.`);
            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.8 });
            if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();
            if (typeof window.renderCharacterInfo === 'function') window.renderCharacterInfo();
        } else {
            logToConsole(`Failed to remove ${item.name} from inventory during equip (equipClothing).`, "error");
        }
    },

    unequipClothing: function (clothingLayer) {
        if (!window.gameState.inventory.container) {
            logToConsole("Inventory container not initialized (unequipClothing).");
            return;
        }
        if (!clothingLayer || !window.gameState.player.wornClothing.hasOwnProperty(clothingLayer)) {
            logToConsole(`Error: Invalid clothing layer "${clothingLayer}" (unequipClothing).`);
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }
        const itemToUnequip = window.gameState.player.wornClothing[clothingLayer];
        if (!itemToUnequip) {
            logToConsole(`No item to unequip from ${clothingLayer} (unequipClothing).`);
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return;
        }

        // Attempt to add to inventory first
        if (this.addItemToInventory(itemToUnequip, 1, window.gameState.inventory.container.items, window.gameState.inventory.container.maxSlots)) {
            window.gameState.player.wornClothing[clothingLayer] = null;
            itemToUnequip.equipped = false;
            window.gameState.inventory.container.maxSlots = this.calculateCumulativeCapacity(window.gameState);
            logToConsole(`Unequipped ${itemToUnequip.name} from ${clothingLayer}.`);
            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.8 });
        } else {
            logToConsole("Critical Warning: Not enough inventory space to unequip " + itemToUnequip.name + ". Item remains equipped.", "error");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return; // Do not proceed if item cannot be unequipped to inventory
        }
        if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();
        if (typeof window.renderCharacterInfo === 'function') window.renderCharacterInfo();
    },

    updateInventoryUI: function () {
        // This function relies on global gameState and DOM elements.
        if (!window.gameState.inventory.container && typeof logToConsole === 'function') {
            // logToConsole("updateInventoryUI called before inventory container is initialized.", "debug");
        }

        const equippedHandItemsDiv = document.getElementById("equippedHandItems");
        if (equippedHandItemsDiv) {
            equippedHandItemsDiv.innerHTML = "";
            window.gameState.inventory.handSlots.forEach((it, i) => {
                const d = document.createElement("div");
                const handName = i === 0 ? "Left Hand" : "Right Hand";
                d.textContent = it ? `${handName}: ${it.name}` : `${handName}: Empty`;
                equippedHandItemsDiv.appendChild(d);
            });
        }

        const equippedContainersDiv = document.getElementById("equippedContainers");
        const invCapacitySpan = document.getElementById("invCapacity");

        if (window.gameState.inventory.container) {
            if (equippedContainersDiv) {
                equippedContainersDiv.innerHTML = "";
                let foundContainers = false;
                if (window.gameState.player && window.gameState.player.wornClothing) {
                    for (const layer in window.gameState.player.wornClothing) {
                        const wornItem = window.gameState.player.wornClothing[layer];
                        if (wornItem && wornItem.capacity && typeof wornItem.capacity === 'number' && wornItem.capacity > 0) {
                            const containerDisplay = document.createElement("div");
                            containerDisplay.textContent = `${wornItem.name}: ${wornItem.capacity} slots`;
                            equippedContainersDiv.appendChild(containerDisplay);
                            foundContainers = true;
                        }
                    }
                }
                if (!foundContainers) {
                    equippedContainersDiv.textContent = "No capacity-providing clothing equipped.";
                }
            }
            if (invCapacitySpan) {
                const mainContainer = window.gameState.inventory.container;
                // Updated to use this.countItems for total quantity if items are stacked and "size" means something else.
                // However, original logic was item.size. For slot-based, it's items.length if not stacking,
                // or sum of quantities if items can take less than a "slot".
                // The original reduce((sum, i) => sum + i.size, 0) implies items have varying "size" impact.
                // This conflicts with addItemToInventory's maxSlots logic if maxSlots is # of items.
                // Assuming maxSlots is true slots, and item.size is how many slots it takes.
                // This needs careful review of how "size" and "slots" are meant to interact.
                // For now, sticking to original interpretation of item.size for usedSlots.
                const usedSlots = mainContainer.items.reduce((sum, i) => sum + (i.size || 1), 0);
                invCapacitySpan.textContent = `${usedSlots}/${mainContainer.maxSlots}`;
            }
        } else {
            if (equippedContainersDiv) equippedContainersDiv.innerHTML = "No container equipped.";
            if (invCapacitySpan) invCapacitySpan.textContent = "0/0";
        }

        const oldHandSlotsDiv = document.getElementById("handSlots"); // This element might be legacy
        if (oldHandSlotsDiv) {
            oldHandSlotsDiv.innerHTML = "";
        }
    },

    renderInventoryMenu: function () {
        const list = document.getElementById("inventoryList");
        if (!list) return;
        list.innerHTML = "";
        window.gameState.inventory.currentlyDisplayedItems = [];

        // Equipped Hand Items
        window.gameState.inventory.handSlots.forEach((item, index) => {
            if (item) {
                window.gameState.inventory.currentlyDisplayedItems.push({ ...item, equipped: true, source: 'hand', originalHandIndex: index, displayName: item.name });
            }
        });
        // Equipped Clothing
        for (const layer in window.gameState.player.wornClothing) {
            const item = window.gameState.player.wornClothing[layer];
            if (item) {
                window.gameState.inventory.currentlyDisplayedItems.push({ ...item, equipped: true, source: 'clothing', originalLayer: layer, displayName: item.name });
            }
        }
        // Container Items
        if (window.gameState.inventory.container && window.gameState.inventory.container.items) {
            window.gameState.inventory.container.items.forEach(item => {
                window.gameState.inventory.currentlyDisplayedItems.push({ ...item, equipped: false, source: 'container', displayName: item.name });
            });
        }
        // Floor Items
        let collectedFloorItems = [];
        if (window.gameState && window.gameState.floorItems && window.gameState.playerPos) {
            const { x: playerX, y: playerY, z: playerZ } = window.gameState.playerPos; // Include Z
            const R = 1; // Radius for nearby items
            window.gameState.floorItems.forEach(floorEntry => {
                if (floorEntry.x >= playerX - R && floorEntry.x <= playerX + R &&
                    floorEntry.y >= playerY - R && floorEntry.y <= playerY + R &&
                    floorEntry.z === playerZ) { // Check Z-level
                    collectedFloorItems.push({ ...floorEntry.item, equipped: false, source: 'floor', originalFloorItemEntry: floorEntry, displayName: floorEntry.item.name });
                }
            });
        }
        collectedFloorItems.forEach(fi => window.gameState.inventory.currentlyDisplayedItems.push(fi));

        // Nearby World Containers
        if (window.gameState.worldContainers && window.gameState.worldContainers.length > 0 && window.gameState.playerPos) {
            const { x: playerX, y: playerY, z: playerZ } = window.gameState.playerPos;
            const R = 1;
            window.gameState.worldContainers.forEach(container => {
                if (container.x >= playerX - R && container.x <= playerX + R &&
                    container.y >= playerY - R && container.y <= playerY + R &&
                    container.z === playerZ) { // Check Z-level
                    if (container.items && container.items.length > 0) {
                        container.items.forEach((item, itemIdx) => {
                            window.gameState.inventory.currentlyDisplayedItems.push({ ...item, equipped: false, source: 'worldContainer', containerRef: container, originalItemIndex: itemIdx, displayName: item.name });
                        });
                    }
                }
            });
        }

        if (window.gameState.inventory.currentlyDisplayedItems.length === 0) {
            list.textContent = " No items ";
            window.gameState.inventory.cursor = 0; return;
        }
        // Adjust cursor
        if (window.gameState.inventory.cursor >= window.gameState.inventory.currentlyDisplayedItems.length) {
            window.gameState.inventory.cursor = Math.max(0, window.gameState.inventory.currentlyDisplayedItems.length - 1);
        }
        if (window.gameState.inventory.cursor < 0 && window.gameState.inventory.currentlyDisplayedItems.length > 0) {
            window.gameState.inventory.cursor = 0;
        }

        let floorHeaderRendered = false;
        let lastContainerNameRendered = null;
        window.gameState.inventory.currentlyDisplayedItems.forEach((item, idx) => {
            let prefix = "";
            if (item.source === 'floor' && !floorHeaderRendered) {
                const floorHeader = document.createElement("div");
                floorHeader.textContent = "--- Floor ---";
                floorHeader.classList.add("inventory-subheader");
                list.appendChild(floorHeader);
                floorHeaderRendered = true; lastContainerNameRendered = null;
            } else if (item.source === 'worldContainer') {
                if (item.containerRef && item.containerRef.name !== lastContainerNameRendered) {
                    const containerHeader = document.createElement("div");
                    containerHeader.textContent = `--- Nearby: ${item.containerRef.name} ---`;
                    containerHeader.classList.add("inventory-subheader");
                    list.appendChild(containerHeader);
                    lastContainerNameRendered = item.containerRef.name;
                }
                floorHeaderRendered = false;
            } else if (item.source !== 'floor' && item.source !== 'worldContainer') {
                floorHeaderRendered = false; lastContainerNameRendered = null;
            }

            const d = document.createElement("div");
            if (item.equipped) prefix = "[EQUIPPED] ";
            else if (item.source === 'floor') prefix = "[FLOOR] ";
            else if (item.source === 'worldContainer') prefix = "[NEARBY] ";

            const sizeText = item.size !== undefined ? ` (Size: ${item.size})` : "";
            const quantityText = item.quantity > 1 ? ` (x${item.quantity})` : ""; // Show quantity for stacks
            const nameToDisplay = item.displayName || item.name || "Unknown Item";
            d.textContent = `${idx + 1}. ${prefix}${nameToDisplay}${quantityText}${sizeText}`;
            if (idx === window.gameState.inventory.cursor) d.classList.add("selected");
            list.appendChild(d);
        });
    },

    toggleInventoryMenu: function () {
        window.gameState.inventory.open = !window.gameState.inventory.open;
        if (window.audioManager) {
            window.audioManager.playUiSound(window.gameState.inventory.open ? 'ui_click_01.wav' : 'ui_click_01.wav', { volume: window.gameState.inventory.open ? 0.6 : 0.5 });
        }
        const inventoryListDiv = document.getElementById("inventoryList");
        if (!inventoryListDiv) return;
        if (window.gameState.inventory.open) {
            inventoryListDiv.classList.remove("hidden");
            inventoryListDiv.style.display = 'block';
            this.renderInventoryMenu();
        } else {
            inventoryListDiv.classList.add("hidden");
            inventoryListDiv.style.display = 'none';
            this.clearInventoryHighlight();
            window.gameState.inventory.currentlyDisplayedItems = [];
            if (window.gameState.isInCombat && window.gameState.combatPhase === 'playerAttackDeclare' && typeof window.combatManager?.populateWeaponSelect === 'function') {
                window.combatManager.populateWeaponSelect();
            }
        }
    },

    interactInventoryItem: function () {
        if (!window.gameState.inventory.currentlyDisplayedItems || window.gameState.inventory.currentlyDisplayedItems.length === 0) {
            logToConsole("No items to interact with (interactInventoryItem)."); return;
        }
        const cursorIndex = window.gameState.inventory.cursor;
        if (cursorIndex < 0 || cursorIndex >= window.gameState.inventory.currentlyDisplayedItems.length) {
            logToConsole("Invalid inventory cursor position (interactInventoryItem)."); return;
        }
        const selectedDisplayItem = window.gameState.inventory.currentlyDisplayedItems[cursorIndex];
        if (!selectedDisplayItem) {
            logToConsole("No item selected at cursor position (interactInventoryItem)."); return;
        }

        // Handle picking up from floor or world container
        if (selectedDisplayItem.source === 'floor') {
            const itemToTake = selectedDisplayItem.originalFloorItemEntry.item;
            if (this.addItem(itemToTake)) { // addItem uses this.addItemToInventory
                const floorItemIndex = window.gameState.floorItems.findIndex(entry => entry === selectedDisplayItem.originalFloorItemEntry);
                if (floorItemIndex > -1) window.gameState.floorItems.splice(floorItemIndex, 1);
                logToConsole(`Picked up ${itemToTake.name} from the floor.`);
                if (typeof window.mapRenderer?.scheduleRender === 'function') window.mapRenderer.scheduleRender();
            } else {
                logToConsole(`Not enough space to pick up ${itemToTake.name}.`);
                // addItem already plays error sound if full
            }
            if (window.gameState.inventory.open) this.renderInventoryMenu();
            return;
        } else if (selectedDisplayItem.source === 'worldContainer') {
            const container = selectedDisplayItem.containerRef;
            const itemIndexInContainer = selectedDisplayItem.originalItemIndex;
            if (!container || !container.items || !container.items[itemIndexInContainer]) {
                logToConsole("Error: Could not find item in world container (interactInventoryItem).", "error");
                if (window.gameState.inventory.open) this.renderInventoryMenu(); return;
            }
            const actualItemFromContainer = container.items[itemIndexInContainer];
            if (this.addItem(actualItemFromContainer)) {
                container.items.splice(itemIndexInContainer, 1);
                logToConsole(`Took ${actualItemFromContainer.name} from ${container.name}.`);
            } else {
                logToConsole(`Not enough space to pick up ${actualItemFromContainer.name} from ${container.name}.`);
            }
            if (window.gameState.inventory.open) this.renderInventoryMenu();
            return;
        }

        // Consumable logic
        if (selectedDisplayItem.isConsumable && selectedDisplayItem.effects && !selectedDisplayItem.equipped) {
            let consumed = false; const maxNeeds = 24;
            if (typeof window.gameState.playerHunger === 'undefined') window.gameState.playerHunger = maxNeeds;
            if (typeof window.gameState.playerThirst === 'undefined') window.gameState.playerThirst = maxNeeds;
            if (selectedDisplayItem.effects.hunger) {
                window.gameState.playerHunger = Math.min(window.gameState.playerHunger + selectedDisplayItem.effects.hunger, maxNeeds);
                consumed = true;
            }
            if (selectedDisplayItem.effects.thirst) {
                window.gameState.playerThirst = Math.min(window.gameState.playerThirst + selectedDisplayItem.effects.thirst, maxNeeds);
                consumed = true;
            }
            if (consumed) {
                logToConsole(`You consumed ${selectedDisplayItem.displayName}. Hunger: ${window.gameState.playerHunger}, Thirst: ${window.gameState.playerThirst}`);
                if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.6 });
                this.removeItem(selectedDisplayItem.id, 1); // Use ID and quantity
                if (typeof window.updatePlayerStatusDisplay === 'function') window.updatePlayerStatusDisplay();
                if (window.gameState.inventory.open) this.renderInventoryMenu();
                return;
            }
        }

        // Equip/Unequip logic
        if (selectedDisplayItem.equipped) {
            if (selectedDisplayItem.source === 'clothing' && selectedDisplayItem.originalLayer) {
                this.unequipClothing(selectedDisplayItem.originalLayer);
            } else if (selectedDisplayItem.source === 'hand' && selectedDisplayItem.originalHandIndex !== undefined) {
                this.unequipItem(selectedDisplayItem.originalHandIndex);
            }
        } else {
            if (selectedDisplayItem.isClothing) {
                this.equipClothing(selectedDisplayItem.name);
            } else if (selectedDisplayItem.canEquip) {
                let handSlotToEquip = window.gameState.inventory.handSlots[0] ? (window.gameState.inventory.handSlots[1] ? -1 : 1) : 0;
                if (handSlotToEquip !== -1) this.equipItem(selectedDisplayItem.name, handSlotToEquip);
                else { logToConsole(`Both hands are full. Cannot equip ${selectedDisplayItem.displayName}.`); if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); }
            } else {
                logToConsole(`You look at your ${selectedDisplayItem.displayName}: ${selectedDisplayItem.description || '(No description)'}`);
                if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.3 });
            }
        }
        if (window.gameState.inventory.open) this.renderInventoryMenu();
    },

    clearInventoryHighlight: function () {
        document.querySelectorAll("#inventoryList .selected")
            .forEach(el => el.classList.remove("selected"));
    }
};

// Define InventoryContainer and Item constructors in the same file scope
function InventoryContainer(name, sizeLabel) {
    this.name = name;
    this.sizeLabel = sizeLabel;
    // Assumes InventorySizes is global (defined in gameState.js)
    this.maxSlots = window.InventorySizes ? (window.InventorySizes[sizeLabel] || 10) : 10; // Fallback size
    this.items = [];
}

function Item(itemDef) { // itemDef is the raw object from JSON
    Object.assign(this, itemDef); // Copy all properties from itemDef to this instance
    this.equipped = false; // Instance-specific default
    // Ensure quantity is present, especially for non-stackable items if addItemToInventory expects it.
    if (this.quantity === undefined) {
        this.quantity = 1;
    }
}


// Make InventoryManager globally accessible and its methods if they were previously global
window.inventoryManager = InventoryManager;

// Update global function assignments if they were used directly
window.InventoryContainer = InventoryContainer;
window.Item = Item;
window.calculateCumulativeCapacity = InventoryManager.calculateCumulativeCapacity.bind(InventoryManager);
window.canAddItem = InventoryManager.canAddItem.bind(InventoryManager); // Might be deprecated
window.addItem = InventoryManager.addItem.bind(InventoryManager);
window.removeItem = InventoryManager.removeItem.bind(InventoryManager);
window.dropItem = InventoryManager.dropItem.bind(InventoryManager);
window.equipItem = InventoryManager.equipItem.bind(InventoryManager);
window.unequipItem = InventoryManager.unequipItem.bind(InventoryManager);
window.equipClothing = InventoryManager.equipClothing.bind(InventoryManager);
window.unequipClothing = InventoryManager.unequipClothing.bind(InventoryManager);
window.updateInventoryUI = InventoryManager.updateInventoryUI.bind(InventoryManager);
window.renderInventoryMenu = InventoryManager.renderInventoryMenu.bind(InventoryManager);
window.toggleInventoryMenu = InventoryManager.toggleInventoryMenu.bind(InventoryManager);
window.interactInventoryItem = InventoryManager.interactInventoryItem.bind(InventoryManager);
window.clearInventoryHighlight = InventoryManager.clearInventoryHighlight.bind(InventoryManager);


logToConsole("InventoryManager extended and initialized with inventory.js functionalities.", "blue");
