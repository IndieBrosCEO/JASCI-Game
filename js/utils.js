// Palette for distinct faction/team colors
const FACTION_COLORS = [
    'orange',        // A common, distinct color
    'purple',        // Another distinct one
    'teal',          // Good contrast
    'olive',         // Usually readable
    'sandybrown',    // Lighter, but should be okay
    'lightblue',     // Already used for some general logs, but can be okay for a team
    'pink',          // Readable
    'coral',         // Bright and distinct
    'dodgerblue',    // A brighter blue
    'mediumseagreen' // A lighter green than player's 'lightgreen'
];

// Global variables for delayed console message processing
let consoleMessageQueue = [];
let isConsoleProcessing = false;
const CONSOLE_MESSAGE_DELAY = 50; // milliseconds for message delay

/**************************************************************
 * Utility & Logging Functions
 **************************************************************/

function logToConsole(message, color) { // color is optional
    console.log(message); // Keep original console.log for raw debugging

    const messageObject = { text: message };
    if (color) {
        messageObject.color = color;
    }

    consoleMessageQueue.push(messageObject);
    ensureConsoleProcessing(); // This function will be created in the next step
}
// window.logToConsole = logToConsole; // This will be reassigned later with other window assignments

function ensureConsoleProcessing() {
    if (isConsoleProcessing) {
        return; // Already processing, new messages are just added to the queue
    }
    isConsoleProcessing = true;
    processNextConsoleMessage(); // Start processing the queue
}

function processNextConsoleMessage() {
    if (consoleMessageQueue.length === 0) {
        isConsoleProcessing = false; // No more messages, stop processing
        return;
    }

    const messageObject = consoleMessageQueue.shift(); // Get the oldest message
    const consoleElement = document.getElementById("console");

    if (consoleElement && messageObject) {
        const para = document.createElement("p");
        if (messageObject.color) {
            const span = document.createElement("span");
            span.style.color = messageObject.color;
            span.textContent = messageObject.text;
            para.appendChild(span);
        } else {
            para.textContent = messageObject.text;
        }
        consoleElement.appendChild(para);
        consoleElement.scrollTop = consoleElement.scrollHeight; // Auto-scroll
    }

    // Schedule the next message processing after the defined delay
    setTimeout(processNextConsoleMessage, CONSOLE_MESSAGE_DELAY);
}

/**************************************************************
 * Game Mechanics & Dice Functions
 **************************************************************/

// Rolls a single die with a specified number of sides.
function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

// Parses a dice notation string (e.g., "2d6+3", "1d4", "3d8-1")
// and returns an object { count: Number, sides: Number, modifier: Number }
function parseDiceNotation(diceString) {
    if (typeof diceString !== 'string' || diceString.trim() === "") {
        console.error("Invalid dice notation: input is not a non-empty string");
        return null;
    }
    // Check for flat number (e.g., "1", "5")
    if (/^\d+$/.test(diceString.trim())) {
        const flatDamage = parseInt(diceString.trim(), 10);
        // Represent as Xd1, so flatDamage * 1 = flatDamage
        return {
            count: flatDamage,
            sides: 1,
            modifier: 0
        };
    }

    const regex = /(\d+)d(\d+)([+-]\d+)?/;
    const match = diceString.trim().match(regex);

    if (!match) {
        console.error(`Invalid dice notation: ${diceString}`);
        return null;
    }

    return {
        count: parseInt(match[1], 10),
        sides: parseInt(match[2], 10),
        modifier: match[3] ? parseInt(match[3], 10) : 0
    };
}

// Rolls dice based on parsed notation from parseDiceNotation.
// Returns the total sum of the rolls plus the modifier.
function rollDiceNotation(parsedNotation) {
    if (!parsedNotation) return 0;

    let total = 0;
    for (let i = 0; i < parsedNotation.count; i++) {
        total += rollDie(parsedNotation.sides);
    }
    total += parsedNotation.modifier;
    return total;
}

// Gets the skill value for a given entity (player or NPC).
// entity: The character object (gameState for player, or specific NPC object)
// Depends on global `gameState`.
function getSkillValue(skillName, entity) {
    if (!entity) return 0;

    let skillsSource;
    if (entity === gameState) { // Check if the entity is the player (gameState)
        skillsSource = gameState.skills; // Array of objects { name: "SkillName", points: X }
    } else if (entity.skills) { // Check if the entity is an NPC with a skills object
        skillsSource = entity.skills; // Expected to be an object like { "SkillName": X } or array
    } else {
        return 0; // No skills definition found for the entity
    }

    if (Array.isArray(skillsSource)) { // For player (gameState.skills)
        const skill = skillsSource.find(s => s.name === skillName);
        return skill ? skill.points : 0;
    } else if (typeof skillsSource === 'object' && skillsSource !== null) { // For NPCs (entity.skills)
        return skillsSource[skillName] || 0;
    }
    return 0;
}

// Gets the stat value for a given entity (player or NPC).
// entity: The character object (gameState for player, or specific NPC object)
// Depends on global `gameState`.
function getStatValue(statName, entity) {
    if (!entity) return 1; // Default to 1 if entity is undefined

    let statsSource;
    if (entity === gameState) { // Player
        statsSource = gameState.stats; // Array of objects { name: "StatName", points: X }
    } else if (entity.stats) { // NPC
        statsSource = entity.stats; // Expected to be an object like { "StatName": X } or array
    } else {
        return 1; // No stats definition, return default
    }

    if (Array.isArray(statsSource)) { // For player (gameState.stats)
        const stat = statsSource.find(s => s.name === statName);
        return stat ? stat.points : 1;
    } else if (typeof statsSource === 'object' && statsSource !== null) { // For NPCs (entity.stats)
        return statsSource[statName] || 1; // Default to 1 if stat not found on NPC
    }
    return 1;
}

// Calculates the modifier for a given stat.
// Depends on `getStatValue`.
function getStatModifier(statName, entity) {
    const statPoints = getStatValue(statName, entity);
    return Math.floor(statPoints / 2) - 1;
}

// Calculates the modifier for a given skill.
// Depends on `getSkillValue` and `getStatModifier`.
function getSkillModifier(skillName, entity) {
    const skillToStatMap = {
        "Animal Handling": "Charisma",
        "Electronics": "Intelligence",
        "Explosives": "Marksmanship", // Corrected
        "Guns": "Marksmanship",
        "Intimidation": "Charisma",   // Corrected
        "Investigation": "Perception",
        "Lockpick": "Dexterity",
        "Medicine": "Intelligence",
        "Melee Weapons": "Strength",
        "Persuasion": "Charisma",
        "Repair": "Intelligence",
        "Sleight of Hand": "Dexterity",
        "Stealth": "Dexterity",
        "Survival": "Constitution",  // Corrected
        "Unarmed": "Strength"
    };

    const skillPoints = getSkillValue(skillName, entity);
    const correspondingStatName = skillToStatMap[skillName];

    if (!correspondingStatName) {
        console.error(`No stat mapping found for skill: ${skillName}. Defaulting to base skill calculation.`);
        // It's important that getStatModifier is robust enough or that skills always have a mapping.
        // If a skill truly has no corresponding stat, its modifier would just be skillPoints/10.
        // However, the design implies all skills should map to a stat.
        // For safety, if a mapping is missing, we could return just the skill point derived part.
        return Math.floor(skillPoints / 10);
    }

    const correspondingStatModifier = getStatModifier(correspondingStatName, entity);
    return Math.floor(skillPoints / 10) + correspondingStatModifier;
}

// Exporting for potential ES6 module usage later, though current structure is global.
// export { logToConsole, rollDie, parseDiceNotation, rollDiceNotation, getSkillValue, getStatValue, getStatModifier, getSkillModifier };

window.logToConsole = logToConsole; // Re-establish this assignment here
window.rollDie = rollDie;
window.parseDiceNotation = parseDiceNotation;
window.rollDiceNotation = rollDiceNotation;
window.getSkillValue = getSkillValue;
window.getStatValue = getStatValue;
window.getStatModifier = getStatModifier;
window.getSkillModifier = getSkillModifier;

function getSkillColor(skillName) {
    if (!gameState || !gameState.skills) {
        return 'lightgray';
    }
    const skill = gameState.skills.find(s => s.name === skillName);
    if (skill) {
        if (skill.textColor && skill.textColor.toLowerCase() === 'white') {
            // If the skill's defined text color is white, use it.
            return 'white';
        } else if (skill.textColor && skill.textColor.toLowerCase() === 'black') {
            // If the skill's defined text color is black, then its bgColor is meant to be the prominent color.
            // Use bgColor as the text color in the console.
            if (skill.bgColor) {
                const lowerBgColor = skill.bgColor.toLowerCase();
                if (lowerBgColor === 'black' || lowerBgColor === '#000000' || lowerBgColor === '#111111') {
                    return 'cyan'; // Fallback for black bgColor
                }
                if (lowerBgColor === 'darkred') {
                    return 'indianred'; // Brighter alternative for darkred
                }
                return skill.bgColor;
            }
        }
        // Fallback if textColor is neither black nor white, or if bgColor is missing in the black textColor case
        // Try bgColor first if available and not black/dark, then textColor if not black, then cyan
        if (skill.bgColor) {
            const lowerBgColor = skill.bgColor.toLowerCase();
            if (lowerBgColor !== 'black' && lowerBgColor !== '#000000' && lowerBgColor !== '#111111') {
                if (lowerBgColor === 'darkred') return 'indianred'; // Already handled but good for safety
                return skill.bgColor;
            }
        }
        if (skill.textColor) { // This case handles if skill.textColor is something other than black/white
            const lowerTextColor = skill.textColor.toLowerCase();
            // Ensure this other textColor isn't black or too dark either
            if (lowerTextColor !== 'black' && lowerTextColor !== '#000000' && lowerTextColor !== '#111111') {
                if (lowerTextColor === 'darkred') return 'indianred';
                return skill.textColor;
            }
        }
        return 'cyan'; // Ultimate fallback if previous conditions didn't return
    }
    return 'lightgray'; // Skill not found
}
window.getSkillColor = getSkillColor;

function getTeamColor(entity) {
    if (!entity) {
        return 'lightgray';
    }

    if (!window.gameState || !window.gameState.player) {
        if (entity === window.gameState) {
            return 'lightgreen'; // Player
        }
        return 'gold'; // Default if player context for team comparison is missing
    }

    if (entity === window.gameState) { // Player
        return 'lightgreen';
    }

    if (typeof entity.teamId !== 'undefined') {
        if (entity.teamId === 0) { // Explicitly neutral team
            return 'gold';
        } else if (entity.teamId === window.gameState.player.teamId) { // Ally
            return 'lightgreen';
        } else { // Other defined teamIds (enemies or other factions)
            if (FACTION_COLORS && FACTION_COLORS.length > 0) {
                // Use teamId to pick a color from the FACTION_COLORS list.
                // Math.abs ensures positive index, % handles wrapping.
                const colorIndex = Math.abs(entity.teamId) % FACTION_COLORS.length;
                return FACTION_COLORS[colorIndex];
            } else {
                return 'indianred'; // Fallback if FACTION_COLORS is missing
            }
        }
    }

    return 'gold'; // Fallback for entities with undefined teamId
}
window.getTeamColor = getTeamColor;

function populateContainer(containerInstance) {
    if (!window.assetManagerInstance || !window.assetManagerInstance.items) {
        logToConsole("Asset manager or item definitions not available for populating container.", "red");
        return;
    }
    if (!containerInstance || !containerInstance.items || typeof containerInstance.capacity !== 'number') {
        logToConsole("Invalid container instance provided to populateContainer.", "red");
        return;
    }

    const allItemDefs = Object.values(window.assetManagerInstance.items);
    // Filter out items that are containers themselves or other non-lootable types.
    const lootableItems = allItemDefs.filter(itemDef => {
        return itemDef.type !== 'container_item' &&
            itemDef.type !== 'clothing' && // Temporarily avoid clothing in loot
            itemDef.size !== undefined && itemDef.size > 0; // Must have a defined, positive size
    });

    if (lootableItems.length === 0) {
        // logToConsole(`No lootable item definitions found to populate ${containerInstance.name}.`, "orange");
        return;
    }

    // Determine a random number of items to *try* to add.
    // Bias towards adding 0 to 2 items, but can go higher if capacity allows. Max of 5 attempts.
    const attempts = Math.floor(Math.random() * 3) + Math.floor(Math.random() * 3); // 0 to 4, biased towards lower

    let itemsAddedCount = 0;
    for (let i = 0; i < attempts; i++) {
        const randomDef = lootableItems[Math.floor(Math.random() * lootableItems.length)];
        const newItem = new Item(randomDef); // Assumes window.Item is global

        const currentUsage = containerInstance.items.reduce((sum, item) => sum + (item.size || 1), 0);

        if (currentUsage + (newItem.size || 1) <= containerInstance.capacity) {
            containerInstance.items.push(newItem);
            itemsAddedCount++;
        } else {
            // If an item doesn't fit, we might break early if the container is mostly full.
            if (currentUsage / containerInstance.capacity > 0.8) { // If 80% full and item doesn't fit
                break;
            }
        }
    }

    if (itemsAddedCount > 0) {
        // logToConsole(`Populated ${containerInstance.name} (ID: ${containerInstance.id}) with ${itemsAddedCount} items. Current total: ${containerInstance.items.length}.`);
    }
}
window.populateContainer = populateContainer;

function runContainerTests() {
    logToConsole("--- Starting Container System Tests ---", "blue");

    // Test 1: Container Presence & Population
    logToConsole("Test 1: Checking gameState.containers presence and basic properties...", "lightblue");
    if (!gameState.containers || typeof gameState.containers.length === 'undefined') {
        logToConsole("Error: gameState.containers is missing or not an array.", "red");
        logToConsole("--- Container System Tests Finished (Aborted) ---", "red");
        return;
    }
    if (gameState.containers.length === 0) {
        logToConsole("Warning: gameState.containers is empty. Map might not have containers or they weren't initialized by mapLoader.", "orange");
    } else {
        logToConsole(`Found ${gameState.containers.length} container instances on the map.`);
        const limit = Math.min(3, gameState.containers.length);
        for (let i = 0; i < limit; i++) {
            const c = gameState.containers[i];
            if (!c) {
                logToConsole(`Error: Container at index ${i} is null/undefined.`, "red");
                continue;
            }
            logToConsole(`Container ${i + 1}/${limit}: Name: ${c.name}, ID: ${c.id}, Pos: (${c.x},${c.y}), Capacity: ${c.capacity}, Items: ${c.items ? c.items.length : 'N/A'}`);
            if (typeof c.capacity !== 'number' || c.capacity < 0) {
                logToConsole(`  Error: Container ${c.id} has invalid capacity: ${c.capacity}`, "red");
            }
            if (!Array.isArray(c.items)) {
                logToConsole(`  Error: Container ${c.id} items is not an array.`, "red");
            }
            if (c.items && c.items.length > 0 && c.items[0]) {
                logToConsole(`    First item in ${c.name}: ${c.items[0].name} (Size: ${c.items[0].size || 'N/A'})`);
            } else if (c.items && c.items.length > 0 && !c.items[0]) {
                logToConsole(`    Error: Container ${c.id} has a null/undefined item in its items array.`, "red");
            }
        }
    }

    // Test 2: Player Inventory Interaction (Simulated)
    logToConsole("Test 2: Simulating player interaction (take/put items)...", "lightblue");
    const playerInventory = window.gameState.inventory.container;
    if (!playerInventory) {
        logToConsole("Error: Player inventory (gameState.inventory.container) not found. Skipping interaction tests.", "red");
    } else {
        const testContainer = gameState.containers.find(c => c && c.items && c.items.length > 0);
        if (!testContainer) {
            logToConsole("Skipping 'take item' test - no containers with items found or containers are malformed.", "orange");
        } else {
            logToConsole(`Using container "${testContainer.name}" (ID: ${testContainer.id}) for take/put tests.`);
            gameState.inventory.interactingWithContainer = testContainer.id; // Simulate opening

            const itemToTakeCopy = { ...testContainer.items[0] }; // Take a copy for checks, original might be mutated by Item constructor if not careful

            if (itemToTakeCopy && itemToTakeCopy.name) {
                logToConsole(`Attempting to take "${itemToTakeCopy.name}" (Size: ${itemToTakeCopy.size || 'N/A'}) from "${testContainer.name}".`);
                const playerItemsBefore = playerInventory.items.length;
                const containerItemsBefore = testContainer.items.length;
                const canPlayerTake = window.canAddItem(itemToTakeCopy); // Assumes itemToTakeCopy has 'size'

                if (canPlayerTake) {
                    // Simulate the actual item instance that would be created/transferred
                    const actualItemTakenFromContainer = testContainer.items[0];
                    const playerReceivedItem = window.addItem(new Item(actualItemTakenFromContainer)); // Player gets a new instance

                    if (playerReceivedItem) {
                        testContainer.items.splice(0, 1); // Remove original from container
                        logToConsole(`  SUCCESS: Took "${actualItemTakenFromContainer.name}".`, "green");
                        if (playerInventory.items.length !== playerItemsBefore + 1 || testContainer.items.length !== containerItemsBefore - 1) {
                            logToConsole(`  VERIFICATION ERROR: Item counts mismatch after taking. Player: ${playerInventory.items.length} (was ${playerItemsBefore}), Container: ${testContainer.items.length} (was ${containerItemsBefore})`, "red");
                        } else {
                            logToConsole(`  VERIFICATION: Item counts correct. Player: ${playerInventory.items.length}, Container: ${testContainer.items.length}`, "green");
                        }
                    } else {
                        logToConsole(`  FAILURE: addItem to player inventory returned false.`, "red");
                    }
                } else {
                    logToConsole(`  SKIPPED: Player cannot add "${itemToTakeCopy.name}" (not enough space). Player capacity: ${playerInventory.maxSlots}, Used: ${playerInventory.items.reduce((s, i) => s + (i.size || 0), 0)}`, "orange");
                }

                // Test putting an item back
                const playerItemToPut = playerInventory.items.find(i => i.id === itemToTakeCopy.id); // Find the item (or one like it) in player's inv

                if (playerItemToPut) {
                    logToConsole(`Attempting to put "${playerItemToPut.name}" (Size: ${playerItemToPut.size || 'N/A'}) back into "${testContainer.name}".`);
                    const playerItemsBeforePut = playerInventory.items.length;
                    const containerItemsBeforePut = testContainer.items.length;
                    const containerCurrentUsage = testContainer.items.reduce((sum, i) => sum + (i.size || 1), 0);
                    const canContainerAccept = (containerCurrentUsage + (playerItemToPut.size || 1)) <= testContainer.capacity;

                    if (canContainerAccept) {
                        const itemActuallyRemovedFromPlayer = window.removeItem(playerItemToPut.name);
                        if (itemActuallyRemovedFromPlayer) {
                            testContainer.items.push(itemActuallyRemovedFromPlayer); // Add the actual instance
                            logToConsole(`  SUCCESS: Put "${itemActuallyRemovedFromPlayer.name}" into "${testContainer.name}".`, "green");
                            if (playerInventory.items.length !== playerItemsBeforePut - 1 || testContainer.items.length !== containerItemsBeforePut + 1) {
                                logToConsole(`  VERIFICATION ERROR: Item counts mismatch after putting. Player: ${playerInventory.items.length} (was ${playerItemsBeforePut}), Container: ${testContainer.items.length} (was ${containerItemsBeforePut})`, "red");
                            } else {
                                logToConsole(`  VERIFICATION: Item counts correct. Player: ${playerInventory.items.length}, Container: ${testContainer.items.length}`, "green");
                            }
                        } else {
                            logToConsole(`  FAILURE: removeItem from player failed for "${playerItemToPut.name}". It might have been a different instance if names are not unique.`, "red");
                        }
                    } else {
                        logToConsole(`  SKIPPED: Container "${testContainer.name}" (Cap: ${testContainer.capacity}, Used: ${containerCurrentUsage}) cannot accept "${playerItemToPut.name}" (Size: ${playerItemToPut.size || 1}).`, "orange");
                    }
                } else {
                    logToConsole("Skipping 'put item back' test - player does not have an item of the type that was taken (or it couldn't be identified to put back).", "orange");
                }
            } else {
                logToConsole("Skipping 'take item' sub-test as the identified test container's first item is invalid or undefined.", "orange");
            }
            gameState.inventory.interactingWithContainer = null; // Cleanup
        }
    }

    // Test 3: Manual Verification Prompts
    logToConsole("Test 3: Manual Verification Steps (perform these in-game):", "lightblue");
    logToConsole("  - Ensure map is loaded, preferably one with built-in containers like cabinets, desks, or refrigerators (e.g., Small_Map, Beach_House).");
    logToConsole("  - Verify containers render on the map with their defined sprites and colors from the tileset.");
    logToConsole("  - Use interaction keys (e.g., 'e', then number for item, then 'Enter' for action menu, then number for 'Open', then 'Enter') to 'Open' a container like a Cabinet or Desk.");
    logToConsole("  - Check inventory panel: Does it show '--- [Container Name] (Capacity: X/Y) ---' header for the opened container?");
    logToConsole("  - Check inventory panel: Are items from the container listed below this header, formatted like '[Container Name] Item Name'?");
    logToConsole("  - Try selecting an item from the container section and pressing 'Enter' (or your interact key for inventory) to take it.");
    logToConsole("  - Verify console log for taking item and check if item is now in player's main inventory section in UI.");
    logToConsole("  - Try selecting an item from your player's inventory section and pressing 'Enter' to put it into the (still open) container.");
    logToConsole("  - Verify console log for placing item and check if item is now in container's section in UI / removed from player's section.");
    logToConsole("  - Close inventory (e.g., 'i' key). Re-open. Container view should be gone (interactingWithContainer should be null).");

    logToConsole("--- Container System Tests Finished ---", "blue");
}
window.runContainerTests = runContainerTests;