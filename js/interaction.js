// js/interaction.js

const DOOR_OPEN_MAP = {
    "WDH": "WOH", "WDV": "WOV", "MDH": "MOH", "MDV": "MOV",
    "WinCH": "WinOH", "WinCV": "WinOV"
};

const DOOR_CLOSE_MAP = Object.fromEntries(
    Object.entries(DOOR_OPEN_MAP).map(([closed, open]) => [open, closed])
);

const DOOR_BREAK_MAP = {
    "WDH": "WDB", "WDV": "WDB", "WOH": "WDB", "WOV": "WDB",
    "MDH": "MDB", "MDV": "MDB", "MOH": "MDB", "MOV": "MDB",
    "WinCH": "WinB", "WinCV": "WinB", "WinOH": "WinB", "WinOV": "WinB"
};

// --- Internal Helper Functions ---
// (Prefixed with _ to indicate they are intended for internal use within this module)
function _getActionsForItem(it) {
    if (!assetManagerInstance || !assetManagerInstance.tilesets) { // Added check for tilesets
        console.error("Interaction module or assetManagerInstance.tilesets not ready for _getActionsForItem.");
        return ["Cancel"];
    }

    const tileDef = assetManagerInstance.tilesets[it.id];
    if (it.itemType !== 'npc' && it.itemType !== 'vehicle' && it.itemType !== 'construction_instance' && !tileDef) return ["Cancel"];

    const tags = tileDef ? tileDef.tags || [] : [];
    console.log(`_getActionsForItem: ID=${it.id}, Tags=${JSON.stringify(tags)}`);
    const actions = ["Cancel"];

    if (tags.includes("door") || tags.includes("window")) {
        if (tags.includes("closed")) actions.push("Open");
        if (tags.includes("open")) actions.push("Close");
        if (tags.includes("breakable")) actions.push("Break Down");
    }
    if (tags.includes("container")) {
        actions.push("Loot");
    }
    if (tags.includes("climbable")) {
        actions.push("Climb Up", "Climb Down");
    }
    if (window.fishingManager && window.fishingManager.isAdjacentToWater(window.gameState.playerPos) && window.fishingManager.getEquippedFishingPole(window.gameState)) {
        actions.push("Fish");
    }

    // Harvesting
    if (tags.includes("harvest:wood")) actions.push("Harvest Wood");
    if (tags.includes("harvest:stone")) actions.push("Mine Stone");
    if (tags.includes("harvest:plant")) actions.push("Harvest Plant");
    if (tags.includes("harvest:sand")) actions.push("Harvest Sand");
    if (tags.includes("harvest:mud")) actions.push("Harvest Mud");
    if (tags.includes("harvest:gravel")) actions.push("Harvest Gravel");

    // Scavenging
    if (tags.includes("scavenge:generic") || tags.includes("scavenge:junk")) actions.push("Scavenge");
    if (tags.includes("scavenge:furniture")) actions.push("Scavenge Furniture"); // Or just "Scavenge" if generic is preferred
    if (tags.includes("scavenge:machinery")) actions.push("Scavenge Machinery");
    if (tags.includes("scavenge:electronics")) actions.push("Scavenge Electronics");
    if (tags.includes("scavenge:appliance")) actions.push("Scavenge Appliance");
    if (tags.includes("scavenge:glass")) actions.push("Scavenge Glass");

    // Butchery
    if (it.itemType === "corpse") {
        actions.push("Butcher");
    }

    // Added for traps
    if (it.itemType === "trap" && it.trapState === "detected") {
        actions.push("Examine Trap", "Attempt to Disarm");
    }
    // Added for vehicles
    if (it.itemType === "vehicle") {
        console.log(`_getActionsForItem: Detected itemType "vehicle". Item ID: ${it.id}, Item Name: ${it.name}`);
        const playerInThisVehicle = window.gameState && window.gameState.player && window.gameState.player.isInVehicle === it.id;
        console.log(`_getActionsForItem: playerInThisVehicle check for ${it.id}: ${playerInThisVehicle} (Player in vehicle: ${window.gameState?.player?.isInVehicle})`);
        if (playerInThisVehicle) {
            actions.push("Exit Vehicle");
        } else {
            actions.push("Enter Vehicle");
        }
        actions.push("Access Cargo", "Refuel", "Repair Parts", "Modify Parts");
    } else if (it.name && (it.name.toLowerCase().includes("buggy") || it.name.toLowerCase().includes("cart"))) {
        // Fallback logging if itemType is not "vehicle" but name suggests it might be one
        console.log(`_getActionsForItem: itemType is NOT "vehicle" (${it.itemType}), but name is suspicious: ${it.name}, ID: ${it.id}`);
    }
    // Added for NPCs (potential companions)
    if (it.itemType === "npc") {
        actions.push("Talk"); // Default talk action
        if (window.companionManager && window.companionManager.isCompanion(it.id)) {
            actions.push("Orders", "Dismiss");
            // "Talk (Companion)" could be a specific dialogue branch triggered from default "Talk"
        }
        // Recruitment is handled via dialogue initiated by "Talk"
    }
    // Added for Placed Constructions
    if (it.itemType === "construction_instance") { // Changed from "construction" to avoid conflict with build menu item type
        const structureInstance = window.constructionManager ? window.constructionManager.getStructureByUniqueId(it.id) : null;
        if (structureInstance && structureInstance.definition) {
            const def = structureInstance.definition;
            actions.push("Examine");
            if (def.stationType) {
                actions.push(`Use ${def.name}`);
            }
            if (def.category === "resource_production") {
                if (structureInstance.internalStorage && structureInstance.internalStorage.some(s => s.quantity > 0)) {
                    actions.push("Collect Resources");
                }
                if (def.requiresInputItemId) {
                    actions.push("Add Input"); // Simple for now, UI would list what input
                }
            }
            if (def && def.tags && def.tags.includes("defensive_structure")) {
                // Example actions for a defensive structure
                if (structureInstance.isActive) { // Assuming an 'isActive' state property
                    actions.push("Deactivate");
                } else {
                    actions.push("Activate");
                }
                actions.push("Reload Ammo"); // Assumes it might need ammo
                actions.push("Repair Structure"); // Generic repair
            }
            actions.push("Dismantle"); // Placeholder
        }
    }
    return actions;
}

function _performAction(action, it) {
    const { x, y, z, id, itemType } = it; // 'it' now contains x, y, z, id, name, itemType
    // tileDef is primarily for map tiles. For NPCs/Vehicles/Constructions, 'id' is their instance ID.
    const tileDef = (itemType === "tile" || itemType === "door" || itemType === "container" || itemType === "trap")
        ? assetManagerInstance.tilesets[id]
        : null;

    const currentMap = window.mapRenderer.getCurrentMapData();
    if (!currentMap || !currentMap.levels) {
        logToConsole("Error: Map data or levels not found for _performAction.");
        return;
    }

    const zStr = z.toString();
    const levelData = currentMap.levels[zStr];
    if (!levelData || !levelData.middle) { // Assuming doors/interactables that change state are on 'middle'
        logToConsole(`Error: Level data or middle layer not found for Z-level ${z} at (${x},${y}) to perform action.`);
        return;
    }

    // Get the actual tile ID from the map (it might be an object)
    // For state changes like opening/closing doors, these are typically on the 'middle' or 'building' layer.
    // If interactable items on the 'bottom' layer were to change their tile ID, this logic would need
    // to know the source layer of the interaction. For now, 'middle' is the primary target for such changes.
    let tileOnMapRaw = levelData.middle[y]?.[x];
    let targetLayerForStateChange = 'middle'; // Default layer to modify for state changes

    // If the itemType suggests it might be a 'building' layer item (e.g. some constructions)
    // and 'middle' is empty, consider 'building'. This is a heuristic.
    // A more robust system would store the sourceLayer with the interactable item.
    if ((!tileOnMapRaw || tileOnMapRaw === "") && (itemType === "construction_instance" || itemType === "door")) { // Doors can also be on building
        tileOnMapRaw = levelData.building?.[y]?.[x];
        if (tileOnMapRaw && tileOnMapRaw !== "") {
            targetLayerForStateChange = 'building';
            logToConsole(`Interaction: Action '${action}' on '${id}' will target 'building' layer.`, 'debug');
        }
    }

    let currentTileIdOnMap = (typeof tileOnMapRaw === 'object' && tileOnMapRaw !== null && tileOnMapRaw.tileId !== undefined)
        ? tileOnMapRaw.tileId
        : tileOnMapRaw;

    // it.id is the ID of the tile definition (e.g., "WDH"). 
    // currentTileIdOnMap is what's currently on the map at that x,y,z on the targetLayerForStateChange.
    // For state changes (like opening a door), currentTileIdOnMap is what we compare against DOOR_OPEN_MAP etc.
    // And it.id (the definition ID) is used for getting the name.

    if (!currentTileIdOnMap && action !== "Cancel" && (targetLayerForStateChange === 'middle' || targetLayerForStateChange === 'building')) {
        // Only error if we expected something on middle/building and it's not there.
        // Actions on vehicles, NPCs, etc., don't rely on currentTileIdOnMap from these layers.
        if (itemType === "door" || itemType === "container" || (itemType === "construction_instance" && tileDef && tileDef.tags && tileDef.tags.includes("door_like"))) { // Check if action was on a map tile based item
            logToConsole(`Error: No tile found on ${targetLayerForStateChange} layer at (${x},${y}, Z:${z}) to perform action '${action}'. Expected tile around ID: ${id}`);
            return;
        }
    }

    if (!assetManagerInstance || !assetManagerInstance.tilesets) { // Added check for tilesets
        console.error("Interaction module or assetManagerInstance.tilesets not ready for _performAction.");
        return;
    }
    const tileName = assetManagerInstance.tilesets[id]?.name || id; // Use 'id' from 'it' for the base name

    // Actions that modify the map state or game state
    if (itemType === "vehicle") {
        const vehicle = window.vehicleManager ? window.vehicleManager.getVehicleById(it.id) : null;
        if (!vehicle) {
            logToConsole(`Error: Vehicle with ID ${it.id} not found for action: ${action}.`, "error");
            return;
        }

        if (action === "Enter Vehicle") {
            if (window.gameState.player.isInVehicle) {
                logToConsole("You are already in a vehicle.", "warn");
                // Potentially decrement AP if an error sound played and action was 'wasted'
                // For now, action points are decremented before this function in performSelectedAction if not "Cancel"
                // We might need to refund AP if an action is invalid like this.
                // For simplicity, let's assume the UI prevents "Enter Vehicle" if already in one,
                // or this is a no-op that still costs AP.
            } else {
                window.gameState.player.isInVehicle = vehicle.id;
                // Player's individual map presence (sprite) will be handled by render logic
                logToConsole(`Entered ${vehicle.name}.`, "info");
                if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav'); // TODO: Play vehicle_enter_01.wav when available
            }
        } else if (action === "Exit Vehicle") {
            if (window.gameState.player.isInVehicle === vehicle.id) {
                window.gameState.player.isInVehicle = null;
                // Player should reappear at vehicle's current position or an adjacent valid tile.
                // For now, assume player reappears at vehicle.mapPos.
                // The turnManager.move function handles setting playerPos.
                // Here, we just update the state; rendering will reflect it.
                // If vehicle is moving, player exits at its current location.
                window.gameState.playerPos = { ...vehicle.mapPos };
                logToConsole(`Exited ${vehicle.name}. You are now at (${vehicle.mapPos.x}, ${vehicle.mapPos.y}, ${vehicle.mapPos.z})`, "info");
                if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav'); // TODO: Play vehicle_exit_01.wav when available
            } else {
                logToConsole("You are not in this vehicle to exit.", "warn");
            }
        } else if (action === "Access Cargo") {
            // TODO: Implement a dedicated Vehicle Cargo UI. For now, log and do nothing functional.
            logToConsole(`Accessing cargo of ${vehicle.name}... (Dedicated Vehicle Cargo UI to be implemented).`, "info");
            if (window.uiManager && typeof window.uiManager.openVehicleCargoUI === 'function') { // Check if a generic UI manager exists
                // window.uiManager.openVehicleCargoUI(vehicle.id); // This function does not exist yet
            } else {
                logToConsole("No dedicated Vehicle Cargo UI or generic UIManager to handle this yet.", "warn");
            }
        } else if (action === "Refuel") {
            // TODO: Implement UI to select fuel item from player inventory.
            // For now, simulate attempting to use a generic "gas_can" if player has one.
            logToConsole(`Attempting to refuel ${vehicle.name}...`, "info");
            if (window.inventoryManager && window.inventoryManager.hasItem("gas_can_fuel", 1)) { // Assuming "gas_can_fuel" item ID
                if (window.vehicleManager && window.vehicleManager.refuelVehicle(vehicle.id, 20, "gas_can_fuel")) { // Assuming gas can gives 20 fuel
                    window.inventoryManager.removeItems("gas_can_fuel", 1, window.gameState.inventory.container.items);
                    logToConsole("Refueled with a gas can.", "event-success");
                    if (window.inventoryManager && window.inventoryManager.updateInventoryUI) window.inventoryManager.updateInventoryUI();
                } else {
                    logToConsole("Refuel failed (e.g., tank full or vehicleManager error).", "warn");
                }
            } else {
                logToConsole("No gas can in inventory to refuel.", "orange");
            }
        } else if (action === "Repair Parts" || action === "Modify Parts") {
            logToConsole(`Opening modification/repair interface for ${vehicle.name}...`, "info");
            if (window.VehicleModificationUI && typeof window.VehicleModificationUI.toggle === 'function') {
                window.VehicleModificationUI.toggle(vehicle.id); // toggle will open if closed
            } else {
                logToConsole("VehicleModificationUI not available.", "warn");
            }
        }
        // Note: AP cost for vehicle actions is handled by the caller (performSelectedAction)

    } else if (itemType === "construction_instance") {
        const structure = window.constructionManager ? window.constructionManager.getStructureByUniqueId(it.id) : null;
        if (!structure || !structure.definition) {
            logToConsole(`Error: Placed structure with ID ${it.id} or its definition not found.`, "error");
            return;
        }
        const def = structure.definition;

        if (action === `Use ${def.name}` && def.stationType) {
            if (window.CraftingUI && typeof window.CraftingUI.open === 'function') {
                logToConsole(`Using crafting station: ${def.name} (Type: ${def.stationType})`, "info");
                window.CraftingUI.open(def.stationType); // Pass station type to filter recipes
            } else {
                logToConsole(`CraftingUI not available to use station ${def.name}.`, "warn");
            }
        } else if (action === "Collect Resources") {
            if (window.constructionManager) {
                window.constructionManager.collectFromResourceProducer(it.id);
            }
        } else if (action === "Add Input") {
            // This would ideally open a small UI to select which item from player inventory to add.
            // For now, let's assume a default valid input item if the structure requires one.
            if (def.requiresInputItemId) {
                logToConsole(`Attempting to add input to ${def.name}. Needs: ${def.requiresInputItemId}. (UI for item selection TBD)`, "info");
                // Simulate player having the item and choosing to add one.
                // Actual item consumption from player inv needs to happen here.
                // For now, just call the manager.
                if (window.inventoryManager && window.inventoryManager.hasItem(def.requiresInputItemId, 1)) {
                    // if (window.inventoryManager.removeItems(def.requiresInputItemId, 1)) { // Consume from player
                    if (window.constructionManager) window.constructionManager.addInputToResourceProducer(it.id, def.requiresInputItemId, 1);
                    // } else { logToConsole("Failed to remove input item from player inventory.", "orange");}
                } else {
                    logToConsole(`Player does not have ${def.requiresInputItemId} to add as input.`, "orange");
                }
            } else {
                logToConsole(`${def.name} does not require inputs.`, "info");
            }
        } else if (action === "Examine") {
            logToConsole(`Examining ${def.name}: ${def.description || 'A constructed object.'} (HP: ${structure.currentHealth}/${structure.maxHealth})`, "info");
            if (structure.internalStorage && structure.definition.category === "resource_production") {
                if (structure.internalStorage.length > 0) {
                    structure.internalStorage.forEach(stored => {
                        const itemDef = window.assetManager.getItem(stored.itemId);
                        logToConsole(`  Contains: ${stored.quantity}x ${itemDef ? itemDef.name : stored.itemId}`, "info");
                    });
                } else {
                    logToConsole("  Storage is empty.", "info");
                }
            }
        } else if (action === "Dismantle") {
            logToConsole(`Dismantling ${def.name}... (Not implemented yet - would return some materials)`, "info");
            // TODO: Implement constructionManager.dismantleStructure(it.id);
            // This would remove from mapStructures, clear map tile, return some % of components.
        }
        // AP cost for construction interactions is handled by performSelectedAction caller

    } else if (itemType === "npc") {
        const npc = window.gameState.npcs.find(n => n.id === it.id);
        if (!npc) {
            logToConsole(`Error: NPC with ID ${it.id} not found for action: ${action}.`, "error");
            return;
        }

        if (action === "Talk") {
            if (window.dialogueManager) {
                let dialogueNodeToStart = null;
                const npcDef = window.assetManager.getNpc(npc.definitionId);

                if (window.companionManager && window.companionManager.isCompanion(npc.id) && npcDef && npcDef.dialogue_following_generic) {
                    dialogueNodeToStart = npcDef.dialogue_following_generic;
                    // If dialogueManager's startDialogue can take a specific start node ID, use it.
                    // Otherwise, it might need a way to specify starting node for an existing dialogue file.
                    // For now, assume startDialogue handles it or we adapt it.
                    logToConsole(`Talking to companion ${npc.name} (Node: ${dialogueNodeToStart || 'default start'})`, "info", "dev");
                    window.dialogueManager.startDialogue(npc, dialogueNodeToStart); // Pass specific node if applicable
                } else {
                    // Standard talk, dialogue manager will pick appropriate start node (e.g. default, quest-related)
                    logToConsole(`Talking to ${npc.name}.`, "info");
                    window.dialogueManager.startDialogue(npc);
                }
            } else {
                logToConsole(`DialogueManager not available. Cannot talk to ${npc.name}.`, "warn");
            }
        } else if (action === "Orders") {
            if (window.companionManager && window.companionManager.isCompanion(npc.id)) {
                // Basic cycle orders for now
                const orders = ["follow_close", "wait_here", "attack_aggressively"]; // Example cycle
                let currentOrderIndex = orders.indexOf(npc.currentOrders);
                if (currentOrderIndex === -1) currentOrderIndex = 0; // Default to first if unknown
                const nextOrderIndex = (currentOrderIndex + 1) % orders.length;
                window.companionManager.setCompanionOrder(npc.id, orders[nextOrderIndex]);
                if (window.renderCharacterInfo) window.renderCharacterInfo(); // Update companion list in UI
            } else {
                logToConsole(`Cannot give orders to ${npc.name}, not a companion.`, "warn");
            }
        } else if (action === "Dismiss") {
            if (window.companionManager && window.companionManager.isCompanion(npc.id)) {
                window.companionManager.dismissCompanion(npc.id);
                if (window.renderCharacterInfo) window.renderCharacterInfo(); // Update companion list
                // Optionally, trigger dismiss dialogue
                const npcDef = window.assetManager.getNpc(npc.definitionId);
                if (npcDef && npcDef.dialogue_dismiss_node && window.dialogueManager) {
                    logToConsole(`Starting dismiss dialogue with ${npc.name}.`, "info", "dev");
                    // Assuming startDialogue can take a specific node from the NPC's default dialogue file.
                    // This might require dialogueManager to load the NPC's dialogue file first, then go to node.
                    // window.dialogueManager.startDialogue(npc, npcDef.dialogue_dismiss_node);
                    // For simplicity, let's assume dismiss just happens, dialogue can be added later.
                }
            } else {
                logToConsole(`Cannot dismiss ${npc.name}, not a companion.`, "warn");
            }
        }
        // AP cost for NPC interactions handled by performSelectedAction caller

    } else if (action === "Open" && DOOR_OPEN_MAP[currentTileIdOnMap]) {
        levelData.middle[y][x] = DOOR_OPEN_MAP[currentTileIdOnMap];
        logToConsole(`Opened ${tileName}`);
    } else if (action === "Close" && DOOR_CLOSE_MAP[currentTileIdOnMap]) {
        levelData.middle[y][x] = DOOR_CLOSE_MAP[currentTileIdOnMap];
        logToConsole(`Closed ${tileName}`);
    } else if (action === "Break Down" && DOOR_BREAK_MAP[currentTileIdOnMap]) {
        levelData.middle[y][x] = DOOR_BREAK_MAP[currentTileIdOnMap];
        logToConsole(`Broke ${tileName}`);
    } else if (action === "Loot") {
        // Get tile definition to check its tags
        // Note: tileDef was already fetched if itemType is tile/door/container/trap.
        // If it's another itemType, tileDef would be null here.
        const tileDefForLoot = tileDef || assetManagerInstance.tilesets[it.id];

        if (tileDefForLoot && tileDefForLoot.tags && tileDefForLoot.tags.includes("container")) {
            // The logic to show container contents is now handled by the inventory menu itself.
            // This action simply serves to indicate interaction, perhaps opening the inventory if it's closed.
            logToConsole(`You check the ${tileName}. Its contents are now visible in your inventory screen.`);

            // If the inventory is not open, open it.
            if (!window.gameState.inventory.open) {
                if (window.inventoryManager && typeof window.inventoryManager.toggleInventoryMenu === 'function') {
                    window.inventoryManager.toggleInventoryMenu();
                }
            } else {
                // If it's already open, just re-render to ensure the nearby container is shown.
                if (window.inventoryManager && typeof window.inventoryManager.renderInventoryMenu === 'function') {
                    window.inventoryManager.renderInventoryMenu();
                }
            }
        } else {
            // Fallback for "Loot" on a non-container (should not happen with current action generation)
            logToConsole(`You can't loot the ${tileName}.`);
        }
    } else if (action === "Climb Up") {
        if (tileDef && tileDef.tags && tileDef.tags.includes("climbable")) {
            const targetZ = z + 1; // Ladders typically go up by 1 Z-level
            // Precondition: Tile above player's current position must be empty.
            // Player's current position is gameState.playerPos.x, gameState.playerPos.y, gameState.playerPos.z
            // The tile to check is (playerX, playerY, playerZ + 1)
            // Note: 'z' here is the Z-level of the interactable tile (e.g., the ladder base).
            // The player is standing at (gameState.playerPos.x, gameState.playerPos.y, z) to interact with it.
            const spaceAbovePlayerX = gameState.playerPos.x;
            const spaceAbovePlayerY = gameState.playerPos.y;
            const spaceAbovePlayerZ = gameState.playerPos.z + 1;

            let isSpaceAbovePlayerObstructed = true; // Assume obstructed initially

            // Check if the space above the player is another climbable tile
            const mapDataForAboveCheck = window.mapRenderer.getCurrentMapData();
            let tileAbovePlayerDef = null;
            if (mapDataForAboveCheck && mapDataForAboveCheck.levels[spaceAbovePlayerZ.toString()]) {
                const levelAbovePlayerData = mapDataForAboveCheck.levels[spaceAbovePlayerZ.toString()];
                // Check middle layer first, then bottom, for a climbable tile
                let tileIdAbovePlayerRaw = levelAbovePlayerData.middle?.[spaceAbovePlayerY]?.[spaceAbovePlayerX] || levelAbovePlayerData.bottom?.[spaceAbovePlayerY]?.[spaceAbovePlayerX];
                let tileIdAbovePlayer = (typeof tileIdAbovePlayerRaw === 'object' && tileIdAbovePlayerRaw !== null && tileIdAbovePlayerRaw.tileId !== undefined)
                    ? tileIdAbovePlayerRaw.tileId
                    : tileIdAbovePlayerRaw;

                if (tileIdAbovePlayer && assetManagerInstance && assetManagerInstance.tilesets) {
                    tileAbovePlayerDef = assetManagerInstance.tilesets[tileIdAbovePlayer];
                }
            }

            if (tileAbovePlayerDef && tileAbovePlayerDef.tags && tileAbovePlayerDef.tags.includes('climbable')) {
                // If the space above is another part of a ladder/climbable structure, it's not considered obstructed for this check.
                isSpaceAbovePlayerObstructed = false;
                logToConsole(`Space above player is another climbable tile ('${tileAbovePlayerDef.name}'), proceeding with climb check.`);
            } else if (window.mapRenderer.isTileEmpty(spaceAbovePlayerX, spaceAbovePlayerY, spaceAbovePlayerZ)) {
                // If not a climbable tile, check if it's generally empty.
                isSpaceAbovePlayerObstructed = false;
            }

            if (isSpaceAbovePlayerObstructed) {
                logToConsole(`Cannot climb up: The space directly above you (at X:${spaceAbovePlayerX} Y:${spaceAbovePlayerY} Z:${spaceAbovePlayerZ}) is not empty or part of a continued climbable path.`);
                return; // Abort climb
            }

            // Check if the destination tile itself at (x,y,targetZ) is walkable.
            // 'x' and 'y' are the coordinates of the ladder tile.
            if (window.mapRenderer.isWalkable(x, y, targetZ)) {
                gameState.playerPos = { x: x, y: y, z: targetZ }; // Player moves to the ladder's X,Y at the new Z
                if (gameState.viewFollowsPlayerZ) gameState.currentViewZ = targetZ;
                if (window.audioManager) window.audioManager.playClimbSound();
                logToConsole(`Climbed up the ${tileName} to Z:${targetZ}.`);
            } else {
                logToConsole(`Cannot climb up: The destination space at the top of the ${tileName} (X:${x}, Y:${y}, Z:${targetZ}) is blocked or not walkable.`);
                // TODO: Play ui_error_01.wav for failed climb attempt?
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            }
        }
    } else if (action === "Climb Down") {
        if (tileDef && tileDef.tags && tileDef.tags.includes("climbable")) {
            const targetZ = z - 1; // Ladders typically go down by 1 Z-level
            // Check if the destination is walkable
            if (window.mapRenderer.isWalkable(x, y, targetZ)) {
                gameState.playerPos = { x: x, y: y, z: targetZ };
                if (gameState.viewFollowsPlayerZ) gameState.currentViewZ = targetZ;
                if (window.audioManager) window.audioManager.playClimbSound();
                logToConsole(`Climbed down the ${tileName} to Z:${targetZ}.`);
            } else {
                logToConsole(`Cannot climb down: The space below (Z:${targetZ}) is blocked or not walkable.`);
                // TODO: Play ui_error_01.wav for failed climb attempt?
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
            }
        }
    } else if (action === "Examine Trap" && it.itemType === "trap") {
        if (window.trapManager) {
            const trapDef = window.trapManager.getTrapDefinition(it.id); // it.id is trapDefId
            if (trapDef && trapDef.description) {
                logToConsole(`Examining ${it.name}: ${trapDef.description}`, 'info');
                if (window.uiManager) window.uiManager.showToastNotification(trapDef.description, 'info', 4000);
            } else {
                logToConsole(`No detailed description for ${it.name}.`, 'info');
            }
        }
        // Examining does not cost AP
    } else if (action === "Attempt to Disarm" && it.itemType === "trap") {
        if (gameState.actionPointsRemaining > 0) {
            if (window.trapManager) {
                logToConsole(`Player attempts to disarm ${it.name} (ID: ${it.uniqueTrapId}). AP Cost: 1.`, 'event');
                window.trapManager.attemptDisarmTrap(it.uniqueTrapId, gameState); // Pass player (gameState)
                gameState.actionPointsRemaining--;
                if (window.turnManager) window.turnManager.updateTurnUI();
            } else {
                logToConsole("Error: TrapManager not available to attempt disarm.", "red");
            }
        } else {
            logToConsole("Not enough Action Points to attempt disarm.", "orange");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        }
    } else if (action === "Fish") {
        if (window.fishingManager) {
            window.fishingManager.startFishing(window.gameState);
        }
    } else if (action === "Harvest Wood" || action === "Mine Stone" || action === "Scavenge" || action === "Butcher" ||
               action === "Harvest Plant" || action === "Harvest Sand" || action === "Harvest Mud" || action === "Harvest Gravel" ||
               action === "Scavenge Furniture" || action === "Scavenge Machinery" || action === "Scavenge Electronics" ||
               action === "Scavenge Appliance" || action === "Scavenge Glass") {
        if (window.harvestManager) {
            window.harvestManager.attemptHarvest(action, it, window.gameState);
        } else {
            console.error("HarvestManager not initialized.");
        }
    }


    window.mapRenderer.scheduleRender();
    window.interaction.detectInteractableItems();
    window.interaction.showInteractableItems();
    window.mapRenderer.updateMapHighlight();
}


// --- Public API via window.interaction ---
window.interaction = {
    initInteraction: function (assetMgr) {
        console.log("Attempting to initialize Interaction system's assetManagerInstance.");
        if (assetMgr) {
            assetManagerInstance = assetMgr;
            console.log("Interaction system's assetManagerInstance has been SET.", assetManagerInstance);
            if (assetManagerInstance && typeof assetManagerInstance.getTileset === 'function') {
                console.log("assetManagerInstance appears to be a valid AssetManager.");
            } else {
                console.error("assetManagerInstance was set, but it does NOT look like a valid AssetManager.", assetManagerInstance);
            }
        } else {
            console.error("Interaction system initInteraction called WITHOUT an AssetManager. assetManagerInstance remains null.");
        }
    },

    detectInteractableItems: function () {
        const R = 1; // Interaction radius
        const playerPos = window.gameState.playerPos; // Ensure using window.gameState

        if (!playerPos || typeof playerPos.x !== 'number' || typeof playerPos.y !== 'number' || typeof playerPos.z !== 'number') {
            window.gameState.interactableItems = [];
            return;
        }

        const { x: px, y: py, z: pz } = playerPos;
        window.gameState.interactableItems = []; // Ensure using window.gameState

        const currentMap = window.mapRenderer.getCurrentMapData();
        if (!currentMap || !currentMap.levels || !currentMap.dimensions) {
            // console.warn("detectInteractableItems: Map data is invalid or incomplete.");
            return;
        }

        // Ensure assetManagerInstance is the global one from script.js or properly passed
        if (!window.assetManagerInstance && !assetManagerInstance) { // Check both local and window scope
            console.error("AssetManagerInstance not available in detectInteractableItems. AssetManager might not be globally exposed or passed correctly.");
            logToConsole("Interaction Error: AssetManager not available for item detection.", "error");
            return;
        }
        const currentAssetManager = window.assetManagerInstance || assetManagerInstance;


        if (!currentAssetManager || typeof currentAssetManager.getTileset !== 'function') {
            console.error("Interaction module's assetManagerInstance is not valid for detectInteractableItems.");
            return;
        }

        const mapHeight = currentMap.dimensions.height;
        const mapWidth = currentMap.dimensions.width;
        const currentZ = pz; // Interact on the player's current Z level
        const zStr = currentZ.toString();
        const levelData = currentMap.levels[zStr];

        if (!levelData) {
            // console.warn(`detectInteractableItems: No level data for Z-level ${currentZ}.`);
            return;
        }

        for (let y_scan = Math.max(0, py - R); y_scan <= Math.min(mapHeight - 1, py + R); y_scan++) {
            for (let x_scan = Math.max(0, px - R); x_scan <= Math.min(mapWidth - 1, px + R); x_scan++) {
                let tileIdFromMap = null;
                let sourceLayer = null; // To help debug or prioritize if needed

                // Prioritize 'middle' layer for interactables like doors, containers
                if (levelData.middle?.[y_scan]?.[x_scan]) {
                    tileIdFromMap = levelData.middle[y_scan][x_scan];
                    sourceLayer = 'middle';
                }
                // If nothing on 'middle', check 'bottom' (e.g., for items on the floor)
                else if (levelData.bottom?.[y_scan]?.[x_scan]) {
                    tileIdFromMap = levelData.bottom[y_scan][x_scan];
                    sourceLayer = 'bottom';
                }

                if (!tileIdFromMap) continue;

                const baseTileId = (typeof tileIdFromMap === 'object' && tileIdFromMap !== null && tileIdFromMap.tileId !== undefined)
                    ? tileIdFromMap.tileId
                    : tileIdFromMap;

                if (!baseTileId) continue;

                const tileDef = currentAssetManager.tilesets[baseTileId];

                if (tileDef && tileDef.tags &&
                    (tileDef.tags.includes("interactive") || tileDef.tags.includes("door") || tileDef.tags.includes("container"))) {
                    const alreadyExists = window.gameState.interactableItems.some(item => item.x === x_scan && item.y === y_scan && item.z === currentZ && item.id === baseTileId && item.itemType !== "vehicle" && item.itemType !== "npc");
                    if (!alreadyExists) {
                        window.gameState.interactableItems.push({
                            x: x_scan, y: y_scan, z: currentZ, id: baseTileId,
                            name: tileDef.name || baseTileId,
                            itemType: tileDef.tags.includes("container") ? "container" : (tileDef.tags.includes("door") ? "door" : "tile")
                        });
                    }
                }
            }
        }

        // Detect NPCs
        if (window.gameState && window.gameState.npcs) {
            window.gameState.npcs.forEach(npc => {
                if (npc.mapPos && npc.mapPos.z === currentZ && npc.health && npc.health.torso.current > 0) { // Check if NPC is alive
                    const dist = Math.max(Math.abs(npc.mapPos.x - px), Math.abs(npc.mapPos.y - py));
                    if (dist <= R) {
                        const alreadyExists = window.gameState.interactableItems.some(item => item.id === npc.id && item.itemType === "npc");
                        if (!alreadyExists) {
                            window.gameState.interactableItems.push({
                                x: npc.mapPos.x, y: npc.mapPos.y, z: npc.mapPos.z,
                                id: npc.id, // NPC's unique instance ID
                                name: npc.name || "NPC",
                                itemType: "npc",
                                definitionId: npc.definitionId // Store definitionId for easier lookup of base properties
                            });
                        }
                    }
                }
            });
        }

        // Detect Vehicles
        if (window.gameState && window.gameState.vehicles) {
            console.log(`detectInteractableItems: Starting vehicle detection. Player at (${px},${py},${pz}). Interaction Radius R=${R}`);
            window.gameState.vehicles.forEach(vehicle => {
                console.log(`detectInteractableItems: Checking vehicle ID: ${vehicle.id}, Name: ${vehicle.name}, MapID: ${vehicle.currentMapId}, Pos: (${vehicle.mapPos?.x},${vehicle.mapPos?.y},${vehicle.mapPos?.z})`);
                if (vehicle.currentMapId === currentMap.id && vehicle.mapPos && vehicle.mapPos.z === currentZ) {
                    const dist = Math.max(Math.abs(vehicle.mapPos.x - px), Math.abs(vehicle.mapPos.y - py));
                    console.log(`detectInteractableItems: Vehicle ${vehicle.id} is on current map/Z. Calculated distance to player: ${dist}`);
                    if (dist <= R) {
                        console.log(`detectInteractableItems: Vehicle ${vehicle.id} IS nearby (dist ${dist} <= R ${R}).`);
                        const alreadyExists = window.gameState.interactableItems.some(item => item.id === vehicle.id && item.itemType === "vehicle");
                        if (!alreadyExists) {
                            const itemToAdd = {
                                x: vehicle.mapPos.x, y: vehicle.mapPos.y, z: vehicle.mapPos.z,
                                id: vehicle.id, name: vehicle.name || "Vehicle", itemType: "vehicle"
                            };
                            window.gameState.interactableItems.push(itemToAdd);
                            console.log(`detectInteractableItems: ADDED vehicle to interactableItems:`, JSON.parse(JSON.stringify(itemToAdd)));
                        } else {
                            console.log(`detectInteractableItems: Vehicle ${vehicle.id} already in interactableItems.`);
                        }
                    } else {
                        console.log(`detectInteractableItems: Vehicle ${vehicle.id} is NOT nearby (dist ${dist} > R ${R}).`);
                    }
                } else {
                    let reason = "";
                    if (vehicle.currentMapId !== currentMap.id) reason += `Not on current map (Vehicle map: ${vehicle.currentMapId}, Current map: ${currentMap.id}). `;
                    if (!vehicle.mapPos) reason += `Vehicle has no mapPos. `;
                    else if (vehicle.mapPos.z !== currentZ) reason += `Not on current Z (Vehicle Z: ${vehicle.mapPos.z}, Current Z: ${currentZ}).`;
                    console.log(`detectInteractableItems: SKIPPING vehicle ${vehicle.id}. Reason: ${reason.trim()}`);
                }
            });
        } else {
            console.log("detectInteractableItems: No gameState.vehicles array found to iterate.");
        }

        // Detect Placed Constructions
        if (window.gameState && window.gameState.mapStructures) {
            window.gameState.mapStructures.forEach(structure => {
                // Assuming structure.x, structure.y, structure.z are the origin of the structure
                // For multi-tile structures, interaction might only be with the origin tile or any part of it.
                // For simplicity, check interaction with origin.
                if (structure.z === currentZ) {
                    const dist = Math.max(Math.abs(structure.x - px), Math.abs(structure.y - py));
                    if (dist <= R) {
                        const alreadyExists = window.gameState.interactableItems.some(item => item.id === structure.uniqueId && item.itemType === "construction_instance");
                        if (!alreadyExists) {
                            const def = window.constructionManager?.constructionDefinitions[structure.constructionId];
                            window.gameState.interactableItems.push({
                                x: structure.x, y: structure.y, z: structure.z,
                                id: structure.uniqueId, // Use uniqueId for the instance
                                name: def ? def.name : "Constructed Object",
                                itemType: "construction_instance" // Specific type for placed constructions
                            });
                        }
                    }
                }
            });
        }


        // Add detected traps
        if (window.trapManager && typeof window.trapManager.getTrapAt === 'function') {
            for (let y_trap = Math.max(0, py - R); y_trap <= Math.min(mapHeight - 1, py + R); y_trap++) {
                for (let x_trap = Math.max(0, px - R); x_trap <= Math.min(mapWidth - 1, px + R); x_trap++) {
                    const dx_trap = x_trap - px; const dy_trap = y_trap - py;
                    if (Math.sqrt(dx_trap * dx_trap + dy_trap * dy_trap) <= R) {
                        const trapInstance = window.trapManager.getTrapAt(x_trap, y_trap, currentZ);
                        if (trapInstance && trapInstance.state === "detected") {
                            const trapDef = window.trapManager.getTrapDefinition(trapInstance.trapDefId);
                            if (trapDef) {
                                const trapAlreadyListed = window.gameState.interactableItems.some(item => item.x === x_trap && item.y === y_trap && item.z === currentZ && item.uniqueTrapId === trapInstance.uniqueId);
                                if (!trapAlreadyListed) {
                                    window.gameState.interactableItems.push({
                                        x: x_trap, y: y_trap, z: currentZ, id: trapInstance.trapDefId,
                                        name: trapDef.name, itemType: "trap",
                                        uniqueTrapId: trapInstance.uniqueId, trapState: trapInstance.state
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        // console.log("Interactable items detected (incl. traps):", gameState.interactableItems);
    },

    showInteractableItems: function () {
        const list = document.getElementById("itemList");
        if (!list) return;
        list.innerHTML = "";

        if (!assetManagerInstance) {
            console.error("Interaction module not initialized with AssetManager for showInteractableItems.");
            return;
        }

        gameState.interactableItems.forEach((it, idx) => {
            const div = document.createElement("div");
            let displayName = it.name; // Use the name property directly if it exists
            if (!displayName) { // Fallback for items that might not have had .name set (older saves, other code paths)
                const tileDef = assetManagerInstance.tilesets[it.id];
                displayName = tileDef ? tileDef.name : it.id;
            }
            div.textContent = `${idx + 1}. ${displayName}`;

            if (idx === gameState.selectedItemIndex) {
                div.classList.add("selected");
            }
            div.onclick = () => window.interaction.selectItem(idx);
            list.appendChild(div);
        });
    },

    selectItem: function (idx) {
        if (idx >= 0 && gameState.interactableItems && idx < gameState.interactableItems.length) {
            gameState.selectedItemIndex = idx;
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.5 }); // Placeholder for ui_select_01.wav
            this.showInteractableItems();
            window.mapRenderer.updateMapHighlight(); // Assumes mapRenderer is global
        }
    },

    selectAction: function (number) {
        const actionList = document.getElementById('actionList');
        if (!actionList) return;
        const actions = actionList.children;
        if (number >= 0 && number < actions.length) {
            gameState.selectedActionIndex = number;
            if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.5 }); // Placeholder for ui_select_01.wav
            Array.from(actions).forEach((action, index) => {
                action.classList.toggle('selected', index === gameState.selectedActionIndex);
            });
        }
    },

    interact: function () {
        if (gameState.selectedItemIndex === -1 ||
            !gameState.interactableItems ||
            gameState.selectedItemIndex >= gameState.interactableItems.length) return;

        if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.6 }); // Placeholder for ui_actionlist_open_01.wav

        const item = gameState.interactableItems[gameState.selectedItemIndex];
        const actions = _getActionsForItem(item); // Use internal helper
        const actionList = document.getElementById('actionList');
        if (!actionList) return;

        actionList.innerHTML = '';
        gameState.selectedActionIndex = -1;
        gameState.isActionMenuActive = true;

        actions.forEach((action, index) => {
            const el = document.createElement("div");
            el.textContent = `${index + 1}. ${action}`;
            el.classList.add("action-item");
            el.onclick = () => this.selectAction(index);
            actionList.appendChild(el);
        });
    },

    performSelectedAction: function () {
        if (gameState.selectedActionIndex === -1) return;
        const actionList = document.getElementById('actionList');
        if (!actionList) return;
        const selectedActionElement = actionList.children[gameState.selectedActionIndex];
        if (!selectedActionElement) return;

        const actionText = selectedActionElement.textContent.split('. ')[1];
        const item = gameState.interactableItems[gameState.selectedItemIndex];

        logToConsole(`Performing action: ${actionText} on ${item.id} at (${item.x}, ${item.y})`, 'dev'); // Assumes logToConsole global

        if (actionText === "Cancel") {
            // Cancel sound will be played by cancelActionSelection, called below
            _performAction(actionText, item); // Use internal helper
        } else if (gameState.actionPointsRemaining > 0) {
            gameState.actionPointsRemaining--;
            if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav');
            // updateTurnUI is still in script.js and global for now
            if (window.turnManager && typeof window.turnManager.updateTurnUI === 'function') { window.turnManager.updateTurnUI(); } else { console.error("window.turnManager.updateTurnUI is not available."); }
            _performAction(actionText, item); // Use internal helper
        } else {
            logToConsole("No actions left for this turn.");
            if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
        }
        this.cancelActionSelection(); // This will play the close/cancel sound
    },

    cancelActionSelection: function () {
        if (window.audioManager && gameState.isActionMenuActive) { // Only play if menu was actually active
            window.audioManager.playUiSound('ui_click_01.wav', { volume: 0.5 }); // Placeholder for ui_menu_close_01.wav
        }
        gameState.isActionMenuActive = false;
        const actionList = document.getElementById('actionList');
        if (actionList) actionList.innerHTML = '';
        window.mapRenderer.updateMapHighlight(); // Assumes mapRenderer is global
    },

};