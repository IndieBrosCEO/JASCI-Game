/**************************************************************
 * Inventory System Functions & Constructors
 **************************************************************/

// InventorySizes and ClothingLayers are expected to be global, loaded from js/gameState.js
// logToConsole is expected to be global, loaded from js/utils.js
// renderCharacterInfo is expected to be global, loaded from script.js

// 2) Inventory container constructor
function InventoryContainer(name, sizeLabel) {
    this.name = name;
    this.sizeLabel = sizeLabel;
    this.maxSlots = InventorySizes[sizeLabel]; // Assumes InventorySizes is global
    this.items = [];
}

// 3) Item constructor
function Item(itemDef) { // itemDef is the raw object from JSON
    Object.assign(this, itemDef); // Copy all properties from itemDef to this instance

    // Set instance-specific defaults or overrides after copying
    this.equipped = false;
}

// 5) Check capacity
function canAddItem(item) {
    if (!gameState.inventory.container) { // Ensure container is initialized
        logToConsole("Inventory container not initialized yet.");
        return false;
    }
    const used = gameState.inventory.container.items
        .reduce((sum, i) => sum + i.size, 0);
    return used + item.size <= gameState.inventory.container.maxSlots;
}

// 6) Add
function addItem(item) {
    if (!gameState.inventory.container) { // Ensure container is initialized
        logToConsole("Inventory container not initialized. Cannot add item.");
        return false;
    }
    if (!canAddItem(item)) {
        logToConsole(`Not enough space for ${item.name}.`);
        return false;
    }
    gameState.inventory.container.items.push(item);
    logToConsole(`Added ${item.name}.`);
    updateInventoryUI();
    return true;
}

// 7) Remove
function removeItem(itemName) {
    if (!gameState.inventory.container) {
        logToConsole("Inventory container not initialized.");
        return null;
    }
    const inv = gameState.inventory.container.items;
    const idx = inv.findIndex(i => i.name === itemName);
    if (idx === -1) {
        logToConsole(`${itemName} not found.`);
        return null;
    }
    const [removed] = inv.splice(idx, 1);
    logToConsole(`Removed ${removed.name}.`);
    updateInventoryUI();
    return removed;
}

// 8) Equip / Unequip
function equipItem(itemName, handIndex) {
    if (!gameState.inventory.container) {
        logToConsole("Inventory container not initialized.");
        return;
    }
    const inv = gameState.inventory.container.items;
    const itemIndex = inv.findIndex(i => i.name === itemName);

    if (itemIndex === -1) {
        logToConsole(`Item "${itemName}" not found in inventory.`);
        return;
    }
    const item = inv[itemIndex];

    if (item.isClothing) {
        logToConsole(`${item.name} is clothing. Use the 'Wear' action instead.`);
        return;
    }

    if (!item.canEquip) {
        logToConsole(`Cannot equip "${itemName}" to a hand slot.`);
        return;
    }

    if (gameState.inventory.handSlots[handIndex]) {
        logToConsole(`Hand slot ${handIndex + 1} is already occupied by ${gameState.inventory.handSlots[handIndex].name}.`);
        return;
    }

    const equippedItem = inv.splice(itemIndex, 1)[0];
    equippedItem.equipped = true;
    gameState.inventory.handSlots[handIndex] = equippedItem;
    logToConsole(`Equipped ${equippedItem.name} to hand slot ${handIndex + 1}.`);
    updateInventoryUI();
    logToConsole(`[equipItem Debug] isInCombat: ${gameState.isInCombat}, combatPhase: ${gameState.combatPhase}`); // New log
    if (gameState.isInCombat &&
        gameState.combatPhase === 'playerAttackDeclare' &&
        typeof window.combatManager !== 'undefined' &&
        typeof window.combatManager.populateWeaponSelect === 'function') {
        logToConsole("Combat attack UI active after equipping item, refreshing weapon select."); // Existing log
        window.combatManager.populateWeaponSelect();
        logToConsole("[equipItem Debug] populateWeaponSelect was called."); // New log
    }
}

function unequipItem(handIndex) {
    if (!gameState.inventory.container) {
        logToConsole("Inventory container not initialized.");
        return;
    }
    const slot = gameState.inventory.handSlots[handIndex];
    if (!slot) {
        logToConsole(`No item in hand ${handIndex + 1}.`);
        return;
    }
    if (!canAddItem(slot)) {
        logToConsole(`Not enough space to unequip ${slot.name}.`);
        return;
    }
    slot.equipped = false;
    gameState.inventory.container.items.push(slot);
    gameState.inventory.handSlots[handIndex] = null;
    logToConsole(`Unequipped ${slot.name}.`);
    updateInventoryUI();
    logToConsole(`[unequipItem Debug] isInCombat: ${gameState.isInCombat}, combatPhase: ${gameState.combatPhase}`); // New log
    if (gameState.isInCombat &&
        gameState.combatPhase === 'playerAttackDeclare' &&
        typeof window.combatManager !== 'undefined' &&
        typeof window.combatManager.populateWeaponSelect === 'function') {
        logToConsole("Combat attack UI active after unequipping item, refreshing weapon select."); // Existing log
        window.combatManager.populateWeaponSelect();
        logToConsole("[unequipItem Debug] populateWeaponSelect was called."); // New log
    }
}

/**************************************************************
 * Clothing Equip/Unequip Functions
 **************************************************************/
function equipClothing(itemName) {
    if (!gameState.inventory.container) {
        logToConsole("Inventory container not initialized.");
        return;
    }
    const inv = gameState.inventory.container.items;
    const itemIndex = inv.findIndex(i => i.name === itemName);

    if (itemIndex === -1) {
        logToConsole(`Error: Item "${itemName}" not found in inventory.`);
        return;
    }

    const item = inv[itemIndex];

    if (!item.isClothing) {
        logToConsole(`Error: "${itemName}" is not clothing and cannot be worn.`);
        return;
    }

    if (!item.layer || !Object.values(ClothingLayers).includes(item.layer)) { // Assumes ClothingLayers is global
        logToConsole(`Error: "${itemName}" has an invalid or missing clothing layer: ${item.layer}`);
        return;
    }

    const targetLayer = item.layer;
    if (gameState.player.wornClothing[targetLayer]) {
        logToConsole(`Layer ${targetLayer} is already occupied by ${gameState.player.wornClothing[targetLayer].name}.`);
        return;
    }

    inv.splice(itemIndex, 1);
    gameState.player.wornClothing[targetLayer] = item;
    item.equipped = true;

    logToConsole(`Equipped ${itemName} to ${targetLayer}.`);
    updateInventoryUI();
    renderCharacterInfo(); // Assumes renderCharacterInfo is global
}

function unequipClothing(clothingLayer) {
    if (!gameState.inventory.container) {
        logToConsole("Inventory container not initialized.");
        return;
    }
    if (!clothingLayer || !gameState.player.wornClothing.hasOwnProperty(clothingLayer)) {
        logToConsole(`Error: Invalid clothing layer "${clothingLayer}".`);
        return;
    }

    const item = gameState.player.wornClothing[clothingLayer];

    if (!item) {
        logToConsole(`No item to unequip from ${clothingLayer}.`);
        return;
    }

    if (!canAddItem(item)) {
        logToConsole(`Not enough inventory space to unequip ${item.name}.`);
        return;
    }

    gameState.inventory.container.items.push(item);
    gameState.player.wornClothing[clothingLayer] = null;
    item.equipped = false;

    logToConsole(`Unequipped ${item.name} from ${clothingLayer}.`);
    updateInventoryUI();
    renderCharacterInfo(); // Assumes renderCharacterInfo is global
}

// 9) Update the DOM
function updateInventoryUI() {
    if (!gameState.inventory.container) { // Check if container is initialized
        // It might be called during initial setup before container is made.
        // console.warn("updateInventoryUI called before inventory container is initialized.");
        // return; 
        // Or, allow it to proceed if other parts of UI should update (e.g. hand slots if they are separate)
    }

    const equippedHandItemsDiv = document.getElementById("equippedHandItems");
    if (equippedHandItemsDiv) {
        equippedHandItemsDiv.innerHTML = "";
        gameState.inventory.handSlots.forEach((it, i) => {
            const d = document.createElement("div");
            const handName = i === 0 ? "Left Hand" : "Right Hand";
            d.textContent = it ? `${handName}: ${it.name}` : `${handName}: Empty`;
            equippedHandItemsDiv.appendChild(d);
        });
    }

    const equippedContainersDiv = document.getElementById("equippedContainers");
    const invCapacitySpan = document.getElementById("invCapacity");

    if (gameState.inventory.container) { // Only update if container exists
        if (equippedContainersDiv) {
            equippedContainersDiv.innerHTML = "";
            const mainContainer = gameState.inventory.container;
            const usedSlots = mainContainer.items.reduce((sum, i) => sum + i.size, 0);
            const containerDisplay = document.createElement("div");
            containerDisplay.textContent = `${mainContainer.name}: ${usedSlots}/${mainContainer.maxSlots}`;
            equippedContainersDiv.appendChild(containerDisplay);
        }
        if (invCapacitySpan) {
            const mainContainer = gameState.inventory.container;
            const usedSlots = mainContainer.items.reduce((sum, i) => sum + i.size, 0);
            invCapacitySpan.textContent = `${usedSlots}/${mainContainer.maxSlots}`;
        }
    } else { // If container doesn't exist, show default/empty state
        if (equippedContainersDiv) equippedContainersDiv.innerHTML = "No container equipped.";
        if (invCapacitySpan) invCapacitySpan.textContent = "0/0";
    }


    const oldHandSlotsDiv = document.getElementById("handSlots");
    if (oldHandSlotsDiv) {
        oldHandSlotsDiv.innerHTML = "";
    }

    const wornItemsList = document.getElementById("wornClothingList");
    if (wornItemsList) {
        wornItemsList.innerHTML = "";
        let hasWornItems = false;
        if (gameState.player && gameState.player.wornClothing) {
            for (const layer in gameState.player.wornClothing) {
                const item = gameState.player.wornClothing[layer];
                if (item) {
                    hasWornItems = true;
                    const itemDiv = document.createElement("div");
                    const layerDisplayNameKey = Object.keys(ClothingLayers).find(key => ClothingLayers[key] === layer); // Assumes ClothingLayers global
                    const layerDisplayName = layerDisplayNameKey ? layerDisplayNameKey.replace(/_/g, ' ') : layer.replace(/_/g, ' ');
                    itemDiv.textContent = `${layerDisplayName}: ${item.name}`;
                    wornItemsList.appendChild(itemDiv);
                }
            }
        }
        if (!hasWornItems) {
            wornItemsList.textContent = " Not wearing anything ";
        }
    }
}

// 10) Render inventory when open
function renderInventoryMenu() {
    const list = document.getElementById("inventoryList");
    if (!list) return;
    list.innerHTML = "";

    if (!gameState.inventory.container) {
        list.textContent = " Inventory container not available ";
        return;
    }

    const wornItemNames = new Set();
    if (gameState.player && gameState.player.wornClothing) {
        Object.values(gameState.player.wornClothing).forEach(wornItem => {
            if (wornItem && wornItem.name) {
                wornItemNames.add(wornItem.name);
            }
        });
    }

    gameState.inventory.currentlyDisplayedItems = [];

    // Add equipped hand items first
    gameState.inventory.handSlots.forEach((item, index) => {
        if (item) {
            gameState.inventory.currentlyDisplayedItems.push({
                ...item, // Spread existing item properties
                isEquippedHandItem: true,
                originalHandIndex: index
            });
        }
    });

    // Then add container items, filtering out already worn clothing
    const containerItemsToAdd = gameState.inventory.container.items
        .filter(item => !item.isClothing || !wornItemNames.has(item.name))
        .map(item => ({ ...item, isEquippedHandItem: false })); // Mark as not equipped hand item

    gameState.inventory.currentlyDisplayedItems.push(...containerItemsToAdd);


    if (gameState.inventory.currentlyDisplayedItems.length === 0) {
        list.textContent = " No items "; // Changed from "empty" to "No items" for clarity
        return;
    }

    if (gameState.inventory.cursor >= gameState.inventory.currentlyDisplayedItems.length) {
        gameState.inventory.cursor = Math.max(0, gameState.inventory.currentlyDisplayedItems.length - 1);
    }

    gameState.inventory.currentlyDisplayedItems.forEach((it, idx) => {
        const d = document.createElement("div");
        let prefix = "";
        if (it.isEquippedHandItem) {
            prefix = `[HAND ${it.originalHandIndex + 1}] `;
        }
        d.textContent = `${idx + 1}. ${prefix}${it.name} (${it.size})`;
        if (idx === gameState.inventory.cursor) {
            d.classList.add("selected");
        }
        list.appendChild(d);
    });
}

// 11) Toggle panel
function toggleInventoryMenu() {
    gameState.inventory.open = !gameState.inventory.open;
    const inventoryListDiv = document.getElementById("inventoryList");
    if (!inventoryListDiv) return;

    if (gameState.inventory.open) {
        inventoryListDiv.classList.remove("hidden");
        inventoryListDiv.style.display = 'block';
        renderInventoryMenu();
    } else {
        inventoryListDiv.classList.add("hidden");
        inventoryListDiv.style.display = 'none';
        clearInventoryHighlight();
        gameState.inventory.currentlyDisplayedItems = [];

        // New logic to refresh combat weapon select:
        if (gameState.isInCombat &&
            gameState.combatPhase === 'playerAttackDeclare' &&
            typeof window.combatManager !== 'undefined' &&
            typeof window.combatManager.populateWeaponSelect === 'function') {
            logToConsole("[toggleInventoryMenu] Inventory closed during playerAttackDeclare. Refreshing combat weapon select.");
            window.combatManager.populateWeaponSelect();
        }
    }
}

// 12) Use selected item
function interactInventoryItem() {
    if (!gameState.inventory.currentlyDisplayedItems || gameState.inventory.currentlyDisplayedItems.length === 0) return;
    if (!gameState.inventory.container) return;


    const idx = gameState.inventory.cursor;
    if (idx < 0 || idx >= gameState.inventory.currentlyDisplayedItems.length) return;

    const displayedItem = gameState.inventory.currentlyDisplayedItems[idx];
    if (!displayedItem) return;

    if (displayedItem.isEquippedHandItem === true) {
        logToConsole(`Attempting to unequip ${displayedItem.name} from hand ${displayedItem.originalHandIndex + 1}...`);
        window.unequipItem(displayedItem.originalHandIndex);
    } else {
        // This is an item from the container
        const actualItemInContainer = gameState.inventory.container.items.find(item => item.name === displayedItem.name && item.id === displayedItem.id);

        if (!actualItemInContainer) {
            // This case should ideally not happen if currentlyDisplayedItems is built correctly from container
            logToConsole(`Error: Could not find ${displayedItem.name} in main inventory for interaction.`);
            return;
        }

        if (actualItemInContainer.isClothing) {
            logToConsole(`Attempting to wear ${actualItemInContainer.name}...`);
            equipClothing(actualItemInContainer.name);
        } else if (actualItemInContainer.canEquip) {
            let handSlotToEquip = -1;
            if (!gameState.inventory.handSlots[0]) handSlotToEquip = 0;
            else if (!gameState.inventory.handSlots[1]) handSlotToEquip = 1;

            if (handSlotToEquip !== -1) {
                logToConsole(`Attempting to equip ${actualItemInContainer.name} to hand ${handSlotToEquip + 1}...`);
                equipItem(actualItemInContainer.name, handSlotToEquip);
            } else {
                logToConsole(`Both hands are full. Cannot equip ${actualItemInContainer.name}.`);
            }
        } else {
            logToConsole(`You look at your ${actualItemInContainer.name}: ${actualItemInContainer.description}`);
        }
    }
    if (gameState.inventory.open) {
        renderInventoryMenu();
    }
}

// 13) Clear highlight when closing
function clearInventoryHighlight() {
    document.querySelectorAll("#inventoryList .selected")
        .forEach(el => el.classList.remove("selected"));
}

window.InventoryContainer = InventoryContainer;
window.Item = Item;
window.canAddItem = canAddItem;
window.addItem = addItem;
window.removeItem = removeItem;
window.equipItem = equipItem;
window.unequipItem = unequipItem;
window.equipClothing = equipClothing;
window.unequipClothing = unequipClothing;
window.updateInventoryUI = updateInventoryUI;
window.renderInventoryMenu = renderInventoryMenu;
window.toggleInventoryMenu = toggleInventoryMenu;
window.interactInventoryItem = interactInventoryItem;
window.clearInventoryHighlight = clearInventoryHighlight;