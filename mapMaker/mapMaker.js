// mapMaker.js
const assetManager = new AssetManager();

// --- 1) Initial grid size & CSS var ---
let gridWidth = parseInt(document.getElementById("inputWidth").value, 10) || 20;
let gridHeight = parseInt(document.getElementById("inputHeight").value, 10) || 15;
document.documentElement.style.setProperty("--cols", gridWidth);

// --- 2) Tile Palette ---
// const tilePalette = { ... }; // REMOVED

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
    const tileData = layers[currentLayer]?.[y]?.[x];
    if (!tileData) return;

    let tileIdForAutoTiling = "";
    if (typeof tileData === 'object' && tileData !== null && tileData.id) {
        tileIdForAutoTiling = tileData.id;
    } else if (typeof tileData === 'string') {
        tileIdForAutoTiling = tileData;
    }
    if (!tileIdForAutoTiling) return; // No ID to process

    // Determine the family key: "WW" → "WWH", "MW" → "MWH"
    const fam = tileIdForAutoTiling.slice(0, 2);
    const mapKey = fam + "H"; // Assumes base ID for auto-tiling (e.g. WWH for Wood Walls)
    const map = autoTileMap[mapKey];
    if (!map) return;

    // Build the 4-bit mask by checking if neighbors share the same family
    let mask = 0;
    [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]].forEach(([dx, dy, bit]) => {
        const neighborData = layers[currentLayer]?.[y + dy]?.[x + dx];
        let neighborId = "";
        if (typeof neighborData === 'object' && neighborData !== null && neighborData.id) {
            neighborId = neighborData.id;
        } else if (typeof neighborData === 'string') {
            neighborId = neighborData;
        }
        if (neighborId?.slice(0, 2) === fam) mask |= bit;
    });

    // Write back the correct variant ID. If original was an object, update its ID.
    const newVariantId = map[mask];
    if (typeof tileData === 'object' && tileData !== null && tileData.id) {
        // If it's an object, update its ID but keep other properties
        layers[currentLayer][y][x].id = newVariantId;
    } else {
        // If it was a string, just update it
        layers[currentLayer][y][x] = newVariantId;
    }
}

function placeTile(x, y, tid) {
    const tileDef = assetManager.getTileDefinition(tid);

    if (tileDef && tileDef.tags && tileDef.tags.includes('container')) {
        layers[currentLayer][y][x] = {
            id: tid,
            contents: JSON.parse(JSON.stringify(tileDef.contents || [])),
            capacity: tileDef.capacity || 10, // Default to 10 if not specified
            isLocked: tileDef.isLocked || false,
            lockDifficulty: tileDef.lockDifficulty || 0,
            uniqueID: tileDef.uniqueID || ""
        };
    } else {
        layers[currentLayer][y][x] = tid;
    }
    // Re-tile this cell and its 4 neighbors
    applyAutoTile(x, y);
    applyAutoTile(x, y - 1);
    applyAutoTile(x + 1, y);
    applyAutoTile(x, y + 1);
    applyAutoTile(x - 1, y);
}


// --- 4) State ---
let layers = {},
    currentLayer = "landscape",
    currentTileId = "MB";

let currentTool = "brush",
    dragStart = null,
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
                if(!(currentLayer === 'landscape' && t.tags.includes('landscape'))){ // ensure landscape tiles only show on landscape
                     // return; // Skip if not directly tagged for the layer, unless it's a general building component
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

function updateTileInfoDisplay(x, y) {
    let topTileData = null;
    let topLayerName = "";

    // Determine the topmost visible tile data and its layer
    // Order matters: roof, item, building, landscape
    if (layerVisibility.roof && layers.roof?.[y]?.[x]) {
        topTileData = layers.roof[y][x];
        topLayerName = "roof";
    }
    // Check !topTileData ensures we only take the first one found if layers overlap.
    // However, the logic below now correctly prioritizes: roof > item > building > landscape
    // So, we find the highest layer with data.

    let currentTopData = null; // Temp variable to hold data from a specific layer

    currentTopData = layers.landscape?.[y]?.[x];
    if (layerVisibility.landscape && currentTopData) {
        topTileData = currentTopData;
        topLayerName = "landscape";
    }

    currentTopData = layers.building?.[y]?.[x];
    if (layerVisibility.building && currentTopData) {
        topTileData = currentTopData;
        topLayerName = "building";
    }

    currentTopData = layers.item?.[y]?.[x];
    if (layerVisibility.item && currentTopData) {
        topTileData = currentTopData;
        topLayerName = "item";
    }

    currentTopData = layers.roof?.[y]?.[x];
    if (layerVisibility.roof && currentTopData) {
        topTileData = currentTopData;
        topLayerName = "roof";
    }

    const tileInfoDetailsDiv = document.getElementById("tileInfoDetails");
    if (!tileInfoDetailsDiv) {
        console.error("Tile info details div not found!");
        return;
    }

    if (topTileData) {
        const tileId = (typeof topTileData === 'object' && topTileData !== null) ? topTileData.id : topTileData;
        let tileInstance = layers[topLayerName]?.[y]?.[x]; // Get the actual instance from the layer
        const tileDef = assetManager.getTileDefinition(tileId);

        if (tileDef) {
            // If it's a container and stored as a string, convert to object for editing
            if (typeof tileInstance === 'string' && tileDef.tags && tileDef.tags.includes('container')) {
                layers[topLayerName][y][x] = {
                    id: tileInstance,
                    contents: JSON.parse(JSON.stringify(tileDef.contents || [])),
                    capacity: tileDef.capacity || 10,
                    isLocked: tileDef.isLocked || false,
                    lockDifficulty: tileDef.lockDifficulty || 0,
                    uniqueID: tileDef.uniqueID || ""
                };
                tileInstance = layers[topLayerName][y][x]; // Update reference
                snapshot(); // Make this conversion undoable
            }

            let propertiesHtml = `<p><strong>Name:</strong> ${tileDef.name || 'N/A'}</p>`;
            propertiesHtml += `<p><strong>ID:</strong> ${tileId}</p>`;
            propertiesHtml += `<p><strong>Sprite:</strong> <span style="color: ${tileDef.color || '#000'};">${tileDef.sprite || '?'}</span></p>`;
            propertiesHtml += `<p><strong>Color:</strong> ${tileDef.color || 'N/A'}</p>`;
            propertiesHtml += `<p><strong>Tags:</strong> ${tileDef.tags ? tileDef.tags.join(', ') : 'None'}</p>`;
            propertiesHtml += `<p><strong>Layer:</strong> ${topLayerName}</p>`;
            propertiesHtml += `<p><strong>Coords:</strong> [${x}, ${y}]</p>`;

            // Revised Generic Property Display Loop
            propertiesHtml += "<h4>Base Definition Properties:</h4>";
            const isContainer = tileDef.tags && tileDef.tags.includes('container');
            const defaultExclusions = ['name', 'sprite', 'color', 'tags'];
            const containerExclusions = ['contents', 'capacity', 'isLocked', 'lockDifficulty', 'uniqueID', 'itemLink'];

            for (const key in tileDef) {
                if (Object.prototype.hasOwnProperty.call(tileDef, key)) {
                    if (defaultExclusions.includes(key)) continue;
                    if (isContainer && containerExclusions.includes(key)) continue;

                    let valueDisplay = JSON.stringify(tileDef[key]);
                    if (tileDef[key] === true) {
                        valueDisplay = "<strong style='color: green;'>true</strong>";
                    } else if (tileDef[key] === false) {
                        valueDisplay = "<span style='color: red;'>false</span>";
                    }
                    propertiesHtml += `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${valueDisplay}</p>`;
                }
            }
            propertiesHtml += "<hr/>";

            // Editable fields for containers
            if (isContainer && typeof tileInstance === 'object') { // Ensure tileInstance is an object for editable fields
                propertiesHtml += `<h4>Instance Properties (Editable):</h4>`;
                propertiesHtml += `<div><label>Contents (JSON): <textarea class="prop-input" data-prop="contents" data-x="${x}" data-y="${y}" data-layer="${topLayerName}">${JSON.stringify(tileInstance.contents || [])}</textarea></label></div>`;
                propertiesHtml += `<div><label>Capacity: <input type="number" class="prop-input" data-prop="capacity" value="${tileInstance.capacity || 0}" data-x="${x}" data-y="${y}" data-layer="${topLayerName}"></label></div>`;
                propertiesHtml += `<div><label>Is Locked: <input type="checkbox" class="prop-input" data-prop="isLocked" ${tileInstance.isLocked ? "checked" : ""} data-x="${x}" data-y="${y}" data-layer="${topLayerName}"></label></div>`;
                propertiesHtml += `<div><label>Lock Difficulty: <input type="number" class="prop-input" data-prop="lockDifficulty" value="${tileInstance.lockDifficulty || 0}" data-x="${x}" data-y="${y}" data-layer="${topLayerName}" ${!tileInstance.isLocked ? "disabled" : ""}></label></div>`;
                propertiesHtml += `<div><label>Unique ID: <input type="text" class="prop-input" data-prop="uniqueID" value="${tileInstance.uniqueID || ""}" data-x="${x}" data-y="${y}" data-layer="${topLayerName}" ${!tileInstance.isLocked ? "disabled" : ""}></label></div>`;
            }
            tileInfoDetailsDiv.innerHTML = propertiesHtml;

            // Add event listeners for the new inputs
            tileInfoDetailsDiv.querySelectorAll('.prop-input').forEach(input => {
                input.onchange = handlePropertyChange;
                if (input.type === 'text' || input.type === 'number' || input.type === 'textarea') {
                    input.onkeyup = handlePropertyChange; // For more immediate feedback on text/number inputs
                }
            });

        } else {
            tileInfoDetailsDiv.innerHTML = `<p>Clicked on tile ID: "${tileId}" at [${x}, ${y}] on layer "${topLayerName}".</p><p>No definition found in tileset.</p>`;
        }
    } else {
        tileInfoDetailsDiv.innerHTML = "<p>Clicked on an empty cell.</p>";
    }
}

// Handler for property changes
function handlePropertyChange(event) {
    const input = event.target;
    const x = parseInt(input.dataset.x, 10);
    const y = parseInt(input.dataset.y, 10);
    const layerName = input.dataset.layer;
    const propertyName = input.dataset.prop;

    if (isNaN(x) || isNaN(y) || !layerName || !propertyName) {
        console.error("Invalid data attributes for property input:", input.dataset);
        return;
    }

    const tileInstance = layers[layerName]?.[y]?.[x];
    if (typeof tileInstance === 'object' && tileInstance !== null) {
        let value;
        if (input.type === 'checkbox') {
            value = input.checked;
        } else if (input.type === 'number') {
            value = parseInt(input.value, 10);
            if (isNaN(value)) value = 0; // Default for NaN
        } else if (input.type === 'textarea' && propertyName === 'contents') {
            try {
                value = JSON.parse(input.value);
            } catch (e) {
                console.warn("Invalid JSON for contents:", e);
                // Optionally, provide UI feedback to the user here
                return; // Don't update if JSON is invalid
            }
        } else {
            value = input.value;
        }

        tileInstance[propertyName] = value;
        snapshot(); // Record change for undo

        // Special handling for isLocked
        if (propertyName === 'isLocked') {
            const uniqueIdInput = tileInfoDetailsDiv.querySelector(`input[data-prop="uniqueID"][data-x="${x}"][data-y="${y}"][data-layer="${layerName}"]`);
            const lockDifficultyInput = tileInfoDetailsDiv.querySelector(`input[data-prop="lockDifficulty"][data-x="${x}"][data-y="${y}"][data-layer="${layerName}"]`);

            if (value && !tileInstance.uniqueID) { // If locked and no uniqueID, generate one
                tileInstance.uniqueID = "lock_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
                if (uniqueIdInput) uniqueIdInput.value = tileInstance.uniqueID;
            }
            if (uniqueIdInput) uniqueIdInput.disabled = !value;
            if (lockDifficultyInput) lockDifficultyInput.disabled = !value;
        }
        // No need to call renderMergedGrid() here as tile appearance doesn't change based on these props
        // But if it did, or if other UI elements depended on it, a targeted re-render or full renderMergedGrid() might be needed.
    } else {
        console.error("Tile instance not found or not an object at:", x, y, layerName);
    }
}


function renderMergedGrid() {
    gridContainer.innerHTML = "";
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            let finalTileIdToRender = "";
            let finalTileData = null; // Will hold the actual data (string or object) for the top tile

            if (layerVisibility.landscape && layers.landscape?.[y]?.[x]) {
                finalTileData = layers.landscape[y][x];
            }
            // Building layer can overwrite landscape
            if (layerVisibility.building && layers.building?.[y]?.[x]) {
                const buildingData = layers.building[y][x];
                if (buildingData || (typeof buildingData === 'object' && buildingData !== null)) { // Check if not empty string or null/undefined object
                    finalTileData = buildingData;
                }
            }
            // Item layer can overwrite building/landscape
            if (layerVisibility.item && layers.item?.[y]?.[x]) {
                const itemData = layers.item[y][x];
                if (itemData || (typeof itemData === 'object' && itemData !== null)) {
                    finalTileData = itemData;
                }
            }
            // Roof layer can overwrite item/building/landscape
            if (layerVisibility.roof && layers.roof?.[y]?.[x]) {
                const roofData = layers.roof[y][x];
                if (roofData || (typeof roofData === 'object' && roofData !== null )) {
                     finalTileData = roofData;
                }
            }

            if (finalTileData !== null && finalTileData !== undefined && finalTileData !== "") {
                 finalTileIdToRender = (typeof finalTileData === 'object' && finalTileData.id) ? finalTileData.id : finalTileData;
            }

            const c = document.createElement("div");
            c.className = "cell"; c.dataset.x = x; c.dataset.y = y;
            
            const tileDef = assetManager.getTileDefinition(finalTileIdToRender);
            // console.log("Rendering tile:", finalTileIdToRender, "Def:", tileDef); // Debugging line from previous step, can be removed or kept
            if (finalTileIdToRender && tileDef) {
                c.textContent = tileDef.sprite;
                c.style.color = tileDef.color;
            } else if (finalTileIdToRender) {
                c.textContent = '?';
                c.style.color = 'magenta'; 
            }


            // stamp preview
            if (currentTool === "stamp" && stampData && previewPos) {
                const dx = x - previewPos.x, dy = y - previewPos.y;
                if (dx >= 0 && dy >= 0 && dx < stampData.w && dy < stampData.h) {
                    const pid = stampData.data[dy][dx];
                    const stampTileDef = assetManager.getTileDefinition(pid); // MODIFIED LINE for stamp preview
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

            // >>> START NEW PORTAL RENDERING LOGIC <<<
            if (layers.portals && Array.isArray(layers.portals)) {
                const portalAtThisCell = layers.portals.find(p => p.x === x && p.y === y);
                if (portalAtThisCell) {
                    // Apply a distinct border for portals
                    c.style.border = "2px dashed #FF00FF"; // Magenta dashed border

                    // Add a title to show it's a portal on hover
                    let portalTitle = "Portal";
                    if (portalAtThisCell.targetMap) {
                        portalTitle += ` to ${portalAtThisCell.targetMap}`;
                        if (portalAtThisCell.targetX !== undefined && portalAtThisCell.targetY !== undefined) {
                            portalTitle += ` (${portalAtThisCell.targetX},${portalAtThisCell.targetY})`;
                        }
                    }
                    c.title = portalTitle;
                }
            }
            // >>> END NEW PORTAL RENDERING LOGIC <<<

            // >>> START NEW NPC RENDERING LOGIC <<<
            if (layers.npc_spawns && Array.isArray(layers.npc_spawns)) {
                const npcAtThisCell = layers.npc_spawns.find(npc => npc.x === x && npc.y === y);
                if (npcAtThisCell) {
                    // Check if an NPC marker already exists to avoid duplicates
                    if (!c.querySelector('.npc-marker')) {
                        const npcMarker = document.createElement("div");
                        npcMarker.className = 'npc-marker';
                        npcMarker.textContent = "@"; // Placeholder sprite
                        npcMarker.style.position = "absolute";
                        npcMarker.style.left = "50%";
                        npcMarker.style.top = "50%";
                        npcMarker.style.transform = "translate(-50%, -50%)";
                        npcMarker.style.color = "red";
                        npcMarker.style.fontWeight = "bold";
                        npcMarker.style.pointerEvents = "none"; // Don't interfere with cell clicks
                        npcMarker.title = `NPC: ${npcAtThisCell.id}`; // Tooltip
                        c.appendChild(npcMarker);
                    }
                }
            }
            // >>> END NEW NPC RENDERING LOGIC <<<

            c.onmousedown = handleMouseDown;
            c.onmouseup = handleMouseUp;
            c.onclick = function() { // Added onclick listener
                const cellX = parseInt(this.dataset.x, 10);
                const cellY = parseInt(this.dataset.y, 10);
                updateTileInfoDisplay(cellX, cellY);
            };
            gridContainer.appendChild(c);
        }
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

function handleMouseDown(e) {
    const x = +e.target.dataset.x, y = +e.target.dataset.y;
    snapshot();
    if (currentTool === "brush") {
        placeTile(x, y, currentTileId);
        renderMergedGrid();
    } else if (currentTool === "fill") {
        floodFill(currentLayer, x, y, currentTileId);
        renderMergedGrid();
    } else if (currentTool === "placeNpc") {
        const npcId = prompt("Enter NPC ID (e.g., 'guard1', 'shopkeeper'):");
        if (npcId && npcId.trim() !== "") {
            snapshot(); // For undo functionality
            layers.npc_spawns.push({ x: x, y: y, id: npcId.trim() });
            renderMergedGrid();
        }
    } else {
        dragStart = { x, y };
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
            case "p": currentTool = "placeNpc"; break; // New case
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
        currentTool = btn.dataset.tool;
        document.querySelectorAll(".toolBtn")
            .forEach(b => b.classList.toggle("selected", b === btn));
    };
});
document.getElementById("layerSelect").onchange = () => { buildPalette(); renderMergedGrid(); };
["landscape", "building", "item", "roof"].forEach(layerName => {
    const checkbox = document.getElementById("vis_" + layerName);
    if (checkbox) { // Ensure checkbox exists
        checkbox.onchange = function() { // Use 'function' to access 'this' as the checkbox
            if (layerVisibility.hasOwnProperty(layerName)) { // Check if property exists
                layerVisibility[layerName] = this.checked; // Update state
                renderMergedGrid(); // Re-render
            } else {
                console.warn(`Layer name "${layerName}" not found in layerVisibility object.`);
            }
        };
    } else {
        console.warn(`Checkbox with ID "vis_${layerName}" not found.`);
    }
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
        layers: layers,
        // Optionally, include other metadata like npc_spawns, portals if the editor supports them
        npc_spawns: layers.npc_spawns || [], // Example, assuming these might be added later
        portals: layers.portals || [] 
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
            layers.portals = d.portals || [];


            // It's crucial to re-initialize the map (or at least parts of it)
            // after changing gridWidth/gridHeight and layers.
            // renderMergedGrid() alone might not be enough if underlying cell elements need recreation.
            // Calling a slimmed-down init or a dedicated resize function is better.
            // For now, directly calling render.
            renderMergedGrid(); // Re-render with new dimensions and content
            alert(`Map "${d.name || d.id || 'Unknown'}" loaded!`);
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

    layers.landscape = createDefaultLandscape(gridWidth, gridHeight);
    layers.building = createEmptyGrid(gridWidth, gridHeight, "");
    layers.item = createEmptyGrid(gridWidth, gridHeight, "");
    layers.roof = createEmptyGrid(gridWidth, gridHeight, "");
    layers.npc_spawns = []; // Initialize npc_spawns

    buildPalette();
    renderMergedGrid();
}
window.onload = initMap;

// instead of only setting currentLayer…
document.getElementById("layerSelect").onchange = e => {
    currentLayer = e.target.value;
    buildPalette();       // ← rebuilds the palette for the new layer
    renderMergedGrid();   // ← re‐renders the map so you see any layer‐specific tiles
};
