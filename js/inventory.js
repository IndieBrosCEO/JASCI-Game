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
    if (!window.gameState.inventory.container) { // Ensure container is initialized
        logToConsole("Inventory container not initialized yet.");
        return false;
    }
    const used = window.gameState.inventory.container.items
        .reduce((sum, i) => sum + i.size, 0);
    return used + item.size <= window.gameState.inventory.container.maxSlots;
}

// 6) Add
function addItem(item) {
    if (!window.gameState.inventory.container) { // Ensure container is initialized
        logToConsole("Inventory container not initialized. Cannot add item.");
        return false;
    }
    if (!canAddItem(item)) {
        logToConsole(`Not enough space for ${item.name}.`);
        return false;
    }
    window.gameState.inventory.container.items.push(item);
    logToConsole(`Added ${item.name}.`);
    updateInventoryUI();
    return true;
}

// 7) Remove
function removeItem(itemName) {
    if (!window.gameState.inventory.container) {
        logToConsole("Inventory container not initialized.");
        return null;
    }
    const inv = window.gameState.inventory.container.items;
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

function dropItem(itemName) {
    if (!window.gameState || !window.gameState.inventory.container) {
        logToConsole("Inventory container not initialized or gameState not found.");
        return false;
    }
    const removedItem = removeItem(itemName);
    if (removedItem) {
        if (!window.gameState.playerPos || typeof window.gameState.playerPos.x === 'undefined' || typeof window.gameState.playerPos.y === 'undefined') {
            logToConsole("Cannot drop item: Player position is unknown.", "error");
            addItem(removedItem);
            return false;
        }
        if (!window.gameState.floorItems) {
            window.gameState.floorItems = [];
        }
        window.gameState.floorItems.push({
            x: window.gameState.playerPos.x,
            y: window.gameState.playerPos.y,
            item: removedItem
        });
        logToConsole(`Dropped ${removedItem.name} on the floor at (${window.gameState.playerPos.x}, ${window.gameState.playerPos.y}).`);
        if (typeof window.mapRenderer !== 'undefined' && typeof window.mapRenderer.scheduleRender === 'function') {
            window.mapRenderer.scheduleRender();
        }
        if (window.gameState.inventory.open) {
            renderInventoryMenu();
        }
        return true;
    }
    return false;
}

// 8) Equip / Unequip
function equipItem(itemName, handIndex) {
    if (!window.gameState.inventory.container) {
        logToConsole("Inventory container not initialized.");
        return;
    }
    const inv = window.gameState.inventory.container.items;
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

    if (window.gameState.inventory.handSlots[handIndex]) {
        logToConsole(`Hand slot ${handIndex + 1} is already occupied by ${window.gameState.inventory.handSlots[handIndex].name}.`);
        return;
    }

    const equippedItem = inv.splice(itemIndex, 1)[0];
    equippedItem.equipped = true; // Ensure flag is set
    window.gameState.inventory.handSlots[handIndex] = equippedItem;
    logToConsole(`Equipped ${equippedItem.name} to hand slot ${handIndex + 1}.`);
    updateInventoryUI();
    logToConsole(`[equipItem Debug] isInCombat: ${window.gameState.isInCombat}, combatPhase: ${window.gameState.combatPhase}`);
    if (window.gameState.isInCombat &&
        window.gameState.combatPhase === 'playerAttackDeclare' &&
        typeof window.combatManager !== 'undefined' &&
        typeof window.combatManager.populateWeaponSelect === 'function') {
        logToConsole("Combat attack UI active after equipping item, refreshing weapon select.");
        window.combatManager.populateWeaponSelect();
        logToConsole("[equipItem Debug] populateWeaponSelect was called.");
    }
}

function unequipItem(handIndex) {
    if (!window.gameState.inventory.container) {
        logToConsole("Inventory container not initialized.");
        return;
    }
    const slot = window.gameState.inventory.handSlots[handIndex];
    if (!slot) {
        logToConsole(`No item in hand ${handIndex + 1}.`);
        return;
    }
    if (!canAddItem(slot)) {
        logToConsole(`Not enough space to unequip ${slot.name}.`);
        return;
    }
    slot.equipped = false; // Ensure flag is set before returning to inventory
    window.gameState.inventory.container.items.push(slot);
    window.gameState.inventory.handSlots[handIndex] = null;
    logToConsole(`Unequipped ${slot.name}.`);
    updateInventoryUI();
    logToConsole(`[unequipItem Debug] isInCombat: ${window.gameState.isInCombat}, combatPhase: ${window.gameState.combatPhase}`);
    if (window.gameState.isInCombat &&
        window.gameState.combatPhase === 'playerAttackDeclare' &&
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
    if (!window.gameState.inventory.container) {
        logToConsole("Inventory container not initialized.");
        return;
    }
    const inv = window.gameState.inventory.container.items;
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
    if (window.gameState.player.wornClothing[targetLayer]) {
        logToConsole(`Layer ${targetLayer} is already occupied by ${window.gameState.player.wornClothing[targetLayer].name}.`);
        return;
    }

    inv.splice(itemIndex, 1);
    window.gameState.player.wornClothing[targetLayer] = item;
    item.equipped = true;
    window.gameState.inventory.container.maxSlots = calculateCumulativeCapacity(window.gameState);

    logToConsole(`Equipped ${itemName} to ${targetLayer}.`);
    updateInventoryUI();
    renderCharacterInfo();
}

function unequipClothing(clothingLayer) {
    if (!window.gameState.inventory.container) {
        logToConsole("Inventory container not initialized.");
        return;
    }
    if (!clothingLayer || !window.gameState.player.wornClothing.hasOwnProperty(clothingLayer)) {
        logToConsole(`Error: Invalid clothing layer "${clothingLayer}".`);
        return;
    }

    const item = window.gameState.player.wornClothing[clothingLayer];

    if (!item) {
        logToConsole(`No item to unequip from ${clothingLayer}.`);
        return;
    }

    window.gameState.player.wornClothing[clothingLayer] = null;
    item.equipped = false;

    window.gameState.inventory.container.maxSlots = calculateCumulativeCapacity(window.gameState);

    if (!canAddItem(item)) {
        logToConsole("Critical Warning: Not enough inventory space to unequip " + item.name + " to Body Pockets. Item is lost.");
    } else {
        window.gameState.inventory.container.items.push(item);
    }

    logToConsole(`Unequipped ${item.name} from ${clothingLayer}.`);
    updateInventoryUI();
    renderCharacterInfo();
}

// 9) Update the DOM
function updateInventoryUI() {
    if (!window.gameState.inventory.container) {
        // console.warn("updateInventoryUI called before inventory container is initialized.");
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
    list.innerHTML = "";

    window.gameState.inventory.currentlyDisplayedItems = [];

    window.gameState.inventory.handSlots.forEach((item, index) => {
        if (item) {
            const displayItem = { ...item, equipped: true, source: 'hand', originalHandIndex: index, displayName: item.name };
            window.gameState.inventory.currentlyDisplayedItems.push(displayItem);
        }
    });

    for (const layer in window.gameState.player.wornClothing) {
        const item = window.gameState.player.wornClothing[layer];
        if (item) {
            const displayItem = { ...item, equipped: true, source: 'clothing', originalLayer: layer, displayName: item.name };
            window.gameState.inventory.currentlyDisplayedItems.push(displayItem);
        }
    }

    if (window.gameState.inventory.container && window.gameState.inventory.container.items) {
        window.gameState.inventory.container.items.forEach(item => {
            const displayItem = { ...item, equipped: false, source: 'container', displayName: item.name };
            window.gameState.inventory.currentlyDisplayedItems.push(displayItem);
        });
    }

    let collectedFloorItems = [];
    if (window.gameState && window.gameState.floorItems && window.gameState.playerPos) {
        const playerX = window.gameState.playerPos.x;
        const playerY = window.gameState.playerPos.y;

        // Define the 3x3 grid boundaries
        const minX = playerX - 1;
        const maxX = playerX + 1;
        const minY = playerY - 1;
        const maxY = playerY + 1;

        window.gameState.floorItems.forEach(floorEntry => {
            // Check if the item's coordinates are within the 3x3 grid
            if (floorEntry.x >= minX && floorEntry.x <= maxX &&
                floorEntry.y >= minY && floorEntry.y <= maxY) {

                let displayName = floorEntry.item.name;
                // Optional: Add indication if item is not directly underfoot.
                // if (floorEntry.x !== playerX || floorEntry.y !== playerY) {
                //     displayName = `${floorEntry.item.name} (Nearby)`; 
                // }

                const displayItem = {
                    ...floorEntry.item,
                    equipped: false,
                    source: 'floor',
                    originalFloorItemEntry: floorEntry,
                    displayName: displayName
                };
                collectedFloorItems.push(displayItem);
            }
        });
    }

    collectedFloorItems.forEach(fi => {
        window.gameState.inventory.currentlyDisplayedItems.push(fi);
    });

    if (window.gameState.inventory.currentlyDisplayedItems.length === 0) {
        list.textContent = " No items ";
        window.gameState.inventory.cursor = 0;
        return;
    }

    if (window.gameState.inventory.cursor >= window.gameState.inventory.currentlyDisplayedItems.length) {
        window.gameState.inventory.cursor = Math.max(0, window.gameState.inventory.currentlyDisplayedItems.length - 1);
    }
    if (window.gameState.inventory.cursor < 0 && window.gameState.inventory.currentlyDisplayedItems.length > 0) {
        window.gameState.inventory.cursor = 0;
    }

    let floorHeaderRendered = false;
    window.gameState.inventory.currentlyDisplayedItems.forEach((item, idx) => {
        if (item.source === 'floor' && !floorHeaderRendered) {
            const floorHeader = document.createElement("div");
            floorHeader.textContent = "--- Floor ---";
            floorHeader.classList.add("inventory-subheader");
            list.appendChild(floorHeader);
            floorHeaderRendered = true;
        }

        const d = document.createElement("div");
        let prefix = "";
        if (item.equipped) {
            prefix = "[EQUIPPED] ";
        } else if (item.source === 'floor') {
            prefix = "[FLOOR] ";
        }
        const sizeText = item.size !== undefined ? ` (Size: ${item.size})` : "";
        const nameToDisplay = item.displayName || item.name || "Unknown Item";
        d.textContent = `${idx + 1}. ${prefix}${nameToDisplay}${sizeText}`;

        if (idx === window.gameState.inventory.cursor) {
            d.classList.add("selected");
        }
        list.appendChild(d);
    });
}

// 11) Toggle panel
function toggleInventoryMenu() {
    window.gameState.inventory.open = !window.gameState.inventory.open;
    const inventoryListDiv = document.getElementById("inventoryList");
    if (!inventoryListDiv) return;

    if (window.gameState.inventory.open) {
        inventoryListDiv.classList.remove("hidden");
        inventoryListDiv.style.display = 'block';
        renderInventoryMenu();
    } else {
        inventoryListDiv.classList.add("hidden");
        inventoryListDiv.style.display = 'none';
        clearInventoryHighlight();
        window.gameState.inventory.currentlyDisplayedItems = [];

        if (window.gameState.isInCombat &&
            window.gameState.combatPhase === 'playerAttackDeclare' &&
            typeof window.combatManager !== 'undefined' &&
            typeof window.combatManager.populateWeaponSelect === 'function') {
            logToConsole("[toggleInventoryMenu] Inventory closed during playerAttackDeclare. Refreshing combat weapon select.");
            window.combatManager.populateWeaponSelect();
        }
    }
}

// 12) Use selected item
function interactInventoryItem() {
    if (!window.gameState.inventory.currentlyDisplayedItems || window.gameState.inventory.currentlyDisplayedItems.length === 0) {
        logToConsole("No items to interact with.");
        return;
    }

    const cursorIndex = window.gameState.inventory.cursor;
    if (cursorIndex < 0 || cursorIndex >= window.gameState.inventory.currentlyDisplayedItems.length) {
        logToConsole("Invalid inventory cursor position.");
        return;
    }

    const selectedDisplayItem = window.gameState.inventory.currentlyDisplayedItems[cursorIndex];
    if (!selectedDisplayItem) {
        logToConsole("No item selected at cursor position.");
        return;
    }

    // Inside interactInventoryItem(), after:
    // const selectedDisplayItem = window.gameState.inventory.currentlyDisplayedItems[cursorIndex];
    // if (!selectedDisplayItem) { /* ... return ... */ }

    if (selectedDisplayItem.source === 'floor') {
        const itemToTake = selectedDisplayItem.originalFloorItemEntry.item;
        if (canAddItem(itemToTake)) {
            const floorItemIndex = window.gameState.floorItems.findIndex(entry => entry === selectedDisplayItem.originalFloorItemEntry);
            if (floorItemIndex > -1) {
                window.gameState.floorItems.splice(floorItemIndex, 1);
            }
            addItem(itemToTake);
            logToConsole(`Picked up ${itemToTake.name} from the floor.`);
            if (typeof window.mapRenderer !== 'undefined' && typeof window.mapRenderer.scheduleRender === 'function') {
                window.mapRenderer.scheduleRender();
            }
        } else {
            logToConsole(`Not enough space to pick up ${itemToTake.name}.`);
        }

        if (window.gameState.inventory.open) {
            renderInventoryMenu();
        }
        return; // Crucial: exit after handling floor item
    }
    // ... (The rest of the original interactInventoryItem function for other item types)

    logToConsole(`Interacting with: ${selectedDisplayItem.displayName}, Equipped: ${selectedDisplayItem.equipped}, Source: ${selectedDisplayItem.source}`);

    // --- BEGIN NEW CONSUMABLE LOGIC ---
    if (selectedDisplayItem.isConsumable && selectedDisplayItem.effects && !selectedDisplayItem.equipped) {
        let consumed = false;
        const maxNeeds = 24; // Assuming 24 is the max for hunger and thirst

        // Ensure playerHunger and playerThirst are initialized
        if (typeof window.gameState.playerHunger === 'undefined') window.gameState.playerHunger = maxNeeds;
        if (typeof window.gameState.playerThirst === 'undefined') window.gameState.playerThirst = maxNeeds;

        if (selectedDisplayItem.effects.hunger) {
            const hungerRestored = selectedDisplayItem.effects.hunger;
            window.gameState.playerHunger = Math.min(window.gameState.playerHunger + hungerRestored, maxNeeds);
            logToConsole(`Restored ${hungerRestored} hunger. Current hunger: ${window.gameState.playerHunger}/${maxNeeds}`);
            consumed = true;
        }
        if (selectedDisplayItem.effects.thirst) {
            const thirstRestored = selectedDisplayItem.effects.thirst;
            window.gameState.playerThirst = Math.min(window.gameState.playerThirst + thirstRestored, maxNeeds);
            logToConsole(`Restored ${thirstRestored} thirst. Current thirst: ${window.gameState.playerThirst}/${maxNeeds}`);
            consumed = true;
        }

        if (consumed) {
            logToConsole(`You consumed ${selectedDisplayItem.displayName}.`);
            removeItem(selectedDisplayItem.name); // This now uses window.gameState internally

            if (typeof window.updatePlayerStatusDisplay === 'function') {
                window.updatePlayerStatusDisplay();
            } else {
                logToConsole("Error: updatePlayerStatusDisplay function not found to update needs bars.");
            }

            if (window.gameState.inventory.open) { // Check window.gameState here
                renderInventoryMenu();
            }
            return; // Consumed, so no further action.
        }
    }
    // --- END NEW CONSUMABLE LOGIC ---

    // Existing logic for equipping/unequipping or describing items:
    if (selectedDisplayItem.equipped === true) {
        if (selectedDisplayItem.source === 'clothing' && selectedDisplayItem.originalLayer) {
            logToConsole(`Attempting to unequip ${selectedDisplayItem.displayName} from layer ${selectedDisplayItem.originalLayer}...`);
            unequipClothing(selectedDisplayItem.originalLayer); // This now uses window.gameState internally
        } else if (selectedDisplayItem.source === 'hand' && selectedDisplayItem.originalHandIndex !== undefined) {
            logToConsole(`Attempting to unequip ${selectedDisplayItem.displayName} from hand ${selectedDisplayItem.originalHandIndex + 1}...`);
            unequipItem(selectedDisplayItem.originalHandIndex); // This now uses window.gameState internally
        } else {
            logToConsole(`Cannot unequip ${selectedDisplayItem.displayName}: Unknown equipped source or missing data.`);
        }
    } else {
        if (selectedDisplayItem.isClothing) {
            logToConsole(`Attempting to wear ${selectedDisplayItem.displayName}...`);
            equipClothing(selectedDisplayItem.name); // This now uses window.gameState internally
        } else if (selectedDisplayItem.canEquip) {
            let handSlotToEquip = -1;
            if (!window.gameState.inventory.handSlots[0]) handSlotToEquip = 0;
            else if (!window.gameState.inventory.handSlots[1]) handSlotToEquip = 1;

            if (handSlotToEquip !== -1) {
                logToConsole(`Attempting to equip ${selectedDisplayItem.displayName} to hand ${handSlotToEquip + 1}...`);
                equipItem(selectedDisplayItem.name, handSlotToEquip); // This now uses window.gameState internally
            } else {
                logToConsole(`Both hands are full. Cannot equip ${selectedDisplayItem.displayName}.`);
            }
        } else {
            // If not consumable (already handled by new logic), not equippable, and not clothing, then describe.
            logToConsole(`You look at your ${selectedDisplayItem.displayName}: ${selectedDisplayItem.description || '(No description)'}`);
        }
    }

    // renderInventoryMenu and updateInventoryUI are called by equip/unequip/removeItem and the consumable logic path.
    // If execution reaches here, it means an equip/unequip action was taken, or an item was just described.
    // Equip/unequip functions call updateInventoryUI and renderCharacterInfo (which updates health, not inventory list).
    // The consumable path calls renderInventoryMenu if open.
    // For safety, if inventory is open, re-render menu. updateInventoryUI is generally handled by sub-functions.
    if (window.gameState.inventory.open) { // Check window.gameState here
        renderInventoryMenu();
    }
    // updateInventoryUI(); // This call is likely redundant as primary actions (equip, unequip, remove) handle it.
    // Removing it to avoid excessive UI updates. If issues arise, it can be reinstated.
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
if (typeof window.dropItem === 'undefined') {
    window.dropItem = dropItem;
}