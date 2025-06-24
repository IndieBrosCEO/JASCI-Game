// mapMaker.js
const assetManager = new AssetManager();

// --- 1) Initial grid size & CSS var ---
let gridWidth = parseInt(document.getElementById("inputWidth").value, 10) || 20;
let gridHeight = parseInt(document.getElementById("inputHeight").value, 10) || 15;
document.documentElement.style.setProperty("--cols", gridWidth);

// --- Auto-tiling lookup (mask → variant ID) ---
const autoTileMap = {
    WWH: { 0: "WWH", 1: "WWV", 2: "WWH", 3: "WWCBL", 4: "WWV", 5: "WWV", 6: "WWCTL", 7: "WWTE", 8: "WWH", 9: "WWCBR", 10: "WWH", 11: "WWTN", 12: "WWCTR", 13: "WWTW", 14: "WWTS", 15: "WWC" },
    MWH: { 0: "MWH", 1: "MWV", 2: "MWH", 3: "MWCBL", 4: "MWV", 5: "MWV", 6: "MWCTL", 7: "MWTE", 8: "MWH", 9: "MWCBR", 10: "MWH", 11: "MWTN", 12: "MWCTR", 13: "MWTW", 14: "MWTS", 15: "MWC" }
};

// --- 3) Grid helpers ---
function createEmptyGrid(w, h, def = "") {
    const g = [];
    for (let y = 0; y < h; y++) {
        g[y] = [];
        for (let x = 0; x < w; x++) {
            g[y][x] = def;
        }
    }
    return g;
}

function createDefaultLandscape(w, h) {
    // Default to a completely blank grid for the landscape layer.
    return createEmptyGrid(w, h, "");
}

function applyAutoTile(x, y, z, layerType) { // Added z and layerType
    const zStr = z.toString();
    ensureLayersForZ(z); // Ensure the Z-level and its layers exist

    const currentLevelLayer = mapData.levels[zStr]?.[layerType];
    if (!currentLevelLayer) return;

    const tileId = currentLevelLayer[y]?.[x];
    // If tileId is an object (e.g. container), get its base tileId for autotiling logic
    const baseTileId = (typeof tileId === 'object' && tileId !== null && tileId.tileId !== undefined) ? tileId.tileId : tileId;

    if (!baseTileId || typeof baseTileId !== 'string') return; // Autotiling needs a string tile ID

    const fam = baseTileId.slice(0, 2);
    const mapKey = fam + "H"; // Assumes autotile keys are based on horizontal variant like "WWH"
    const autoTileVariantMap = autoTileMap[mapKey];
    if (!autoTileVariantMap) return;

    let mask = 0;
    [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]].forEach(([dx, dy, bit]) => {
        const neighborTileData = currentLevelLayer[y + dy]?.[x + dx];
        const neighborBaseId = (typeof neighborTileData === 'object' && neighborTileData !== null && neighborTileData.tileId !== undefined) ? neighborTileData.tileId : neighborTileData;
        if (neighborBaseId && typeof neighborBaseId === 'string' && neighborBaseId.slice(0, 2) === fam) {
            mask |= bit;
        }
    });

    const newTileVariantId = autoTileVariantMap[mask];
    if (newTileVariantId) {
        // If the original tile was an object, preserve its properties but update tileId
        if (typeof tileId === 'object' && tileId !== null) {
            tileId.tileId = newTileVariantId; // Update the base tileId within the object
            // mapData.levels[zStr][layerType][y][x] is already this object, so modification is direct.
        } else {
            mapData.levels[zStr][layerType][y][x] = newTileVariantId;
        }
    }
}

// Helper function to determine the target layer for a tile based on its tags
function getAssignedLayer(tileDef) {
    if (!tileDef || !tileDef.tags) {
        // console.warn("getAssignedLayer: tileDef or tags missing, defaulting to middle.");
        return "middle";
    }

    const tags = tileDef.tags;

    // Rule 1: Explicit Floor tiles
    if (tags.includes("floor")) {
        return "bottom";
    }

    // Rule 2: Walls, Doors, Windows (structural, occupy space)
    if (tags.includes("wall") || tags.includes("door") || tags.includes("window")) {
        return "middle";
    }

    // Rule 3: Furniture, Containers (objects on a level)
    if (tags.includes("furniture") || tags.includes("container")) {
        return "middle";
    }

    // Rule 4: Roof structures
    if (tags.includes("roof")) { // Assuming solid roofs go to middle
        return "middle";
    }

    // Rule 5: Other Impassable items/landscape (boulders, tree trunks)
    if (tags.includes("impassable")) {
        return "middle";
    }

    // Rule 6: General "item" tag for non-floor, non-furniture, non-container items
    if (tags.includes("item")) {
        return "middle";
    }

    // Rule 7: Other "building" components not covered above
    if (tags.includes("building")) {
        return "middle";
    }

    // Rule 8: Landscape elements not classified as floor (e.g., bushes)
    if (tags.includes("landscape")) {
        return "middle"; // If it's landscape but not a floor, assume it has some volume/height.
    }

    // Final Default
    // console.log(`getAssignedLayer: Tile ${tileDef.name || 'Unknown'} with tags [${tags.join(',')}] defaulted to middle.`);
    return "middle";
}


function placeTile(x, y, z, tileIdOrObject) { // Added z, renamed tid to tileIdOrObject
    const zStr = z.toString();
    ensureLayersForZ(z); // Ensure the Z-level and its layers exist

    // Determine targetLayer based on the tile being placed
    let effectiveTileId = tileIdOrObject;
    if (typeof tileIdOrObject === 'object' && tileIdOrObject !== null && tileIdOrObject.tileId) {
        effectiveTileId = tileIdOrObject.tileId;
    }

    const tileDef = assetManager.tilesets[effectiveTileId];
    let determinedLayerType = "middle"; // Default to middle if something goes wrong, or for unclassified tiles.
    if (effectiveTileId === "") { // Eraser tool
        // Eraser should clear from both bottom and middle layers for the given cell
        if (mapData.levels[zStr]) {
            if (mapData.levels[zStr].bottom) {
                mapData.levels[zStr].bottom[y][x] = "";
            }
            if (mapData.levels[zStr].middle) {
                mapData.levels[zStr].middle[y][x] = "";
            }
        }
        // No autotiling needed for eraser
        renderMergedGrid(); // Re-render after erasing
        return; // Eraser action complete
    } else if (tileDef) {
        determinedLayerType = getLayerForTile(tileDef);
    } else {
        console.warn(`Placing tile but no definition found for ID: ${effectiveTileId}. Defaulting to landscape layer.`);
    }

    const targetLayerGrid = mapData.levels[zStr]?.[determinedLayerType];
    if (!targetLayerGrid) {
        console.error(`Cannot place tile: Determined layer type ${determinedLayerType} does not exist as a grid for Z-level ${zStr}.`);
        return;
    }

    targetLayerGrid[y][x] = tileIdOrObject;

    // Autotiling should use the base ID if it's an object
    const baseIdForAutotile = (typeof tileIdOrObject === 'object' && tileIdOrObject !== null && tileIdOrObject.tileId !== undefined)
        ? tileIdOrObject.tileId
        : tileIdOrObject;

    if (typeof baseIdForAutotile === 'string' && baseIdForAutotile.length >= 2) { // Only attempt autotile if we have a valid string ID
        const fam = baseIdForAutotile.slice(0, 2);
        const mapKey = fam + "H";
        if (autoTileMap[mapKey]) { // Check if this tile family participates in autotiling
            applyAutoTile(x, y, z, determinedLayerType); // Use determinedLayerType
            // Retile neighbors only if they are part of the same family and also autotile
            // This prevents unnecessary re-tiling of unrelated adjacent tiles.
            [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
                    // Ensure we are checking the correct layer for neighbor (determinedLayerType)
                    const neighborTileData = mapData.levels[zStr]?.[determinedLayerType]?.[ny]?.[nx];
                    const neighborBaseId = (typeof neighborTileData === 'object' && neighborTileData !== null && neighborTileData.tileId !== undefined)
                        ? neighborTileData.tileId
                        : neighborTileData;
                    if (neighborBaseId && typeof neighborBaseId === 'string' && neighborBaseId.slice(0, 2) === fam) {
                        applyAutoTile(nx, ny, z, determinedLayerType); // Use determinedLayerType
                    }
                }
            });
        }
    }
}


// --- 4) State ---
// --- 4) State Variables ---
let mapData = { // Main object to hold all map data, including Z-levels
    id: "new_map",
    name: "New Map",
    width: gridWidth, // These will be initial values, updated by UI
    height: gridHeight,
    startPos: { x: 0, y: 0, z: 0 }, // Player start position including Z
    levels: {
        // Example for Z=0, ensureLayersForZ will create this structure
        // "0": { 
        //     bottom: [], 
        //     middle: [] 
        // }
    },
    npcs: [],   // NPCs are global to the map, but their pos will have x,y,z
    portals: [] // Portals are global, their pos and targetPos will have x,y,z
};

let currentEditingZ = 0; // The Z-level currently being edited
let currentLayerType = "landscape"; // Active layer type being edited (e.g., landscape, building)
let currentTileId = "MB";

// For Container Inventory & Lock Properties Editing
let selectedTileForInventory = null; // Stores {x, y, z, layerName} 

// For Portal Editing
// let addingPortalMode = false; // Removed: Portal adding is now a tool
let selectedPortal = null;
let nextPortalId = 0;
let selectedGenericTile = null; // Stores {x, y, z, layerName}

// For Drawing Tools
let currentTool = "brush",
    dragStart = null, // Stores {x, y} at the start of a drag operation for line/rect/stamp
    previewPos = null,
    stampData3D = null; // Changed from stampData to reflect 3D nature

// Onion Skinning State
let onionSkinEnabled = false;
let onionLayersBelow = 1; // Default value from HTML
let onionLayersAbove = 0; // Default value from HTML

const layerVisibility = {
    bottom: true,
    middle: true
};

// --- 5) Undo/Redo ---
const undoStack = [], redoStack = [];
function snapshot() {
    // Snapshot the entire mapData object, which now includes levels, npcs, portals etc.
    undoStack.push(JSON.parse(JSON.stringify(mapData)));
    if (undoStack.length > 25) undoStack.shift();
    redoStack.length = 0; // Clear redo stack on new action
}
function undo() {
    if (!undoStack.length) return;
    redoStack.push(JSON.parse(JSON.stringify(mapData))); // Current state to redo
    mapData = undoStack.pop(); // Restore previous state
    // Update UI elements that depend on mapData state (like Z-level input, grid dimensions)
    document.getElementById("inputWidth").value = mapData.width;
    document.getElementById("inputWidth").value = mapData.width;
    document.getElementById("inputHeight").value = mapData.height;
    gridWidth = mapData.width;
    gridHeight = mapData.height;
    document.documentElement.style.setProperty("--cols", gridWidth);
    currentEditingZ = mapData.startPos.z !== undefined ? mapData.startPos.z : 0;
    document.getElementById("zLevelInput").value = currentEditingZ;
    updatePlayerStartDisplay(); // Ensures X,Y,Z are all updated
    ensureLayersForZ(currentEditingZ);
    renderMergedGrid();
}
function redo() {
    if (!redoStack.length) return;
    undoStack.push(JSON.parse(JSON.stringify(mapData))); // Current state to undo
    mapData = redoStack.pop(); // Restore redone state
    document.getElementById("inputWidth").value = mapData.width;
    document.getElementById("inputHeight").value = mapData.height;
    gridWidth = mapData.width;
    gridHeight = mapData.height;
    document.documentElement.style.setProperty("--cols", gridWidth);
    currentEditingZ = mapData.startPos.z; // Or persist
    document.getElementById("zLevelInput").value = currentEditingZ;
    document.getElementById("playerStartZDisplay").textContent = mapData.startPos.z;
    ensureLayersForZ(currentEditingZ);
    renderMergedGrid();
}

function updatePlayerStartDisplay() {
    const startXDisp = document.getElementById("playerStartXDisplay");
    const startYDisp = document.getElementById("playerStartYDisplay");
    const startZDisp = document.getElementById("playerStartZDisplay");
    if (startXDisp) startXDisp.textContent = mapData.startPos && mapData.startPos.x !== undefined ? mapData.startPos.x : 'N/A';
    if (startYDisp) startYDisp.textContent = mapData.startPos && mapData.startPos.y !== undefined ? mapData.startPos.y : 'N/A';
    if (startZDisp) startZDisp.textContent = mapData.startPos && mapData.startPos.z !== undefined ? mapData.startPos.z : 'N/A';
}

// --- 6) Palette ---
const paletteContainer = document.getElementById("paletteContainer");
let activeTagFilters = []; // Store currently active tag filters

function getSelectedTags() {
    activeTagFilters = [];
    document.querySelectorAll(".tagFilterCheckbox:checked").forEach(checkbox => {
        activeTagFilters.push(checkbox.value);
    });
    return activeTagFilters;
}

function buildPalette() {
    paletteContainer.innerHTML = "";
    const eraser = document.createElement("div");
    eraser.className = "palette"; eraser.dataset.tileId = ""; // Empty string for eraser
    eraser.textContent = "✖"; eraser.title = "Eraser (Clear Tile)";
    eraser.onclick = () => { currentTileId = ""; updatePaletteSelectionUI(); }; // Changed from updatePalette
    paletteContainer.appendChild(eraser);

    getSelectedTags(); // Update activeTagFilters

    if (assetManager.tilesets && Object.keys(assetManager.tilesets).length > 0) {
        Object.entries(assetManager.tilesets).forEach(([id, tileDef]) => {
            let showInPalette = true; // Show by default
            if (activeTagFilters.length > 0) { // If any filters are active
                showInPalette = activeTagFilters.every(filterTag => tileDef.tags && tileDef.tags.includes(filterTag));
            }

            if (!showInPalette) return;

            const d = document.createElement("div");
            d.className = "palette"; d.dataset.tileId = id;
            d.textContent = tileDef.sprite; d.style.color = tileDef.color;
            d.title = `${tileDef.name} (${id}) Tags: ${(tileDef.tags || []).join(', ')}`;
            d.onclick = () => { currentTileId = id; updatePaletteSelectionUI(); }; // Changed from updatePalette
            paletteContainer.appendChild(d);
        });
    } else {
        paletteContainer.innerHTML = "<p>No tiles loaded. Check definitions.</p>";
    }
    updatePaletteSelectionUI(); // Changed from updatePalette
}

function updatePaletteSelectionUI() { // Renamed from updatePalette
    document.querySelectorAll(".palette")
        .forEach(el => el.classList.toggle("selected", el.dataset.tileId === currentTileId));
}

// Helper function to ensure a Z-level and its layer types exist in mapData.levels
function ensureLayersForZ(zLevel) {
    const zStr = zLevel.toString();
    if (!mapData.levels[zStr]) {
        mapData.levels[zStr] = {
            bottom: createEmptyGrid(gridWidth, gridHeight, ""), // createDefaultLandscape now returns empty grid
            middle: createEmptyGrid(gridWidth, gridHeight, "")
        };
        console.log(`Initialized new bottom/middle layer structure for Z-level: ${zStr}`);
    } else {
        // Ensure bottom and middle layers exist if the Z-level object itself exists
        if (!mapData.levels[zStr].bottom) {
            mapData.levels[zStr].bottom = createEmptyGrid(gridWidth, gridHeight, "");
            console.log(`Initialized missing 'bottom' layer for Z-level: ${zStr}`);
        }
        if (!mapData.levels[zStr].middle) {
            mapData.levels[zStr].middle = createEmptyGrid(gridWidth, gridHeight, "");
            console.log(`Initialized missing 'middle' layer for Z-level: ${zStr}`);
        }
        // Clean up old layer types if they exist from a loaded old-format map that wasn't fully converted
        // or if just transitioning structure.
        delete mapData.levels[zStr].landscape;
        delete mapData.levels[zStr].building;
        delete mapData.levels[zStr].item;
        delete mapData.levels[zStr].roof;
    }
}

// --- 7) Render grid & stamp preview ---
const gridContainer = document.getElementById("grid");
gridContainer.addEventListener("mousemove", e => {
    if (currentTool === "stamp" && stampData) {
        const c = e.target.closest(".cell");
        previewPos = c ? { x: +c.dataset.x, y: +c.dataset.y } : null;
        renderMergedGrid();
    }
});
gridContainer.addEventListener("mouseleave", () => {
    previewPos = null; renderMergedGrid();
});

function renderMergedGrid() {
    gridContainer.innerHTML = "";

    const zStr = currentEditingZ.toString();
    ensureLayersForZ(currentEditingZ); // Make sure the current editing Z has its layers initialized
    const currentLevel = mapData.levels[zStr];

    if (!currentLevel) {
        gridContainer.innerHTML = `<p style='color:red;'>Error: No data for Z-level ${currentEditingZ}. Try adding it or changing Z-level.</p>`;
        return;
    }

    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            // Old logic for determining id and displayId from landscape, building, item, roof is removed.
            // New logic below correctly determines display based on bottom/middle layers.

            const c = document.createElement("div");
            c.className = "cell"; c.dataset.x = x; c.dataset.y = y; c.dataset.z = currentEditingZ;

            let displaySprite = ' ';
            let displayColor = 'black'; // Default for empty
            let tileNameForTitle = 'Empty';
            let originalDisplayIdForTitle = '';


            // Determine the actual tile on the current Z level first
            // Order: middle layer on top of bottom layer.
            let tileOnBottomRaw = layerVisibility.bottom && currentLevel.bottom?.[y]?.[x] ? currentLevel.bottom[y][x] : "";
            let tileOnMiddleRaw = layerVisibility.middle && currentLevel.middle?.[y]?.[x] ? currentLevel.middle[y][x] : "";

            let effectiveTileOnBottom = (typeof tileOnBottomRaw === 'object' && tileOnBottomRaw !== null && tileOnBottomRaw.tileId !== undefined) ? tileOnBottomRaw.tileId : tileOnBottomRaw;
            let effectiveTileOnMiddle = (typeof tileOnMiddleRaw === 'object' && tileOnMiddleRaw !== null && tileOnMiddleRaw.tileId !== undefined) ? tileOnMiddleRaw.tileId : tileOnMiddleRaw;

            let tileDefOnBottom = assetManager.tilesets[effectiveTileOnBottom];
            let tileDefOnMiddle = assetManager.tilesets[effectiveTileOnMiddle];

            // Determine the tile to actually display on current Z based on bottom/middle
            let finalTileIdOnCurrentZ = effectiveTileOnMiddle || effectiveTileOnBottom; // Middle takes precedence if it exists
            let finalTileDefOnCurrentZ = tileDefOnMiddle || tileDefOnBottom;
            // If middle was an object, finalTileIdOnCurrentZ should be its base ID, but finalTileDefOnCurrentZ is its def.
            // If only bottom exists, these will be from bottom. If both empty, they are empty/null.
            if (effectiveTileOnMiddle && tileDefOnMiddle) {
                originalDisplayIdForTitle = effectiveTileOnMiddle;
                tileNameForTitle = tileDefOnMiddle.name;
            } else if (effectiveTileOnBottom && tileDefOnBottom) {
                originalDisplayIdForTitle = effectiveTileOnBottom;
                tileNameForTitle = tileDefOnBottom.name;
            } else {
                originalDisplayIdForTitle = "";
                tileNameForTitle = "Empty";
            }


            let appliedSolidTopRule = false;
            displaySprite = ' '; // Default to empty
            displayColor = 'black';


            if (finalTileIdOnCurrentZ && finalTileDefOnCurrentZ) {
                if (finalTileDefOnCurrentZ.tags && finalTileDefOnCurrentZ.tags.includes('solid_terrain_top')) {
                    displaySprite = '▓';
                    displayColor = finalTileDefOnCurrentZ.color;
                    appliedSolidTopRule = true;
                } else {
                    displaySprite = finalTileDefOnCurrentZ.sprite;
                    displayColor = finalTileDefOnCurrentZ.color;
                }
            }

            // If current cell is see-through (empty or transparent floor on current Z) 
            // AND no solid_terrain_top rule applied for the current Z tile itself
            let isCurrentCellSeeThrough = (!finalTileIdOnCurrentZ || finalTileIdOnCurrentZ === "");
            if (finalTileDefOnCurrentZ && finalTileDefOnCurrentZ.tags &&
                (finalTileDefOnCurrentZ.tags.includes('transparent_floor') || finalTileDefOnCurrentZ.tags.includes('allows_vision'))) {
                if (!appliedSolidTopRule) isCurrentCellSeeThrough = true;
            }

            if (!appliedSolidTopRule && isCurrentCellSeeThrough) {
                const zBelow = currentEditingZ - 1;
                const zBelowStr = zBelow.toString();
                const levelBelow = mapData.levels[zBelowStr];
                if (levelBelow) {
                    let tileOnBottomBelowRaw = layerVisibility.bottom && levelBelow.bottom?.[y]?.[x] ? levelBelow.bottom[y][x] : "";
                    let tileOnMiddleBelowRaw = layerVisibility.middle && levelBelow.middle?.[y]?.[x] ? levelBelow.middle[y][x] : "";

                    let effectiveTileOnBottomBelow = (typeof tileOnBottomBelowRaw === 'object' && tileOnBottomBelowRaw !== null && tileOnBottomBelowRaw.tileId !== undefined) ? tileOnBottomBelowRaw.tileId : tileOnBottomBelowRaw;
                    let effectiveTileOnMiddleBelow = (typeof tileOnMiddleBelowRaw === 'object' && tileOnMiddleBelowRaw !== null && tileOnMiddleBelowRaw.tileId !== undefined) ? tileOnMiddleBelowRaw.tileId : tileOnMiddleBelowRaw;

                    // The tile providing solid_terrain_top from below could be on its own middle or bottom layer.
                    // For example, a Dirt (bottom) or Boulder (middle) tile from Z-1.
                    // We care about the "topmost" effective tile from Z-1 that has solid_terrain_top.
                    let tileDefBelowToConsider = null;
                    let effectiveIdBelowToConsider = "";

                    if (effectiveTileOnMiddleBelow && assetManager.tilesets[effectiveTileOnMiddleBelow]?.tags.includes('solid_terrain_top')) {
                        tileDefBelowToConsider = assetManager.tilesets[effectiveTileOnMiddleBelow];
                        effectiveIdBelowToConsider = effectiveTileOnMiddleBelow;
                    } else if (effectiveTileOnBottomBelow && assetManager.tilesets[effectiveTileOnBottomBelow]?.tags.includes('solid_terrain_top')) {
                        tileDefBelowToConsider = assetManager.tilesets[effectiveTileOnBottomBelow];
                        effectiveIdBelowToConsider = effectiveTileOnBottomBelow;
                    }

                    if (tileDefBelowToConsider) { // It already implies .tags.includes('solid_terrain_top')
                        displaySprite = tileDefBelowToConsider.sprite; // Original sprite from below
                        displayColor = tileDefBelowToConsider.color;
                        tileNameForTitle = `${tileDefBelowToConsider.name} (from Z-1)`;
                        originalDisplayIdForTitle = effectiveIdBelowToConsider;
                    }
                }
            }

            c.textContent = displaySprite;
            c.style.color = displayColor;

            // --- Onion Skinning Logic ---
            if (onionSkinEnabled) {
                const onionBelowColor = "#505070"; // Darker, slightly blueish tint for below
                const onionAboveColor = "#707050"; // Darker, slightly yellowish tint for above

                // Render Layers Below (only if current cell is effectively empty or transparent on current Z)
                let currentZContentAllowsBelowOnion = (displaySprite === ' '); // Start with: if current display is empty
                if (!currentZContentAllowsBelowOnion && finalTileDefOnCurrentZ && finalTileDefOnCurrentZ.tags &&
                    (finalTileDefOnCurrentZ.tags.includes('transparent_floor') || finalTileDefOnCurrentZ.tags.includes('allows_vision')) &&
                    !appliedSolidTopRule) {
                    currentZContentAllowsBelowOnion = true; // Also allow if current tile is transparent and not a solid_top itself
                }

                if (currentZContentAllowsBelowOnion) {
                    for (let i = 1; i <= onionLayersBelow; i++) {
                        const zToRender = currentEditingZ - i;
                        const zToRenderStr = zToRender.toString();
                        const levelOnion = mapData.levels[zToRenderStr];
                        if (levelOnion && levelOnion.bottom && levelOnion.middle) { // Check if new layers exist
                            let tileOnBottomOnionRaw = layerVisibility.bottom && levelOnion.bottom[y]?.[x] ? levelOnion.bottom[y][x] : "";
                            let tileOnMiddleOnionRaw = layerVisibility.middle && levelOnion.middle[y]?.[x] ? levelOnion.middle[y][x] : "";

                            let effectiveTileOnBottomOnion = (typeof tileOnBottomOnionRaw === 'object' && tileOnBottomOnionRaw !== null && tileOnBottomOnionRaw.tileId !== undefined) ? tileOnBottomOnionRaw.tileId : tileOnBottomOnionRaw;
                            let effectiveTileOnMiddleOnion = (typeof tileOnMiddleOnionRaw === 'object' && tileOnMiddleOnionRaw !== null && tileOnMiddleOnionRaw.tileId !== undefined) ? tileOnMiddleOnionRaw.tileId : tileOnMiddleOnionRaw;

                            let tileIdForOnionDisplay = effectiveTileOnMiddleOnion || effectiveTileOnBottomOnion;
                            let tileDefOnion = assetManager.tilesets[tileIdForOnionDisplay];

                            if (tileIdForOnionDisplay && tileDefOnion) {
                                let spriteToUse = tileDefOnion.sprite;
                                // If it's solid_terrain_top on a layer below, we see its actual sprite (top view)
                                // No change needed to spriteToUse here, it's already tileDefOnion.sprite.
                                c.textContent = spriteToUse;
                                c.style.color = onionBelowColor;
                                tileNameForTitle += ` / ${tileDefOnion.name} (Z${zToRender})`;
                                break;
                            }
                        }
                    }
                }

                // Render Layers Above (these will overwrite if present)
                for (let i = 1; i <= onionLayersAbove; i++) {
                    const zToRender = currentEditingZ + i;
                    const zToRenderStr = zToRender.toString();
                    const levelOnion = mapData.levels[zToRenderStr];
                    if (levelOnion && levelOnion.bottom && levelOnion.middle) { // Check if new layers exist
                        let tileOnBottomOnionRaw = layerVisibility.bottom && levelOnion.bottom[y]?.[x] ? levelOnion.bottom[y][x] : "";
                        let tileOnMiddleOnionRaw = layerVisibility.middle && levelOnion.middle[y]?.[x] ? levelOnion.middle[y][x] : "";

                        let effectiveTileOnBottomOnion = (typeof tileOnBottomOnionRaw === 'object' && tileOnBottomOnionRaw !== null && tileOnBottomOnionRaw.tileId !== undefined) ? tileOnBottomOnionRaw.tileId : tileOnBottomOnionRaw;
                        let effectiveTileOnMiddleOnion = (typeof tileOnMiddleOnionRaw === 'object' && tileOnMiddleOnionRaw !== null && tileOnMiddleOnionRaw.tileId !== undefined) ? tileOnMiddleOnionRaw.tileId : tileOnMiddleOnionRaw;

                        let tileIdForOnionDisplay = effectiveTileOnMiddleOnion || effectiveTileOnBottomOnion;
                        let tileDefOnion = assetManager.tilesets[tileIdForOnionDisplay];

                        if (tileIdForOnionDisplay && tileDefOnion) {
                            let spriteToUse = tileDefOnion.sprite;
                            if (tileDefOnion.tags && tileDefOnion.tags.includes('solid_terrain_top')) {
                                spriteToUse = '▓'; // Show block for solid_terrain_top from above
                            }
                            c.textContent = spriteToUse;
                            c.style.color = onionAboveColor;
                            tileNameForTitle = `${tileDefOnion.name} (Z${zToRender}) (Above)`;
                            // These were for main display, ensure they are not wrongly affecting next iteration's base display
                            // displaySprite = spriteToUse; 
                            // displayColor = onionAboveColor; 
                        }
                    }
                }
            } // Closes: if (onionSkinEnabled)
            // --- End Onion Skinning Logic ---


            // Visually indicate Player Start Position (overrides tile display)
        }
    }
}
            }
// --- End Onion Skinning Logic ---


// Visually indicate Player Start Position (overrides tile display)
if (mapData.startPos && x === mapData.startPos.x && y === mapData.startPos.y && currentEditingZ === mapData.startPos.z) {
    c.textContent = '☻'; // Player sprite
    c.style.color = 'lime'; // Bright color for player start
    c.style.backgroundColor = 'rgba(0, 255, 0, 0.2)'; // Slight background highlight
    c.title = `Player Start (X:${mapData.startPos.x}, Y:${mapData.startPos.y}, Z:${mapData.startPos.z})`;
} else {
    c.title = `${tileNameForTitle} (${originalDisplayIdForTitle || 'Empty'}) at X:${x}, Y:${y}, Z:${currentEditingZ}`;
}


// stamp preview (operates on currentEditingZ)
if (currentTool === "stamp" && stampData3D && previewPos) {
    const dx = x - previewPos.x;
    const dy = y - previewPos.y;
    // For 3D stamp, preview the slice corresponding to the current Z level
    // relative to where the stamp would start if previewPos was the anchor.
    // This preview is simplified to show only one layer of the stamp's current Z-slice.
    const stampZSliceIndex = currentEditingZ - previewPos.z; // This interpretation is if previewPos also had a Z.
    // However, previewPos is just {x,y} from mousemove on current grid.
    // So, we preview the stamp's zi=0 slice (its base)

    if (dx >= 0 && dy >= 0 && dx < stampData3D.w && dy < stampData3D.h && stampData3D.levels[0]) { // Preview base layer of stamp
        let tileIdToPreview = "";
        // Try to get a prominent layer for preview, e.g., building or landscape from the stamp's base (zi=0)
        if (stampData3D.levels[0]["building"] && stampData3D.levels[0]["building"][dy]?.[dx]) {
            tileIdToPreview = stampData3D.levels[0]["building"][dy][dx];
        } else if (stampData3D.levels[0]["landscape"] && stampData3D.levels[0]["landscape"][dy]?.[dx]) {
            tileIdToPreview = stampData3D.levels[0]["landscape"][dy][dx];
        } else if (stampData3D.levels[0]["item"] && stampData3D.levels[0]["item"][dy]?.[dx]) {
            tileIdToPreview = stampData3D.levels[0]["item"][dy][dx];
        } else if (stampData3D.levels[0]["roof"] && stampData3D.levels[0]["roof"][dy]?.[dx]) {
            tileIdToPreview = stampData3D.levels[0]["roof"][dy][dx];
        }

        // tileIdToPreview might be an object {tileId: "..."} or a string
        const effectivePreviewId = (typeof tileIdToPreview === 'object' && tileIdToPreview !== null && tileIdToPreview.tileId !== undefined)
            ? tileIdToPreview.tileId
            : tileIdToPreview;

        if (effectivePreviewId && effectivePreviewId !== "") {
            const stampTileDef = assetManager.tilesets[effectivePreviewId];
            if (stampTileDef) {
                c.textContent = stampTileDef.sprite;
                c.style.color = stampTileDef.color;
                c.classList.add("preview");
            } else {
                c.textContent = '!'; // Def not found
                c.style.color = 'orange';
                c.classList.add("preview");
            }
        } else if (tileIdToPreview === "") { // Explicitly empty in stamp
            // c.textContent = ' '; // Show empty from stamp
            // c.classList.add("preview"); // Optional: style empty preview
        }
    }
}

c.onmousedown = handleMouseDown;
c.onmouseup = handleMouseUp;
gridContainer.appendChild(c);
        }
    }

// Draw portals on top, only if portal's Z matches currentEditingZ
if (mapData.portals) {
    mapData.portals.forEach(portal => {
        if (portal.z === currentEditingZ) { // Only draw portals on the current Z-level
            const cell = gridContainer.querySelector(`.cell[data-x='${portal.x}'][data-y='${portal.y}'][data-z='${currentEditingZ}']`);
            if (cell) {
                const portalMarker = document.createElement('div');
                portalMarker.textContent = '▓';
                portalMarker.style.color = 'teal';
                portalMarker.style.position = 'absolute'; // Position over the tile content
                portalMarker.style.pointerEvents = 'none'; // Clicks should go to the cell

                // Basic highlight for selected portal - can be enhanced with CSS class
                if (selectedPortal && selectedPortal.id === portal.id) {
                    cell.style.outline = '2px solid cyan'; // Example highlight
                } else {
                    cell.style.outline = ''; // Remove outline if not selected
                }
                cell.appendChild(portalMarker);
            } // Closing brace for if (cell)
        } // Closing brace for if (portal.z === currentEditingZ)
    }); // Closing brace for mapData.portals.forEach
} // Closing brace for if (mapData.portals)
}

// --- UI Update Functions ---

function updateSelectedPortalInfo() {
    const portalConfigDiv = document.getElementById('portalConfigControls');
    const selectedInfoDiv = document.getElementById('selectedPortalInfo');
    const removeBtn = document.getElementById('removePortalBtn');
    const editingIdSpan = document.getElementById('editingPortalId');
    const editingPosSpan = document.getElementById('editingPortalPos');
    const targetMapInput = document.getElementById('portalTargetMapId');
    const targetXInput = document.getElementById('portalTargetX');
    const targetYInput = document.getElementById('portalTargetY');
    const targetZInput = document.getElementById('portalTargetZ'); // New Z input
    const portalNameInput = document.getElementById('portalNameInput'); // New Name input


    if (selectedPortal) {
        // Display current Z of the portal along with X, Y
        selectedInfoDiv.textContent = `Selected Portal: ${selectedPortal.name || selectedPortal.id} at (${selectedPortal.x}, ${selectedPortal.y}, Z:${selectedPortal.z})`;
        portalConfigDiv.style.display = 'block';
        removeBtn.style.display = 'block';

        editingIdSpan.textContent = selectedPortal.id;
        editingPosSpan.textContent = `${selectedPortal.x}, ${selectedPortal.y}, Z:${selectedPortal.z}`;
        targetMapInput.value = selectedPortal.targetMapId || '';
        targetXInput.value = selectedPortal.targetX !== undefined ? selectedPortal.targetX : '';
        targetYInput.value = selectedPortal.targetY !== undefined ? selectedPortal.targetY : '';
        targetZInput.value = selectedPortal.targetZ !== undefined ? selectedPortal.targetZ : 0; // Default target Z to 0
        portalNameInput.value = selectedPortal.name || '';
    } else {
        selectedInfoDiv.textContent = "Selected Portal: None";
        portalConfigDiv.style.display = 'none';
        removeBtn.style.display = 'none';
        // Clear inputs when no portal is selected
        editingIdSpan.textContent = "N/A";
        editingPosSpan.textContent = "N/A";
        targetMapInput.value = '';
        targetXInput.value = '';
        targetYInput.value = '';
        targetZInput.value = 0;
        portalNameInput.value = '';
    }
}


// Updates the lock properties UI (checkbox, DC input) based on the selected tile.
// Called by updateContainerInventoryUI.
function updateLockPropertiesUI() {
    const lockControlsDiv = document.getElementById('lockControls');
    const isLockedCheckbox = document.getElementById('isLockedCheckbox');
    const lockDifficultyInput = document.getElementById('lockDifficultyInput');

    if (!selectedTileForInventory) {
        lockControlsDiv.style.display = 'none';
        return;
    }

    const { x, y, z, layerName } = selectedTileForInventory; // Include z
    const zStr = z.toString();
    ensureLayersForZ(z); // Ensure this Z-level and its layers exist

    let tileData = mapData.levels[zStr]?.[layerName]?.[y]?.[x];
    let tileId = (typeof tileData === 'object' && tileData !== null && tileData.tileId !== undefined) ? tileData.tileId : tileData;

    const tileDef = assetManager.tilesets[tileId];
    const isLockable = tileDef && tileDef.tags &&
        (tileDef.tags.includes('door') || tileDef.tags.includes('window') || tileDef.tags.includes('container'));

    if (!isLockable) {
        lockControlsDiv.style.display = 'none';
        return;
    }
    lockControlsDiv.style.display = 'block';

    if (typeof tileData === 'object' && tileData !== null) {
        isLockedCheckbox.checked = tileData.isLocked || false;
        lockDifficultyInput.value = tileData.lockDC !== undefined ? tileData.lockDC : 10;
        lockDifficultyInput.disabled = !isLockedCheckbox.checked;
    } else { // Is a string tileId, implies not locked and default DC or needs conversion
        isLockedCheckbox.checked = false;
        lockDifficultyInput.value = 10; // Default DC for a newly lockable item
        lockDifficultyInput.disabled = true;
    }
}

function updateTilePropertyEditorUI() {
    const editorDiv = document.getElementById('tilePropertyEditorControls');
    const baseIdSpan = document.getElementById('selectedTileBaseId');
    const baseNameSpan = document.getElementById('selectedTileBaseName');
    const baseTagsSpan = document.getElementById('selectedTileBaseTags');
    const coordsSpan = document.getElementById('selectedTileCoords');
    const instanceNameInput = document.getElementById('tileInstanceName');
    const instanceTagsInput = document.getElementById('tileInstanceTags');

    if (!selectedGenericTile) {
        editorDiv.style.display = 'none';
        return;
    }

    editorDiv.style.display = 'block';
    const { x, y, z, layerName } = selectedGenericTile; // Include z
    coordsSpan.textContent = `${x}, ${y}, Z:${z} (Layer: ${layerName})`;

    const zStr = z.toString();
    ensureLayersForZ(z);

    let tileData = mapData.levels[zStr]?.[layerName]?.[y]?.[x];
    let baseTileId = '';
    let instanceName = '';
    let instanceTagsArray = [];

    if (typeof tileData === 'object' && tileData !== null && tileData.tileId !== undefined) {
        baseTileId = tileData.tileId;
        instanceName = tileData.instanceName || '';
        instanceTagsArray = tileData.instanceTags || [];
    } else if (typeof tileData === 'string' && tileData !== "") {
        baseTileId = tileData;
        instanceName = '';
        instanceTagsArray = [];
    } else {
        editorDiv.style.display = 'none';
        baseIdSpan.textContent = 'Error: Invalid tile data';
        baseNameSpan.textContent = 'N/A';
        baseTagsSpan.textContent = 'N/A';
        instanceNameInput.value = '';
        instanceTagsInput.value = '';
        return;
    }

    baseIdSpan.textContent = baseTileId;
    const baseTileDef = assetManager.tilesets[baseTileId];

    if (baseTileDef) {
        baseNameSpan.textContent = baseTileDef.name || baseTileId;
        baseTagsSpan.textContent = (baseTileDef.tags || []).join(', ') || 'No base tags';
    } else {
        baseNameSpan.textContent = `(Definition not found for ${baseTileId})`;
        baseTagsSpan.textContent = 'N/A';
    }

    instanceNameInput.value = instanceName;
    instanceTagsInput.value = instanceTagsArray.join(', ');
}

function removeItemFromContainer(itemIndex) {
    if (!selectedTileForInventory) return;
    const { x, y, z, layerName } = selectedTileForInventory; // Include z
    const zStr = z.toString();
    ensureLayersForZ(z);
    let tileData = mapData.levels[zStr]?.[layerName]?.[y]?.[x];

    if (typeof tileData === 'object' && tileData !== null && tileData.containerInventory) {
        snapshot();
        tileData.containerInventory.splice(itemIndex, 1);
        updateContainerInventoryUI();
    }
}

// --- 8) Tools ---
// Drawing tools now need to operate on mapData.levels[currentEditingZ.toString()][currentLayerType]
function floodFill(layerType, x, y, z, oldTileIdFromClick, newTileBrushId) { // Added z, oldTileIdFromClick, newTileBrushId
    const zStr = z.toString();
    ensureLayersForZ(z);
    const gridLayerToFill = mapData.levels[zStr]?.[layerType]; // This is the layer we are modifying
    if (!gridLayerToFill) {
        console.error(`Flood fill: Layer ${layerType} does not exist for Z-level ${zStr}.`);
        return;
    }

    // Determine the effective ID of the tile we are trying to replace (clicked tile)
    // oldTileIdFromClick can be a string or an object {tileId: "...", ...}
    const effectiveOldId = (typeof oldTileIdFromClick === 'object' && oldTileIdFromClick !== null && oldTileIdFromClick.tileId !== undefined)
        ? oldTileIdFromClick.tileId
        : oldTileIdFromClick;

    // Determine the effective ID of the new tile (brush)
    // newTileBrushId is always a string ID from the palette.
    // If newTileBrushId is "", it's the eraser.
    const effectiveNewId = newTileBrushId;


    if (effectiveOldId === effectiveNewId && effectiveOldId !== "") return; // Don't fill if old and new are same (unless erasing)
    // If effectiveOldId is "" (empty space) and new is also "" (eraser), do nothing.
    if (effectiveOldId === "" && effectiveNewId === "") return;


    const stack = [[x, y]];
    snapshot(); // Take snapshot before starting modifications

    while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= gridWidth || cy >= gridHeight) continue;

        const currentTileDataInGrid = gridLayerToFill[cy][cx];
        const effectiveCurrentIdInGrid = (typeof currentTileDataInGrid === 'object' && currentTileDataInGrid !== null && currentTileDataInGrid.tileId !== undefined)
            ? currentTileDataInGrid.tileId
            : currentTileDataInGrid;

        if (effectiveCurrentIdInGrid !== effectiveOldId) continue;

        // placeTile will handle putting the newTileBrushId on its correct layer.
        // This means flood fill on 'landscape' with 'wall' brush will replace 'grass' (on landscape)
        // with 'wall' (on building layer). This is the current behavior of placeTile.
        placeTile(cx, cy, z, newTileBrushId);

        // Add neighbors to stack only if they are on the same layerType that we are filling.
        // This ensures the 2D fill stays within the original layer of the clicked tile.
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    renderMergedGrid(); // Re-render once at the end
}

function floodFill3D(startX, startY, startZ, oldTileIdFromClick, newTileBrushId) {
    snapshot(); // Take snapshot before starting modifications

    const effectiveOldId = (typeof oldTileIdFromClick === 'object' && oldTileIdFromClick !== null && oldTileIdFromClick.tileId !== undefined)
        ? oldTileIdFromClick.tileId
        : oldTileIdFromClick;

    const effectiveNewId = newTileBrushId;

    // If trying to fill with the same tile (and it's not eraser on empty, or eraser on something)
    if (effectiveOldId === effectiveNewId && effectiveOldId !== "") return;
    if (effectiveOldId === "" && effectiveNewId === "") return; // Eraser on already empty

    const queue = [{ x: startX, y: startY, z: startZ }];
    const visited = new Set();
    visited.add(`${startX},${startY},${startZ}`);

    // const layersToSearchForOldTile = ["roof", "item", "building", "landscape"]; // Old way
    const newLayersToCheck = ["middle", "bottom"]; // Check middle first, then bottom

    while (queue.length > 0) {
        const { x, y, z } = queue.shift();

        // Check if z level exists, if not, skip (don't create new z-levels with fill)
        const zStr = z.toString();
        if (!mapData.levels[zStr]) {
            continue;
        }
        ensureLayersForZ(z); // Ensure all layer arrays exist for this Z, even if empty

        let tileReplacedOnThisCoordinate = false;
        // In 3D fill, we are looking for effectiveOldId on ANY layer to replace.
        // placeTile will then put the newTileBrushId on its correct layer.
        // If effectiveOldId is "" (empty), we are filling "air".
        if (effectiveOldId === "") { // Filling "air"
            let isCellEmpty = true;
            for (const layerName of newLayersToCheck) { // Check new bottom, middle
                const tileData = mapData.levels[zStr]?.[layerName]?.[y]?.[x];
                const idInGrid = (typeof tileData === 'object' && tileData !== null && tileData.tileId !== undefined)
                    ? tileData.tileId : tileData;
                if (idInGrid && idInGrid !== "") {
                    isCellEmpty = false;
                    break;
                }
            }
            if (isCellEmpty) {
                placeTile(x, y, z, newTileBrushId); // placeTile will put it on its correct new layer
                tileReplacedOnThisCoordinate = true;
            }
        } else { // Replacing a specific tile ID
            // Iterate new bottom, middle. If effectiveOldId found on either, replace.
            // placeTile handles clearing both layers if newTileBrushId is eraser,
            // or placing on the correct new layer.
            for (const layerName of newLayersToCheck) {
                const tileDataCurrent = mapData.levels[zStr]?.[layerName]?.[y]?.[x];
                const idCurrent = (typeof tileDataCurrent === 'object' && tileDataCurrent !== null && tileDataCurrent.tileId !== undefined)
                    ? tileDataCurrent.tileId : tileDataCurrent;

                if (idCurrent === effectiveOldId) {
                    placeTile(x, y, z, newTileBrushId);
                    tileReplacedOnThisCoordinate = true;
                    break; // Found and replaced on one layer, enough for this coord
                }
            }
        }

        // If a replacement happened OR we are filling air (and implicitly placed a tile if the cell was empty)
        if (tileReplacedOnThisCoordinate) {
            const neighbors = [
                { dx: 1, dy: 0, dz: 0 }, { dx: -1, dy: 0, dz: 0 },
                { dx: 0, dy: 1, dz: 0 }, { dx: 0, dy: -1, dz: 0 },
                { dx: 0, dy: 0, dz: 1 }, { dx: 0, dy: 0, dz: -1 }
            ];

            for (const n of neighbors) {
                const nx = x + n.dx;
                const ny = y + n.dy;
                const nz = z + n.dz;
                const neighborCoordStr = `${nx},${ny},${nz}`;

                if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight && mapData.levels[nz.toString()] && !visited.has(neighborCoordStr)) {
                    let neighborMatchesCriteria = false;
                    const nzStr = nz.toString();
                    ensureLayersForZ(nz);

                    if (effectiveOldId === "") {
                        let isNeighborAir = true;
                        for (const layerName of layersToSearchForOldTile) {
                            const tileDataNeighbor = mapData.levels[nzStr]?.[layerName]?.[ny]?.[nx];
                            const idInGridNeighbor = (typeof tileDataNeighbor === 'object' && tileDataNeighbor !== null && tileDataNeighbor.tileId !== undefined)
                                ? tileDataNeighbor.tileId
                                : tileDataNeighbor;
                            if (idInGridNeighbor && idInGridNeighbor !== "") {
                                isNeighborAir = false;
                                break;
                            }
                        }
                        if (isNeighborAir) neighborMatchesCriteria = true;
                    } else {
                        for (const layerName of layersToSearchForOldTile) {
                            const tileDataNeighbor = mapData.levels[nzStr]?.[layerName]?.[ny]?.[nx];
                            const idInGridNeighbor = (typeof tileDataNeighbor === 'object' && tileDataNeighbor !== null && tileDataNeighbor.tileId !== undefined)
                                ? tileDataNeighbor.tileId
                                : tileDataNeighbor;
                            if (idInGridNeighbor === effectiveOldId) {
                                neighborMatchesCriteria = true;
                                break;
                            }
                        }
                    }

                    if (neighborMatchesCriteria) {
                        visited.add(neighborCoordStr);
                        queue.push({ x: nx, y: ny, z: nz });
                    }
                }
            }
        }
    }
    renderMergedGrid();
}

function drawLine(layerType, x0, y0, z, x1, y1, tileId) { // Added z
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy;
    snapshot();
    while (true) {
        placeTile(x0, y0, z, tileId); // placeTile now needs z
        if (x0 === x1 && y0 === y1) break;
        let e2 = err * 2;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
    renderMergedGrid();
}

// Modified drawRect to handle 3D depth
// layerType parameter is removed as placeTile determines the layer
function drawRect(x0, y0, startZ, x1, y1, depth, tileId) {
    const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);

    snapshot();

    for (let i = 0; i < depth; i++) {
        const currentActualZ = startZ + i; // Assumes depth is positive, fills upwards
        // For downward fill, UI/logic for negative depth needed, or a start/end Z.
        // For now, positive depth starting from currentEditingZ upwards.

        ensureLayersForZ(currentActualZ); // Create Z-level if it doesn't exist

        for (let yy = minY; yy <= maxY; yy++) {
            for (let xx = minX; xx <= maxX; xx++) {
                placeTile(xx, yy, currentActualZ, tileId);
            }
        }
    }
    renderMergedGrid();
}

// --- Mouse Event Handler for Grid Interaction ---
function handleMouseDown(e) {
    const x = +e.target.dataset.x, y = +e.target.dataset.y;
    const z = currentEditingZ; // Use current editing Z for all actions
    const zStr = z.toString();
    ensureLayersForZ(z); // Ensure layers for this Z exist

    if (currentTool === "playerStart") {
        snapshot();
        mapData.startPos = { x: x, y: y, z: z };
        updatePlayerStartDisplay();
        renderMergedGrid();
        // Optional: Deactivate player start tool after one use
        // currentTool = "brush"; // Revert to a default tool
        // document.querySelectorAll(".toolBtn").forEach(b => b.classList.toggle("selected", b.dataset.tool === currentTool));
        return; // Player start set, no further tile painting needed from this click
    } else if (currentTool === "portal") {
        snapshot();
        const existingPortal = mapData.portals.find(p => p.x === x && p.y === y && p.z === z);
        if (existingPortal) {
            selectedPortal = existingPortal;
            console.log(`Portal tool: Selected existing Portal ID: ${selectedPortal.id} at Z:${selectedPortal.z}`);
        } else {
            const newPortal = {
                id: `portal_${mapData.portals.length > 0 ? Math.max(...mapData.portals.map(p => { const idNum = parseInt(p.id.split('_')[1]); return isNaN(idNum) ? -1 : idNum; })) + 1 : 0}`,
                x: x, y: y, z: z,
                targetMapId: '', targetX: 0, targetY: 0, targetZ: 0, name: ''
            };
            mapData.portals.push(newPortal);
            selectedPortal = newPortal;
            console.log(`Portal tool: Added new Portal ID: ${newPortal.id} at ${x},${y}, Z:${z}`);
        }
        // Clear other selections
        selectedTileForInventory = null; updateContainerInventoryUI();
        selectedGenericTile = null; updateTilePropertyEditorUI();
        selectedNpc = null; if (typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo();

        updateSelectedPortalInfo();
        renderMergedGrid();
        return; // Portal added/selected, no further tile painting

    } else if (currentTool === "selectInspect") {
        if (window.addingNpcModeState) {
            window.addingNpcModeState = false;
            const toggleNpcBtn = document.getElementById('toggleAddNpcModeBtn');
            if (toggleNpcBtn) toggleNpcBtn.textContent = "Add NPC";
        }
        // addingPortalMode was removed, so this check is no longer needed here.
        // if (addingPortalMode) {
        //     addingPortalMode = false;
        //     document.getElementById('toggleAddPortalModeBtn').textContent = "Add Portal";
        // }

        // Portals are global, check if a portal exists at x,y on currentEditingZ
        const clickedPortal = mapData.portals.find(p => p.x === x && p.y === y && p.z === z);
        if (clickedPortal) {
            selectedPortal = clickedPortal;
            selectedNpc = null; // Assuming selectedNpc is a global for map maker
            selectedTileForInventory = null;
            selectedGenericTile = null;
            updateSelectedPortalInfo();
            if (typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo();
            updateContainerInventoryUI();
            updateTilePropertyEditorUI();
            renderMergedGrid();
            console.log(`SelectTool: Selected Portal ID: ${selectedPortal.id} at Z:${selectedPortal.z}`);
            return;
        }

        // NPCs are global, check if an NPC exists at x,y on currentEditingZ
        const clickedNpc = mapData.npcs.find(npc => npc.mapPos && npc.mapPos.x === x && npc.mapPos.y === y && npc.mapPos.z === z);
        if (clickedNpc) {
            selectedNpc = clickedNpc; // Assuming selectedNpc for map maker state
            selectedPortal = null;
            selectedTileForInventory = null;
            selectedGenericTile = null;
            if (typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo();
            updateSelectedPortalInfo();
            updateContainerInventoryUI();
            updateTilePropertyEditorUI();
            const removeNpcBtn = document.getElementById('removeNpcBtn'); // Assuming this ID
            if (removeNpcBtn) removeNpcBtn.disabled = false;
            renderMergedGrid();
            console.log(`SelectTool: Selected NPC ID: ${selectedNpc.id} at Z:${selectedNpc.mapPos.z}`);
            return;
        }

        // For selectInspect, determine the topmost tile and its actual layer
        let actualLayerOfSelectedTile = null;
        let tileDataUnderCursor = null;

        if (mapData.levels[zStr]?.middle?.[y]?.[x] && mapData.levels[zStr]?.middle?.[y]?.[x] !== "") {
            tileDataUnderCursor = mapData.levels[zStr].middle[y][x];
            actualLayerOfSelectedTile = "middle";
        } else if (mapData.levels[zStr]?.bottom?.[y]?.[x] && mapData.levels[zStr]?.bottom?.[y]?.[x] !== "") {
            tileDataUnderCursor = mapData.levels[zStr].bottom[y][x];
            actualLayerOfSelectedTile = "bottom";
        }

        let baseTileId = (typeof tileDataUnderCursor === 'object' && tileDataUnderCursor !== null && tileDataUnderCursor.tileId !== undefined) ? tileDataUnderCursor.tileId : tileDataUnderCursor;
        const tileDef = assetManager.tilesets[baseTileId];

        if (tileDef && actualLayerOfSelectedTile && tileDef.tags && (tileDef.tags.includes('container') || tileDef.tags.includes('door') || tileDef.tags.includes('window'))) {
            selectedTileForInventory = { x, y, z: currentEditingZ, layerName: actualLayerOfSelectedTile };
            selectedGenericTile = { x, y, z: currentEditingZ, layerName: actualLayerOfSelectedTile };
            if (selectedPortal) { selectedPortal = null; updateSelectedPortalInfo(); }
            if (selectedNpc) { /* clear selectedNpc and update its UI */ }
            updateContainerInventoryUI();
            updateTilePropertyEditorUI();
            renderMergedGrid();
            return;
        }

        if (baseTileId && baseTileId !== "") {
            selectedGenericTile = { x, y, z, layerName: currentLayerType };
        } else {
            selectedGenericTile = null;
        }
        if (selectedPortal) { selectedPortal = null; updateSelectedPortalInfo(); }
        if (selectedNpc) { /* clear selectedNpc and update its UI */ }
        if (selectedTileForInventory) { selectedTileForInventory = null; updateContainerInventoryUI(); }
        updateTilePropertyEditorUI();
        renderMergedGrid();
        return;
    }

    if (addingPortalMode) {
        snapshot();
        const newPortal = {
            id: `portal_${mapData.portals.length > 0 ? Math.max(...mapData.portals.map(p => parseInt(p.id.split('_')[1]))) + 1 : 0}`,
            x: x, y: y, z: currentEditingZ, // Set portal's Z to current editing Z
            targetMapId: '', targetX: 0, targetY: 0, targetZ: 0, name: ''
        };
        mapData.portals.push(newPortal);
        selectedPortal = newPortal;
        addingPortalMode = false;
        document.getElementById('toggleAddPortalModeBtn').textContent = "Add Portal";
        updateSelectedPortalInfo();
        renderMergedGrid();
        console.log(`Portal ${newPortal.id} added at ${x},${y}, Z:${currentEditingZ}`);
        return;
    }

    // If a portal was selected, but user clicked elsewhere (not on another portal on this Z)
    if (selectedPortal && !(mapData.portals.find(p => p.x === x && p.y === y && p.z === currentEditingZ))) {
        selectedPortal = null;
        updateSelectedPortalInfo();
    }
    // Similar logic for selectedNpc if applicable

    // Tile painting / special tile interaction logic (needs to use currentEditingZ)
    let tileIdAtClick = mapData.levels[zStr]?.[currentLayerType]?.[y]?.[x];
    let effectiveTileId = typeof tileIdAtClick === 'object' && tileIdAtClick !== null && tileIdAtClick.tileId !== undefined ? tileIdAtClick.tileId : tileIdAtClick;
    const tileDefAtClick = assetManager.tilesets[effectiveTileId];

    if (tileDefAtClick && tileDefAtClick.tags && (tileDefAtClick.tags.includes('container') || tileDefAtClick.tags.includes('door') || tileDefAtClick.tags.includes('window'))) {
        selectedTileForInventory = { x, y, z: currentEditingZ, layerName: currentLayerType };
        if (selectedPortal) { selectedPortal = null; updateSelectedPortalInfo(); }
    } else {
        selectedTileForInventory = null;
    }
    updateContainerInventoryUI();

    if (currentTool === "brush") {
        snapshot();
        const oldTileData = JSON.parse(JSON.stringify(mapData.levels[zStr]?.[currentLayerType]?.[y]?.[x] || null));
        placeTile(x, y, currentEditingZ, currentTileId); // Use currentEditingZ

        const newTileIdPlaced_str = mapData.levels[zStr]?.[currentLayerType]?.[y]?.[x]; // This is now a string ID
        const newTileDef = assetManager.tilesets[newTileIdPlaced_str];

        if (newTileDef && newTileDef.tags && (newTileDef.tags.includes('container') || newTileDef.tags.includes('door') || newTileDef.tags.includes('window'))) {
            let newObjectData = { tileId: newTileIdPlaced_str };
            // ... (carry over logic for inventory/lock state if oldTileData was same type) ...
            mapData.levels[zStr][currentLayerType][y][x] = newObjectData;
            selectedTileForInventory = { x, y, z: currentEditingZ, layerName: currentLayerType };
        } else {
            selectedTileForInventory = null;
        }
        updateContainerInventoryUI();
        renderMergedGrid();
    } else if (currentTool === "fill") {
        snapshot();
        // Determine the actual layer of the clicked tile for 2D fill
        let clickedLayerType = null;
        let clickedTileId = null;
        const layersToSearch = ["roof", "item", "building", "landscape"]; // Order of precedence for what's "on top"

        for (const layerName of layersToSearch) {
            const tileOnLayer = mapData.levels[zStr]?.[layerName]?.[y]?.[x];
            if (tileOnLayer && tileOnLayer !== "") {
                // Handle if tileOnLayer is an object (e.g. container)
                const baseTileId = (typeof tileOnLayer === 'object' && tileOnLayer !== null && tileOnLayer.tileId !== undefined)
                    ? tileOnLayer.tileId
                    : tileOnLayer;
                if (baseTileId && baseTileId !== "") {
                    clickedLayerType = layerName;
                    clickedTileId = tileOnLayer; // Use the actual data (string or object) for oldTileId in floodFill
                    break;
                }
            }
        }

        if (clickedLayerType) {
            // Pass the determined layer of the clicked tile to floodFill
            // The `oldTileId` for floodFill will be `clickedTileId` (which can be string or object)
            // `currentTileId` is the new tile to fill with (which is always a string ID from palette)
            floodFill(clickedLayerType, x, y, currentEditingZ, clickedTileId, currentTileId);
        } else {
            // Clicked on an empty area, perhaps fill the default landscape if currentTileId is a landscape tile?
            // Or do nothing. For now, do nothing if clicked on completely empty.
            console.log("Fill tool clicked on an empty area on all layers. No action taken.");
        }
        selectedTileForInventory = null;
        updateContainerInventoryUI();
        renderMergedGrid();
    } else if (currentTool === "fill3d") {
        snapshot();
        // Determine the actual layer and tile of the clicked cell for 3D fill starting point
        let clickedTileDataFor3DStart = null; // This will be string or object, or "" if truly empty
        const layersToSearch = ["roof", "item", "building", "landscape"];
        let foundTopTile = false;

        for (const layerName of layersToSearch) {
            const tileOnLayer = mapData.levels[zStr]?.[layerName]?.[y]?.[x];
            if (tileOnLayer && tileOnLayer !== "") {
                const baseId = (typeof tileOnLayer === 'object' && tileOnLayer !== null && tileOnLayer.tileId !== undefined)
                    ? tileOnLayer.tileId
                    : tileOnLayer;
                if (baseId && baseId !== "") {
                    clickedTileDataFor3DStart = tileOnLayer; // Store the actual data (string or object)
                    foundTopTile = true;
                    break;
                }
            }
        }
        if (!foundTopTile) { // If loop finishes and nothing found, it's empty "air"
            clickedTileDataFor3DStart = "";
        }

        floodFill3D(x, y, currentEditingZ, clickedTileDataFor3DStart, currentTileId);
        selectedTileForInventory = null;
        updateContainerInventoryUI();
        renderMergedGrid();

    } else if (currentTool === "line" || currentTool === "rect" || currentTool === "stamp") {
        if (dragStart === null) {
            dragStart = { x, y }; // Z is implicit from currentEditingZ for these tools
            selectedTileForInventory = null;
            updateContainerInventoryUI();
        }
    } else {
        snapshot();
    }
}

function handleMouseUp(e) {
    const x = +e.target.dataset.x, y = +e.target.dataset.y;
    const z = currentEditingZ; // Use current Z for drawing operations

    if (currentTool === "line" && dragStart) {
        // Line tool remains 2D for now, uses currentEditingZ (z)
        // It still has layerType in its signature, which is becoming obsolete.
        // For now, pass the global currentLayerType, though placeTile ignores it.
        drawLine(currentLayerType, dragStart.x, dragStart.y, z, x, y, currentTileId);
    } else if (currentTool === "rect" && dragStart) {
        const depthInput = document.getElementById("rect3dDepthInput");
        let depth = 1;
        if (depthInput) {
            depth = parseInt(depthInput.value, 10);
            if (isNaN(depth) || depth < 1) {
                depth = 1; // Default to 1 if invalid input
                depthInput.value = 1; // Correct UI
            }
        }
        // z is currentEditingZ (the starting Z for the rectangle)
        drawRect(dragStart.x, dragStart.y, z, x, y, depth, currentTileId);
    } else if (currentTool === "stamp") {
        const stampDepthInput = document.getElementById("rect3dDepthInput"); // Reuse depth input
        let stampCopyDepth = 1;
        if (stampDepthInput) {
            stampCopyDepth = parseInt(stampDepthInput.value, 10);
            if (isNaN(stampCopyDepth) || stampCopyDepth < 1) stampCopyDepth = 1;
        }

        if (!stampData3D && dragStart) { // Define 3D stamp
            const w = Math.abs(x - dragStart.x) + 1;
            const h = Math.abs(y - dragStart.y) + 1;
            const x0 = Math.min(x, dragStart.x);
            const y0 = Math.min(y, dragStart.y);
            const startStampZ = z; // z is currentEditingZ

            stampData3D = { w, h, depth: stampCopyDepth, levels: {} };
            const layerNamesToCopy = ["bottom", "middle"]; // Copy from new layers

            for (let zi = 0; zi < stampCopyDepth; zi++) {
                const actualZ = startStampZ + zi;
                const actualZStr = actualZ.toString();
                if (mapData.levels[actualZStr]) {
                    stampData3D.levels[zi] = {}; // Store relative to stamp's own Z-index
                    layerNamesToCopy.forEach(layerType => {
                        const sourceLayerGrid = mapData.levels[actualZStr][layerType];
                        if (sourceLayerGrid) {
                            stampData3D.levels[zi][layerType] = [];
                            for (let yy = 0; yy < h; yy++) {
                                stampData3D.levels[zi][layerType][yy] = [];
                                for (let xx = 0; xx < w; xx++) {
                                    // Deep copy tile data if it's an object
                                    const tileData = sourceLayerGrid[y0 + yy]?.[x0 + xx];
                                    stampData3D.levels[zi][layerType][yy][xx] = tileData ? JSON.parse(JSON.stringify(tileData)) : "";
                                }
                            }
                        }
                    });
                }
            }
            console.log("3D Stamp defined:", stampData3D);
            // Keep stampData3D defined to allow multiple pastes.
            // User can clear it by re-selecting stamp tool or another method later.
        } else if (stampData3D) { // Apply 3D stamp
            snapshot();
            const pasteBaseX = x;
            const pasteBaseY = y;
            const pasteBaseZ = z; // Paste starting at currentEditingZ

            for (let zi = 0; zi < stampData3D.depth; zi++) {
                const targetZ = pasteBaseZ + zi;
                ensureLayersForZ(targetZ); // Ensure target Z-level exists

                if (stampData3D.levels[zi]) {
                    for (const layerType in stampData3D.levels[zi]) {
                        const stampedLayerData = stampData3D.levels[zi][layerType];
                        for (let yy = 0; yy < stampData3D.h; yy++) {
                            for (let xx = 0; xx < stampData3D.w; xx++) {
                                const tileToPlace = stampedLayerData[yy]?.[xx];
                                if (tileToPlace !== undefined && tileToPlace !== null) { // Check can be just tileToPlace if "" is falsy enough
                                    // placeTile will determine the final layer for tileToPlace based on its tags,
                                    // but we are providing the specific tile data (string or object) from the stamp.
                                    // This might mean a tile stamped from 'landscape' layer could end up on 'building'
                                    // if its definition changed or if placeTile is very strict.
                                    // However, since we are placing the *exact data* from the stamp,
                                    // placeTile should ideally respect it if it's an object.
                                    // If tileToPlace is just an ID, getLayerForTile in placeTile will run.
                                    placeTile(pasteBaseX + xx, pasteBaseY + yy, targetZ, JSON.parse(JSON.stringify(tileToPlace)));
                                }
                            }
                        }
                    }
                }
            }
        }
        selectedTileForInventory = null;
        updateContainerInventoryUI();
    }
    dragStart = null;
    renderMergedGrid();
}

// --- 9) Keyboard shortcuts ---
window.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
    else if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); }
    else if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
            case "b": currentTool = "brush"; break;
            case "f": currentTool = "fill"; break;
            case "l": currentTool = "line"; break;
            case "r": currentTool = "rect"; break;
            case "s": currentTool = "stamp"; break;
        }
        document.querySelectorAll(".toolBtn")
            .forEach(btn => btn.classList.toggle("selected", btn.dataset.tool === currentTool));
    }
});

// --- 10) UI wiring & Export/Load ---
document.getElementById("resizeBtn").onclick = () => {
    const w = parseInt(document.getElementById("inputWidth").value, 10);
    const h = parseInt(document.getElementById("inputHeight").value, 10);
    if (w > 0 && h > 0) {
        gridWidth = w; gridHeight = h;
        document.documentElement.style.setProperty("--cols", gridWidth);
        initMap();
    }
};
document.querySelectorAll(".toolBtn").forEach(btn => {
    btn.onclick = () => {
        selectedTileForInventory = null;
        updateContainerInventoryUI();

        selectedPortal = null;
        // addingPortalMode = false; // This is now handled below
        // document.getElementById('toggleAddPortalModeBtn').textContent = "Add Portal"; // Handled below
        updateSelectedPortalInfo(); // Clears UI if a portal was selected

        // selectedNpc = null; // Placeholder, should be handled by updateSelectedNpcInfo if called
        // if (typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo(); // Clears NPC UI

        // Deactivate any "add" modes and clear selections when a new tool is selected
        // addingPortalMode is removed. If a portal was selected, and the new tool is not 'portal' or 'selectInspect', clear selection.
        if (selectedPortal && btn.dataset.tool !== "portal" && btn.dataset.tool !== "selectInspect") {
            selectedPortal = null;
            updateSelectedPortalInfo(); // Clear portal config UI
        }

        if (window.addingNpcModeState) { // Placeholder for actual NPC add mode state variable
            window.addingNpcModeState = false; // This assumes addingNpcModeState is managed elsewhere
            const toggleNpcBtn = document.getElementById('toggleAddNpcModeBtn'); // Placeholder ID
            if (toggleNpcBtn) toggleNpcBtn.textContent = "Add NPC";
            if (typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo(); // Clear NPC config UI
        }

        // If changing to a tool that is NOT selectInspect, and a generic tile was selected, clear it.
        if (selectedGenericTile && btn.dataset.tool !== "selectInspect") {
            selectedGenericTile = null;
            updateTilePropertyEditorUI(); // Hide tile editor
        }

        currentTool = btn.dataset.tool;
        document.querySelectorAll(".toolBtn")
            .forEach(b => b.classList.toggle("selected", b === btn));
    };
});

// Z-Level UI listeners
document.getElementById("zLevelInput").addEventListener('change', (e) => {
    const newZ = parseInt(e.target.value, 10);
    if (!isNaN(newZ)) {
        currentEditingZ = newZ;
        ensureLayersForZ(currentEditingZ);
        // mapData.startPos.z = currentEditingZ; // Let Set Player Start button handle this explicitly for Z.
        updatePlayerStartDisplay(); // Reflects current mapData.startPos
        console.log(`Current editing Z-level changed to: ${currentEditingZ}`);
        selectedGenericTile = null; updateTilePropertyEditorUI();
        selectedTileForInventory = null; updateContainerInventoryUI();
        selectedPortal = null; updateSelectedPortalInfo();
        buildPalette();
        renderMergedGrid();
    }
});

document.getElementById("zLevelUpBtn").addEventListener('click', () => {
    currentEditingZ++;
    document.getElementById("zLevelInput").value = currentEditingZ;
    ensureLayersForZ(currentEditingZ);
    // mapData.startPos.z = currentEditingZ;
    updatePlayerStartDisplay();
    selectedGenericTile = null; updateTilePropertyEditorUI();
    selectedTileForInventory = null; updateContainerInventoryUI();
    selectedPortal = null; updateSelectedPortalInfo();
    buildPalette();
    renderMergedGrid();
});

document.getElementById("zLevelDownBtn").addEventListener('click', () => {
    currentEditingZ--;
    document.getElementById("zLevelInput").value = currentEditingZ;
    ensureLayersForZ(currentEditingZ);
    // mapData.startPos.z = currentEditingZ;
    updatePlayerStartDisplay();
    selectedGenericTile = null; updateTilePropertyEditorUI();
    selectedTileForInventory = null; updateContainerInventoryUI();
    selectedPortal = null; updateSelectedPortalInfo();
    buildPalette();
    renderMergedGrid();
});

document.getElementById("addZLevelBtn").addEventListener('click', () => {
    const newZStr = prompt("Enter Z-level index to add (integer):", (Object.keys(mapData.levels).length > 0 ? Math.max(...Object.keys(mapData.levels).map(Number)) + 1 : 0).toString());
    if (newZStr === null) return;
    const newZ = parseInt(newZStr, 10);
    if (isNaN(newZ)) {
        alert("Invalid Z-level. Please enter an integer.");
        return;
    }
    if (mapData.levels[newZ.toString()]) {
        alert(`Z-level ${newZ} already exists.`);
        return;
    }
    snapshot();
    currentEditingZ = newZ;
    ensureLayersForZ(currentEditingZ);
    document.getElementById("zLevelInput").value = currentEditingZ;
    // mapData.startPos.z = currentEditingZ; // New Z doesn't automatically become start Z
    updatePlayerStartDisplay();
    logToConsole(`Added and switched to Z-level: ${currentEditingZ}`);
    selectedGenericTile = null; updateTilePropertyEditorUI();
    selectedTileForInventory = null; updateContainerInventoryUI();
    selectedPortal = null; updateSelectedPortalInfo();
    buildPalette();
    renderMergedGrid();
});

document.getElementById("deleteZLevelBtn").addEventListener('click', () => {
    const zToDeleteStr = currentEditingZ.toString();
    if (Object.keys(mapData.levels).length <= 1) {
        alert("Cannot delete the last Z-level.");
        return;
    }
    if (!mapData.levels[zToDeleteStr]) {
        alert(`Z-level ${currentEditingZ} does not exist.`);
        return;
    }
    if (confirm(`Are you sure you want to delete Z-level ${currentEditingZ}? This cannot be undone easily.`)) {
        snapshot();
        const zToDelete = currentEditingZ; // Store before changing currentEditingZ
        delete mapData.levels[zToDeleteStr];
        logToConsole(`Deleted Z-level: ${zToDelete}`);

        // Remove NPCs on the deleted Z-level
        const initialNpcCount = mapData.npcs.length;
        mapData.npcs = mapData.npcs.filter(npc => npc.mapPos.z !== zToDelete);
        if (mapData.npcs.length < initialNpcCount) {
            logToConsole(`Removed ${initialNpcCount - mapData.npcs.length} NPCs from deleted Z-level ${zToDelete}.`);
        }

        // Remove Portals on the deleted Z-level
        const initialPortalCount = mapData.portals.length;
        mapData.portals = mapData.portals.filter(portal => portal.z !== zToDelete);
        if (mapData.portals.length < initialPortalCount) {
            logToConsole(`Removed ${initialPortalCount - mapData.portals.length} portals from deleted Z-level ${zToDelete}.`);
        }
        if (selectedPortal && selectedPortal.z === zToDelete) {
            selectedPortal = null; // Clear selection if it was on the deleted Z
        }
        // If selectedNpc is a global variable for the map maker, clear it too if it was on the deleted Z
        // if (selectedNpc && selectedNpc.mapPos.z === zToDelete) {
        //     selectedNpc = null; 
        //     if(typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo();
        // }


        // Switch to a default or existing Z-level
        if (mapData.startPos.z === zToDelete) { // If the player start Z was the one deleted
            // Try to find another existing Z-level, or default to 0 if all else fails
            const remainingZLevels = Object.keys(mapData.levels).map(Number);
            if (remainingZLevels.length > 0) {
                mapData.startPos.z = remainingZLevels.includes(0) ? 0 : remainingZLevels[0];
            } else {
                mapData.startPos.z = 0; // Should not happen due to "cannot delete last Z-level" check
            }
            logToConsole(`Player start Z was on deleted level. Reset to Z=${mapData.startPos.z}.`);
        }

        currentEditingZ = mapData.startPos.z;
        if (!mapData.levels[currentEditingZ.toString()]) {
            currentEditingZ = parseInt(Object.keys(mapData.levels)[0], 10);
        }
        // This fallback to 0 should ideally not be needed if the "Cannot delete last Z-level" check works.
        // However, if mapData.levels somehow became empty or only had non-integer keys (which is unlikely here),
        // this ensures currentEditingZ is a valid number and that Z=0 is re-initialized if needed.
        if (isNaN(currentEditingZ) || !mapData.levels[currentEditingZ.toString()]) {
            currentEditingZ = 0;
            ensureLayersForZ(currentEditingZ);
        }

        document.getElementById("zLevelInput").value = currentEditingZ;
        updatePlayerStartDisplay(); // Update X,Y,Z display

        selectedGenericTile = null; updateTilePropertyEditorUI();
        selectedTileForInventory = null; updateContainerInventoryUI();
        selectedPortal = null; updateSelectedPortalInfo();
        buildPalette();
        renderMergedGrid();
    }
});


// Layer type selector and visibility toggles
// document.getElementById("layerSelect").onchange = e => { // REMOVED as layerSelect element is gone
//     currentLayerType = e.target.value; 
//     selectedTileForInventory = null; updateContainerInventoryUI();
//     selectedGenericTile = null; updateTilePropertyEditorUI();
//     buildPalette();
//     renderMergedGrid();
// };

// currentLayerType will default to "landscape" or its last value.
// Its role will be re-evaluated in the palette consolidation step.
// For now, ensure buildPalette still works with a default currentLayerType.
// The buildPalette function currently filters tiles based on currentLayerType.
// This will be changed in the next step.

["bottom", "middle"].forEach(layerName => {
    const visElement = document.getElementById("vis_" + layerName);
    if (visElement) {
        visElement.onchange = () => {
            layerVisibility[layerName] = visElement.checked;
            renderMergedGrid();
        };
        // Initialize from HTML state
        layerVisibility[layerName] = visElement.checked;
    } else {
        // console.warn(`Visibility toggle for layer '${layerName}' not found.`);
        // Default to true if element is missing, or handle as error
        layerVisibility[layerName] = true;
    }
});

document.getElementById("exportBtn").onclick = () => {
    let mapId = prompt("Enter a filename/ID for the map (e.g., 'myNewMap')", mapData.id || "map");
    if (!mapId) return;
    mapId = mapId.replace(/\.json$/i, "").replace(/\s+/g, '_');

    const name = mapId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Update mapData with current UI values before exporting
    mapData.id = mapId;
    mapData.name = name; // Or prompt for a friendly name separately
    mapData.width = gridWidth;
    mapData.height = gridHeight;
    // mapData.startPos.z is updated when zLevelInput changes, or could be set here from playerStartZDisplay if that was editable.
    // mapData.levels, mapData.npcs, mapData.portals are already up-to-date.

    const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = mapId + ".json";
    a.click();
    URL.revokeObjectURL(url);
    console.log(`Exported map as ${mapId}.json`);
};
document.getElementById("loadBtn").onclick = () => {
    const fi = document.getElementById("mapFileInput");
    if (!fi.files.length) { alert("Select a .json file"); return; }
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const loadedJson = JSON.parse(ev.target.result);
            let successfullyLoaded = false;

            // Check for new format (levels with bottom/middle)
            if (loadedJson.levels && typeof loadedJson.levels === 'object') {
                const firstZKey = Object.keys(loadedJson.levels)[0];
                if (firstZKey && loadedJson.levels[firstZKey] &&
                    loadedJson.levels[firstZKey].hasOwnProperty('bottom') &&
                    loadedJson.levels[firstZKey].hasOwnProperty('middle')) {

                    mapData = loadedJson;
                    gridWidth = parseInt(mapData.width, 10);
                    gridHeight = parseInt(mapData.height, 10);
                    currentEditingZ = mapData.startPos && mapData.startPos.z !== undefined ? mapData.startPos.z : 0;
                    successfullyLoaded = true;
                    console.log("Loaded map in new format (bottom/middle layers).");
                }
            }

            // If not new format, check for old format (levels with landscape/building etc. OR direct layers property)
            if (!successfullyLoaded) {
                let oldLayersSource = null;
                if (loadedJson.levels && typeof loadedJson.levels === 'object') { // Old Z-level format
                    const firstZKey = Object.keys(loadedJson.levels)[0];
                    // If it has levels, but not bottom/middle, assume old multi-layer-type per Z.
                    // We will only convert Z=0 from this format for simplicity, or the first Z found.
                    if (firstZKey && loadedJson.levels[firstZKey] && (loadedJson.levels[firstZKey].hasOwnProperty('landscape') || loadedJson.levels[firstZKey].hasOwnProperty('building'))) {
                        oldLayersSource = loadedJson.levels[firstZKey]; // Take the first Z-level's layers
                        console.warn("Loaded map in old Z-level format (landscape/building per Z). Converting first Z-level only.");
                    }
                } else if (loadedJson.layers && typeof loadedJson.layers === 'object' && (loadedJson.layers.hasOwnProperty('landscape') || loadedJson.layers.hasOwnProperty('building'))) { // flat old format
                    oldLayersSource = loadedJson.layers;
                    console.warn("Loaded map in flat old format (direct layers property). Converting to Z=0.");
                }

                if (oldLayersSource && loadedJson.width && loadedJson.height) {
                    mapData.id = loadedJson.id || "converted_map";
                    mapData.name = loadedJson.name || "Converted Map";
                    gridWidth = parseInt(loadedJson.width, 10);
                    gridHeight = parseInt(loadedJson.height, 10);
                    mapData.width = gridWidth;
                    mapData.height = gridHeight;

                    mapData.levels = {}; // Initialize new levels structure
                    mapData.levels["0"] = {
                        bottom: createEmptyGrid(gridWidth, gridHeight, ""),
                        middle: createEmptyGrid(gridWidth, gridHeight, "")
                    };

                    const oldLayerNames = ["landscape", "building", "item", "roof"]; // Order for processing
                    for (let y = 0; y < gridHeight; y++) {
                        for (let x = 0; x < gridWidth; x++) {
                            let placedOnBottom = false;
                            let placedOnMiddle = false;
                            // Iterate old layers in reverse render order (topmost old layer first)
                            // to ensure correct tile ends up if multiple old tiles map to same new layer.
                            for (const oldLayerName of oldLayerNames.slice().reverse()) {
                                const tileId = oldLayersSource[oldLayerName]?.[y]?.[x];
                                if (tileId && tileId !== "") {
                                    const tileDef = assetManager.tilesets[tileId];
                                    if (tileDef) {
                                        const assignedNewLayer = getAssignedLayer(tileDef);
                                        if (assignedNewLayer === "bottom" && !placedOnBottom) {
                                            mapData.levels["0"].bottom[y][x] = tileId;
                                            placedOnBottom = true;
                                        } else if (assignedNewLayer === "middle" && !placedOnMiddle) {
                                            mapData.levels["0"].middle[y][x] = tileId;
                                            placedOnMiddle = true;
                                        }
                                    }
                                }
                                if (placedOnBottom && placedOnMiddle) break; // Optimization
                            }
                        }
                    }

                    mapData.startPos = { x: loadedJson.startPos?.x || 0, y: loadedJson.startPos?.y || 0, z: 0 };
                    mapData.npcs = loadedJson.npcs || [];
                    mapData.portals = loadedJson.portals || [];
                    currentEditingZ = 0;
                    successfullyLoaded = true;
                    console.log("Successfully converted old format map to new bottom/middle layer structure for Z=0.");
                }
            }

            if (!successfullyLoaded) {
                console.error("Failed to load map: Unrecognized format or critical data missing after attempting conversions.");
                alert("Failed to load map: Unrecognized format or critical data missing.");
                return;
            }

            document.getElementById("inputWidth").value = gridWidth;
            document.getElementById("inputHeight").value = gridHeight;
            document.documentElement.style.setProperty("--cols", gridWidth);
            document.getElementById("zLevelInput").value = currentEditingZ;
            updatePlayerStartDisplay(); // Update X,Y,Z display

            // Ensure all Z-levels mentioned (e.g. in startPos) have their layer structure initialized
            Object.keys(mapData.levels).forEach(zKey => ensureLayersForZ(parseInt(zKey, 10)));
            ensureLayersForZ(currentEditingZ); // Crucially ensure current editing Z has layers

            // Recalculate nextPortalId based on loaded mapData.portals
            nextPortalId = 0;
            if (mapData.portals && mapData.portals.length > 0) {
                mapData.portals.forEach(p => {
                    const idNum = parseInt(p.id.split('_')[1]);
                    if (!isNaN(idNum) && idNum >= nextPortalId) {
                        nextPortalId = idNum + 1;
                    }
                });
            }

            selectedPortal = null;
            addingPortalMode = false;
            document.getElementById('toggleAddPortalModeBtn').textContent = "Add Portal";
            updateSelectedPortalInfo();

            selectedTileForInventory = null; updateContainerInventoryUI();
            selectedGenericTile = null; updateTilePropertyEditorUI();
            // selectedNpc = null; if (typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo();

            buildPalette(); // Palette might depend on currentLayerType, which is fine
            renderMergedGrid();
            alert(`Map "${mapData.name || mapData.id || 'Unknown'}" loaded! Current Z: ${currentEditingZ}`);

        } catch (err) {
            alert("Error parsing map: " + err);
            console.error("Error parsing map file:", err);
        }
    };
    reader.readAsText(fi.files[0]);
};

// --- 11) Init on load ---
async function initMap() {
    try {
        await assetManager.loadDefinitions();
        console.log("Map Maker: Asset definitions loaded via AssetManager.");
        if (!assetManager.tilesets || Object.keys(assetManager.tilesets).length === 0) {
            console.error("Map Maker: assetManager.tilesets is empty after loadDefinitions!");
            const errorDiv = document.getElementById('errorMessageDisplayMapMaker');
            if (errorDiv) errorDiv.textContent = "Error: Failed to load tile definitions. Palette will be empty.";
        }
    } catch (error) {
        console.error("Map Maker: Error loading asset definitions:", error);
        const errorDiv = document.getElementById('errorMessageDisplayMapMaker');
        if (errorDiv) errorDiv.textContent = "Error loading definitions. Check console.";
    }

    gridWidth = parseInt(document.getElementById("inputWidth").value, 10) || 20;
    gridHeight = parseInt(document.getElementById("inputHeight").value, 10) || 15;
    document.documentElement.style.setProperty("--cols", gridWidth);

    currentEditingZ = 0; // Default starting Z-level for a new map
    document.getElementById("zLevelInput").value = currentEditingZ;

    // Initialize mapData for a new map
    mapData = {
        id: "new_map_" + Date.now(), // More unique default ID
        name: "New Map",
        width: gridWidth,
        height: gridHeight,
        startPos: { x: Math.floor(gridWidth / 2), y: Math.floor(gridHeight / 2), z: 0 },
        levels: {}, // ensureLayersForZ will populate "0"
        npcs: [],
        portals: []
    };
    ensureLayersForZ(currentEditingZ); // Initialize layers for Z=0
    updatePlayerStartDisplay();


    currentLayerType = "landscape";
    currentTileId = assetManager.tilesets && Object.keys(assetManager.tilesets).length > 0 ? Object.keys(assetManager.tilesets)[0] : "";
    currentTool = "brush";

    dragStart = null;
    previewPos = null;
    stampData3D = null;

    selectedNpc = null;
    window.addingNpcModeState = false;
    selectedTileForInventory = null;
    selectedPortal = null;
    addingPortalMode = false;
    nextPortalId = 0;
    selectedGenericTile = null;

    undoStack.length = 0;
    redoStack.length = 0;

    layerVisibility.landscape = document.getElementById('vis_landscape').checked;
    layerVisibility.building = document.getElementById('vis_building').checked;
    layerVisibility.item = document.getElementById('vis_item').checked;
    layerVisibility.roof = document.getElementById('vis_roof').checked;

    if (typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo();
    updateContainerInventoryUI();
    updateSelectedPortalInfo();
    updateTilePropertyEditorUI();


    // const toggleNpcBtn = document.getElementById('toggleAddNpcModeBtn'); // Element not in HTML
    // if (toggleNpcBtn) toggleNpcBtn.textContent = "Add NPC";
    // document.getElementById('toggleAddPortalModeBtn').textContent = "Add Portal"; // Element was removed

    // const removeNpcBtn = document.getElementById('removeNpcBtn'); // Element not in HTML
    // if (removeNpcBtn) removeNpcBtn.disabled = true;

    document.querySelectorAll(".toolBtn").forEach(b => b.classList.toggle("selected", b.dataset.tool === currentTool));

    buildPalette(); // This will now build the full palette, filtered by activeTagFilters
    renderMergedGrid();

    // Event listeners for tag filter checkboxes
    document.querySelectorAll(".tagFilterCheckbox").forEach(checkbox => {
        checkbox.addEventListener('change', buildPalette);
    });

    // Event listener for Clear Tag Filters button
    const clearTagFiltersBtn = document.getElementById('clearTagFiltersBtn');
    if (clearTagFiltersBtn) {
        clearTagFiltersBtn.addEventListener('click', () => {
            document.querySelectorAll(".tagFilterCheckbox").forEach(checkbox => {
                checkbox.checked = false; // Uncheck all
            });
            buildPalette(); // Rebuild palette with no filters
        });
    }

    // Event listeners for Onion Skinning controls
    const enableOnionCheckbox = document.getElementById('enableOnionSkinCheckbox');
    const belowInput = document.getElementById('onionLayersBelowInput');
    const aboveInput = document.getElementById('onionLayersAboveInput');

    if (enableOnionCheckbox) {
        enableOnionCheckbox.addEventListener('change', (e) => {
            onionSkinEnabled = e.target.checked;
            renderMergedGrid();
        });
    }
    if (belowInput) {
        belowInput.addEventListener('change', (e) => {
            onionLayersBelow = parseInt(e.target.value, 10) || 0;
            if (onionSkinEnabled) renderMergedGrid();
        });
        // Initialize from HTML default
        onionLayersBelow = parseInt(belowInput.value, 10) || 1;
    }
    if (aboveInput) {
        aboveInput.addEventListener('change', (e) => {
            onionLayersAbove = parseInt(e.target.value, 10) || 0;
            if (onionSkinEnabled) renderMergedGrid();
        });
        // Initialize from HTML default
        onionLayersAbove = parseInt(aboveInput.value, 10) || 0;
    }
    // Initialize onionSkinEnabled from checkbox default state (if it had `checked`)
    if (enableOnionCheckbox) onionSkinEnabled = enableOnionCheckbox.checked;


    // Populate itemSelectForContainer dropdown
    const itemSelect = document.getElementById('itemSelectForContainer');
    itemSelect.innerHTML = ''; // Clear previous options first

    if (assetManager.itemsById && Object.keys(assetManager.itemsById).length > 0) {
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "-- Select Item --";
        itemSelect.appendChild(defaultOption);

        for (const itemId in assetManager.itemsById) {
            const itemDef = assetManager.itemsById[itemId];
            const option = document.createElement('option');
            option.value = itemId;
            // Display name, size, and weight for better selection
            option.textContent = `${itemDef.name || itemId} (Size: ${itemDef.size !== undefined ? itemDef.size : 1}, W: ${itemDef.weightLbs !== undefined ? itemDef.weightLbs : 'N/A'}lbs)`;
            itemSelect.appendChild(option);
        }
    } else {
        const errorOption = document.createElement('option');
        errorOption.value = "";
        errorOption.textContent = "-- No items loaded --";
        itemSelect.appendChild(errorOption);
        console.warn("Map Maker: No item definitions found in assetManager.itemsById to populate 'itemSelectForContainer'.");
        // Consider adding a more user-visible error in the Map Maker UI itself if this state occurs.
        // For now, the console warning and dropdown message suffice.
        const errorMessageDiv = document.getElementById('errorMessageDisplayMapMaker'); // Assuming this div exists from previous HTML
        if (errorMessageDiv) {
            errorMessageDiv.textContent = "Warning: Item definitions could not be loaded. Container item selection will be empty. Check items.json and console.";
        }
    }

    selectedTileForInventory = null;
    updateContainerInventoryUI(); // Initial UI update for container/lock controls

    // Event Listener: Add Item to Container
    document.getElementById('addItemToContainerBtn').addEventListener('click', () => {
        if (!selectedTileForInventory) return;

        const { x, y, z, layerName } = selectedTileForInventory; // Include z
        const zStr = z.toString();
        ensureLayersForZ(z);
        let tileData = mapData.levels[zStr]?.[layerName]?.[y]?.[x];

        if (typeof tileData === 'string') { // Convert string ID to object if it's a container
            const tileDefCheck = assetManager.tilesets[tileData];
            if (tileDefCheck && tileDefCheck.tags && tileDefCheck.tags.includes('container')) {
                snapshot(); // Take snapshot before converting
                mapData.levels[zStr][layerName][y][x] = { tileId: tileData, containerInventory: [] };
                tileData = mapData.levels[zStr][layerName][y][x];
            } else {
                alert("Error: Selected tile is not a valid container type."); return;
            }
        } else if (typeof tileData !== 'object' || tileData === null || tileData.tileId === undefined) {
            console.error("Target tile data is invalid for adding items.", tileData);
            alert("Error: Cannot add item to this tile. Tile data is invalid.");
            return;
        }

        if (!tileData.containerInventory) { // Ensure containerInventory array exists
            snapshot(); // Take snapshot if we are modifying structure
            tileData.containerInventory = [];
        }

        const currentTileDef = assetManager.tilesets[tileData.tileId];
        if (!currentTileDef || !currentTileDef.tags || !currentTileDef.tags.includes('container')) {
            alert("The selected tile is not a container. Cannot add items.");
            selectedTileForInventory = null;
            updateContainerInventoryUI();
            return;
        }

        const itemId = document.getElementById('itemSelectForContainer').value;
        const quantity = parseInt(document.getElementById('itemQuantityForContainer').value, 10);

        if (!itemId || itemId === "" || quantity < 1) {
            alert("Please select an item and enter a valid quantity.");
            return;
        }

        snapshot(); // Take snapshot before modifying inventory

        const existingItem = tileData.containerInventory.find(item => item.id === itemId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            tileData.containerInventory.push({ id: itemId, quantity: quantity });
        }

        console.log(`Added/updated ${itemId} (qty ${quantity}) in container at ${x},${y} on layer ${layerName}`);
        updateContainerInventoryUI();
    });

    // Event Listener: Toggle Lock State for a tile
    document.getElementById('isLockedCheckbox').addEventListener('change', function () {
        if (!selectedTileForInventory) return;
        const { x, y, z, layerName } = selectedTileForInventory; // Include z
        const zStr = z.toString();
        ensureLayersForZ(z);
        let tileData = mapData.levels[zStr]?.[layerName]?.[y]?.[x];

        snapshot();

        if (typeof tileData === 'string') {
            const tileDefForConversion = assetManager.tilesets[tileData];
            if (!tileDefForConversion || !tileDefForConversion.tags || !(tileDefForConversion.tags.includes('door') || tileDefForConversion.tags.includes('window') || tileDefForConversion.tags.includes('container'))) {
                console.error("Attempted to set lock on non-lockable/invalid tile type:", tileData);
                this.checked = !this.checked;
                // snapshot(); // Consider if a snapshot revert is needed or just prevent change
                return;
            }
            mapData.levels[zStr][layerName][y][x] = {
                tileId: tileData,
                isLocked: this.checked,
                lockDC: this.checked ? 10 : 0
            };
            if (tileDefForConversion.tags.includes('container')) {
                mapData.levels[zStr][layerName][y][x].containerInventory = mapData.levels[zStr][layerName][y][x].containerInventory || [];
            }
            tileData = mapData.levels[zStr][layerName][y][x];
        } else if (typeof tileData === 'object' && tileData !== null) {
            tileData.isLocked = this.checked;
            if (!this.checked) {
                tileData.lockDC = 0;
            } else if (tileData.lockDC === undefined || tileData.lockDC === 0) {
                tileData.lockDC = 10;
            }
        } else {
            console.error("Invalid tile data for setting lock status at " + x + "," + y); return;
        }

        document.getElementById('lockDifficultyInput').disabled = !this.checked;
        document.getElementById('lockDifficultyInput').value = tileData.lockDC !== undefined ? tileData.lockDC : (this.checked ? 10 : 0);
    });

    // Event Listener: Change Lock DC for a tile
    document.getElementById('lockDifficultyInput').addEventListener('input', function () {
        if (!selectedTileForInventory || this.disabled) return;
        const { x, y, z, layerName } = selectedTileForInventory; // Include z
        const zStr = z.toString();
        ensureLayersForZ(z);
        let tileData = mapData.levels[zStr]?.[layerName]?.[y]?.[x];

        if (typeof tileData === 'object' && tileData !== null) {
            snapshot();
            tileData.lockDC = parseInt(this.value, 10) || 0;
        } else if (typeof tileData === 'string' && document.getElementById('isLockedCheckbox').checked) {
            const currentTileId = tileData;
            const tileDefCheck = assetManager.tilesets[currentTileId];
            if (tileDefCheck && tileDefCheck.tags && (tileDefCheck.tags.includes('door') || tileDefCheck.tags.includes('window') || tileDefCheck.tags.includes('container'))) {
                snapshot();
                mapData.levels[zStr][layerName][y][x] = {
                    tileId: currentTileId,
                    isLocked: true,
                    lockDC: parseInt(this.value, 10) || 0,
                    containerInventory: (tileDefCheck.tags.includes('container') && mapData.levels[zStr][layerName][y][x] && mapData.levels[zStr][layerName][y][x].containerInventory) ? mapData.levels[zStr][layerName][y][x].containerInventory : (tileDefCheck.tags.includes('container') ? [] : undefined)
                };
                if (!tileDefCheck.tags.includes('container')) { delete mapData.levels[zStr][layerName][y][x].containerInventory; }
            } else { return; }
        }
    });

    mapData.portals = mapData.portals || []; // Ensure mapData.portals exists from the start
    nextPortalId = 0; // Will be updated correctly on map load
    // addingPortalMode = false; // Variable removed
    selectedPortal = null;
    updateSelectedPortalInfo();

    // Event Listener for old toggleAddPortalModeBtn REMOVED
    // document.getElementById('toggleAddPortalModeBtn').addEventListener('click', () => { ... });

    // Placeholder for similar logic in NPC add mode button, assuming it exists.
    // The actual event listener for 'toggleAddNpcModeBtn' would be defined as part of the NPC feature.
    // If that listener exists, it should also include:
    // if (window.addingNpcModeState) { // When NPC add mode is activated
    //     // ... (existing logic to clear other selections like selectedPortal, selectedTileForInventory) ...
    //     if (selectedGenericTile) {
    //         selectedGenericTile = null;
    //         updateTilePropertyEditorUI(); // Hide tile editor
    //     }
    //     // ... (existing logic to switch tool if currentTool was selectInspect) ...
    // }


    // Event Listener: Save Portal Properties
    document.getElementById('savePortalPropertiesBtn').addEventListener('click', () => {
        if (!selectedPortal) return;
        snapshot(); // Save state for undo
        selectedPortal.targetMapId = document.getElementById('portalTargetMapId').value.trim().replace(/\.json$/i, "");
        selectedPortal.targetX = parseInt(document.getElementById('portalTargetX').value, 10);
        selectedPortal.targetY = parseInt(document.getElementById('portalTargetY').value, 10);
        updateSelectedPortalInfo();
        renderMergedGrid();
        console.log("Portal properties saved for", selectedPortal.id);
    });

    // Event Listener: Remove Selected Portal
    document.getElementById('removePortalBtn').addEventListener('click', () => {
        if (!selectedPortal) return;
        snapshot(); // Save state for undo
        const index = mapData.portals.findIndex(p => p.id === selectedPortal.id); // Use mapData.portals
        if (index > -1) {
            mapData.portals.splice(index, 1); // Use mapData.portals
            console.log("Removed portal", selectedPortal.id);
        }
        selectedPortal = null;
        updateSelectedPortalInfo();
        renderMergedGrid();
    });

    document.getElementById('saveTileInstancePropertiesBtn').addEventListener('click', () => {
        if (!selectedGenericTile) {
            console.warn("Save Tile Properties button clicked, but no generic tile selected.");
            return;
        }

        const { x, y, z, layerName } = selectedGenericTile; // Include z
        const zStr = z.toString();
        ensureLayersForZ(z);
        let tileData = mapData.levels[zStr]?.[layerName]?.[y]?.[x];
        let baseTileId = (typeof tileData === 'object' && tileData !== null && tileData.tileId !== undefined) ? tileData.tileId : tileData;

        if (!baseTileId || baseTileId === "") {
            console.error("Cannot save properties: Selected generic tile has no valid baseTileId.", tileData);
            return;
        }

        snapshot(); // For undo functionality

        // Get new instance properties from input fields
        const newInstanceName = document.getElementById('tileInstanceName').value.trim();
        const newInstanceTagsStr = document.getElementById('tileInstanceTags').value.trim();
        const newInstanceTagsArray = newInstanceTagsStr === "" ? [] : newInstanceTagsStr.split(',').map(tag => tag.trim()).filter(tag => tag !== "");

        // Ensure the tileData is an object to store custom properties
        if (typeof tileData === 'string') {
            tileData = { tileId: baseTileId }; // Convert string ID to object
            mapData.levels[zStr][layerName][y][x] = tileData; // Save to mapData.levels
        }

        // Update or add instance properties
        if (newInstanceName !== "") {
            tileData.instanceName = newInstanceName;
        } else {
            delete tileData.instanceName; // Remove if empty
        }

        if (newInstanceTagsArray.length > 0) {
            tileData.instanceTags = newInstanceTagsArray;
        } else {
            delete tileData.instanceTags; // Remove if empty
        }

        // Placeholder for future customProperties object
        // if (/* logic for customProperties editor */) {
        //    tileData.customProperties = ... ;
        // } else {
        //    delete tileData.customProperties;
        // }

        // Optional: If all custom properties are removed, and it's not a container/portal/etc.
        // (i.e., no other special keys like containerInventory, isLocked, etc.),
        // then revert to string ID.
        const remainingKeysAfterSave = Object.keys(tileData);
        let isOnlyTileIdLeft = true;
        for (const key of remainingKeysAfterSave) {
            if (key !== 'tileId') {
                isOnlyTileIdLeft = false;
                break;
            }
        }
        if (isOnlyTileIdLeft) {
            mapData.levels[zStr][layerName][y][x] = tileData.tileId;
        }

        logToConsole(`Saved properties for tile at (${x},${y}, Z:${z}) on layer ${layerName}. New data:`, mapData.levels[zStr][layerName][y][x]);
        updateTilePropertyEditorUI(); // Re-populate the editor to reflect saved state (e.g., trimmed spaces)
        renderMergedGrid(); // Potentially for future visual cues based on instance tags/props
    });

    document.getElementById('clearTileInstancePropertiesBtn').addEventListener('click', () => {
        if (!selectedGenericTile) {
            console.warn("Clear Tile Properties button clicked, but no generic tile selected.");
            return;
        }

        const { x, y, z, layerName } = selectedGenericTile; // Include z
        const zStr = z.toString();
        ensureLayersForZ(z);
        let tileData = mapData.levels[zStr]?.[layerName]?.[y]?.[x];

        if (typeof tileData === 'object' && tileData !== null && tileData.tileId !== undefined) {
            snapshot(); // For undo

            const baseTileId = tileData.tileId;
            // Check for properties that necessitate keeping the tile as an object
            let hasOtherSpecialProps = tileData.hasOwnProperty('containerInventory') ||
                tileData.hasOwnProperty('isLocked') ||
                tileData.hasOwnProperty('lockDC');
            // Add other checks if more special direct properties are added later (e.g., NPC spawn info, script triggers)

            // Remove only the generic instance properties
            delete tileData.instanceName;
            delete tileData.instanceTags;
            // delete tileData.customProperties; // If/when customProperties are implemented

            // If, after removing generic properties, the object only holds 'tileId' 
            // (and no other special properties like container/lock info which require it to be an object),
            // then revert it to a string.
            const remainingKeys = Object.keys(tileData);
            if (remainingKeys.length === 1 && tileData.hasOwnProperty('tileId') && !hasOtherSpecialProps) {
                mapData.levels[zStr][layerName][y][x] = baseTileId;
                logToConsole(`Cleared all custom instance properties for tile at (${x},${y}, Z:${z}) on layer ${layerName}. Reverted to string ID: ${baseTileId}`);
            } else {
                // If it still has other special properties (containerInventory, isLocked, etc.),
                // just keep it as an object with those properties.
                logToConsole(`Cleared generic instance properties for tile at (${x},${y}, Z:${z}) on layer ${layerName}. Object retained for other special properties. Data:`, mapData.levels[zStr][layerName][y][x]);
            }

            updateTilePropertyEditorUI(); // Re-populate/clear the editor fields
            renderMergedGrid();
        } else if (typeof tileData === 'string') {
            // No custom properties to clear if it's already a string
            logToConsole(`Tile at (${x},${y}, Z:${z}) on layer ${layerName} has no custom properties to clear.`);
        } else {
            console.error("Cannot clear properties: Selected generic tile data is invalid.", tileData);
        }
    });
}
window.onload = initMap; // Initialize map editor when the window loads

// Updates the container inventory UI and lock properties UI based on the selected tile.
function updateContainerInventoryUI() {
    const controlsDiv = document.getElementById('containerInventoryControls');
    const itemListDiv = document.getElementById('itemInContainerList');
    const containerNameSpan = document.getElementById('editingContainerName');
    const containerPosSpan = document.getElementById('editingContainerPos');
    itemListDiv.innerHTML = ''; // Clear previous items

    if (!selectedTileForInventory) {
        controlsDiv.style.display = 'none';
        updateLockPropertiesUI(); // Ensure lock UI is also hidden
        return;
    }

    const { x, y, z, layerName } = selectedTileForInventory; // z is already part of selectedTileForInventory
    const zStr = z.toString();
    ensureLayersForZ(z); // Ensure Z level exists

    let tileData = mapData.levels[zStr]?.[layerName]?.[y]?.[x];
    let tileId = '';
    let containerInventory = [];

    if (typeof tileData === 'string') {
        tileId = tileData;
    } else if (typeof tileData === 'object' && tileData !== null && tileData.tileId !== undefined) { // Check for tileId
        tileId = tileData.tileId;
        containerInventory = tileData.containerInventory || [];
    } else {
        controlsDiv.style.display = 'none';
        updateLockPropertiesUI(); // Ensure lock UI is also hidden
        return;
    }

    const tileDef = assetManager.tilesets[tileId];
    const isContainer = tileDef && tileDef.tags && tileDef.tags.includes('container');
    const isLockable = tileDef && tileDef.tags && (tileDef.tags.includes('door') || tileDef.tags.includes('window'));

    if (!isContainer && !isLockable) { // If not a container AND not otherwise lockable
        controlsDiv.style.display = 'none';
        updateLockPropertiesUI(); // Ensure lock UI is also hidden
        return;
    }

    controlsDiv.style.display = 'block'; // Show main controls if container OR lockable
    containerNameSpan.textContent = tileDef.name || tileId;
    containerPosSpan.textContent = `${x}, ${y}`;

    if (containerInventory.length === 0) {
        itemListDiv.textContent = "No items in container.";
    } else {
        containerInventory.forEach((itemInstance, index) => {
            const itemDef = assetManager.itemsById[itemInstance.id]; // Corrected to use itemsById
            const itemDiv = document.createElement('div');
            itemDiv.textContent = `${itemDef ? itemDef.name : itemInstance.id} (Qty: ${itemInstance.quantity}) `;
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.style.marginLeft = '10px';
            removeBtn.onclick = () => removeItemFromContainer(index); // removeItemFromContainer will be defined later
            itemDiv.appendChild(removeBtn);
            itemListDiv.appendChild(itemDiv);
        });
    }

    // Show/hide item list based on whether it's a container
    document.getElementById('itemInContainerList').style.display = isContainer ? 'block' : 'none';
    document.getElementById('addItemToContainerForm').style.display = isContainer ? 'block' : 'none';
    // Adjust visibility of "Container Contents" h3 title
    const h3Title = controlsDiv.querySelector('h3');
    if (h3Title) h3Title.style.display = isContainer ? 'block' : 'none';


    updateLockPropertiesUI();
}

// instead of only setting currentLayer…
// This handler was already correctly defined earlier using currentLayerType.
// The duplicate one below is likely an older version or a copy-paste error.
// I will remove this duplicate block.
// document.getElementById("layerSelect").onchange = e => {
//     currentLayer = e.target.value; // This should be currentLayerType
//     selectedTileForInventory = null;
//     updateContainerInventoryUI();

//     selectedPortal = null;
//     addingPortalMode = false;
//     document.getElementById('toggleAddPortalModeBtn').textContent = "Add Portal";
//     updateSelectedPortalInfo();

//     if (selectedGenericTile) {
//         selectedGenericTile = null;
//         updateTilePropertyEditorUI(); // Hide tile editor
//     }

//     buildPalette();
//     renderMergedGrid();
// };

// The correct handler is already present around line 1008:
// document.getElementById("layerSelect").onchange = e => {
// currentLayerType = e.target.value; // Changed from currentLayer
// ...
// };
// No changes needed here, only removal of the duplicate if it were truly a separate conflicting block.
// For the purpose of this diff, assuming the SEARCH block is the one to be removed or confirmed as already correct.
// Since the plan is to fix `layers` references, and this block doesn't use `mapData.levels`
// but rather implies a global `layers` through its potential interaction if `currentLayer` was used directly as an index,
// it's best to ensure it's either correct or removed if redundant.
// Given the earlier `layerSelect.onchange` uses `currentLayerType` and seems more complete,
// this trailing block is suspicious.
// For safety and to ensure no `layers` related error from this, I will effectively comment it out / remove it
// by making the SEARCH block result in no replacement code, assuming the earlier one is canonical.
// If this was the *only* handler, I'd fix it. But since there's one above, this is likely dead/old.

// Corrected understanding: The original file has TWO `layerSelect.onchange` assignments.
// The first one (around line 1008) correctly uses `currentLayerType`.
// The second one (at the very end) incorrectly uses `currentLayer`.
// The fix is to remove the second, incorrect one.
// The tool will achieve this if the REPLACE block is empty.
