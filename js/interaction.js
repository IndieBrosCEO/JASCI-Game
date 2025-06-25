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
    if (!tileDef) return ["Cancel"]; // Now this is safe

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
    const { x, y, z, id } = it; // 'it' now contains x, y, z, id, name

    const currentMap = window.mapRenderer.getCurrentMapData();
    if (!currentMap || !currentMap.levels) {
        logToConsole("Error: Map data or levels not found for _performAction.");
        return;
    }

    const zStr = z.toString();
    const levelData = currentMap.levels[zStr];
    if (!levelData || !levelData.middle) { // Assuming doors/interactables that change state are on 'middle'
        logToConsole(`Error: Level data or middle layer not found for Z-level ${z} at (${x},${y}) to perform action.`);
        return;
    }

    // Get the actual tile ID from the map (it might be an object)
    let tileOnMapRaw = levelData.middle[y]?.[x];
    // TODO: Determine if we need to check 'bottom' as well, or if 'middle' is always the target for state changes.
    // For doors, 'middle' is correct. For items that might be on 'bottom', this needs thought.
    // For now, focusing on 'middle' as doors are the primary issue.

    let currentTileIdOnMap = (typeof tileOnMapRaw === 'object' && tileOnMapRaw !== null && tileOnMapRaw.tileId !== undefined)
        ? tileOnMapRaw.tileId
        : tileOnMapRaw;

    // it.id is the ID of the tile definition (e.g., "WDH"). 
    // currentTileIdOnMap is what's currently on the map at that x,y,z.
    // For state changes (like opening a door), currentTileIdOnMap is what we compare against DOOR_OPEN_MAP etc.
    // And it.id (the definition ID) is used for getting the name.

    if (!currentTileIdOnMap && action !== "Cancel") { // Allow "Cancel" even if tile somehow vanished
        logToConsole(`Error: No tile found on middle layer at (${x},${y}, Z:${z}) to perform action '${action}'. Expected tile around ID: ${id}`);
        return;
    }

    if (!assetManagerInstance) {
        console.error("Interaction module not initialized with AssetManager for _performAction.");
        return;
    }
    const tileName = assetManagerInstance.tilesets[id]?.name || id; // Use 'id' from 'it' for the base name

    // Actions that modify the map state
    if (action === "Open" && DOOR_OPEN_MAP[currentTileIdOnMap]) {
        levelData.middle[y][x] = DOOR_OPEN_MAP[currentTileIdOnMap];
        logToConsole(`Opened ${tileName}`);
    } else if (action === "Close" && DOOR_CLOSE_MAP[currentTileIdOnMap]) {
        levelData.middle[y][x] = DOOR_CLOSE_MAP[currentTileIdOnMap];
        logToConsole(`Closed ${tileName}`);
    } else if (action === "Break Down" && DOOR_BREAK_MAP[currentTileIdOnMap]) {
        levelData.middle[y][x] = DOOR_BREAK_MAP[currentTileIdOnMap];
        logToConsole(`Broke ${tileName}`);
    } else if (action === "Inspect" || action === "Loot") {
        // Get tile definition to check its tags
        const tileDef = assetManagerInstance.tilesets[it.id]; // 'it' is the interacted item/tile object {x,y,id,name}

        if (tileDef && tileDef.tags && tileDef.tags.includes("container")) {
            if (action === "Loot") {
                // Specific, minimal action for "Loot" on a container
                logToConsole(`Interacted with ${tileName}. Check inventory when nearby to see contents.`);
            } else if (action === "Inspect") {
                // Default inspect behavior for a container
                logToConsole(`Inspecting ${tileName}: It's a container. Contents visible in inventory when nearby.`);
                // Alternative using description:
                // logToConsole(`Inspecting ${tileName}: ${tileDef.description || 'A container.'}`);
            }
        } else {
            // Default behavior for non-container items that might be inspectable/lootable
            // (or if tileDef is missing for some reason)
            logToConsole(`${action}ing ${tileName}.`); // Added a period for consistency
        }
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
        // console.log("detectInteractableItems called. Current assetManagerInstance:", assetManagerInstance);
        const R = 1; // Interaction radius
        const playerPos = gameState.playerPos;

        if (!playerPos || typeof playerPos.x !== 'number' || typeof playerPos.y !== 'number' || typeof playerPos.z !== 'number') {
            // console.warn("detectInteractableItems: Player position is invalid or incomplete.", playerPos);
            gameState.interactableItems = [];
            return;
        }

        const { x: px, y: py, z: pz } = playerPos;
        gameState.interactableItems = [];

        const currentMap = window.mapRenderer.getCurrentMapData();
        if (!currentMap || !currentMap.levels || !currentMap.dimensions) {
            // console.warn("detectInteractableItems: Map data is invalid or incomplete.");
            return;
        }

        if (!assetManagerInstance || typeof assetManagerInstance.getTileset !== 'function') {
            console.error("Interaction module's assetManagerInstance is not valid for detectInteractableItems.");
            return;
        }

        const mapHeight = currentMap.dimensions.height;
        const mapWidth = currentMap.dimensions.width;
        const currentZ = pz; // Interact on the player's current Z level
        const zStr = currentZ.toString();
        const levelData = currentMap.levels[zStr];

        if (!levelData) {
            // console.warn(`detectInteractableItems: No level data for Z-level ${currentZ}.`);
            return;
        }

        for (let y_scan = Math.max(0, py - R); y_scan <= Math.min(mapHeight - 1, py + R); y_scan++) {
            for (let x_scan = Math.max(0, px - R); x_scan <= Math.min(mapWidth - 1, px + R); x_scan++) {
                let tileIdFromMap = null;
                let sourceLayer = null; // To help debug or prioritize if needed

                // Prioritize 'middle' layer for interactables like doors, containers
                if (levelData.middle?.[y_scan]?.[x_scan]) {
                    tileIdFromMap = levelData.middle[y_scan][x_scan];
                    sourceLayer = 'middle';
                }
                // If nothing on 'middle', check 'bottom' (e.g., for items on the floor)
                else if (levelData.bottom?.[y_scan]?.[x_scan]) {
                    tileIdFromMap = levelData.bottom[y_scan][x_scan];
                    sourceLayer = 'bottom';
                }

                if (!tileIdFromMap) continue;

                // Handle cases where tileIdFromMap might be an object {tileId: "actualID", ...}
                const baseTileId = (typeof tileIdFromMap === 'object' && tileIdFromMap !== null && tileIdFromMap.tileId !== undefined)
                    ? tileIdFromMap.tileId
                    : tileIdFromMap;

                if (!baseTileId) continue; // Skip if after extraction, baseTileId is empty or null

                const tileDef = assetManagerInstance.tilesets[baseTileId];

                if (tileDef && tileDef.tags &&
                    (tileDef.tags.includes("interactive") || tileDef.tags.includes("door") || tileDef.tags.includes("container"))) {

                    // Ensure the item isn't already added (e.g. if player is standing on it and it's in 0,0 relative)
                    // This check is basic; more robust might involve unique IDs if items could stack or have instances
                    const alreadyExists = gameState.interactableItems.some(item => item.x === x_scan && item.y === y_scan && item.z === currentZ && item.id === baseTileId);
                    if (!alreadyExists) {
                        gameState.interactableItems.push({
                            x: x_scan,
                            y: y_scan,
                            z: currentZ,
                            id: baseTileId,
                            name: tileDef.name || baseTileId, // Fallback to ID if name is missing
                            // originalTileData: tileIdFromMap // Optionally store the raw tile data from map
                        });
                    }
                }
            }
        }
        // console.log("Interactable items detected:", gameState.interactableItems);
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
            let displayName = it.name; // Use the name property directly if it exists
            if (!displayName) { // Fallback for items that might not have had .name set (older saves, other code paths)
                const tileDef = assetManagerInstance.tilesets[it.id];
                displayName = tileDef ? tileDef.name : it.id;
            }
            div.textContent = `${idx + 1}. ${displayName}`;

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
            if (window.turnManager && typeof window.turnManager.updateTurnUI === 'function') { window.turnManager.updateTurnUI(); } else { console.error("window.turnManager.updateTurnUI is not available."); }
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