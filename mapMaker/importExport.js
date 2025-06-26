// mapMaker/importExport.js
"use strict";

import { setMapData, ensureLayersForZ, getNextPortalId as getNextPortalIdFromData, clearUndoRedoStacks } from './mapDataManager.js';
import { getLayerForTile } from './tileManager.js'; // For old map format conversion
import { ERROR_MSG, LOG_MSG, LAYER_TYPES } from './config.js'; // Added LAYER_TYPES
import { logToConsole } from './config.js';
import { createEmptyGrid } from './gridUtils.js';


/**
 * Exports the current map data to a JSON file.
 * Prompts the user for a filename/ID.
 * @param {MapData} mapDataToExport - The map data object to export.
 */
export function exportMapFile(mapDataToExport) {
    if (!mapDataToExport) {
        logToConsole("Export Error: No map data provided.");
        alert("Error: No map data available to export.");
        return;
    }

    let mapId = prompt("Enter a filename/ID for the map (e.g., 'my_new_map')", mapDataToExport.id || "map_export");
    if (!mapId) { // User cancelled or entered empty
        logToConsole("Map export cancelled by user.");
        return;
    }
    // Sanitize filename: replace spaces with underscores, remove .json extension if present
    mapId = mapId.replace(/\s+/g, '_').replace(/\.json$/i, "");

    const mapName = document.getElementById('mapNameInput')?.value || mapDataToExport.name || mapId.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    const description = document.getElementById('mapDescriptionInput')?.value || "";
    const author = document.getElementById('mapAuthorInput')?.value || "";
    const customTagsRaw = document.getElementById('mapCustomTagsInput')?.value || "";
    const customTags = customTagsRaw === "" ? [] : customTagsRaw.split(',').map(tag => tag.trim()).filter(Boolean);


    // Create a clean copy for export, ensuring all necessary fields are present
    const exportData = {
        id: mapId,
        name: mapName,
        width: mapDataToExport.width,
        height: mapDataToExport.height,
        startPos: { ...mapDataToExport.startPos },
        levels: JSON.parse(JSON.stringify(mapDataToExport.levels || {})), // Deep copy levels
        npcs: JSON.parse(JSON.stringify(mapDataToExport.npcs || [])),
        portals: JSON.parse(JSON.stringify(mapDataToExport.portals || [])),
        description: description,
        author: author,
        customTags: customTags
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mapId}.json`;
    document.body.appendChild(a); // Required for Firefox for the click to work
    a.click();
    document.body.removeChild(a); // Clean up the DOM
    URL.revokeObjectURL(url); // Free up memory
    logToConsole(LOG_MSG.EXPORTED_MAP(mapId));
}


/**
 * Processes a loaded JSON object, attempts to convert from old formats if necessary,
 * and updates the application's main map data and UI state.
 *
 * @param {object} loadedJson - The raw JSON object parsed from a map file.
 * @param {object} assetManager - The global AssetManager instance, for tile definitions.
 * @param {object} appState - The main application state object (holds UI state and map context like gridW/H, currentZ).
 * @param {object} uiUpdaters - An object containing various UI update callback functions.
 *                              Expected functions: updateUIFromLoadedMap, triggerFullGridRender,
 *                              triggerAllEditorUIsUpdate, buildPalette, populateItemSelectDropdown.
 * @returns {Promise<{success: boolean, mapNameId?: string, error?: string}>}
 *          An object indicating success or failure, the map name/ID, and error message if any.
 */
export async function convertAndSetLoadedMapData(loadedJson, assetManager, appState, uiUpdaters) {
    let newMapDataObject; // This will hold the map data in the current, standardized format.
    let successfullyProcessed = false;
    let loadedMapNameForAlert = "Unknown Map";

    // --- Format Detection and Conversion ---

    // 1. New Format Check (has 'levels' object where each level has 'bottom' and 'middle' properties)
    if (loadedJson.levels && typeof loadedJson.levels === 'object') {
        const firstZKey = Object.keys(loadedJson.levels)[0];
        if (firstZKey && loadedJson.levels[firstZKey] &&
            loadedJson.levels[firstZKey].hasOwnProperty('bottom') &&
            loadedJson.levels[firstZKey].hasOwnProperty('middle')) {

            newMapDataObject = { ...loadedJson }; // Assume it's mostly correct
            // Validate and sanitize basic properties
            newMapDataObject.width = parseInt(newMapDataObject.width, 10) || 20;
            newMapDataObject.height = parseInt(newMapDataObject.height, 10) || 15;
            newMapDataObject.startPos = newMapDataObject.startPos || { x: 0, y: 0, z: DEFAULT_START_POS_Z };
            newMapDataObject.startPos.z = newMapDataObject.startPos.z ?? DEFAULT_START_POS_Z;
            newMapDataObject.npcs = newMapDataObject.npcs || [];
            newMapDataObject.portals = newMapDataObject.portals || [];

            appState.currentEditingZ = newMapDataObject.startPos.z;
            successfullyProcessed = true;
            loadedMapNameForAlert = newMapDataObject.name || newMapDataObject.id || "Unnamed Map";
            logToConsole(LOG_MSG.LOADED_NEW_FORMAT_MAP);
        }
    }

    // 2. Old Format Conversion (if new format check failed)
    if (!successfullyProcessed) {
        logToConsole("Attempting conversion from older map format.");
        let oldFormatLayersSource = null; // e.g., { landscape: [], building: [] }
        const tempConvertedMapData = {
            id: loadedJson.id || `converted_${Date.now()}`,
            name: loadedJson.name || "Converted Map",
            width: parseInt(loadedJson.width, 10),
            height: parseInt(loadedJson.height, 10),
            levels: {}, // Will be populated with Z=0 after conversion
            startPos: {
                x: loadedJson.startPos?.x || Math.floor((loadedJson.width || 20) / 2),
                y: loadedJson.startPos?.y || Math.floor((loadedJson.height || 15) / 2),
                z: 0 // Old formats are assumed to be single-level at Z=0
            },
            npcs: loadedJson.npcs || [],
            portals: loadedJson.portals || [] // Portals might need Z adjustment if old format had them
        };
        loadedMapNameForAlert = tempConvertedMapData.name;

        if (isNaN(tempConvertedMapData.width) || isNaN(tempConvertedMapData.height) || tempConvertedMapData.width <= 0 || tempConvertedMapData.height <= 0) {
            return { success: false, error: "Invalid map dimensions in the loaded (potentially old format) file." };
        }

        // Check for old Z-level format (mapData.levels[z].landscape)
        if (loadedJson.levels && typeof loadedJson.levels === 'object') {
            const firstZKey = Object.keys(loadedJson.levels)[0];
            // Check if the first Z-level contains old layer names
            if (firstZKey && loadedJson.levels[firstZKey] && (loadedJson.levels[firstZKey].hasOwnProperty('landscape') || loadedJson.levels[firstZKey].hasOwnProperty('building'))) {
                oldFormatLayersSource = loadedJson.levels[firstZKey];
                logToConsole(LOG_MSG.LOADED_OLD_Z_FORMAT_MAP);
            }
        }
        // Check for flat old format (mapData.layers.landscape)
        else if (loadedJson.layers && typeof loadedJson.layers === 'object' && (loadedJson.layers.hasOwnProperty('landscape') || loadedJson.layers.hasOwnProperty('building'))) {
            oldFormatLayersSource = loadedJson.layers;
            logToConsole(LOG_MSG.LOADED_FLAT_OLD_FORMAT_MAP);
        }

        if (oldFormatLayersSource) {
            // Create structure for Z=0 in the new format
            tempConvertedMapData.levels["0"] = {
                bottom: createEmptyGrid(tempConvertedMapData.width, tempConvertedMapData.height, ""),
                middle: createEmptyGrid(tempConvertedMapData.width, tempConvertedMapData.height, "")
            };

            const oldLayerProcessingOrder = ["landscape", "building", "item", "roof"];
            for (let y = 0; y < tempConvertedMapData.height; y++) {
                for (let x = 0; x < tempConvertedMapData.width; x++) {
                    let placedOnBottom = false;
                    let placedOnMiddle = false;
                    // Iterate old layers in reverse render order (roof first)
                    // to ensure correct tile ends up if multiple old tiles map to same new layer.
                    for (const oldLayerName of oldLayerProcessingOrder.slice().reverse()) {
                        const tileId = oldFormatLayersSource[oldLayerName]?.[y]?.[x];
                        if (tileId && tileId !== "") { // Ensure tileId is valid
                            const tileDef = assetManager.tilesets[tileId];
                            if (tileDef) {
                                const assignedNewLayer = getLayerForTile(tileDef); // from tileManager.js
                                if (assignedNewLayer === LAYER_TYPES.BOTTOM && !placedOnBottom) {
                                    tempConvertedMapData.levels["0"].bottom[y][x] = tileId;
                                    placedOnBottom = true;
                                } else if (assignedNewLayer === LAYER_TYPES.MIDDLE && !placedOnMiddle) {
                                    // If already placed on bottom, and this one also wants bottom, it's skipped.
                                    // If this wants middle, it's placed.
                                    tempConvertedMapData.levels["0"].middle[y][x] = tileId;
                                    placedOnMiddle = true;
                                }
                            } else {
                                logToConsole(`Warning: Tile ID '${tileId}' found in old map format at (${x},${y}) on layer '${oldLayerName}' has no definition. Skipping.`);
                            }
                        }
                        if (placedOnBottom && placedOnMiddle) break; // Optimization: cell is filled
                    }
                }
            }
            newMapDataObject = tempConvertedMapData;
            appState.currentEditingZ = 0; // Converted maps default to Z=0
            successfullyProcessed = true;
            logToConsole(LOG_MSG.CONVERTED_OLD_MAP_SUCCESS);
        }
    }

    if (!successfullyProcessed || !newMapDataObject) {
        logToConsole(ERROR_MSG.LOAD_MAP_UNRECOGNIZED_FORMAT);
        return { success: false, error: ERROR_MSG.LOAD_MAP_UNRECOGNIZED_FORMAT };
    }

    // --- Apply Processed Data to Application State ---
    setMapData(newMapDataObject); // Update the central mapData store via mapDataManager
    clearUndoRedoStacks();    // New map means new history

    // Update appState context (grid dimensions, current Z)
    appState.gridWidth = newMapDataObject.width;
    appState.gridHeight = newMapDataObject.height;
    // appState.currentEditingZ is already set above based on format or conversion


    // Populate metadata fields in the UI
    // This is done before updateUIFromLoadedMap in case that function relies on these fields being set
    // or if we want to pass the fully populated newMapDataObject to it.
    const el = (id) => document.getElementById(id);
    if (el("mapNameInput")) el("mapNameInput").value = newMapDataObject.name || DEFAULT_MAP_NAME;
    if (el("mapDescriptionInput")) el("mapDescriptionInput").value = newMapDataObject.description || "";
    if (el("mapAuthorInput")) el("mapAuthorInput").value = newMapDataObject.author || "";
    if (el("mapCustomTagsInput")) el("mapCustomTagsInput").value = (newMapDataObject.customTags || []).join(', ');


    // Ensure all Z-levels mentioned in the loaded map have their layer structures initialized.
    // This includes Z-levels from startPos, portals (source and target), and NPCs.
    const zsToEnsure = new Set([appState.currentEditingZ]);
    if (newMapDataObject.startPos?.z !== undefined) zsToEnsure.add(newMapDataObject.startPos.z);
    (newMapDataObject.portals || []).forEach(p => {
        if (p.z !== undefined) zsToEnsure.add(p.z);
        if (p.targetZ !== undefined) zsToEnsure.add(p.targetZ); // Also ensure target Zs exist for context
    });
    (newMapDataObject.npcs || []).forEach(npc => { if (npc.mapPos?.z !== undefined) zsToEnsure.add(npc.mapPos.z); });
    Object.keys(newMapDataObject.levels || {}).forEach(zKey => zsToEnsure.add(parseInt(zKey, 10)));

    for (const z of zsToEnsure) {
        if (!isNaN(z)) { // Ensure z is a valid number
            ensureLayersForZ(z, appState.gridWidth, appState.gridHeight, newMapDataObject);
        }
    }

    // Update UI elements based on the now current mapData and appState
    if (uiUpdaters.updateUIFromLoadedMap) {
        uiUpdaters.updateUIFromLoadedMap(newMapDataObject, appState.currentEditingZ, appState.currentTool);
    }

    appState.nextPortalId = getNextPortalIdFromData(); // Recalculate next portal ID from mapDataManager

    // Reset UI selections and interaction states
    appState.selectedPortal = null;
    appState.selectedNpc = null;
    appState.selectedTileForInventory = null;
    appState.selectedGenericTile = null;
    appState.dragStart = null;
    appState.previewPos = null;
    appState.stampData3D = null;
    // appState.addingNpcModeState = false; // If this state exists

    if (uiUpdaters.triggerAllEditorUIsUpdate) uiUpdaters.triggerAllEditorUIsUpdate();
    if (uiUpdaters.buildPalette) uiUpdaters.buildPalette(appState.currentTileId, appState.activeTagFilters);
    if (uiUpdaters.populateItemSelectDropdown) uiUpdaters.populateItemSelectDropdown();
    if (uiUpdaters.triggerFullGridRender) uiUpdaters.triggerFullGridRender();

    return { success: true, mapNameId: loadedMapNameForAlert };
}
