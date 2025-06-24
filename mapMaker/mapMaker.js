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
    const g = createEmptyGrid(w, h, "GR");
    for (let x = 0; x < w; x++) {
        g[0][x] = g[h - 1][x] = "MB";
    }
    for (let y = 0; y < h; y++) {
        g[y][0] = g[y][w - 1] = "MB";
    }
    return g;
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

function placeTile(x, y, z, tileIdOrObject) { // Added z, renamed tid to tileIdOrObject
    const zStr = z.toString();
    ensureLayersForZ(z); // Ensure the Z-level and its layers exist

    const targetLayer = mapData.levels[zStr]?.[currentLayerType];
    if (!targetLayer) {
        console.error(`Cannot place tile: Layer type ${currentLayerType} does not exist for Z-level ${zStr}.`);
        return;
    }

    targetLayer[y][x] = tileIdOrObject;

    // Autotiling should use the base ID if it's an object
    const baseIdForAutotile = (typeof tileIdOrObject === 'object' && tileIdOrObject !== null && tileIdOrObject.tileId !== undefined)
        ? tileIdOrObject.tileId
        : tileIdOrObject;

    if (typeof baseIdForAutotile === 'string' && baseIdForAutotile.length >= 2) { // Only attempt autotile if we have a valid string ID
        const fam = baseIdForAutotile.slice(0, 2);
        const mapKey = fam + "H";
        if (autoTileMap[mapKey]) { // Check if this tile family participates in autotiling
            applyAutoTile(x, y, z, currentLayerType);
            // Retile neighbors only if they are part of the same family and also autotile
            // This prevents unnecessary re-tiling of unrelated adjacent tiles.
            [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
                    const neighborTileData = targetLayer[ny]?.[nx];
                    const neighborBaseId = (typeof neighborTileData === 'object' && neighborTileData !== null && neighborTileData.tileId !== undefined)
                        ? neighborTileData.tileId
                        : neighborTileData;
                    if (neighborBaseId && typeof neighborBaseId === 'string' && neighborBaseId.slice(0, 2) === fam) {
                        applyAutoTile(nx, ny, z, currentLayerType);
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
        "0": { // Default starting Z-level
            landscape: [], // createDefaultLandscape will populate this
            building: [],  // createEmptyGrid will populate this
            item: [],      // createEmptyGrid will populate this
            roof: []       // createEmptyGrid will populate this
        }
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
let addingPortalMode = false;
let selectedPortal = null;
let nextPortalId = 0;
let selectedGenericTile = null; // Stores {x, y, z, layerName}

// For Drawing Tools
let currentTool = "brush",
    dragStart = null, // Stores {x, y} at the start of a drag operation for line/rect/stamp
    previewPos = null,
    stampData = null;

const layerVisibility = {
    landscape: true,
    building: true,
    item: true,
    roof: true
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
function buildPalette() {
    paletteContainer.innerHTML = "";
    const eraser = document.createElement("div");
    eraser.className = "palette"; eraser.dataset.tileId = ""; // Empty string for eraser
    eraser.textContent = "✖"; eraser.title = "Eraser (Clear Tile)";
    eraser.onclick = () => { currentTileId = ""; updatePalette(); };
    paletteContainer.appendChild(eraser);

    if (assetManager.tilesets && Object.keys(assetManager.tilesets).length > 0) {
        Object.entries(assetManager.tilesets).forEach(([id, tileDef]) => {
            // Filter tiles based on the currentLayerType being edited
            let showInPalette = false;
            if (tileDef.tags) {
                if (currentLayerType === "landscape" && tileDef.tags.includes("landscape")) showInPalette = true;
                else if (currentLayerType === "building" && (tileDef.tags.includes("building") || tileDef.tags.includes("wall") || tileDef.tags.includes("floor") || tileDef.tags.includes("door") || tileDef.tags.includes("window"))) showInPalette = true;
                else if (currentLayerType === "item" && tileDef.tags.includes("item")) showInPalette = true;
                else if (currentLayerType === "roof" && tileDef.tags.includes("roof")) showInPalette = true;
                // Consider new layer types like 'constructions', 'items' here.
                // For now, mapping 'building' to 'constructions' and 'item' to 'items'.
                // This will need refinement as new layer types are fully integrated.
            }

            if (!showInPalette) return;

            const d = document.createElement("div");
            d.className = "palette"; d.dataset.tileId = id;
            d.textContent = tileDef.sprite; d.style.color = tileDef.color;
            d.title = `${tileDef.name} (${id})`;
            d.onclick = () => { currentTileId = id; updatePalette(); };
            paletteContainer.appendChild(d);
        });
    } else {
        paletteContainer.innerHTML = "<p>No tiles loaded. Check definitions.</p>";
    }
    updatePalette();
}

function updatePalette() {
    document.querySelectorAll(".palette")
        .forEach(el => el.classList.toggle("selected", el.dataset.tileId === currentTileId));
}

// Helper function to ensure a Z-level and its layer types exist in mapData.levels
function ensureLayersForZ(zLevel) {
    const zStr = zLevel.toString();
    if (!mapData.levels[zStr]) {
        mapData.levels[zStr] = {
            landscape: createDefaultLandscape(gridWidth, gridHeight),
            building: createEmptyGrid(gridWidth, gridHeight, ""),
            item: createEmptyGrid(gridWidth, gridHeight, ""),
            roof: createEmptyGrid(gridWidth, gridHeight, "")
            // Initialize other new layer types (constructions, items, entities etc.) here as empty grids or arrays
        };
        console.log(`Initialized layer structure for new Z-level: ${zStr}`);
    } else {
        // Ensure all standard layer types exist for an already existing Z-level
        // This helps if loading a map that might be missing some layer types for a specific Z.
        const defaultLayers = {
            landscape: () => createDefaultLandscape(gridWidth, gridHeight),
            building: () => createEmptyGrid(gridWidth, gridHeight, ""),
            item: () => createEmptyGrid(gridWidth, gridHeight, ""),
            roof: () => createEmptyGrid(gridWidth, gridHeight, "")
        };
        for (const layerKey in defaultLayers) {
            if (!mapData.levels[zStr][layerKey]) {
                mapData.levels[zStr][layerKey] = defaultLayers[layerKey]();
                console.log(`Initialized missing layer type '${layerKey}' for Z-level: ${zStr}`);
            }
        }
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
            let id = "";
            // Determine the topmost visible tile ID from the current Z-level's layers
            if (layerVisibility.landscape && currentLevel.landscape?.[y]?.[x]) id = currentLevel.landscape[y][x];
            if (layerVisibility.building && currentLevel.building?.[y]?.[x]) id = currentLevel.building[y][x];
            if (layerVisibility.item && currentLevel.item?.[y]?.[x]) id = currentLevel.item[y][x];
            if (layerVisibility.roof && currentLevel.roof?.[y]?.[x]) id = currentLevel.roof[y][x];

            // Handle cases where tile data might be an object (e.g., for containers, instance props)
            let displayId = id;
            if (typeof id === 'object' && id !== null && id.tileId !== undefined) {
                displayId = id.tileId;
            }

            const c = document.createElement("div");
            c.className = "cell"; c.dataset.x = x; c.dataset.y = y; c.dataset.z = currentEditingZ; // Store Z on cell for context

            const tileDef = assetManager.tilesets[displayId];
            if (displayId && tileDef) {
                c.textContent = tileDef.sprite;
                c.style.color = tileDef.color;
            } else if (displayId) { // Should only be empty string if no tile from layers
                c.textContent = '?'; // Should not happen if displayId has value but no def
                c.style.color = 'magenta';
            } else {
                c.textContent = ' '; // Explicitly empty for truly empty cells
            }

            // Visually indicate Player Start Position
            if (mapData.startPos && x === mapData.startPos.x && y === mapData.startPos.y && currentEditingZ === mapData.startPos.z) {
                c.textContent = '☻'; // Player sprite
                c.style.color = 'lime'; // Bright color for player start
                c.style.backgroundColor = 'rgba(0, 255, 0, 0.2)'; // Slight background highlight
                c.title = `Player Start (X:${mapData.startPos.x}, Y:${mapData.startPos.y}, Z:${mapData.startPos.z})`;
            } else if (tileDef) { // Add title only if it's a regular tile, not overridden by player start
                c.title = `${tileDef.name} (${displayId}) at X:${x}, Y:${y}, Z:${currentEditingZ}`;
            }


            // stamp preview (operates on currentLayerType of currentEditingZ)
            if (currentTool === "stamp" && stampData && previewPos) {
                const dx = x - previewPos.x, dy = y - previewPos.y;
                if (dx >= 0 && dy >= 0 && dx < stampData.w && dy < stampData.h) {
                    const pid = stampData.data[dy][dx]; // This stamp data is from a single layer type
                    const stampTileDef = assetManager.tilesets[pid];
                    if (pid && stampTileDef) {
                        c.textContent = stampTileDef.sprite;
                        c.style.color = stampTileDef.color;
                        c.classList.add("preview");
                    } else if (pid) {
                        c.textContent = '!';
                        c.style.color = 'orange';
                        c.classList.add("preview");
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
function floodFill(layerType, x, y, z, newTileId) { // Added z
    const zStr = z.toString();
    ensureLayersForZ(z);
    const gridLayer = mapData.levels[zStr]?.[layerType];
    if (!gridLayer) return;

    const oldTileId = gridLayer[y][x];
    if (oldTileId === newTileId) return;

    const stack = [[x, y]];
    snapshot();
    while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= gridWidth || cy >= gridHeight) continue;
        if (gridLayer[cy][cx] !== oldTileId) continue;
        placeTile(cx, cy, z, newTileId); // placeTile now needs z
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
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

function drawRect(layerType, x0, y0, z, x1, y1, tileId) { // Added z
    const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
    snapshot();
    for (let yy = minY; yy <= maxY; yy++) {
        for (let xx = minX; xx <= maxX; xx++) {
            placeTile(xx, yy, z, tileId); // placeTile now needs z
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

    if (currentTool === "selectInspect") {
        if (window.addingNpcModeState) {
            window.addingNpcModeState = false;
            const toggleNpcBtn = document.getElementById('toggleAddNpcModeBtn');
            if (toggleNpcBtn) toggleNpcBtn.textContent = "Add NPC";
        }
        if (addingPortalMode) {
            addingPortalMode = false;
            document.getElementById('toggleAddPortalModeBtn').textContent = "Add Portal";
        }

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

        let tileDataUnderCursor = mapData.levels[zStr]?.[currentLayerType]?.[y]?.[x];
        let baseTileId = (typeof tileDataUnderCursor === 'object' && tileDataUnderCursor !== null && tileDataUnderCursor.tileId !== undefined) ? tileDataUnderCursor.tileId : tileDataUnderCursor;
        const tileDef = assetManager.tilesets[baseTileId];

        if (tileDef && tileDef.tags && (tileDef.tags.includes('container') || tileDef.tags.includes('door') || tileDef.tags.includes('window'))) {
            selectedTileForInventory = { x, y, z, layerName: currentLayerType };
            selectedGenericTile = { x, y, z, layerName: currentLayerType };
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
        floodFill(currentLayerType, x, y, currentEditingZ, currentTileId); // Pass currentEditingZ
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
        drawLine(currentLayerType, dragStart.x, dragStart.y, z, x, y, currentTileId); // Pass z
    } else if (currentTool === "rect" && dragStart) {
        drawRect(currentLayerType, dragStart.x, dragStart.y, z, x, y, currentTileId); // Pass z
    } else if (currentTool === "stamp") {
        if (!stampData && dragStart) { // Define stamp
            const w = Math.abs(x - dragStart.x) + 1, h = Math.abs(y - dragStart.y) + 1;
            const x0 = Math.min(x, dragStart.x), y0 = Math.min(y, dragStart.y);
            stampData = { w, h, data: [] }; // Stamp data is 2D, from the currentLayerType of currentEditingZ
            const sourceLayer = mapData.levels[z.toString()]?.[currentLayerType];
            if (sourceLayer) {
                for (let yy = 0; yy < h; yy++) {
                    stampData.data[yy] = [];
                    for (let xx = 0; xx < w; xx++) {
                        stampData.data[yy][xx] = sourceLayer[y0 + yy]?.[x0 + xx];
                    }
                }
            }
        } else if (stampData) { // Apply stamp
            snapshot();
            for (let yy = 0; yy < stampData.h; yy++) {
                for (let xx = 0; xx < stampData.w; xx++) {
                    if (stampData.data[yy][xx] !== undefined) { // Ensure data exists before placing
                        placeTile(x + xx, y + yy, z, stampData.data[yy][xx]); // Pass z
                    }
                }
            }
            // Do not clear stampData here, allow multiple placements
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

        // Deactivate any "add" modes when a new tool is selected
        if (addingPortalMode) {
            addingPortalMode = false;
            document.getElementById('toggleAddPortalModeBtn').textContent = "Add Portal";
            // updateSelectedPortalInfo(); // Already called above, ensures UI is cleared
        }
        if (window.addingNpcModeState) { // Placeholder for actual NPC add mode state variable
            window.addingNpcModeState = false;
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
document.getElementById("layerSelect").onchange = e => {
    currentLayerType = e.target.value; // Changed from currentLayer
    // Reset selections when layer type changes, as context might be different
    selectedTileForInventory = null; updateContainerInventoryUI();
    selectedGenericTile = null; updateTilePropertyEditorUI();
    // Palette might need to be rebuilt if tile availability depends on layer type AND Z-level specifics (not just general tags)
    buildPalette();
    renderMergedGrid();
};

["landscape", "building", "item", "roof"].forEach(l => {
    document.getElementById("vis_" + l).onchange = () => renderMergedGrid();
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

            // Validate basic structure for new format
            if (!loadedJson.levels || !loadedJson.startPos || loadedJson.startPos.z === undefined) {
                alert("Invalid map format. Map must have 'levels' and 'startPos.z'. Attempting to load as old format if possible or failing.");
                // Try to adapt old format if necessary, or just fail.
                // For now, we'll assume new format or fail more gracefully.
                // If adapting old: create a "0" level from d.layers.
                if (loadedJson.layers && loadedJson.width && loadedJson.height) { // Possible old format
                    mapData.id = loadedJson.id || "loaded_map";
                    mapData.name = loadedJson.name || "Loaded Map";
                    gridWidth = parseInt(loadedJson.width, 10);
                    gridHeight = parseInt(loadedJson.height, 10);
                    mapData.width = gridWidth;
                    mapData.height = gridHeight;
                    mapData.levels = { "0": loadedJson.layers }; // Place old layers into Z=0
                    mapData.startPos = { x: loadedJson.startPos?.x || 0, y: loadedJson.startPos?.y || 0, z: 0 };
                    mapData.npcs = loadedJson.npcs || []; // Keep old npcs, they'll need Z added if edited
                    mapData.portals = loadedJson.portals || []; // Keep old portals, they'll need Z added
                    currentEditingZ = 0;
                    console.warn("Loaded map appears to be in old format. Adapted to new structure with all content on Z=0.");
                } else {
                    console.error("Failed to adapt old map format or map is corrupted.");
                    alert("Failed to load map: unrecognized format or critical data missing.");
                    return;
                }
            } else { // New format
                mapData = loadedJson; // Directly assign if new format is good
                gridWidth = parseInt(mapData.width, 10);
                gridHeight = parseInt(mapData.height, 10);
                currentEditingZ = mapData.startPos.z; // Set current editing Z to map's start Z
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
    stampData = null;

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


    const toggleNpcBtn = document.getElementById('toggleAddNpcModeBtn');
    if (toggleNpcBtn) toggleNpcBtn.textContent = "Add NPC";
    document.getElementById('toggleAddPortalModeBtn').textContent = "Add Portal";

    const removeNpcBtn = document.getElementById('removeNpcBtn');
    if (removeNpcBtn) removeNpcBtn.disabled = true;

    document.querySelectorAll(".toolBtn").forEach(b => b.classList.toggle("selected", b.dataset.tool === currentTool));

    buildPalette();
    renderMergedGrid();

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

        const { x, y, layerName } = selectedTileForInventory;
        let tileData = layers[layerName][y][x];

        if (typeof tileData === 'string') { // Convert string ID to object if it's a container
            const tileDefCheck = assetManager.tilesets[tileData];
            if (tileDefCheck && tileDefCheck.tags && tileDefCheck.tags.includes('container')) {
                snapshot(); // Take snapshot before converting
                layers[layerName][y][x] = { tileId: tileData, containerInventory: [] };
                tileData = layers[layerName][y][x];
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
        const { x, y, layerName } = selectedTileForInventory;
        let tileData = layers[layerName][y][x];

        snapshot();

        if (typeof tileData === 'string') {
            const tileDefForConversion = assetManager.tilesets[tileData];
            if (!tileDefForConversion || !tileDefForConversion.tags || !(tileDefForConversion.tags.includes('door') || tileDefForConversion.tags.includes('window') || tileDefForConversion.tags.includes('container'))) {
                console.error("Attempted to set lock on non-lockable/invalid tile type:", tileData);
                this.checked = !this.checked;
                // snapshot(); // Consider if a snapshot revert is needed or just prevent change
                return;
            }
            layers[layerName][y][x] = {
                tileId: tileData,
                isLocked: this.checked,
                lockDC: this.checked ? 10 : 0
            };
            if (tileDefForConversion.tags.includes('container')) {
                layers[layerName][y][x].containerInventory = layers[layerName][y][x].containerInventory || [];
            }
            tileData = layers[layerName][y][x];
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
        const { x, y, layerName } = selectedTileForInventory;
        let tileData = layers[layerName][y][x];

        if (typeof tileData === 'object' && tileData !== null) {
            snapshot();
            tileData.lockDC = parseInt(this.value, 10) || 0;
        } else if (typeof tileData === 'string' && document.getElementById('isLockedCheckbox').checked) {
            const currentTileId = tileData;
            const tileDefCheck = assetManager.tilesets[currentTileId];
            if (tileDefCheck && tileDefCheck.tags && (tileDefCheck.tags.includes('door') || tileDefCheck.tags.includes('window') || tileDefCheck.tags.includes('container'))) {
                snapshot();
                layers[layerName][y][x] = {
                    tileId: currentTileId,
                    isLocked: true,
                    lockDC: parseInt(this.value, 10) || 0,
                    containerInventory: (tileDefCheck.tags.includes('container') && layers[layerName][y][x] && layers[layerName][y][x].containerInventory) ? layers[layerName][y][x].containerInventory : (tileDefCheck.tags.includes('container') ? [] : undefined)
                };
                if (!tileDefCheck.tags.includes('container')) { delete layers[layerName][y][x].containerInventory; }
            } else { return; }
        }
    });

    layers.portals = [];
    nextPortalId = 0; // Will be updated correctly on map load
    addingPortalMode = false;
    selectedPortal = null;
    updateSelectedPortalInfo();

    // Event Listener: Toggle Portal Adding Mode
    document.getElementById('toggleAddPortalModeBtn').addEventListener('click', () => {
        addingPortalMode = !addingPortalMode; // Toggle mode
        document.getElementById('toggleAddPortalModeBtn').textContent = addingPortalMode ? "Cancel Add Portal" : "Add Portal";
        if (addingPortalMode) {
            selectedPortal = null;
            selectedTileForInventory = null;
            // selectedNpc = null; // Assuming selectedNpc exists from NPC feature
            // if (typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo();
            updateContainerInventoryUI();
            updateSelectedPortalInfo();

            if (currentTool === "selectInspect") {
                currentTool = "brush"; // Default to brush tool
                document.querySelectorAll(".toolBtn").forEach(b => b.classList.toggle("selected", b.dataset.tool === currentTool));
            }
            // Ensure NPC add mode is off
            if (window.addingNpcModeState) { // Placeholder for NPC add mode state variable
                window.addingNpcModeState = false;
                const toggleNpcBtn = document.getElementById('toggleAddNpcModeBtn'); // Placeholder ID
                if (toggleNpcBtn) toggleNpcBtn.textContent = "Add NPC";
            }
            if (selectedGenericTile) {
                selectedGenericTile = null;
                updateTilePropertyEditorUI(); // Hide tile editor
            }

            console.log("Portal Add Mode Enabled. Click on map to place portal.");
        } else {
            // If cancelling, restore UI based on whether a portal was previously selected
            updateSelectedPortalInfo();
        }
    });

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
        const index = layers.portals.findIndex(p => p.id === selectedPortal.id);
        if (index > -1) {
            layers.portals.splice(index, 1);
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

        const { x, y, layerName } = selectedGenericTile;
        let tileData = layers[layerName]?.[y]?.[x];
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
            layers[layerName][y][x] = tileData;
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
        // then revert to string ID. For now, keep as object for simplicity.
        // This check would be: Object.keys(tileData).length === 1 && tileData.hasOwnProperty('tileId')
        // if (Object.keys(tileData).length === 1 && tileData.hasOwnProperty('tileId')) {
        //     layers[layerName][y][x] = tileData.tileId;
        // }


        logToConsole(`Saved properties for tile at (${x},${y}) on layer ${layerName}. New data:`, layers[layerName][y][x]);
        updateTilePropertyEditorUI(); // Re-populate the editor to reflect saved state (e.g., trimmed spaces)
        renderMergedGrid(); // Potentially for future visual cues based on instance tags/props
    });

    document.getElementById('clearTileInstancePropertiesBtn').addEventListener('click', () => {
        if (!selectedGenericTile) {
            console.warn("Clear Tile Properties button clicked, but no generic tile selected.");
            return;
        }

        const { x, y, layerName } = selectedGenericTile;
        let tileData = layers[layerName]?.[y]?.[x];

        if (typeof tileData === 'object' && tileData !== null && tileData.tileId !== undefined) {
            snapshot(); // For undo

            const baseTileId = tileData.tileId;
            let hasOtherSpecialProps = tileData.hasOwnProperty('containerInventory') ||
                tileData.hasOwnProperty('isLocked') ||
                tileData.hasOwnProperty('lockDC');
            // Add other checks if more special direct properties are added later

            // Remove only the generic instance properties
            delete tileData.instanceName;
            delete tileData.instanceTags;
            delete tileData.customProperties; // If/when customProperties are implemented

            // If, after removing generic properties, the object only holds 'tileId' 
            // (and no other special properties like container/lock info which require it to be an object),
            // then revert it to a string.
            const remainingKeys = Object.keys(tileData);
            if (remainingKeys.length === 1 && tileData.hasOwnProperty('tileId') && !hasOtherSpecialProps) {
                layers[layerName][y][x] = baseTileId;
                logToConsole(`Cleared all custom instance properties for tile at (${x},${y}) on layer ${layerName}. Reverted to string ID: ${baseTileId}`);
            } else {
                // If it still has other special properties (containerInventory, isLocked, etc.),
                // just keep it as an object with those properties.
                logToConsole(`Cleared generic instance properties for tile at (${x},${y}) on layer ${layerName}. Object retained for other special properties. Data:`, layers[layerName][y][x]);
            }

            updateTilePropertyEditorUI(); // Re-populate/clear the editor fields
            renderMergedGrid();
        } else if (typeof tileData === 'string') {
            // No custom properties to clear if it's already a string
            logToConsole(`Tile at (${x},${y}) on layer ${layerName} has no custom properties to clear.`);
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

    const { x, y, layerName } = selectedTileForInventory;
    let tileData = layers[layerName]?.[y]?.[x];
    let tileId = '';
    let containerInventory = [];

    if (typeof tileData === 'string') {
        tileId = tileData;
    } else if (typeof tileData === 'object' && tileData !== null) {
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
document.getElementById("layerSelect").onchange = e => {
    currentLayer = e.target.value;
    selectedTileForInventory = null;
    updateContainerInventoryUI();

    selectedPortal = null;
    addingPortalMode = false;
    document.getElementById('toggleAddPortalModeBtn').textContent = "Add Portal";
    updateSelectedPortalInfo();

    if (selectedGenericTile) {
        selectedGenericTile = null;
        updateTilePropertyEditorUI(); // Hide tile editor
    }

    buildPalette();       // ← rebuilds the palette for the new layer
    renderMergedGrid();   // ← re‐renders the map so you see any layer‐specific tiles
};
