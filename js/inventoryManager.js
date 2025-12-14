// js/inventoryManager.js

// Define InventoryContainer and Item constructors in the same file scope, but outside the class
function InventoryContainer(name, sizeLabel) {
    this.name = name;
    this.sizeLabel = sizeLabel;
    // Assumes InventorySizes is global (defined in gameState.js) or passed via gameState
    this.maxSlots = (window.InventorySizes && window.InventorySizes[sizeLabel]) ? window.InventorySizes[sizeLabel] : 10; // Fallback size
    this.items = [];
}

function Item(itemDef) { // itemDef is the raw object from JSON
    if (!itemDef) {
        console.error("Item constructor called with undefined itemDef");
        // Potentially throw an error or return a default/empty item structure
        this.id = "error_undefined_item";
        this.name = "Error Item";
        this.description = "This item was created from an undefined definition.";
        this.quantity = 1;
        this.equipped = false;
        return;
    }
    Object.assign(this, itemDef); // Copy all properties from itemDef to this instance
    this.equipped = false; // Instance-specific default
    if (this.quantity === undefined) {
        this.quantity = 1;
    }
}
// Make Item and InventoryContainer globally accessible if they aren't already managed by script.js
// For now, assuming they are picked up by script.js or explicitly attached if needed.
// If direct `new Item()` or `new InventoryContainer()` calls are made from outside modules loaded after this,
// they might need to be on window.
window.InventoryContainer = InventoryContainer;
window.Item = Item;

window.populateContainer = function(containerInstance) {
    if (!containerInstance || !containerInstance.tileId) {
        logToConsole("Error: Invalid container instance passed to populateContainer.", "error", "dev");
        return;
    }

    // If container already has items (e.g. from Map Maker manual entry), do not auto-populate.
    if (containerInstance.items && containerInstance.items.length > 0) {
        // console.log(`Container ${containerInstance.name} already has items. Skipping auto-population.`);
        return;
    }

    // Default to generic if no specific table found
    let lootTableKey = "container:generic";

    // Attempt to guess loot table from tile definition tags or name
    if (window.assetManager && window.assetManager.tilesets) {
        const tileDef = window.assetManager.tilesets[containerInstance.tileId];
        if (tileDef) {
            if (tileDef.tags) {
                if (tileDef.tags.includes('medical')) lootTableKey = "container:medical";
                else if (tileDef.tags.includes('food') || tileDef.name.toLowerCase().includes('fridge')) lootTableKey = "container:fridge";
                else if (tileDef.name.toLowerCase().includes('cabinet')) lootTableKey = "container:cabinet";
                else if (tileDef.name.toLowerCase().includes('desk')) lootTableKey = "container:desk";
                else if (tileDef.name.toLowerCase().includes('locker')) lootTableKey = "container:locker";
            }
        }
    }

    // Logic to roll loot from table
    const rollLoot = (tables) => {
        if (tables && tables[lootTableKey]) {
            const table = tables[lootTableKey];
            table.forEach(entry => {
                if (Math.random() < entry.chance) {
                    const qty = Math.floor(Math.random() * (entry.max - entry.min + 1)) + entry.min;
                    const itemDef = window.assetManager.getItem(entry.itemId);
                    if (itemDef) {
                        const newItem = new Item(itemDef);
                        newItem.quantity = qty;
                        containerInstance.items.push(newItem);
                    }
                }
            });
        }
    };

    // Use loot tables from assetManager
    const lootTables = window.assetManager ? window.assetManager.lootTables : null;
    if (lootTables) {
        rollLoot(lootTables);
    }
};


class InventoryManager {
    constructor(gameState, assetManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.logPrefix = "[InventoryManager]";

        // Initialize inventory if not already present (e.g. during startup)
        if (!this.gameState.inventory) {
            this.gameState.inventory = {
                container: null, // Main player inventory container
                handSlots: [null, null], // [left, right]
                // ... other inventory related state from gameState.js
                open: false,
                cursor: 0,
                currentlyDisplayedItems: []
            };
        }
        if (!this.gameState.player || !this.gameState.player.wornClothing) {
            if (!this.gameState.player) this.gameState.player = {};
            this.gameState.player.wornClothing = {}; // Initialize if missing
            Object.values(window.ClothingLayers || {}).forEach(layer => {
                this.gameState.player.wornClothing[layer] = null;
            });
        }
    }

    initialize() {
        // Initial setup, if any, beyond constructor.
        // For example, ensuring the player's main container is an InventoryContainer instance.
        // This was previously done in script.js's initialize, but fits better here if manager owns it.
        if (this.gameState && this.gameState.inventory && !this.gameState.inventory.container) {
            // Default to "Body Pockets", size 'S'. Capacity updated later by startGame based on Strength.
            this.gameState.inventory.container = new InventoryContainer("Body Pockets", "S");
        }
        logToConsole(`${this.logPrefix} Initialized. Player inventory container is:`, 'blue', 'dev');
    }

    countItems(itemId, inventoryItems) {
        let count = 0;
        if (!inventoryItems || !Array.isArray(inventoryItems)) {
            return 0;
        }
        for (const item of inventoryItems) {
            if (item && item.id === itemId) {
                count += (item.quantity || 1);
            }
        }
        return count;
    }

    removeItems(itemId, quantityToRemove, inventoryItems) {
        if (!inventoryItems || !Array.isArray(inventoryItems) || quantityToRemove <= 0) {
            return false;
        }
        let totalAvailable = this.countItems(itemId, inventoryItems);
        if (totalAvailable < quantityToRemove) {
            return false;
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
                        inventoryItems.splice(i, 1);
                    }
                } else {
                    inventoryItems.splice(i, 1);
                    remainingToRemove--;
                }
            }
        }
        return remainingToRemove === 0;
    }

    addItemToInventory(itemToAddInstance, quantity, inventoryItems, maxSlots) {
        if (!itemToAddInstance || !itemToAddInstance.id || quantity <= 0) {
            logToConsole(`${this.logPrefix} addItemToInventory: Invalid item or quantity.`, "warn", "dev");
            return false;
        }
        if (!inventoryItems || !Array.isArray(inventoryItems)) {
            logToConsole(`${this.logPrefix} addItemToInventory: inventoryItems is not a valid array.`, "error", "dev");
            return false;
        }

        const itemDef = this.assetManager ? this.assetManager.getItem(itemToAddInstance.id) : itemToAddInstance;
        if (!itemDef) {
            logToConsole(`${this.logPrefix} addItemToInventory: Item definition not found for ID ${itemToAddInstance.id}.`, "error", "dev");
            return false;
        }
        const isStackable = itemDef.stackable || false;
        const maxStack = itemDef.maxStack || 1;
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

        while (remainingQuantityToAdd > 0) {
            if (inventoryItems.length >= maxSlots) {
                logToConsole(`${this.logPrefix} Inventory full (${inventoryItems.length}/${maxSlots}). Cannot add remaining ${remainingQuantityToAdd} of ${itemDef.name}.`, 'orange');
                return quantity > remainingQuantityToAdd;
            }
            const amountForThisNewStack = isStackable ? Math.min(remainingQuantityToAdd, maxStack) : 1;
            const newItemStack = new Item(itemDef); // Use Item constructor
            newItemStack.quantity = amountForThisNewStack;
            if (itemToAddInstance.currentAmmo !== undefined && newItemStack.currentAmmo === undefined) {
                newItemStack.currentAmmo = itemToAddInstance.currentAmmo;
            }
            inventoryItems.push(newItemStack);
            remainingQuantityToAdd -= amountForThisNewStack;
            if (!isStackable && remainingQuantityToAdd > 0) continue;
            else if (isStackable && remainingQuantityToAdd > 0) continue;
        }
        return true;
    }

    addItemToInventoryById(itemId, quantity) {
        if (!this.gameState.inventory.container) {
            logToConsole(`${this.logPrefix} Main inventory container not initialized. Cannot add item by ID.`, "error", "dev");
            return false;
        }
        const itemDef = this.assetManager.getItem(itemId);
        if (!itemDef) {
            logToConsole(`${this.logPrefix} Item definition not found for ID: ${itemId}`, "error", "dev");
            return false;
        }
        const itemInstance = new Item(itemDef); // Create instance from definition
        return this.addItemToInventory(itemInstance, quantity, this.gameState.inventory.container.items, this.gameState.inventory.container.maxSlots);
    }


    applyMod(weaponItemInstance, modItemInstance, targetSlotType) {
        if (!weaponItemInstance || !modItemInstance || !targetSlotType) {
            logToConsole(`${this.logPrefix}.applyMod] Invalid arguments.`, "red", "dev");
            return false;
        }
        const weaponDef = this.assetManager.getItem(weaponItemInstance.id);
        const modDef = this.assetManager.getItem(modItemInstance.id);
        if (!weaponDef || !modDef) {
            logToConsole(`[${this.logPrefix}.applyMod] Weapon or Mod definition not found.`, "red", "dev");
            return false;
        }
        if (!weaponItemInstance.modSlots) weaponItemInstance.modSlots = weaponDef.modSlots ? [...weaponDef.modSlots] : [];
        if (!weaponItemInstance.modsAttached) weaponItemInstance.modsAttached = weaponDef.modsAttached ? JSON.parse(JSON.stringify(weaponDef.modsAttached)) : {};

        if (!weaponItemInstance.modSlots.includes(targetSlotType)) {
            logToConsole(`[${this.logPrefix}.applyMod] Weapon '${weaponDef.name}' does not have a '${targetSlotType}' slot.`, "orange");
            return false;
        }
        if (modDef.modType !== targetSlotType) {
            logToConsole(`[${this.logPrefix}.applyMod] Mod '${modDef.name}' (type: ${modDef.modType}) is not compatible with slot type '${targetSlotType}'.`, "orange");
            return false;
        }
        if (modDef.appliesToWeaponCategory && !weaponDef.tags.some(tag => modDef.appliesToWeaponCategory.includes(tag))) {
            logToConsole(`[${this.logPrefix}.applyMod] Mod '${modDef.name}' does not apply to weapon category/tags of '${weaponDef.name}'.`, "orange");
            return false;
        }
        if (modDef.appliesToAmmoType && weaponDef.ammoType !== modDef.appliesToAmmoType) {
            logToConsole(`[${this.logPrefix}.applyMod] Mod '${modDef.name}' requires ammo type '${modDef.appliesToAmmoType}', but weapon uses '${weaponDef.ammoType}'.`, "orange");
            return false;
        }

        if (weaponItemInstance.modsAttached[targetSlotType]) {
            const oldModId = weaponItemInstance.modsAttached[targetSlotType];
            this.removeModStatEffects(weaponItemInstance, oldModId);
            const oldModDef = this.assetManager.getItem(oldModId);
            if (oldModDef) {
                this.addItemToInventory(new Item(oldModDef), 1, this.gameState.inventory.container.items, this.gameState.inventory.container.maxSlots);
                logToConsole(`[${this.logPrefix}.applyMod] Returned previous mod '${oldModDef.name}' to inventory.`, "silver");
            }
        }
        weaponItemInstance.modsAttached[targetSlotType] = modItemInstance.id;
        this.applyModStatEffects(weaponItemInstance, modItemInstance.id);
        this.removeItems(modItemInstance.id, 1, this.gameState.inventory.container.items);
        logToConsole(`[${this.logPrefix}.applyMod] Applied mod '${modDef.name}' to '${weaponDef.name}' in slot '${targetSlotType}'.`, "green");
        if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();
        if (window.renderCharacterInfo) window.renderCharacterInfo();
        return true;
    }

    removeMod(weaponItemInstance, slotTypeToRemove) {
        if (!weaponItemInstance || !weaponItemInstance.modsAttached || !weaponItemInstance.modsAttached[slotTypeToRemove]) {
            logToConsole(`[${this.logPrefix}.removeMod] No mod found in slot '${slotTypeToRemove}' for weapon '${weaponItemInstance?.name || weaponItemInstance?.id}'.`, "orange");
            return false;
        }
        const modIdToRemove = weaponItemInstance.modsAttached[slotTypeToRemove];
        this.removeModStatEffects(weaponItemInstance, modIdToRemove);
        weaponItemInstance.modsAttached[slotTypeToRemove] = null;
        const modDef = this.assetManager.getItem(modIdToRemove);
        if (modDef) {
            this.addItemToInventory(new Item(modDef), 1, this.gameState.inventory.container.items, this.gameState.inventory.container.maxSlots);
            logToConsole(`[${this.logPrefix}.removeMod] Removed mod '${modDef.name}' from '${weaponItemInstance.name}' and returned to inventory.`, "green");
        } else {
            logToConsole(`[${this.logPrefix}.removeMod] Removed mod ID '${modIdToRemove}' from '${weaponItemInstance.name}', but definition not found to return item.`, "warn");
        }
        if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();
        if (window.renderCharacterInfo) window.renderCharacterInfo();
        return true;
    }

    applyModStatEffects(weaponItemInstance, modId) {
        const modDef = this.assetManager.getItem(modId);
        if (!modDef || !modDef.effects) return;
        for (const effectKey in modDef.effects) {
            const effectValue = modDef.effects[effectKey];
            if (typeof weaponItemInstance[effectKey] === 'number') {
                weaponItemInstance[effectKey] += effectValue;
            } else if (effectKey === 'magazineSizeBonus' && typeof weaponItemInstance.magazineSize === 'number') {
                weaponItemInstance.magazineSize += effectValue;
            }
        }
    }


    removeModStatEffects(weaponItemInstance, modId) {
        const modDef = this.assetManager.getItem(modId);
        if (!modDef || !modDef.effects) return;
        for (const effectKey in modDef.effects) {
            const effectValue = modDef.effects[effectKey];
            if (typeof weaponItemInstance[effectKey] === 'number') {
                weaponItemInstance[effectKey] -= effectValue;
            } else if (effectKey === 'magazineSizeBonus' && typeof weaponItemInstance.magazineSize === 'number') {
                weaponItemInstance.magazineSize -= effectValue;
                if (weaponItemInstance.magazineSize < 0) weaponItemInstance.magazineSize = 0;
                if (weaponItemInstance.currentAmmo > weaponItemInstance.magazineSize) {
                    weaponItemInstance.currentAmmo = weaponItemInstance.magazineSize;
                }
            }
        }
    }

    calculateCumulativeCapacity() { // Now uses this.gameState
        if (!this.gameState || !this.gameState.stats || !this.gameState.player || !this.gameState.player.wornClothing) {
            console.error(`${this.logPrefix} calculateCumulativeCapacity: Invalid gameState object provided.`);
            return 0;
        }
        let totalCapacity = 0;
        const strengthStat = this.gameState.stats.find(stat => stat.name === "Strength");
        if (strengthStat && typeof strengthStat.points === 'number') {
            totalCapacity = strengthStat.points;
            if (totalCapacity < 1) totalCapacity = 1;
        } else {
            totalCapacity = 5; // Default
        }
        for (const layer in this.gameState.player.wornClothing) {
            const item = this.gameState.player.wornClothing[layer];
            if (item && item.capacity && typeof item.capacity === 'number') {
                totalCapacity += item.capacity;
            }
        }
        return totalCapacity;
    }

    hasItem(itemId, quantity = 1, inventoryItems = null) {
        if (!inventoryItems) {
            if (!this.gameState || !this.gameState.inventory || !this.gameState.inventory.container || !this.gameState.inventory.container.items) {
                // logToConsole(`[${this.logPrefix}.hasItem] Player inventory not available.`, "warn");
                return false;
            }
            inventoryItems = this.gameState.inventory.container.items;
        }
        return this.countItems(itemId, inventoryItems) >= quantity;
    }

    // addItem uses this.addItemToInventory which uses this.assetManager
    addItem(itemInstance, targetInventory = null, targetMaxSlots = null) {
        let items = targetInventory;
        let maxSlots = targetMaxSlots;

        if (!items) {
            if (!this.gameState.inventory.container) {
                logToConsole(`${this.logPrefix} Inventory container not initialized. Cannot add item.`, "error", "dev");
                return false;
            }
            items = this.gameState.inventory.container.items;
            maxSlots = this.gameState.inventory.container.maxSlots;
        } else if (maxSlots === null) {
            // Default max slots if array provided but not limit
            maxSlots = 999;
        }

        const quantityToAdd = itemInstance.quantity || 1;
        if (this.addItemToInventory(itemInstance, quantityToAdd, items, maxSlots)) {
            // Only play sound and update UI if it's the player's inventory
            if (items === this.gameState.inventory.container.items) {
                logToConsole(`Added ${quantityToAdd}x ${itemInstance.name}.`);
                if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.5 });
                if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();

                if (window.questManager && typeof window.questManager.updateObjective === 'function') {
                    window.questManager.updateObjective("collect", itemInstance.id, quantityToAdd);
                    if (itemInstance.tags) {
                        itemInstance.tags.forEach(tag => window.questManager.updateObjective("collect", tag, quantityToAdd));
                    }
                }
            }
            return true;
        } else {
            if (items === this.gameState.inventory.container.items) {
                logToConsole(`Failed to add ${itemInstance.name}.`);
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            }
            return false;
        }
    }

    removeItem(itemIdOrName, quantity = 1, inventoryItems = null) {
        let items = inventoryItems;
        if (!items) {
            if (!this.gameState.inventory.container) {
                logToConsole(`${this.logPrefix} Inventory container not initialized.`, "error", "dev");
                return null;
            }
            items = this.gameState.inventory.container.items;
        }

        const inv = items;
        let itemToRemoveInstance = inv.find(i => i.id === itemIdOrName);
        let actualItemId = itemIdOrName;
        if (!itemToRemoveInstance) {
            const itemByName = inv.find(i => i.name && i.name.toLowerCase() === itemIdOrName.toLowerCase());
            if (itemByName) {
                itemToRemoveInstance = itemByName;
                actualItemId = itemByName.id;
            }
        }
        if (!itemToRemoveInstance) {
            logToConsole(`Item '${itemIdOrName}' not found in inventory.`, "warn");
            return null;
        }
        if (this.removeItems(actualItemId, quantity, inv)) {
            // Only update UI if it's the player's inventory
            if (inv === this.gameState.inventory.container.items) {
                logToConsole(`Removed ${quantity}x ${itemToRemoveInstance.name}.`);
                if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.4 });
                if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();
            }
            return this.assetManager.getItem(actualItemId); // Return definition
        } else {
            // Only log warning if it's the player's inventory or dev mode
            if (inv === this.gameState.inventory.container.items) {
                logToConsole(`Failed to remove ${quantity}x ${itemToRemoveInstance.name}.`, "warn");
            }
            return null;
        }
    }

    dropItem(itemName) {
        const itemDefToDrop = this.removeItem(itemName, 1);
        if (itemDefToDrop) {
            if (!this.gameState.playerPos || typeof this.gameState.playerPos.x === 'undefined' || typeof this.gameState.playerPos.y === 'undefined') {
                logToConsole("Cannot drop item: Player position is unknown.", "error", "dev");
                this.addItem(new Item(itemDefToDrop)); // Try to add back
                return false;
            }
            if (!this.gameState.floorItems) this.gameState.floorItems = [];
            const itemInstanceForFloor = new Item(itemDefToDrop);
            this.gameState.floorItems.push({
                x: this.gameState.playerPos.x,
                y: this.gameState.playerPos.y,
                z: this.gameState.playerPos.z,
                item: itemInstanceForFloor
            });
            logToConsole(`Dropped ${itemInstanceForFloor.name} on the floor at (${this.gameState.playerPos.x}, ${this.gameState.playerPos.y}, Z:${this.gameState.playerPos.z}).`);
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.6 });
            if (window.mapRenderer) window.mapRenderer.scheduleRender();
            if (this.gameState.inventory.open && typeof this.renderInventoryMenu === 'function') {
                this.renderInventoryMenu();
            }
            return true;
        }
        return false;
    }

    /**
     * Drops all items from an entity's inventory, hands, and worn clothing to the floor at their position.
     * @param {object} entity - The entity (NPC or Player) whose inventory to drop.
     */
    dropInventory(entity) {
        if (!entity || !entity.mapPos) return;
        if (!this.gameState.floorItems) this.gameState.floorItems = [];

        const dropList = [];

        // 1. Container Items
        if (entity.inventory && entity.inventory.container && entity.inventory.container.items) {
            dropList.push(...entity.inventory.container.items);
            entity.inventory.container.items = []; // Clear
        }

        // 2. Hand Slots
        if (entity.inventory && entity.inventory.handSlots) {
            entity.inventory.handSlots.forEach((item, idx) => {
                if (item) {
                    dropList.push(item);
                    entity.inventory.handSlots[idx] = null;
                }
            });
        }

        // 3. Worn Clothing
        if (entity.wornClothing) {
            Object.values(entity.wornClothing).forEach(item => {
                if (item) dropList.push(item);
            });
            entity.wornClothing = {}; // Clear
        } else if (entity.player && entity.player.wornClothing) { // If passing gameState (Player)
             // Usually we don't drop player inventory on death automatically in 'dropInventory', logic handles that in gameOver if desired.
             // But if this is called for player, it will do it.
             // Currently entity structure for player in gameState is gameState.player.
             // If entity passed IS gameState.player:
             if (entity.wornClothing) {
                 Object.values(entity.wornClothing).forEach(item => {
                     if (item) dropList.push(item);
                 });
                 entity.wornClothing = {};
             }
        }

        // Drop them
        let droppedCount = 0;
        dropList.forEach(item => {
            if (item) {
                // Ensure it's a valid Item instance or copy
                const itemInstance = new Item(item);
                itemInstance.equipped = false; // Reset status
                this.gameState.floorItems.push({
                    x: entity.mapPos.x,
                    y: entity.mapPos.y,
                    z: entity.mapPos.z,
                    item: itemInstance
                });
                droppedCount++;
            }
        });

        if (droppedCount > 0) {
            logToConsole(`${entity.name || entity.id} dropped ${droppedCount} items.`, 'grey');
            if (window.mapRenderer) window.mapRenderer.scheduleRender();
        }
    }

    equipItem(itemName, handIndex, targetInventory = null, targetHandSlots = null) {
        const isPlayer = !targetInventory; // Assume player if no target specified
        let invItems = targetInventory;
        let handSlots = targetHandSlots;

        if (isPlayer) {
            if (!this.gameState.inventory.container) {
                logToConsole(`${this.logPrefix} Inventory container not initialized.`, "error", "dev"); return;
            }
            invItems = this.gameState.inventory.container.items;
            handSlots = this.gameState.inventory.handSlots;
        }

        const itemIndex = invItems.findIndex(i => i.name === itemName || i.id === itemName);
        if (itemIndex === -1) {
            if (isPlayer) {
                logToConsole(`Item "${itemName}" not found in inventory.`, "warn");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            }
            return;
        }
        const item = invItems[itemIndex];
        if (item.isClothing) {
            if (isPlayer) {
                logToConsole(`${item.name} is clothing. Use 'Wear' action.`, "info");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            }
            return;
        }
        if (!item.canEquip) {
            if (isPlayer) {
                logToConsole(`Cannot equip "${itemName}" to a hand slot.`, "info");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            }
            return;
        }
        if (handSlots[handIndex]) {
            if (isPlayer) {
                logToConsole(`Hand slot ${handIndex + 1} is occupied by ${handSlots[handIndex].name}.`, "info");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            }
            return;
        }
        if (this.removeItems(item.id, 1, invItems)) {
            item.equipped = true;
            handSlots[handIndex] = item;

            if (isPlayer) {
                logToConsole(`Equipped ${item.name} to hand slot ${handIndex + 1}.`);
                if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.8 });
                if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();
                if (this.gameState.isInCombat && this.gameState.combatPhase === 'playerAttackDeclare' && window.combatManager) {
                    window.combatManager.populateWeaponSelect();
                }
            }
        } else {
            logToConsole(`Failed to remove ${item.name} from inventory during equip.`, "error", "dev");
        }
    }

    unequipItem(handIndex, targetInventory = null, targetHandSlots = null, targetMaxSlots = null) {
        const isPlayer = !targetInventory;
        let invItems = targetInventory;
        let handSlots = targetHandSlots;
        let maxSlots = targetMaxSlots;

        if (isPlayer) {
            if (!this.gameState.inventory.container) {
                logToConsole(`${this.logPrefix} Inventory container not initialized.`, "error", "dev"); return;
            }
            invItems = this.gameState.inventory.container.items;
            handSlots = this.gameState.inventory.handSlots;
            maxSlots = this.gameState.inventory.container.maxSlots;
        } else if (maxSlots === null) {
            maxSlots = 999;
        }

        const itemToUnequip = handSlots[handIndex];
        if (!itemToUnequip) {
            if (isPlayer) {
                logToConsole(`No item in hand ${handIndex + 1}.`, "info");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            }
            return;
        }
        if (this.addItemToInventory(itemToUnequip, 1, invItems, maxSlots)) {
            itemToUnequip.equipped = false;
            handSlots[handIndex] = null;
            if (isPlayer) {
                logToConsole(`Unequipped ${itemToUnequip.name}.`);
                if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.8 });
                if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();
                if (this.gameState.isInCombat && this.gameState.combatPhase === 'playerAttackDeclare' && window.combatManager) {
                    window.combatManager.populateWeaponSelect();
                }
            }
        } else {
            if (isPlayer) {
                logToConsole(`Not enough space to unequip ${itemToUnequip.name}.`, "orange");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            }
        }
    }

    equipClothing(itemName) {
        if (!this.gameState.inventory.container) {
            logToConsole(`${this.logPrefix} Inventory container not initialized.`, "error", "dev"); return;
        }
        const inv = this.gameState.inventory.container.items;
        const itemIndex = inv.findIndex(i => i.name === itemName);
        if (itemIndex === -1) {
            logToConsole(`Error: Item "${itemName}" not found in inventory.`, "error", "dev");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); return;
        }
        const item = inv[itemIndex];
        if (!item.isClothing) {
            logToConsole(`Error: "${itemName}" is not clothing.`, "error", "dev");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); return;
        }
        if (!item.layer || !Object.values(window.ClothingLayers || {}).includes(item.layer)) {
            logToConsole(`Error: "${itemName}" has an invalid or missing clothing layer: ${item.layer}.`, "error", "dev");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); return;
        }
        const targetLayer = item.layer;
        if (this.gameState.player.wornClothing[targetLayer]) {
            logToConsole(`Layer ${targetLayer} is already occupied by ${this.gameState.player.wornClothing[targetLayer].name}.`, "info");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); return;
        }
        if (this.removeItems(item.id, 1, inv)) {
            this.gameState.player.wornClothing[targetLayer] = item;
            item.equipped = true;
            this.gameState.inventory.container.maxSlots = this.calculateCumulativeCapacity();
            logToConsole(`Equipped ${itemName} to ${targetLayer}.`);
            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.8 });
            if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();
            if (window.renderCharacterInfo) window.renderCharacterInfo();
        } else {
            logToConsole(`Failed to remove ${item.name} from inventory during equip.`, "error", "dev");
        }
    }

    unequipClothing(clothingLayer) {
        if (!this.gameState.inventory.container) {
            logToConsole(`${this.logPrefix} Inventory container not initialized.`, "error", "dev"); return;
        }
        if (!clothingLayer || !this.gameState.player.wornClothing.hasOwnProperty(clothingLayer)) {
            logToConsole(`Error: Invalid clothing layer "${clothingLayer}".`, "error", "dev");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); return;
        }
        const itemToUnequip = this.gameState.player.wornClothing[clothingLayer];
        if (!itemToUnequip) {
            logToConsole(`No item to unequip from ${clothingLayer}.`, "info");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); return;
        }
        if (this.addItemToInventory(itemToUnequip, 1, this.gameState.inventory.container.items, this.gameState.inventory.container.maxSlots)) {
            this.gameState.player.wornClothing[clothingLayer] = null;
            itemToUnequip.equipped = false;
            this.gameState.inventory.container.maxSlots = this.calculateCumulativeCapacity();
            logToConsole(`Unequipped ${itemToUnequip.name} from ${clothingLayer}.`);
            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.8 });
        } else {
            logToConsole(`Critical Warning: Not enough inventory space to unequip ${itemToUnequip.name}. Item remains equipped.`, "error", "dev");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); return;
        }
        if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();
        if (window.renderCharacterInfo) window.renderCharacterInfo();
    }

    updateInventoryUI() {
        const equippedHandItemsDiv = document.getElementById("equippedHandItems");
        if (equippedHandItemsDiv) {
            equippedHandItemsDiv.innerHTML = "";
            this.gameState.inventory.handSlots.forEach((it, i) => {
                const d = document.createElement("div");
                const handName = i === 0 ? "Left Hand" : "Right Hand";
                d.textContent = it ? `${handName}: ${it.name}` : `${handName}: Empty`;
                equippedHandItemsDiv.appendChild(d);
            });
        }
        const equippedContainersDiv = document.getElementById("equippedContainers");
        const invCapacitySpan = document.getElementById("invCapacity");
        if (this.gameState.inventory.container) {
            if (equippedContainersDiv) {
                equippedContainersDiv.innerHTML = "";
                let foundContainers = false;
                if (this.gameState.player && this.gameState.player.wornClothing) {
                    for (const layer in this.gameState.player.wornClothing) {
                        const wornItem = this.gameState.player.wornClothing[layer];
                        if (wornItem && wornItem.capacity && typeof wornItem.capacity === 'number' && wornItem.capacity > 0) {
                            const containerDisplay = document.createElement("div");
                            containerDisplay.textContent = `${wornItem.name}: ${wornItem.capacity} slots`;
                            equippedContainersDiv.appendChild(containerDisplay);
                            foundContainers = true;
                        }
                    }
                }
                if (!foundContainers) equippedContainersDiv.textContent = "No capacity-providing clothing equipped.";
            }
            if (invCapacitySpan) {
                invCapacitySpan.textContent = `${this.gameState.inventory.container.items.length}/${this.gameState.inventory.container.maxSlots}`;
            }
        } else {
            if (equippedContainersDiv) equippedContainersDiv.innerHTML = "No container equipped.";
            if (invCapacitySpan) invCapacitySpan.textContent = "0/0";
        }
        const oldHandSlotsDiv = document.getElementById("handSlots");
        if (oldHandSlotsDiv) oldHandSlotsDiv.innerHTML = "";
    }

    renderInventoryMenu() {
        const splitContainer = document.getElementById("inventoryContainerSplit");
        const leftPane = document.getElementById("inventoryPaneLeft");
        const rightPane = document.getElementById("inventoryPaneRight");
        const leftList = document.getElementById("inventoryListContainer");
        const rightList = document.getElementById("inventoryListPlayer");
        const titleArea = document.getElementById("inventoryTitleArea");

        if (!splitContainer || !leftPane || !rightPane || !leftList || !rightList) {
            console.error("Inventory UI elements missing.");
            return;
        }

        // Reset lists
        leftList.innerHTML = "";
        rightList.innerHTML = "";
        this.gameState.inventory.currentlyDisplayedItems = [];

        // --- 1. Detect Context (World Container vs Companion) ---
        const targetEntity = this.gameState.inventory.targetEntity;
        this.gameState.worldContainers = [];

        // Only look for world containers if NOT trading with a companion
        if (!targetEntity && this.gameState.playerPos && this.gameState.containers) {
            const R = 1;
            const { x: px, y: py, z: pz } = this.gameState.playerPos;
            this.gameState.containers.forEach(container => {
                if (container.x >= px - R && container.x <= px + R &&
                    container.y >= py - R && container.y <= py + R &&
                    container.z === pz) {
                    if (!this.gameState.worldContainers.some(wc => wc.id === container.id)) {
                        this.gameState.worldContainers.push(container);
                    }
                }
            });
        }

        // --- 2. Determine View Mode ---
        const hasWorldContainer = this.gameState.worldContainers.length > 0;
        const isTrading = !!targetEntity && !targetEntity.cargoDetails; // Exclude vehicles from "Trading" logic (companions)
        const isVehicle = !!targetEntity && !!targetEntity.cargoDetails;

        if (isTrading) {
            splitContainer.style.display = "flex";
            leftPane.style.display = "flex";
            const header = leftPane.querySelector("h4");
            if (header) {
                header.textContent = `${targetEntity.name}'s Inventory`;
                // Add Auto Equip button if not present
                let autoEquipBtn = document.getElementById("autoEquipBtn");
                if (!autoEquipBtn) {
                    autoEquipBtn = document.createElement("button");
                    autoEquipBtn.id = "autoEquipBtn";
                    autoEquipBtn.textContent = "Auto Equip Best";
                    autoEquipBtn.className = "retro-btn small";
                    autoEquipBtn.style.marginLeft = "10px";
                    autoEquipBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.autoEquipCompanion(targetEntity);
                    };
                    header.appendChild(autoEquipBtn);
                }
            }
        } else if (isVehicle) {
            splitContainer.style.display = "flex";
            leftPane.style.display = "flex";
            const header = leftPane.querySelector("h4");
            if (header) {
                const capacity = targetEntity.cargoDetails.capacity || 0;
                const used = targetEntity.cargoDetails.items ? targetEntity.cargoDetails.items.length : 0;
                header.textContent = `${targetEntity.name} Cargo (${used}/${capacity})`;
                const btn = document.getElementById("autoEquipBtn");
                if (btn) btn.remove();
            }
        } else if (hasWorldContainer) {
            splitContainer.style.display = "flex";
            leftPane.style.display = "flex"; // Show container pane
            const header = leftPane.querySelector("h4");
            if (header) {
                header.textContent = this.gameState.worldContainers[0].name; // Use first container name
                const btn = document.getElementById("autoEquipBtn");
                if (btn) btn.remove(); // Remove button if switching back to container view
            }
        } else {
            splitContainer.style.display = "flex"; // Keep flex layout
            leftPane.style.display = "none"; // Hide container pane
            const btn = document.getElementById("autoEquipBtn");
            if (btn) btn.remove();
        }

        // --- 3. Populate Lists ---
        let globalIndex = 0;

        // Helper to add item to DOM and tracked list
        const addItemToPane = (item, paneListElement, displayProps) => {
            const d = document.createElement("div");
            d.className = "inventory-item";

            let prefix = "";
            if (displayProps.equipped) prefix = "[E] ";
            else if (displayProps.source === 'floor') prefix = "[F] ";

            let sizeText = item.size !== undefined ? ` (Sz:${item.size})` : "";
            if (displayProps.isPlaceholder) sizeText = ` (Cap:${displayProps.containerRef.capacity})`;

            const qtyText = (item.quantity > 1 && !displayProps.isPlaceholder) ? ` x${item.quantity}` : "";
            const name = displayProps.displayName || item.name;

            d.textContent = `${prefix}${name}${qtyText}${sizeText}`;

            if (globalIndex === this.gameState.inventory.cursor) {
                d.classList.add("selected");
                // Auto-scroll logic could go here
                if (d.scrollIntoView) d.scrollIntoView({ block: "nearest" });
            }

            // Click to select
            d.onclick = () => {
                this.gameState.inventory.cursor = displayProps.globalIndex; // Needs to match current index
                this.renderInventoryMenu(); // Re-render to update highlights
            };

            paneListElement.appendChild(d);

            // Track item
            this.gameState.inventory.currentlyDisplayedItems.push({
                ...item,
                ...displayProps,
                globalIndex: globalIndex
            });
            globalIndex++;
        };

        // --- RIGHT PANE (Player) - POPULATE FIRST for Top-to-Bottom Logic ---
        // Hands
        this.gameState.inventory.handSlots.forEach((item, index) => {
            if (item) addItemToPane(item, rightList, {
                equipped: true, source: 'hand', originalHandIndex: index, displayName: item.name
            });
        });
        // Clothing
        for (const layer in this.gameState.player.wornClothing) {
            const item = this.gameState.player.wornClothing[layer];
            if (item) addItemToPane(item, rightList, {
                equipped: true, source: 'clothing', originalLayer: layer, displayName: item.name
            });
        }
        // Inventory
        if (this.gameState.inventory.container && this.gameState.inventory.container.items) {
            this.gameState.inventory.container.items.forEach(item => {
                addItemToPane(item, rightList, {
                    equipped: false, source: 'container', displayName: item.name
                });
            });
        }
        // Floor Items
        if (this.gameState.floorItems && this.gameState.playerPos) {
            const { x: px, y: py, z: pz } = this.gameState.playerPos;
            const R = 1;
            this.gameState.floorItems.forEach(entry => {
                if (entry.x >= px - R && entry.x <= px + R && entry.y >= py - R && entry.y <= py + R && entry.z === pz) {
                    addItemToPane(entry.item, rightList, {
                        equipped: false, source: 'floor', originalFloorItemEntry: entry, displayName: entry.item.name
                    });
                }
            });
        }

        // --- LEFT PANE (Container OR Companion OR Vehicle) - POPULATE SECOND for Bottom Placement ---
        if (isTrading) {
            // Companion Inventory (Hands)
            if (targetEntity.inventory && targetEntity.inventory.handSlots) {
                targetEntity.inventory.handSlots.forEach((item, index) => {
                    if (item) addItemToPane(item, leftList, {
                        equipped: true, source: 'companion', originalHandIndex: index, displayName: item.name, targetEntity: targetEntity
                    });
                });
            }
            // Companion Inventory (Clothing)
            if (targetEntity.wornClothing) {
                for (const layer in targetEntity.wornClothing) {
                    const item = targetEntity.wornClothing[layer];
                    if (item) addItemToPane(item, leftList, {
                        equipped: true, source: 'companion', originalLayer: layer, displayName: item.name, targetEntity: targetEntity
                    });
                }
            }
            // Companion Inventory (Container)
            if (targetEntity.inventory && targetEntity.inventory.container && targetEntity.inventory.container.items) {
                targetEntity.inventory.container.items.forEach((item, idx) => {
                    addItemToPane(item, leftList, {
                        equipped: false, source: 'companion', originalItemIndex: idx, displayName: item.name, targetEntity: targetEntity
                    });
                });
            }
        } else if (isVehicle) {
             if (targetEntity.cargoDetails && targetEntity.cargoDetails.items) {
                 if (targetEntity.cargoDetails.items.length === 0) {
                      addItemToPane({ id: `empty_vehicle_${targetEntity.id}`, name: "(Empty)" }, leftList, {
                        source: 'vehicle',
                        targetEntity: targetEntity,
                        isPlaceholder: true,
                        displayName: "(Empty)"
                    });
                 } else {
                     targetEntity.cargoDetails.items.forEach((item, idx) => {
                        addItemToPane(item, leftList, {
                            source: 'vehicle',
                            targetEntity: targetEntity,
                            originalItemIndex: idx,
                            displayName: item.name
                        });
                    });
                 }
             }
        } else if (hasWorldContainer) {
            this.gameState.worldContainers.forEach(container => {
                if (!container.items || container.items.length === 0) {
                    addItemToPane({ id: `empty_${container.id}`, name: "(Empty)" }, leftList, {
                        source: 'worldContainer',
                        containerRef: container,
                        isPlaceholder: true,
                        displayName: "(Empty)"
                    });
                } else {
                    container.items.forEach((item, idx) => {
                        addItemToPane(item, leftList, {
                            source: 'worldContainer',
                            containerRef: container,
                            originalItemIndex: idx,
                            displayName: item.name
                        });
                    });
                }
            });
        }

        // --- 4. Cursor Management ---
        if (this.gameState.inventory.currentlyDisplayedItems.length === 0) {
            rightList.innerHTML = "<div style='padding:5px;'>— Empty —</div>";
            this.gameState.inventory.cursor = 0;
        } else {
            // Clamp cursor
            if (this.gameState.inventory.cursor >= this.gameState.inventory.currentlyDisplayedItems.length) {
                this.gameState.inventory.cursor = this.gameState.inventory.currentlyDisplayedItems.length - 1;
            }
            if (this.gameState.inventory.cursor < 0) this.gameState.inventory.cursor = 0;
        }

        // Highlight Active Pane based on Cursor
        const currentItem = this.gameState.inventory.currentlyDisplayedItems[this.gameState.inventory.cursor];
        if (currentItem) {
            if (currentItem.source === 'worldContainer' || currentItem.source === 'companion' || currentItem.source === 'vehicle') {
                leftPane.classList.add("active-pane");
                rightPane.classList.remove("active-pane");
            } else {
                leftPane.classList.remove("active-pane");
                rightPane.classList.add("active-pane");
            }
        } else {
            // Default to right pane if empty or unknown
            rightPane.classList.add("active-pane");
            leftPane.classList.remove("active-pane");
        }

        // Update Capacity Title
        const capSpan = document.getElementById("invCapacity");
        if (capSpan && this.gameState.inventory.container) {
            capSpan.textContent = `${this.gameState.inventory.container.items.length}/${this.gameState.inventory.container.maxSlots}`;
        }
    }

    toggleInventoryMenu(targetEntity = null) {
        // If opening with a new target, ensure we open. If closing, or toggling same state, toggle.
        if (targetEntity) {
            logToConsole(`Opening inventory for target: ${targetEntity.name || targetEntity.id}`, "dev");
            if (!this.gameState.inventory.open) {
                this.gameState.inventory.open = true;
            }
            this.gameState.inventory.targetEntity = targetEntity;
        } else {
            if (this.gameState.inventory.open && this.gameState.inventory.targetEntity) {
                // If open with a target and toggle called without target (e.g. 'I' key), close it.
                this.gameState.inventory.open = false;
                this.gameState.inventory.targetEntity = null;
            } else {
                // Standard toggle
                this.gameState.inventory.open = !this.gameState.inventory.open;
                this.gameState.inventory.targetEntity = null;
            }
        }

        if (window.audioManager) {
            window.audioManager.playUiSound(this.gameState.inventory.open ? 'ui_click_01.wav' : 'ui_click_01.wav', { volume: this.gameState.inventory.open ? 0.6 : 0.5 });
        }
        const inventoryMenuDiv = document.getElementById("inventoryMenu");
        if (!inventoryMenuDiv) return;
        if (this.gameState.inventory.open) {
            inventoryMenuDiv.classList.remove("hidden");
            this.renderInventoryMenu();
        } else {
            inventoryMenuDiv.classList.add("hidden");
            this.clearInventoryHighlight();
            this.gameState.inventory.currentlyDisplayedItems = [];
            this.gameState.inventory.targetEntity = null; // Clear target on close
            if (this.gameState.isInCombat && this.gameState.combatPhase === 'playerAttackDeclare' && window.combatManager) {
                window.combatManager.populateWeaponSelect();
            }
        }
    }

    autoEquipCompanion(companion) {
        if (!companion || !companion.inventory) return;

        logToConsole(`Auto-equipping ${companion.name}...`, "info");
        let changesMade = false;

        // Helper to get item definition
        const getDef = (itemId) => this.assetManager.getItem(itemId);

        // 1. Equip Best Armor per Layer
        // First, unequip all clothing to pool it (virtually or literally)
        // Ideally we iterate all items (worn + inventory) and pick best.
        // Simplified: Iterate inventory. If item is clothing and better than what's worn (or nothing worn), wear it.
        const invItems = companion.inventory.container.items;

        // Sort inventory by armor value (descending) to try best items first
        const potentialArmor = invItems.filter(i => {
            const def = getDef(i.id);
            return def && def.isClothing;
        }).sort((a, b) => {
            const defA = getDef(a.id);
            const defB = getDef(b.id);
            return (defB.armorValue || 0) - (defA.armorValue || 0);
        });

        potentialArmor.forEach(item => {
            const def = getDef(item.id);
            if (!def || !def.layer) return;

            const currentWorn = companion.wornClothing[def.layer];
            const currentArmor = currentWorn ? (getDef(currentWorn.id)?.armorValue || 0) : -1;

            if ((def.armorValue || 0) > currentArmor) {
                // Better armor found.
                if (currentWorn) {
                    // Unequip current (move to inventory)
                    if (this.addItemToInventory(currentWorn, 1, invItems, 999)) {
                        companion.wornClothing[def.layer] = null;
                    }
                }
                // Equip new
                if (this.removeItems(item.id, 1, invItems)) {
                    item.equipped = true;
                    companion.wornClothing[def.layer] = item;
                    changesMade = true;
                    logToConsole(`${companion.name} equipped ${item.name} on ${def.layer}.`, "green");
                }
            }
        });

        // 2. Equip Best Weapon (Main Hand)
        // Simplified: If main hand empty or we find a higher damage weapon, swap.
        // Assuming 'melee' style preference for now unless 'ranged' is set in companionSettings
        const style = companion.companionSettings?.combatStyle || 'melee';

        const potentialWeapons = invItems.filter(i => {
            const def = getDef(i.id);
            if (!def || !def.type) return false;
            if (style === 'melee' && def.type.includes('melee')) return true;
            if (style === 'ranged' && (def.type.includes('firearm') || def.type.includes('bow'))) return true;
            return false;
        }).sort((a, b) => {
            const defA = getDef(a.id);
            const defB = getDef(b.id);
            // Heuristic: Damage * FireRate? Or just raw damage.
            // Simplified: alphabetical reverse or random if no damage stat (assuming newer items are better?)
            // Ideally definitions have 'damage'.
            return (defB.damage || 0) - (defA.damage || 0);
        });

        if (potentialWeapons.length > 0) {
            const bestWeapon = potentialWeapons[0];
            const bestDef = getDef(bestWeapon.id);
            const currentMain = companion.inventory.handSlots[0];
            const currentMainDef = currentMain ? getDef(currentMain.id) : null;

            const currentDmg = currentMainDef ? (currentMainDef.damage || 0) : -1;

            if ((bestDef.damage || 0) > currentDmg) {
                // Swap
                if (currentMain) {
                    this.addItemToInventory(currentMain, 1, invItems, 999);
                    companion.inventory.handSlots[0] = null;
                }
                if (this.removeItems(bestWeapon.id, 1, invItems)) {
                    bestWeapon.equipped = true;
                    companion.inventory.handSlots[0] = bestWeapon;
                    changesMade = true;
                    logToConsole(`${companion.name} equipped ${bestWeapon.name}.`, "green");
                }
            }
        }

        if (changesMade) {
            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav');
            this.renderInventoryMenu();
        } else {
            logToConsole(`${companion.name} already has the best gear equipped.`, "info");
        }
    }

    transferItem(item, targetContainer) {
        if (!item || !targetContainer) return false;

        const limit = targetContainer.maxSlots || targetContainer.capacity || 999;

        // Check capacity of target container if it has limits (assumed simpler for now, just quantity/slots)
        if (targetContainer.items.length >= limit) {
             // Check if stackable and exists
             const stackable = item.stackable;
             const existing = targetContainer.items.find(i => i.id === item.id);
             if (!stackable || !existing || (existing.quantity >= (item.maxStack || 99))) {
                 logToConsole(`${targetContainer.name} is full.`, "orange");
                 return false;
             }
        }

        // Remove from source (Player Inventory)
        // logic is tricky because 'item' here is likely a display item or reference.
        // We need to remove it from gameState.inventory.container.items

        const playerInv = this.gameState.inventory.container.items;
        // Check if we can remove 1 (or all? usually 1 for single transfer interaction)
        // Let's assume transferring 1 unit or the whole stack if Shift pressed?
        // For simplicity, transfer entire stack for now, or 1?
        // Standard game UI behavior: Interact = Use/Equip. Transfer Key = Transfer.
        // Let's transfer 1 unit if stackable, or all?
        // Let's transfer ALL for convenience in this text UI, or 1 if quantity > 1?
        // Decision: Transfer 1.

        const qtyToTransfer = 1;

        if (this.removeItems(item.id, qtyToTransfer, playerInv)) {
            // Add to target
            // Need to create a new Item instance or copy to avoid reference issues if stack split
            const itemDef = this.assetManager.getItem(item.id);
            const newItem = new Item(itemDef);
            newItem.quantity = qtyToTransfer;

            // Add to container logic (simplified addItemToInventory logic)
            // We can reuse addItemToInventory but need to pass targetContainer.items
            this.addItemToInventory(newItem, qtyToTransfer, targetContainer.items, limit);

            logToConsole(`Transferred ${newItem.name} to ${targetContainer.name}.`);
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav');
            this.renderInventoryMenu();
            return true;
        }
        return false;
    }

    navigateLeft() {
        // Switch focus to Container Pane (Left)
        // Find the first item that is NOT a player item (worldContainer, companion, vehicle)
        const firstLeftPaneIndex = this.gameState.inventory.currentlyDisplayedItems.findIndex(i =>
            i.source === 'worldContainer' || i.source === 'companion' || i.source === 'vehicle');
        if (firstLeftPaneIndex !== -1) {
            this.gameState.inventory.cursor = firstLeftPaneIndex;
            this.renderInventoryMenu();
        }
    }

    navigateRight() {
        // Switch focus to Player Pane (Right)
        // Find the first item that IS a player item (not worldContainer, companion, vehicle)
        const firstPlayerIndex = this.gameState.inventory.currentlyDisplayedItems.findIndex(i =>
            i.source !== 'worldContainer' && i.source !== 'companion' && i.source !== 'vehicle');
        if (firstPlayerIndex !== -1) {
            this.gameState.inventory.cursor = firstPlayerIndex;
            this.renderInventoryMenu();
        }
    }

    handleTransferKey() {
        if (!this.gameState.inventory.open) return;

        const cursorIndex = this.gameState.inventory.cursor;
        const selectedDisplayItem = this.gameState.inventory.currentlyDisplayedItems[cursorIndex];

        if (!selectedDisplayItem) return;

        // --- Logic for World Container OR Companion OR Vehicle ---
        const targetEntity = this.gameState.inventory.targetEntity;

        // 1. Item is in the "Left Pane" (World Container, Companion, Vehicle) -> Take/Transfer to Player
        if (selectedDisplayItem.source === 'worldContainer' || selectedDisplayItem.source === 'companion' || selectedDisplayItem.source === 'vehicle') {
            // Interact handles "taking" from secondary source
            this.interactInventoryItem();
            return;
        }

        // 2. Item is in Player Inventory -> Transfer to Target
        let targetContainer = null;
        if (targetEntity) {
            if (targetEntity.inventory && targetEntity.inventory.container) {
                // Companion
                targetContainer = targetEntity.inventory.container;
            } else if (targetEntity.cargoDetails) {
                // Vehicle
                targetContainer = targetEntity.cargoDetails; // treated as container { items: [], capacity: X }
            }
        } else if (this.gameState.worldContainers && this.gameState.worldContainers.length === 1) {
            targetContainer = this.gameState.worldContainers[0];
        }

        if (targetContainer) {
            if (selectedDisplayItem.equipped) {
                logToConsole("Unequip item before transferring.", "warn");
                return;
            }

            if (selectedDisplayItem.source === 'container') { // Only main inventory
                 const actualItem = this.gameState.inventory.container.items.find(i => i.id === selectedDisplayItem.id);
                 if (actualItem) {
                     this.transferItem(actualItem, targetContainer);
                 }
            } else {
                logToConsole("Can only transfer items from main inventory.", "info");
            }
        } else {
            if (this.gameState.worldContainers && this.gameState.worldContainers.length > 1) {
                logToConsole("Multiple containers open. Cannot determine target.", "warn");
            } else {
                logToConsole("No open container, companion, or vehicle to transfer to.", "info");
            }
        }
    }

    interactInventoryItem() {
        if (!this.gameState.inventory.currentlyDisplayedItems || this.gameState.inventory.currentlyDisplayedItems.length === 0) {
            logToConsole("No items to interact with.", "info"); return;
        }
        const cursorIndex = this.gameState.inventory.cursor;
        if (cursorIndex < 0 || cursorIndex >= this.gameState.inventory.currentlyDisplayedItems.length) {
            logToConsole("Invalid inventory cursor position.", "warn"); return;
        }
        const selectedDisplayItem = this.gameState.inventory.currentlyDisplayedItems[cursorIndex];
        if (!selectedDisplayItem) {
            logToConsole("No item selected at cursor position.", "warn", "dev"); return;
        }

        if (selectedDisplayItem.isPlaceholder) {
            logToConsole("This is an empty container.", "info");
            return;
        }
        if (selectedDisplayItem.source === 'floor') {
            const itemToTake = selectedDisplayItem.originalFloorItemEntry.item;
            if (this.addItem(itemToTake)) { // addItem uses this.addItemToInventory from the class
                const floorItemIndex = this.gameState.floorItems.findIndex(entry => entry === selectedDisplayItem.originalFloorItemEntry);
                if (floorItemIndex > -1) this.gameState.floorItems.splice(floorItemIndex, 1);
                logToConsole(`Picked up ${itemToTake.name} from the floor.`);
                if (window.mapRenderer) window.mapRenderer.scheduleRender();
            } else {
                logToConsole(`Not enough space to pick up ${itemToTake.name}.`, "orange");
            }
            if (this.gameState.inventory.open) this.renderInventoryMenu();
            return;
        } else if (selectedDisplayItem.source === 'worldContainer') {
            const container = selectedDisplayItem.containerRef;
            const itemIndexInContainer = selectedDisplayItem.originalItemIndex;
            if (!container || !container.items || !container.items[itemIndexInContainer]) {
                logToConsole("Error: Could not find item in world container.", "error", "dev");
                if (this.gameState.inventory.open) this.renderInventoryMenu(); return;
            }
            const actualItemFromContainer = container.items[itemIndexInContainer];
            if (this.addItem(actualItemFromContainer)) {
                container.items.splice(itemIndexInContainer, 1);
                logToConsole(`Took ${actualItemFromContainer.name} from ${container.name}.`);
            } else {
                logToConsole(`Not enough space to pick up ${actualItemFromContainer.name} from ${container.name}.`, "orange");
            }
            if (this.gameState.inventory.open) this.renderInventoryMenu();
            return;
        } else if (selectedDisplayItem.source === 'companion') {
            const targetEntity = selectedDisplayItem.targetEntity;
            if (!targetEntity) return;

            let actualItem = null;
            let removeFromSource = () => {};

            // Determine source array based on type
            if (selectedDisplayItem.originalItemIndex !== undefined && targetEntity.inventory.container) {
                // Container item
                const items = targetEntity.inventory.container.items;
                actualItem = items[selectedDisplayItem.originalItemIndex];
                removeFromSource = () => items.splice(selectedDisplayItem.originalItemIndex, 1);
            } else if (selectedDisplayItem.originalHandIndex !== undefined) {
                // Hand item
                actualItem = targetEntity.inventory.handSlots[selectedDisplayItem.originalHandIndex];
                removeFromSource = () => targetEntity.inventory.handSlots[selectedDisplayItem.originalHandIndex] = null;
            } else if (selectedDisplayItem.originalLayer) {
                // Clothing item
                actualItem = targetEntity.wornClothing[selectedDisplayItem.originalLayer];
                removeFromSource = () => targetEntity.wornClothing[selectedDisplayItem.originalLayer] = null;
            }

            if (actualItem) {
                if (this.addItem(actualItem)) {
                    removeFromSource();
                    logToConsole(`Took ${actualItem.name} from ${targetEntity.name}.`);
                } else {
                    logToConsole(`Not enough space to take ${actualItem.name}.`, "orange");
                }
            }
            if (this.gameState.inventory.open) this.renderInventoryMenu();
            return;
        } else if (selectedDisplayItem.source === 'vehicle') {
            const targetEntity = selectedDisplayItem.targetEntity;
            if (!targetEntity || !targetEntity.cargoDetails) return;

            if (selectedDisplayItem.originalItemIndex !== undefined && targetEntity.cargoDetails.items) {
                 const items = targetEntity.cargoDetails.items;
                 const actualItem = items[selectedDisplayItem.originalItemIndex];
                 if (actualItem) {
                     if (this.addItem(actualItem)) {
                         items.splice(selectedDisplayItem.originalItemIndex, 1);
                         logToConsole(`Took ${actualItem.name} from ${targetEntity.name}.`);
                     } else {
                         logToConsole(`Not enough space to take ${actualItem.name}.`, "orange");
                     }
                 }
            }
            if (this.gameState.inventory.open) this.renderInventoryMenu();
            return;
        }

        // Logic for Transfer Key (T) is handled separately in handleTransferKey
        // Enter key (Interact) defaults to Use/Equip for player items.

        if (selectedDisplayItem.type === "TRAP_ITEM" && !selectedDisplayItem.equipped) {
            this.initiateTrapPlacement(selectedDisplayItem.id);
            return;
        }

        if (selectedDisplayItem.isConsumable && selectedDisplayItem.effects && !selectedDisplayItem.equipped) {
            let consumed = false; const maxNeeds = 24;
            if (typeof this.gameState.playerHunger === 'undefined') this.gameState.playerHunger = maxNeeds;
            if (typeof this.gameState.playerThirst === 'undefined') this.gameState.playerThirst = maxNeeds;

            // Food/Drink
            if (selectedDisplayItem.effects.hunger) {
                this.gameState.playerHunger = Math.min(this.gameState.playerHunger + selectedDisplayItem.effects.hunger, maxNeeds);
                consumed = true;
            }
            if (selectedDisplayItem.effects.thirst) {
                this.gameState.playerThirst = Math.min(this.gameState.playerThirst + selectedDisplayItem.effects.thirst, maxNeeds);
                consumed = true;
            }

            // Healing (Medical Items)
            if (selectedDisplayItem.effects.health) {
                const healAmount = selectedDisplayItem.effects.health;
                // Find most damaged body part
                let worstPart = null;
                let minHpPercent = 1.0;
                const health = this.gameState.player.health;

                if (health) {
                    for (const partName in health) {
                        const part = health[partName];
                        if (part.current < part.max) {
                            const hpPercent = part.current / part.max;
                            if (hpPercent < minHpPercent) {
                                minHpPercent = hpPercent;
                                worstPart = partName;
                            }
                        }
                    }
                }

                if (worstPart) {
                    const part = health[worstPart];
                    const oldHp = part.current;
                    part.current = Math.min(part.current + healAmount, part.max);
                    const healed = part.current - oldHp;

                    // Handle bleeding if applicable
                    if (selectedDisplayItem.effects.stopBleeding) {
                        // Assuming bleeding is tracked in statusEffects or similar.
                        // For now, just log it as per prompt request "update... interaction...".
                        // Real implementation would check/remove 'bleeding' status.
                        logToConsole("Stops bleeding (if any).");
                    }

                    logToConsole(`You used ${selectedDisplayItem.displayName} on your ${worstPart}. Healed ${healed} HP. (${part.current}/${part.max})`);
                    consumed = true;

                    if (window.renderHealthTable) window.renderHealthTable(this.gameState.player);
                } else {
                    logToConsole(`You are already at full health. Save the ${selectedDisplayItem.displayName}.`, "info");
                    return; // Don't consume if full health
                }
            }

            if (consumed) {
                if (!selectedDisplayItem.effects.health) { // Only log consumption for food/drink here, healing logged above
                    logToConsole(`You consumed ${selectedDisplayItem.displayName}. Hunger: ${this.gameState.playerHunger}, Thirst: ${this.gameState.playerThirst}`);
                }
                if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.6 });
                this.removeItem(selectedDisplayItem.id, 1);
                if (window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
                if (this.gameState.inventory.open) this.renderInventoryMenu();
                return;
            }
        }

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
                let handSlotToEquip = this.gameState.inventory.handSlots[0] ? (this.gameState.inventory.handSlots[1] ? -1 : 1) : 0;
                if (handSlotToEquip !== -1) this.equipItem(selectedDisplayItem.name, handSlotToEquip);
                else { logToConsole(`Both hands are full. Cannot equip ${selectedDisplayItem.displayName}.`, "orange"); if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); }
            } else {
                logToConsole(`You look at your ${selectedDisplayItem.displayName}: ${selectedDisplayItem.description || '(No description)'}`, "info");
                if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.3 });
            }
        }
        if (this.gameState.inventory.open) this.renderInventoryMenu();
    }

    clearInventoryHighlight() {
        document.querySelectorAll("#inventoryList .selected")
            .forEach(el => el.classList.remove("selected"));
    }

    initiateTrapPlacement(itemId) {
        this.toggleInventoryMenu(); // Close inventory
        this.gameState.isTrapPlacementMode = true;
        this.gameState.placingTrapItemId = itemId;
        // Optionally center ghost on player initially?
        // Or wait for mouse move.
        logToConsole("Entering trap placement mode. Click to place.", "info");
        if (window.uiManager && typeof window.uiManager.showToastNotification === 'function') {
            window.uiManager.showToastNotification("Placement Mode: Click to place trap.", "info");
        }
    }
}

// Remove old global assignments of individual functions from InventoryManager object literal
// The instance created in script.js and assigned to window.inventoryManager will provide access to these methods.
// e.g. window.inventoryManager.addItem(...), not window.addItem(...)
// If any global functions are truly needed independently of an inventoryManager instance,
// they should be defined as standalone functions or static methods and explicitly assigned to window.

logToConsole("InventoryManager class defined. Old global function assignments removed.", "blue", "dev");
