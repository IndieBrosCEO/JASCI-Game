// js/console.js

// References to console UI elements (now sourced from global scope, e.g., script.js)
// const gameConsoleElement = document.getElementById('gameConsole');
// const consoleOutputElement = document.getElementById('consoleOutput');
// const consoleInputElement = document.getElementById('consoleInput');

// Function to log messages to the console UI
function logToConsoleUI(message, type = 'info') {
    const consoleOutputElement = document.getElementById('consoleOutput');
    if (!consoleOutputElement) {
        console.error("Console output element not found by logToConsoleUI.");
        return;
    }

    const entry = document.createElement('div');
    entry.textContent = message;

    // Handle types
    switch (type) {
        case 'error':
            entry.style.color = 'red';
            // Throttle error sounds to avoid "machine gun" effect
            if (window.audioManager) {
                const now = Date.now();
                if (!window.lastErrorSoundTime || now - window.lastErrorSoundTime > 200) {
                    window.audioManager.playUiSound('ui_error_01.wav');
                    window.lastErrorSoundTime = now;
                }
            }
            break;
        case 'success':
            entry.style.color = 'lightgreen';
            break;
        case 'echo':
            entry.style.color = 'lightblue';
            break;
        case 'warn':
        case 'orange':
            entry.style.color = 'orange';
            break;
        case 'lime':
            entry.style.color = 'lime';
            break;
        case 'info':
        default:
            entry.style.color = '#88ddff'; // Light blue for general info
            break;
    }

    consoleOutputElement.appendChild(entry);
    consoleOutputElement.scrollTop = consoleOutputElement.scrollHeight; // Auto-scroll

    // Limit log history to prevent DOM bloat
    while (consoleOutputElement.childElementCount > 100) {
        consoleOutputElement.removeChild(consoleOutputElement.firstChild);
    }
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
    'spawn_gas': {
        syntax: 'spawn_gas <type> <duration> [density]',
        description: 'Spawns a gas cloud at player position. Types: smoke, tear_gas, mustard_gas, steam.'
    },
    'explosion': {
        syntax: 'explosion <x> <y> <z> <radius> <damage> [damageType]',
    description: 'Creates an explosion at x,y,z with a radius, damage (e.g., "3d6"), and optional damage type.'
    },
    'runtests': {
        syntax: 'runtests [suite_name]',
        description: 'Runs automated tests. Currently available: "progression".'
    },
    'addxp': {
        syntax: 'addxp <amount>',
        description: 'Adds the specified amount of XP to the player.'
    },
    'setxp': {
        syntax: 'setxp <amount>',
        description: 'Sets the player\'s total XP to the specified amount.'
    },
    'benchmark': {
        syntax: 'benchmark [maxSize]',
        description: 'Runs a rendering performance benchmark. Warning: May freeze game briefly.'
    },
    'harvest_help': {
        syntax: 'harvest_help',
        description: 'Displays a tutorial on how to harvest resources.'
    },
    'map': {
        syntax: 'map <mapId>',
        description: 'Loads the specified map.'
    }
};

// Main function to process commands
function processConsoleCommand(commandText) {
    // --- START DEFENSIVE INITIALIZATION ---
    if (typeof window.commandHistory === 'undefined' || !Array.isArray(window.commandHistory)) {
        console.warn("CONSOLE DEBUG: window.commandHistory was undefined or not an array upon entering processConsoleCommand. Re-initializing.");
        if (typeof logToConsoleUI === 'function') {
            logToConsoleUI("DEBUG: commandHistory re-initialized (undefined/not array).", "info");
        }
        window.commandHistory = [];
        window.historyIndex = -1;
    } else if (typeof window.historyIndex === 'undefined' || typeof window.historyIndex !== 'number') {
        console.warn("CONSOLE DEBUG: window.historyIndex was undefined or not a number. Re-initializing.");
        if (typeof logToConsoleUI === 'function') {
            logToConsoleUI("DEBUG: historyIndex re-initialized (undefined/not number).", "info");
        }
        window.historyIndex = window.commandHistory.length;
    }
    // --- END DEFENSIVE INITIALIZATION ---

    logToConsoleUI(`> ${commandText}`, 'echo');

    if (commandText.trim() === '') {
        return;
    }

    if (window.commandHistory.length === 0 || window.commandHistory[window.commandHistory.length - 1] !== commandText) {
        window.commandHistory.push(commandText);
    }
    window.historyIndex = window.commandHistory.length;

    // Use a simpler split that respects quotes could be added here, but staying simple for now as per critique point 7 fix plan is mainly awareness or specific command handling.
    // For setSkill/modSkill we handle spaces manually.
    const parts = commandText.trim().split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
        case 'map':
            if (args.length < 1) {
                logToConsoleUI("Usage: map <mapId>", 'error');
                break;
            }
            const mapIdToLoad = args[0];
            if (window.loadMap) {
                window.loadMap(mapIdToLoad);
            } else {
                logToConsoleUI("Error: window.loadMap function not available.", 'error');
            }
            break;

        case 'help':
            if (args.length === 0) {
                logToConsoleUI("Available commands:", 'info');
                for (const cmd in commandHelpInfo) {
                    logToConsoleUI(`  ${cmd} - ${commandHelpInfo[cmd].description.split('.')[0]}`, 'info');
                }
                logToConsoleUI("Type 'help <command_name>' for more details on a specific command.", 'info');
            } else {
                const commandNameToHelp = args[0].toLowerCase();
                if (commandHelpInfo[commandNameToHelp]) {
                    const info = commandHelpInfo[commandNameToHelp];
                    logToConsoleUI(`Help for command: ${commandNameToHelp}`, 'info');
                    logToConsoleUI(`  Syntax: ${info.syntax}`, 'info');
                    logToConsoleUI(`  Description: ${info.description}`, 'info');
                } else {
                    logToConsoleUI(`No help available for command: ${commandNameToHelp}. Type 'help' for a list of commands.`, 'error');
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

            if (typeof window.assetManager === 'undefined' || typeof window.assetManager.getTileset !== 'function') {
                logToConsoleUI("Error: assetManager or getTileset function not available.", 'error');
                break;
            }

            if (tileId !== "" && tileId !== " " && !window.assetManager.tilesets[tileId]) {
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
                if (gameState.tileCache && gameState.tileCache[y] && gameState.tileCache[y][x]) {
                    gameState.tileCache[y][x] = null;
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

        case 'clear':
            const consoleOutputElement = document.getElementById('consoleOutput');
            if (consoleOutputElement) {
                consoleOutputElement.innerHTML = '';
                logToConsoleUI("Console cleared.", "info");
            }
            break;

        case 'additem': // Syntax: addItem <itemId> [quantity]
            if (args.length < 1) {
                logToConsoleUI("Usage: addItem <itemId> [quantity]", 'error');
                break;
            }
            const itemIdToAdd = args[0];
            const quantityToAdd = args[1] ? parseInt(args[1], 10) : 1;

            if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
                logToConsoleUI("Quantity must be a positive number.", 'error');
                break;
            }

            if (typeof window.assetManager === 'undefined') {
                logToConsoleUI("Error: assetManager not found.", 'error');
                break;
            }
            const itemDef = window.assetManager.getItem(itemIdToAdd);

            if (!itemDef) {
                logToConsoleUI(`Error: Item ID '${itemIdToAdd}' not found.`, 'error');
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
            if (window.inventoryManager && typeof window.inventoryManager.updateInventoryUI === 'function') {
                window.inventoryManager.updateInventoryUI();
            }
            break;

        case 'teleport': // Syntax: teleport <x> <y> <z>
            if (args.length < 3) {
                logToConsoleUI("Usage: teleport <x> <y> <z>", 'error');
                break;
            }
            const targetX = parseInt(args[0], 10);
            const targetY = parseInt(args[1], 10);
            const targetZ = parseInt(args[2], 10);

            if (isNaN(targetX) || isNaN(targetY) || isNaN(targetZ)) {
                logToConsoleUI("Error: X, Y, and Z coordinates must be numbers.", 'error');
                break;
            }

            if (typeof gameState === 'undefined' || !gameState.playerPos) {
                logToConsoleUI("Error: gameState.playerPos not found.", 'error');
                break;
            }

            const mapData = window.mapRenderer?.getCurrentMapData();
            if (!mapData || !mapData.levels || !mapData.levels[targetZ.toString()]) {
                logToConsoleUI(`Error: Z-level ${targetZ} does not exist in the current map. Teleport aborted.`, 'error');
                break;
            }

            if (mapData.dimensions) {
                if (targetX < 0 || targetX >= mapData.dimensions.width || targetY < 0 || targetY >= mapData.dimensions.height) {
                    logToConsoleUI(`Error: Coordinates (${targetX},${targetY}) are out of map bounds for Z-level ${targetZ}. Max X: ${mapData.dimensions.width - 1}, Max Y: ${mapData.dimensions.height - 1}. Teleport aborted.`, 'error');
                    break;
                }
            } else {
                logToConsoleUI("Warning: Map dimensions not found. Cannot validate teleport coordinates against bounds.", "orange");
            }


            gameState.playerPos.x = targetX;
            gameState.playerPos.y = targetY;
            gameState.playerPos.z = targetZ;

            gameState.currentViewZ = targetZ;
            gameState.viewFollowsPlayerZ = true;

            if (window.audioManager) window.audioManager.updateListenerPosition(gameState.playerPos.x, gameState.playerPos.y, gameState.playerPos.z);

            logToConsoleUI(`Player teleported to (${targetX}, ${targetY}, Z:${targetZ}). View synced.`, 'success');

            if (typeof window.mapRenderer !== 'undefined' && typeof window.mapRenderer.scheduleRender === 'function') {
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
            if (typeof gameState === 'undefined' || !gameState.health) {
                logToConsoleUI("Error: gameState.health not found for player.", 'error');
                break;
            }

            let healAmount = -1;
            if (args.length > 0) {
                healAmount = parseInt(args[0], 10);
                if (isNaN(healAmount) || healAmount <= 0) {
                    logToConsoleUI("Error: Heal amount must be a positive number.", 'error');
                    break;
                }
            }

            let totalHealed = 0;
            for (const partName in gameState.health) {
                const bodyPart = gameState.health[partName];
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
                logToConsoleUI(`Player healed for a total of ${totalHealed} health points across body parts.`, 'success');
            } else if (healAmount !== -1) {
                logToConsoleUI("Player is already at or above specified health for affected parts, or no damage to heal by that amount.", 'info');
            } else {
                logToConsoleUI("Player is already at full health.", 'info');
            }

            if (typeof window.renderHealthTable === 'function') {
                window.renderHealthTable(gameState.player);
            } else if (typeof window.renderCharacterInfo === 'function') {
                window.renderCharacterInfo();
            }
            break;

        case 'removeitem': // Syntax: removeItem <itemId> [quantity]
            if (args.length < 1) {
                logToConsoleUI("Usage: removeItem <itemId> [quantity]", 'error');
                break;
            }
            const itemIdToRemove = args[0];
            const quantityToRemove = args[1] ? parseInt(args[1], 10) : 1;

            if (isNaN(quantityToRemove) || quantityToRemove <= 0) {
                logToConsoleUI("Quantity must be a positive number.", 'error');
                break;
            }

            if (typeof window.assetManager === 'undefined') {
                logToConsoleUI("Error: assetManager not found for removeItem.", 'error');
                break;
            }
            const itemToRemoveDef = window.assetManager.getItem(itemIdToRemove);
            const itemNameToRemove = itemToRemoveDef ? itemToRemoveDef.name : itemIdToRemove;

            let itemsRemovedCount = 0;
            if (typeof window.removeItem === 'function') {
                // removeItem logic in inventoryManager typically removes by ID or Name.
                // Using inventoryManager directly if available is safer.
                if (window.inventoryManager && typeof window.inventoryManager.removeItem === 'function') {
                    // Try removing by ID first
                    const removedItemDef = window.inventoryManager.removeItem(itemIdToRemove, quantityToRemove);
                    if (removedItemDef) {
                        logToConsoleUI(`Successfully removed ${quantityToRemove}x '${removedItemDef.name || itemIdToRemove}'.`, 'success');
                    } else {
                        logToConsoleUI(`Item '${itemIdToRemove}' not found in inventory or could not be removed.`, 'error');
                    }
                } else {
                    logToConsoleUI("Error: inventoryManager.removeItem function not available.", 'error');
                }
            } else {
                // Fallback to window.removeItem if defined (deprecated path)
                logToConsoleUI("Error: removeItem function not available on window or inventoryManager.", 'error');
            }
            break;

        case 'clearinventory':
            if (typeof gameState !== 'undefined' && gameState.inventory && gameState.inventory.container) {
                // First unequip everything to be safe
                if (gameState.inventory.handSlots) {
                    if (window.inventoryManager && window.inventoryManager.unequipItem) {
                        window.inventoryManager.unequipItem(0);
                        window.inventoryManager.unequipItem(1);
                    }
                    gameState.inventory.handSlots = [null, null];
                }

                gameState.inventory.container.items = [];

                logToConsoleUI("Inventory cleared.", 'success');
                if (window.inventoryManager && typeof window.inventoryManager.updateInventoryUI === 'function') {
                    window.inventoryManager.updateInventoryUI();
                }
            } else {
                logToConsoleUI("Error: Inventory data not found.", 'error');
            }
            break;

        case 'spawnnpc': // Syntax: spawnNpc <npcId> <x> <y> [z]
            if (args.length < 3) {
                logToConsoleUI("Usage: spawnNpc <npcId> <x> <y> [z]", 'error');
                break;
            }
            const npcIdToSpawn = args[0];
            const spawnX = parseInt(args[1], 10);
            const spawnY = parseInt(args[2], 10);
            const spawnZ = args[3] ? parseInt(args[3], 10) : 0;

            if (isNaN(spawnX) || isNaN(spawnY) || isNaN(spawnZ)) {
                logToConsoleUI("Error: X, Y and Z coordinates must be numbers.", 'error');
                break;
            }

            if (typeof window.assetManager === 'undefined' || typeof window.assetManager.getNpc !== 'function') {
                logToConsoleUI("Error: assetManager or assetManager.getNpc function not found.", 'error');
                break;
            }
            const npcDef = window.assetManager.getNpc(npcIdToSpawn);

            if (!npcDef) {
                logToConsoleUI(`Error: NPC definition for ID '${npcIdToSpawn}' not found.`, 'error');
                break;
            }

            const newNpc = JSON.parse(JSON.stringify(npcDef));
            // Generate a unique ID to prevent collisions
            newNpc.id = `spawned_${npcIdToSpawn}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            newNpc.mapPos = { x: spawnX, y: spawnY, z: spawnZ };

            if (typeof window.initializeHealth === 'function') {
                window.initializeHealth(newNpc);
            } else {
                if (!newNpc.health) {
                    newNpc.health = {
                        head: { max: 5, current: 5, armor: 0, crisisTimer: 0 },
                        torso: { max: 8, current: 8, armor: 0, crisisTimer: 0 },
                    };
                    logToConsoleUI("Warning: initializeHealth function not found. Using basic default health for spawned NPC.", "info");
                }
            }

            if (newNpc.aggroList === undefined) {
                newNpc.aggroList = [];
            }

            if (newNpc.teamId === undefined) {
                logToConsoleUI(`Warning: NPC '${npcIdToSpawn}' spawned without a teamId. Defaulting to 2.`, "info");
                newNpc.teamId = 2;
            }

            if (typeof gameState !== 'undefined' && gameState.npcs) {
                gameState.npcs.push(newNpc);
                logToConsoleUI(`Spawned NPC '${newNpc.name || npcIdToSpawn}' at (${spawnX}, ${spawnY}) with ID ${newNpc.id}.`, 'success');
                if (typeof window.mapRenderer !== 'undefined' && typeof window.mapRenderer.scheduleRender === 'function') {
                    window.mapRenderer.scheduleRender();
                }
            } else {
                logToConsoleUI("Error: gameState.npcs array not found.", 'error');
            }
            break;

        case 'removenpc': // Syntax: removeNpc <npcIdOrName>
            if (args.length < 1) {
                logToConsoleUI("Usage: removeNpc <npcIdOrName>", 'error');
                break;
            }
            const identifierToRemove = args.join(" ").toLowerCase();

            if (typeof gameState !== 'undefined' && gameState.npcs) {
                const initialNpcCount = gameState.npcs.length;
                const npcIndexToRemove = gameState.npcs.findIndex(npc =>
                    (npc.id && npc.id.toLowerCase() === identifierToRemove) ||
                    (npc.name && npc.name.toLowerCase() === identifierToRemove)
                );

                if (npcIndexToRemove !== -1) {
                    const removedNpc = gameState.npcs.splice(npcIndexToRemove, 1)[0];
                    logToConsoleUI(`Removed NPC '${removedNpc.name || removedNpc.id}'.`, 'success');
                    if (typeof window.mapRenderer !== 'undefined' && typeof window.mapRenderer.scheduleRender === 'function') {
                        window.mapRenderer.scheduleRender();
                    }
                } else {
                    logToConsoleUI(`NPC with ID or name '${identifierToRemove}' not found.`, 'error');
                }
            } else {
                logToConsoleUI("Error: gameState.npcs array not found.", 'error');
            }
            break;

        case 'killnpcs': // Syntax: killNpcs [npcId]
            const targetKillId = args.length > 0 ? args[0].toLowerCase() : null;
            let killedCount = 0;

            if (typeof gameState !== 'undefined' && gameState.npcs) {
                // Use a copy of the array because applying damage might remove them from the array if they die
                const npcsToKill = gameState.npcs.filter(npc => targetKillId === null || (npc.id && npc.id.toLowerCase() === targetKillId));

                npcsToKill.forEach(npc => {
                    if (window.combatManager && typeof window.combatManager.applyDamage === 'function') {
                        // Kill gracefully via combat manager
                        window.combatManager.applyDamage(gameState, npc, 'torso', 9999, 'Bludgeoning', { name: "Console Command" });
                        killedCount++;
                    } else {
                        // Fallback hard kill
                        if (npc.health && npc.health.torso) {
                            npc.health.torso.current = 0;
                            if (npc.health.head) npc.health.head.current = 0;
                            // Trigger manual cleanup if needed or just leave them at 0 HP
                            killedCount++;
                        }
                    }
                });

                if (killedCount > 0) {
                    logToConsoleUI(`Killed ${killedCount} NPC(s).`, 'success');
                    if (typeof window.mapRenderer !== 'undefined' && typeof window.mapRenderer.scheduleRender === 'function') {
                        window.mapRenderer.scheduleRender();
                    }
                } else if (targetKillId) {
                    logToConsoleUI(`No NPCs of ID '${targetKillId}' found to kill.`, 'info');
                } else {
                    logToConsoleUI("No NPCs found to kill.", 'info');
                }
            } else {
                logToConsoleUI("Error: gameState.npcs array not found.", 'error');
            }
            break;

        case 'setstat': // Syntax: setstat <statName> <value>
            if (args.length < 2) {
                logToConsoleUI("Usage: setStat <statName> <value>", 'error');
                break;
            }
            const statNameToSet = args[0].toLowerCase();
            const statValueToSet = parseInt(args[1], 10);

            if (isNaN(statValueToSet)) {
                logToConsoleUI("Error: Value must be a number.", 'error');
                break;
            }

            if (typeof gameState === 'undefined' || !gameState.stats) {
                logToConsoleUI("Error: gameState.stats not found.", 'error');
                break;
            }

            const statToSet = gameState.stats.find(s => s.name.toLowerCase() === statNameToSet);
            if (!statToSet) {
                logToConsoleUI(`Error: Stat '${args[0]}' not found.`, 'error');
                break;
            }

            statToSet.points = statValueToSet;

            logToConsoleUI(`Set stat '${statToSet.name}' to ${statToSet.points}. (No cap applied by console)`, 'success');
            if (typeof window.renderCharacterInfo === 'function') {
                window.renderCharacterInfo();
            } else if (typeof window.renderTables === 'function') {
                window.renderTables(gameState);
            }
            break;

        case 'modstat': // Syntax: modstat <statName> <amount>
            if (args.length < 2) {
                logToConsoleUI("Usage: modStat <statName> <amount>", 'error');
                break;
            }
            const statNameToMod = args[0].toLowerCase();
            const statAmountToMod = parseInt(args[1], 10);

            if (isNaN(statAmountToMod)) {
                logToConsoleUI("Error: Amount must be a number.", 'error');
                break;
            }

            if (typeof gameState === 'undefined' || !gameState.stats) {
                logToConsoleUI("Error: gameState.stats not found.", 'error');
                break;
            }

            const statToMod = gameState.stats.find(s => s.name.toLowerCase() === statNameToMod);
            if (!statToMod) {
                logToConsoleUI(`Error: Stat '${args[0]}' not found.`, 'error');
                break;
            }

            statToMod.points += statAmountToMod;

            logToConsoleUI(`Modified stat '${statToMod.name}' by ${statAmountToMod}. New value: ${statToMod.points}. (No cap applied by console)`, 'success');
            if (typeof window.renderCharacterInfo === 'function') {
                window.renderCharacterInfo();
            } else if (typeof window.renderTables === 'function') {
                window.renderTables(gameState);
            }
            break;

        case 'resetstats':
            if (typeof gameState === 'undefined' || !gameState.stats) {
                logToConsoleUI("Error: gameState.stats not found.", 'error');
                break;
            }
            const defaultStatValue = 3;
            gameState.stats.forEach(stat => {
                stat.points = defaultStatValue;
            });
            logToConsoleUI("All stats reset to default.", 'success');
            if (typeof window.renderCharacterInfo === 'function') {
                window.renderCharacterInfo();
            } else if (typeof window.renderTables === 'function') {
                window.renderTables(gameState);
            }
            break;

        case 'setskill': // Syntax: setskill <skillName> <value>
            if (args.length < 2) {
                logToConsoleUI("Usage: setSkill <skillName> <value>", 'error');
                break;
            }
            const skillValueToSetArg = args[args.length - 1];
            const skillValueToSet = parseInt(skillValueToSetArg, 10);
            const skillNameToSet = args.slice(0, -1).join(" ").toLowerCase();

            if (isNaN(skillValueToSet)) {
                logToConsoleUI("Error: Value must be a number.", 'error');
                break;
            }
            if (!skillNameToSet) {
                logToConsoleUI("Error: Skill name cannot be empty.", 'error');
                break;
            }

            if (typeof gameState === 'undefined' || !gameState.skills) {
                logToConsoleUI("Error: gameState.skills not found.", 'error');
                break;
            }

            const skillToSet = gameState.skills.find(s => s.name.toLowerCase() === skillNameToSet);
            if (!skillToSet) {
                logToConsoleUI(`Error: Skill '${args.slice(0, -1).join(" ")}' not found.`, 'error');
                break;
            }

            skillToSet.points = skillValueToSet;

            logToConsoleUI(`Set skill '${skillToSet.name}' to ${skillToSet.points}. (No cap applied by console)`, 'success');
            if (typeof window.renderCharacterInfo === 'function') {
                window.renderCharacterInfo();
            } else if (typeof window.renderTables === 'function') {
                window.renderTables(gameState);
            }
            break;

        case 'modskill': // Syntax: modskill <skillName> <amount>
            if (args.length < 2) {
                logToConsoleUI("Usage: modSkill <skillName> <amount>", 'error');
                break;
            }
            const skillAmountToModArg = args[args.length - 1];
            const skillAmountToMod = parseInt(skillAmountToModArg, 10);
            const skillNameToMod = args.slice(0, -1).join(" ").toLowerCase();

            if (isNaN(skillAmountToMod)) {
                logToConsoleUI("Error: Amount must be a number.", 'error');
                break;
            }
            if (!skillNameToMod) {
                logToConsoleUI("Error: Skill name cannot be empty.", 'error');
                break;
            }

            if (typeof gameState === 'undefined' || !gameState.skills) {
                logToConsoleUI("Error: gameState.skills not found.", 'error');
                break;
            }

            const skillToMod = gameState.skills.find(s => s.name.toLowerCase() === skillNameToMod);
            if (!skillToMod) {
                logToConsoleUI(`Error: Skill '${args.slice(0, -1).join(" ")}' not found.`, 'error');
                break;
            }

            skillToMod.points += skillAmountToMod;

            logToConsoleUI(`Modified skill '${skillToMod.name}' by ${skillAmountToMod}. New value: ${skillToMod.points}. (No cap applied by console)`, 'success');
            if (typeof window.renderCharacterInfo === 'function') {
                window.renderCharacterInfo();
            } else if (typeof window.renderTables === 'function') {
                window.renderTables(gameState);
            }
            break;

        case 'resetskills':
            if (typeof gameState === 'undefined' || !gameState.skills) {
                logToConsoleUI("Error: gameState.skills not found.", 'error');
                break;
            }
            gameState.skills.forEach(skill => {
                skill.points = 0;
            });
            logToConsoleUI("All skills reset to 0.", 'success');
            if (typeof window.renderCharacterInfo === 'function') {
                window.renderCharacterInfo();
            } else if (typeof window.renderTables === 'function') {
                window.renderTables(gameState);
            }
            break;

        case 'godmode': // Syntax: godmode [on|off]
            if (typeof gameState === 'undefined' || !gameState.player) {
                logToConsoleUI("Error: gameState.player not found.", 'error');
                break;
            }
            if (typeof gameState.player.isGodMode === 'undefined') {
                gameState.player.isGodMode = false;
            }

            let godModeState;
            if (args.length > 0) {
                if (args[0].toLowerCase() === 'on') {
                    godModeState = true;
                } else if (args[0].toLowerCase() === 'off') {
                    godModeState = false;
                } else {
                    logToConsoleUI("Usage: godmode [on|off]", 'error');
                    break;
                }
                gameState.player.isGodMode = godModeState;
            } else {
                gameState.player.isGodMode = !gameState.player.isGodMode;
            }

            logToConsoleUI(`God mode ${gameState.player.isGodMode ? "enabled" : "disabled"}.`, 'success');
            break;

        case 'noclip': // Syntax: noclip [on|off]
            if (typeof gameState === 'undefined' || !gameState.player) {
                logToConsoleUI("Error: gameState.player not found.", 'error');
                break;
            }
            if (typeof gameState.player.noClipEnabled === 'undefined') {
                gameState.player.noClipEnabled = false;
            }

            let noClipState;
            if (args.length > 0) {
                if (args[0].toLowerCase() === 'on') {
                    noClipState = true;
                } else if (args[0].toLowerCase() === 'off') {
                    noClipState = false;
                } else {
                    logToConsoleUI("Usage: noclip [on|off]", 'error');
                    break;
                }
                gameState.player.noClipEnabled = noClipState;
            } else {
                gameState.player.noClipEnabled = !gameState.player.noClipEnabled;
            }

            logToConsoleUI(`Noclip mode ${gameState.player.noClipEnabled ? "enabled" : "disabled"}.`, 'success');
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
                window.renderTables(gameState);
            }
            const skillPointsElement = document.getElementById('skillPoints');
            if (skillPointsElement && document.getElementById('character-creator') && !document.getElementById('character-creator').classList.contains('hidden')) {
                const currentTotalSkills = gameState.skills.reduce((sum, skill) => sum + skill.points, 0);
                const maxSkillPoints = gameState.MAX_SKILL_POINTS || 30;
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
                window.renderHealthTable(gameState.player);
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

            if (typeof window.TimeManager === 'undefined' || typeof window.TimeManager.advanceTime !== 'function') {
                logToConsoleUI("Error: TimeManager object or TimeManager.advanceTime function is not available.", 'error');
                break;
            }

            const calculatedTicksToAdvance = hoursToForward * window.TimeManager.MINUTES_PER_HOUR * window.TimeManager.TICKS_PER_MINUTE;
            logToConsoleUI(`Fast forwarding ${hoursToForward} hours (${calculatedTicksToAdvance} game ticks)...`, 'info');

            window.TimeManager.advanceTime(gameState, calculatedTicksToAdvance);

            logToConsoleUI(`Fast forward complete. Advanced ${hoursToForward} hours.`, 'success');
            if (typeof window.updatePlayerStatusDisplay === 'function') {
                window.updatePlayerStatusDisplay();
            }
            if (typeof window.renderHealthTable === 'function') {
                window.renderHealthTable(gameState.player);
            }
            break;

        case 'aggroall':
            if (typeof gameState === 'undefined' || !gameState.npcs || !gameState.player) {
                logToConsoleUI("Error: gameState.npcs or gameState.player not found.", 'error');
                break;
            }
            let hostileNpcCount = 0;
            gameState.npcs.forEach(npc => {
                if (npc.health && npc.health.torso && npc.health.torso.current > 0 &&
                    npc.teamId !== gameState.player.teamId) {
                    if (!npc.aggroList) {
                        npc.aggroList = [];
                    }
                    npc.aggroList = npc.aggroList.filter(entry => entry.entityRef !== gameState);
                    npc.aggroList.push({ entityRef: gameState, threat: 1000 });
                    npc.aggroList.sort((a, b) => b.threat - a.threat);
                    hostileNpcCount++;
                }
            });
            if (hostileNpcCount > 0) {
                logToConsoleUI(`Made ${hostileNpcCount} NPC(s) hostile towards the player.`, 'success');
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
                    npc.aggroList = [];
                    calmedNpcCount++;
                }
            });

            if (gameState.player && gameState.player.aggroList) {
                gameState.player.aggroList = [];
            }

            if (calmedNpcCount > 0) {
                logToConsoleUI(`Calmed ${calmedNpcCount} NPC(s). Player aggro list also cleared.`, 'success');
            } else {
                logToConsoleUI("No NPCs had active aggro to clear. Player aggro list cleared.", 'info');
            }

            if (gameState.isInCombat) {
                if (typeof window.combatManager !== 'undefined' && typeof window.combatManager.endCombat === 'function') {
                    window.combatManager.endCombat();
                    logToConsoleUI("Combat ended due to calmall command.", 'info');
                } else {
                    logToConsoleUI("Error: combatManager.endCombat function not found, but game was in combat.", 'error');
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
                if (window.gameState && window.gameState.vehicles && window.gameState.playerPos && window.interaction) {
                    const R = 1;
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

            let currentMapId;
            if (window.mapRenderer && typeof window.mapRenderer.getCurrentMapData === 'function') {
                const currentMapData = window.mapRenderer.getCurrentMapData();
                if (currentMapData && currentMapData.id) {
                    currentMapId = currentMapData.id;
                }
            }
            if (!currentMapId) {
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
                    window.mapRenderer.scheduleRender();
                }
            } else {
                logToConsoleUI(`Failed to spawn vehicle with template ID "${vehicleTemplateId}". Check template ID and game state.`, 'error');
            }
            break;

        case 'spawn_gas':
            if (args.length < 2) {
                logToConsoleUI("Usage: spawn_gas <type> <duration> [density]", 'error');
                break;
            }
            const gasType = args[0];
            const gasDuration = parseInt(args[1], 10);
            const gasDensity = args[2] ? parseFloat(args[2]) : 1.0;

            if (isNaN(gasDuration)) {
                logToConsoleUI("Error: Duration must be a number.", 'error');
                break;
            }

            if (window.gasManager && window.gameState.playerPos) {
                window.gasManager.spawnGas(window.gameState.playerPos.x, window.gameState.playerPos.y, window.gameState.playerPos.z, gasType, gasDuration, gasDensity);
                logToConsoleUI(`Spawned ${gasType} cloud for ${gasDuration} turns.`, 'success');
            } else {
                logToConsoleUI("Error: GasManager not available or player position unknown.", 'error');
            }
            break;

        case 'explosion':
            if (args.length < 5) {
                logToConsoleUI("Usage: explosion <x> <y> <z> <radius> <damage> [damageType]", 'error');
                break;
            }
            const ex = parseInt(args[0], 10);
            const ey = parseInt(args[1], 10);
            const ez = parseInt(args[2], 10);
            const radius = parseInt(args[3], 10);
            const damage = args[4];
            const damageType = args[5] || 'Explosive';

            if (isNaN(ex) || isNaN(ey) || isNaN(ez) || isNaN(radius)) {
                logToConsoleUI("Error: X, Y, Z, and Radius must be numbers.", 'error');
                break;
            }

            if (typeof window.combatManager !== 'undefined' && typeof window.combatManager.handleExplosion === 'function') {
                window.combatManager.handleExplosion(ex, ey, ez, radius, damage, damageType);
            } else {
                logToConsoleUI("Error: combatManager.handleExplosion function not available.", 'error');
            }
            break;

        case 'runtests':
            if (typeof window.runProgressionSystemTests === 'function') {
                window.runProgressionSystemTests();
            } else {
                logToConsoleUI("Progression test suite not found.", "error");
            }
            break;

        case 'addxp':
            if (args.length < 1) {
                logToConsoleUI("Usage: addxp <amount>", 'error');
                break;
            }
            const xpToAdd = parseInt(args[0], 10);
            if (isNaN(xpToAdd)) {
                logToConsoleUI("Error: Amount must be a number.", 'error');
                break;
            }
            window.xpManager.awardXp('addxp_command', xpToAdd);
            logToConsoleUI(`Added ${xpToAdd} XP. Total XP is now ${gameState.totalXp}.`, 'success');
            break;

        case 'setxp':
            if (args.length < 1) {
                logToConsoleUI("Usage: setxp <amount>", 'error');
                break;
            }
            const xpToSet = parseInt(args[0], 10);
            if (isNaN(xpToSet) || xpToSet < 0) {
                logToConsoleUI("Error: Amount must be a non-negative number.", 'error');
                break;
            }
            window.xpManager.setXp(xpToSet);
            logToConsoleUI(`Total XP set to ${gameState.totalXp}.`, 'success');
            break;

        case 'benchmark':
            logToConsoleUI("Starting Benchmark...", "info");

            const MAX_BENCH_SIZE = 1000;
            const maxSizeArg = args[0] ? parseInt(args[0], 10) : MAX_BENCH_SIZE;
            const maxSize = Math.min(MAX_BENCH_SIZE, maxSizeArg);

            setTimeout(() => {
                try {
                    const originalMap = window.mapRenderer.getCurrentMapData();
                    // Backup lighting state because initializeCurrentMap wipes it
                    const originalLightSources = [...(gameState.lightSources || [])];

                    // --- Phase 1: Map Size Scalability (Fixed Radius 60) ---
                    const step = 50;
                    const startSize = 50;
                    const sizes = [];
                    for (let size = startSize; size <= maxSize; size += step) {
                        sizes.push(size);
                    }
                    if (sizes.length === 0) sizes.push(maxSize);

                    logToConsoleUI(`Phase 1: Testing Map Sizes (Radius 60): ${sizes.join(', ')}`, "info");

                    sizes.forEach(size => {
                        const dummyMap = {
                            id: `benchmark_${size}`,
                            dimensions: { width: size, height: size },
                            levels: {
                                "0": {
                                    bottom: Array(size).fill(null).map(() => Array(size).fill("floor")),
                                    middle: Array(size).fill(null).map(() => Array(size).fill(null))
                                }
                            },
                            startPos: { x: Math.floor(size / 2), y: Math.floor(size / 2), z: 0 }
                        };

                        window.mapRenderer.initializeCurrentMap(dummyMap);

                        if (gameState.tileCache) gameState.tileCache = null;

                        const startRender = performance.now();
                        window.mapRenderer.renderMapLayers();
                        const endRender = performance.now();
                        const renderTime = (endRender - startRender).toFixed(2);

                        const startFOW = performance.now();
                        const radius = 60;
                        window.mapRenderer.updateFOW(
                            Math.floor(size / 2),
                            Math.floor(size / 2),
                            0,
                            radius
                        );
                        const endFOW = performance.now();
                        const fowTime = (endFOW - startFOW).toFixed(2);

                        logToConsoleUI(
                            `Map ${size}x${size} (${size * size} tiles): ` +
                            `Render=${renderTime}ms, FOW=${fowTime}ms`,
                            "success"
                        );
                    });

                    // --- Phase 2: Radius Scalability (Fixed Map Size) ---
                    const fixedMapSize = Math.min(maxSize, 300);
                    logToConsoleUI(`Phase 2: Testing FOW Radii on Map ${fixedMapSize}x${fixedMapSize}...`, "info");

                    const dummyMapForRadius = {
                        id: `benchmark_radius_${fixedMapSize}`,
                        dimensions: { width: fixedMapSize, height: fixedMapSize },
                        levels: { "0": { bottom: Array(fixedMapSize).fill(null).map(() => Array(fixedMapSize).fill("floor")), middle: [] } },
                        startPos: { x: Math.floor(fixedMapSize / 2), y: Math.floor(fixedMapSize / 2), z: 0 }
                    };
                    window.mapRenderer.initializeCurrentMap(dummyMapForRadius);

                    const radii = [10, 50, 100, 200, 500, 1000];
                    radii.forEach(r => {
                        const startFOW = performance.now();
                        window.mapRenderer.updateFOW(
                            Math.floor(fixedMapSize / 2),
                            Math.floor(fixedMapSize / 2),
                            0,
                            r,
                            true
                        );
                        const endFOW = performance.now();
                        const fowTime = (endFOW - startFOW).toFixed(2);
                        logToConsoleUI(`Radius ${r}: FOW=${fowTime}ms`, "success");
                    });


                    // Restore
                    if (originalMap) {
                        window.mapRenderer.initializeCurrentMap(originalMap);
                        // Restore light sources (static and dynamic) from backup
                        gameState.lightSources = originalLightSources;
                        window.mapRenderer.scheduleRender();
                        logToConsoleUI("Benchmark complete. Original map restored.", "info");
                    } else {
                        logToConsoleUI("Benchmark complete. No original map to restore.", "warn");
                    }

                } catch (e) {
                    logToConsoleUI(`Benchmark Error: ${e.message}`, "error");
                    console.error(e);
                }
            }, 100);
            break;
        case 'harvest_help':
            logToConsoleUI("=== Harvesting Tutorial ===", 'info');
            logToConsoleUI("1. Wood: Find a Tree or Bush. Stand adjacent. Press 'F' or click 'Interact'. Select 'Harvest Wood'. (Skill: Survival)", 'info');
            logToConsoleUI("2. Stone: Find a Boulder. Stand adjacent. Interact. Select 'Mine Stone'. (Skill: Survival)", 'info');
            logToConsoleUI("3. Scavenge: Find Trash Cans or Ash piles. Interact. Select 'Scavenge'. (Skill: Investigation)", 'info');
            logToConsoleUI("4. Butcher: Stand over a corpse. Interact. Select 'Butcher'. (Skill: Survival)", 'info');
            logToConsoleUI("Higher skills yield more loot!", 'success');
            break;

        default:
            logToConsoleUI(`Unknown command: ${command}. Type 'help' for list of commands.`, 'error');
            break;
    }
}

// --- Autocomplete Suggestions ---
window.suggestions = [];
let suggestionIndex = -1;

function updateSuggestions(inputValue) {
    if (!window.assetManager) return; // Guard

    const parts = inputValue.split(' ');
    const command = parts[0].toLowerCase();
    const currentArg = parts.length > 1 ? parts[parts.length - 1] : '';

    if (parts.length === 1) {
        // Command suggestions
        window.suggestions = Object.keys(commandHelpInfo).filter(cmd => cmd.includes(command));
    } else {
        // Argument suggestions
        switch (command) {
            case 'additem':
            case 'removeitem':
            case 'placeitem':
                if (window.assetManager.itemsById) {
                    window.suggestions = Object.keys(window.assetManager.itemsById).filter(id => id.toLowerCase().includes(currentArg.toLowerCase()));
                }
                break;
            case 'spawnnpc':
                if (window.assetManager.npcsDefinitions || window.assetManager.npcDefinitions) { // Using correct property based on assetManager.js
                    // assetManager.js uses npcDefinitions
                    const npcDefs = window.assetManager.npcDefinitions || {};
                    window.suggestions = Object.keys(npcDefs).filter(id => id.toLowerCase().includes(currentArg.toLowerCase()));
                }
                break;
            // Add more cases for other commands that need argument suggestions
            default:
                window.suggestions = [];
        }
    }
    suggestionIndex = -1; // Reset selection
    showSuggestions();
}

function showSuggestions() {
    const suggestionsBox = document.getElementById('consoleSuggestions');
    const consoleInputElement = document.getElementById('consoleInput');
    if (!suggestionsBox || !consoleInputElement) return;

    suggestionsBox.innerHTML = '';
    if (window.suggestions.length > 0) {
        suggestionsBox.style.display = 'block';
        window.suggestions.forEach((suggestion, index) => {
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
    const consoleInputElement = document.getElementById('consoleInput');
    if (!consoleInputElement) return;

    if (window.suggestions.length > 0) {
        if (suggestionIndex === -1) suggestionIndex = 0;
        const parts = consoleInputElement.value.split(' ');
        parts[parts.length - 1] = window.suggestions[suggestionIndex];
        consoleInputElement.value = parts.join(' ') + ' ';
        updateSuggestions(consoleInputElement.value);
    }
}

function navigateSuggestions(direction) {
    if (window.suggestions.length > 0) {
        if (direction === 'up') {
            suggestionIndex = (suggestionIndex > 0) ? suggestionIndex - 1 : window.suggestions.length - 1;
        } else {
            suggestionIndex = (suggestionIndex < window.suggestions.length - 1) ? suggestionIndex + 1 : 0;
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
