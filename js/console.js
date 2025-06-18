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
    } else if (type === 'success') {
        entry.style.color = 'lightgreen';
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
        syntax: 'teleport <x> <y>',
        description: 'Teleports player to specified map coordinates.'
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

            let itemsAddedCount = 0;
            for (let i = 0; i < quantityToAdd; i++) {
                if (typeof Item === 'function' && typeof window.addItem === 'function') { // Item can be global, addItem on window
                    const newItem = new Item(itemDef);
                    if (window.addItem(newItem)) {
                        itemsAddedCount++;
                    } else {
                        logToConsoleUI(`Failed to add item '${itemIdToAdd}' (inventory full or error). Added ${itemsAddedCount} of ${quantityToAdd}.`, 'error'); // Direct call
                        break;
                    }
                } else {
                    logToConsoleUI("Error: Item constructor or addItem function not available.", 'error'); // Direct call
                    break;
                }
            }
            if (itemsAddedCount > 0) {
                logToConsoleUI(`Added ${itemsAddedCount}x '${itemDef.name || itemIdToAdd}' to inventory.`, 'success'); // Direct call
            }
            if (typeof window.updateInventoryUI === 'function') {
                window.updateInventoryUI();
            }
            break;

        case 'teleport': // Syntax: teleport <x> <y>
            if (args.length < 2) {
                logToConsoleUI("Usage: teleport <x> <y>", 'error'); // Direct call
                break;
            }
            const targetX = parseInt(args[0], 10);
            const targetY = parseInt(args[1], 10);

            if (isNaN(targetX) || isNaN(targetY)) {
                logToConsoleUI("Error: X and Y coordinates must be numbers.", 'error'); // Direct call
                break;
            }

            if (typeof gameState === 'undefined' || !gameState.playerPos) { // Check global
                logToConsoleUI("Error: gameState.playerPos not found.", 'error'); // Direct call
                break;
            }

            gameState.playerPos.x = targetX; // Direct use
            gameState.playerPos.y = targetY; // Direct use

            logToConsoleUI(`Player teleported to (${targetX}, ${targetY}).`, 'success'); // Direct call

            if (typeof window.mapRenderer !== 'undefined' && typeof window.mapRenderer.scheduleRender === 'function') {
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

        // ... (other command cases) ...
        default:
            logToConsoleUI(`Unknown command: ${command}. Type 'help' for list of commands.`, 'error'); // Direct call
            break;
    }
}

// Expose functions to global scope for other scripts to use
window.processConsoleCommand = processConsoleCommand;
window.logToConsoleUI = logToConsoleUI;

console.log("js/console.js loaded and core functions/state exposed to window.");