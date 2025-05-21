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
