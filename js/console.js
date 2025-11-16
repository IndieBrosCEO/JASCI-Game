// js/console.js

// References to console UI elements (now sourced from global scope, e.g., script.js)
// const gameConsoleElement = document.getElementById('gameConsole');
// const consoleOutputElement = document.getElementById('consoleOutput');
// const consoleInputElement = document.getElementById('consoleInput');

// Function to log messages to the console UI
function logToConsoleUI(message, type = 'info') {
    if (!consoleOutputElement) { // This will now check the global consoleOutputElement
        console.error("Console output element not found by logToConsoleUI.");
        return;
    }

    const entry = document.createElement('div');
    entry.textContent = message;

    if (type === 'error') {
        entry.style.color = 'red';
        if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
    } else if (type === 'success') {
        entry.style.color = 'lightgreen';
        // Potentially a soft success ping: ui_confirm_01.wav with low volume or a specific "notification" sound
        // if (window.audioManager) window.audioManager.playUiSound('ui_click_01.wav', {volume: 0.4});
    } else if (type === 'echo') {
        entry.style.color = 'lightblue'; // For command echoes
    } else if (type === 'info') {
        entry.style.color = '#88ddff'; // Light blue for general info
    }
    // Default color is white (or whatever the parent #gameConsole color is)

    consoleOutputElement.appendChild(entry);
    consoleOutputElement.scrollTop = consoleOutputElement.scrollHeight; // Auto-scroll
}

// Command history
window.commandHistory = [];
window.historyIndex = -1;

const commandHelpInfo = {
    'help': {
        syntax: 'help [command_name]',
        description: 'Displays a list of available commands or detailed help for a specific command.'
    },
    'clear': {
        syntax: 'clear',
        description: 'Clears the console output area.'
    },
    'additem': {
        syntax: 'addItem <itemId> [quantity]',
        description: 'Adds an item to inventory. quantity defaults to 1.'
    },
    'removeitem': {
        syntax: 'removeItem <itemId> [quantity]',
        description: 'Removes an item from inventory. quantity defaults to 1.'
    },
    'clearinventory': {
        syntax: 'clearInventory',
        description: 'Removes all items from player inventory.'
    },
    'spawnnpc': {
        syntax: 'spawnNpc <npcId> <x> <y>',
        description: 'Spawns an NPC at specified coordinates.'
    },
    'removenpc': {
        syntax: 'removeNpc <npcIdOrName>',
        description: 'Removes a specific NPC by ID or name.'
    },
    'killnpcs': {
        syntax: 'killNpcs [npcId]',
        description: 'Kills all NPCs, or all NPCs of a specific type if npcId is provided.'
    },
    'setstat': {
        syntax: 'setStat <statName> <value>',
        description: 'Sets a player stat to a value (e.g., Strength, Dexterity).'
    },
    'modstat': {
        syntax: 'modStat <statName> <amount>',
        description: 'Modifies a player stat by an amount.'
    },
    'resetstats': {
        syntax: 'resetStats',
        description: 'Resets all player stats to default values.'
    },
    'setskill': {
        syntax: 'setSkill <skillName> <value>',
        description: 'Sets a player skill to a value (e.g., "Melee Weapons", "Animal Handling").'
    },
    'modskill': {
        syntax: 'modSkill <skillName> <amount>',
        description: 'Modifies a player skill by an amount.'
    },
    'resetskills': {
        syntax: 'resetSkills',
        description: 'Resets all player skills to 0.'
    },
    'teleport': {
        syntax: 'teleport <x> <y> <z>',
        description: 'Teleports player to specified map coordinates (x, y, z).'
    },
    'heal': {
        syntax: 'heal [amount]',
        description: 'Heals player. Fully heals if no amount, or heals by amount per body part.'
    },
    'godmode': {
        syntax: 'godmode [on|off]',
        description: 'Toggles player invincibility. Explicitly sets with on/off.'
    },
    'noclip': {
        syntax: 'noclip [on|off]',
        description: 'Toggles player movement through walls. Explicitly sets with on/off.'
    },
    'maxall': {
        syntax: 'maxall',
        description: 'Sets all player stats to 10 and all skills to 100.'
    },
    'maxhp': {
        syntax: 'maxhp',
        description: 'Sets all player body-part HP pools to their maximum.'
    },
    'sethunger': {
        syntax: 'sethunger <value>',
        description: 'Sets current hunger level (0-24 directly).'
    },
    'setthirst': {
        syntax: 'setthirst <value>',
        description: 'Sets current thirst level (0-24 directly).'
    },
    'settime': {
        syntax: 'settime <HH:MM>',
        description: 'Forces the in-game clock to the specified hour:minute (24-hour format).'
    },
    'fastforward': {
        syntax: 'fastforward <hours>',
        description: 'Advances the game clock by the specified number of hours, processing needs.'
    },
    'aggroall': {
        syntax: 'aggroall',
        description: 'Forces every nearby hostile NPC to target the player immediately.'
    },
    'calmall': {
        syntax: 'calmall',
        description: 'Resets all NPCs to a neutral state towards the player and ends combat.'
    },
    'settile': {
        syntax: 'settile <x> <y> <tileId> [layerName]',
        description: "Replaces the tile at specified coordinates with tileId. Optional layerName (default: 'building')."
    },
    'cleararea': {
        syntax: 'cleararea <x1> <y1> <x2> <y2> [defaultTileId]',
        description: 'Clears items, NPCs, and terrain in a rectangle. Optional defaultTileId for landscape.'
    },
    'placeitem': {
        syntax: 'placeitem <itemID> <quantity> <x> <y>',
        description: 'Spawns a specified quantity of an item at the given coordinates on the floor.'
    },
    'togglevehiclemodui': {
        syntax: 'togglevehiclemodui [vehicle_id]',
        description: 'Toggles the vehicle modification UI. If vehicle_id is provided, opens for that specific vehicle.'
    },
    'spawnvehicle': {
        syntax: 'spawnvehicle <templateId> [x y z]',
        description: 'Spawns a vehicle with the given template ID. Optionally spawns at x y z coordinates, otherwise spawns at player location.'
    },
    'explosion': {
        syntax: 'explosion <x> <y> <radius> <damage> [damageType]',
        description: 'Creates an explosion at x,y with a radius, damage (e.g., "3d6"), and optional damage type.'
    },
    'runtests': {
        syntax: 'runtests [suite_name]',
        description: 'Runs automated tests. Currently available: "progression".'
    }
};

// Main function to process commands
function processConsoleCommand(commandText) {
    // --- START DEFENSIVE INITIALIZATION ---
    if (typeof window.commandHistory === 'undefined' || !Array.isArray(window.commandHistory)) {
        console.warn("CONSOLE DEBUG: window.commandHistory was undefined or not an array upon entering processConsoleCommand. Re-initializing.");
        // Log to game console UI if logToConsoleUI is already defined and working
        // This check is to prevent errors if logToConsoleUI itself has issues or isn't ready
        if (typeof logToConsoleUI === 'function') {
            logToConsoleUI("DEBUG: commandHistory re-initialized (undefined/not array).", "info");
        }
        window.commandHistory = [];
        window.historyIndex = -1;
    } else if (typeof window.historyIndex === 'undefined' || typeof window.historyIndex !== 'number') {
        // Also ensure historyIndex is a number, though less likely to be the issue for '.length' error
        console.warn("CONSOLE DEBUG: window.historyIndex was undefined or not a number. Re-initializing.");
        if (typeof logToConsoleUI === 'function') {
            logToConsoleUI("DEBUG: historyIndex re-initialized (undefined/not number).", "info");
        }
        window.historyIndex = window.commandHistory.length; // Or -1 if history is also reset
    }
    // --- END DEFENSIVE INITIALIZATION ---

    // Use direct logToConsoleUI as it's in the same file scope.
    logToConsoleUI(`> ${commandText}`, 'echo');

    if (commandText.trim() === '') {
        return;
    }

    // Add to history only if it's different from the last command or history is empty
    // Accessing history via window object as it's defined there.
    if (window.commandHistory.length === 0 || window.commandHistory[window.commandHistory.length - 1] !== commandText) {
        window.commandHistory.push(commandText);
    }
    window.historyIndex = window.commandHistory.length; // Reset history index

    const parts = commandText.trim().split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
        case 'help':
            if (args.length === 0) {
                // Display all available commands
                logToConsoleUI("Available commands:", 'info'); // Direct call
                for (const cmd in commandHelpInfo) {
                    logToConsoleUI(`  ${cmd} - ${commandHelpInfo[cmd].description.split('.')[0]}`, 'info'); // Direct call
                }
                logToConsoleUI("Type 'help <command_name>' for more details on a specific command.", 'info'); // Direct call
            } else {
                const commandNameToHelp = args[0].toLowerCase();
                if (commandHelpInfo[commandNameToHelp]) {
                    const info = commandHelpInfo[commandNameToHelp];
                    logToConsoleUI(`Help for command: ${commandNameToHelp}`, 'info'); // Direct call
                    logToConsoleUI(`  Syntax: ${info.syntax}`, 'info'); // Direct call
                    logToConsoleUI(`  Description: ${info.description}`, 'info'); // Direct call
                } else {
                    logToConsoleUI(`No help available for command: ${commandNameToHelp}. Type 'help' for a list of commands.`, 'error'); // Direct call
                }
            }
            break;

        case 'settile':
            if (args.length < 3) {
                logToConsoleUI("Usage: settile <x> <y> <tileId> [layerName]", 'error');
                logToConsoleUI("Default layer is 'building'. Valid layers: landscape, building, item, roof.", 'info');
                break;
            }
            const x = parseInt(args[0], 10);
            const y = parseInt(args[1], 10);
            const tileId = args[2];
            const layerNameArg = args[3] ? args[3].toLowerCase() : 'building';

            if (isNaN(x) || isNaN(y)) {
                logToConsoleUI("Error: X and Y coordinates must be numbers.", 'error');
                break;
            }

            if (typeof assetManager === 'undefined' || typeof assetManager.getTileset !== 'function') {
                logToConsoleUI("Error: assetManager or getTileset function not available.", 'error');
                break;
            }
            // Validate tileId - check if it exists in the tileset definitions
            // assetManager.getTileset() returns the whole tileset object.
            // We need to check if tileId is a key in assetManager.tilesets
            if (tileId !== "" && tileId !== " " && !assetManager.tilesets[tileId]) { // Allow "" or " " to clear a tile
                logToConsoleUI(`Error: Tile ID '${tileId}' not found in tileset definitions.`, 'error');
                break;
            }

            const validLayers = ['landscape', 'building', 'item', 'roof'];
            if (!validLayers.includes(layerNameArg)) {
                logToConsoleUI(`Error: Invalid layer name '${layerNameArg}'. Valid layers are: ${validLayers.join(', ')}.`, 'error');
                break;
            }

            if (!gameState.layers || !gameState.layers[layerNameArg]) {
                logToConsoleUI(`Error: Layer '${layerNameArg}' does not exist in gameState.layers.`, 'error');
                break;
            }
            const layerToModify = gameState.layers[layerNameArg];

            if (y < 0 || y >= layerToModify.length || x < 0 || x >= layerToModify[0].length) {
                logToConsoleUI(`Error: Coordinates (${x},${y}) are out of bounds for layer '${layerNameArg}'.`, 'error');
                break;
            }

            layerToModify[y][x] = tileId;
            logToConsoleUI(`Set tile at (${x},${y}) on layer '${layerNameArg}' to '${tileId}'.`, 'success');

            if (typeof window.mapRenderer !== 'undefined' && typeof window.mapRenderer.scheduleRender === 'function') {
                // Force a re-render of the tile cache for the modified tile for immediate visual update
                // This is a bit of a hack; ideally, scheduleRender would be smart enough or a specific function would exist.
                if (gameState.tileCache && gameState.tileCache[y] && gameState.tileCache[y][x]) {
                    gameState.tileCache[y][x] = null; // Invalidate cache for this tile
                }
                window.mapRenderer.scheduleRender();
            }
            // If placing an interactive tile, might need to update interactions
            if (typeof window.interaction !== 'undefined' && typeof window.interaction.detectInteractableItems === 'function') {
                window.interaction.detectInteractableItems();
                if (typeof window.interaction.showInteractableItems === 'function') {
                    window.interaction.showInteractableItems();
                }
            }
            break;

        case 'clear':
            if (typeof consoleOutputElement !== 'undefined' && consoleOutputElement) { // Check global
                consoleOutputElement.innerHTML = '';
                logToConsoleUI("Console cleared.", "info"); // Direct call
            }
            break;

        case 'additem': // Syntax: addItem <itemId> [quantity]
            if (args.length < 1) {
                logToConsoleUI("Usage: addItem <itemId> [quantity]", 'error'); // Direct call
                break;
            }
            const itemIdToAdd = args[0];
            const quantityToAdd = args[1] ? parseInt(args[1], 10) : 1;

            if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
                logToConsoleUI("Quantity must be a positive number.", 'error'); // Direct call
                break;
            }

            if (typeof assetManager === 'undefined') { // More robust check
                logToConsoleUI("Error: assetManager not found.", 'error'); // Direct call
                break;
            }
            const itemDef = assetManager.getItem(itemIdToAdd); // Direct call

            if (!itemDef) {
                logToConsoleUI(`Error: Item ID '${itemIdToAdd}' not found.`, 'error'); // Direct call
                break;
            }

            if (window.inventoryManager && typeof window.inventoryManager.addItemToInventoryById === 'function') {
                if (window.inventoryManager.addItemToInventoryById(itemIdToAdd, quantityToAdd)) {
                    logToConsoleUI(`Added ${quantityToAdd}x '${itemDef.name || itemIdToAdd}' to inventory.`, 'success');
                } else {
                    logToConsoleUI(`Failed to add item '${itemIdToAdd}' (inventory full or error).`, 'error');
                }
            } else {
                logToConsoleUI("Error: inventoryManager.addItemToInventoryById function not available.", 'error');
            }
            if (typeof window.updateInventoryUI === 'function') {
                window.updateInventoryUI();
            }
            break;

        case 'teleport': // Syntax: teleport <x> <y> <z>
            if (args.length < 3) {
                logToConsoleUI("Usage: teleport <x> <y> <z>", 'error'); // Direct call
                break;
            }
            const targetX = parseInt(args[0], 10);
            const targetY = parseInt(args[1], 10);
            const targetZ = parseInt(args[2], 10);

            if (isNaN(targetX) || isNaN(targetY) || isNaN(targetZ)) {
                logToConsoleUI("Error: X, Y, and Z coordinates must be numbers.", 'error'); // Direct call
                break;
            }

            if (typeof gameState === 'undefined' || !gameState.playerPos) { // Check global
                logToConsoleUI("Error: gameState.playerPos not found.", 'error'); // Direct call
                break;
            }

            // Check if target Z-level exists in the mapData
            const mapData = window.mapRenderer?.getCurrentMapData();
            if (!mapData || !mapData.levels || !mapData.levels[targetZ.toString()]) {
                logToConsoleUI(`Error: Z-level ${targetZ} does not exist in the current map. Teleport aborted.`, 'error');
                break;
            }

            // Validate coordinates against map dimensions for the target Z-level
            // Assuming all Z-levels share the same width/height from mapData.dimensions
            if (mapData.dimensions) {
                if (targetX < 0 || targetX >= mapData.dimensions.width || targetY < 0 || targetY >= mapData.dimensions.height) {
                    logToConsoleUI(`Error: Coordinates (${targetX},${targetY}) are out of map bounds for Z-level ${targetZ}. Max X: ${mapData.dimensions.width - 1}, Max Y: ${mapData.dimensions.height - 1}. Teleport aborted.`, 'error');
                    break;
                }
            } else {
                logToConsoleUI("Warning: Map dimensions not found. Cannot validate teleport coordinates against bounds.", "orange");
            }


            gameState.playerPos.x = targetX; // Direct use
            gameState.playerPos.y = targetY; // Direct use
            gameState.playerPos.z = targetZ; // Update Z coordinate

            // Also update currentViewZ and follow mode
            gameState.currentViewZ = targetZ;
            gameState.viewFollowsPlayerZ = true;

            if (window.audioManager) window.audioManager.updateListenerPosition(gameState.playerPos.x, gameState.playerPos.y, gameState.playerPos.z);

            logToConsoleUI(`Player teleported to (${targetX}, ${targetY}, Z:${targetZ}). View synced.`, 'success'); // Direct call

            // FOW for the new Z-level will be initialized/updated by renderMapLayers if necessary.
            if (typeof window.mapRenderer !== 'undefined' && typeof window.mapRenderer.scheduleRender === 'function') {
                // Ensure tile cache is invalidated for the new Z level if it's different
                if (gameState.tileCache && gameState.tileCache.z !== targetZ) {
                    gameState.tileCache = null;
                    logToConsoleUI("Tile cache invalidated due to Z-level change from teleport.", "info");
                }
                window.mapRenderer.scheduleRender();
            }
            if (typeof window.interaction !== 'undefined' && typeof window.interaction.detectInteractableItems === 'function') {
                window.interaction.detectInteractableItems();
                if (typeof window.interaction.showInteractableItems === 'function') {
                    window.interaction.showInteractableItems();
                }
            }
            break;

        case 'heal': // Syntax: heal [amount]
            if (typeof gameState === 'undefined' || !gameState.health) { // Check global
                logToConsoleUI("Error: gameState.health not found for player.", 'error'); // Direct call
                break;
            }

            let healAmount = -1;
            if (args.length > 0) {
                healAmount = parseInt(args[0], 10);
                if (isNaN(healAmount) || healAmount <= 0) {
                    logToConsoleUI("Error: Heal amount must be a positive number.", 'error'); // Direct call
                    break;
                }
            }

            let totalHealed = 0;
            for (const partName in gameState.health) { // Direct use
                const bodyPart = gameState.health[partName]; // Direct use
                if (bodyPart && typeof bodyPart.current === 'number' && typeof bodyPart.max === 'number') {
                    const potentialHeal = (healAmount === -1) ? bodyPart.max : healAmount;
                    const actualHealForPart = Math.min(potentialHeal, bodyPart.max - bodyPart.current);

                    if (actualHealForPart > 0) {
                        bodyPart.current += actualHealForPart;
                        totalHealed += actualHealForPart;
                    }
                }
            }

            if (totalHealed > 0) {
                logToConsoleUI(`Player healed for a total of ${totalHealed} health points across body parts.`, 'success'); // Direct call
            } else if (healAmount !== -1) {
                logToConsoleUI("Player is already at or above specified health for affected parts, or no damage to heal by that amount.", 'info'); // Direct call
            } else {
                logToConsoleUI("Player is already at full health.", 'info'); // Direct call
            }

            if (typeof window.renderHealthTable === 'function') {
                window.renderHealthTable(gameState); // Pass direct gameState
            } else if (typeof window.renderCharacterInfo === 'function') {
                window.renderCharacterInfo();
            }
            break;

        case 'removeitem': // Syntax: removeItem <itemId> [quantity]
            if (args.length < 1) {
                logToConsoleUI("Usage: removeItem <itemId> [quantity]", 'error'); // Direct call
                break;
            }
            const itemIdToRemove = args[0];
            const quantityToRemove = args[1] ? parseInt(args[1], 10) : 1;

            if (isNaN(quantityToRemove) || quantityToRemove <= 0) {
                logToConsoleUI("Quantity must be a positive number.", 'error'); // Direct call
                break;
            }

            if (typeof assetManager === 'undefined') { // Check global
                logToConsoleUI("Error: assetManager not found for removeItem.", 'error'); // Direct call
                break;
            }
            const itemToRemoveDef = assetManager.getItem(itemIdToRemove); // Direct use
            const itemNameToRemove = itemToRemoveDef ? itemToRemoveDef.name : itemIdToRemove;

            let itemsRemovedCount = 0;
            if (typeof window.removeItem === 'function') {
                for (let i = 0; i < quantityToRemove; i++) {
                    if (window.removeItem(itemNameToRemove)) {
                        itemsRemovedCount++;
                    } else {
                        if (i === 0) {
                            logToConsoleUI(`Item '${itemNameToRemove}' not found in inventory or could not be removed.`, 'error'); // Direct call
                        } else {
                            logToConsoleUI(`Removed ${itemsRemovedCount}x '${itemNameToRemove}'. No more found.`, 'info'); // Direct call
                        }
                        break;
                    }
                }
            } else {
                logToConsoleUI("Error: removeItem function not available.", 'error'); // Direct call
                break;
            }

            if (itemsRemovedCount > 0) {
                logToConsoleUI(`Successfully removed ${itemsRemovedCount}x '${itemNameToRemove}'.`, 'success'); // Direct call
            }
            break;

        case 'clearinventory':
            if (typeof gameState !== 'undefined' && gameState.inventory && gameState.inventory.container) { // Check global
                gameState.inventory.container.items = []; // Direct use
                if (gameState.inventory.handSlots) { // Direct use
                    gameState.inventory.handSlots = [null, null]; // Direct use
                }
                logToConsoleUI("Inventory cleared.", 'success'); // Direct call
                if (typeof window.updateInventoryUI === 'function') {
                    window.updateInventoryUI();
                }
            } else {
                logToConsoleUI("Error: Inventory data not found.", 'error'); // Direct call
            }
            break;

        case 'spawnnpc': // Syntax: spawnNpc <npcId> <x> <y>
            if (args.length < 3) {
                logToConsoleUI("Usage: spawnNpc <npcId> <x> <y>", 'error'); // Direct call
                break;
            }
            const npcIdToSpawn = args[0];
            const spawnX = parseInt(args[1], 10);
            const spawnY = parseInt(args[2], 10);

            if (isNaN(spawnX) || isNaN(spawnY)) {
                logToConsoleUI("Error: X and Y coordinates must be numbers.", 'error'); // Direct call
                break;
            }

            if (typeof assetManager === 'undefined' || typeof assetManager.getNpc !== 'function') { // Check global
                logToConsoleUI("Error: assetManager or assetManager.getNpc function not found.", 'error'); // Direct call
                break;
            }
            const npcDef = assetManager.getNpc(npcIdToSpawn); // Direct use

            if (!npcDef) {
                logToConsoleUI(`Error: NPC definition for ID '${npcIdToSpawn}' not found.`, 'error'); // Direct call
                break;
            }

            const newNpc = JSON.parse(JSON.stringify(npcDef));
            newNpc.mapPos = { x: spawnX, y: spawnY };

            if (typeof window.initializeHealth === 'function') {
                window.initializeHealth(newNpc);
            } else {
                if (!newNpc.health) {
                    newNpc.health = {
                        head: { max: 5, current: 5, armor: 0, crisisTimer: 0 },
                        torso: { max: 8, current: 8, armor: 0, crisisTimer: 0 },
                    };
                    logToConsoleUI("Warning: initializeHealth function not found. Using basic default health for spawned NPC.", "info"); // Direct call
                } else {
                    for (const part in newNpc.health) {
                        if (newNpc.health[part].max === undefined) newNpc.health[part].max = 5;
                        if (newNpc.health[part].current === undefined) newNpc.health[part].current = newNpc.health[part].max;
                        if (newNpc.health[part].armor === undefined) newNpc.health[part].armor = 0;
                        if (newNpc.health[part].crisisTimer === undefined) newNpc.health[part].crisisTimer = 0;
                    }
                }
            }

            if (newNpc.aggroList === undefined) {
                newNpc.aggroList = [];
            }

            if (newNpc.teamId === undefined) {
                logToConsoleUI(`Warning: NPC '${npcIdToSpawn}' spawned without a teamId. Consider adding to definition.`, "info"); // Direct call
                newNpc.teamId = 2;
            }

            if (typeof gameState !== 'undefined' && gameState.npcs) { // Check global
                gameState.npcs.push(newNpc); // Direct use
                logToConsoleUI(`Spawned NPC '${newNpc.name || npcIdToSpawn}' at (${spawnX}, ${spawnY}).`, 'success'); // Direct call
                if (typeof window.mapRenderer !== 'undefined' && typeof window.mapRenderer.scheduleRender === 'function') {
                    window.mapRenderer.scheduleRender();
                }
            } else {
                logToConsoleUI("Error: gameState.npcs array not found.", 'error'); // Direct call
            }
            break;

        case 'removenpc': // Syntax: removeNpc <npcIdOrName>
            if (args.length < 1) {
                logToConsoleUI("Usage: removeNpc <npcIdOrName>", 'error'); // Direct call
                break;
            }
            const identifierToRemove = args.join(" ").toLowerCase();

            if (typeof gameState !== 'undefined' && gameState.npcs) { // Check global
                const initialNpcCount = gameState.npcs.length; // Direct use
                const npcIndexToRemove = gameState.npcs.findIndex(npc =>  // Direct use
                    (npc.id && npc.id.toLowerCase() === identifierToRemove) ||
                    (npc.name && npc.name.toLowerCase() === identifierToRemove)
                );

                if (npcIndexToRemove !== -1) {
                    const removedNpc = gameState.npcs.splice(npcIndexToRemove, 1)[0]; // Direct use
                    logToConsoleUI(`Removed NPC '${removedNpc.name || removedNpc.id}'.`, 'success'); // Direct call
                    if (typeof window.mapRenderer !== 'undefined' && typeof window.mapRenderer.scheduleRender === 'function') {
                        window.mapRenderer.scheduleRender();
                    }
                } else {
                    logToConsoleUI(`NPC with ID or name '${identifierToRemove}' not found.`, 'error'); // Direct call
                }
            } else {
                logToConsoleUI("Error: gameState.npcs array not found.", 'error'); // Direct call
            }
            break;

        case 'killnpcs': // Syntax: killNpcs [npcId]
            const targetNpcId = args.length > 0 ? args[0].toLowerCase() : null;
            let killedCount = 0;

            if (typeof gameState !== 'undefined' && gameState.npcs) { // Check global
                gameState.npcs.forEach(npc => { // Direct use
                    if (targetNpcId === null || (npc.id && npc.id.toLowerCase() === targetNpcId)) {
                        if (npc.health && npc.health.torso) {
                            npc.health.torso.current = 0;
                            if (npc.health.head) npc.health.head.current = 0;
                            killedCount++;
                            logToConsoleUI(`Killed NPC '${npc.name || npc.id}'.`, "info"); // Direct call
                        } else {
                            logToConsoleUI(`NPC '${npc.name || npc.id}' has no health component to modify. Cannot kill.`, "error"); // Direct call
                        }
                    }
                });

                if (killedCount > 0) {
                    logToConsoleUI(`Killed ${killedCount} NPC(s).`, 'success'); // Direct call
                    if (typeof window.mapRenderer !== 'undefined' && typeof window.mapRenderer.scheduleRender === 'function') {
                        window.mapRenderer.scheduleRender();
                    }
                } else if (targetNpcId) {
                    logToConsoleUI(`No NPCs of ID '${targetNpcId}' found to kill.`, 'info'); // Direct call
                } else {
                    logToConsoleUI("No NPCs found to kill.", 'info'); // Direct call
                }
            } else {
                logToConsoleUI("Error: gameState.npcs array not found.", 'error'); // Direct call
            }
            break;

        case 'setstat': // Syntax: setStat <statName> <value>
            if (args.length < 2) {
                logToConsoleUI("Usage: setStat <statName> <value>", 'error'); // Direct call
                break;
            }
            const statNameToSet = args[0].toLowerCase();
            const statValueToSet = parseInt(args[1], 10);

            if (isNaN(statValueToSet)) {
                logToConsoleUI("Error: Value must be a number.", 'error'); // Direct call
                break;
            }

            if (typeof gameState === 'undefined' || !gameState.stats) { // Check global
                logToConsoleUI("Error: gameState.stats not found.", 'error'); // Direct call
                break;
            }

            const statToSet = gameState.stats.find(s => s.name.toLowerCase() === statNameToSet); // Direct use
            if (!statToSet) {
                logToConsoleUI(`Error: Stat '${args[0]}' not found.`, 'error'); // Direct call
                break;
            }

            // REMOVE CLAMPING LOGIC:
            // const minStat = gameState.MIN_STAT_VALUE || 1;
            // const maxStat = gameState.MAX_STAT_VALUE || 10;
            // statToSet.points = Math.max(minStat, Math.min(maxStat, statValueToSet));

            // SET VALUE DIRECTLY:
            statToSet.points = statValueToSet;

            logToConsoleUI(`Set stat '${statToSet.name}' to ${statToSet.points}. (No cap applied by console)`, 'success'); // Direct call
            if (typeof window.renderCharacterInfo === 'function') {
                window.renderCharacterInfo();
            } else if (typeof window.renderTables === 'function') {
                window.renderTables(gameState); // Pass direct gameState
            }
            break;

        case 'modstat': // Syntax: modStat <statName> <amount>
            if (args.length < 2) {
                logToConsoleUI("Usage: modStat <statName> <amount>", 'error'); // Direct call
                break;
            }
            const statNameToMod = args[0].toLowerCase();
            const statAmountToMod = parseInt(args[1], 10);

            if (isNaN(statAmountToMod)) {
                logToConsoleUI("Error: Amount must be a number.", 'error'); // Direct call
                break;
            }

            if (typeof gameState === 'undefined' || !gameState.stats) { // Check global
                logToConsoleUI("Error: gameState.stats not found.", 'error'); // Direct call
                break;
            }

            const statToMod = gameState.stats.find(s => s.name.toLowerCase() === statNameToMod); // Direct use
            if (!statToMod) {
                logToConsoleUI(`Error: Stat '${args[0]}' not found.`, 'error'); // Direct call
                break;
            }

            // REMOVE CLAMPING LOGIC:
            // const minStatMod = gameState.MIN_STAT_VALUE || 1;
            // const maxStatMod = gameState.MAX_STAT_VALUE || 10;
            // statToMod.points = Math.max(minStatMod, Math.min(maxStatMod, statToMod.points + statAmountToMod));

            // SET VALUE DIRECTLY:
            statToMod.points += statAmountToMod; // Or statToMod.points = statToMod.points + statAmountToMod;

            logToConsoleUI(`Modified stat '${statToMod.name}' by ${statAmountToMod}. New value: ${statToMod.points}. (No cap applied by console)`, 'success'); // Direct call
            if (typeof window.renderCharacterInfo === 'function') {
                window.renderCharacterInfo();
            } else if (typeof window.renderTables === 'function') {
                window.renderTables(gameState); // Pass direct gameState
            }
            break;

        case 'resetstats':
            if (typeof gameState === 'undefined' || !gameState.stats) { // Check global
                logToConsoleUI("Error: gameState.stats not found.", 'error'); // Direct call
                break;
            }
            const defaultStatValue = 3;
            gameState.stats.forEach(stat => { // Direct use
                stat.points = defaultStatValue;
            });
            logToConsoleUI("All stats reset to default.", 'success'); // Direct call
            if (typeof window.renderCharacterInfo === 'function') {
                window.renderCharacterInfo();
            } else if (typeof window.renderTables === 'function') {
                window.renderTables(gameState); // Pass direct gameState
            }
            break;

        case 'setskill': // Syntax: setSkill <skillName> <value>
            if (args.length < 2) {
                logToConsoleUI("Usage: setSkill <skillName> <value>", 'error'); // Direct call
                break;
            }
            const skillValueToSetArg = args[args.length - 1];
            const skillValueToSet = parseInt(skillValueToSetArg, 10);
            const skillNameToSet = args.slice(0, -1).join(" ").toLowerCase();

            if (isNaN(skillValueToSet)) {
                logToConsoleUI("Error: Value must be a number.", 'error'); // Direct call
                break;
            }
            if (!skillNameToSet) {
                logToConsoleUI("Error: Skill name cannot be empty.", 'error'); // Direct call
                break;
            }

            if (typeof gameState === 'undefined' || !gameState.skills) { // Check global
                logToConsoleUI("Error: gameState.skills not found.", 'error'); // Direct call
                break;
            }

            const skillToSet = gameState.skills.find(s => s.name.toLowerCase() === skillNameToSet); // Direct use
            if (!skillToSet) {
                logToConsoleUI(`Error: Skill '${args.slice(0, -1).join(" ")}' not found.`, 'error'); // Direct call
                break;
            }

            // REMOVE CLAMPING LOGIC:
            // const maxSkill = gameState.MAX_SKILL_POINTS || 30; 
            // skillToSet.points = Math.max(0, Math.min(maxSkill, skillValueToSet));

            // SET VALUE DIRECTLY:
            skillToSet.points = skillValueToSet;

            logToConsoleUI(`Set skill '${skillToSet.name}' to ${skillToSet.points}. (No cap applied by console)`, 'success'); // Direct call
            if (typeof window.renderCharacterInfo === 'function') {
                window.renderCharacterInfo();
            } else if (typeof window.renderTables === 'function') {
                window.renderTables(gameState); // Pass direct gameState
            }
            break;

        case 'modskill': // Syntax: modSkill <skillName> <amount>
            if (args.length < 2) {
                logToConsoleUI("Usage: modSkill <skillName> <amount>", 'error'); // Direct call
                break;
            }
            const skillAmountToModArg = args[args.length - 1];
            const skillAmountToMod = parseInt(skillAmountToModArg, 10);
            const skillNameToMod = args.slice(0, -1).join(" ").toLowerCase();

            if (isNaN(skillAmountToMod)) {
                logToConsoleUI("Error: Amount must be a number.", 'error'); // Direct call
                break;
            }
            if (!skillNameToMod) {
                logToConsoleUI("Error: Skill name cannot be empty.", 'error'); // Direct call
                break;
            }

            if (typeof gameState === 'undefined' || !gameState.skills) { // Check global
                logToConsoleUI("Error: gameState.skills not found.", 'error'); // Direct call
                break;
            }

            const skillToMod = gameState.skills.find(s => s.name.toLowerCase() === skillNameToMod); // Direct use
            if (!skillToMod) {
                logToConsoleUI(`Error: Skill '${args.slice(0, -1).join(" ")}' not found.`, 'error'); // Direct call
                break;
            }

            // REMOVE CLAMPING LOGIC:
            // const maxSkillMod = gameState.MAX_SKILL_POINTS || 30;
            // skillToMod.points = Math.max(0, Math.min(maxSkillMod, skillToMod.points + skillAmountToMod));

            // SET VALUE DIRECTLY:
            skillToMod.points += skillAmountToMod;

            logToConsoleUI(`Modified skill '${skillToMod.name}' by ${skillAmountToMod}. New value: ${skillToMod.points}. (No cap applied by console)`, 'success'); // Direct call
            if (typeof window.renderCharacterInfo === 'function') {
                window.renderCharacterInfo();
            } else if (typeof window.renderTables === 'function') {
                window.renderTables(gameState); // Pass direct gameState
            }
            break;

        case 'resetskills':
            if (typeof gameState === 'undefined' || !gameState.skills) { // Check global
                logToConsoleUI("Error: gameState.skills not found.", 'error'); // Direct call
                break;
            }
            gameState.skills.forEach(skill => { // Direct use
                skill.points = 0;
            });
            logToConsoleUI("All skills reset to 0.", 'success'); // Direct call
            if (typeof window.renderCharacterInfo === 'function') {
                window.renderCharacterInfo();
            } else if (typeof window.renderTables === 'function') {
                window.renderTables(gameState); // Pass direct gameState
            }
            break;

        case 'godmode': // Syntax: godmode [on|off]
            if (typeof gameState === 'undefined' || !gameState.player) { // Check global
                logToConsoleUI("Error: gameState.player not found.", 'error'); // Direct call
                break;
            }
            if (typeof gameState.player.isGodMode === 'undefined') { // Direct use
                gameState.player.isGodMode = false;
            }

            let godModeState;
            if (args.length > 0) {
                if (args[0].toLowerCase() === 'on') {
                    godModeState = true;
                } else if (args[0].toLowerCase() === 'off') {
                    godModeState = false;
                } else {
                    logToConsoleUI("Usage: godmode [on|off]", 'error'); // Direct call
                    break;
                }
                gameState.player.isGodMode = godModeState; // Direct use
            } else {
                gameState.player.isGodMode = !gameState.player.isGodMode; // Direct use
            }

            logToConsoleUI(`God mode ${gameState.player.isGodMode ? "enabled" : "disabled"}.`, 'success'); // Direct use, direct call
            break;

        case 'noclip': // Syntax: noclip [on|off]
            if (typeof gameState === 'undefined' || !gameState.player) { // Check global
                logToConsoleUI("Error: gameState.player not found.", 'error'); // Direct call
                break;
            }
            if (typeof gameState.player.noClipEnabled === 'undefined') { // Direct use
                gameState.player.noClipEnabled = false;
            }

            let noClipState;
            if (args.length > 0) {
                if (args[0].toLowerCase() === 'on') {
                    noClipState = true;
                } else if (args[0].toLowerCase() === 'off') {
                    noClipState = false;
                } else {
                    logToConsoleUI("Usage: noclip [on|off]", 'error'); // Direct call
                    break;
                }
                gameState.player.noClipEnabled = noClipState; // Direct use
            } else {
                gameState.player.noClipEnabled = !gameState.player.noClipEnabled; // Direct use
            }

            logToConsoleUI(`Noclip mode ${gameState.player.noClipEnabled ? "enabled" : "disabled"}.`, 'success'); // Direct use, direct call
            break;

        case 'maxall':
            if (typeof gameState === 'undefined' || !gameState.stats || !gameState.skills) {
                logToConsoleUI("Error: gameState.stats or gameState.skills not found.", 'error');
                break;
            }
            gameState.stats.forEach(stat => stat.points = 10);
            gameState.skills.forEach(skill => skill.points = 100);
            logToConsoleUI("All stats set to 10 and all skills set to 100.", 'success');
            if (typeof window.renderCharacterInfo === 'function') {
                window.renderCharacterInfo();
            } else if (typeof window.renderTables === 'function') {
                // Fallback if renderCharacterInfo isn't available but renderTables is (e.g. pre-game start)
                window.renderTables(gameState);
            }
            // Also update skill points display if character creator is visible
            const skillPointsElement = document.getElementById('skillPoints');
            if (skillPointsElement && !document.getElementById('character-creator').classList.contains('hidden')) {
                const currentTotalSkills = gameState.skills.reduce((sum, skill) => sum + skill.points, 0);
                const maxSkillPoints = gameState.MAX_SKILL_POINTS || 30; // Use default if not defined
                // This logic is a bit off for maxall, as it implies spending from a pool.
                // For maxall, we are just setting them, so remaining points becomes complex.
                // Let's assume for now we just want to reflect the new values in the character sheet.
                // If skillPoints display is crucial, it might need a dedicated "maxed out" message or recalculation.
                // For now, let's ensure MAX_SKILL_POINTS is respected if we were to calculate remaining.
                // Since we are setting to 100, this will likely exceed MAX_SKILL_POINTS.
                // A simple approach is to set remaining to 0 or a negative number if over.
                skillPointsElement.textContent = Math.max(0, maxSkillPoints - currentTotalSkills);
            }
            break;

        case 'maxhp':
            if (typeof gameState === 'undefined' || !gameState.health) {
                logToConsoleUI("Error: gameState.health not found for player.", 'error');
                break;
            }
            let healed = false;
            for (const partName in gameState.health) {
                const bodyPart = gameState.health[partName];
                if (bodyPart && typeof bodyPart.current === 'number' && typeof bodyPart.max === 'number') {
                    if (bodyPart.current < bodyPart.max) {
                        bodyPart.current = bodyPart.max;
                        healed = true;
                    }
                }
            }
            if (healed) {
                logToConsoleUI("All body part HP set to maximum.", 'success');
            } else {
                logToConsoleUI("Player is already at maximum HP for all body parts.", 'info');
            }
            if (typeof window.renderHealthTable === 'function') {
                window.renderHealthTable(gameState);
            }
            break;

        case 'sethunger':
            if (args.length < 1) {
                logToConsoleUI("Usage: sethunger <value (0-24)>", 'error');
                break;
            }
            const hungerValue = parseInt(args[0], 10);
            if (isNaN(hungerValue)) {
                logToConsoleUI("Error: Hunger value must be a number.", 'error');
                break;
            }
            const maxInternalHunger = 24;
            gameState.playerHunger = Math.max(0, Math.min(maxInternalHunger, hungerValue));
            logToConsoleUI(`Player hunger set to ${gameState.playerHunger}/${maxInternalHunger}.`, 'success');
            if (typeof window.updatePlayerStatusDisplay === 'function') {
                window.updatePlayerStatusDisplay();
            }
            break;

        case 'setthirst':
            if (args.length < 1) {
                logToConsoleUI("Usage: setthirst <value (0-24)>", 'error');
                break;
            }
            const thirstValue = parseInt(args[0], 10);
            if (isNaN(thirstValue)) {
                logToConsoleUI("Error: Thirst value must be a number.", 'error');
                break;
            }
            const maxInternalThirst = 24;
            gameState.playerThirst = Math.max(0, Math.min(maxInternalThirst, thirstValue));
            logToConsoleUI(`Player thirst set to ${gameState.playerThirst}/${maxInternalThirst}.`, 'success');
            if (typeof window.updatePlayerStatusDisplay === 'function') {
                window.updatePlayerStatusDisplay();
            }
            break;

        case 'settime':
            if (args.length < 1) {
                logToConsoleUI("Usage: settime <HH:MM>", 'error');
                break;
            }
            const timeParts = args[0].split(':');
            if (timeParts.length !== 2) {
                logToConsoleUI("Error: Time must be in HH:MM format.", 'error');
                break;
            }
            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);

            if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                logToConsoleUI("Error: Invalid time. Hours must be 0-23 and minutes 0-59.", 'error');
                break;
            }

            gameState.currentTime.hours = hours;
            gameState.currentTime.minutes = minutes;
            // Ensure minutesAccumulatedForHourTick is reset or consistent if time is jumped significantly.
            // For simplicity, let's reset it, assuming a jump might skip over natural hourly ticks.
            gameState.minutesAccumulatedForHourTick = 0;

            logToConsoleUI(`Game time set to ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}.`, 'success');
            if (typeof window.updatePlayerStatusDisplay === 'function') {
                window.updatePlayerStatusDisplay();
            }
            break;

        case 'fastforward':
            if (args.length < 1) {
                logToConsoleUI("Usage: fastforward <hours>", 'error');
                break;
            }
            const hoursToForward = parseInt(args[0], 10);
            if (isNaN(hoursToForward) || hoursToForward <= 0) {
                logToConsoleUI("Error: Hours must be a positive number.", 'error');
                break;
            }

            if (typeof TimeManager === 'undefined' || typeof TimeManager.advanceTime !== 'function') {
                logToConsoleUI("Error: TimeManager object or TimeManager.advanceTime function is not available.", 'error');
                break;
            }

            const calculatedTicksToAdvance = hoursToForward * TimeManager.MINUTES_PER_HOUR * TimeManager.TICKS_PER_MINUTE;
            logToConsoleUI(`Fast forwarding ${hoursToForward} hours (${calculatedTicksToAdvance} game ticks)...`, 'info');

            TimeManager.advanceTime(gameState, calculatedTicksToAdvance);
            // Note: TimeManager.advanceTime handles internal hourly/daily processing.
            // Damage from needs is handled by the main game loop after time advancement.

            logToConsoleUI(`Fast forward complete. Advanced ${hoursToForward} hours.`, 'success');
            // updatePlayerStatusDisplay is called by TimeManager.advanceTime if window.updatePlayerStatusDisplay exists.
            // No need to call it explicitly here unless TimeManager's call is removed.
            if (typeof window.updatePlayerStatusDisplay === 'function') { // This is redundant if TimeManager calls it. Kept for safety during refactor.
                window.updatePlayerStatusDisplay();
            }
            // Health table might need an update if damage was taken due to starvation/dehydration
            if (typeof window.renderHealthTable === 'function') {
                window.renderHealthTable(gameState);
            }
            break;

        case 'aggroall':
            if (typeof gameState === 'undefined' || !gameState.npcs || !gameState.player) {
                logToConsoleUI("Error: gameState.npcs or gameState.player not found.", 'error');
                break;
            }
            let hostileNpcCount = 0;
            gameState.npcs.forEach(npc => {
                // Ensure NPC is alive and not on player's team (assuming teamId 1 is player team)
                if (npc.health && npc.health.torso && npc.health.torso.current > 0 &&
                    npc.teamId !== gameState.player.teamId) {
                    if (!npc.aggroList) {
                        npc.aggroList = [];
                    }
                    // Remove existing player entry if any, to avoid duplicates
                    npc.aggroList = npc.aggroList.filter(entry => entry.entityRef !== gameState);
                    // Add player with high threat
                    npc.aggroList.push({ entityRef: gameState, threat: 1000 });
                    // Sort by threat descending
                    npc.aggroList.sort((a, b) => b.threat - a.threat);
                    hostileNpcCount++;
                }
            });
            if (hostileNpcCount > 0) {
                logToConsoleUI(`Made ${hostileNpcCount} NPC(s) hostile towards the player.`, 'success');
                // If not in combat, and there are hostiles, consider starting combat
                // This is a complex interaction, for now, just setting aggro.
                // Combat typically starts when player attacks or is detected.
            } else {
                logToConsoleUI("No suitable NPCs found to make hostile.", 'info');
            }
            break;

        case 'calmall':
            if (typeof gameState === 'undefined' || !gameState.npcs) {
                logToConsoleUI("Error: gameState.npcs not found.", 'error');
                break;
            }
            let calmedNpcCount = 0;
            gameState.npcs.forEach(npc => {
                if (npc.aggroList && npc.aggroList.length > 0) {
                    npc.aggroList = []; // Clear the aggro list
                    calmedNpcCount++;
                }
            });

            // Also clear player's aggro list towards NPCs
            if (gameState.player && gameState.player.aggroList) {
                gameState.player.aggroList = [];
            }

            if (calmedNpcCount > 0) {
                logToConsoleUI(`Calmed ${calmedNpcCount} NPC(s). Player aggro list also cleared.`, 'success');
            } else {
                logToConsoleUI("No NPCs had active aggro to clear. Player aggro list cleared.", 'info');
            }

            if (gameState.isInCombat) {
                if (typeof combatManager !== 'undefined' && typeof combatManager.endCombat === 'function') {
                    combatManager.endCombat(); // This function already logs "Combat Ended."
                    logToConsoleUI("Combat ended due to calmall command.", 'info');
                } else {
                    logToConsoleUI("Error: combatManager.endCombat function not found, but game was in combat.", 'error');
                    // Manually set isInCombat to false as a fallback, though this is not ideal
                    gameState.isInCombat = false;
                }
            }
            break;

        case 'togglevehiclemodui': // Syntax: togglevehiclemodui [vehicle_id]
            const vehicleIdArg = args.length > 0 ? args[0] : null;
            let targetVehicleId = vehicleIdArg;

            if (!targetVehicleId && window.gameState && window.gameState.player && window.gameState.player.isInVehicle) {
                targetVehicleId = window.gameState.player.isInVehicle;
                logToConsoleUI(`No vehicle ID provided, attempting to open UI for current vehicle: ${targetVehicleId}`, 'info');
            } else if (!targetVehicleId) {
                // Try to find an adjacent vehicle if no ID and not in one
                if (window.gameState && window.gameState.vehicles && window.gameState.playerPos && window.interaction) {
                    // Temporarily use interaction's detection logic (or a simplified version)
                    // This is a bit of a hack for a console command.
                    // A proper game action would use the interaction system.
                    const R = 1; // Interaction radius
                    const { x: px, y: py, z: pz } = window.gameState.playerPos;
                    const currentMap = window.mapRenderer ? window.mapRenderer.getCurrentMapData() : null;

                    if (currentMap) {
                        for (const vehicle of window.gameState.vehicles) {
                            if (vehicle.currentMapId === currentMap.id && vehicle.mapPos.z === pz) {
                                const dist = Math.max(Math.abs(vehicle.mapPos.x - px), Math.abs(vehicle.mapPos.y - py));
                                if (dist <= R) {
                                    targetVehicleId = vehicle.id;
                                    logToConsoleUI(`No vehicle ID provided and not in vehicle. Found adjacent vehicle: ${vehicle.name} (ID: ${targetVehicleId}).`, 'info');
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            if (!targetVehicleId) {
                logToConsoleUI("Usage: togglevehiclemodui [vehicle_id]. No vehicle ID provided or found nearby/occupied.", 'error');
                break;
            }

            if (window.VehicleModificationUI && typeof window.VehicleModificationUI.toggle === 'function') {
                window.VehicleModificationUI.toggle(targetVehicleId);
                // UI will log its own open/close status.
            } else {
                logToConsoleUI("Error: VehicleModificationUI not available or toggle function missing.", 'error');
            }
            break;

        case 'spawnvehicle': // Syntax: spawnvehicle <templateId> [x y z]
            if (args.length < 1) {
                logToConsoleUI("Usage: spawnvehicle <templateId> [x y z]", 'error');
                break;
            }
            const vehicleTemplateId = args[0];
            let spawnPosX, spawnPosY, spawnPosZ;

            if (args.length >= 4) {
                spawnPosX = parseInt(args[1], 10);
                spawnPosY = parseInt(args[2], 10);
                spawnPosZ = parseInt(args[3], 10);
                if (isNaN(spawnPosX) || isNaN(spawnPosY) || isNaN(spawnPosZ)) {
                    logToConsoleUI("Error: X, Y, and Z coordinates must be numbers.", 'error');
                    break;
                }
            } else {
                if (typeof gameState === 'undefined' || !gameState.playerPos) {
                    logToConsoleUI("Error: Player position not available for default spawn location.", 'error');
                    break;
                }
                spawnPosX = gameState.playerPos.x;
                spawnPosY = gameState.playerPos.y;
                spawnPosZ = gameState.playerPos.z;
            }

            if (typeof window.vehicleManager === 'undefined' || typeof window.vehicleManager.spawnVehicle !== 'function') {
                logToConsoleUI("Error: vehicleManager not available or spawnVehicle function missing.", 'error');
                break;
            }

            // Get current map ID
            let currentMapId;
            if (window.mapRenderer && typeof window.mapRenderer.getCurrentMapData === 'function') {
                const currentMapData = window.mapRenderer.getCurrentMapData();
                if (currentMapData && currentMapData.id) {
                    currentMapId = currentMapData.id;
                }
            }
            if (!currentMapId) {
                // Fallback or default if map ID cannot be determined through mapRenderer
                if (gameState && gameState.currentMapId) {
                    currentMapId = gameState.currentMapId;
                } else {
                    logToConsoleUI("Error: Could not determine current map ID.", 'error');
                    break;
                }
            }


            const spawnedVehicleId = window.vehicleManager.spawnVehicle(vehicleTemplateId, currentMapId, { x: spawnPosX, y: spawnPosY, z: spawnPosZ });

            if (spawnedVehicleId) {
                const spawnedVehicle = window.vehicleManager.getVehicleById(spawnedVehicleId);
                logToConsoleUI(`Spawned vehicle "${spawnedVehicle ? spawnedVehicle.name : vehicleTemplateId}" (ID: ${spawnedVehicleId}) at (${spawnPosX},${spawnPosY},${spawnPosZ}) on map ${currentMapId}.`, 'success');
                if (typeof window.mapRenderer !== 'undefined' && typeof window.mapRenderer.scheduleRender === 'function') {
                    window.mapRenderer.scheduleRender(); // Re-render to show the new vehicle
                }
            } else {
                logToConsoleUI(`Failed to spawn vehicle with template ID "${vehicleTemplateId}". Check template ID and game state.`, 'error');
            }
            break;

        // ... (other command cases) ...
        case 'explosion':
            if (args.length < 4) {
                logToConsoleUI("Usage: explosion <x> <y> <radius> <damage> [damageType]", 'error');
                break;
            }
            const ex = parseInt(args[0], 10);
            const ey = parseInt(args[1], 10);
            const radius = parseInt(args[2], 10);
            const damage = args[3];
            const damageType = args[4] || 'Explosive';

            if (isNaN(ex) || isNaN(ey) || isNaN(radius)) {
                logToConsoleUI("Error: X, Y, and Radius must be numbers.", 'error');
                break;
            }

            if (typeof combatManager !== 'undefined' && typeof combatManager.handleExplosion === 'function') {
                combatManager.handleExplosion(ex, ey, radius, damage, damageType);
            } else {
                logToConsoleUI("Error: combatManager.handleExplosion function not available.", 'error');
            }
            break;

        case 'runtests':
            const suiteName = args.length > 0 ? args[0].toLowerCase() : 'all';
            if (suiteName === 'progression' || suiteName === 'all') {
                if (typeof window.runProgressionSystemTests === 'function') {
                    logToConsoleUI("Running progression system tests...", 'info');
                    window.runProgressionSystemTests();
                } else {
                    logToConsoleUI("Error: 'runProgressionSystemTests' function not found. Ensure progression_tests.js is loaded.", 'error');
                }
            } else {
                logToConsoleUI(`Unknown test suite: '${suiteName}'. Available suites: 'progression'.`, 'error');
            }
            break;

        default:
            logToConsoleUI(`Unknown command: ${command}. Type 'help' for list of commands.`, 'error'); // Direct call
            break;
    }
}

// --- Autocomplete Suggestions ---
let suggestions = [];
let suggestionIndex = -1;

function updateSuggestions(inputValue) {
    const parts = inputValue.split(' ');
    const command = parts[0].toLowerCase();
    const currentArg = parts.length > 1 ? parts[parts.length - 1] : '';

    if (parts.length === 1) {
        // Command suggestions
        suggestions = Object.keys(commandHelpInfo).filter(cmd => cmd.includes(command));
    } else {
        // Argument suggestions
        switch (command) {
            case 'additem':
            case 'removeitem':
            case 'placeitem':
                suggestions = Object.keys(window.assetManager.itemsById).filter(id => id.toLowerCase().includes(currentArg.toLowerCase()));
                break;
            case 'spawnnpc':
                suggestions = Object.keys(window.assetManager.npcsById).filter(id => id.toLowerCase().includes(currentArg.toLowerCase()));
                break;
            // Add more cases for other commands that need argument suggestions
            default:
                suggestions = [];
        }
    }
    suggestionIndex = -1; // Reset selection
    showSuggestions();
}

function showSuggestions() {
    const suggestionsBox = document.getElementById('consoleSuggestions');
    if (!suggestionsBox) return;

    suggestionsBox.innerHTML = '';
    if (suggestions.length > 0) {
        suggestionsBox.style.display = 'block';
        suggestions.forEach((suggestion, index) => {
            const div = document.createElement('div');
            div.textContent = suggestion;
            div.classList.add('suggestion-item');
            if (index === suggestionIndex) {
                div.classList.add('selected');
            }
            div.addEventListener('click', () => {
                const parts = consoleInputElement.value.split(' ');
                parts[parts.length - 1] = suggestion;
                consoleInputElement.value = parts.join(' ') + ' ';
                suggestionsBox.style.display = 'none';
                consoleInputElement.focus();
            });
            suggestionsBox.appendChild(div);
        });
    } else {
        suggestionsBox.style.display = 'none';
    }
}

function handleAutocomplete() {
    if (suggestions.length > 0) {
        if (suggestionIndex === -1) suggestionIndex = 0;
        const parts = consoleInputElement.value.split(' ');
        parts[parts.length - 1] = suggestions[suggestionIndex];
        consoleInputElement.value = parts.join(' ') + ' ';
        updateSuggestions(consoleInputElement.value);
    }
}

function navigateSuggestions(direction) {
    if (suggestions.length > 0) {
        if (direction === 'up') {
            suggestionIndex = (suggestionIndex > 0) ? suggestionIndex - 1 : suggestions.length - 1;
        } else {
            suggestionIndex = (suggestionIndex < suggestions.length - 1) ? suggestionIndex + 1 : 0;
        }
        showSuggestions();
    }
}


// Expose functions to global scope for other scripts to use
window.processConsoleCommand = processConsoleCommand;
window.logToConsoleUI = logToConsoleUI;
window.updateSuggestions = updateSuggestions;
window.handleAutocomplete = handleAutocomplete;
window.navigateSuggestions = navigateSuggestions;


console.log("js/console.js loaded and core functions/state exposed to window.");