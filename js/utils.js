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

function logToConsole(message, color, type = 'game') { // color is optional, type added
    if (type === 'dev') {
        console.log(`[DEV] ${message}`); // Keep original console.log for raw debugging
        return; // Do not show in player console
    }

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
// entity: The character object (gameState.player for player, or specific NPC object)
function getSkillValue(skillName, entity) {
    if (!entity) return 0;

    let skillsSource;
    if (entity === gameState.player) { // Check if the entity is the player
        skillsSource = entity.skills; // Array of objects { name: "SkillName", points: X }
    } else if (entity.skills) { // Check if the entity is an NPC with a skills object
        skillsSource = entity.skills; // Expected to be an object like { "SkillName": X } or array
    } else {
        return 0; // No skills definition found for the entity
    }

    if (Array.isArray(skillsSource)) { // For player (gameState.player.skills)
        const skill = skillsSource.find(s => s.name === skillName);
        return skill ? skill.points : 0;
    } else if (typeof skillsSource === 'object' && skillsSource !== null) { // For NPCs (entity.skills)
        return skillsSource[skillName] || 0;
    }
    return 0;
}

// Gets the stat value for a given entity (player or NPC).
// entity: The character object (gameState.player for player, or specific NPC object)
function getStatValue(statName, entity) {
    if (!entity) return 1; // Default to 1 if entity is undefined

    let statsSource;
    if (entity === gameState.player) { // Player
        statsSource = entity.stats; // Array of objects { name: "StatName", points: X }
    } else if (entity.stats) { // NPC
        statsSource = entity.stats; // Expected to be an object like { "StatName": X } or array
    } else {
        return 1; // No stats definition, return default
    }

    if (Array.isArray(statsSource)) { // For player (gameState.player.stats)
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
// function findPath3D(startPos, endPos, entity, mapData, tileset) { // Original definition
//    // ... original function body
// }
// window.findPath3D = findPath3D; // Original assignment

// Wrapped version for profiling
function findPath3D(startPos, endPos, entity, mapData, tileset) {
    return profileFunction("findPath3D", (_startPos, _endPos, _entity, _mapData, _tileset) => {
        // Original function body starts here, using underscored parameter names
        if (!window.mapRenderer || typeof window.mapRenderer.isWalkable !== 'function' || typeof window.mapRenderer.isTileEmpty !== 'function') {
            logToConsole("findPath3D: mapRenderer.isWalkable or mapRenderer.isTileEmpty is not available.", "error");
            return null;
        }
        if (!_mapData || !_mapData.levels || !_mapData.dimensions) {
            logToConsole("findPath3D: Missing mapData, levels, or dimensions.", "error");
            return null;
        }
        if (!_tileset) {
            logToConsole("findPath3D: Tileset data not provided.", "error");
            return null;
        }

        const openSet = [];
        const closedSet = new Set();

        const startNode = {
            x: _startPos.x, y: _startPos.y, z: _startPos.z,
            g: 0,
            h: heuristic(_startPos, _endPos),
            f: heuristic(_startPos, _endPos),
            parent: null
        };
        openSet.push(startNode);

        function heuristic(posA, posB) {
            return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y) + Math.abs(posA.z - posB.z);
        }

        function getNodeKey(node) {
            return `${node.x},${node.y},${node.z}`;
        }

        function getTileDefFromMapDataLayers(x, y, z, currentMapData, currentTileset) {
            const zStr = z.toString();
            if (!currentMapData.levels[zStr]) return null;

            let tileIdRaw = currentMapData.levels[zStr].building?.[y]?.[x];
            if (!tileIdRaw) tileIdRaw = currentMapData.levels[zStr].item?.[y]?.[x];
            if (!tileIdRaw) tileIdRaw = currentMapData.levels[zStr].middle?.[y]?.[x];
            if (!tileIdRaw) tileIdRaw = currentMapData.levels[zStr].bottom?.[y]?.[x];

            if (tileIdRaw) {
                const baseId = (typeof tileIdRaw === 'object' && tileIdRaw.tileId) ? tileIdRaw.tileId : tileIdRaw;
                if (currentTileset && currentTileset[baseId]) return currentTileset[baseId];
            }
            return null;
        }

        while (openSet.length > 0) {
            openSet.sort((a, b) => a.f - b.f);
            const currentNode = openSet.shift();
            const currentKey = getNodeKey(currentNode);

            if (currentNode.x === _endPos.x && currentNode.y === _endPos.y && currentNode.z === _endPos.z) {
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
            const cardinalMoves = [
                { dx: 0, dy: -1, dz: 0 }, { dx: 0, dy: 1, dz: 0 },
                { dx: -1, dy: 0, dz: 0 }, { dx: 1, dy: 0, dz: 0 }
            ];

            for (const move of cardinalMoves) {
                const nextX = currentNode.x + move.dx;
                const nextY = currentNode.y + move.dy;
                const currentZ = currentNode.z;

                let cost = 1;
                let isPassable = window.mapRenderer.isWalkable(nextX, nextY, currentZ);
                const tileDefAtNext = getTileDefFromMapDataLayers(nextX, nextY, currentZ, _mapData, _tileset);

                if (tileDefAtNext && tileDefAtNext.tags && tileDefAtNext.tags.includes("door")) {
                    if (tileDefAtNext.tags.includes("closed")) {
                        if (tileDefAtNext.isLocked === true) {
                            isPassable = false;
                        } else {
                            isPassable = true;
                            cost = 1 + (tileDefAtNext.openCost || 1);
                        }
                    } else if (tileDefAtNext.tags.includes("open")) {
                        isPassable = true;
                        cost = 1;
                    }
                }

                if (isPassable) {
                    neighbors.push({ x: nextX, y: nextY, z: currentZ, cost: cost });
                    if (tileDefAtNext && tileDefAtNext.tags?.includes('z_transition') && tileDefAtNext.target_dz !== undefined) {
                        const finalDestZ = currentZ + tileDefAtNext.target_dz;
                        if (window.mapRenderer.isWalkable(nextX, nextY, finalDestZ)) {
                            const zCost = tileDefAtNext.z_cost || 1;
                            neighbors.push({ x: nextX, y: nextY, z: finalDestZ, cost: cost + zCost });
                        }
                    }
                }
            }

            const currentTileDef = getTileDefFromMapDataLayers(currentNode.x, currentNode.y, currentNode.z, _mapData, _tileset);
            if (currentTileDef && currentTileDef.tags?.includes('z_transition') && currentTileDef.target_dz !== undefined) {
                const targetZ = currentNode.z + currentTileDef.target_dz;
                if (window.mapRenderer.isWalkable(currentNode.x, currentNode.y, targetZ)) {
                    neighbors.push({
                        x: currentNode.x, y: currentNode.y, z: targetZ,
                        cost: currentTileDef.z_cost || 1
                    });
                }
            }

            for (const move of cardinalMoves) {
                const stepNextX = currentNode.x + move.dx;
                const stepNextY = currentNode.y + move.dy;
                const stepCurrentZ = currentNode.z;
                const targetUpZ = stepCurrentZ + 1;
                const isTargetImpassableAtCurrentZ = !window.mapRenderer.isWalkable(stepNextX, stepNextY, stepCurrentZ) &&
                    window.mapRenderer.getCollisionTileAt(stepNextX, stepNextY, stepCurrentZ) !== "";
                if (isTargetImpassableAtCurrentZ &&
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
                if (closedSet.has(neighborKey)) continue;
                const gCost = currentNode.g + neighborPos.cost;
                let existingNeighbor = openSet.find(node => node.x === neighborPos.x && node.y === neighborPos.y && node.z === neighborPos.z);
                if (!existingNeighbor) {
                    openSet.push({
                        x: neighborPos.x, y: neighborPos.y, z: neighborPos.z,
                        g: gCost, h: heuristic(neighborPos, _endPos),
                        f: gCost + heuristic(neighborPos, _endPos), parent: currentNode
                    });
                } else if (gCost < existingNeighbor.g) {
                    existingNeighbor.g = gCost;
                    existingNeighbor.f = gCost + existingNeighbor.h;
                    existingNeighbor.parent = currentNode;
                }
            }
        }
        logToConsole(`findPath3D: No path found from (${_startPos.x},${_startPos.y},${_startPos.z}) to (${_endPos.x},${_endPos.y},${_endPos.z}).`, "orange");
        return null;
        // Original function body ends here
    }, startPos, endPos, entity, mapData, tileset);
}
window.findPath3D = findPath3D;


/**
    }
    if (!mapData || !mapData.levels || !mapData.dimensions) {
        logToConsole("findPath3D: Missing mapData, levels, or dimensions.", "error");
        return null;
    }
    if (!tileset) {
        logToConsole("findPath3D: Tileset data not provided.", "error");
        return null;
    }

    // const openSet = []; // Old array-based open set
    const openSet = new PriorityQueue((a, b) => a.f < b.f); 
    const closedSet = new Set();
    const openSetMap = new Map(); // To keep track of nodes in openSet and their gCosts for efficient updates

    const startNode = {
        x: startPos.x, y: startPos.y, z: startPos.z,
        g: 0,
        h: heuristic(startPos, endPos),
        f: heuristic(startPos, endPos),
        parent: null
    };
    openSet.push(startNode);
    openSetMap.set(getNodeKey(startNode), startNode);

    function heuristic(posA, posB) {
        return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y) + Math.abs(posA.z - posB.z);
    }

    function getNodeKey(node) {
        return `${node.x},${node.y},${node.z}`;
    }

    // Helper to get tile definition from any relevant layer at a position.
    // Order of layer checking might be important (e.g., 'building' for doors over 'item').
    function getTileDefFromMapDataLayers(x, y, z, currentMapData, currentTileset) {
        const zStr = z.toString();
        if (!currentMapData.levels[zStr]) return null;

        let tileIdRaw = currentMapData.levels[zStr].building?.[y]?.[x];
        if (!tileIdRaw) tileIdRaw = currentMapData.levels[zStr].item?.[y]?.[x];
        // For z-transitions, they are often on middle or bottom, check if not found yet
        if (!tileIdRaw) tileIdRaw = currentMapData.levels[zStr].middle?.[y]?.[x];
        if (!tileIdRaw) tileIdRaw = currentMapData.levels[zStr].bottom?.[y]?.[x];

        if (tileIdRaw) {
            const baseId = (typeof tileIdRaw === 'object' && tileIdRaw.tileId) ? tileIdRaw.tileId : tileIdRaw;
            if (currentTileset && currentTileset[baseId]) return currentTileset[baseId];
        }
        return null;
    }

    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        const currentNode = openSet.shift();
        const currentKey = getNodeKey(currentNode);

        if (currentNode.x === endPos.x && currentNode.y === endPos.y && currentNode.z === endPos.z) {
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
        const cardinalMoves = [
            { dx: 0, dy: -1, dz: 0 }, { dx: 0, dy: 1, dz: 0 },
            { dx: -1, dy: 0, dz: 0 }, { dx: 1, dy: 0, dz: 0 }
        ];

        // Horizontal Neighbors (including door logic)
        for (const move of cardinalMoves) {
            const nextX = currentNode.x + move.dx;
            const nextY = currentNode.y + move.dy;
            const currentZ = currentNode.z; // Neighbor is on the same Z level for this horizontal check

            let cost = 1; // Base cost for cardinal move
            // TODO: Add support for diagonal movement and adjust cost (e.g., ~1.41 or alternating 1-2)
            // TODO: Incorporate difficult terrain cost:
            //       If tileDefAtNext has a 'moveCostMultiplier' or 'additionalMoveCost' tag, adjust 'cost'.
            //       e.g., cost *= tileDefAtNext.moveCostMultiplier;
            // TODO: AP costs are typically for actions, not per-tile movement. MP is handled by caller (attemptCharacterMove).
            let isPassable = window.mapRenderer.isWalkable(nextX, nextY, currentZ); // Initial walkability check
            const tileDefAtNext = getTileDefFromMapDataLayers(nextX, nextY, currentZ, mapData, tileset);

            if (tileDefAtNext && tileDefAtNext.tags && tileDefAtNext.tags.includes("door")) {
                if (tileDefAtNext.tags.includes("closed")) {
                    if (tileDefAtNext.isLocked === true) {
                        isPassable = false;
                    } else {
                        isPassable = true; // Can path through, even if isWalkable was false due to "impassable" tag
                        cost = 1 + (tileDefAtNext.openCost || 1); // Cost to move + cost to open door
                    }
                } else if (tileDefAtNext.tags.includes("open")) {
                    // If it's an open door, isWalkable should be true. Cost is normal.
                    isPassable = true;
                    cost = 1; // Standard move cost through open door
                }
                // If 'broken' door, its own 'impassable' tag (or lack thereof) via isWalkable handles it.
            }

            if (isPassable) {
                neighbors.push({ x: nextX, y: nextY, z: currentZ, cost: cost });

                // Check if this horizontally-reached tile is ALSO an explicit Z-transition point
                if (tileDefAtNext && tileDefAtNext.tags?.includes('z_transition') && tileDefAtNext.target_dz !== undefined) {
                    const finalDestZ = currentZ + tileDefAtNext.target_dz;
                    if (window.mapRenderer.isWalkable(nextX, nextY, finalDestZ)) {
                        const zCost = tileDefAtNext.z_cost || 1;
                        neighbors.push({ x: nextX, y: nextY, z: finalDestZ, cost: cost + zCost });
                    }
                }
            }
        }

        // Z-Transitions from CURRENT node (ladders, holes directly underfoot, using a specific tile at current node)
        const currentTileDef = getTileDefFromMapDataLayers(currentNode.x, currentNode.y, currentNode.z, mapData, tileset);
        if (currentTileDef && currentTileDef.tags?.includes('z_transition') && currentTileDef.target_dz !== undefined) {
            const targetZ = currentNode.z + currentTileDef.target_dz;
            if (window.mapRenderer.isWalkable(currentNode.x, currentNode.y, targetZ)) {
                neighbors.push({
                    x: currentNode.x, y: currentNode.y, z: targetZ,
                    cost: currentTileDef.z_cost || 1
                });
            }
        }

        // Implicit Z-moves (climbing up onto an adjacent block, or falling down from an edge)
        for (const move of cardinalMoves) {
            const stepNextX = currentNode.x + move.dx;
            const stepNextY = currentNode.y + move.dy;
            const stepCurrentZ = currentNode.z;

            const targetUpZ = stepCurrentZ + 1;
            const isTargetImpassableAtCurrentZ = !window.mapRenderer.isWalkable(stepNextX, stepNextY, stepCurrentZ) &&
                window.mapRenderer.getCollisionTileAt(stepNextX, stepNextY, stepCurrentZ) !== "";

            if (isTargetImpassableAtCurrentZ &&
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
            if (closedSet.has(neighborKey)) continue;

            const gCost = currentNode.g + neighborPos.cost;
            let existingNeighbor = openSet.find(node => node.x === neighborPos.x && node.y === neighborPos.y && node.z === neighborPos.z);

            if (!existingNeighbor) {
                openSet.push({
                    x: neighborPos.x, y: neighborPos.y, z: neighborPos.z,
                    g: gCost, h: heuristic(neighborPos, endPos),
                    f: gCost + heuristic(neighborPos, endPos), parent: currentNode
                });
            } else if (gCost < existingNeighbor.g) {
                existingNeighbor.g = gCost;
                existingNeighbor.f = gCost + existingNeighbor.h;
                existingNeighbor.parent = currentNode;
            }
        }
    }
    logToConsole(`findPath3D: No path found from (${startPos.x},${startPos.y},${startPos.z}) to (${endPos.x},${endPos.y},${endPos.z}).`, "orange");
    return null;
}
window.findPath3D = findPath3D;


/**
 * Checks for a clear line of sight between two 3D points.
 * Uses getLine3D and isTileBlockingVision from mapRenderer.js.
 * @param {object} startPos - The starting position {x, y, z}.
 * @param {object} endPos - The target position {x, y, z}.
 * @returns {boolean} True if there is a clear line of sight, false otherwise.
 */
// function hasLineOfSight3D(startPos, endPos, tilesetsData, mapDataFromCaller) { // Parameters added // Original
//     // ... original function body
// }
// window.hasLineOfSight3D = hasLineOfSight3D; // Original

// Wrapped version for profiling
function hasLineOfSight3D(startPos, endPos, tilesetsData, mapDataFromCaller) {
    return profileFunction("hasLineOfSight3D", (_startPos, _endPos, _tilesetsData, _mapDataFromCaller) => {
        // Original function body starts here
        logToConsole(`[hasLineOfSight3D Entry] Received tilesetsData is valid: ${!!_tilesetsData} (Keys: ${_tilesetsData ? Object.keys(_tilesetsData).length : 'N/A'}), mapDataFromCaller is valid: ${!!_mapDataFromCaller} (Levels: ${_mapDataFromCaller ? !!_mapDataFromCaller.levels : 'N/A'})`, 'magenta');

        let tilesets = _tilesetsData;
        let mapData = _mapDataFromCaller;
        let usingFallbackData = false;

        if (!tilesets || !mapData || (typeof mapData === 'object' && mapData !== null && !mapData.levels)) { // Check mapData.levels more carefully
            logToConsole(`[hasLineOfSight3D] Passed parameters appear invalid or incomplete. Attempting fallback to global fetch. Passed tilesets: ${!!_tilesetsData}, mapData: ${!!_mapDataFromCaller}, mapData.levels: ${_mapDataFromCaller && typeof _mapDataFromCaller === 'object' ? !!_mapDataFromCaller.levels : 'N/A'}`, 'orange');
            tilesets = window.assetManager ? window.assetManager.tilesets : null;
            mapData = window.mapRenderer ? window.mapRenderer.getCurrentMapData() : null;
            usingFallbackData = true;
            if (tilesets && Object.keys(tilesets).length > 0 && mapData && mapData.levels) {
                logToConsole(`[hasLineOfSight3D] Fallback successful. Tilesets keys: ${Object.keys(tilesets).length}, MapData levels present: ${!!mapData.levels}`, 'green');
            } else {
                logToConsole(`[hasLineOfSight3D] Fallback FAILED. Global tilesets: ${!!tilesets} (Keys: ${tilesets ? Object.keys(tilesets).length : 'N/A'}), Global mapData: ${!!mapData}, Global mapData.levels: ${mapData && typeof mapData === 'object' ? !!mapData.levels : 'N/A'}`, 'red');
            }
        }

        if (!_startPos || !_endPos ||
            _startPos.x === undefined || _startPos.y === undefined || _startPos.z === undefined ||
            _endPos.x === undefined || _endPos.y === undefined || _endPos.z === undefined) {
            logToConsole("hasLineOfSight3D: Invalid input positions (start/end).", "error");
            return false;
        }

        if (typeof getLine3D !== 'function') {
            logToConsole("hasLineOfSight3D: getLine3D function is not available.", "error");
            return false;
        }
        if (typeof window.mapRenderer?.isTileBlockingVision !== 'function') {
            logToConsole("hasLineOfSight3D: mapRenderer.isTileBlockingVision function is not available.", "error");
            return false;
        }

        if (!tilesets || Object.keys(tilesets).length === 0 || !mapData || (typeof mapData === 'object' && mapData !== null && !mapData.levels)) {
            logToConsole(`hasLineOfSight3D: Critical data STILL missing ${usingFallbackData ? '(after fallback attempt)' : '(with passed params)'}. Tilesets: ${!!tilesets} (Keys: ${tilesets ? Object.keys(tilesets).length : 'N/A'}), MapData: ${!!mapData}, MapData.levels: ${mapData && typeof mapData === 'object' ? !!mapData.levels : 'N/A'}. Assuming no LOS.`, "red");
            return false;
        }

        const line = getLine3D(_startPos.x, _startPos.y, _startPos.z, _endPos.x, _endPos.y, _endPos.z);

        if (!line || line.length === 0) {
            return false;
        }
        if (line.length === 1) {
            return true;
        }

        for (const point of line.slice(1)) {
            if (window.mapRenderer.isTileBlockingVision(point.x, point.y, point.z, _startPos.z)) {
                return false;
            }
        }
        return true;
        // Original function body ends here
    }, startPos, endPos, tilesetsData, mapDataFromCaller);
}
window.hasLineOfSight3D = hasLineOfSight3D;

/**
    let mapData = mapDataFromCaller;
    let usingFallbackData = false;

    if (!tilesets || !mapData || (typeof mapData === 'object' && mapData !== null && !mapData.levels)) { // Check mapData.levels more carefully
        logToConsole(`[hasLineOfSight3D] Passed parameters appear invalid or incomplete. Attempting fallback to global fetch. Passed tilesets: ${!!tilesetsData}, mapData: ${!!mapDataFromCaller}, mapData.levels: ${mapDataFromCaller && typeof mapDataFromCaller === 'object' ? !!mapDataFromCaller.levels : 'N/A'}`, 'orange');
        tilesets = window.assetManager ? window.assetManager.tilesets : null;
        mapData = window.mapRenderer ? window.mapRenderer.getCurrentMapData() : null;
        usingFallbackData = true;
        if (tilesets && Object.keys(tilesets).length > 0 && mapData && mapData.levels) {
            logToConsole(`[hasLineOfSight3D] Fallback successful. Tilesets keys: ${Object.keys(tilesets).length}, MapData levels present: ${!!mapData.levels}`, 'green');
        } else {
            logToConsole(`[hasLineOfSight3D] Fallback FAILED. Global tilesets: ${!!tilesets} (Keys: ${tilesets ? Object.keys(tilesets).length : 'N/A'}), Global mapData: ${!!mapData}, Global mapData.levels: ${mapData && typeof mapData === 'object' ? !!mapData.levels : 'N/A'}`, 'red');
        }
    }

    if (!startPos || !endPos ||
        startPos.x === undefined || startPos.y === undefined || startPos.z === undefined ||
        endPos.x === undefined || endPos.y === undefined || endPos.z === undefined) {
        logToConsole("hasLineOfSight3D: Invalid input positions (start/end).", "error");
        return false;
    }

    if (typeof getLine3D !== 'function') {
        logToConsole("hasLineOfSight3D: getLine3D function is not available.", "error");
        return false;
    }
    if (typeof window.mapRenderer?.isTileBlockingVision !== 'function') {
        logToConsole("hasLineOfSight3D: mapRenderer.isTileBlockingVision function is not available.", "error");
        return false;
    }

    // Crucial check after potential fallback
    if (!tilesets || Object.keys(tilesets).length === 0 || !mapData || (typeof mapData === 'object' && mapData !== null && !mapData.levels)) {
        logToConsole(`hasLineOfSight3D: Critical data STILL missing ${usingFallbackData ? '(after fallback attempt)' : '(with passed params)'}. Tilesets: ${!!tilesets} (Keys: ${tilesets ? Object.keys(tilesets).length : 'N/A'}), MapData: ${!!mapData}, MapData.levels: ${mapData && typeof mapData === 'object' ? !!mapData.levels : 'N/A'}. Assuming no LOS.`, "red");
        return false;
    }

    const line = getLine3D(startPos.x, startPos.y, startPos.z, endPos.x, endPos.y, endPos.z);

    if (!line || line.length === 0) {
        //logToConsole("hasLineOfSight3D: Line generation failed or line is empty.", "orange");
        return false;
    }
    if (line.length === 1) {
        return true;
    }

    // Iterate through each point in the line, starting from the second point (index 1).
    // The first point (index 0) is the startPos itself.
    // The loop will include the endPos.
    for (const point of line.slice(1)) {
        if (window.mapRenderer.isTileBlockingVision(point.x, point.y, point.z, startPos.z)) {
            // logToConsole(`LOS blocked at:(${point.x},${point.y},${point.z}) by tile, viewer at Z=${startPos.z}`);
            return false;
        }
    }

    // If the loop completes, no obstructions were found.
    return true;
}
window.hasLineOfSight3D = hasLineOfSight3D;

/**
 * Darkens a HEX color by a given percentage.
 * @param {string} hexColor - The hex color string (e.g., "#RRGGBB" or "#RGB").
 * @param {number} amount - The percentage to darken (0.0 to 1.0). E.g., 0.2 for 20%.
 * @returns {string} The new darkened hex color string. Returns input if invalid.
 */
function darkenColor(hexColor, amount) {
    if (typeof hexColor !== 'string' || !hexColor.startsWith('#') || typeof amount !== 'number' || amount < 0 || amount > 1) {
        // console.warn(`darkenColor: Invalid input hexColor: ${hexColor}, amount: ${amount}. Returning original or black.`);
        return hexColor || '#000000';
    }

    let hex = hexColor.slice(1); // Remove #

    // Handle shorthand hex (e.g., "#03F" -> "#0033FF")
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }

    if (hex.length !== 6) {
        // console.warn(`darkenColor: Invalid hex length after processing: ${hex}. Returning original or black.`);
        return hexColor || '#000000';
    }

    try {
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);

        r = Math.max(0, Math.floor(r * (1 - amount)));
        g = Math.max(0, Math.floor(g * (1 - amount)));
        b = Math.max(0, Math.floor(b * (1 - amount)));

        const toHex = (c) => {
            const hexVal = c.toString(16);
            return hexVal.length === 1 ? '0' + hexVal : hexVal;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch (e) {
        // console.error(`darkenColor: Error parsing hex string: ${hexColor}`, e);
        return hexColor || '#000000'; // Return original on error
    }
}
window.darkenColor = darkenColor;

/**
 * Lightens a HEX color by a given percentage.
 * @param {string} hexColor - The hex color string (e.g., "#RRGGBB" or "#RGB").
 * @param {number} amount - The percentage to lighten (0.0 to 1.0). E.g., 0.2 for 20%.
 * @returns {string} The new lightened hex color string. Returns input if invalid.
 */
function lightenColor(hexColor, amount) {
    if (typeof hexColor !== 'string' || !hexColor.startsWith('#') || typeof amount !== 'number' || amount < 0 || amount > 1) {
        // console.warn(`lightenColor: Invalid input hexColor: ${hexColor}, amount: ${amount}. Returning original or white.`);
        return hexColor || '#FFFFFF';
    }

    let hex = hexColor.slice(1); // Remove #

    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }

    if (hex.length !== 6) {
        // console.warn(`lightenColor: Invalid hex length after processing: ${hex}. Returning original or white.`);
        return hexColor || '#FFFFFF';
    }

    try {
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);

        r = Math.min(255, Math.floor(r * (1 + amount)));
        g = Math.min(255, Math.floor(g * (1 + amount)));
        b = Math.min(255, Math.floor(b * (1 + amount)));

        const toHex = (c) => {
            const hexVal = c.toString(16);
            return hexVal.length === 1 ? '0' + hexVal : hexVal;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch (e) {
        // console.error(`lightenColor: Error parsing hex string: ${hexColor}`, e);
        return hexColor || '#FFFFFF'; // Return original on error
    }
}
window.lightenColor = lightenColor;

/**
 * Converts map tile coordinates to absolute screen pixel coordinates.
 * @param {number} mapX - The map tile X coordinate.
 * @param {number} mapY - The map tile Y coordinate.
 * @param {number} mapZ - The map tile Z coordinate (used to check if on current view).
 * @returns {object|null} An object {x, y} with screen coordinates, or null if map container/entity not on view.
 */
function mapToScreenCoordinates(mapX, mapY, mapZ) {
    if (mapZ !== window.gameState.currentViewZ) {
        // Only provide coordinates for entities on the current view Z
        return null;
    }

    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) return null;

    const rect = mapContainer.getBoundingClientRect();
    const scrollLeft = mapContainer.scrollLeft;
    const scrollTop = mapContainer.scrollTop;

    // Determine tile size (character width and height)
    // This should be robust. Using a temporary span is a common way.
    let tileWidth = 10; // Default fallback
    let tileHeight = 18; // Default fallback

    const tempSpan = document.createElement('span');
    tempSpan.style.fontFamily = getComputedStyle(mapContainer).fontFamily;
    tempSpan.style.fontSize = getComputedStyle(mapContainer).fontSize;
    tempSpan.style.lineHeight = getComputedStyle(mapContainer).lineHeight;
    tempSpan.style.position = 'absolute';
    tempSpan.style.visibility = 'hidden';
    tempSpan.textContent = 'M'; // A common character to measure
    document.body.appendChild(tempSpan);
    tileWidth = tempSpan.offsetWidth;
    tileHeight = tempSpan.offsetHeight;
    document.body.removeChild(tempSpan);

    if (tileWidth === 0 || tileHeight === 0) { // Safety check if offsetWidth/Height is 0
        console.warn("mapToScreenCoordinates: Detected tileWidth or tileHeight as 0. Using defaults.");
        tileWidth = 10;
        tileHeight = 18;
    }

    // Calculate position of the top-left of the tile relative to the viewport
    const screenX = rect.left - scrollLeft + (mapX * tileWidth) + (tileWidth / 2); // Center of the tile X
    const screenY = rect.top - scrollTop + (mapY * tileHeight) + (tileHeight / 2); // Center of the tile Y

    return { x: screenX, y: screenY };
}
window.mapToScreenCoordinates = mapToScreenCoordinates;

// Min-Priority Queue Implementation (Min-Heap)
class PriorityQueue {
    constructor(comparator = (a, b) => a.f < b.f) { // Expects nodes to have an 'f' property for A*
        this._heap = [];
        this._comparator = comparator;
    }

    size() {
        return this._heap.length;
    }

    isEmpty() {
        return this.size() === 0;
    }

    peek() {
        return this._heap[0];
    }

    push(...values) {
        values.forEach(value => {
            this._heap.push(value);
            this._siftUp();
        });
        return this.size();
    }

    pop() {
        const poppedValue = this.peek();
        const bottom = this.size() - 1;
        if (bottom > 0) {
            this._swap(0, bottom);
        }
        this._heap.pop();
        this._siftDown();
        return poppedValue;
    }

    replace(value) {
        const replacedValue = this.peek();
        this._heap[0] = value;
        this._siftDown();
        return replacedValue;
    }

    _parent(i) {
        return ((i + 1) >>> 1) - 1;
    }

    _left(i) {
        return (i << 1) + 1;
    }

    _right(i) {
        return (i + 1) << 1;
    }

    _greater(i, j) {
        return this._comparator(this._heap[i], this._heap[j]);
    }

    _swap(i, j) {
        [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
    }

    _siftUp() {
        let node = this.size() - 1;
        while (node > 0 && this._greater(node, this._parent(node))) {
            this._swap(node, this._parent(node));
            node = this._parent(node);
        }
    }

    _siftDown() {
        let node = 0;
        while (
            (this._left(node) < this.size() && this._greater(this._left(node), node)) ||
            (this._right(node) < this.size() && this._greater(this._right(node), node))
        ) {
            let maxChild = (this._right(node) < this.size() && this._greater(this._right(node), this._left(node))) ? this._right(node) : this._left(node);
            this._swap(node, maxChild);
            node = maxChild;
        }
    }

    // Method to update a node's position if its priority changes (needed for A*)
    // This is a simplified version; a more robust heap would allow efficient updates.
    // For A*, if a shorter path to an existing node in openSet is found, its 'f' value changes.
    // The heap needs to be re-heapified or the node needs to be removed and re-inserted.
    // A common approach is to allow duplicates with different priorities and let the pop() find the best one,
    // or to use a more complex heap that supports decrease-key.
    // For this implementation, we'll rely on potentially adding a better path as a new entry,
    // and the closedSet will prevent reprocessing the same coordinates if a worse path was already expanded.
    // A find and update method could be:
    // updateNode(node) { /* find node, update priority, then sift up/down */ }
    // However, for simplicity, we'll just push new nodes if a better path is found,
    // and the closedSet will handle not reprocessing.
}


// Performance Profiling
window.dev_profiler = {}; // Store timings
window.dev_profiler_enabled = false; // Enable via console: window.dev_profiler_enabled = true

function profileFunction(name, func, ...args) {
    if (!window.dev_profiler_enabled) {
        return func(...args);
    }

    const start = performance.now();
    const result = func(...args);
    const end = performance.now();
    const duration = end - start;

    if (!window.dev_profiler[name]) {
        window.dev_profiler[name] = {
            calls: 0,
            totalTime: 0,
            maxTime: 0,
            avgTime: 0,
            history: []
        };
    }

    const stats = window.dev_profiler[name];
    stats.calls++;
    stats.totalTime += duration;
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.avgTime = stats.totalTime / stats.calls;
    stats.history.push(duration);
    if (stats.history.length > 100) { // Keep last 100 timings
        stats.history.shift();
    }

    // Optional: Log if a call is particularly slow
    // if (duration > 16) { // e.g. > 1 frame at 60fps
    //     logToConsole(`Profiler: ${name} took ${duration.toFixed(2)}ms (Call #${stats.calls})`, 'magenta');
    // }

    return result;
}
window.profileFunction = profileFunction;

// Example usage (do not uncomment here, apply in specific files):
// Original: someFunction(arg1, arg2);
// Profiled: profileFunction("someFunction", someFunction, arg1, arg2);
//
// To view stats in console:
// console.log(window.dev_profiler);
// To reset stats:
// window.dev_profiler = {};