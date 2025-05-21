/**************************************************************
 * Global State & Constants
 **************************************************************/
const gameState = {
    // Instead of a single 'map', we now have separate layers.
    // Each is a 2D array of tile IDs.
    layers: {
        landscape: [],
        building: [],
        item: [],
        roof: []
    },
    // The tilePalette maps tile IDs to Unicode sprites, colors, and an array of tags.
    tilePalette: {
        // ───────────────────────────────────────────────────────────────────────────────
        // Landscape Tiles
        // ───────────────────────────────────────────────────────────────────────────────
        "MB": { sprite: "▒", name: "Map Boundary", color: "white", tags: ["landscape", "impassable"] },
        "DI": { sprite: ".", name: "Dirt", color: "brown", tags: ["landscape", "floor"] },
        "GR": { sprite: ",", name: "Grass", color: "green", tags: ["landscape", "floor"] },
        "MU": { sprite: ",", name: "Mud", color: "brown", tags: ["landscape", "floor"] },
        "TGR": { sprite: "W", name: "Tall Grass", color: "green", tags: ["landscape", "floor"] },
        "MSH": { sprite: "w", name: "Marsh", color: "#2e4b36", tags: ["landscape", "floor"] },
        "BOG": { sprite: "~", name: "Bog", color: "darkgreen", tags: ["landscape", "floor"] },
        "SA": { sprite: ":", name: "Sand", color: "khaki", tags: ["landscape", "floor"] },
        "GV": { sprite: ";", name: "Gravel", color: "lightgray", tags: ["landscape", "floor"] },
        "WS": { sprite: "~", name: "Shallow Water", color: "blue", tags: ["landscape", "water", "floor"] },
        "WD": { sprite: "~", name: "Deep Water", color: "darkblue", tags: ["landscape", "water", "floor", "impassable"] },
        "AR": { sprite: "=", name: "Asphalt Road", color: "gray", tags: ["landscape", "floor"] },
        "DR": { sprite: ":", name: "Dirt Road", color: "sienna", tags: ["landscape", "floor"] },
        "TRK": { sprite: "|", name: "Tree Trunk", color: "brown", tags: ["landscape", "vegetation", "impassable"] },
        "BSH": { sprite: "*", name: "Bush", color: "green", tags: ["landscape", "vegetation"] },
        "BLK": { sprite: "O", name: "Boulder", color: "lightgray", tags: ["landscape", "impassable"] },
        "SPK": { sprite: "^", name: "Spikes", color: "gray", tags: ["landscape", "item"] },
        "MH": { sprite: "o", name: "Manhole", color: "darkgray", tags: ["landscape", "floor"] },

        // ───────────────────────────────────────────────────────────────────────────────
        // Building Floors
        // ───────────────────────────────────────────────────────────────────────────────
        "FL": { sprite: "+", name: "Tile Flooring", color: "#d3d3d3", tags: ["floor", "building"] },
        "WF": { sprite: "-", name: "Wood Flooring", color: "brown", tags: ["floor", "wood", "building"] },
        "CT": { sprite: "░", name: "Carpet Floor", color: "#808080", tags: ["floor", "building"] },

        // ───────────────────────────────────────────────────────────────────────────────
        // Building Walls (Wood)
        // ───────────────────────────────────────────────────────────────────────────────
        "WWH": { sprite: "═", name: "Wood Wall Hz", color: "brown", tags: ["wall", "wood", "impassable", "building"] },
        "WWV": { sprite: "║", name: "Wood Wall Vt", color: "brown", tags: ["wall", "wood", "impassable", "building"] },
        "WWCTL": { sprite: "╔", name: "Wood Wall Corner TL", color: "brown", tags: ["wall", "wood", "impassable", "building"] },
        "WWCTR": { sprite: "╗", name: "Wood Wall Corner TR", color: "brown", tags: ["wall", "wood", "impassable", "building"] },
        "WWCBL": { sprite: "╚", name: "Wood Wall Corner BL", color: "brown", tags: ["wall", "wood", "impassable", "building"] },
        "WWCBR": { sprite: "╝", name: "Wood Wall Corner BR", color: "brown", tags: ["wall", "wood", "impassable", "building"] },
        "WWTE": { sprite: "╠", name: "Wood Wall T–East", color: "brown", tags: ["wall", "wood", "impassable", "building"] },
        "WWTW": { sprite: "╣", name: "Wood Wall T–West", color: "brown", tags: ["wall", "wood", "impassable", "building"] },
        "WWTS": { sprite: "╦", name: "Wood Wall T–South", color: "brown", tags: ["wall", "wood", "impassable", "building"] },
        "WWTN": { sprite: "╩", name: "Wood Wall T–North", color: "brown", tags: ["wall", "wood", "impassable", "building"] },
        "WWC": { sprite: "╬", name: "Wood Wall Cross", color: "brown", tags: ["wall", "wood", "impassable", "building"] },

        // ───────────────────────────────────────────────────────────────────────────────
        // Building Walls (Metal)
        // ───────────────────────────────────────────────────────────────────────────────
        "MWH": { sprite: "═", name: "Metal Wall Hz", color: "gray", tags: ["wall", "metal", "impassable", "building"] },
        "MWV": { sprite: "║", name: "Metal Wall Vt", color: "gray", tags: ["wall", "metal", "impassable", "building"] },
        "MWCTL": { sprite: "╔", name: "Metal Wall Corner TL", color: "gray", tags: ["wall", "metal", "impassable", "building"] },
        "MWCTR": { sprite: "╗", name: "Metal Wall Corner TR", color: "gray", tags: ["wall", "metal", "impassable", "building"] },
        "MWCBL": { sprite: "╚", name: "Metal Wall Corner BL", color: "gray", tags: ["wall", "metal", "impassable", "building"] },
        "MWCBR": { sprite: "╝", name: "Metal Wall Corner BR", color: "gray", tags: ["wall", "metal", "impassable", "building"] },
        "MWTE": { sprite: "╠", name: "Metal Wall T–East", color: "gray", tags: ["wall", "metal", "impassable", "building"] },
        "MWTW": { sprite: "╣", name: "Metal Wall T–West", color: "gray", tags: ["wall", "metal", "impassable", "building"] },
        "MWTS": { sprite: "╦", name: "Metal Wall T–South", color: "gray", tags: ["wall", "metal", "impassable", "building"] },
        "MWTN": { sprite: "╩", name: "Metal Wall T–North", color: "gray", tags: ["wall", "metal", "impassable", "building"] },
        "MWC": { sprite: "╬", name: "Metal Wall Cross", color: "gray", tags: ["wall", "metal", "impassable", "building"] },

        // ───────────────────────────────────────────────────────────────────────────────
        // Doors (Wood & Metal)
        // ───────────────────────────────────────────────────────────────────────────────
        "WDH": { sprite: "─", name: "Wood Door Hz", color: "brown", tags: ["door", "wood", "closed", "impassable", "interactive", "breakable", "building"] },
        "WDV": { sprite: "│", name: "Wood Door Vt", color: "brown", tags: ["door", "wood", "closed", "impassable", "interactive", "breakable", "building"] },
        "WOH": { sprite: "┄", name: "Wood Door Hz Open", color: "brown", tags: ["door", "wood", "open", "interactive", "breakable", "building"] },
        "WOV": { sprite: "┆", name: "Wood Door Vt Open", color: "brown", tags: ["door", "wood", "open", "interactive", "breakable", "building"] },
        "WDB": { sprite: ">", name: "Wood Door Broken", color: "brown", tags: ["door", "wood", "broken", "interactive", "building"] },

        "MDH": { sprite: "─", name: "Metal Door Hz", color: "gray", tags: ["door", "metal", "closed", "impassable", "interactive", "breakable", "building"] },
        "MDV": { sprite: "│", name: "Metal Door Vt", color: "gray", tags: ["door", "metal", "closed", "impassable", "interactive", "breakable", "building"] },
        "MOH": { sprite: "┄", name: "Metal Door Hz Open", color: "gray", tags: ["door", "metal", "open", "interactive", "breakable", "building"] },
        "MOV": { sprite: "┆", name: "Metal Door Vt Open", color: "gray", tags: ["door", "metal", "open", "interactive", "breakable", "building"] },
        "MDB": { sprite: ">", name: "Metal Door Broken", color: "gray", tags: ["door", "metal", "broken", "interactive", "building"] },

        // ───────────────────────────────────────────────────────────────────────────────
        // Windows
        // ───────────────────────────────────────────────────────────────────────────────
        "WinCH": { sprite: "─", name: "Window Hz Closed", color: "cyan", tags: ["window", "closed", "impassable", "interactive", "breakable", "building"] },
        "WinCV": { sprite: "│", name: "Window Vt Closed", color: "cyan", tags: ["window", "closed", "impassable", "interactive", "breakable", "building"] },
        "WinOH": { sprite: "┄", name: "Window Hz Open", color: "cyan", tags: ["window", "open", "interactive", "breakable", "building"] },
        "WinOV": { sprite: "┆", name: "Window Vt Open", color: "cyan", tags: ["window", "open", "interactive", "breakable", "building"] },
        "WinB": { sprite: ">", name: "Window Broken", color: "cyan", tags: ["window", "broken", "interactive", "building"] },

        // ───────────────────────────────────────────────────────────────────────────────
        // Roof Tiles
        // ───────────────────────────────────────────────────────────────────────────────
        "RW": { sprite: "#", name: "Roof (Wood)", color: "brown", tags: ["roof", "impassable"] },
        "RM": { sprite: "#", name: "Roof (Metal)", color: "gray", tags: ["roof", "impassable"] },
        "TRF": { sprite: "Y", name: "Tree Leaves", color: "green", tags: ["roof", "vegetation",] },

        // ───────────────────────────────────────────────────────────────────────────────
        // Items & Furniture
        // ───────────────────────────────────────────────────────────────────────────────
        "CN": { sprite: "∩", name: "Counter", color: "#d3d3d3", tags: ["building", "impassable"] },
        "CB": { sprite: "□", name: "Cabinet", color: "brown", tags: ["container", "building", "interactive"] },
        "SN": { sprite: "⊡", name: "Sink", color: "silver", tags: ["building", "interactive"] },

        "DR": { sprite: "π", name: "Drawer", color: "brown", tags: ["container", "interactive", "item"] },
        "GC": { sprite: "Æ", name: "Gun Case", color: "olive", tags: ["container", "interactive", "item"] },
        "TC": { sprite: "u", name: "Trash Can", color: "gray", tags: ["container", "interactive", "item"] },
        "SF": { sprite: "#", name: "Safe", color: "gray", tags: ["container", "interactive", "item"] },

        "RF": { sprite: "║", name: "Refrigerator", color: "lightgray", tags: ["container", "item", "interactive", "impassable"] },
        "ST": { sprite: "▣", name: "Stove/Oven", color: "gray", tags: ["container", "item", "interactive", "impassable"] },
        "MW": { sprite: "≋", name: "Microwave", color: "gray", tags: ["container", "item", "interactive"] },

        "SF2": { sprite: "≡", name: "Sofa", color: "maroon", tags: ["item", "interactive"] },
        "CH": { sprite: "╥", name: "Armchair", color: "maroon", tags: ["item", "interactive"] },
        "TB": { sprite: "☐", name: "Coffee Table", color: "brown", tags: ["item", "impassable"] },
        "TV": { sprite: "▢", name: "Television", color: "gray", tags: ["item", "interactive"] },
        "STL": { sprite: "⌠", name: "Bookshelf", color: "#deb887", tags: ["item", "interactive", "container", "impassable"] },

        "BD": { sprite: "╬", name: "Bed", color: "red", tags: ["building", "interactive"] },
        "NK": { sprite: "▦", name: "Nightstand", color: "brown", tags: ["item", "interactive", "container"] },
        "DRS": { sprite: "∥", name: "Dresser", color: "brown", tags: ["item", "interactive", "container"] },
        "DSK": { sprite: "⌂", name: "Desk", color: "gray", tags: ["item", "interactive", "container"] },
        "CR": { sprite: "≔", name: "Chair", color: "brown", tags: ["item", "interactive"] },

        "TW": { sprite: "‖", name: "Toilet", color: "white", tags: ["item", "interactive"] },
        "SH": { sprite: "╱", name: "Shower", color: "blue", tags: ["item", "interactive"] },
        "BTB": { sprite: "◯", name: "Bathtub", color: "white", tags: ["item", "interactive"] },

        "FLR": { sprite: "⌧", name: "Floor Lamp", color: "yellow", tags: ["item", "interactive"] },
        "PL": { sprite: "#", name: "Potted Plant", color: "green", tags: ["item"] },

        "CP": { sprite: "⌨", name: "Computer", color: "darkgray", tags: ["item", "interactive"] },
        "PR": { sprite: "⋈", name: "Printer", color: "gray", tags: ["item", "interactive"] },
        "WM": { sprite: "≋", name: "Washer", color: "white", tags: ["item", "interactive", "impassable"] },
        "DRY": { sprite: "≡", name: "Dryer", color: "white", tags: ["item", "interactive", "impassable"] },

        "FT": { sprite: "♣", name: "Fireplace", color: "red", tags: ["building", "interactive"] },
    },

    // Player positioning and game status
    playerPos: { x: 2, y: 2 },
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
    const tags = gameState.tilePalette[tileId]?.tags || [];
    // impassable unless it’s also movable
    return !tags.includes("impassable");
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

// Load an external map from 'Maps/testMap.json' using Fetch.
function loadExternalMap() {
    return fetch('Maps/beachHouse.json')
        .then(response => {
            if (!response.ok) throw new Error("Network error");
            return response.json();
        })
        .then(data => {
            // Validate that data.layers exists.
            if (data && data.layers) {
                return data.layers;
            } else {
                throw new Error("Invalid map data.");
            }
        });
}
// Toggle roof layer visibility.
function toggleRoof() {
    gameState.showRoof = !gameState.showRoof;
    scheduleRender(); // Replaced renderMapLayers
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
    const H = gameState.layers.landscape.length;
    const W = gameState.layers.landscape[0].length;

    let isInitialRender = false;
    if (!gameState.tileCache || gameState.tileCache.length !== H || (gameState.tileCache[0] && gameState.tileCache[0].length !== W)) {
        isInitialRender = true;
        container.innerHTML = ""; // Clear container only on full re-render
        gameState.tileCache = Array(H).fill(null).map(() => Array(W).fill(null));
        gameState.brElementsCache = Array(H).fill(null); // Cache for <br> elements
    }

    const fragment = isInitialRender ? document.createDocumentFragment() : null;

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            // Determine the actual tile ID from layers
            let actualTileId = gameState.layers.landscape[y][x];
            if (gameState.layers.building[y][x]) actualTileId = gameState.layers.building[y][x];
            if (gameState.layers.item[y][x]) actualTileId = gameState.layers.item[y][x];
            if (gameState.showRoof && gameState.layers.roof[y][x]) {
                actualTileId = gameState.layers.roof[y][x];
            }

            // Determine target display properties
            let targetSprite = "";
            let targetColor = "";
            let targetDisplayId = actualTileId; // This will be "PLAYER" if player is here

            const isPlayerCurrentlyOnTile = (x === gameState.playerPos.x && y === gameState.playerPos.y &&
                !(gameState.showRoof && gameState.layers.roof[y][x]));

            if (isPlayerCurrentlyOnTile) {
                targetSprite = "☻";
                targetColor = "green";
                targetDisplayId = "PLAYER"; // Special ID for player
            } else if (actualTileId) {
                const def = gameState.tilePalette[actualTileId];
                if (def) {
                    targetSprite = def.sprite;
                    targetColor = def.color;
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
        if (isInitialRender) {
            const br = document.createElement("br");
            gameState.brElementsCache[y] = br; // Store br in cache
            fragment.appendChild(br);
        }
    }

    if (isInitialRender) {
        container.appendChild(fragment);
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

    // 3) Pull out x/y (either from `.x/.y` or, if you ever mix in worldContainers, from `.position`)
    const it = gameState.interactableItems[idx];
    const x = (it.x !== undefined) ? it.x
        : (it.position ? it.position.x : undefined);
    const y = (it.y !== undefined) ? it.y
        : (it.position ? it.position.y : undefined);

    if (typeof x !== 'number' || typeof y !== 'number') return;

    // 4) Find and flash the matching span
    const span = document.querySelector(`.tile[data-x="${x}"][data-y="${y}"]`);
    if (span) span.classList.add('flashing');
}



// Collision checking: Look at the building and item layers.
function getCollisionTileAt(x, y) {
    const bld = gameState.layers.building[y][x];
    if (bld && gameState.tilePalette[bld]) return bld; // Check building first

    const itm = gameState.layers.item[y][x];
    if (itm && gameState.tilePalette[itm]) return itm; // Then item

    const lsp = gameState.layers.landscape[y][x];
    if (lsp && gameState.tilePalette[lsp]) return lsp; // Finally landscape

    return ""; // If all are empty or invalid
}

/**************************************************************
 * generateInitialMap
 * Now loads the external map (testMap.json) from the Maps folder.
 **************************************************************/
function generateInitialMap() {
    loadExternalMap()
        .then(layersData => {
            gameState.layers = layersData;
            scheduleRender(); // Replaced renderMapLayers
        })
        .catch(error => {
            console.error("Failed to load external map:", error);
        });
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
        gameState.movementPointsRemaining = 12;
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
    const width = gameState.layers.landscape[0].length;
    const height = gameState.layers.landscape.length;
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
    const R = 1;
    const { x: px, y: py } = gameState.playerPos;
    const layers = ["item", "building"];
    gameState.interactableItems = [];

    for (let y = Math.max(0, py - R); y <= Math.min(gameState.layers.landscape.length - 1, py + R); y++) {
        for (let x = Math.max(0, px - R); x <= Math.min(gameState.layers.landscape[0].length - 1, px + R); x++) {
            // look in each layer in priority order
            let tileId = layers.map(l => gameState.layers[l][y][x]).find(id => id);
            if (!tileId) continue;
            const tags = gameState.tilePalette[tileId]?.tags || [];
            if (tags.includes("interactive")) {
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
        // Look up the human‐friendly name:
        const tileDef = gameState.tilePalette[it.id] || { name: it.id };
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
    const tags = gameState.tilePalette[it.id]?.tags || [];
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
    const B = gameState.layers.building;
    let target = B[y][x];
    if (action === "Open" && DOOR_OPEN_MAP[target]) {
        B[y][x] = DOOR_OPEN_MAP[target];
        logToConsole(`Opened ${gameState.tilePalette[id].name}`);
    }
    else if (action === "Close" && DOOR_CLOSE_MAP[target]) {
        B[y][x] = DOOR_CLOSE_MAP[target];
        logToConsole(`Closed ${gameState.tilePalette[id].name}`);
    }
    else if (action === "Break Down" && DOOR_BREAK_MAP[target]) {
        B[y][x] = DOOR_BREAK_MAP[target];
        logToConsole(`Broke ${gameState.tilePalette[id].name}`);
    }
    else if (action === "Inspect" || action === "Loot") {
        logToConsole(`${action}ing ${gameState.tilePalette[id].name}`);
    }
    // redraw...
    scheduleRender(); // Replaced renderMapLayers
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

    // Add Worn Clothing section to Character Info Panel
    let wornHtml = '<h3>Worn Clothing</h3>';
    let hasWornItemsCharPanel = false;
    if (gameState.player && gameState.player.wornClothing) {
        for (const layer in gameState.player.wornClothing) {
            const item = gameState.player.wornClothing[layer];
            if (item) {
                hasWornItemsCharPanel = true;
                const layerDisplayNameKey = Object.keys(ClothingLayers).find(key => ClothingLayers[key] === layer);
                // Format display name: replace underscores with spaces and capitalize words
                let formattedLayerName = (layerDisplayNameKey || layer).replace(/_/g, ' ');
                formattedLayerName = formattedLayerName.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.substring(1)).join(' ');
                wornHtml += `<div><em>${formattedLayerName}:</em> ${item.name}</div>`;
            }
        }
    }
    if (!hasWornItemsCharPanel) {
        wornHtml += '<div>— Not wearing anything —</div>';
    }
    characterInfo.innerHTML += wornHtml; // Append to existing info
}

/**************************************************************
 * Inventory System Functions
 **************************************************************/
// 1) Define container sizes
const InventorySizes = {
    XS: 3, S: 6, M: 12, L: 18, XL: 24, XXL: 36
};

// 2) Inventory container constructor
function InventoryContainer(name, sizeLabel) {
    this.name = name;
    this.sizeLabel = sizeLabel;
    this.maxSlots = InventorySizes[sizeLabel];
    this.items = [];
}

// 3) Item constructor
function Item(name, description, size, type, canEquip = false, layer = null, coverage = [], insulation = 0, armorValue = 0, isClothing = false) {
    this.name = name;
    this.description = description;
    this.size = size;
    this.type = type;
    this.canEquip = canEquip; // This existing property might distinguish weapons/tools vs. clothing
    this.equipped = false; // Existing property

    // New properties for clothing
    this.layer = layer;           // e.g., ClothingLayers.TORSO_TOP
    this.coverage = coverage;     // e.g., ["torso", "leftArm", "rightArm"]
    this.insulation = insulation;
    this.armorValue = armorValue;
    this.isClothing = isClothing; // true if the item is wearable clothing
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
    const items = gameState.inventory.container.items;
    if (items.length === 0) {
        list.textContent = "— empty —";
        return;
    }
    items.forEach((it, idx) => {
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
    // Assuming 'inventoryList' is the main panel to show/hide for the inventory items.
    // The prompt mentions 'inventoryPanel', but the HTML structure uses 'inventoryList' for items.
    // Let's target 'inventoryList' visibility, or a more encompassing parent if needed.
    // For now, let's assume the 'inventoryList' itself is what needs to be toggled.
    // If there's a larger 'inventoryPanel' div that contains 'inventoryList' and other controls,
    // that would be the target for toggling 'hidden'.
    // Given the current HTML, 'inventoryList' is where items are rendered.
    const inventoryListDiv = document.getElementById("inventoryList");

    if (gameState.inventory.open) {
        inventoryListDiv.classList.remove("hidden"); // Show the list
        inventoryListDiv.style.display = 'block'; // Or use a class that sets display
        renderInventoryMenu();
    } else {
        inventoryListDiv.classList.add("hidden"); // Hide the list
        inventoryListDiv.style.display = 'none'; // Or use a class
        clearInventoryHighlight(); // Clear highlights when closing
    }
}

// 12) “Use” selected item
function interactInventoryItem() {
    const idx = gameState.inventory.cursor;
    const item = gameState.inventory.container.items[idx];
    if (!item) return;

    if (item.isClothing) {
        if (!item.equipped) { // Only allow equipping if not already equipped
            logToConsole(`Attempting to wear ${item.name}...`);
            equipClothing(item.name); // Directly attempt to wear
        } else {
            // This case should ideally not happen if equipped items are not in the browsable inventory.
            // If it does, it implies the item is marked equipped but still in general inventory.
            logToConsole(`${item.name} is marked as equipped but is in inventory. This may be an error or unimplemented state.`);
        }
    } else {
        // Default action for non-clothing items: look at description
        logToConsole(`You look at your ${item.name}: ${item.description}`);
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
        leftArm: { max: 7, current: 7, armor: 0, crisisTimer: 0 },
        rightArm: { max: 7, current: 7, armor: 0, crisisTimer: 0 },
        leftLeg: { max: 7, current: 7, armor: 0, crisisTimer: 0 },
        rightLeg: { max: 7, current: 7, armor: 0, crisisTimer: 0 },
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

// Apply damage to a specified body part
function applyDamage(bodyPart, damage) {
    if (!gameState.health || !gameState.health[bodyPart]) return;
    let part = gameState.health[bodyPart];

    const effectiveArmor = getArmorForBodyPart(bodyPart);
    const reducedDamage = Math.max(0, damage - effectiveArmor);

    logToConsole(`Original damage to ${bodyPart}: ${damage}, Armor: ${effectiveArmor}, Reduced damage: ${reducedDamage}`);

    part.current = Math.max(part.current - reducedDamage, 0);
    logToConsole(`${bodyPart} HP: ${part.current}/${part.max} after taking ${reducedDamage} damage.`);

    if (part.current === 0 && part.crisisTimer === 0) {
        part.crisisTimer = 3;
        logToConsole(`${bodyPart} is in crisis! Treat within 3 turns or die.`);
    }
    renderHealthTable();
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
        leftHand: "L Hand",
        rightArm: "R Arm",
        rightHand: "R Hand",
        leftLeg: "L Leg",
        leftFoot: "L Foot",
        rightLeg: "R Leg",
        rightFoot: "R Foot"
    };
    return nameMap[part] || part;
}

// Game over logic placeholder
function gameOver() {
    logToConsole("GAME OVER.");
    // Further game-over logic here
}

/**************************************************************
 * Event Handlers & Initialization
 **************************************************************/
// Keydown event handler for movement and actions
function handleKeyDown(event) {
    // 1) Inventory has top priority
    if (gameState.inventory.open) {
        switch (event.key) {
            case 'ArrowUp': case 'w':
                if (gameState.inventory.cursor > 0) {
                    gameState.inventory.cursor--;
                    renderInventoryMenu();
                }
                event.preventDefault();
                return;
            case 'ArrowDown': case 's':
                if (gameState.inventory.cursor <
                    gameState.inventory.container.items.length - 1) {
                    gameState.inventory.cursor++;
                    renderInventoryMenu();
                }
                event.preventDefault();
                return;
            case 'Enter': case 'f':
                interactInventoryItem();
                event.preventDefault();
                return;
            case 'i': case 'I':
                toggleInventoryMenu();
                clearInventoryHighlight();
                event.preventDefault();
                return;
            default:
                return;
        }
    }

    // 2) Toggle inventory
    if (event.key === 'i' || event.key === 'I') {
        toggleInventoryMenu();
        event.preventDefault();
        return;
    }

    // 3) NORMAL MOVEMENT & ITEM SELECTION (when no action menu is active)
    if (!gameState.isActionMenuActive) {
        switch (event.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
            case 'ArrowDown':
            case 's':
            case 'S':
            case 'ArrowLeft':
            case 'a':
            case 'A':
            case 'ArrowRight':
            case 'd':
            case 'D':
                move(event.key);
                event.preventDefault();
                return;
            default:
                if (event.key >= '1' && event.key <= '9') {
                    selectItem(parseInt(event.key, 10) - 1);
                    event.preventDefault();
                    return;
                }
        }
        if (event.key === 'x' || event.key === 'X') {
            dash();
            event.preventDefault();
            return;
        }
        if (event.key === 't' || event.key === 'T') {
            endTurn();
            event.preventDefault();
            return;
        }
    }

    // 4) INTERACTIONS & ACTION MENU
    switch (event.key) {
        case 'f':
        case 'F':
            if (gameState.isActionMenuActive) {
                performSelectedAction();
            } else if (gameState.selectedItemIndex !== -1) {
                interact();
            }
            event.preventDefault();
            break;

        case 'Escape':
            cancelActionSelection();
            event.preventDefault();
            break;

        case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
            if (gameState.isActionMenuActive) {
                selectAction(parseInt(event.key, 10) - 1);
                event.preventDefault();
            }
            break;
    }
}

// Initial setup on DOM content load
function initialize() {
    renderTables();
    generateInitialMap();
    document.addEventListener('keydown', handleKeyDown);
    updateInventoryUI();
}
/**************************************************************
 * Start Game
 **************************************************************/
function startGame() {
    const characterCreator = document.getElementById('character-creator');
    const characterInfoPanel = document.getElementById('character-info-panel');
    const gameControls = document.getElementById('game-controls');
    // gameState.inventory.container is already created with a name "Backpack"
    // If a specific "Backpack" item that modifies capacity needs to be added, it would be done here.
    // For example, if there's an actual Item object for "Backpack":
    // const backpackItem = new Item("Backpack Item", "A sturdy backpack.", 1, "containerModifier");
    // addItem(backpackItem); // This would use the addItem logic if it affects inventory directly

    // The prompt implies gameState.inventory.container *is* the backpack.
    // If its properties (like maxSlots) are meant to be changed by a "Backpack" item, that logic would be here.
    // For now, the container itself is named "Backpack" and has its initial size.
    // If finding a "Backpack" item in the world should *change* gameState.inventory.container.maxSlots,
    // that's a separate mechanic.

    // Example of how a backpack item might be used to upgrade the main container:
    // This is a conceptual addition, as the prompt focuses on UI for the existing container.
    const foundBackpackItem = new Item(
        "Large Backpack", // This is an item *in* the game world
        "A large backpack that upgrades your carrying capacity.",
        0, // Size it takes up if it were in another container before equipping
        "containerUpgrade", // A new type to signify it upgrades capacity
        false, // Not equippable in hands (this means it cannot go into handSlots)
        null, [], 0, 0, false // Default clothing properties for non-clothing item
    );
    // Simulate finding and "equipping" this upgrade
    if (foundBackpackItem.type === "containerUpgrade") {
        gameState.inventory.container.name = "Large Backpack"; // Update name
        gameState.inventory.container.sizeLabel = "XL"; // Update size label
        gameState.inventory.container.maxSlots = InventorySizes.XL; // Update max slots
        logToConsole("You've upgraded to a Large Backpack! Capacity is now XL (24 slots).");
    } else {
        // Default initialization message if no specific upgrade item is found/processed at start
        logToConsole(`Using ${gameState.inventory.container.name}. Capacity: ${gameState.inventory.container.maxSlots} slots.`);
    }

    // Add test clothing items to inventory

    // Simple Shirt (as TORSO_BOTTOM)
    let simpleShirt = new Item(
        "Simple Shirt",
        "A basic shirt.",
        1, // size
        "clothing", // type
        false, // canEquip (hand slot)
        ClothingLayers.TORSO_BOTTOM, // layer (changed to BOTTOM for variety)
        ["torso"], // coverage
        1, // insulation
        0, // armorValue
        true // isClothing
    );
    addItem(simpleShirt);

    // Baseball Cap (existing)
    let baseballCap = new Item( // Renamed from testHat to be more specific
        "Baseball Cap",
        "A simple cap to keep the sun out of your eyes.",
        1, // size
        "clothing", // type
        false, // canEquip (to hand)
        ClothingLayers.HEAD_TOP, // layer
        ["head"], // coverage
        0.5, // insulation
        0, // armorValue
        true // isClothing
    );
    addItem(baseballCap);

    // Basic Vest (ensure it's TORSO_TOP if shirt is TORSO_BOTTOM)
    let basicVest = new Item( // Renamed from vest to be more specific
        "Basic Vest",
        "A simple vest providing some torso protection.",
        2, // size
        "clothing", // type
        false, // canEquip
        ClothingLayers.TORSO_TOP, // layer
        ["torso"], // coverage
        0, // insulation
        5, // armorValue (as used in prior tests)
        true // isClothing
    );
    addItem(basicVest);

    // NEW ITEMS FROM PROMPT:

    // Durable Pants
    let pants = new Item(
        "Durable Pants",
        "Sturdy pants for everyday wear.",
        2,                               // size
        "clothing",                      // type
        false,                           // canEquip (hand slot)
        ClothingLayers.LEGS_BOTTOM,      // layer
        ["leftLeg", "rightLeg"],         // coverage
        1,                               // insulation
        1,                               // armorValue
        true                             // isClothing
    );
    addItem(pants);

    // Wide-Brimmed Hat
    let wideBrimmedHat = new Item( // Renamed from hat to be more specific
        "Wide-Brimmed Hat",
        "Offers good sun protection.",
        1,                               // size
        "clothing",                      // type
        false,                           // canEquip
        ClothingLayers.HEAD_TOP,         // layer (will compete with Baseball Cap for the slot)
        ["head"],                        // coverage
        1,                               // insulation
        0,                               // armorValue
        true                             // isClothing
    );
    addItem(wideBrimmedHat);

    // Small Backpack (Wearable)
    let smallBackpackItem = new Item(
        "Small Backpack (Wearable)",
        "A wearable backpack that occupies the backpack clothing slot.",
        2,                               // size (when in inventory)
        "clothing",                      // type (using 'clothing' to engage the layer system)
        false,                           // canEquip
        ClothingLayers.BACKPACK,         // layer
        [],                              // coverage (no direct body part coverage unless specified)
        0,                               // insulation
        0,                               // armorValue
        true                             // isClothing
    );
    addItem(smallBackpackItem);

    // Note: To test applyDamage effectively, items with armor would need to be equipped.
    // This can be done manually via inventory. The player can equip them.


    if (characterCreator) characterCreator.classList.add('hidden');
    if (characterInfoPanel) characterInfoPanel.classList.remove('hidden');
    if (gameControls) gameControls.classList.remove('hidden');

    renderCharacterInfo();
    gameState.gameStarted = true;
    updateInventoryUI();
    generateInitialMap(); // This will call scheduleRender internally
    initializeHealth();
    detectInteractableItems();
    showInteractableItems();
    startTurn();
}

document.addEventListener('DOMContentLoaded', () => {
    renderTables();
    generateInitialMap(); // This will call scheduleRender internally
    document.addEventListener('keydown', handleKeyDown);
});