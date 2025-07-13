﻿// js/inventoryManager.js

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
        logToConsole(`${this.logPrefix} Initialized. Player inventory container is:`, this.gameState.inventory.container);
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
            logToConsole(`${this.logPrefix} addItemToInventory: Invalid item or quantity.`, "warn", { itemToAddInstance, quantity });
            return false;
        }
        if (!inventoryItems || !Array.isArray(inventoryItems)) {
            logToConsole(`${this.logPrefix} addItemToInventory: inventoryItems is not a valid array.`, "error");
            return false;
        }

        const itemDef = this.assetManager ? this.assetManager.getItem(itemToAddInstance.id) : itemToAddInstance;
        if (!itemDef) {
            logToConsole(`${this.logPrefix} addItemToInventory: Item definition not found for ID ${itemToAddInstance.id}.`, "error");
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
            logToConsole(`${this.logPrefix} Main inventory container not initialized. Cannot add item by ID.`, "error");
            return false;
        }
        const itemDef = this.assetManager.getItem(itemId);
        if (!itemDef) {
            logToConsole(`${this.logPrefix} Item definition not found for ID: ${itemId}`, "error");
            return false;
        }
        const itemInstance = new Item(itemDef); // Create instance from definition
        return this.addItemToInventory(itemInstance, quantity, this.gameState.inventory.container.items, this.gameState.inventory.container.maxSlots);
    }


    applyMod(weaponItemInstance, modItemInstance, targetSlotType) {
        if (!weaponItemInstance || !modItemInstance || !targetSlotType) {
            logToConsole(`${this.logPrefix}.applyMod] Invalid arguments.`, "red");
            return false;
        }
        const weaponDef = this.assetManager.getItem(weaponItemInstance.id);
        const modDef = this.assetManager.getItem(modItemInstance.id);
        if (!weaponDef || !modDef) {
            logToConsole(`[${this.logPrefix}.applyMod] Weapon or Mod definition not found.`, "red");
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

    hasItem(itemId, quantity = 1) {
        if (!this.gameState || !this.gameState.inventory || !this.gameState.inventory.container || !this.gameState.inventory.container.items) {
            logToConsole(`[${this.logPrefix}.hasItem] Player inventory not available.`, "warn");
            return false;
        }
        return this.countItems(itemId, this.gameState.inventory.container.items) >= quantity;
    }

    // addItem uses this.addItemToInventory which uses this.assetManager
    addItem(itemInstance) {
        if (!this.gameState.inventory.container) {
            logToConsole(`${this.logPrefix} Inventory container not initialized. Cannot add item.`, "error");
            return false;
        }
        const quantityToAdd = itemInstance.quantity || 1;
        if (this.addItemToInventory(itemInstance, quantityToAdd, this.gameState.inventory.container.items, this.gameState.inventory.container.maxSlots)) {
            logToConsole(`Added ${quantityToAdd}x ${itemInstance.name}.`);
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.5 });
            if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();
            return true;
        } else {
            logToConsole(`Failed to add ${itemInstance.name}.`);
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            return false;
        }
    }

    removeItem(itemIdOrName, quantity = 1) {
        if (!this.gameState.inventory.container) {
            logToConsole(`${this.logPrefix} Inventory container not initialized.`, "error");
            return null;
        }
        const inv = this.gameState.inventory.container.items;
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
            logToConsole(`Removed ${quantity}x ${itemToRemoveInstance.name}.`);
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.4 });
            if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();
            return this.assetManager.getItem(actualItemId); // Return definition
        } else {
            logToConsole(`Failed to remove ${quantity}x ${itemToRemoveInstance.name}.`, "warn");
            return null;
        }
    }

    dropItem(itemName) {
        const itemDefToDrop = this.removeItem(itemName, 1);
        if (itemDefToDrop) {
            if (!this.gameState.playerPos || typeof this.gameState.playerPos.x === 'undefined' || typeof this.gameState.playerPos.y === 'undefined') {
                logToConsole("Cannot drop item: Player position is unknown.", "error");
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

    equipItem(itemName, handIndex) {
        if (!this.gameState.inventory.container) {
            logToConsole(`${this.logPrefix} Inventory container not initialized.`, "error"); return;
        }
        const inv = this.gameState.inventory.container.items;
        const itemIndex = inv.findIndex(i => i.name === itemName);
        if (itemIndex === -1) {
            logToConsole(`Item "${itemName}" not found in inventory.`, "warn");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); return;
        }
        const item = inv[itemIndex];
        if (item.isClothing) {
            logToConsole(`${item.name} is clothing. Use 'Wear' action.`, "info");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); return;
        }
        if (!item.canEquip) {
            logToConsole(`Cannot equip "${itemName}" to a hand slot.`, "info");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); return;
        }
        if (this.gameState.inventory.handSlots[handIndex]) {
            logToConsole(`Hand slot ${handIndex + 1} is occupied by ${this.gameState.inventory.handSlots[handIndex].name}.`, "info");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); return;
        }
        if (this.removeItems(item.id, 1, inv)) {
            item.equipped = true;
            this.gameState.inventory.handSlots[handIndex] = item;
            logToConsole(`Equipped ${item.name} to hand slot ${handIndex + 1}.`);
            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.8 });
            if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();
            if (this.gameState.isInCombat && this.gameState.combatPhase === 'playerAttackDeclare' && window.combatManager) {
                window.combatManager.populateWeaponSelect();
            }
        } else {
            logToConsole(`Failed to remove ${item.name} from inventory during equip.`, "error");
        }
    }

    unequipItem(handIndex) {
        if (!this.gameState.inventory.container) {
            logToConsole(`${this.logPrefix} Inventory container not initialized.`, "error"); return;
        }
        const itemToUnequip = this.gameState.inventory.handSlots[handIndex];
        if (!itemToUnequip) {
            logToConsole(`No item in hand ${handIndex + 1}.`, "info");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); return;
        }
        if (this.addItemToInventory(itemToUnequip, 1, this.gameState.inventory.container.items, this.gameState.inventory.container.maxSlots)) {
            itemToUnequip.equipped = false;
            this.gameState.inventory.handSlots[handIndex] = null;
            logToConsole(`Unequipped ${itemToUnequip.name}.`);
            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.8 });
            if (typeof this.updateInventoryUI === 'function') this.updateInventoryUI();
            if (this.gameState.isInCombat && this.gameState.combatPhase === 'playerAttackDeclare' && window.combatManager) {
                window.combatManager.populateWeaponSelect();
            }
        } else {
            logToConsole(`Not enough space to unequip ${itemToUnequip.name}.`, "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        }
    }

    equipClothing(itemName) {
        if (!this.gameState.inventory.container) {
            logToConsole(`${this.logPrefix} Inventory container not initialized.`, "error"); return;
        }
        const inv = this.gameState.inventory.container.items;
        const itemIndex = inv.findIndex(i => i.name === itemName);
        if (itemIndex === -1) {
            logToConsole(`Error: Item "${itemName}" not found in inventory.`, "error");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); return;
        }
        const item = inv[itemIndex];
        if (!item.isClothing) {
            logToConsole(`Error: "${itemName}" is not clothing.`, "error");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav'); return;
        }
        if (!item.layer || !Object.values(window.ClothingLayers || {}).includes(item.layer)) {
            logToConsole(`Error: "${itemName}" has an invalid or missing clothing layer: ${item.layer}.`, "error");
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
            logToConsole(`Failed to remove ${item.name} from inventory during equip.`, "error");
        }
    }

    unequipClothing(clothingLayer) {
        if (!this.gameState.inventory.container) {
            logToConsole(`${this.logPrefix} Inventory container not initialized.`, "error"); return;
        }
        if (!clothingLayer || !this.gameState.player.wornClothing.hasOwnProperty(clothingLayer)) {
            logToConsole(`Error: Invalid clothing layer "${clothingLayer}".`, "error");
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
            logToConsole(`Critical Warning: Not enough inventory space to unequip ${itemToUnequip.name}. Item remains equipped.`, "error");
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
        const list = document.getElementById("inventoryList");
        if (!list) return;
        list.innerHTML = "";
        this.gameState.inventory.currentlyDisplayedItems = [];

        this.gameState.inventory.handSlots.forEach((item, index) => {
            if (item) this.gameState.inventory.currentlyDisplayedItems.push({ ...item, equipped: true, source: 'hand', originalHandIndex: index, displayName: item.name });
        });
        for (const layer in this.gameState.player.wornClothing) {
            const item = this.gameState.player.wornClothing[layer];
            if (item) this.gameState.inventory.currentlyDisplayedItems.push({ ...item, equipped: true, source: 'clothing', originalLayer: layer, displayName: item.name });
        }
        if (this.gameState.inventory.container && this.gameState.inventory.container.items) {
            this.gameState.inventory.container.items.forEach(item => {
                this.gameState.inventory.currentlyDisplayedItems.push({ ...item, equipped: false, source: 'container', displayName: item.name });
            });
        }
        let collectedFloorItems = [];
        if (this.gameState.floorItems && this.gameState.playerPos) {
            const { x: playerX, y: playerY, z: playerZ } = this.gameState.playerPos;
            const R = 1;
            this.gameState.floorItems.forEach(floorEntry => {
                if (floorEntry.x >= playerX - R && floorEntry.x <= playerX + R &&
                    floorEntry.y >= playerY - R && floorEntry.y <= playerY + R &&
                    floorEntry.z === playerZ) {
                    collectedFloorItems.push({ ...floorEntry.item, equipped: false, source: 'floor', originalFloorItemEntry: floorEntry, displayName: floorEntry.item.name });
                }
            });
        }
        collectedFloorItems.forEach(fi => this.gameState.inventory.currentlyDisplayedItems.push(fi));

        if (this.gameState.inventory.container && this.gameState.inventory.container.items) {
            this.gameState.inventory.container.items.forEach(item => {
                if (item.tags && item.tags.includes('container') && item.items) {
                    item.items.forEach(innerItem => {
                        this.gameState.inventory.currentlyDisplayedItems.push({ ...innerItem, equipped: false, source: 'worldContainer', containerRef: item, displayName: innerItem.name });
                    });
                }
            });
        }

        if (this.gameState.worldContainers && this.gameState.worldContainers.length > 0 && this.gameState.playerPos) {
            const { x: playerX, y: playerY, z: playerZ } = this.gameState.playerPos;
            const R = 1;
            this.gameState.worldContainers.forEach(container => {
                if (container.x >= playerX - R && container.x <= playerX + R &&
                    container.y >= playerY - R && container.y <= playerY + R &&
                    container.z === playerZ) {
                    if (container.items && container.items.length > 0) {
                        container.items.forEach((item, itemIdx) => {
                            this.gameState.inventory.currentlyDisplayedItems.push({ ...item, equipped: false, source: 'worldContainer', containerRef: container, originalItemIndex: itemIdx, displayName: item.name });
                        });
                    }
                }
            });
        }

        if (this.gameState.inventory.currentlyDisplayedItems.length === 0) {
            list.textContent = " No items ";
            this.gameState.inventory.cursor = 0; return;
        }
        if (this.gameState.inventory.cursor >= this.gameState.inventory.currentlyDisplayedItems.length) {
            this.gameState.inventory.cursor = Math.max(0, this.gameState.inventory.currentlyDisplayedItems.length - 1);
        }
        if (this.gameState.inventory.cursor < 0 && this.gameState.inventory.currentlyDisplayedItems.length > 0) {
            this.gameState.inventory.cursor = 0;
        }

        let floorHeaderRendered = false;
        let lastContainerNameRendered = null;
        this.gameState.inventory.currentlyDisplayedItems.forEach((item, idx) => {
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
            const quantityText = item.quantity > 1 ? ` (x${item.quantity})` : "";
            const nameToDisplay = item.displayName || item.name || "Unknown Item";
            d.textContent = `${idx + 1}. ${prefix}${nameToDisplay}${quantityText}${sizeText}`;
            if (idx === this.gameState.inventory.cursor) d.classList.add("selected");
            list.appendChild(d);
        });
    }

    toggleInventoryMenu() {
        this.gameState.inventory.open = !this.gameState.inventory.open;
        if (window.audioManager) {
            window.audioManager.playUiSound(this.gameState.inventory.open ? 'ui_click_01.wav' : 'ui_click_01.wav', { volume: this.gameState.inventory.open ? 0.6 : 0.5 });
        }
        const inventoryListDiv = document.getElementById("inventoryList");
        if (!inventoryListDiv) return;
        if (this.gameState.inventory.open) {
            inventoryListDiv.classList.remove("hidden");
            inventoryListDiv.style.display = 'block';
            this.renderInventoryMenu();
        } else {
            inventoryListDiv.classList.add("hidden");
            inventoryListDiv.style.display = 'none';
            this.clearInventoryHighlight();
            this.gameState.inventory.currentlyDisplayedItems = [];
            if (this.gameState.isInCombat && this.gameState.combatPhase === 'playerAttackDeclare' && window.combatManager) {
                window.combatManager.populateWeaponSelect();
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
            logToConsole("No item selected at cursor position.", "warn"); return;
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
                logToConsole("Error: Could not find item in world container.", "error");
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
        }

        if (selectedDisplayItem.isConsumable && selectedDisplayItem.effects && !selectedDisplayItem.equipped) {
            let consumed = false; const maxNeeds = 24;
            if (typeof this.gameState.playerHunger === 'undefined') this.gameState.playerHunger = maxNeeds;
            if (typeof this.gameState.playerThirst === 'undefined') this.gameState.playerThirst = maxNeeds;
            if (selectedDisplayItem.effects.hunger) {
                this.gameState.playerHunger = Math.min(this.gameState.playerHunger + selectedDisplayItem.effects.hunger, maxNeeds);
                consumed = true;
            }
            if (selectedDisplayItem.effects.thirst) {
                this.gameState.playerThirst = Math.min(this.gameState.playerThirst + selectedDisplayItem.effects.thirst, maxNeeds);
                consumed = true;
            }
            if (consumed) {
                logToConsole(`You consumed ${selectedDisplayItem.displayName}. Hunger: ${this.gameState.playerHunger}, Thirst: ${this.gameState.playerThirst}`);
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
}

// Remove old global assignments of individual functions from InventoryManager object literal
// The instance created in script.js and assigned to window.inventoryManager will provide access to these methods.
// e.g. window.inventoryManager.addItem(...), not window.addItem(...)
// If any global functions are truly needed independently of an inventoryManager instance,
// they should be defined as standalone functions or static methods and explicitly assigned to window.

logToConsole("InventoryManager class defined. Old global function assignments removed.", "blue");
