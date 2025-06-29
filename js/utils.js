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
    ensureConsoleProcessing();
}
window.logToConsole = logToConsole; // Assign to window immediately after definition

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

function populateWorldContainers(mapData, itemDefinitions, tileset) {
    gameState.worldContainers = [];

    const processLayer = (layer) => {
        if (!layer) return;
        // Ensure mapData.dimensions and its properties are valid before using them
        if (!mapData || !mapData.dimensions || typeof mapData.dimensions.height !== 'number' || typeof mapData.dimensions.width !== 'number') {
            console.error("populateWorldContainers: Invalid mapData.dimensions.", mapData);
            return;
        }

        for (let y = 0; y < mapData.dimensions.height; y++) {
            if (!layer[y]) continue;
            for (let x = 0; x < mapData.dimensions.width; x++) {
                const tileId = layer[y][x];
                if (tileId) {
                    const tileDef = tileset[tileId];
                    if (tileDef && tileDef.tags && tileDef.tags.includes("container")) {
                        const container = {
                            x: x,
                            y: y,
                            tileId: tileId,
                            name: tileDef.name || "Unnamed Container",
                            items: [],
                            maxCapacity: tileDef.maxCapacity || 10
                        };
                        gameState.worldContainers.push(container);

                        const numberOfItemsToAdd = Math.floor(Math.random() * 3) + 1;
                        let addedItemsCount = 0;
                        let attempts = 0;

                        const suitableItemDefinitions = itemDefinitions.filter(itemDef => {
                            return !itemDef.isClothing && !itemDef.hasOwnProperty('capacity');
                        });

                        if (suitableItemDefinitions.length > 0) {
                            while (addedItemsCount < numberOfItemsToAdd && attempts < 100) { // Max 100 attempts to find suitable items
                                const randomItemDef = suitableItemDefinitions[Math.floor(Math.random() * suitableItemDefinitions.length)];
                                let newItem = { ...randomItemDef, equipped: false };
                                container.items.push(newItem);
                                addedItemsCount++;
                                attempts++;
                            }
                        }
                    }
                }
            }
        }
    };

    if (mapData && mapData.layers) {
        processLayer(mapData.layers.building);
        processLayer(mapData.layers.item);
    } else {
        console.error("populateWorldContainers: Invalid mapData or mapData.layers.", mapData);
    }
}
window.populateWorldContainers = populateWorldContainers;

// Calculate 3D Euclidean distance
function getDistance3D(pos1, pos2) {
    if (!pos1 || !pos2 ||
        pos1.x === undefined || pos1.y === undefined || pos1.z === undefined ||
        pos2.x === undefined || pos2.y === undefined || pos2.z === undefined) {
        console.error("getDistance3D: Invalid input positions.", pos1, pos2);
        return Infinity; // Return Infinity or handle error as appropriate
    }
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
window.getDistance3D = getDistance3D;

/**
 * Placeholder for a 3D A* pathfinding algorithm.
 * 
 * @param {object} startPos - The starting position {x, y, z}.
 * @param {object} endPos - The target position {x, y, z}.
 * @param {object} entity - The entity for whom the path is being calculated (optional, for entity-specific movement rules).
 * @param {object} mapData - The complete map data, including all Z-levels.
 * @param {object} tileset - The tileset definitions.
 * @returns {Array<object>|null} An array of {x, y, z} points representing the path, or null if no path is found.
 */
function findPath3D(startPos, endPos, entity, mapData, tileset) { // tileset might not be directly needed if mapRenderer functions are used
    if (!window.mapRenderer || typeof window.mapRenderer.isWalkable !== 'function' || typeof window.mapRenderer.isTileEmpty !== 'function') {
        logToConsole("findPath3D: mapRenderer.isWalkable or mapRenderer.isTileEmpty is not available.", "error");
        return null;
    }
    if (!mapData || !mapData.levels || !mapData.dimensions) { // Removed tileset from this direct check
        logToConsole("findPath3D: Missing mapData, levels, or dimensions.", "error");
        return null;
    }
    // assetManagerInstance is used by mapRenderer functions, ensure it's available globally or passed.
    // It's typically available via `window.assetManagerInstance`.

    const openSet = [];
    const closedSet = new Set(); // Stores string keys "x,y,z"

    const startNode = {
        x: startPos.x, y: startPos.y, z: startPos.z,
        g: 0,
        h: heuristic(startPos, endPos),
        f: heuristic(startPos, endPos),
        parent: null
    };
    openSet.push(startNode);

    function heuristic(posA, posB) {
        // Manhattan distance for 3D
        return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y) + Math.abs(posA.z - posB.z);
    }

    function getNodeKey(node) {
        return `${node.x},${node.y},${node.z}`;
    }

    // Internal getTileDef can still be useful for checking z_transition tags locally
    // but actual walkability is deferred to mapRenderer.isWalkable.
    function getTileDefFromMapData(x, y, z, currentMapData, currentTileset) {
        const zStr = z.toString();
        if (!currentMapData.levels[zStr]) return null;
        // Check middle layer first, then bottom for z_transition properties
        let tileIdRaw = currentMapData.levels[zStr].middle?.[y]?.[x];
        let tileDef = null;
        if (tileIdRaw) {
            const baseId = (typeof tileIdRaw === 'object' && tileIdRaw.tileId) ? tileIdRaw.tileId : tileIdRaw;
            if (currentTileset[baseId]) tileDef = currentTileset[baseId];
        }
        if (tileDef && tileDef.tags && (tileDef.tags.includes('z_transition_up') || tileDef.tags.includes('z_transition_down'))) {
            return tileDef;
        }

        tileIdRaw = currentMapData.levels[zStr].bottom?.[y]?.[x];
        if (tileIdRaw) {
            const baseId = (typeof tileIdRaw === 'object' && tileIdRaw.tileId) ? tileIdRaw.tileId : tileIdRaw;
            if (currentTileset[baseId]) tileDef = currentTileset[baseId];
        }
        return tileDef; // This might be null if no tile or no relevant z_transition tags
    }


    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f); // Sort by F cost to get the best node
        const currentNode = openSet.shift();
        const currentKey = getNodeKey(currentNode);

        if (currentNode.x === endPos.x && currentNode.y === endPos.y && currentNode.z === endPos.z) {
            // Path found, reconstruct it
            const path = [];
            let temp = currentNode;
            while (temp) {
                path.push({ x: temp.x, y: temp.y, z: temp.z });
                temp = temp.parent;
            }
            return path.reverse();
        }

        closedSet.add(currentKey);

        const neighbors = [];
        // Cardinal directions (X, Y movement on current Z)
        const cardinalMoves = [
            { dx: 0, dy: -1, dz: 0 }, { dx: 0, dy: 1, dz: 0 },
            { dx: -1, dy: 0, dz: 0 }, { dx: 1, dy: 0, dz: 0 }
        ];

        for (const move of cardinalMoves) {
            const hNextX = currentNode.x + move.dx;
            const hNextY = currentNode.y + move.dy;
            const hCurrentZ = currentNode.z;

            if (window.mapRenderer.isWalkable(hNextX, hNextY, hCurrentZ)) {
                neighbors.push({ x: hNextX, y: hNextY, z: hCurrentZ, cost: 1 });

                const tileset = window.assetManagerInstance?.tilesets;
                if (tileset) {
                    let explicitZTransDefAtNextStep = null;
                    const levelDataForNextStep = mapData.levels[hCurrentZ.toString()];
                    if (levelDataForNextStep) {
                        const checkTileForExplicitZ = (tileId) => {
                            if (tileId && tileset[tileId]) {
                                const def = tileset[tileId];
                                if (def.tags?.includes('z_transition') && def.target_dz !== undefined) {
                                    return def;
                                }
                            }
                            return null;
                        };
                        const midRaw = levelDataForNextStep.middle?.[hNextY]?.[hNextX];
                        const midId = (typeof midRaw === 'object' && midRaw?.tileId !== undefined) ? midRaw.tileId : midRaw;
                        explicitZTransDefAtNextStep = checkTileForExplicitZ(midId);
                        if (!explicitZTransDefAtNextStep) {
                            const botRaw = levelDataForNextStep.bottom?.[hNextY]?.[hNextX];
                            const botId = (typeof botRaw === 'object' && botRaw?.tileId !== undefined) ? botRaw.tileId : botRaw;
                            explicitZTransDefAtNextStep = checkTileForExplicitZ(botId);
                        }
                    }

                    if (explicitZTransDefAtNextStep) {
                        const finalDestZ = hCurrentZ + explicitZTransDefAtNextStep.target_dz;
                        if (window.mapRenderer.isWalkable(hNextX, hNextY, finalDestZ)) {
                            const zCost = explicitZTransDefAtNextStep.z_cost || 1;
                            neighbors.push({ x: hNextX, y: hNextY, z: finalDestZ, cost: 1 + zCost });
                        }
                    }
                }
            }
        }

        const currentTileset = window.assetManagerInstance ? window.assetManagerInstance.tilesets : null;
        if (currentTileset) {
            const currentTileDef = getTileDefFromMapData(currentNode.x, currentNode.y, currentNode.z, mapData, currentTileset);
            if (currentTileDef && currentTileDef.tags && currentTileDef.target_dz !== undefined && currentTileDef.tags.includes('z_transition')) {
                const targetZ = currentNode.z + currentTileDef.target_dz;
                if (window.mapRenderer.isTileEmpty(currentNode.x, currentNode.y, targetZ) &&
                    window.mapRenderer.isWalkable(currentNode.x, currentNode.y, targetZ)) {
                    neighbors.push({
                        x: currentNode.x, y: currentNode.y, z: targetZ,
                        cost: currentTileDef.z_cost || 1
                    });
                }
            }
        }

        for (const move of cardinalMoves) {
            const stepNextX = currentNode.x + move.dx;
            const stepNextY = currentNode.y + move.dy;
            const stepCurrentZ = currentNode.z;

            const targetUpZ = stepCurrentZ + 1;
            const impassableInfoCurrentZ = window.mapRenderer.getCollisionTileAt(stepNextX, stepNextY, stepCurrentZ);
            const isStrictlyImpassableCurrentZ = impassableInfoCurrentZ !== "";

            if (isStrictlyImpassableCurrentZ &&
                window.mapRenderer.isTileEmpty(currentNode.x, currentNode.y, targetUpZ) &&
                window.mapRenderer.isWalkable(stepNextX, stepNextY, targetUpZ)) {
                neighbors.push({ x: stepNextX, y: stepNextY, z: targetUpZ, cost: 2 });
            }

            const targetDownZ = stepCurrentZ - 1;
            if (window.mapRenderer.isTileEmpty(stepNextX, stepNextY, stepCurrentZ) &&
                !window.mapRenderer.isWalkable(stepNextX, stepNextY, stepCurrentZ) &&
                window.mapRenderer.isWalkable(stepNextX, stepNextY, targetDownZ)) {
                neighbors.push({ x: stepNextX, y: stepNextY, z: targetDownZ, cost: 1 });
            }
        }

        for (const neighborPos of neighbors) {
            const neighborKey = getNodeKey(neighborPos);
            if (closedSet.has(neighborKey)) {
                continue;
            }

            const gCost = currentNode.g + neighborPos.cost;
            let existingNeighbor = openSet.find(node => node.x === neighborPos.x && node.y === neighborPos.y && node.z === neighborPos.z);

            if (!existingNeighbor || gCost < existingNeighbor.g) {
                if (existingNeighbor) {
                    existingNeighbor.g = gCost;
                    existingNeighbor.f = gCost + existingNeighbor.h;
                    existingNeighbor.parent = currentNode;
                } else {
                    const newNode = {
                        x: neighborPos.x, y: neighborPos.y, z: neighborPos.z,
                        g: gCost,
                        h: heuristic(neighborPos, endPos),
                        f: gCost + heuristic(neighborPos, endPos),
                        parent: currentNode
                    };
                    openSet.push(newNode);
                }
            }
        }
    }
    logToConsole(`findPath3D: No path found from (${startPos.x},${startPos.y},${startPos.z}) to (${endPos.x},${endPos.y},${endPos.z}).`, "orange");
    return null; // No path found
}
window.findPath3D = findPath3D;


/**
 * Checks for a clear line of sight between two 3D points.
 * Uses getLine3D and isTileBlockingVision from mapRenderer.js.
 * @param {object} startPos - The starting position {x, y, z}.
 * @param {object} endPos - The target position {x, y, z}.
 * @returns {boolean} True if there is a clear line of sight, false otherwise.
 */
function hasLineOfSight3D(startPos, endPos) {
    if (!startPos || !endPos ||
        startPos.x === undefined || startPos.y === undefined || startPos.z === undefined ||
        endPos.x === undefined || endPos.y === undefined || endPos.z === undefined) {
        logToConsole("hasLineOfSight3D: Invalid input positions.", "error");
        return false;
    }

    if (typeof getLine3D !== 'function') {
        logToConsole("hasLineOfSight3D: getLine3D function is not available.", "error");
        return false;
    }
    // window.mapRenderer.isTileBlockingVision will be called, ensure it's checked for existence before use if necessary,
    // but direct calls are fine if mapRenderer is always loaded.
    if (typeof window.mapRenderer?.isTileBlockingVision !== 'function') {
        logToConsole("hasLineOfSight3D: mapRenderer.isTileBlockingVision function is not available.", "error");
        return false;
    }

    const line = getLine3D(startPos.x, startPos.y, startPos.z, endPos.x, endPos.y, endPos.z);

    if (!line || line.length === 0) {
        //logToConsole("hasLineOfSight3D: Line generation failed or line is empty.", "orange");
        return false;
    }
    if (line.length === 1) {
        // LOS to self or identical adjacent point (if getLine3D returns 1 point for that)
        return true;
    }

    const tilesets = window.assetManagerInstance ? window.assetManagerInstance.tilesets : null;
    const mapData = window.mapRenderer ? window.mapRenderer.getCurrentMapData() : null;

    if (!tilesets || !mapData || !mapData.levels) {
        logToConsole("hasLineOfSight3D: Missing tilesets or mapData/levels. Assuming no LOS for safety.", "error");
        return false;
    }

    // Iterate through each segment of the line (from point i to point i+1)
    for (let i = 0; i < line.length - 1; i++) {
        const p1 = line[i];
        const p2 = line[i + 1];

        // Check for same-Z obstruction at p1, unless p1 is the very start of the LOS line.
        // The point p1 is an intermediate point along the path.
        if (i > 0) { // Do not check the startPos (line[0]) itself for blocking vision with isTileBlockingVision
            if (window.mapRenderer.isTileBlockingVision(p1.x, p1.y, p1.z)) {
                // logToConsole(`LOS blocked by same-Z obstruction at P1:(${p1.x},${p1.y},${p1.z})`);
                return false;
            }
        }

        // Check for inter-Z blocking (floors/ceilings) between p1 and p2
        if (p1.z !== p2.z) { // Z-level changes between p1 and p2
            let higherTile, lowerTile;
            if (p1.z > p2.z) { // p1 is above p2
                higherTile = p1;
                lowerTile = p2;
            } else { // p2 is above p1
                higherTile = p2;
                lowerTile = p1;
            }

            // Check the 'bottom' layer of the 'higherTile' to see if it's a solid floor
            const higherLevelData = mapData.levels[higherTile.z.toString()];
            if (higherLevelData) {
                const tileOnBottomRawHigher = higherLevelData.bottom?.[higherTile.y]?.[higherTile.x];
                const effTileBottomHigher = (typeof tileOnBottomRawHigher === 'object' && tileOnBottomRawHigher?.tileId !== undefined) ? tileOnBottomRawHigher.tileId : tileOnBottomRawHigher;
                if (effTileBottomHigher && tilesets[effTileBottomHigher]) {
                    const defBottomHigher = tilesets[effTileBottomHigher];
                    if (defBottomHigher.tags && defBottomHigher.tags.includes('floor') && !defBottomHigher.tags.includes('transparent_floor')) {
                        // logToConsole(`LOS blocked by solid floor at (${higherTile.x},${higherTile.y},${higherTile.z})`);
                        return false; // Solid floor at higherTile blocks vision to/from lowerTile.z
                    }
                }

                // Check the 'middle' layer of the 'higherTile' for 'solid_terrain_top'
                // This means the higherTile itself is a solid block defined on its middle layer.
                const tileOnMiddleRawHigher = higherLevelData.middle?.[higherTile.y]?.[higherTile.x];
                const effTileMiddleHigher = (typeof tileOnMiddleRawHigher === 'object' && tileOnMiddleRawHigher?.tileId !== undefined) ? tileOnMiddleRawHigher.tileId : tileOnMiddleRawHigher;
                if (effTileMiddleHigher && tilesets[effTileMiddleHigher]) {
                    const defMiddleHigher = tilesets[effTileMiddleHigher];
                    if (defMiddleHigher.tags && defMiddleHigher.tags.includes('solid_terrain_top')) {
                        // logToConsole(`LOS blocked by solid_terrain_top on middle layer at (${higherTile.x},${higherTile.y},${higherTile.z})`);
                        return false; // solid_terrain_top on middle layer blocks vertical LOS.
                    }
                }
            }
        }
    }

    // If loop completes, no obstructions found along the path segments.
    // The endPos (last point in 'line') is not checked as an obstruction itself.
    return true;
}
window.hasLineOfSight3D = hasLineOfSight3D;