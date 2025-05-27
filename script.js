/**************************************************************
 * Global State & Constants
 **************************************************************/
const assetManager = new AssetManager();
let currentMapData = null; // To hold the map data from assetManager

const gameState = {
    // Instead of a single 'map', we now have separate layers.
    // These will be populated from currentMapData.layers when a map is loaded.
    layers: {
        landscape: [],
        building: [],
        item: [],
        roof: []
    },
    // Player positioning and game status
    playerPos: { x: 2, y: 2 }, // Will be updated when a map is loaded
    gameStarted: false,

    // Turn-based properties
    currentTurn: 1,
    movementPointsRemaining: 6,
    actionPointsRemaining: 1,
    hasDashed: false,

    // Stats and Skills
    stats: [
        { name: "Strength", points: 3, bgColor: "green", textColor: "black" },
        { name: "Intelligence", points: 3, bgColor: "yellow", textColor: "black" },
        { name: "Dexterity", points: 3, bgColor: "orange", textColor: "black" },
        { name: "Constitution", points: 3, bgColor: "red", textColor: "black" },
        { name: "Perception", points: 3, bgColor: "cyan", textColor: "black" },
        { name: "Willpower", points: 3, bgColor: "blue", textColor: "white" },
        { name: "Charisma", points: 3, bgColor: "darkred", textColor: "white" },
        { name: "Marksmanship", points: 3, bgColor: "magenta", textColor: "black" }
    ],
    skills: [
        { name: "Animal Handling", points: 0, bgColor: "darkred", textColor: "white" },
        { name: "Electronics", points: 0, bgColor: "yellow", textColor: "black" },
        { name: "Explosives", points: 0, bgColor: "magenta", textColor: "black" },
        { name: "Guns", points: 0, bgColor: "magenta", textColor: "black" },
        { name: "Intimidation", points: 0, bgColor: "darkred", textColor: "white" },
        { name: "Investigation", points: 0, bgColor: "cyan", textColor: "black" },
        { name: "Lockpick", points: 0, bgColor: "orange", textColor: "black" },
        { name: "Medicine", points: 0, bgColor: "yellow", textColor: "black" },
        { name: "Melee Weapons", points: 0, bgColor: "green", textColor: "black" },
        { name: "Persuasion", points: 0, bgColor: "darkred", textColor: "white" },
        { name: "Repair", points: 0, bgColor: "yellow", textColor: "black" },
        { name: "Sleight of Hand", points: 0, bgColor: "orange", textColor: "black" },
        { name: "Stealth", points: 0, bgColor: "orange", textColor: "black" },
        { name: "Survival", points: 0, bgColor: "red", textColor: "black" },
        { name: "Unarmed", points: 0, bgColor: "green", textColor: "black" }
    ],

    // Interactable items and selections
    interactableItems: [],
    selectedItemIndex: -1,
    selectedActionIndex: -1,
    isActionMenuActive: false,

    // Default: hide roof
    showRoof: false,

    // Stat/skill limits
    MAX_SKILL_POINTS: 30,
    MAX_STAT_VALUE: 10,
    MIN_STAT_VALUE: 1,

    //Inventory
    inventoryOpen: false,
    inventoryCursor: 0,

    // Tile cache for rendering optimization
    tileCache: null,
    brElementsCache: null,
    renderScheduled: false,

    // NPCs
    npcs: [],

    // Combat Submenu and Pending Action
    activeSubMenu: null, // e.g., 'selectBodyPart'
    pendingCombatAction: {}, // Stores details of the action being built

    // Combat State
    isInCombat: false,
    combatCurrentAttacker: null,
    combatCurrentDefender: null,
    combatPhase: null, // e.g., 'attackerDeclare', 'defenderDeclare', 'resolveRolls', 'applyDamage'
    playerDefenseChoice: null, // e.g., 'dodge', 'block_unarmed', 'block_armed'
    npcDefenseChoice: null,
};

/**************************************************************
 * Clothing System Constants and Initialization
 **************************************************************/
const ClothingLayers = {
    HEAD_BOTTOM: "head_bottom",
    HEAD_TOP: "head_top",
    TORSO_BOTTOM: "torso_bottom",
    TORSO_TOP: "torso_top",
    LEFT_ARM_BOTTOM: "left_arm_bottom",
    LEFT_ARM_TOP: "left_arm_top",
    RIGHT_ARM_BOTTOM: "right_arm_bottom",
    RIGHT_ARM_TOP: "right_arm_top",
    LEGS_BOTTOM: "legs_bottom",
    LEGS_TOP: "legs_top",
    FEET_BOTTOM: "feet_bottom",
    FEET_TOP: "feet_top",
    BACKPACK: "backpack",
    WAIST: "waist"
};

// Initialize player object and wornClothing if they don't exist
if (!gameState.player) {
    gameState.player = {};
}

gameState.player.wornClothing = {
    [ClothingLayers.HEAD_BOTTOM]: null,
    [ClothingLayers.HEAD_TOP]: null,
    [ClothingLayers.TORSO_BOTTOM]: null,
    [ClothingLayers.TORSO_TOP]: null,
    [ClothingLayers.LEFT_ARM_BOTTOM]: null,
    [ClothingLayers.LEFT_ARM_TOP]: null,
    [ClothingLayers.RIGHT_ARM_BOTTOM]: null,
    [ClothingLayers.RIGHT_ARM_TOP]: null,
    [ClothingLayers.LEGS_BOTTOM]: null,
    [ClothingLayers.LEGS_TOP]: null,
    [ClothingLayers.FEET_BOTTOM]: null,
    [ClothingLayers.FEET_TOP]: null,
    [ClothingLayers.BACKPACK]: null,
    [ClothingLayers.WAIST]: null
};

/**************************************************************
 * Utility & Helper Functions
 **************************************************************/
async function handleMapSelectionChange(mapId) {
    if (!mapId || !assetManager) {
        console.warn("Map selection change triggered with invalid mapId or missing assetManager.");
        return;
    }
    console.log(`Map selected via UI: ${mapId}`);
    const loadedMap = await assetManager.loadMap(mapId);
    if (loadedMap) {
        currentMapData = loadedMap;
        gameState.layers = currentMapData.layers; // Sync gameState.layers
        // Reset player position or load from map data if available in currentMapData
        gameState.playerPos = currentMapData.startPos || { x: 2, y: 2 };

        // Ensure tileCache is invalidated or resized for the new map
        gameState.tileCache = null; // Force re-creation of cache in renderMapLayers

        scheduleRender();
        detectInteractableItems();
        showInteractableItems();
        logToConsole(`Map ${currentMapData.name} loaded.`);
    } else {
        logToConsole(`Failed to load map: ${mapId}`);
        const errorDisplay = document.getElementById('errorMessageDisplay');
        if (errorDisplay) {
            errorDisplay.textContent = `Failed to load map: ${mapId}. Check console for details.`;
        }
        currentMapData = null;
        // Clear layers to prevent rendering a stale map
        gameState.layers = { landscape: [], building: [], item: [], roof: [] };
        // Also clear the map display area
        const container = document.getElementById("mapContainer");
        if (container) container.innerHTML = "<p style='color:red;'>Error: Map could not be loaded.</p>";
        // scheduleRender(); // Render the cleared state
    }
}

async function setupMapSelector(assetManagerInstance) {
    const mapSelector = document.getElementById('mapSelector');
    if (!mapSelector) {
        console.error("Map selector element #mapSelector not found.");
        const errorDisplay = document.getElementById('errorMessageDisplay');
        if (errorDisplay) errorDisplay.textContent = "UI Error: Map selector not found.";
        return;
    }

    // Fetch Base Map Index
    const baseMapIndexUrl = `/assets/maps/mapIndex.json?t=${Date.now()}`;
    let baseMapIndex = [];
    try {
        const response = await fetch(baseMapIndexUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for base mapIndex.json`);
        }
        baseMapIndex = await response.json();
        assetManagerInstance.setMapIndexData(baseMapIndex); // Set base map index in AssetManager
        console.log("Base map index loaded and set in AssetManager.");
    } catch (error) {
        console.error("Failed to load base map index:", error);
        const errorDisplay = document.getElementById('errorMessageDisplay');
        if (errorDisplay) errorDisplay.textContent = "Error loading base map list. Some maps may be unavailable.";
        // Proceeding without base maps, user maps might still load
    }

    // Clear existing options
    mapSelector.innerHTML = '';

    // Populate with base map options
    baseMapIndex.forEach(mapInfo => {
        const option = document.createElement('option');
        option.value = mapInfo.id;
        option.textContent = mapInfo.name;
        mapSelector.appendChild(option);
    });
    console.log("Base map options populated.");

    // Fetch and Populate User Map Index
    const userMapIndexUrl = `/user_assets/maps/mapIndex.json?t=${Date.now()}`;
    let userMapIndex = [];
    try {
        const userResponse = await fetch(userMapIndexUrl);
        if (userResponse.ok) {
            userMapIndex = await userResponse.json();
            if (userMapIndex && userMapIndex.length > 0) {
                console.log("User map index found, adding to selector.");
                if (baseMapIndex.length > 0 && userMapIndex.length > 0) { // Add separator only if both exist
                    const separator = document.createElement('option');
                    separator.disabled = true;
                    separator.textContent = '--- User Maps ---';
                    mapSelector.appendChild(separator);
                }
                userMapIndex.forEach(mapInfo => {
                    const option = document.createElement('option');
                    option.value = mapInfo.id;
                    option.textContent = `[User] ${mapInfo.name}`;
                    mapSelector.appendChild(option);
                });
                console.log("User maps added to selector.");
                // If baseMapIndex was empty, userMapIndex becomes the main source for map names in AssetManager
                if (baseMapIndex.length === 0) {
                    assetManagerInstance.setMapIndexData(userMapIndex);
                } else {
                    // Optionally, merge userMapIndex into mapIndexData in AssetManager if needed for name lookups
                    // For now, setMapIndexData overwrites. If names for user maps are only in userMapIndex,
                    // and base maps were loaded first, AssetManager might not have user map names unless set again.
                    // This could be refined: assetManager.addMapIndexData(userMapIndex)
                }
            }
        } else if (userResponse.status === 404) {
            console.log("User map index file (/user_assets/maps/mapIndex.json) not found, skipping.");
        } else {
            throw new Error(`HTTP error! status: ${userResponse.status} for user mapIndex.json`);
        }
    } catch (error) {
        console.error("Failed to load or process user map index:", error);
        // Non-critical, user maps might just not appear
    }

    // The onchange is already set in HTML: onchange="handleMapSelectionChange(this.value)"
    // No need to add event listener here if it's hardcoded in HTML.
    // If it weren't, it would be:
    // mapSelector.addEventListener('change', (event) => handleMapSelectionChange(event.target.value));

    console.log("Map selector setup complete.");
}


function logToConsole(message) {
    console.log(message);
    const consoleElement = document.getElementById("console");
    if (consoleElement) {
        const para = document.createElement("p");
        para.textContent = message;
        consoleElement.appendChild(para);
        consoleElement.scrollTop = consoleElement.scrollHeight;
    }
}
function isPassable(tileId) {
    if (!tileId) return true;
    const tileData = assetManager.tilesets[tileId];
    if (!tileData) return true; // Treat unknown tile IDs as passable for now, or log warning
    const tags = tileData.tags || [];
    return !tags.includes("impassable");
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
function getStatModifier(statName, entity) {
    const statPoints = getStatValue(statName, entity);
    return Math.floor(statPoints / 2) - 1;
}

// Calculates the modifier for a given skill.
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

// Calculates the attack roll for an attacker.
function calculateAttackRoll(attacker, weapon, targetBodyPart, actionContext = {}) {
    let skillName;
    if (!weapon || !weapon.type) { // Unarmed
        skillName = "Unarmed";
    } else if (weapon.type.includes("melee")) {
        skillName = "Melee Weapons";
    } else if (weapon.type.includes("firearm") || weapon.type.includes("ranged_other")) {
        skillName = "Guns";
    } else {
        skillName = "Unarmed"; // Default for unknown weapon types
    }

    const skillModifier = getSkillModifier(skillName, attacker); // Changed from getSkillValue
    let baseRoll = rollDie(20);

    // Disadvantage for second attacks
    if (actionContext.isSecondAttack) {
        baseRoll = Math.min(rollDie(20), rollDie(20));
    }

    let bodyPartModifier = 0;
    const lowerCaseTargetBodyPart = targetBodyPart.toLowerCase(); // Good practice for comparison

    if (lowerCaseTargetBodyPart === "head") {
        bodyPartModifier = -4;
    } else if (lowerCaseTargetBodyPart === "leftarm" ||
        lowerCaseTargetBodyPart === "rightarm" ||
        lowerCaseTargetBodyPart === "leftleg" ||
        lowerCaseTargetBodyPart === "rightleg") {
        bodyPartModifier = -1;
    }
    // Torso has a modifier of 0, so no explicit check needed if it's the default.

    const totalAttackRoll = baseRoll + skillModifier + bodyPartModifier + (actionContext.rangeModifier || 0); // Changed skillValue to skillModifier

    // Criticals do not apply on disadvantaged rolls (e.g. second attack)
    const canCrit = !actionContext.isSecondAttack;

    return {
        roll: totalAttackRoll,
        naturalRoll: baseRoll,
        isCriticalHit: canCrit && baseRoll === 20,
        isCriticalMiss: canCrit && baseRoll === 1
    };
}

// Calculates the defense roll for a defender.
function calculateDefenseRoll(defender, defenseType, attackerWeapon, actionContext = {}) {
    const baseRoll = rollDie(20);
    let baseDefenseValue = 0;
    let dualWieldBonus = 0;

    switch (defenseType) {
        case "Dodge":
            baseDefenseValue = getStatModifier("Dexterity", defender) + getSkillModifier("Unarmed", defender); // Changed to getStatModifier and getSkillModifier
            break;
        case "BlockUnarmed":
            baseDefenseValue = getStatModifier("Constitution", defender) + getSkillModifier("Unarmed", defender); // Changed to getStatModifier and getSkillModifier
            break;
        case "BlockArmed":
            baseDefenseValue = getSkillModifier("Melee Weapons", defender); // Changed to getSkillModifier
            // Check for dual wield bonus for player
            if (defender === gameState &&
                gameState.inventory.handSlots[0] && gameState.inventory.handSlots[0].type && gameState.inventory.handSlots[0].type.includes("melee") &&
                gameState.inventory.handSlots[1] && gameState.inventory.handSlots[1].type && gameState.inventory.handSlots[1].type.includes("melee") &&
                getSkillValue("Melee Weapons", defender) >= 5) {
                dualWieldBonus = 2;
            }
            // For NPCs, we'd need an 'isDualWielding' property or similar logic
            // else if (defender.isDualWielding && getSkillValue("Melee Weapons", defender) >= 5) {
            //    dualWieldBonus = 2;
            // }
            break;
    }

    const totalDefenseRoll = baseRoll + baseDefenseValue + dualWieldBonus;

    return {
        roll: totalDefenseRoll,
        naturalRoll: baseRoll,
        isCriticalSuccess: baseRoll === 20,
        isCriticalFailure: baseRoll === 1
    };
}

/**************************************************************
 * New Map System Functions
 **************************************************************/
// Create an empty grid with a default tile.
function createEmptyGrid(width, height, defaultTile = "") {
    const grid = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            row.push(defaultTile);
        }
        grid.push(row);
    }
    return grid;
}

// Toggle roof layer visibility.
function toggleRoof() {
    gameState.showRoof = !gameState.showRoof;
    scheduleRender();
    logToConsole("Roof layer toggled " + (gameState.showRoof ? "on" : "off"));
}

// New function to schedule rendering with requestAnimationFrame
function scheduleRender() {
    if (!gameState.renderScheduled) {
        gameState.renderScheduled = true;
        requestAnimationFrame(() => {
            renderMapLayers(); // The actual rendering call
            gameState.renderScheduled = false; // Reset the flag after rendering
        });
    }
}

// Render each layer separately into a container with id="mapContainer".
// Layers are drawn in a single pass, picking the topmost non-empty tile.
// After drawing everything, we update the highlight.
function renderMapLayers() {
    const container = document.getElementById("mapContainer");

    // Define isInitialRender
    let isInitialRender = false;
    if (!gameState.tileCache ||
        !currentMapData || !currentMapData.dimensions || // Ensure currentMapData and dimensions exist
        gameState.tileCache.length !== currentMapData.dimensions.height ||
        (gameState.tileCache[0] && gameState.tileCache[0].length !== currentMapData.dimensions.width)) {
        isInitialRender = true;
    }

    if (!currentMapData || !currentMapData.dimensions || !currentMapData.layers) {
        if (isInitialRender) container.innerHTML = "<p>No map loaded or map data is invalid.</p>";
        else console.warn("renderMapLayers called with no currentMapData but not initialRender. Map display might be stale.");
        gameState.tileCache = null; // Clear cache if no map
        return;
    }

    const H = currentMapData.dimensions.height;
    const W = currentMapData.dimensions.width;

    if (H === 0 || W === 0) {
        if (isInitialRender) container.innerHTML = "<p>Map dimensions are zero. Cannot render.</p>";
        else console.warn("renderMapLayers called with zero dimensions but not initialRender. Map display might be stale.");
        gameState.tileCache = null;
        return;
    }

    // Use the correctly defined isInitialRender
    if (isInitialRender) {
        container.innerHTML = ""; // Clear container for full re-render or resize
        gameState.tileCache = Array(H).fill(null).map(() => Array(W).fill(null));
        // gameState.brElementsCache is not strictly needed if we always clear and rebuild spans.
    }

    const fragment = isInitialRender ? document.createDocumentFragment() : null;

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            // Determine the actual tile ID from layers
            let actualTileId = currentMapData.layers.landscape?.[y]?.[x] || "";
            if (currentMapData.layers.building?.[y]?.[x]) actualTileId = currentMapData.layers.building[y][x];
            if (currentMapData.layers.item?.[y]?.[x]) actualTileId = currentMapData.layers.item[y][x];
            if (gameState.showRoof && currentMapData.layers.roof?.[y]?.[x]) {
                actualTileId = currentMapData.layers.roof[y][x];
            }

            // Determine target display properties
            let targetSprite = "";
            let targetColor = "";
            let targetDisplayId = actualTileId; // This will be "PLAYER" if player is here

            const isPlayerCurrentlyOnTile = (x === gameState.playerPos.x && y === gameState.playerPos.y &&
                !(gameState.showRoof && currentMapData.layers.roof?.[y]?.[x]));

            if (isPlayerCurrentlyOnTile) {
                targetSprite = "☻";
                targetColor = "green";
                targetDisplayId = "PLAYER"; // Special ID for player
            } else if (actualTileId) {
                const def = assetManager.tilesets[actualTileId]; // Use assetManager.tilesets
                if (def) {
                    targetSprite = def.sprite;
                    targetColor = def.color;
                } else {
                    // console.warn(`Tile ID ${actualTileId} not found in tileset.`);
                    targetSprite = '?'; // Placeholder for unknown tile
                    targetColor = 'magenta';
                }
            } // Else, it's an empty tile, sprite and color remain ""

            if (isInitialRender) {
                const span = document.createElement("span");
                span.className = "tile";
                span.dataset.x = x;
                span.dataset.y = y;
                span.textContent = targetSprite;
                span.style.color = targetColor;

                gameState.tileCache[y][x] = {
                    span: span,
                    displayedId: targetDisplayId, // What's effectively displayed (PLAYER or a tile ID)
                    sprite: targetSprite,
                    color: targetColor
                };
                fragment.appendChild(span);
            } else {
                const cachedCell = gameState.tileCache[y][x];
                const span = cachedCell.span;

                // Compare with cached state
                if (cachedCell.displayedId !== targetDisplayId ||
                    cachedCell.sprite !== targetSprite ||
                    cachedCell.color !== targetColor) {

                    span.textContent = targetSprite;
                    span.style.color = targetColor;

                    cachedCell.displayedId = targetDisplayId;
                    cachedCell.sprite = targetSprite;
                    cachedCell.color = targetColor;
                }
            }
        }
        if (isInitialRender) { // Corrected from isInitialRenderOrResize
            const br = document.createElement("br");
            // gameState.brElementsCache[y] = br; // brElementsCache is not currently used
            fragment.appendChild(br);
        }
    }

    if (isInitialRender) { // Corrected from isInitialRenderOrResize
        container.appendChild(fragment);
    }

    // Render NPCs
    if (gameState.npcs && gameState.npcs.length > 0 && gameState.tileCache) {
        gameState.npcs.forEach(npc => {
            if (npc.mapPos) {
                const npcX = npc.mapPos.x;
                const npcY = npc.mapPos.y;

                // Check bounds
                if (npcX >= 0 && npcX < W && npcY >= 0 && npcY < H) {
                    // Check if tile is obscured by roof
                    const roofObscures = gameState.showRoof && currentMapData.layers.roof?.[npcY]?.[npcX];
                    // Check if player is on the same tile (player takes precedence)
                    const playerIsHere = (npcX === gameState.playerPos.x && npcY === gameState.playerPos.y);

                    if (!roofObscures && !playerIsHere) {
                        const cachedCell = gameState.tileCache[npcY][npcX];
                        if (cachedCell && cachedCell.span) {
                            // Only update if NPC is different or wasn't there before
                            const npcDisplayId = 'NPC_' + npc.id;
                            if (cachedCell.displayedId !== npcDisplayId) {
                                cachedCell.span.textContent = npc.sprite;
                                cachedCell.span.style.color = npc.color; // NPC's own color
                                cachedCell.displayedId = npcDisplayId;
                            }
                        }
                    }
                }
            }
        });
    }

    // Clear previous combat highlights before applying new ones or if combat ended
    if (gameState.tileCache) {
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const cell = gameState.tileCache[y][x];
                if (cell && cell.span) {
                    if (cell.span.dataset.isAttackerHighlighted === 'true' || cell.span.dataset.isDefenderHighlighted === 'true') {
                        cell.span.style.backgroundColor = ''; // Reset background
                        delete cell.span.dataset.isAttackerHighlighted;
                        delete cell.span.dataset.isDefenderHighlighted;
                    }
                }
            }
        }
    }

    // Apply Attacker/Defender Highlights if in combat
    if (gameState.isInCombat && gameState.tileCache) {
        if (gameState.attackerMapPos) {
            const attackerCell = gameState.tileCache[gameState.attackerMapPos.y]?.[gameState.attackerMapPos.x];
            if (attackerCell && attackerCell.span) {
                attackerCell.span.style.backgroundColor = 'rgba(255, 0, 0, 0.3)'; // Red tint for attacker
                attackerCell.span.dataset.isAttackerHighlighted = 'true';
            }
        }
        if (gameState.defenderMapPos) {
            const defenderCell = gameState.tileCache[gameState.defenderMapPos.y]?.[gameState.defenderMapPos.x];
            if (defenderCell && defenderCell.span) {
                defenderCell.span.style.backgroundColor = 'rgba(0, 0, 255, 0.3)'; // Blue tint for defender
                defenderCell.span.dataset.isDefenderHighlighted = 'true';
            }
        }
    }

    // *** highlight the currently selected interactable tile(s) ***
    updateMapHighlight();
}


function updateMapHighlight() {
    // 1) Clear any old flashes
    document.querySelectorAll('.tile.flashing')
        .forEach(el => el.classList.remove('flashing'));

    // 2) If nothing’s selected, bail
    const idx = gameState.selectedItemIndex;
    if (idx < 0 || idx >= gameState.interactableItems.length) return;

    // 3) Pull out x/y
    const it = gameState.interactableItems[idx];
    const x = it.x; // Assuming interactableItems always have x, y
    const y = it.y;

    if (typeof x !== 'number' || typeof y !== 'number') return;

    // 4) Find and flash the matching span
    // Ensure tileCache exists and has the span
    const cachedCell = gameState.tileCache?.[y]?.[x];
    if (cachedCell && cachedCell.span) {
        cachedCell.span.classList.add('flashing');
    } else {
        // Fallback if cache is not populated or span is missing (less efficient)
        const span = document.querySelector(`.tile[data-x="${x}"][data-y="${y}"]`);
        if (span) span.classList.add('flashing');
    }
}



// Collision checking: Look at the building and item layers.
function getCollisionTileAt(x, y) {
    if (!currentMapData || !currentMapData.layers) return "";

    const bldLayer = currentMapData.layers.building;
    const itmLayer = currentMapData.layers.item;
    const lspLayer = currentMapData.layers.landscape;

    const bld = bldLayer?.[y]?.[x];
    if (bld && assetManager.tilesets[bld]) return bld;

    const itm = itmLayer?.[y]?.[x];
    if (itm && assetManager.tilesets[itm]) return itm;

    const lsp = lspLayer?.[y]?.[x];
    if (lsp && assetManager.tilesets[lsp]) return lsp;

    return ""; // If all are empty or invalid
}

/**************************************************************
 * Turn-Based & Movement Functions
 **************************************************************/
// Update the UI with current movement and action points
function updateTurnUI() {
    const movementUI = document.getElementById("movementPointsUI");
    const actionUI = document.getElementById("actionPointsUI");
    if (movementUI) movementUI.textContent = "Moves Left: " + gameState.movementPointsRemaining;
    if (actionUI) actionUI.textContent = "Actions Left: " + gameState.actionPointsRemaining;
}

// Start a new turn by resetting movement and action points
function startTurn() {
    gameState.movementPointsRemaining = 6;
    gameState.actionPointsRemaining = 1;
    gameState.hasDashed = false;
    logToConsole(`Turn ${gameState.currentTurn} started. Moves: ${gameState.movementPointsRemaining}, Actions: ${gameState.actionPointsRemaining}`);
    updateTurnUI();
}

// Allow the player to dash (double movement) if conditions are met
function dash() {
    if (!gameState.hasDashed && gameState.actionPointsRemaining > 0) {
        gameState.movementPointsRemaining += 6;
        gameState.hasDashed = true;
        gameState.actionPointsRemaining--;
        logToConsole(`Dashing activated. Moves now: ${gameState.movementPointsRemaining}, Actions left: ${gameState.actionPointsRemaining}`);
        updateTurnUI();
    } else {
        logToConsole("Already dashed this turn or no actions left.");
    }
}

// End the turn, update health crises, and prepare for the next turn
function endTurn() {
    logToConsole(`Turn ${gameState.currentTurn} ended.`);
    updateHealthCrisis();
    gameState.currentTurn++;
    startTurn();
    scheduleRender(); // Replaced renderMapLayers
    updateTurnUI();
}

/**************************************************************
 * Updated Movement Function Using the New Map System
 **************************************************************/
function move(direction) {
    if (gameState.isActionMenuActive) return;
    if (gameState.movementPointsRemaining <= 0) {
        logToConsole("No movement points remaining. End your turn (press 't').");
        return;
    }
    if (!currentMapData || !currentMapData.dimensions) {
        logToConsole("Cannot move: Map data not loaded.");
        return;
    }
    const width = currentMapData.dimensions.width;
    const height = currentMapData.dimensions.height;
    const originalPos = { ...gameState.playerPos };
    const newPos = { ...gameState.playerPos };
    switch (direction) {
        case 'up':
        case 'w':
        case 'ArrowUp':
            if (newPos.y > 0 && isPassable(getCollisionTileAt(newPos.x, newPos.y - 1))) newPos.y--;
            break;
        case 'down':
        case 's':
        case 'ArrowDown':
            if (newPos.y < height - 1 && isPassable(getCollisionTileAt(newPos.x, newPos.y + 1))) newPos.y++;
            break;
        case 'left':
        case 'a':
        case 'ArrowLeft':
            if (newPos.x > 0 && isPassable(getCollisionTileAt(newPos.x - 1, newPos.y))) newPos.x--;
            break;
        case 'right':
        case 'd':
        case 'ArrowRight':
            if (newPos.x < width - 1 && isPassable(getCollisionTileAt(newPos.x + 1, newPos.y))) newPos.x++;
            break;
        default:
            return;
    }
    if (newPos.x === originalPos.x && newPos.y === originalPos.y) {
        logToConsole("Can't move that way.");
        return;
    }
    gameState.playerPos = newPos;
    gameState.movementPointsRemaining--;
    gameState.playerMovedThisTurn = true; // CRITICAL: Set player movement flag
    logToConsole(`Moved to (${newPos.x}, ${newPos.y}). Moves left: ${gameState.movementPointsRemaining}`);
    updateTurnUI();
    scheduleRender(); // Replaced renderMapLayers
    detectInteractableItems();
    showInteractableItems();
}

/**************************************************************
 * Interaction & Action Functions
 **************************************************************/
function detectInteractableItems() {
    const R = 1; // Radius
    const { x: px, y: py } = gameState.playerPos;
    gameState.interactableItems = [];

    if (!currentMapData || !currentMapData.layers || !currentMapData.dimensions) return;

    const mapHeight = currentMapData.dimensions.height;
    const mapWidth = currentMapData.dimensions.width;

    for (let y = Math.max(0, py - R); y <= Math.min(mapHeight - 1, py + R); y++) {
        for (let x = Math.max(0, px - R); x <= Math.min(mapWidth - 1, px + R); x++) {
            let tileId = null;
            // Check item layer first, then building layer for interactables
            if (currentMapData.layers.item?.[y]?.[x]) {
                tileId = currentMapData.layers.item[y][x];
            } else if (currentMapData.layers.building?.[y]?.[x]) {
                tileId = currentMapData.layers.building[y][x];
            }

            if (!tileId) continue;

            const tileDef = assetManager.tilesets[tileId];
            if (tileDef && tileDef.tags && tileDef.tags.includes("interactive")) {
                gameState.interactableItems.push({ x, y, id: tileId });
            }
        }
    }
}
function showInteractableItems() {
    const list = document.getElementById("itemList");
    list.innerHTML = "";

    gameState.interactableItems.forEach((it, idx) => {
        const div = document.createElement("div");
        const tileDef = assetManager.tilesets[it.id] || { name: it.id }; // Use assetManager.tilesets
        div.textContent = `${idx + 1}. ${tileDef.name}`;

        // Highlight the currently selected
        if (idx === gameState.selectedItemIndex) {
            div.classList.add("selected");
        }

        // Bind click to select
        div.onclick = () => selectItem(idx);
        list.appendChild(div);
    });
}


// Select an interactable item by its number/index
function selectItem(idx) {
    if (idx >= 0 && idx < gameState.interactableItems.length) {
        gameState.selectedItemIndex = idx;
        showInteractableItems();
        updateMapHighlight();   // if you also want to flash the map tile
    }
}

// Get a list of possible actions based on the interactable item type
function getActionsForItem(it) {
    const tileDef = assetManager.tilesets[it.id]; // Use assetManager.tilesets
    if (!tileDef) return ["Cancel"];

    const tags = tileDef.tags || [];
    const actions = ["Cancel"];

    if (tags.includes("door") || tags.includes("window")) {
        if (tags.includes("closed")) actions.push("Open");
        if (tags.includes("open")) actions.push("Close");
        if (tags.includes("breakable")) actions.push("Break Down");
    }

    if (tags.includes("container")) {
        actions.push("Inspect", "Loot");
    }

    return actions;
}
// Select an action from the displayed action list
function selectAction(number) {
    const actionList = document.getElementById('actionList');
    if (!actionList) return;
    const actions = actionList.children;
    if (number >= 0 && number < actions.length) {
        gameState.selectedActionIndex = number;
        Array.from(actions).forEach((action, index) => {
            action.classList.toggle('selected', index === gameState.selectedActionIndex);
        });
    }
}

// Show the available actions for the selected item
function interact() {
    if (gameState.selectedItemIndex === -1
        || gameState.selectedItemIndex >= gameState.interactableItems.length)
        return;

    const item = gameState.interactableItems[gameState.selectedItemIndex];
    const actions = getActionsForItem(item);
    const actionList = document.getElementById('actionList');
    if (!actionList) return;

    actionList.innerHTML = '';
    gameState.selectedActionIndex = -1;
    gameState.isActionMenuActive = true;

    actions.forEach((action, index) => {
        const el = document.createElement("div");
        el.textContent = `${index + 1}. ${action}`;
        el.classList.add("action-item");

        // ← Remove the '+' here
        el.onclick = () => selectAction(index);

        actionList.appendChild(el);
    });
}

// Perform the action selected by the player
function performSelectedAction() {
    if (gameState.selectedActionIndex === -1) return;

    const actionList = document.getElementById('actionList');
    if (!actionList) return;

    const selectedActionElement = actionList.children[gameState.selectedActionIndex];
    if (!selectedActionElement) return;

    const action = selectedActionElement.textContent.split('. ')[1];
    const item = gameState.interactableItems[gameState.selectedItemIndex];
    logToConsole(`Performing action: ${action} on ${item.id} at (${item.x}, ${item.y})`);

    // If it's "Cancel", do it for free
    if (action === "Cancel") {
        performAction(action, item);
    }
    // Otherwise require an action point
    else if (gameState.actionPointsRemaining > 0) {
        gameState.actionPointsRemaining--;
        updateTurnUI();
        performAction(action, item);
    } else {
        logToConsole("No actions left for this turn.");
    }

    cancelActionSelection();
}

// Closed → Open
const DOOR_OPEN_MAP = {
    "WDH": "WOH",
    "WDV": "WOV",
    "MDH": "MOH",
    "MDV": "MOV",
    "WinCH": "WinOH",
    "WinCV": "WinOV"
};

// Open → Closed (automatically built from DOOR_OPEN_MAP)
const DOOR_CLOSE_MAP = Object.fromEntries(
    Object.entries(DOOR_OPEN_MAP).map(([closed, open]) => [open, closed])
);

// Any state → Broken
const DOOR_BREAK_MAP = {
    // Wood doors
    "WDH": "WDB",
    "WDV": "WDB",
    "WOH": "WDB",
    "WOV": "WDB",

    // Metal doors
    "MDH": "MDB",
    "MDV": "MDB",
    "MOH": "MDB",
    "MOV": "MDB",

    // Windows (both closed and open variants)
    "WinCH": "WinB",
    "WinCV": "WinB",
    "WinOH": "WinB",
    "WinOV": "WinB"
};

function performAction(action, it) {
    const { x, y, id } = it;
    if (!currentMapData || !currentMapData.layers.building) {
        logToConsole("Error: Building layer not found in current map data.");
        return;
    }
    const B = currentMapData.layers.building; // Use currentMapData.layers
    let targetTileId = B[y]?.[x]; // Safely access tile ID

    if (!targetTileId) {
        logToConsole(`Error: No building tile found at ${x},${y} to perform action.`);
        return;
    }

    const tileName = assetManager.tilesets[id]?.name || id; // Use name from tileset

    if (action === "Open" && DOOR_OPEN_MAP[targetTileId]) {
        B[y][x] = DOOR_OPEN_MAP[targetTileId];
        logToConsole(`Opened ${tileName}`);
    }
    else if (action === "Close" && DOOR_CLOSE_MAP[targetTileId]) {
        B[y][x] = DOOR_CLOSE_MAP[targetTileId];
        logToConsole(`Closed ${tileName}`);
    }
    else if (action === "Break Down" && DOOR_BREAK_MAP[targetTileId]) {
        B[y][x] = DOOR_BREAK_MAP[targetTileId];
        logToConsole(`Broke ${tileName}`);
    }
    else if (action === "Inspect" || action === "Loot") {
        logToConsole(`${action}ing ${tileName}`);
    }
    // redraw...
    scheduleRender();
    detectInteractableItems();
    showInteractableItems();
    updateMapHighlight();
}


// Cancel the current action selection
function cancelActionSelection() {
    gameState.isActionMenuActive = false;
    const actionList = document.getElementById('actionList');
    if (actionList) actionList.innerHTML = '';
    updateMapHighlight();
}

/**************************************************************
 * Character Creation & Stats Functions
 **************************************************************/
// Update skill points from character creation
function updateSkill(name, value) {
    const index = gameState.skills.findIndex(skill => skill.name === name);
    if (index === -1) return;
    const newValue = parseInt(value) || 0;
    if (newValue < 0 || newValue > 100) {
        alert('Skill points must be between 0 and 100!');
        return;
    }
    const skills = gameState.skills;
    const currentTotal = skills.reduce((sum, skill) => sum + skill.points, 0);
    const updatedTotal = currentTotal - skills[index].points + newValue;
    if (updatedTotal > gameState.MAX_SKILL_POINTS) {
        alert('Not enough skill points remaining!');
        return;
    }
    skills[index].points = newValue;
    const skillPointsElement = document.getElementById('skillPoints');
    if (skillPointsElement) {
        skillPointsElement.textContent = gameState.MAX_SKILL_POINTS - updatedTotal;
    }
}

// Update stat values for the character
function updateStat(name, value) {
    const index = gameState.stats.findIndex(stat => stat.name === name);
    if (index === -1) return;
    const newValue = parseInt(value) || gameState.MIN_STAT_VALUE;
    if (newValue < gameState.MIN_STAT_VALUE || newValue > gameState.MAX_STAT_VALUE) {
        alert(`Stat points must be between ${gameState.MIN_STAT_VALUE} and ${gameState.MAX_STAT_VALUE}!`);
        return;
    }
    gameState.stats[index].points = newValue;
    renderCharacterInfo();
}

// Render the tables for stats and skills on the character creator
function renderTables() {
    const statsBody = document.getElementById('statsBody');
    const skillsBody = document.getElementById('skillsBody');
    if (!statsBody || !skillsBody) return;
    const statsHtml = gameState.stats.map(stat => `
        <div class="stat" style="background-color: ${stat.bgColor}; color: ${stat.textColor};">
            <span>${stat.name}:</span>
            <input type="number" value="${stat.points}" min="${gameState.MIN_STAT_VALUE}" 
                   max="${gameState.MAX_STAT_VALUE}" 
                   onchange="updateStat('${stat.name}', this.value)">
        </div>`).join('');
    const skillsHtml = gameState.skills.map(skill => `
        <div class="skill" style="background-color: ${skill.bgColor}; color: ${skill.textColor};">
            <span>${skill.name}:</span>
            <input type="number" value="${skill.points}" min="0" max="100" 
                   onchange="updateSkill('${skill.name}', this.value)">
        </div>`).join('');
    statsBody.innerHTML = statsHtml;
    skillsBody.innerHTML = skillsHtml;
}

// Render character information for display in the game
function renderCharacterInfo() {
    const characterInfo = document.getElementById('characterInfo');
    if (!characterInfo) return;
    const nameInput = document.getElementById("charName");
    const levelSpan = document.getElementById("level");
    const xpSpan = document.getElementById("xp");
    if (!nameInput || !levelSpan || !xpSpan) return;
    const name = nameInput.value;
    const level = levelSpan.textContent;
    const xp = xpSpan.textContent;
    const statsHtml = gameState.stats.map(stat => `
        <div class="stats" style="background-color: ${stat.bgColor}; color: ${stat.textColor};">
            <span>${stat.name}:</span>
            <span>${stat.points}</span>
        </div>`).join('');
    const skillsHtml = gameState.skills.map(skill => `
        <div class="skills" style="background-color: ${skill.bgColor}; color: ${skill.textColor};">
            <span>${skill.name}:</span>
            <span>${skill.points}</span>
        </div>`).join('');
    characterInfo.innerHTML = `
        <div>Name: ${name}</div>
        <div>Level: ${level}</div>
        <div>XP: ${xp}</div>
        <h3>Stats</h3>
        ${statsHtml}
        <h3>Skills</h3>
        ${skillsHtml}
    `;
}

/**************************************************************
 * Inventory System Functions
 **************************************************************/
// 1) Define container sizes
const InventorySizes = {
    XS: 3, S: 6, M: 12, L: 18, XL: 24, XXL: 36, XXXL: 48 // Added XXXL
};

// 2) Inventory container constructor
function InventoryContainer(name, sizeLabel) {
    this.name = name;
    this.sizeLabel = sizeLabel;
    this.maxSlots = InventorySizes[sizeLabel];
    this.items = [];
}

// 3) Item constructor
function Item(itemDef) { // itemDef is the raw object from JSON
    Object.assign(this, itemDef); // Copy all properties from itemDef to this instance

    // Set instance-specific defaults or overrides after copying
    this.equipped = false;
    // Ensure other necessary instance-specific defaults are set if any.
    // For example, if isClothing might not always be in itemDef and needs a default:
    // this.isClothing = this.isClothing !== undefined ? this.isClothing : false;
    // However, based on current itemDef structure, most flags like isClothing, canEquip should come from itemDef.
}

// 4) Attach to gameState
gameState.inventory = {
    container: new InventoryContainer("Backpack", "M"),
    handSlots: [null, null],
    open: false,
    cursor: 0
};

// 5) Check capacity
function canAddItem(item) {
    const used = gameState.inventory.container.items
        .reduce((sum, i) => sum + i.size, 0);
    return used + item.size <= gameState.inventory.container.maxSlots;
}

// 6) Add
function addItem(item) {
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
    const inv = gameState.inventory.container.items;
    const itemIndex = inv.findIndex(i => i.name === itemName); // Find by name first

    if (itemIndex === -1) {
        logToConsole(`Item "${itemName}" not found in inventory.`);
        return;
    }
    const item = inv[itemIndex];

    if (item.isClothing) {
        logToConsole(`${item.name} is clothing. Use the 'Wear' action (usually 'f' on an inventory item) instead of equipping to a hand slot.`);
        return;
    }

    if (!item.canEquip) { // Now check canEquip for non-clothing items
        logToConsole(`Cannot equip "${itemName}" to a hand slot. It's not flagged as 'canEquip'.`);
        return;
    }

    if (gameState.inventory.handSlots[handIndex]) {
        logToConsole(`Hand slot ${handIndex + 1} is already occupied by ${gameState.inventory.handSlots[handIndex].name}.`);
        return;
    }

    // Item is found, not clothing, can be equipped, and slot is free
    const equippedItem = inv.splice(itemIndex, 1)[0];
    equippedItem.equipped = true; // Mark as equipped in general sense
    gameState.inventory.handSlots[handIndex] = equippedItem;
    logToConsole(`Equipped ${equippedItem.name} to hand slot ${handIndex + 1}.`);
    updateInventoryUI();
}

function unequipItem(handIndex) {
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
}

/**************************************************************
 * Clothing Equip/Unequip Functions
 **************************************************************/
function equipClothing(itemName) {
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

    // Remove item from inventory
    inv.splice(itemIndex, 1);

    // Add to wornClothing
    gameState.player.wornClothing[targetLayer] = item;
    item.equipped = true;

    logToConsole(`Equipped ${itemName} to ${targetLayer}.`);
    updateInventoryUI();
    renderCharacterInfo(); // Update character info (e.g., to show armor changes later)
}

function unequipClothing(clothingLayer) {
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

    // Add item back to inventory
    gameState.inventory.container.items.push(item);
    // gameState.inventory.container.items.sort((a, b) => a.name.localeCompare(b.name)); // Optional: sort inventory

    // Remove from wornClothing
    gameState.player.wornClothing[clothingLayer] = null;
    item.equipped = false;

    logToConsole(`Unequipped ${item.name} from ${clothingLayer}.`);
    updateInventoryUI();
    renderCharacterInfo(); // Update character info
}

// 9) Update the DOM
function updateInventoryUI() {
    // Equipped Hand Items
    const equippedHandItemsDiv = document.getElementById("equippedHandItems");
    equippedHandItemsDiv.innerHTML = "";
    gameState.inventory.handSlots.forEach((it, i) => {
        const d = document.createElement("div");
        const handName = i === 0 ? "Left Hand" : "Right Hand";
        d.textContent = it
            ? `${handName}: ${it.name}`
            : `${handName}: Empty`;
        equippedHandItemsDiv.appendChild(d);
    });

    // Equipped Containers
    const equippedContainersDiv = document.getElementById("equippedContainers");
    equippedContainersDiv.innerHTML = "";
    const mainContainer = gameState.inventory.container;
    const usedSlots = mainContainer.items.reduce((sum, i) => sum + i.size, 0);
    const containerDisplay = document.createElement("div");
    containerDisplay.textContent = `${mainContainer.name}: ${usedSlots}/${mainContainer.maxSlots}`;
    equippedContainersDiv.appendChild(containerDisplay);

    // Main Inventory Capacity (within the H3 tag)
    const invCapacitySpan = document.getElementById("invCapacity");
    if (invCapacitySpan) {
        invCapacitySpan.textContent = `${usedSlots}/${mainContainer.maxSlots}`;
    }

    // Old handSlots div is no longer managed here directly by this function for equipped items.
    // If handSlots div is intended for something else, its update logic would be separate.
    // For now, let's clear it if it's not meant to show equipped items anymore.
    const oldHandSlotsDiv = document.getElementById("handSlots");
    if (oldHandSlotsDiv) {
        oldHandSlotsDiv.innerHTML = ""; // Explicitly clear the old handSlots div content
    }

    // Worn Clothing List in Right Panel
    const wornItemsList = document.getElementById("wornClothingList");
    if (wornItemsList) {
        wornItemsList.innerHTML = ""; // Clear old list
        let hasWornItems = false;
        for (const layer in gameState.player.wornClothing) {
            const item = gameState.player.wornClothing[layer];
            if (item) {
                hasWornItems = true;
                const itemDiv = document.createElement("div");
                const layerDisplayNameKey = Object.keys(ClothingLayers).find(key => ClothingLayers[key] === layer);
                const layerDisplayName = layerDisplayNameKey ? layerDisplayNameKey.replace(/_/g, ' ') : layer.replace(/_/g, ' ');
                itemDiv.textContent = `${layerDisplayName}: ${item.name}`;
                wornItemsList.appendChild(itemDiv);
            }
        }
        if (!hasWornItems) {
            wornItemsList.textContent = "— Not wearing anything —";
        }
    }
}

// 10) Render inventory when open
function renderInventoryMenu() {
    const list = document.getElementById("inventoryList");
    list.innerHTML = "";

    const wornItemNames = new Set();
    if (gameState.player && gameState.player.wornClothing) {
        Object.values(gameState.player.wornClothing).forEach(wornItem => {
            if (wornItem && wornItem.name) {
                wornItemNames.add(wornItem.name);
            }
        });
    }

    // Filter out equipped clothing items from the main inventory display
    gameState.inventory.currentlyDisplayedItems = gameState.inventory.container.items.filter(
        item => !item.isClothing || !wornItemNames.has(item.name)
    );

    if (gameState.inventory.currentlyDisplayedItems.length === 0) {
        list.textContent = "— empty —";
        return;
    }

    // Adjust cursor if it's out of bounds for the new filtered list
    if (gameState.inventory.cursor >= gameState.inventory.currentlyDisplayedItems.length) {
        gameState.inventory.cursor = Math.max(0, gameState.inventory.currentlyDisplayedItems.length - 1);
    }

    gameState.inventory.currentlyDisplayedItems.forEach((it, idx) => {
        const d = document.createElement("div");
        d.textContent = `${idx + 1}. ${it.name} (${it.size})`;
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

    if (gameState.inventory.open) {
        inventoryListDiv.classList.remove("hidden");
        inventoryListDiv.style.display = 'block';
        renderInventoryMenu(); // This will now populate currentlyDisplayedItems
    } else {
        inventoryListDiv.classList.add("hidden");
        inventoryListDiv.style.display = 'none';
        clearInventoryHighlight();
        gameState.inventory.currentlyDisplayedItems = []; // Clear the temporary list
    }
}

// 12) “Use” selected item
function interactInventoryItem() {
    if (!gameState.inventory.currentlyDisplayedItems || gameState.inventory.currentlyDisplayedItems.length === 0) return;

    const idx = gameState.inventory.cursor;
    if (idx < 0 || idx >= gameState.inventory.currentlyDisplayedItems.length) return;

    const displayedItem = gameState.inventory.currentlyDisplayedItems[idx];
    if (!displayedItem) return;

    // Find the actual item in the main inventory container to ensure we act on the correct instance
    // This is important because equipClothing/equipItem modify gameState.inventory.container.items
    const actualItemInContainer = gameState.inventory.container.items.find(item => item.name === displayedItem.name);

    if (!actualItemInContainer) {
        logToConsole(`Error: Could not find ${displayedItem.name} in main inventory for interaction.`);
        return;
    }

    if (actualItemInContainer.isClothing) {
        // The 'equipped' property on items in `container.items` should always be false if it's clothing,
        // as equipping moves it to `wornClothing`. If it's somehow true, it's an inconsistent state.
        // We rely on `wornItemNames` in `renderInventoryMenu` to filter it out if it's truly worn.
        // So, if it's in `currentlyDisplayedItems`, it means it's not currently worn.
        logToConsole(`Attempting to wear ${actualItemInContainer.name}...`);
        equipClothing(actualItemInContainer.name);
    } else if (actualItemInContainer.canEquip) { // For non-clothing equippable items (weapons, tools)
        // This part needs to be decided: how to choose hand slot? For now, default to first available.
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
    // After action, re-render inventory as items might have moved
    if (gameState.inventory.open) {
        renderInventoryMenu();
    }
}

// 13) Clear highlight when closing
function clearInventoryHighlight() {
    document.querySelectorAll("#inventoryList .selected")
        .forEach(el => el.classList.remove("selected"));
}

/**************************************************************
 * Health System Functions
 **************************************************************/
// Initialize health for various body parts
function initializeHealth() {
    gameState.health = {
        head: { max: 5, current: 5, armor: 0, crisisTimer: 0 },
        torso: { max: 8, current: 8, armor: 0, crisisTimer: 0 },
        leftArm: { max: 7, current: 7, armor: 0, crisisTimer: 0 }, // Was part of "Arms/Legs"
        rightArm: { max: 7, current: 7, armor: 0, crisisTimer: 0 }, // Was part of "Arms/Legs"
        leftLeg: { max: 7, current: 7, armor: 0, crisisTimer: 0 },  // Was part of "Arms/Legs"
        rightLeg: { max: 7, current: 7, armor: 0, crisisTimer: 0 }  // Was part of "Arms/Legs"
    };
    renderHealthTable();
}

// Helper function to get total armor for a body part from worn clothing
function getArmorForBodyPart(bodyPartName) {
    let totalArmor = 0;
    if (!gameState.player || !gameState.player.wornClothing) {
        return 0; // No player or no worn clothing defined
    }

    for (const layer in gameState.player.wornClothing) {
        const item = gameState.player.wornClothing[layer];
        if (item && item.isClothing && item.coverage && item.coverage.includes(bodyPartName)) {
            totalArmor += item.armorValue || 0;
        }
    }
    return totalArmor;
}

// Update crisis timers for body parts at the end of each turn
function updateHealthCrisis() {
    for (let partName in gameState.health) {
        let part = gameState.health[partName];
        if (part.current === 0 && part.crisisTimer > 0) {
            part.crisisTimer--;
            logToConsole(`${partName} crisis timer: ${part.crisisTimer} turn(s) remaining.`);
            if (part.crisisTimer === 0) {
                logToConsole(`Health crisis in ${partName} was not treated. You have died.`);
                gameOver();
                return;
            }
        }
    }
}

// Apply treatment to a damaged body part
function applyTreatment(bodyPart, treatmentType, restType, medicineBonus) {
    if (!gameState.health || !gameState.health[bodyPart]) return;
    let part = gameState.health[bodyPart];
    let dc, healing;

    if (treatmentType === "Well Tended") {
        dc = 18;
        healing = (restType === "short") ? 2 : part.max;
    } else if (treatmentType === "Standard Treatment") {
        dc = 15;
        healing = (restType === "short") ? 1 : 3;
    } else if (treatmentType === "Poorly Tended") {
        dc = 10;
        healing = (restType === "long") ? 1 : 0;
    } else {
        logToConsole("Invalid treatment type.");
        return;
    }

    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + medicineBonus;
    logToConsole(`Medicine check on ${bodyPart} (${treatmentType}, ${restType}): DV0(${roll}) + bonus(${medicineBonus}) = ${total} (DC ${dc})`);

    if (total >= dc) {
        let oldHP = part.current;
        part.current = Math.min(part.current + healing, part.max);
        logToConsole(`Treatment successful on ${bodyPart}: HP increased from ${oldHP} to ${part.current}/${part.max}`);
        if (part.current > 0) {
            part.crisisTimer = 0;
            logToConsole(`Health crisis in ${bodyPart} resolved.`);
        }
    } else {
        logToConsole(`Treatment failed on ${bodyPart}.`);
    }
    renderHealthTable();
}

// Render the health table UI
function renderHealthTable() {
    const healthTableBody = document.querySelector("#healthTable tbody");
    healthTableBody.innerHTML = "";
    for (let partNameKey in gameState.health) { // partNameKey will be "head", "torso", etc.
        let { current, max, crisisTimer } = gameState.health[partNameKey]; // Original armor property is no longer used from here
        let effectiveArmor = getArmorForBodyPart(partNameKey); // Calculate armor dynamically

        let row = document.createElement("tr");
        row.innerHTML = `
            <td>${formatBodyPartName(partNameKey)}</td>
            <td>${current}/${max}</td>
            <td>${effectiveArmor}</td> 
            <td>${crisisTimer > 0 ? crisisTimer : "—"}</td>
        `;
        if (current === 0) {
            row.style.backgroundColor = "#ff4444";
        } else if (crisisTimer > 0) {
            row.style.backgroundColor = "#ffcc00";
        }
        healthTableBody.appendChild(row);
    }
}

// Format body part names for display
function formatBodyPartName(part) {
    const nameMap = {
        head: "Head",
        torso: "Torso",
        leftArm: "L Arm",
        rightArm: "R Arm",
        leftLeg: "L Leg",
        rightLeg: "R Leg"
    };
    return nameMap[part] || part;
}

// Game over logic placeholder
function gameOver() {
    logToConsole("GAME OVER.");
    // Further game-over logic here
}

function initiateCombatWithGroup(primaryTarget) {
    if (!primaryTarget || !primaryTarget.mapPos) {
        logToConsole("Invalid primary target for combat initiation.");
        return;
    }

    const participants = [gameState, primaryTarget];
    const groupingRadius = 10; // Tiles
    const primaryTargetType = primaryTarget.id; // Assuming npc.id defines its type for grouping

    gameState.npcs.forEach(npc => {
        if (npc === primaryTarget || !npc.mapPos || !npc.health || npc.health.torso.current <= 0) {
            return; // Skip self, unpositioned NPCs, or dead NPCs
        }

        // Grouping condition: same NPC id (type) and within radius
        if (npc.id === primaryTargetType) {
            const dx = Math.abs(npc.mapPos.x - primaryTarget.mapPos.x);
            const dy = Math.abs(npc.mapPos.y - primaryTarget.mapPos.y);
            const distance = Math.sqrt(dx * dx + dy * dy); // Euclidean distance

            if (distance <= groupingRadius) {
                if (!participants.find(p => p === npc)) { // Avoid adding duplicates
                    participants.push(npc);
                    logToConsole(`${npc.name} (type: ${npc.id}) is joining combat with ${primaryTarget.name}.`);
                }
            }
        }
    });

    if (combatManager) {
        combatManager.startCombat(participants);
    } else {
        logToConsole("Error: CombatManager not available to start combat.");
    }
}

/**************************************************************
 * Event Handlers & Initialization
 **************************************************************/
// Keydown event handler for movement and actions
function handleKeyDown(event) {
    // New logic for Escape key during combat UI declaration
    if (gameState.isInCombat && gameState.combatPhase === 'playerAttackDeclare' && event.key === 'Escape') {
        const attackDeclUI = document.getElementById('attackDeclarationUI');
        if (attackDeclUI && !attackDeclUI.classList.contains('hidden')) {
            attackDeclUI.classList.add('hidden');
            logToConsole("Attack declaration cancelled.");
            // Optionally, provide a way for player to re-open declaration or end turn.
            // For now, just hiding it. Player can press 't' to end turn if they wish.
            event.preventDefault();
            return;
        }
    }

    if (gameState.isInCombat) {
        // Most combat key handling is now through the UI or specific phases.
        // Player defense choice (if UI were implemented) would be here.
        // For now, NPC defense is automatic, and player defense defaults.
        // The 't' (end turn) and general 'Escape' are primary combat-related keys here.

        if (event.key === 'Escape') {
            logToConsole("Attempting to end combat with Escape key.");
            combatManager.endCombat(); // Use CombatManager's method to end combat
            event.preventDefault();
            return;
        }

        // Other general combat keys could be handled here if necessary,
        // but detailed phase-specific inputs (like old 1-6 for body parts) are removed.
        // logToConsole(`Combat active (Phase: ${gameState.combatPhase || 'N/A'}). Key '${event.key}' pressed. Non-combat game actions are blocked.`);
        // event.preventDefault(); // Be careful with overly broad preventDefault
        // return; // Return to ensure no non-combat actions are processed.
    }

    // Non-combat key handling starts here (or if not returned by combat logic above)
    if (gameState.inventory.open) {
        switch (event.key) {
            case 'ArrowUp': case 'w':
                if (gameState.inventory.cursor > 0) {
                    gameState.inventory.cursor--;
                    renderInventoryMenu(); // Re-render to update selection highlight
                }
                event.preventDefault(); return;
            case 'ArrowDown': case 's':
                // Use currentlyDisplayedItems for correct length check
                if (gameState.inventory.currentlyDisplayedItems && gameState.inventory.cursor < gameState.inventory.currentlyDisplayedItems.length - 1) {
                    gameState.inventory.cursor++;
                    renderInventoryMenu(); // Re-render to update selection highlight
                }
                event.preventDefault(); return;
            case 'Enter': case 'f':
                interactInventoryItem();
                event.preventDefault(); return;
            case 'i': case 'I': // Toggle inventory also handled below if not open
                toggleInventoryMenu();
                // clearInventoryHighlight(); // toggleInventoryMenu handles this when closing
                event.preventDefault(); return;

            // START NEW KEYBINDINGS FOR UNEQUIP
            case 'u': // Unequip from Left Hand (slot 0)
                logToConsole("Attempting to unequip item from Left Hand.");
                unequipItem(0); // Calls the existing unequipItem function for hand slot 0
                renderInventoryMenu(); // Re-render inventory to show changes
                event.preventDefault();
                return;

            case 'j': // Unequip from Right Hand (slot 1)
                logToConsole("Attempting to unequip item from Right Hand.");
                unequipItem(1); // Calls the existing unequipItem function for hand slot 1
                renderInventoryMenu(); // Re-render inventory to show changes
                event.preventDefault();
                return;
            // END NEW KEYBINDINGS FOR UNEQUIP

            default:
                return;
        }
    }

    if ((event.key === 'i' || event.key === 'I') && !gameState.inventory.open) {
        toggleInventoryMenu();
        event.preventDefault(); return;
    }

    if (!gameState.isActionMenuActive) {
        switch (event.key) {
            case 'ArrowUp': case 'w': case 'W':
            case 'ArrowDown': case 's': case 'S':
            case 'ArrowLeft': case 'a': case 'A':
            case 'ArrowRight': case 'd': case 'D':
                move(event.key);
                event.preventDefault(); return;
            default:
                if (event.key >= '1' && event.key <= '9') {
                    selectItem(parseInt(event.key, 10) - 1);
                    event.preventDefault(); return;
                }
        }
        if (event.key === 'x' || event.key === 'X') {
            dash();
            event.preventDefault(); return;
        }
        if (event.key === 't' || event.key === 'T') {
            if (gameState.isInCombat && combatManager.initiativeTracker[combatManager.currentTurnIndex]?.entity === gameState) {
                //logToConsole("Player attempts to end their turn via 't' key."); // Log moved to endPlayerTurn
                combatManager.endPlayerTurn(); // Changed to use the new method
            } else if (gameState.isInCombat) {
                logToConsole("Not your turn to end.");
            } else {
                // Original non-combat end turn functionality
                endTurn();
            }
            event.preventDefault(); return;
        }
    }

    switch (event.key) {
        case 'f': case 'F':
            if (gameState.isActionMenuActive) {
                performSelectedAction();
            } else if (gameState.selectedItemIndex !== -1) {
                interact();
            }
            event.preventDefault(); break;
        case 'r':
            if (gameState.inventory.open || gameState.isInCombat) return; // Prevent if inventory open or already in combat
            const rangedTarget = gameState.npcs.find(npc => npc.id === "training_dummy" && npc.mapPos);
            if (rangedTarget) {
                // Start combat handles setting up turns and UI
                // combatManager.startCombat([gameState, rangedTarget]); // Original
                initiateCombatWithGroup(rangedTarget); // New
            } else {
                logToConsole("Training Dummy not found for ranged attack or has no position.");
            }
            event.preventDefault(); break;
        case 'Escape':
            if (gameState.isActionMenuActive) {
                cancelActionSelection();
                event.preventDefault();
            }
            break;
        case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
            if (gameState.isActionMenuActive) {
                selectAction(parseInt(event.key, 10) - 1);
                event.preventDefault();
            }
            break;
        case 'c':
            if (gameState.inventory.open || gameState.isInCombat) return; // Prevent if inventory open or already in combat
            const meleeTarget = gameState.npcs.find(npc => npc.id === "training_dummy" && npc.mapPos);
            if (meleeTarget) {
                const inRange = Math.abs(gameState.playerPos.x - meleeTarget.mapPos.x) <= 1 &&
                    Math.abs(gameState.playerPos.y - meleeTarget.mapPos.y) <= 1;
                if (inRange) {
                    // Start combat handles setting up turns and UI
                    // combatManager.startCombat([gameState, meleeTarget]); // Original
                    initiateCombatWithGroup(meleeTarget); // New
                } else {
                    logToConsole("Training Dummy is not in melee range.");
                }
            } else {
                logToConsole("Training Dummy not found for melee attack or has no position.");
            }
            event.preventDefault(); break;
    }
}

const combatManager = new CombatManager(gameState, assetManager);

// Initial setup on DOM content load
async function initialize() { // Made async
    try {
        await assetManager.loadDefinitions();
        console.log("Asset definitions loaded.");

        await setupMapSelector(assetManager); // Populate map selector UI
        console.log("Map selector setup complete.");

        // Load the initially selected map
        const mapSelector = document.getElementById('mapSelector');
        let initialMapId = mapSelector?.value;

        // If the default selected option is disabled (e.g. a separator) or has no value, find the first valid one
        if (mapSelector && (!initialMapId || mapSelector.options[mapSelector.selectedIndex]?.disabled)) {
            initialMapId = ""; // Reset
            for (let i = 0; i < mapSelector.options.length; i++) {
                if (mapSelector.options[i].value && !mapSelector.options[i].disabled) {
                    initialMapId = mapSelector.options[i].value;
                    break;
                }
            }
        }

        if (initialMapId) {
            console.log(`Loading initial map: ${initialMapId}`);
            currentMapData = await assetManager.loadMap(initialMapId);
            if (currentMapData) {
                gameState.layers = currentMapData.layers;
                gameState.playerPos = currentMapData.startPos || { x: 2, y: 2 }; // Default if no startPos
                console.log("Initial map loaded:", currentMapData.name);
            } else {
                console.error(`Failed to load initial map: ${initialMapId}`);
                const errorDisplay = document.getElementById('errorMessageDisplay');
                if (errorDisplay) errorDisplay.textContent = `Failed to load initial map: ${initialMapId}.`;
                // Keep gameState.layers empty or show error on map
                gameState.layers = { landscape: [], building: [], item: [], roof: [] };
            }
        } else {
            console.warn("No initial map selected or map selector is empty. No map loaded at startup.");
            gameState.layers = { landscape: [], building: [], item: [], roof: [] };
        }

        renderTables(); // For character creator (might be hidden initially)
        scheduleRender(); // Initial render of the map (or empty state)
        updateInventoryUI(); // Initialize inventory display


    } catch (error) {
        console.error("Error during game initialization:", error);
        const errorDisplay = document.getElementById('errorMessageDisplay');
        if (errorDisplay) {
            errorDisplay.textContent = "A critical error occurred during game initialization. Please try refreshing. Details in console.";
        } else {
            alert("A critical error occurred during game initialization. Please try refreshing. Details in console.");
        }
    }

    document.addEventListener('keydown', handleKeyDown);

    const confirmButton = document.getElementById('confirmAttackButton');
    if (confirmButton) {
        confirmButton.addEventListener('click', () => {
            // Check if combat is active, it's player's turn, and player is in attack declaration phase
            if (combatManager && combatManager.gameState && combatManager.gameState.isInCombat &&
                combatManager.gameState.combatCurrentAttacker === combatManager.gameState && // gameState is the player object
                combatManager.gameState.combatPhase === 'playerAttackDeclare') {
                combatManager.handleConfirmedAttackDeclaration();
            } else {
                if (!combatManager || !combatManager.gameState) {
                    console.error("CombatManager or gameState not available.");
                } else if (!combatManager.gameState.isInCombat) {
                    console.log("Confirm attack clicked, but not in combat.");
                } else if (combatManager.gameState.combatCurrentAttacker !== combatManager.gameState) {
                    console.log("Confirm attack clicked, but not player's turn.");
                } else if (combatManager.gameState.combatPhase !== 'playerAttackDeclare') {
                    console.log(`Confirm attack clicked, but phase is ${combatManager.gameState.combatPhase}, not playerAttackDeclare.`);
                }
            }
        });
    } else {
        console.error("confirmAttackButton not found in the DOM during initialization.");
    }

    const grappleButton = document.getElementById('attemptGrappleButton');
    if (grappleButton) {
        grappleButton.addEventListener('click', () => {
            if (combatManager && combatManager.gameState && combatManager.gameState.isInCombat &&
                combatManager.gameState.combatCurrentAttacker === combatManager.gameState && // gameState is the player object
                combatManager.gameState.combatPhase === 'playerAttackDeclare') {
                combatManager.handleGrappleAttemptDeclaration();
            } else {
                if (!combatManager || !combatManager.gameState) {
                    console.error("CombatManager or gameState not available for grapple attempt.");
                } else if (!combatManager.gameState.isInCombat) {
                    console.log("Attempt Grapple clicked, but not in combat.");
                } else if (combatManager.gameState.combatCurrentAttacker !== combatManager.gameState) {
                    console.log("Attempt Grapple clicked, but not player's turn.");
                } else if (combatManager.gameState.combatPhase !== 'playerAttackDeclare') {
                    console.log(`Attempt Grapple clicked, but phase is ${combatManager.gameState.combatPhase}, not playerAttackDeclare.`);
                }
            }
        });
    } else {
        console.error("attemptGrappleButton not found in the DOM during initialization.");
    }

    const confirmDefenseBtn = document.getElementById('confirmDefenseButton');
    if (confirmDefenseBtn) {
        confirmDefenseBtn.addEventListener('click', () => {
            if (combatManager && combatManager.gameState && combatManager.gameState.isInCombat &&
                combatManager.gameState.combatCurrentDefender === combatManager.gameState && // Player is defending
                combatManager.gameState.combatPhase === 'playerDefenseDeclare') {
                combatManager.handleConfirmedDefenseDeclaration();
            } else {
                if (!combatManager || !combatManager.gameState) {
                    console.error("CombatManager or gameState not available for defense confirmation.");
                } else if (!combatManager.gameState.isInCombat) {
                    console.log("Confirm Defense clicked, but not in combat.");
                } else if (combatManager.gameState.combatCurrentDefender !== combatManager.gameState) {
                    console.log("Confirm Defense clicked, but not player's turn to defend.");
                } else if (combatManager.gameState.combatPhase !== 'playerDefenseDeclare') {
                    console.log(`Confirm Defense clicked, but phase is ${combatManager.gameState.combatPhase}, not playerDefenseDeclare.`);
                }
            }
        });
    } else {
        console.error("confirmDefenseButton not found in the DOM during initialization.");
    }

}
/**************************************************************
 * Start Game
 **************************************************************/
function startGame() {
    const characterCreator = document.getElementById('character-creator');
    const characterInfoPanel = document.getElementById('character-info-panel');
    // const gameControls = document.getElementById('game-controls'); // This ID does not exist in index.html right-panel is used.

    // Ensure currentMapData is loaded, if not, try to load default from selector
    if (!currentMapData) {
        console.warn("startGame called but no map data loaded. Attempting to load from selector.");
        const mapSelector = document.getElementById('mapSelector');
        let initialMapId = mapSelector?.value;
        if (mapSelector && (!initialMapId || mapSelector.options[mapSelector.selectedIndex]?.disabled)) {
            initialMapId = "";
            for (let i = 0; i < mapSelector.options.length; i++) {
                if (mapSelector.options[i].value && !mapSelector.options[i].disabled) {
                    initialMapId = mapSelector.options[i].value;
                    break;
                }
            }
        }

        if (initialMapId) {
            // This needs to be async, or startGame needs to handle a promise.
            // For now, let's log and proceed, map might load shortly after if initialize calls it.
            // Ideally, startGame waits for map load if called when currentMapData is null.
            // This part might be redundant if initialize always loads a map.
            assetManager.loadMap(initialMapId).then(mapData => {
                if (mapData) {
                    currentMapData = mapData;
                    gameState.layers = currentMapData.layers;
                    gameState.playerPos = currentMapData.startPos || { x: 2, y: 2 };
                    scheduleRender(); // Render after map is loaded
                    detectInteractableItems();
                    showInteractableItems();
                    logToConsole(`Map ${currentMapData.name} loaded in startGame.`);
                } else {
                    logToConsole(`Failed to load map ${initialMapId} in startGame.`);
                }
            });
        } else {
            logToConsole("No map selected in startGame, map display might be empty.");
        }
    } else {
        // Map is already loaded, ensure layers and playerPos are synced
        gameState.layers = currentMapData.layers;
        gameState.playerPos = currentMapData.startPos || { x: 2, y: 2 };
    }


    // Logic for item creation (using assetManager to get item definitions)
    const backpackUpgradeDef = assetManager.getItem("large_backpack_upgrade");
    if (backpackUpgradeDef && backpackUpgradeDef.type === "containerUpgrade") {
        gameState.inventory.container.name = backpackUpgradeDef.name;
        // Use the sizeLabel from the item definition, and InventorySizes to get the maxSlots
        const sizeLabel = backpackUpgradeDef.containerSizeLabel || "M"; // Default to M if not specified
        gameState.inventory.container.sizeLabel = sizeLabel;
        gameState.inventory.container.maxSlots = InventorySizes[sizeLabel] || InventorySizes.M; // Default to M if label invalid
        logToConsole(`You've upgraded to a ${backpackUpgradeDef.name}! Capacity is now ${sizeLabel} (${gameState.inventory.container.maxSlots} slots).`);
    } else {
        logToConsole(`Using ${gameState.inventory.container.name}. Capacity: ${gameState.inventory.container.maxSlots} slots.`);
    }

    // Add clothing items from definitions
    const clothingToAdd = ["basic_vest"];
    clothingToAdd.forEach(itemId => {
        const itemDef = assetManager.getItem(itemId); // All items (incl clothing) are in itemsById
        if (itemDef) {
            // Create a new Item instance if your addItem expects an Item object
            // For simplicity, if addItem can handle raw definitions, that's fine too.
            // Assuming Item constructor can take the definition object:
            const newItem = new Item(itemDef);
            addItem(newItem);
        } else {
            console.warn(`Clothing item definition not found for ID: ${itemId}`);
        }
    });

    // Add weapons and ammunition
    const weaponsAndAmmoToAdd = [
        // Melee Weapon
        { id: "knife_melee" },

        // Pistol and Ammo
        { id: "beretta_92f_9mm" },
        { id: "ammo_9mm", quantity: 1 }, // Add 2 boxes of 9mm ammo

        // Shotgun and Ammo
        { id: "mossberg_12ga" },
        { id: "ammo_12gauge_buckshot", quantity: 1 }, // Add 3 boxes of 12-gauge buckshot

        // Rifle and Ammo
        { id: "akm_ak47_762mmr" },
        { id: "ammo_762mmr", quantity: 1 }, // Add 2 boxes of 7.62mmR ammo

        // Sniper Rifle and Ammo
        { id: "hk_psg1_762mm" },
        { id: "ammo_762mm", quantity: 1 }, // Add 2 boxes of 7.62mm ammo


        // Thrown Weapon
        { id: "frag_grenade_thrown", quantity: 1 }, // Add 3 frag grenades


        // Rocket Launcher (no separate ammo item, it's self-contained)
        { id: "m72a3_law_rocket_launcher", quantity: 1 }, // Add 2 rocket launchers

        // Grenade Launcher and Ammo
        { id: "m79_grenade_launcher" },
        { id: "ammo_40mm_grenade_frag", quantity: 1 }, // Add 3 40mm grenades

        // Bow and Ammo
        { id: "compound_bow" },
        { id: "ammo_arrow", quantity: 1 }, // Add 2 bundles of arrows

        // Crossbow and Ammo
        { id: "crossbow" },
        { id: "ammo_crossbow_bolt", quantity: 1 }, // Add 2 bundles of crossbow bolts
    ];

    weaponsAndAmmoToAdd.forEach(itemEntry => {
        const itemDef = assetManager.getItem(itemEntry.id);
        if (itemDef) {
            const quantity = itemEntry.quantity || 1; // Default to 1 if quantity not specified
            for (let i = 0; i < quantity; i++) {
                const newItem = new Item(itemDef);
                // If it's ammunition, we might want to store its specific ammoType or quantity per item
                if (itemDef.type === "ammunition") {
                    newItem.ammoType = itemDef.ammoType;
                    newItem.quantityPerBox = itemDef.quantity; // Assuming 'quantity' in JSON is per-box
                }
                addItem(newItem);
            }
        } else {
            console.warn(`Weapon or ammo definition not found for ID: ${itemEntry.id}`);
        }
    });

    // Load and place 8 Training Dummies in a 4×2 block starting at (10,10)
    const dummyDefinition = assetManager.npcsById["training_dummy"];
    if (!dummyDefinition) {
        logToConsole("Error: Training Dummy NPC definition not found.");
    } else {
        const startX = 10;
        const startY = 10;
        const width = 2;   // how many across
        const height = 2;  // how many down

        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                // deep‐clone the definition
                const dummyInstance = JSON.parse(JSON.stringify(dummyDefinition));
                dummyInstance.mapPos = {
                    x: startX + dx,
                    y: startY + dy
                };
                gameState.npcs.push(dummyInstance);
                logToConsole(
                    `Training Dummy placed at (${dummyInstance.mapPos.x},${dummyInstance.mapPos.y}) with detailed health initialized.`
                );
            }
        }
    }


    if (characterCreator) characterCreator.classList.add('hidden');
    if (characterInfoPanel) characterInfoPanel.classList.remove('hidden');
    // if (gameControls) gameControls.classList.remove('hidden'); // As noted, this ID isn't in use

    renderCharacterInfo();
    gameState.gameStarted = true;
    updateInventoryUI();
    // generateInitialMap(); // This is replaced by map loading via AssetManager in initialize or here
    if (currentMapData) scheduleRender(); // Render if map is loaded
    initializeHealth();
    if (currentMapData) { // Only run these if a map is loaded
        detectInteractableItems();
        showInteractableItems();
    }
    startTurn();
}


document.addEventListener('DOMContentLoaded', initialize); // Changed to call new async initialize