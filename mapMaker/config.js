// mapMaker/config.js
"use strict";

// --- Auto-tiling lookup (mask → variant ID) ---
// WWTN was identified as a typo for WWTE (Top-Empty or T-End) or similar.
// If WWTN is a unique, intentionally different tile, this should be reverted.
// Based on common auto-tile patterns, TE (Top-End) or similar (like a T-junction from above) is more standard.
export const autoTileMap = {
    WWH: { 0: "WWH", 1: "WWV", 2: "WWH", 3: "WWCBL", 4: "WWV", 5: "WWV", 6: "WWCTL", 7: "WWTE", 8: "WWH", 9: "WWCBR", 10: "WWH", 11: "WWTE", 12: "WWCTR", 13: "WWTW", 14: "WWTS", 15: "WWC" },
    MWH: { 0: "MWH", 1: "MWV", 2: "MWH", 3: "MWCBL", 4: "MWV", 5: "MWV", 6: "MWCTL", 7: "MWTE", 8: "MWH", 9: "MWCBR", 10: "MWH", 11: "MWTE", 12: "MWCTR", 13: "MWTW", 14: "MWTS", 15: "MWC" }
};

// Constants for layer names for clarity and to avoid magic strings in code
export const LAYER_TYPES = {
    BOTTOM: "bottom", // For floors, ground terrain
    MIDDLE: "middle"  // For walls, furniture, items, roof structures
};

// Default undo stack limit
export const UNDO_STACK_LIMIT = 25;

// Default onion skin settings
export const DEFAULT_ONION_LAYERS_BELOW = 1;
export const DEFAULT_ONION_LAYERS_ABOVE = 0;

// Colors for onion skinning display
export const ONION_BELOW_COLOR = "#505070";
export const ONION_ABOVE_COLOR = "#707050";

// Visual representation for player start position on the grid
export const PLAYER_START_SPRITE = '☻';
export const PLAYER_START_COLOR = 'lime';
export const PLAYER_START_BG_COLOR = 'rgba(0, 255, 0, 0.2)';

// Default difficulty class for locks
export const DEFAULT_LOCK_DC = 10;

// Default new map properties used during initialization
export const DEFAULT_MAP_ID_PREFIX = "new_map_";
export const DEFAULT_MAP_NAME = "New Map";
// Divisors for calculating default start position based on grid size
export const DEFAULT_START_POS_X_DIVISOR = 2;
export const DEFAULT_START_POS_Y_DIVISOR = 2;
export const DEFAULT_START_POS_Z = 0;

// Default attributes for newly created portals
export const DEFAULT_PORTAL_TARGET_MAP_ID = '';
export const DEFAULT_PORTAL_TARGET_X = 0;
export const DEFAULT_PORTAL_TARGET_Y = 0;
export const DEFAULT_PORTAL_TARGET_Z = 0;
export const DEFAULT_PORTAL_NAME = '';
export const PORTAL_ID_PREFIX = 'portal_';

// Default attributes for NPCs
export const NPC_ID_PREFIX = 'npc_'; // Added for NPCs

// Default depth for 3D drawing tools like rectangle and stamp
export const DEFAULT_3D_DEPTH = 1;

// Default values for tile instance properties in the editor
export const DEFAULT_TILE_INSTANCE_NAME = '';
export const DEFAULT_TILE_INSTANCE_TAGS = []; // Represented as an array of strings

// Order of layers to search during flood fill operations.
// New structure uses "bottom" and "middle". Middle is typically checked first for "topmost" content.
export const FILL_SEARCH_LAYERS_NEW = [LAYER_TYPES.MIDDLE, LAYER_TYPES.BOTTOM];
// Old layer names, kept for reference for any complex load conversion logic if needed.
export const FILL_SEARCH_LAYERS_OLD = ["roof", "item", "building", "landscape"];

// Layer names to be included when copying for the stamp tool.
export const STAMP_COPY_LAYERS = [LAYER_TYPES.BOTTOM, LAYER_TYPES.MIDDLE];

// Centralized error messages for user feedback.
// Using functions for messages with dynamic content.
export const ERROR_MSG = {
    NO_TILES_LOADED: "No tiles loaded. Check tile definitions.",
    NO_DATA_FOR_ZLEVEL: (z) => `Error: No data for Z-level ${z}. Try adding it or changing Z-level.`,
    INVALID_Z_LEVEL_INPUT: "Invalid Z-level. Please enter an integer.",
    Z_LEVEL_EXISTS: (z) => `Z-level ${z} already exists.`,
    CANNOT_DELETE_LAST_Z: "Cannot delete the last Z-level.",
    Z_LEVEL_DOES_NOT_EXIST: (z) => `Z-level ${z} does not exist or has no data.`,
    CONFIRM_DELETE_Z_LEVEL: (z) => `Are you sure you want to delete Z-level ${z}? This action cannot be undone easily.`,
    SELECT_JSON_FILE: "Please select a .json map file to load.",
    ERROR_PARSING_MAP: (err) => `Error parsing map file: ${err}`,
    LOAD_MAP_UNRECOGNIZED_FORMAT: "Failed to load map: Unrecognized format or critical data missing after attempting conversions.",
    MAP_LOADED_SUCCESS: (nameOrId, z) => `Map "${nameOrId || 'Unknown'}" loaded successfully! Current Z: ${z}`,
    ASSET_LOAD_ERROR: "Critical error loading asset definitions. Map maker may not function correctly. Check console.",
    TILE_DEF_EMPTY_ERROR: "Asset Warning: Tile definitions (tilesets) are empty after loading. Palette will be empty.",
    NO_ITEMS_LOADED_WARNING: "Asset Warning: Item definitions (itemsById) are empty. Container item selection will be unavailable.",
    ITEM_SELECTION_EMPTY_WARNING: "Warning: Item definitions could not be loaded. Container item selection will be empty. Check items.json and console.",
    INVALID_CONTAINER_TYPE_ERROR: "Error: Selected tile is not a valid container type.",
    CANNOT_ADD_ITEM_INVALID_TILE: "Error: Cannot add item to this tile. Tile data is invalid or not an object.",
    NON_LOCKABLE_TILE_ERROR: (tileId) => `Error: Tile '${tileId}' is not a lockable type (door, window, container).`,
    INVALID_TILE_FOR_LOCK_ERROR: (x, y, z) => `Error: Invalid or non-object tile data at ${x},${y},Z:${z} for setting lock status.`,
    SAVE_PROPS_NO_TILE_SELECTED: "Action aborted: No tile selected in the Tile Property Editor.",
    SAVE_PROPS_NO_BASE_ID: (tileData) => `Cannot save properties: Selected tile has no valid baseTileId. Data: ${JSON.stringify(tileData)}`,
    CLEAR_PROPS_NO_TILE_SELECTED: "Action aborted: No tile selected to clear properties from.",
    CLEAR_PROPS_NO_CUSTOM_PROPS: (x, y, z, layer) => `Tile at (${x},${y}, Z:${z}) on layer '${layer}' has no custom instance properties to clear.`,
    CLEAR_PROPS_INVALID_DATA: (tileData) => `Cannot clear properties: Selected tile data is invalid or not an object. Data: ${JSON.stringify(tileData)}`,
    FLOOD_FILL_LAYER_MISSING: (layerType, zStr) => `Flood fill error: Layer '${layerType}' does not exist for Z-level ${zStr}.`,
    FILL_TOOL_EMPTY_AREA: "Fill tool clicked on an empty area on all layers. No action taken for 2D fill.",
    NO_NPC_DEFINITIONS_LOADED: "Asset Warning: NPC definitions are empty. NPC panel will be limited."
};

// Centralized console log messages. Can be prefixed or conditionally disabled.
// Using functions for messages with dynamic content.
export const LOG_MSG = {
    INIT_LAYERS_FOR_Z: (zStr) => `Initialized new layer structure (bottom/middle) for Z-level: ${zStr}`,
    INIT_MISSING_BOTTOM_LAYER: (zStr) => `Initialized missing 'bottom' layer for Z-level: ${zStr}`,
    INIT_MISSING_MIDDLE_LAYER: (zStr) => `Initialized missing 'middle' layer for Z-level: ${zStr}`,
    ASSETS_LOADED: "Map Maker: Asset definitions loaded successfully via AssetManager.",
    CURRENT_Z_CHANGED: (z) => `Current editing Z-level changed to: ${z}`,
    ADDED_Z_LEVEL: (z) => `Added and switched to new Z-level: ${z}`,
    DELETED_Z_LEVEL: (z) => `Deleted Z-level: ${z}`,
    REMOVED_NPCS_FROM_DELETED_Z: (count, z) => `Removed ${count} NPC(s) from deleted Z-level ${z}.`,
    REMOVED_PORTALS_FROM_DELETED_Z: (count, z) => `Removed ${count} portal(s) from deleted Z-level ${z}.`,
    PLAYER_START_Z_RESET: (z) => `Player start Z was on the deleted level. Reset to Z=${z}.`,
    EXPORTED_MAP: (mapId) => `Map exported as ${mapId}.json`,
    LOADED_NEW_FORMAT_MAP: "Loaded map in current format (bottom/middle layers per Z-level).",
    LOADED_OLD_Z_FORMAT_MAP: "Loaded map in old Z-level format (landscape/building etc. per Z). Attempting conversion of first Z-level.",
    LOADED_FLAT_OLD_FORMAT_MAP: "Loaded map in flat old format (direct 'layers' property). Attempting conversion to Z=0.",
    CONVERTED_OLD_MAP_SUCCESS: "Successfully converted old format map to new bottom/middle layer structure for Z=0.",
    STAMP_DEFINED_3D: (data) => ["3D Stamp defined:", data], // Data can be an object, console will handle it
    PORTAL_PROPS_SAVED: (id) => `Portal properties saved for ID: ${id}`,
    REMOVED_PORTAL: (id) => `Removed portal with ID: ${id}`,
    SAVED_TILE_PROPS: (x, y, z, layer, data) => [`Saved instance properties for tile at (${x},${y}, Z:${z}) on layer '${layer}'. New data:`, data],
    CLEARED_TILE_PROPS_REVERTED: (x, y, z, layer, baseId) => `Cleared all custom instance properties for tile at (${x},${y}, Z:${z}) on layer '${layer}'. Reverted to string ID: '${baseId}'`,
    CLEARED_TILE_PROPS_RETAINED: (x, y, z, layer, data) => [`Cleared generic instance properties for tile at (${x},${y}, Z:${z}) on layer '${layer}'. Object retained due to other special properties. Data:`, data],
    ADDED_ITEM_TO_CONTAINER: (itemId, quantity, x, y, layerName) => `Added/updated item '${itemId}' (quantity ${quantity}) in container at ${x},${y} on layer '${layerName}'`,
    PORTAL_TOOL_SELECTED_EXISTING: (id, z) => `Portal Tool: Selected existing Portal ID '${id}' at Z:${z}`,
    PORTAL_TOOL_ADDED_NEW: (id, x, y, z) => `Portal Tool: Added new Portal ID '${id}' at (${x},${y}, Z:${z})`,
    SELECT_TOOL_SELECTED_PORTAL: (id, z) => `Select/Inspect Tool: Selected Portal ID '${id}' at Z:${z}`,
    SELECT_TOOL_SELECTED_NPC: (id, z) => `Select/Inspect Tool: Selected NPC ID '${id}' at Z:${z}`,
    NPC_TOOL_SELECTED_EXISTING: (id, z) => `NPC Tool: Selected existing NPC ID '${id}' at Z:${z}`,
    NPC_TOOL_ADDED_NEW: (id, x, y, z, baseId) => `NPC Tool: Added new NPC ID '${id}' (Base: ${baseId}) at (${x},${y}, Z:${z})`,
    NPC_PROPS_SAVED: (id) => `NPC properties saved for ID: ${id}`,
    REMOVED_NPC: (id) => `Removed NPC with ID: ${id}`
};

/**
 * Utility function for logging messages to the console.
 * Can be expanded (e.g., with log levels, global debug flag).
 * @param {...any} args - Arguments to log, similar to console.log.
 */
export function logToConsole(...args) {
    // For development, complex objects are often better logged directly to allow inspection.
    // For production or cleaner logs, stringifying might be preferred.
    // const processedArgs = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg));
    // console.log('[MapMaker]', ...processedArgs);
    console.log('[MapMaker]', ...args);
}
