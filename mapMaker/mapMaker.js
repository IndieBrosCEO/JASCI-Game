// mapMaker.js

// --- 1) Initial grid size & CSS var ---
let gridWidth = parseInt(document.getElementById("inputWidth").value, 10) || 20;
let gridHeight = parseInt(document.getElementById("inputHeight").value, 10) || 15;
document.documentElement.style.setProperty("--cols", gridWidth);

// --- 2) Tile Palette ---
const tilePalette = {
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
    "WD": { sprite: "~", name: "Deep Water", color: "darkblue", tags: ["landscape", "water", "floor"] },
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
    "WDH": { sprite: "─", name: "Wood Door Hz", color: "brown", tags: ["door", "wood", "impassable", "interactive", "building"] },
    "WDV": { sprite: "│", name: "Wood Door Vt", color: "brown", tags: ["door", "wood", "impassable", "interactive", "building"] },
    "WOH": { sprite: "┄", name: "Wood Door Hz Open", color: "brown", tags: ["door", "wood", "interactive", "building"] },
    "WOV": { sprite: "┆", name: "Wood Door Vt Open", color: "brown", tags: ["door", "wood", "interactive", "building"] },
    "WDB": { sprite: ">", name: "Wood Door Broken", color: "brown", tags: ["door", "wood", "interactive", "building"] },

    "MDH": { sprite: "─", name: "Metal Door Hz", color: "gray", tags: ["door", "metal", "impassable", "interactive", "building"] },
    "MDV": { sprite: "│", name: "Metal Door Vt", color: "gray", tags: ["door", "metal", "impassable", "interactive", "building"] },
    "MOH": { sprite: "┄", name: "Metal Door Hz Open", color: "gray", tags: ["door", "metal", "interactive", "building"] },
    "MOV": { sprite: "┆", name: "Metal Door Vt Open", color: "gray", tags: ["door", "metal", "interactive", "building"] },
    "MDB": { sprite: ">", name: "Metal Door Broken", color: "gray", tags: ["door", "metal", "interactive", "building"] },

    // ───────────────────────────────────────────────────────────────────────────────
    // Windows
    // ───────────────────────────────────────────────────────────────────────────────
    "WinCH": { sprite: "─", name: "Window Hz Closed", color: "cyan", tags: ["window", "building", "impassable"] },
    "WinCV": { sprite: "│", name: "Window Vt Closed", color: "cyan", tags: ["window", "building", "impassable"] },
    "WinOH": { sprite: "┄", name: "Window Hz Open", color: "cyan", tags: ["window", "building"] },
    "WinOV": { sprite: "┆", name: "Window Vt Open", color: "cyan", tags: ["window", "building"] },
    "WinB": { sprite: ">", name: "Window Broken", color: "cyan", tags: ["window", "building"] },

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
};


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

    Object.entries(tilePalette).forEach(([id, t]) => {
        const allowed = (currentLayer === "landscape")
            ? t.tags.includes("landscape")
            : t.tags.includes(currentLayer);
        if (!allowed) return;
        const d = document.createElement("div");
        d.className = "palette"; d.dataset.tileId = id;
        d.textContent = t.sprite; d.style.color = t.color;
        d.title = `${t.name} (${id})`;
        d.onclick = () => { currentTileId = id; updatePalette(); };
        paletteContainer.appendChild(d);
    });
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
            if (layerVisibility.landscape && layers.landscape[y][x]) id = layers.landscape[y][x];
            if (layerVisibility.building && layers.building[y][x]) id = layers.building[y][x];
            if (layerVisibility.item && layers.item[y][x]) id = layers.item[y][x];
            if (layerVisibility.roof && layers.roof[y][x]) id = layers.roof[y][x];

            const c = document.createElement("div");
            c.className = "cell"; c.dataset.x = x; c.dataset.y = y;
            if (id && tilePalette[id]) {
                c.textContent = tilePalette[id].sprite;
                c.style.color = tilePalette[id].color;
            }

            // stamp preview
            if (currentTool === "stamp" && stampData && previewPos) {
                const dx = x - previewPos.x, dy = y - previewPos.y;
                if (dx >= 0 && dy >= 0 && dx < stampData.w && dy < stampData.h) {
                    const pid = stampData.data[dy][dx];
                    if (pid && tilePalette[pid]) {
                        c.textContent = tilePalette[pid].sprite;
                        c.style.color = tilePalette[pid].color;
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
    const data = { width: gridWidth, height: gridHeight, layers };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "map.json";
    a.click(); URL.revokeObjectURL(url);
};
document.getElementById("loadBtn").onclick = () => {
    const fi = document.getElementById("mapFileInput");
    if (!fi.files.length) { alert("Select a .json file"); return; }
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const d = JSON.parse(ev.target.result);
            ["landscape", "building", "item", "roof"].forEach(l => {
                layers[l] = d.layers[l] || layers[l];
            });
            renderMergedGrid();
            alert("Map loaded!");
        } catch (err) {
            alert("Error parsing map: " + err);
        }
    };
    reader.readAsText(fi.files[0]);
};

// --- 11) Init on load ---
function initMap() {
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
