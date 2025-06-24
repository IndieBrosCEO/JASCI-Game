// mapMaker/mapDataManager.js
"use strict";

import { createEmptyGrid } from './gridUtils.js';
import { UNDO_STACK_LIMIT, DEFAULT_MAP_ID_PREFIX, DEFAULT_MAP_NAME, DEFAULT_START_POS_X_DIVISOR, DEFAULT_START_POS_Y_DIVISOR, DEFAULT_START_POS_Z, LAYER_TYPES, LOG_MSG, ERROR_MSG } from './config.js';
import { logToConsole } from './config.js';

/**
 * @typedef {Object} MapPosition
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * @typedef {Object} MapLevelLayer
 * @property {Array<Array<string|object>>} bottom - Grid for bottom layer tiles.
 * @property {Array<Array<string|object>>} middle - Grid for middle layer tiles.
 */

/**
 * @typedef {Object} MapLevel
 * @property {MapLevelLayer} [levelData] - Holds the 'bottom' and 'middle' layer grids.
 */

/**
 * @typedef {Object} MapData
 * @property {string} id - Unique identifier for the map.
 * @property {string} name - User-friendly name of the map.
 * @property {number} width - Width of the map in tiles.
 * @property {number} height - Height of the map in tiles.
 * @property {MapPosition} startPos - Player's starting position.
 * @property {Object<string, MapLevelLayer>} levels - Contains data for each Z-level, keyed by Z index string.
 * @property {Array<object>} npcs - List of non-player characters on the map.
 * @property {Array<object>} portals - List of portals on the map.
 */

/** @type {MapData} */
let mapData = {};

const undoStack = [];
const redoStack = [];

/**
 * Retrieves the current map data object.
 * @returns {MapData} The current map data.
 */
export function getMapData() {
    return mapData;
}

/**
 * Sets the entire map data object. Used primarily during map loading.
 * @param {MapData} newMapData - The new map data to set.
 */
export function setMapData(newMapData) {
    mapData = newMapData;
    // Consider adding validation or transformation logic here if needed
    logToConsole("Map data has been replaced (e.g. by loading a new map).");
}

/**
 * Initializes a new, empty map structure.
 * @param {number} gridWidth - The width for the new map.
 * @param {number} gridHeight - The height for the new map.
 * @param {number} [initialZ=DEFAULT_START_POS_Z] - The initial Z-level to create.
 * @returns {MapData} The newly initialized map data object.
 */
export function initNewMap(gridWidth, gridHeight, initialZ = DEFAULT_START_POS_Z) {
    mapData = {
        id: DEFAULT_MAP_ID_PREFIX + Date.now(),
        name: DEFAULT_MAP_NAME,
        width: gridWidth,
        height: gridHeight,
        startPos: {
            x: Math.floor(gridWidth / DEFAULT_START_POS_X_DIVISOR),
            y: Math.floor(gridHeight / DEFAULT_START_POS_Y_DIVISOR),
            z: initialZ
        },
        levels: {}, // Z-levels will be added by ensureLayersForZ
        npcs: [],
        portals: []
    };
    ensureLayersForZ(initialZ, gridWidth, gridHeight, mapData); // Pass mapData to modify
    clearUndoRedoStacks();
    logToConsole("New map initialized:", JSON.parse(JSON.stringify(mapData))); // Log a copy
    return mapData;
}

/**
 * Ensures that a specific Z-level and its layer structures (bottom, middle) exist in the mapData.
 * If the Z-level or its layers do not exist, they are created and initialized with empty grids.
 * Also cleans up any old layer types (landscape, building, etc.) if found.
 *
 * @param {number} zLevel - The Z-level to ensure.
 * @param {number} currentGridWidth - The current width of the map grid.
 * @param {number} currentGridHeight - The current height of the map grid.
 * @param {MapData} targetMapData - The mapData object to modify. Usually the global mapData.
 * @param {boolean} [forceRecreate=false] - If true, forces recreation of layer grids (e.g. on resize).
 */
export function ensureLayersForZ(zLevel, currentGridWidth, currentGridHeight, targetMapData = mapData, forceRecreate = false) {
    const zStr = zLevel.toString();
    if (!targetMapData.levels) {
        targetMapData.levels = {};
    }

    let zLevelExists = targetMapData.levels[zStr];

    if (!zLevelExists || forceRecreate) {
        targetMapData.levels[zStr] = {
            [LAYER_TYPES.BOTTOM]: createEmptyGrid(currentGridWidth, currentGridHeight, ""),
            [LAYER_TYPES.MIDDLE]: createEmptyGrid(currentGridWidth, currentGridHeight, "")
        };
        if (!zLevelExists) logToConsole(LOG_MSG.INIT_LAYERS_FOR_Z(zStr));
        else logToConsole(`Re-initialized layers for Z-level: ${zStr} due to forceRecreate.`);
    } else {
        // Ensure bottom and middle layers exist if the Z-level object itself exists but layers might be missing
        if (!targetMapData.levels[zStr][LAYER_TYPES.BOTTOM] || forceRecreate) {
            targetMapData.levels[zStr][LAYER_TYPES.BOTTOM] = createEmptyGrid(currentGridWidth, currentGridHeight, "");
            logToConsole(LOG_MSG.INIT_MISSING_BOTTOM_LAYER(zStr));
        }
        if (!targetMapData.levels[zStr][LAYER_TYPES.MIDDLE] || forceRecreate) {
            targetMapData.levels[zStr][LAYER_TYPES.MIDDLE] = createEmptyGrid(currentGridWidth, currentGridHeight, "");
            logToConsole(LOG_MSG.INIT_MISSING_MIDDLE_LAYER(zStr));
        }
    }
    // Clean up old layer types if they exist from a loaded old-format map or during transition
    if (targetMapData.levels[zStr]) {
        delete targetMapData.levels[zStr].landscape;
        delete targetMapData.levels[zStr].building;
        delete targetMapData.levels[zStr].item;
        delete targetMapData.levels[zStr].roof;
    }
}

/**
 * Deletes a Z-level from the map data, including associated NPCs and portals.
 * @param {number} zToDelete - The Z-level to delete.
 * @param {MapData} currentMapData - The current map data.
 * @param {number} currentGridWidth - Current grid width for fallback layer creation.
 * @param {number} currentGridHeight - Current grid height for fallback layer creation.
 * @returns {{success: boolean, newCurrentEditingZ: number, error?: string}} Result of the operation.
 */
export function deleteZLevel(zToDelete, currentMapData, currentGridWidth, currentGridHeight) {
    const zToDeleteStr = zToDelete.toString();
    if (Object.keys(currentMapData.levels).length <= 1) {
        return { success: false, newCurrentEditingZ: zToDelete, error: ERROR_MSG.CANNOT_DELETE_LAST_Z };
    }
    if (!currentMapData.levels[zToDeleteStr]) {
        return { success: false, newCurrentEditingZ: zToDelete, error: ERROR_MSG.Z_LEVEL_DOES_NOT_EXIST(zToDelete) };
    }
    // Confirmation should be handled by the caller (e.g., eventHandler)
    // if (confirm(ERROR_MSG.CONFIRM_DELETE_Z_LEVEL(zToDelete))) { // Moved to caller
    snapshot(); // Snapshot includes the current mapData state
    delete currentMapData.levels[zToDeleteStr];
    logToConsole(LOG_MSG.DELETED_Z_LEVEL(zToDelete));

    const initialNpcCount = currentMapData.npcs.length;
    currentMapData.npcs = currentMapData.npcs.filter(npc => npc.mapPos?.z !== zToDelete);
    if (currentMapData.npcs.length < initialNpcCount) {
        logToConsole(LOG_MSG.REMOVED_NPCS_FROM_DELETED_Z(initialNpcCount - currentMapData.npcs.length, zToDelete));
    }

    const initialPortalCount = currentMapData.portals.length;
    currentMapData.portals = currentMapData.portals.filter(portal => portal.z !== zToDelete);
    if (currentMapData.portals.length < initialPortalCount) {
        logToConsole(LOG_MSG.REMOVED_PORTALS_FROM_DELETED_Z(initialPortalCount - currentMapData.portals.length, zToDelete));
    }

    let newCurrentEditingZ = zToDelete; // Default to the deleted Z, will be changed

    if (currentMapData.startPos.z === zToDelete) {
        const remainingZLevels = Object.keys(currentMapData.levels).map(Number);
        if (remainingZLevels.length > 0) {
            currentMapData.startPos.z = remainingZLevels.includes(DEFAULT_START_POS_Z) ? DEFAULT_START_POS_Z : remainingZLevels[0];
        } else {
            // This case should be prevented by the "cannot delete last Z-level" check
            currentMapData.startPos.z = DEFAULT_START_POS_Z;
        }
        logToConsole(LOG_MSG.PLAYER_START_Z_RESET(currentMapData.startPos.z));
    }

    // Determine the new currentEditingZ for the UI
    if (currentMapData.levels[currentMapData.startPos.z.toString()]) {
        newCurrentEditingZ = currentMapData.startPos.z;
    } else if (Object.keys(currentMapData.levels).length > 0) {
        newCurrentEditingZ = parseInt(Object.keys(currentMapData.levels)[0], 10);
    } else {
        // Should not be reached if "cannot delete last Z-level" holds.
        // If it is, create a default Z=0.
        newCurrentEditingZ = DEFAULT_START_POS_Z;
        ensureLayersForZ(newCurrentEditingZ, currentGridWidth, currentGridHeight, currentMapData);
    }

    return { success: true, newCurrentEditingZ };
    // }
    // return { success: false, newCurrentEditingZ: zToDelete, error: "Deletion cancelled by user." }; // If confirm was here
}

/**
 * Updates the width and height properties in the mapData object.
 * Note: This does NOT automatically resize the grid data within mapData.levels.
 * Resizing existing grids requires a separate, more complex operation (e.g., initMap or a dedicated resizeGridData function).
 * @param {number} newWidth - The new width for the map.
 * @param {number} newHeight - The new height for the map.
 */
export function updateMapDimensions(newWidth, newHeight) {
    mapData.width = newWidth;
    mapData.height = newHeight;
    logToConsole(`Map dimensions in mapData updated to ${newWidth}x${newHeight}. Grid data itself not resized by this function.`);
}


// --- Undo/Redo ---
/**
 * Creates a snapshot of the current mapData state for undo functionality.
 */
export function snapshot() {
    undoStack.push(JSON.parse(JSON.stringify(mapData)));
    if (undoStack.length > UNDO_STACK_LIMIT) {
        undoStack.shift(); // Remove the oldest state if stack exceeds limit
    }
    redoStack.length = 0; // Clear redo stack whenever a new action (and snapshot) is taken
    logToConsole("Snapshot taken. Undo stack size:", undoStack.length);
}

/**
 * Restores the mapData to its previous state from the undo stack.
 * @param {function(MapData):void} [uiUpdater] - Optional callback to update UI elements after state restoration.
 * @returns {boolean} True if undo was successful, false otherwise.
 */
export function undo(uiUpdater) {
    if (!undoStack.length) {
        logToConsole("Undo stack empty.");
        return false;
    }
    redoStack.push(JSON.parse(JSON.stringify(mapData))); // Save current state to redo stack
    mapData = undoStack.pop(); // Restore previous state
    logToConsole("Undo performed. Map data restored.");
    if (uiUpdater) uiUpdater(mapData);
    return true;
}

/**
 * Restores the mapData to a state from the redo stack.
 * @param {function(MapData):void} [uiUpdater] - Optional callback to update UI elements after state restoration.
 * @returns {boolean} True if redo was successful, false otherwise.
 */
export function redo(uiUpdater) {
    if (!redoStack.length) {
        logToConsole("Redo stack empty.");
        return false;
    }
    undoStack.push(JSON.parse(JSON.stringify(mapData))); // Save current state to undo stack
    mapData = redoStack.pop(); // Restore redone state
    logToConsole("Redo performed. Map data restored.");
    if (uiUpdater) uiUpdater(mapData);
    return true;
}

/**
 * Clears both the undo and redo stacks. Typically used when loading a new map.
 */
export function clearUndoRedoStacks() {
    undoStack.length = 0;
    redoStack.length = 0;
    logToConsole("Undo and redo stacks cleared.");
}

// --- NPC Management ---
/**
 * Adds an NPC to the map data.
 * @param {object} npcData - The NPC object to add.
 */
export function addNpcToMap(npcData) {
    if (!mapData.npcs) mapData.npcs = [];
    mapData.npcs.push(npcData);
    logToConsole("NPC added to map data:", npcData);
    // snapshot() should be called by the user action that triggers this.
}

/**
 * Removes an NPC from the map data by its ID.
 * @param {string} npcId - The ID of the NPC to remove.
 * @returns {boolean} True if an NPC was removed, false otherwise.
 */
export function removeNpcFromMap(npcId) {
    if (!mapData.npcs) return false;
    const initialLength = mapData.npcs.length;
    mapData.npcs = mapData.npcs.filter(npc => npc.id !== npcId);
    if (mapData.npcs.length < initialLength) {
        logToConsole(`NPC with ID '${npcId}' removed from map data.`);
        return true;
    }
    logToConsole(`NPC with ID '${npcId}' not found for removal.`);
    return false;
}

/**
 * Finds an NPC at a specific map coordinate.
 * @param {number} x - X-coordinate.
 * @param {number} y - Y-coordinate.
 * @param {number} z - Z-coordinate.
 * @returns {object|null} The NPC object if found, otherwise null.
 */
export function getNpcAt(x, y, z) {
    if (!mapData.npcs) return null;
    return mapData.npcs.find(npc => npc.mapPos && npc.mapPos.x === x && npc.mapPos.y === y && npc.mapPos.z === z) || null;
}

// --- Portal Management ---
/**
 * Adds a portal to the map data.
 * @param {object} portalData - The portal object to add.
 */
export function addPortalToMap(portalData) {
    if (!mapData.portals) mapData.portals = [];
    mapData.portals.push(portalData);
    logToConsole("Portal added to map data:", portalData);
}

/**
 * Removes a portal from the map data by its ID.
 * @param {string} portalId - The ID of the portal to remove.
 * @returns {boolean} True if a portal was removed, false otherwise.
 */
export function removePortalFromMap(portalId) {
    if (!mapData.portals) return false;
    const initialLength = mapData.portals.length;
    mapData.portals = mapData.portals.filter(p => p.id !== portalId);
    if (mapData.portals.length < initialLength) {
        logToConsole(`Portal with ID '${portalId}' removed from map data.`);
        return true;
    }
    logToConsole(`Portal with ID '${portalId}' not found for removal.`);
    return false;
}

/**
 * Finds a portal at a specific map coordinate.
 * @param {number} x - X-coordinate.
 * @param {number} y - Y-coordinate.
 * @param {number} z - Z-coordinate.
 * @returns {object|null} The portal object if found, otherwise null.
 */
export function getPortalAt(x, y, z) {
    if (!mapData.portals) return null;
    return mapData.portals.find(p => p.x === x && p.y === y && p.z === z) || null;
}

/**
 * Updates an existing portal's data.
 * @param {string} portalId - The ID of the portal to update.
 * @param {object} portalDataUpdates - An object containing properties to update on the portal.
 * @returns {boolean} True if the portal was found and updated, false otherwise.
 */
export function updatePortalInMap(portalId, portalDataUpdates) {
    if (!mapData.portals) return false;
    const portal = mapData.portals.find(p => p.id === portalId);
    if (portal) {
        Object.assign(portal, portalDataUpdates);
        logToConsole(`Portal ID '${portalId}' updated with:`, portalDataUpdates);
        return true;
    }
    logToConsole(`Portal ID '${portalId}' not found for update.`);
    return false;
}

/**
 * Calculates the next available portal ID based on existing portals.
 * Assumes portal IDs are in the format "portal_NUMBER".
 * @returns {number} The next integer to use for a new portal ID.
 */
export function getNextPortalId() {
    if (!mapData.portals || mapData.portals.length === 0) return 0;
    const maxIdNum = Math.max(-1, ...mapData.portals.map(p => {
        const idParts = p.id.split('_');
        const idNum = parseInt(idParts[1], 10);
        return isNaN(idNum) ? -1 : idNum;
    }));
    return maxIdNum + 1;
}


// --- Player Start Position ---
/**
 * Sets the player's starting position in the map data.
 * @param {number} x - X-coordinate.
 * @param {number} y - Y-coordinate.
 * @param {number} z - Z-coordinate.
 */
export function setPlayerStart(x, y, z) {
    if (!mapData.startPos) mapData.startPos = {}; // Should be initialized by initNewMap
    mapData.startPos.x = x;
    mapData.startPos.y = y;
    mapData.startPos.z = z;
    logToConsole(`Player start position set to: X:${x}, Y:${y}, Z:${z}`);
}

/**
 * Gets the player's starting position.
 * @returns {MapPosition|undefined} The player start position object, or undefined if not set.
 */
export function getPlayerStart() {
    return mapData.startPos;
}

// --- Tile Data Access (Raw) ---
// These are low-level accessors. More complex tile operations (like placing with auto-tiling)
// belong in tileManager.js.

/**
 * Gets the raw tile data (ID string or tile object) from a specific layer at given coordinates.
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @param {number} z - The z-coordinate.
 * @param {string} layerName - The name of the layer (e.g., LAYER_TYPES.BOTTOM, LAYER_TYPES.MIDDLE).
 * @returns {string|object|null} The tile data, or null if coordinates/layer are invalid or cell is empty (convention dependent).
 */
export function getRawTileDataAt(x, y, z, layerName) {
    const zStr = z.toString();
    if (mapData.levels && mapData.levels[zStr] &&
        mapData.levels[zStr][layerName] &&
        y >= 0 && y < mapData.levels[zStr][layerName].length &&
        x >= 0 && x < mapData.levels[zStr][layerName][y].length) {
        return mapData.levels[zStr][layerName][y][x];
    }
    // logToConsole(`getRawTileDataAt: Invalid coordinates or layer. X:${x}, Y:${y}, Z:${z}, Layer:${layerName}`);
    return null; // Or return "" for empty, if that's the convention for empty cells.
}

/**
 * Sets the raw tile data on a specific layer at given coordinates.
 * This is a direct setter and does NOT handle auto-tiling or complex placement logic.
 * It ensures the Z-level and layer structure exist before attempting to set data.
 *
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @param {number} z - The z-coordinate.
 * @param {string} layerName - The name of the layer (e.g., LAYER_TYPES.BOTTOM).
 * @param {string|object} tileIdOrObject - The tile ID (string) or tile object to place.
 * @param {number} currentGridWidth - Current grid width, used if layers need initialization.
 * @param {number} currentGridHeight - Current grid height, used if layers need initialization.
 */
export function setRawTileDataAt(x, y, z, layerName, tileIdOrObject, currentGridWidth, currentGridHeight) {
    // Ensure the Z-level and layer exist, using the global mapData by default
    ensureLayersForZ(z, currentGridWidth, currentGridHeight, mapData);
    const zStr = z.toString();

    // Basic bounds checking before assignment
    if (y >= 0 && y < currentGridHeight && x >= 0 && x < currentGridWidth) {
        if (mapData.levels[zStr]?.[layerName]) {
            mapData.levels[zStr][layerName][y][x] = tileIdOrObject;
        } else {
            console.error(`setRawTileDataAt: Target layer '${layerName}' does not exist for Z-level ${zStr} even after ensureLayersForZ. This should not happen.`);
        }
    } else {
        console.error(`setRawTileDataAt: Coordinates X:${x}, Y:${y} are out of bounds for grid ${currentGridWidth}x${currentGridHeight}.`);
    }
}
