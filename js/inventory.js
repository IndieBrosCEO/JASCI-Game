/**************************************************************
 * Inventory System Functions & Constructors
 **************************************************************/

// InventorySizes and ClothingLayers are expected to be global, loaded from js/gameState.js
// logToConsole is expected to be global, loaded from js/utils.js
// renderCharacterInfo is expected to be global, loaded from script.js

function calculateCumulativeCapacity(playerGameState) {
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
}

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
    equippedItem.equipped = true; // Ensure flag is set
    gameState.inventory.handSlots[handIndex] = equippedItem;
    logToConsole(`Equipped ${equippedItem.name} to hand slot ${handIndex + 1}.`);
    updateInventoryUI();
    logToConsole(`[equipItem Debug] isInCombat: ${gameState.isInCombat}, combatPhase: ${gameState.combatPhase}`);
    if (gameState.isInCombat &&
        gameState.combatPhase === 'playerAttackDeclare' &&
        typeof window.combatManager !== 'undefined' &&
        typeof window.combatManager.populateWeaponSelect === 'function') {
        logToConsole("Combat attack UI active after equipping item, refreshing weapon select.");
        window.combatManager.populateWeaponSelect();
        logToConsole("[equipItem Debug] populateWeaponSelect was called.");
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
    slot.equipped = false; // Ensure flag is set before returning to inventory
    gameState.inventory.container.items.push(slot);
    gameState.inventory.handSlots[handIndex] = null;
    logToConsole(`Unequipped ${slot.name}.`);
    updateInventoryUI();
    logToConsole(`[unequipItem Debug] isInCombat: ${gameState.isInCombat}, combatPhase: ${gameState.combatPhase}`);
    if (gameState.isInCombat &&
        gameState.combatPhase === 'playerAttackDeclare' &&
        typeof window.combatManager !== 'undefined' &&
        typeof window.combatManager.populateWeaponSelect === 'function') {
        logToConsole("Combat attack UI active after unequipping item, refreshing weapon select.");
        window.combatManager.populateWeaponSelect();
        logToConsole("[unequipItem Debug] populateWeaponSelect was called.");
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

    if (!item.layer || !Object.values(ClothingLayers).includes(item.layer)) {
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
    gameState.inventory.container.maxSlots = calculateCumulativeCapacity(gameState);

    logToConsole(`Equipped ${itemName} to ${targetLayer}.`);
    updateInventoryUI();
    renderCharacterInfo();
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

    gameState.player.wornClothing[clothingLayer] = null;
    item.equipped = false;

    gameState.inventory.container.maxSlots = calculateCumulativeCapacity(gameState);

    if (!canAddItem(item)) {
        logToConsole("Critical Warning: Not enough inventory space to unequip " + item.name + " to Body Pockets. Item is lost.");
    } else {
        gameState.inventory.container.items.push(item);
    }

    logToConsole(`Unequipped ${item.name} from ${clothingLayer}.`);
    updateInventoryUI();
    renderCharacterInfo();
}

// 9) Update the DOM
function updateInventoryUI() {
    if (!gameState.inventory.container) {
        // console.warn("updateInventoryUI called before inventory container is initialized.");
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

    if (gameState.inventory.container) {
        if (equippedContainersDiv) {
            equippedContainersDiv.innerHTML = "";
            let foundContainers = false;
            if (gameState.player && gameState.player.wornClothing) {
                for (const layer in gameState.player.wornClothing) {
                    const wornItem = gameState.player.wornClothing[layer];
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
            const mainContainer = gameState.inventory.container;
            const usedSlots = mainContainer.items.reduce((sum, i) => sum + i.size, 0);
            invCapacitySpan.textContent = `${usedSlots}/${mainContainer.maxSlots}`;
        }
    } else {
        if (equippedContainersDiv) equippedContainersDiv.innerHTML = "No container equipped.";
        if (invCapacitySpan) invCapacitySpan.textContent = "0/0";
    }

    const oldHandSlotsDiv = document.getElementById("handSlots");
    if (oldHandSlotsDiv) {
        oldHandSlotsDiv.innerHTML = "";
    }

    // The wornItemsList population block has been removed.
}

// 10) Render inventory when open
function renderInventoryMenu() {
    const list = document.getElementById("inventoryList");
    if (!list) return;
    list.innerHTML = ""; // Clear existing list

    gameState.inventory.currentlyDisplayedItems = [];

    // 1. Add equipped hand items
    gameState.inventory.handSlots.forEach((item, index) => {
        if (item) {
            const displayItem = { ...item };
            displayItem.equipped = true;
            displayItem.source = 'hand';
            displayItem.originalHandIndex = index;
            displayItem.displayName = item.name;
            gameState.inventory.currentlyDisplayedItems.push(displayItem);
        }
    });

    // 2. Add worn clothing items
    for (const layer in gameState.player.wornClothing) {
        const item = gameState.player.wornClothing[layer];
        if (item) {
            const displayItem = { ...item };
            displayItem.equipped = true;
            displayItem.source = 'clothing';
            displayItem.originalLayer = layer;
            displayItem.displayName = item.name;
            gameState.inventory.currentlyDisplayedItems.push(displayItem);
        }
    }

    // 3. Add items from the main inventory container
    if (gameState.inventory.container && gameState.inventory.container.items) {
        gameState.inventory.container.items.forEach(item => {
            const displayItem = { ...item };
            displayItem.equipped = false;
            displayItem.source = 'container';
            displayItem.displayName = item.name;
            gameState.inventory.currentlyDisplayedItems.push(displayItem);
        });
    }

    if (gameState.inventory.currentlyDisplayedItems.length === 0) {
        list.textContent = " No items ";
        gameState.inventory.cursor = 0;
        return;
    }

    if (gameState.inventory.cursor >= gameState.inventory.currentlyDisplayedItems.length) {
        gameState.inventory.cursor = Math.max(0, gameState.inventory.currentlyDisplayedItems.length - 1);
    }
    if (gameState.inventory.cursor < 0 && gameState.inventory.currentlyDisplayedItems.length > 0) {
        gameState.inventory.cursor = 0;
    }

    gameState.inventory.currentlyDisplayedItems.forEach((item, idx) => {
        const d = document.createElement("div");
        let prefix = "";
        if (item.equipped) {
            prefix = "[EQUIPPED] ";
        }
        const sizeText = item.size !== undefined ? ` (Size: ${item.size})` : "";
        d.textContent = `${idx + 1}. ${prefix}${item.displayName}${sizeText}`;

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
    if (!gameState.inventory.currentlyDisplayedItems || gameState.inventory.currentlyDisplayedItems.length === 0) {
        logToConsole("No items to interact with.");
        return;
    }

    const cursorIndex = gameState.inventory.cursor;
    if (cursorIndex < 0 || cursorIndex >= gameState.inventory.currentlyDisplayedItems.length) {
        logToConsole("Invalid inventory cursor position.");
        return;
    }

    const selectedDisplayItem = gameState.inventory.currentlyDisplayedItems[cursorIndex];
    if (!selectedDisplayItem) {
        logToConsole("No item selected at cursor position.");
        return;
    }

    logToConsole(`Interacting with: ${selectedDisplayItem.displayName}, Equipped: ${selectedDisplayItem.equipped}, Source: ${selectedDisplayItem.source}`);

    if (selectedDisplayItem.equipped === true) {
        if (selectedDisplayItem.source === 'clothing' && selectedDisplayItem.originalLayer) {
            logToConsole(`Attempting to unequip ${selectedDisplayItem.displayName} from layer ${selectedDisplayItem.originalLayer}...`);
            unequipClothing(selectedDisplayItem.originalLayer);
        } else if (selectedDisplayItem.source === 'hand' && selectedDisplayItem.originalHandIndex !== undefined) {
            logToConsole(`Attempting to unequip ${selectedDisplayItem.displayName} from hand ${selectedDisplayItem.originalHandIndex + 1}...`);
            unequipItem(selectedDisplayItem.originalHandIndex);
        } else {
            logToConsole(`Cannot unequip ${selectedDisplayItem.displayName}: Unknown equipped source or missing data.`);
        }
    } else {
        if (selectedDisplayItem.isClothing) {
            logToConsole(`Attempting to wear ${selectedDisplayItem.displayName}...`);
            equipClothing(selectedDisplayItem.name);
        } else if (selectedDisplayItem.canEquip) {
            let handSlotToEquip = -1;
            if (!gameState.inventory.handSlots[0]) handSlotToEquip = 0;
            else if (!gameState.inventory.handSlots[1]) handSlotToEquip = 1;

            if (handSlotToEquip !== -1) {
                logToConsole(`Attempting to equip ${selectedDisplayItem.displayName} to hand ${handSlotToEquip + 1}...`);
                equipItem(selectedDisplayItem.name, handSlotToEquip);
            } else {
                logToConsole(`Both hands are full. Cannot equip ${selectedDisplayItem.displayName}.`);
            }
        } else {
            logToConsole(`You look at your ${selectedDisplayItem.displayName}: ${selectedDisplayItem.description || '(No description)'}`);
        }
    }

    if (gameState.inventory.open) {
        renderInventoryMenu();
    }
    updateInventoryUI();
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