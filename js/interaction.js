// js/interaction.js

const DOOR_OPEN_MAP = {
    "WDH": "WOH", "WDV": "WOV", "MDH": "MOH", "MDV": "MOV",
    "WinCH": "WinOH", "WinCV": "WinOV"
};

const DOOR_CLOSE_MAP = Object.fromEntries(
    Object.entries(DOOR_OPEN_MAP).map(([closed, open]) => [open, closed])
);

const DOOR_BREAK_MAP = {
    "WDH": "WDB", "WDV": "WDB", "WOH": "WDB", "WOV": "WDB",
    "MDH": "MDB", "MDV": "MDB", "MOH": "MDB", "MOV": "MDB",
    "WinCH": "WinB", "WinCV": "WinB", "WinOH": "WinB", "WinOV": "WinB"
};

// --- Internal Helper Functions ---
// (Prefixed with _ to indicate they are intended for internal use within this module)
function _getActionsForItem(it) {
    if (!assetManagerInstance) {
        console.error("Interaction module not initialized with AssetManager for _getActionsForItem.");
        return ["Cancel"];
    }
    const tileDef = assetManagerInstance.tilesets[it.id];
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

function _performAction(action, it) {
    const { x, y, id } = it;
    const currentMap = window.mapRenderer.getCurrentMapData(); // Assumes mapRenderer is globally available
    if (!currentMap || !currentMap.layers.building) {
        logToConsole("Error: Building layer not found in current map data."); // Assumes logToConsole is global
        return;
    }
    const B = currentMap.layers.building;
    let targetTileId = B[y]?.[x];

    if (!targetTileId) {
        logToConsole(`Error: No building tile found at ${x},${y} to perform action.`);
        return;
    }

    if (!assetManagerInstance) {
        console.error("Interaction module not initialized with AssetManager for _performAction.");
        return;
    }
    const tileName = assetManagerInstance.tilesets[id]?.name || id;

    if (action === "Open" && DOOR_OPEN_MAP[targetTileId]) {
        B[y][x] = DOOR_OPEN_MAP[targetTileId];
        logToConsole(`Opened ${tileName}`);
    } else if (action === "Close" && DOOR_CLOSE_MAP[targetTileId]) {
        B[y][x] = DOOR_CLOSE_MAP[targetTileId];
        logToConsole(`Closed ${tileName}`);
    } else if (action === "Break Down" && DOOR_BREAK_MAP[targetTileId]) {
        B[y][x] = DOOR_BREAK_MAP[targetTileId];
        logToConsole(`Broke ${tileName}`);
    } else if (action === "Inspect" || action === "Loot") {
        logToConsole(`${action}ing ${tileName}`);
    }

    window.mapRenderer.scheduleRender();
    window.interaction.detectInteractableItems();
    window.interaction.showInteractableItems();
    window.mapRenderer.updateMapHighlight();
}


// --- Public API via window.interaction ---
window.interaction = {
    initInteraction: function (assetMgr) {
        console.log("Attempting to initialize Interaction system's assetManagerInstance.");
        if (assetMgr) {
            assetManagerInstance = assetMgr;
            console.log("Interaction system's assetManagerInstance has been SET.", assetManagerInstance);
            if (assetManagerInstance && typeof assetManagerInstance.getTileset === 'function') {
                console.log("assetManagerInstance appears to be a valid AssetManager.");
            } else {
                console.error("assetManagerInstance was set, but it does NOT look like a valid AssetManager.", assetManagerInstance);
            }
        } else {
            console.error("Interaction system initInteraction called WITHOUT an AssetManager. assetManagerInstance remains null.");
        }
    },

    detectInteractableItems: function () {
        console.log("detectInteractableItems called. Current assetManagerInstance:", assetManagerInstance);
        const R = 1;
        const { x: px, y: py } = gameState.playerPos; // Assumes gameState is global
        gameState.interactableItems = [];

        const currentMap = window.mapRenderer.getCurrentMapData(); // Assumes mapRenderer is global
        if (!currentMap || !currentMap.layers || !currentMap.dimensions) return;

        if (!assetManagerInstance) {
            console.error("Interaction module not initialized with AssetManager for detectInteractableItems.");
            return;
        }

        const mapHeight = currentMap.dimensions.height;
        const mapWidth = currentMap.dimensions.width;

        for (let y_scan = Math.max(0, py - R); y_scan <= Math.min(mapHeight - 1, py + R); y_scan++) {
            for (let x_scan = Math.max(0, px - R); x_scan <= Math.min(mapWidth - 1, px + R); x_scan++) {
                let tileId = null;
                if (currentMap.layers.item?.[y_scan]?.[x_scan]) {
                    tileId = currentMap.layers.item[y_scan][x_scan];
                } else if (currentMap.layers.building?.[y_scan]?.[x_scan]) {
                    tileId = currentMap.layers.building[y_scan][x_scan];
                }

                if (!tileId) continue;

                const tileDef = assetManagerInstance.tilesets[tileId];
                if (tileDef && tileDef.tags && tileDef.tags.includes("interactive")) {
                    gameState.interactableItems.push({ x: x_scan, y: y_scan, id: tileId });
                }
            }
        }
    },

    showInteractableItems: function () {
        const list = document.getElementById("itemList");
        if (!list) return;
        list.innerHTML = "";

        if (!assetManagerInstance) {
            console.error("Interaction module not initialized with AssetManager for showInteractableItems.");
            return;
        }

        gameState.interactableItems.forEach((it, idx) => {
            const div = document.createElement("div");
            const tileDef = assetManagerInstance.tilesets[it.id] || { name: it.id };
            div.textContent = `${idx + 1}. ${tileDef.name}`;

            if (idx === gameState.selectedItemIndex) {
                div.classList.add("selected");
            }
            div.onclick = () => window.interaction.selectItem(idx);
            list.appendChild(div);
        });
    },

    selectItem: function (idx) {
        if (idx >= 0 && gameState.interactableItems && idx < gameState.interactableItems.length) {
            gameState.selectedItemIndex = idx;
            this.showInteractableItems();
            window.mapRenderer.updateMapHighlight(); // Assumes mapRenderer is global
        }
    },

    selectAction: function (number) {
        const actionList = document.getElementById('actionList');
        if (!actionList) return;
        const actions = actionList.children;
        if (number >= 0 && number < actions.length) {
            gameState.selectedActionIndex = number;
            Array.from(actions).forEach((action, index) => {
                action.classList.toggle('selected', index === gameState.selectedActionIndex);
            });
        }
    },

    interact: function () {
        if (gameState.selectedItemIndex === -1 ||
            !gameState.interactableItems ||
            gameState.selectedItemIndex >= gameState.interactableItems.length) return;

        const item = gameState.interactableItems[gameState.selectedItemIndex];
        const actions = _getActionsForItem(item); // Use internal helper
        const actionList = document.getElementById('actionList');
        if (!actionList) return;

        actionList.innerHTML = '';
        gameState.selectedActionIndex = -1;
        gameState.isActionMenuActive = true;

        actions.forEach((action, index) => {
            const el = document.createElement("div");
            el.textContent = `${index + 1}. ${action}`;
            el.classList.add("action-item");
            el.onclick = () => this.selectAction(index);
            actionList.appendChild(el);
        });
    },

    performSelectedAction: function () {
        if (gameState.selectedActionIndex === -1) return;
        const actionList = document.getElementById('actionList');
        if (!actionList) return;
        const selectedActionElement = actionList.children[gameState.selectedActionIndex];
        if (!selectedActionElement) return;

        const actionText = selectedActionElement.textContent.split('. ')[1];
        const item = gameState.interactableItems[gameState.selectedItemIndex];

        logToConsole(`Performing action: ${actionText} on ${item.id} at (${item.x}, ${item.y})`); // Assumes logToConsole global

        if (actionText === "Cancel") {
            _performAction(actionText, item); // Use internal helper
        } else if (gameState.actionPointsRemaining > 0) {
            gameState.actionPointsRemaining--;
            // updateTurnUI is still in script.js and global for now
            if (typeof updateTurnUI === 'function') updateTurnUI(); else console.warn("updateTurnUI not found globally");
            _performAction(actionText, item); // Use internal helper
        } else {
            logToConsole("No actions left for this turn.");
        }
        this.cancelActionSelection();
    },

    cancelActionSelection: function () {
        gameState.isActionMenuActive = false;
        const actionList = document.getElementById('actionList');
        if (actionList) actionList.innerHTML = '';
        window.mapRenderer.updateMapHighlight(); // Assumes mapRenderer is global
    }
};