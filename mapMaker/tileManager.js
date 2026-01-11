// mapMaker/tileManager.js
"use strict";

// Note: mapDataManager is not directly imported here to avoid circular dependencies if it also needs tileManager.
// Instead, mapData and ensureLayersForZ will be passed as parameters where needed.
// `snapshot` is also called by the invoking action, not directly within these low-level functions.
import { autoTileMap, LAYER_TYPES, LOG_MSG, ERROR_MSG } from './config.js';
import { logToConsole } from './config.js';


let assetManagerRef = null; // Reference to the global AssetManager instance

/**
 * Initializes the TileManager with a reference to the AssetManager.
 * This must be called before other functions in this module can be used.
 * @param {object} manager - The AssetManager instance.
 */
export function initializeTileManager(manager) {
    if (!manager || typeof manager.tilesets === 'undefined') {
        console.error("TileManager: Initialization failed. Invalid AssetManager provided.");
        // Potentially throw an error or set a flag to prevent operations
        return;
    }
    assetManagerRef = manager;
    logToConsole("TileManager initialized with AssetManager.");
}

/**
 * Determines the target layer ("bottom" or "middle") for a tile based on its definition tags.
 * This helps in deciding where a tile should be placed by default.
 *
 * @param {object} tileDef - The tile definition object from AssetManager.
 * @returns {string} The determined layer type (e.g., LAYER_TYPES.BOTTOM, LAYER_TYPES.MIDDLE).
 *                   Defaults to LAYER_TYPES.MIDDLE if tags are missing or no specific rule applies.
 */
export function getLayerForTile(tileDef) {
    if (!tileDef || !tileDef.tags || !Array.isArray(tileDef.tags)) {
        // logToConsole(`getLayerForTile: Tile '${tileDef?.name || 'Unknown'}' has no tags or invalid tags, defaulting to middle layer.`);
        return LAYER_TYPES.MIDDLE;
    }
    const tags = tileDef.tags;

    // Prioritize "bottom" or "middle" tags if they exist.
    if (tags.includes("bottom")) return LAYER_TYPES.BOTTOM;
    if (tags.includes("middle")) return LAYER_TYPES.MIDDLE;

    // Fallback to existing logic: prioritize 'floor' tag for bottom layer placement.
    if (tags.includes("floor")) return LAYER_TYPES.BOTTOM;

    // Most other structural, item, or landscape elements default to middle.
    // Specific tags like "wall", "door", "furniture", "container", "roof", "item", "building"
    // generally imply they sit on top of a floor or occupy vertical space.
    // "impassable" or "landscape" without "floor" also suggests middle layer.
    const middleLayerTags = ["wall", "door", "window", "furniture", "container", "roof", "item", "building"];
    if (middleLayerTags.some(tag => tags.includes(tag))) {
        return LAYER_TYPES.MIDDLE;
    }
    if (tags.includes("impassable") && !tags.includes("floor")) return LAYER_TYPES.MIDDLE;
    if (tags.includes("landscape") && !tags.includes("floor")) return LAYER_TYPES.MIDDLE;


    // logToConsole(`getLayerForTile: Tile '${tileDef.name || 'Unknown'}' with tags [${tags.join(',')}] defaulted to middle layer.`);
    return LAYER_TYPES.MIDDLE; // Default for unclassified or ambiguous tiles
}


/**
 * Applies auto-tiling logic to a specific tile based on its neighbors.
 * Modifies the tile ID in mapData if a better variant is found.
 *
 * @param {number} x - The x-coordinate of the tile.
 * @param {number} y - The y-coordinate of the tile.
 * @param {number} z - The z-coordinate of the tile.
 * @param {string} layerType - The layer type where the tile resides (e.g., LAYER_TYPES.BOTTOM).
 * @param {MapData} mapDataRef - Reference to the main mapData object.
 * @param {number} gridWidth - Current width of the map grid.
 * @param {number} gridHeight - Current height of the map grid.
 */
function applyAutoTile(x, y, z, layerType, mapDataRef, gridWidth, gridHeight) {
    if (!assetManagerRef) {
        console.error("TileManager: AssetManager not initialized. Cannot apply auto-tile.");
        return;
    }
    const zStr = z.toString();
    const currentLevelLayerGrid = mapDataRef.levels[zStr]?.[layerType];

    if (!currentLevelLayerGrid) {
        // This should ideally not happen if ensureLayersForZ was called prior to any tile placement.
        // logToConsole(`applyAutoTile: Layer '${layerType}' not found for Z-level ${zStr}. Skipping auto-tile.`);
        return;
    }

    const tileIdOrObject = currentLevelLayerGrid[y]?.[x];
    const baseTileId = (typeof tileIdOrObject === 'object' && tileIdOrObject?.tileId !== undefined)
        ? tileIdOrObject.tileId
        : tileIdOrObject;

    if (!baseTileId || typeof baseTileId !== 'string' || baseTileId === "") {
        return; // Auto-tiling requires a non-empty string base tile ID.
    }

    const tileDef = assetManagerRef.tilesets[baseTileId];
    // Only proceed if the tile itself is tagged for auto-tiling.
    if (!tileDef?.tags?.includes('auto_tile')) {
        return;
    }

    const tileFamily = baseTileId.slice(0, 2); // Assuming family is defined by the first two characters (e.g., "WW" for WaterWell).
    const autoTileKey = tileFamily + "H"; // Auto-tile maps are often keyed by a base horizontal variant.
    const autoTileVariantMap = autoTileMap[autoTileKey]; // `autoTileMap` from config.js.

    if (!autoTileVariantMap) {
        return; // This tile family does not have an auto-tile map defined.
    }

    let mask = 0;
    // Neighbor checks: [dx, dy, bit_value_if_match]
    // Bit values: North=1, East=2, South=4, West=8
    const neighborChecks = [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]];

    for (const [dx, dy, bit] of neighborChecks) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
            const neighborTileData = currentLevelLayerGrid[ny]?.[nx];
            const neighborBaseId = (typeof neighborTileData === 'object' && neighborTileData?.tileId !== undefined)
                ? neighborTileData.tileId
                : neighborTileData;

            if (neighborBaseId && typeof neighborBaseId === 'string' && neighborBaseId.slice(0, 2) === tileFamily) {
                const neighborDef = assetManagerRef.tilesets[neighborBaseId];
                // Ensure the neighbor also participates in the same auto-tiling system.
                if (neighborDef?.tags?.includes('auto_tile')) {
                    mask |= bit;
                }
            }
        }
    }

    const newTileVariantId = autoTileVariantMap[mask];

    if (newTileVariantId && newTileVariantId !== baseTileId) { // Only update if a new variant is found and it's different
        if (typeof tileIdOrObject === 'object' && tileIdOrObject !== null) {
            // If the original tile was an object (e.g., a container), update its tileId but preserve other properties.
            tileIdOrObject.tileId = newTileVariantId;
            // mapDataRef.levels[zStr][layerType][y][x] is already this object, so modification is direct.
        } else {
            // If it was a string ID, just replace it.
            mapDataRef.levels[zStr][layerType][y][x] = newTileVariantId;
        }
        // logToConsole(`Auto-tiled ${baseTileId} at (${x},${y},Z${z}) on layer ${layerType} to ${newTileVariantId} (mask: ${mask})`);
    }
}

/**
 * Places a tile onto the map at the specified coordinates.
 * This function handles determining the correct layer for the tile,
 * placing it, and then applying auto-tiling to the placed tile and its relevant neighbors.
 *
 * @param {number} x - The x-coordinate for tile placement.
 * @param {number} y - The y-coordinate for tile placement.
 * @param {number} z - The z-coordinate (depth level) for tile placement.
 * @param {string|object} tileIdOrObjectToPlace - The ID of the tile (string) or a tile object (e.g., for containers with state) to place.
 * @param {MapData} mapDataRef - Reference to the main mapData object.
 * @param {function} ensureLayersFn - A function (like mapDataManager.ensureLayersForZ) to ensure the Z-level and its layers exist.
 * @param {number} gridWidth - Current width of the map grid.
 * @param {number} gridHeight - Current height of the map grid.
 * @param {function} [renderFn] - Optional callback function to trigger a re-render of the grid after placement.
 */
export function placeTile(x, y, z, tileIdOrObjectToPlace, mapDataRef, /* assetManagerRefPassed REMOVED */ ensureLayersFn, gridWidth, gridHeight, renderFn) {
    if (!assetManagerRef) { // Uses module-scoped assetManagerRef
        console.error("TileManager: AssetManager not initialized. Cannot place tile.");
        return;
    }
    const zStr = z.toString();
    // Ensure the target Z-level and its layer structure (bottom, middle arrays) are initialized.
    ensureLayersFn(z, gridWidth, gridHeight, mapDataRef);

    let effectiveBaseTileId = tileIdOrObjectToPlace;
    if (typeof tileIdOrObjectToPlace === 'object' && tileIdOrObjectToPlace?.tileId !== undefined) {
        effectiveBaseTileId = tileIdOrObjectToPlace.tileId;
    }

    // Handle Eraser Tool (represented by an empty string tileId)
    if (effectiveBaseTileId === "") {
        let changed = false;
        // Eraser clears the cell on both bottom and middle layers.
        if (mapDataRef.levels[zStr]?.[LAYER_TYPES.BOTTOM]?.[y]?.[x] !== "") {
            mapDataRef.levels[zStr][LAYER_TYPES.BOTTOM][y][x] = "";
            changed = true;
        }
        if (mapDataRef.levels[zStr]?.[LAYER_TYPES.MIDDLE]?.[y]?.[x] !== "") {
            mapDataRef.levels[zStr][LAYER_TYPES.MIDDLE][y][x] = "";
            changed = true;
        }

        // After erasing, affected neighbors might need re-tiling if they were auto-tiles.
        if (changed) {
            const neighbors = [[0, -1], [1, 0], [0, 1], [-1, 0]];
            for (const [dx, dy] of neighbors) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
                    // Check and apply auto-tiling for neighbors on both layers.
                    applyAutoTile(nx, ny, z, LAYER_TYPES.BOTTOM, mapDataRef, gridWidth, gridHeight);
                    applyAutoTile(nx, ny, z, LAYER_TYPES.MIDDLE, mapDataRef, gridWidth, gridHeight);
                }
            }
        }
        if (renderFn && changed) renderFn();
        return; // Eraser action complete.
    }

    const tileDef = assetManagerRef.tilesets[effectiveBaseTileId]; // Uses module-scoped assetManagerRef
    if (!tileDef) {
        logToConsole(`Warning: No definition found for tile ID: '${effectiveBaseTileId}'. Tile not placed.`);
        return;
    }

    const determinedLayerType = getLayerForTile(tileDef);
    const targetLayerGrid = mapDataRef.levels[zStr]?.[determinedLayerType];

    if (!targetLayerGrid) {
        // This should not happen if ensureLayersFn works correctly.
        console.error(`placeTile: Target layer '${determinedLayerType}' does not exist for Z-level ${zStr}. Tile not placed.`);
        return;
    }

    // Place the tile (ID string or full object) onto the determined layer.
    // If tileIdOrObjectToPlace is an object (e.g. a container with inventory being stamped),
    // its properties are preserved.
    targetLayerGrid[y][x] = tileIdOrObjectToPlace;
    // logToConsole(`Placed tile '${effectiveBaseTileId}' at (${x},${y},Z${z}) on layer '${determinedLayerType}'.`);

    // Apply auto-tiling to the placed tile itself if it's an auto-tile.
    if (tileDef.tags?.includes('auto_tile')) {
        applyAutoTile(x, y, z, determinedLayerType, mapDataRef, gridWidth, gridHeight);
    }

    // Retile direct neighbors of the placed tile.
    // This is crucial because placing a tile can change the context for its neighbors.
    const neighborsToUpdate = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    if (tileDef.tags?.includes('auto_tile_influencer') || tileDef.tags?.includes('auto_tile')) {
        // If the placed tile can influence neighbors (even if not auto_tile itself) or is an auto_tile,
        // also check diagonals for some auto_tile systems (though current `applyAutoTile` only uses cardinal)
        // neighborsToUpdate.push([-1, -1], [1, -1], [-1, 1], [1, 1]);
    }

    for (const [dx, dy] of neighborsToUpdate) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
            // A placed tile might affect neighbors on EITHER layer, depending on the auto-tile rules.
            // For simplicity, we attempt to re-tile neighbors on both layers if they are auto-tiles.
            // A more optimized approach would know which layer a neighbor needs checking on based on `determinedLayerType`.
            applyAutoTile(nx, ny, z, LAYER_TYPES.BOTTOM, mapDataRef, gridWidth, gridHeight);
            applyAutoTile(nx, ny, z, LAYER_TYPES.MIDDLE, mapDataRef, gridWidth, gridHeight);
        }
    }

    if (renderFn) renderFn();
}


/**
 * Converts a tile at a given position to an object if it's currently a string ID.
 * This is useful when needing to add properties like 'isLocked' or 'containerInventory'
 * to a tile that was previously represented only by its ID.
 * The original mapData is modified directly.
 *
 * @param {number} x - The x-coordinate of the tile.
 * @param {number} y - The y-coordinate of the tile.
 * @param {number} z - The z-coordinate of the tile.
 * @param {string} layerName - The layer where the tile resides (e.g., LAYER_TYPES.MIDDLE).
 * @param {MapData} mapDataRef - Reference to the main mapData object to be modified.
 * @returns {object|null} The tile object (which is now part of mapDataRef). Returns the existing object
 *                        if it was already an object, or the newly created one. Returns null if
 *                        conversion failed (e.g., empty tile string, invalid layer/coords).
 */
export function ensureTileIsObject(x, y, z, layerName, mapDataRef) {
    const zStr = z.toString();
    if (!mapDataRef.levels[zStr] || !mapDataRef.levels[zStr][layerName] ||
        !mapDataRef.levels[zStr][layerName][y] || mapDataRef.levels[zStr][layerName][y][x] === undefined) {
        console.error(`ensureTileIsObject: Invalid path or tile does not exist at ${x},${y},Z${z} on layer ${layerName}.`);
        return null;
    }

    let tileData = mapDataRef.levels[zStr][layerName][y][x];

    if (typeof tileData === 'string') {
        if (tileData === "") {
            logToConsole(`Warning: Attempted to convert an empty tile string at ${x},${y},Z${z} on layer ${layerName} to an object. No action taken.`);
            return null; // Cannot convert an empty tile string to a meaningful object this way.
        }
        // snapshot() should be called by the higher-level function that *initiates* the change
        // that necessitates this conversion, BEFORE this function is called.
        const newTileObject = { tileId: tileData };
        mapDataRef.levels[zStr][layerName][y][x] = newTileObject;
        logToConsole(`Converted tile at ${x},${y},Z${z} on layer ${layerName} from ID '${tileData}' to object.`);
        return newTileObject;
    } else if (typeof tileData === 'object' && tileData !== null) {
        return tileData; // It's already an object.
    } else {
        console.error(`ensureTileIsObject: Tile data at ${x},${y},Z${z} on layer ${layerName} is in an unexpected format:`, tileData);
        return null; // Invalid or null data.
    }
}

/**
 * Retrieves information about the topmost visible tile at a given x, y, z coordinate.
 * It checks layers in a specific order (middle then bottom) to determine what's "on top".
 *
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @param {number} z - The z-coordinate.
 * @param {MapData} mapDataRef - Reference to the main mapData object.
 * @returns {{tile: (string|object), layer: string, baseId: string, definition: object}|null}
 *          An object containing:
 *          - `tile`: The raw tile data (string ID or object).
 *          - `layer`: The layer name where this tile was found.
 *          - `baseId`: The string ID used for looking up the definition.
 *          - `definition`: The tile definition object from AssetManager.
 *          Returns null if no tile is found or if the tile definition is missing.
 */
export function getTopmostTileAt(x, y, z, mapDataRef, assetManagerPassed = null) {
    // If assetManagerRef (module-scoped) is not set, try using the passed one.
    // This allows getTopmostTileAt to work even if initializeTileManager wasn't called or failed,
    // provided the caller passes the assetManager.
    const manager = assetManagerRef || assetManagerPassed;
    if (!manager) {
        console.error("TileManager: AssetManager not initialized or passed for getTopmostTileAt.");
        return null;
    }
    const zStr = z.toString();
    if (!mapDataRef.levels || !mapDataRef.levels[zStr]) return null;

    const layersToCheck = [LAYER_TYPES.MIDDLE, LAYER_TYPES.BOTTOM]; // Middle layer takes precedence.

    for (const layerName of layersToCheck) {
        const tileData = mapDataRef.levels[zStr][layerName]?.[y]?.[x];
        if (tileData && tileData !== "") { // Check if there's any data and it's not an empty string.
            const baseId = (typeof tileData === 'object' && tileData.tileId) ? tileData.tileId : tileData;
            if (baseId && baseId !== "") { // Ensure baseId itself is also not empty.
                const definition = manager.tilesets[baseId];
                if (definition) { // Ensure a definition exists for this baseId.
                    return {
                        tile: tileData,
                        layer: layerName,
                        baseId: baseId,
                        definition: definition
                    };
                } else {
                    // logToConsole(`Warning: Topmost tile found (ID: ${baseId}) but no definition in assetManager.`);
                }
            }
        }
    }
    return null; // No valid, defined tile found on any checked layer.
}

/**
 * Helper function for rendering: gets the effective tile to display at a coordinate.
 * Checks the primary layer first, then the secondary layer if the primary is empty.
 * This is a simplified version of some logic in the original `renderMergedGrid` for display purposes.
 *
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @param {number} z - The z-coordinate.
 * @param {string} primaryLayerName - The primary layer to check (e.g., LAYER_TYPES.MIDDLE).
 * @param {string} secondaryLayerName - The secondary layer to check if primary is empty (e.g., LAYER_TYPES.BOTTOM).
 * @param {MapData} mapDataRef - Reference to the main mapData object.
 * @returns {{tile: (string|object), layer: string, baseId: string, definition: object}|null}
 *          Tile information object similar to `getTopmostTileAt`, or null if no displayable tile is found.
 */
export function getEffectiveTileForDisplay(x, y, z, primaryLayerName, secondaryLayerName, mapDataRef) {
    if (!assetManagerRef) {
        console.error("TileManager: AssetManager not initialized for getEffectiveTileForDisplay.");
        return null;
    }
    const zStr = z.toString();
    if (!mapDataRef.levels || !mapDataRef.levels[zStr]) return null;

    let tileData = mapDataRef.levels[zStr][primaryLayerName]?.[y]?.[x];
    let layerOfEffectiveTile = primaryLayerName;

    // If primary layer is empty (or tileData is empty string), check secondary layer.
    if (!tileData || tileData === "") {
        tileData = mapDataRef.levels[zStr][secondaryLayerName]?.[y]?.[x];
        layerOfEffectiveTile = secondaryLayerName;
    }

    if (tileData && tileData !== "") {
        const baseId = (typeof tileData === 'object' && tileData.tileId) ? tileData.tileId : tileData;
        if (baseId && baseId !== "") { // Ensure baseId is also not empty
            const definition = assetManagerRef.tilesets[baseId];
            if (definition) {
                return {
                    tile: tileData,
                    layer: layerOfEffectiveTile,
                    baseId,
                    definition
                };
            }
        }
    }
    return null; // No displayable tile found.
}
