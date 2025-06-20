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

function applyAutoTile(x, y) {
    const tile = layers[currentLayer]?.[y]?.[x];
    if (!tile) return;
    // Determine the family key: "WW" → "WWH", "MW" → "MWH"
    const fam = tile.slice(0, 2);
    const mapKey = fam + "H";
    const map = autoTileMap[mapKey];
    if (!map) return;

    // Build the 4-bit mask by checking if neighbors share the same family
    let mask = 0;
    [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]].forEach(([dx, dy, bit]) => {
        const n = layers[currentLayer][y + dy]?.[x + dx];
        if (n?.slice(0, 2) === fam) mask |= bit;
    });

    // Write back the correct variant
    layers[currentLayer][y][x] = map[mask];
}

function placeTile(x, y, tid) {
    layers[currentLayer][y][x] = tid;
    // Re-tile this cell and its 4 neighbors
    applyAutoTile(x, y);
    applyAutoTile(x, y - 1);
    applyAutoTile(x + 1, y);
    applyAutoTile(x, y + 1);
    applyAutoTile(x - 1, y);
}


// --- 4) State ---
// --- 4) State Variables ---
// Stores all map layer data (landscape, building, item, roof) and special object data (npcs, portals)
let layers = {},
    currentLayer = "landscape", // Active layer being edited
    currentTileId = "MB"; // Currently selected tile ID from the palette

// For Container Inventory & Lock Properties Editing
let selectedTileForInventory = null; // Stores {x, y, layerName} of the tile selected for inventory/lock editing

// For Portal Editing
let addingPortalMode = false; // True if actively trying to place a new portal
let selectedPortal = null; // Stores the portal object selected for editing
let nextPortalId = 0; // Counter for generating unique portal IDs
let selectedGenericTile = null; // Stores {x, y, layerName} of a tile selected for generic property editing

// For Drawing Tools
let currentTool = "brush", // Active drawing tool (brush, fill, line, rect, stamp)
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
    undoStack.push(JSON.parse(JSON.stringify(layers)));
    if (undoStack.length > 25) undoStack.shift();
    redoStack.length = 0;
}
function undo() {
    if (!undoStack.length) return;
    redoStack.push(JSON.parse(JSON.stringify(layers)));
    layers = undoStack.pop();
    renderMergedGrid();
}
function redo() {
    if (!redoStack.length) return;
    undoStack.push(JSON.parse(JSON.stringify(layers)));
    layers = redoStack.pop();
    renderMergedGrid();
}

// --- 6) Palette ---
const paletteContainer = document.getElementById("paletteContainer");
function buildPalette() {
    paletteContainer.innerHTML = "";
    const er = document.createElement("div");
    er.className = "palette"; er.dataset.tileId = "";
    er.textContent = "✖"; er.title = "Eraser";
    er.onclick = () => { currentTileId = ""; updatePalette(); };
    paletteContainer.appendChild(er);

    if (assetManager.tilesets && Object.keys(assetManager.tilesets).length > 0) {
        Object.entries(assetManager.tilesets).forEach(([id, t]) => {
            const allowed = (currentLayer === "landscape")
                ? t.tags.includes("landscape")
                : t.tags.includes(currentLayer);
            // Additional filter: only include tiles suitable for the current layer type,
            // e.g. don't show "item" layer tiles if currentLayer is "building"
            let typeMatch = false;
            if (currentLayer === "landscape" && t.tags.includes("landscape")) typeMatch = true;
            else if (currentLayer === "building" && (t.tags.includes("building") || t.tags.includes("floor") || t.tags.includes("wall") || t.tags.includes("door") || t.tags.includes("window"))) typeMatch = true;
            else if (currentLayer === "item" && t.tags.includes("item")) typeMatch = true;
            else if (currentLayer === "roof" && t.tags.includes("roof")) typeMatch = true;

            // A broader rule: if a tile is tagged with the current layer name, allow it.
            // This makes landscape tiles appear only on landscape, item tiles on item layer, etc.
            if (!t.tags.includes(currentLayer) && !(currentLayer === 'building' && (t.tags.includes('floor') || t.tags.includes('wall') || t.tags.includes('door') || t.tags.includes('window')))) {
                // More refined check: if currentLayer is 'building', also allow 'floor', 'wall', 'door', 'window' tagged tiles.
                if (!(currentLayer === 'landscape' && t.tags.includes('landscape'))) { // ensure landscape tiles only show on landscape
                }
            }


            if (!allowed) return; // Original filter based on broad category (landscape vs. others)

            const d = document.createElement("div");
            d.className = "palette"; d.dataset.tileId = id;
            d.textContent = t.sprite; d.style.color = t.color;
            d.title = `${t.name} (${id})`;
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
        .forEach(el => el.classList.toggle("selected",
            el.dataset.tileId === currentTileId
        ));
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
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            let id = "";
            // Determine the topmost visible tile ID
            if (layerVisibility.landscape && layers.landscape?.[y]?.[x]) id = layers.landscape[y][x];
            if (layerVisibility.building && layers.building?.[y]?.[x]) id = layers.building[y][x];
            if (layerVisibility.item && layers.item?.[y]?.[x]) id = layers.item[y][x];
            if (layerVisibility.roof && layers.roof?.[y]?.[x]) id = layers.roof[y][x];

            const c = document.createElement("div");
            c.className = "cell"; c.dataset.x = x; c.dataset.y = y;

            const tileDef = assetManager.tilesets[id]; // Use assetManager.tilesets
            if (id && tileDef) {
                c.textContent = tileDef.sprite;
                c.style.color = tileDef.color;
            } else if (id) { // Tile ID exists in layer data but not in tileset
                c.textContent = '?'; // Show placeholder for unknown tile
                c.style.color = 'magenta';
                // console.warn(`Tile ID '${id}' at [${x},${y}] not found in loaded tilesets.`);
            }


            // stamp preview
            if (currentTool === "stamp" && stampData && previewPos) {
                const dx = x - previewPos.x, dy = y - previewPos.y;
                if (dx >= 0 && dy >= 0 && dx < stampData.w && dy < stampData.h) {
                    const pid = stampData.data[dy][dx];
                    const stampTileDef = assetManager.tilesets[pid]; // Use assetManager.tilesets
                    if (pid && stampTileDef) {
                        c.textContent = stampTileDef.sprite;
                        c.style.color = stampTileDef.color;
                        c.classList.add("preview");
                    } else if (pid) { // Stamp data has ID not in tileset
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

    // Draw portals on top
    if (layers.portals) {
        layers.portals.forEach(portal => {
            const cell = gridContainer.querySelector(`.cell[data-x='${portal.x}'][data-y='${portal.y}']`);
            if (cell) {
                const portalMarker = document.createElement('div');
                portalMarker.textContent = '▓'; // Portal symbol
                portalMarker.style.color = 'teal';
                portalMarker.style.position = 'absolute'; // Position over the tile content
                portalMarker.style.pointerEvents = 'none'; // Clicks should go to the cell

                // Basic highlight for selected portal - can be enhanced with CSS class
                if (selectedPortal && selectedPortal.id === portal.id) {
                    cell.style.outline = '2px solid cyan'; // Example highlight
                    // cell.classList.add('selected-portal'); // For CSS styling
                } else {
                    cell.style.outline = ''; // Remove outline if not selected
                    // cell.classList.remove('selected-portal');
                }
                cell.appendChild(portalMarker);
            }
        });
    }
}

// --- UI Update Functions ---

// Updates the portal configuration UI based on the currently selected portal.
function updateSelectedPortalInfo() {
    const portalConfigDiv = document.getElementById('portalConfigControls');
    const selectedInfoDiv = document.getElementById('selectedPortalInfo');
    const removeBtn = document.getElementById('removePortalBtn');
    const editingIdSpan = document.getElementById('editingPortalId');
    const editingPosSpan = document.getElementById('editingPortalPos');
    const targetMapInput = document.getElementById('portalTargetMapId');
    const targetXInput = document.getElementById('portalTargetX');
    const targetYInput = document.getElementById('portalTargetY');

    if (selectedPortal) {
        selectedInfoDiv.textContent = `Selected Portal: ${selectedPortal.id} at (${selectedPortal.x}, ${selectedPortal.y})`;
        portalConfigDiv.style.display = 'block';
        removeBtn.style.display = 'block';

        editingIdSpan.textContent = selectedPortal.id;
        editingPosSpan.textContent = `${selectedPortal.x}, ${selectedPortal.y}`;
        targetMapInput.value = selectedPortal.targetMapId || '';
        targetXInput.value = selectedPortal.targetX !== undefined ? selectedPortal.targetX : '';
        targetYInput.value = selectedPortal.targetY !== undefined ? selectedPortal.targetY : '';
    } else {
        selectedInfoDiv.textContent = "Selected Portal: None";
        portalConfigDiv.style.display = 'none';
        removeBtn.style.display = 'none';
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

    const { x, y, layerName } = selectedTileForInventory;
    let tileData = layers[layerName]?.[y]?.[x];
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
    } else {
        isLockedCheckbox.checked = false;
        lockDifficultyInput.value = 10;
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
    const { x, y, layerName } = selectedGenericTile;
    coordsSpan.textContent = `${x}, ${y} (Layer: ${layerName})`;

    let tileData = layers[layerName]?.[y]?.[x];
    let baseTileId = '';
    let instanceName = '';
    let instanceTagsArray = [];

    if (typeof tileData === 'object' && tileData !== null && tileData.tileId !== undefined) {
        baseTileId = tileData.tileId;
        instanceName = tileData.instanceName || '';
        instanceTagsArray = tileData.instanceTags || [];
    } else if (typeof tileData === 'string' && tileData !== "") {
        baseTileId = tileData;
        // Defaults for a tile that hasn't been customized yet
        instanceName = '';
        instanceTagsArray = [];
    } else { // Empty or invalid tile data
        editorDiv.style.display = 'none'; // Or display error
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

// Removes an item from the selected container's inventory.
function removeItemFromContainer(itemIndex) {
    if (!selectedTileForInventory) return;
    const { x, y, layerName } = selectedTileForInventory;
    let tileData = layers[layerName][y][x];

    if (typeof tileData === 'object' && tileData !== null && tileData.containerInventory) {
        snapshot();
        tileData.containerInventory.splice(itemIndex, 1);

        // Only convert back to string if inventory is empty AND no other custom properties exist (like locks)
        const hasLockProperties = tileData.isLocked !== undefined || tileData.lockDC !== undefined;
        if (tileData.containerInventory.length === 0 && !hasLockProperties) {
            // To simplify, let's keep it as an object for now. 
            // Conversion back to string can be a future optimization if truly needed.
            // layers[layerName][y][x] = tileData.tileId; 
        }
        updateContainerInventoryUI();
    }
}

// --- 8) Tools ---
function floodFill(layer, x, y, newT) {
    const g = layers[layer], old = g[y][x];
    if (old === newT) return;
    const stack = [[x, y]];
    snapshot();
    while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= gridWidth || cy >= gridHeight) continue;
        if (g[cy][cx] !== old) continue;
        placeTile(cx, cy, newT);
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    renderMergedGrid();
}

function drawLine(layer, x0, y0, x1, y1, tid) {
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy;
    snapshot();  // for undo
    while (true) {
        placeTile(x0, y0, tid);  // ← use placeTile, not direct assign
        if (x0 === x1 && y0 === y1) break;
        let e2 = err * 2;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
    renderMergedGrid();
}

function drawRect(layer, x0, y0, x1, y1, tid) {
    const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
    snapshot();
    for (let yy = minY; yy <= maxY; yy++) {
        for (let xx = minX; xx <= maxX; xx++) {
            placeTile(xx, yy, tid);  // ← auto-tiles each cell
        }
    }
    renderMergedGrid();
}

// --- Mouse Event Handler for Grid Interaction ---
function handleMouseDown(e) {
    const x = +e.target.dataset.x, y = +e.target.dataset.y;

    if (currentTool === "selectInspect") {
        // Clear any "add" modes if active
        // Assuming addingNpcMode is the state variable for NPC add mode from previous NPC implementation
        if (window.addingNpcModeState) { // Using a globally namespaced variable if it's not part of gameState
            window.addingNpcModeState = false;
            // Ensure NPC button text updates (assuming function/element ID from NPC subtask)
            const toggleNpcBtn = document.getElementById('toggleAddNpcModeBtn');
            if (toggleNpcBtn) toggleNpcBtn.textContent = "Add NPC";
        }
        if (addingPortalMode) { // This is the portal adding mode variable
            addingPortalMode = false;
            document.getElementById('toggleAddPortalModeBtn').textContent = "Add Portal";
        }

        // Attempt to select items in order of preference: Portal, NPC, Container/Lockable
        const clickedPortal = layers.portals ? layers.portals.find(p => p.x === x && p.y === y) : null;
        if (clickedPortal) {
            selectedPortal = clickedPortal;
            selectedNpc = null;
            selectedTileForInventory = null;
            selectedGenericTile = null; // Clear generic tile selection
            updateSelectedPortalInfo();
            if (typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo();
            updateContainerInventoryUI();
            updateTilePropertyEditorUI(); // Hide/clear generic tile UI
            renderMergedGrid();
            console.log("SelectTool: Selected Portal ID:", selectedPortal.id);
            return;
        }

        const clickedNpc = layers.npcs ? layers.npcs.find(npc => npc.mapPos && npc.mapPos.x === x && npc.mapPos.y === y) : null;
        if (clickedNpc) {
            selectedNpc = clickedNpc;
            selectedPortal = null;
            selectedTileForInventory = null;
            selectedGenericTile = null;
            if (typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo();
            updateSelectedPortalInfo();
            updateContainerInventoryUI();
            updateTilePropertyEditorUI();
            const removeNpcBtn = document.getElementById('removeNpcBtn');
            if (removeNpcBtn) removeNpcBtn.disabled = false;
            renderMergedGrid();
            console.log("SelectTool: Selected NPC ID:", selectedNpc.id);
            return;
        }

        // Check for Container/Lockable first, then fall through to generic.
        let tileDataUnderCursor = layers[currentLayer]?.[y]?.[x];
        let baseTileId = (typeof tileDataUnderCursor === 'object' && tileDataUnderCursor !== null && tileDataUnderCursor.tileId !== undefined) ? tileDataUnderCursor.tileId : tileDataUnderCursor;
        const tileDef = assetManager.tilesets[baseTileId];

        if (tileDef && tileDef.tags && (tileDef.tags.includes('container') || tileDef.tags.includes('door') || tileDef.tags.includes('window'))) {
            console.log(`SelectTool: Clicked on a special tile (Container/Door/Window): ${baseTileId}`);
            selectedTileForInventory = { x, y, layerName: currentLayer }; // For Container/Lock UI
            selectedGenericTile = { x, y, layerName: currentLayer };    // ALSO For Generic Tile Property Editor UI

            if (selectedPortal) { selectedPortal = null; updateSelectedPortalInfo(); }
            if (selectedNpc) {
                selectedNpc = null;
                if (typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo();
                const removeNpcBtn = document.getElementById('removeNpcBtn'); // Assuming this ID from NPC subtask
                if (removeNpcBtn) removeNpcBtn.disabled = true;
            }

            updateContainerInventoryUI();
            updateTilePropertyEditorUI();

            renderMergedGrid();
            return;
        }

        // If not a Portal, NPC, or Container/Lockable, then it's either a simple generic tile or empty.
        // This baseTileId and tileDataUnderCursor are from the previous section, still valid.

        if (baseTileId && baseTileId !== "") { // Clicked on a tile with content
            selectedGenericTile = { x, y, layerName: currentLayer };
            console.log(`SelectTool: Selected Generic Tile ID: ${baseTileId} at (${x},${y}) on layer ${currentLayer}`);
        } else { // Clicked on an empty space on the current layer
            selectedGenericTile = null;
            console.log("SelectTool: Clicked on empty space, all selections (including generic tile) cleared.");
        }

        // Clear other specific selections if a generic tile or empty space is now the focus
        if (selectedPortal) { selectedPortal = null; updateSelectedPortalInfo(); }
        // Assuming selectedNpc and updateSelectedNpcInfo are from NPC feature
        if (selectedNpc) {
            selectedNpc = null;
            if (typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo();
            const removeNpcBtn = document.getElementById('removeNpcBtn');
            if (removeNpcBtn) removeNpcBtn.disabled = true;
        }
        if (selectedTileForInventory) { selectedTileForInventory = null; updateContainerInventoryUI(); }

        updateTilePropertyEditorUI(); // Show/hide/populate the tile editor based on selectedGenericTile
        renderMergedGrid(); // Update highlights if any
        return; // Handled by selectInspect tool
    }

    // Priority 1: Portal Adding Mode (This is the original `addingPortalMode` for portals)
    if (addingPortalMode) {
        snapshot(); // Save state for undo
        const newPortal = {
            id: `portal_${nextPortalId++}`,
            x: x,
            y: y,
            targetMapId: '',
            targetX: 0,
            targetY: 0
        };
        layers.portals.push(newPortal);
        selectedPortal = newPortal;
        addingPortalMode = false;
        document.getElementById('toggleAddPortalModeBtn').textContent = "Add Portal";
        updateSelectedPortalInfo();
        renderMergedGrid();
        console.log(`Portal ${newPortal.id} added at ${x},${y}`);
        return; // Added portal, consumed click.
    }

    // Priority 2: Attempt to select an existing Portal
    for (const portal of layers.portals) {
        if (portal.x === x && portal.y === y) {
            selectedPortal = portal;
            selectedTileForInventory = null; // Clear tile selection
            // selectedNpc = null; // placeholder for NPC selection
            // if (typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo(); // placeholder
            updateContainerInventoryUI(); // Hide container/lock UI
            updateSelectedPortalInfo(); // Show portal UI
            renderMergedGrid();
            console.log(`Selected portal ${portal.id}`);
            return; // Selected a portal, consumed click.
        }
    }

    // If a portal was previously selected but user clicked elsewhere (not on another portal)
    if (selectedPortal) {
        selectedPortal = null; // Clear portal selection
        updateSelectedPortalInfo(); // Hide portal UI
        // Don't return; allow click to proceed to tile/container selection or painting.
    }

    // Priority 3: NPC interaction logic (Placeholder)
    // (Assuming addingNpcMode_npc and selectedNpc are defined elsewhere for NPC feature)
    let addingNpcMode_npc = false; // Placeholder for NPC add mode
    let selectedNpc = null;   // Placeholder for selected NPC object

    // if (addingNpcMode_npc) { /* ... NPC adding logic ... */ return; }
    // if (clickedOnNpc) { /* ... NPC selection logic ... */ selectedNpc = clickedNpc; return; }


    // Priority 4: Container/Lockable Tile Selection (if not interacting with NPCs)
    if (!addingNpcMode_npc && !selectedNpc) {
        let tileIdAtClick = layers[currentLayer]?.[y]?.[x];
        // Correctly identify tileId if it's an object (e.g. a container or locked door)
        let effectiveTileId = typeof tileIdAtClick === 'object' && tileIdAtClick !== null && tileIdAtClick.tileId !== undefined ? tileIdAtClick.tileId : tileIdAtClick;
        const tileDefAtClick = assetManager.tilesets[effectiveTileId];

        // Updated condition to include door and window for selection handling
        if (tileDefAtClick && tileDefAtClick.tags && (tileDefAtClick.tags.includes('container') || tileDefAtClick.tags.includes('door') || tileDefAtClick.tags.includes('window'))) {
            selectedTileForInventory = { x, y, layerName: currentLayer };
            // If a container/door/window is selected, ensure portal selection is cleared
            if (selectedPortal) {
                selectedPortal = null;
                updateSelectedPortalInfo();
            }
        } else {
            selectedTileForInventory = null;
        }
        updateContainerInventoryUI(); // This also updates lock UI
    } else if (addingNpcMode_npc || selectedNpc) { // Check NPC mode/selection
        selectedTileForInventory = null;
        updateContainerInventoryUI();
    }

    // Tile painting logic follows...
    // This will only be reached if no portal interaction consumed the click.
    if (currentTool === "brush") {
        snapshot(); // Captures all layers state
        // Deep copy old tile data *before* placeTile modifies it.
        const oldTileData = JSON.parse(JSON.stringify(layers[currentLayer]?.[y]?.[x] || null));

        placeTile(x, y, currentTileId); // This sets layers[currentLayer][y][x] to a string ID

        const newTileIdPlaced_str = layers[currentLayer][y][x];
        const newTileDef = assetManager.tilesets[newTileIdPlaced_str];

        if (newTileDef && newTileDef.tags && (newTileDef.tags.includes('container') || newTileDef.tags.includes('door') || newTileDef.tags.includes('window'))) {
            let newObjectData = { tileId: newTileIdPlaced_str };

            let inventoryToCarry = [];
            // Default lock state for a new lockable item, or if old one didn't have locks defined
            let lockStateToCarry = { isLocked: false, lockDC: 10 };

            // If we are painting the *same type* of tile over itself, preserve its properties
            if (typeof oldTileData === 'object' && oldTileData !== null && oldTileData.tileId === newTileIdPlaced_str) {
                if (newTileDef.tags.includes('container') && oldTileData.containerInventory) {
                    inventoryToCarry = oldTileData.containerInventory;
                }
                // Carry over lock state only if it was explicitly defined on the old tile object
                if (oldTileData.isLocked !== undefined) lockStateToCarry.isLocked = oldTileData.isLocked;
                if (oldTileData.lockDC !== undefined) lockStateToCarry.lockDC = oldTileData.lockDC;
            }
            // If it's a new type of tile, or was previously a string, it gets default lock properties (false, 10) unless changed by user later.
            // If it's a container, it gets an empty inventory unless it's the same tile type.

            if (newTileDef.tags.includes('container')) {
                newObjectData.containerInventory = inventoryToCarry;
            }
            newObjectData.isLocked = lockStateToCarry.isLocked;
            newObjectData.lockDC = lockStateToCarry.lockDC;

            layers[currentLayer][y][x] = newObjectData;
            selectedTileForInventory = { x, y, layerName: currentLayer };
        } else {
            // If painting a non-container/non-lockable tile, ensure any previous object state is cleared
            // placeTile already sets it to a string, so selectedTileForInventory = null is key.
            selectedTileForInventory = null;
        }
        updateContainerInventoryUI(); // This will also call updateLockPropertiesUI
        renderMergedGrid();
    } else if (currentTool === "fill") {
        snapshot();
        floodFill(currentLayer, x, y, currentTileId);
        selectedTileForInventory = null;
        updateContainerInventoryUI();
        renderMergedGrid();
    } else if (currentTool === "line" || currentTool === "rect" || currentTool === "stamp") {
        // snapshot(); // Snapshot is taken by drawing functions or stamp logic
        if (dragStart === null) { // Starting a drag operation
            dragStart = { x, y };
            selectedTileForInventory = null;
            updateContainerInventoryUI();
        }
        // The actual drawing happens in handleMouseUp for these tools
    } else { // Other tools or if no specific tool logic for mousedown
        snapshot(); // General snapshot if not handled by specific tools above.
        // This else block might not be strictly necessary if all tools are covered.
    }
}
function handleMouseUp(e) {
    const x = +e.target.dataset.x, y = +e.target.dataset.y;
    if (currentTool === "line") {
        drawLine(currentLayer, dragStart.x, dragStart.y, x, y, currentTileId);
    } else if (currentTool === "rect") {
        drawRect(currentLayer, dragStart.x, dragStart.y, x, y, currentTileId);
    } else if (currentTool === "stamp") {
        if (!stampData) {
            const w = Math.abs(x - dragStart.x) + 1, h = Math.abs(y - dragStart.y) + 1;
            const x0 = Math.min(x, dragStart.x), y0 = Math.min(y, dragStart.y);
            stampData = { w, h, data: [] };
            for (let yy = 0; yy < h; yy++) {
                stampData.data[yy] = [];
                for (let xx = 0; xx < w; xx++) {
                    stampData.data[yy][xx] = layers[currentLayer][y0 + yy][x0 + xx];
                }
            }
        } else {
            for (let yy = 0; yy < stampData.h; yy++) {
                for (let xx = 0; xx < stampData.w; xx++) {
                    placeTile(x + xx, y + yy, stampData.data[yy][xx]);
                }
            }
        }
        selectedTileForInventory = null;
        updateContainerInventoryUI();
        // renderMergedGrid() is already called by these tools' drawing functions
    }
    dragStart = null; // Moved here from individual tool blocks to ensure it's always reset
    renderMergedGrid(); // This might be redundant if individual tools call it, but safe.
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
// The layerSelect.onchange was already modified above. The line below is for context, but the one in the file is different.
// document.getElementById("layerSelect").onchange = () => { buildPalette(); renderMergedGrid(); }; 
["landscape", "building", "item", "roof"].forEach(l => {
    document.getElementById("vis_" + l).onchange = () => renderMergedGrid();
});
document.getElementById("exportBtn").onclick = () => {
    let mapId = prompt("Enter a filename/ID for the map (e.g., 'myNewMap')", "map");
    if (!mapId) return; // User cancelled
    mapId = mapId.replace(/\.json$/i, "").replace(/\s+/g, '_'); // Remove .json if they added it and replace spaces with underscores

    // Create a basic friendly name from the ID
    const name = mapId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const data = {
        id: mapId,
        name: name,
        width: gridWidth,
        height: gridHeight,
        layers: layers, // This contains landscape, building etc.
        npc_spawns: layers.npc_spawns || [],
        portals: layers.portals || [] // Ensure this is the script's layers.portals
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
            const d = JSON.parse(ev.target.result);
            if (d.width && d.height) {
                gridWidth = parseInt(d.width, 10);
                gridHeight = parseInt(d.height, 10);
                document.getElementById("inputWidth").value = gridWidth;
                document.getElementById("inputHeight").value = gridHeight;
                document.documentElement.style.setProperty("--cols", gridWidth);
            } else {
                // Attempt to infer from landscape layer if width/height are missing
                if (d.layers && d.layers.landscape && d.layers.landscape.length > 0) {
                    gridHeight = d.layers.landscape.length;
                    gridWidth = d.layers.landscape[0].length;
                    document.getElementById("inputWidth").value = gridWidth;
                    document.getElementById("inputHeight").value = gridHeight;
                    document.documentElement.style.setProperty("--cols", gridWidth);
                    console.warn("Map dimensions (width/height) missing from JSON, inferred from landscape layer.");
                } else {
                    alert("Map dimensions (width/height) are missing in the JSON file. Cannot reliably load.");
                    return;
                }
            }

            // Initialize layers if they don't exist to prevent errors
            layers.landscape = d.layers.landscape || createDefaultLandscape(gridWidth, gridHeight);
            layers.building = d.layers.building || createEmptyGrid(gridWidth, gridHeight, "");
            layers.item = d.layers.item || createEmptyGrid(gridWidth, gridHeight, "");
            layers.roof = d.layers.roof || createEmptyGrid(gridWidth, gridHeight, "");

            // For future properties like npc_spawns, portals
            layers.npc_spawns = d.npc_spawns || [];
            layers.portals = d.portals || []; // Load portals from the root of the JSON data

            // Recalculate nextPortalId
            nextPortalId = 0;
            if (layers.portals && layers.portals.length > 0) {
                layers.portals.forEach(p => {
                    const idNum = parseInt(p.id.split('_')[1]);
                    if (!isNaN(idNum) && idNum >= nextPortalId) {
                        nextPortalId = idNum + 1;
                    }
                });
            }

            // Reset portal UI state
            selectedPortal = null;
            addingPortalMode = false;
            document.getElementById('toggleAddPortalModeBtn').textContent = "Add Portal";
            updateSelectedPortalInfo();

            // It's crucial to re-initialize the map (or at least parts of it)
            // after changing gridWidth/gridHeight and layers.
            // renderMergedGrid() alone might not be enough if underlying cell elements need recreation.
            // Calling a slimmed-down init or a dedicated resize function is better.
            // For now, directly calling render.
            renderMergedGrid(); // Re-render with new dimensions and content
            alert(`Map "${d.name || d.id || 'Unknown'}" loaded!`);

            selectedTileForInventory = null;
            updateContainerInventoryUI();
            // Also reset selected NPC and its UI, and NPC mode (when implemented)
            // selectedNpc = null; // Placeholder for selected NPC state
            // if (typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo(); // Placeholder for NPC UI update
            // if(document.getElementById('removeNpcBtn')) document.getElementById('removeNpcBtn').disabled = true; // Placeholder
            // addingNpcMode_npc = false; // Placeholder for NPC add mode state
            // The portal button text is correctly managed by its own logic now.
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
        // Ensure this.tilesets is populated for the palette
        if (!assetManager.tilesets || Object.keys(assetManager.tilesets).length === 0) {
            console.error("Map Maker: assetManager.tilesets is empty after loadDefinitions!");
            const errorDiv = document.getElementById('errorMessageDisplayMapMaker');
            if (errorDiv) errorDiv.textContent = "Error: Failed to load tile definitions. Palette will be empty.";
            // Potentially return or throw error to prevent further execution if tilesets are critical
        }
    } catch (error) {
        console.error("Map Maker: Error loading asset definitions:", error);
        const errorDiv = document.getElementById('errorMessageDisplayMapMaker');
        if (errorDiv) errorDiv.textContent = "Error loading definitions. Check console.";
        // Handle error appropriately, maybe prevent editor init
    }

    // Initialize grid dimensions (already done at top for initial load, this re-confirms for resize)
    gridWidth = parseInt(document.getElementById("inputWidth").value, 10) || 20;
    gridHeight = parseInt(document.getElementById("inputHeight").value, 10) || 15;
    document.documentElement.style.setProperty("--cols", gridWidth);

    // Initialize layers
    layers = {
        landscape: createDefaultLandscape(gridWidth, gridHeight),
        building: createEmptyGrid(gridWidth, gridHeight, ""),
        item: createEmptyGrid(gridWidth, gridHeight, ""),
        roof: createEmptyGrid(gridWidth, gridHeight, ""),
        npcs: [],     // For storing NPC data within mapMaker's undo/redo context
        portals: []   // For storing Portal data within mapMaker's undo/redo context
    };

    // Reset other state variables
    currentLayer = "landscape";
    currentTileId = assetManager.tilesets && Object.keys(assetManager.tilesets).length > 0 ? Object.keys(assetManager.tilesets)[0] : "GR"; // Default to first available tile or GR
    currentTool = "brush";

    dragStart = null;
    previewPos = null;
    stampData = null;

    // Reset selection states
    selectedNpc = null; // Placeholder for actual selectedNpc variable
    window.addingNpcModeState = false; // Placeholder for actual NPC adding mode state variable
    selectedTileForInventory = null;
    selectedPortal = null;
    addingPortalMode = false;
    nextPortalId = 0;
    selectedGenericTile = null;

    undoStack.length = 0;
    redoStack.length = 0;

    // Initialize layer visibility from checkboxes (or set defaults and sync UI)
    layerVisibility.landscape = document.getElementById('vis_landscape').checked;
    layerVisibility.building = document.getElementById('vis_building').checked;
    layerVisibility.item = document.getElementById('vis_item').checked;
    layerVisibility.roof = document.getElementById('vis_roof').checked;

    // Update UI elements related to these resets
    if (typeof updateSelectedNpcInfo === 'function') updateSelectedNpcInfo();
    updateContainerInventoryUI();
    updateSelectedPortalInfo();

    const toggleNpcBtn = document.getElementById('toggleAddNpcModeBtn'); // Placeholder ID
    if (toggleNpcBtn) toggleNpcBtn.textContent = "Add NPC";
    document.getElementById('toggleAddPortalModeBtn').textContent = "Add Portal";

    const removeNpcBtn = document.getElementById('removeNpcBtn'); // Placeholder ID
    if (removeNpcBtn) removeNpcBtn.disabled = true;

    document.querySelectorAll(".toolBtn").forEach(b => b.classList.toggle("selected", b.dataset.tool === currentTool));

    buildPalette(); // Rebuild palette based on currentLayer and loaded tilesets
    renderMergedGrid(); // Render the newly initialized or resized grid

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
