// mapMaker/toolManager.js
"use strict";

import { snapshot, setPlayerStart as setPlayerStartInData, addPortalToMap, getNextPortalId as getNextPortalIdFromData, addNpcToMap, getNextNpcId as getNextNpcIdFromData } from './mapDataManager.js'; // Added addNpcToMap and getNextNpcId
import { placeTile, getTopmostTileAt, getLayerForTile } from './tileManager.js'; // Added getLayerForTile
import { DEFAULT_PORTAL_TARGET_MAP_ID, DEFAULT_PORTAL_TARGET_X, DEFAULT_PORTAL_TARGET_Y, DEFAULT_PORTAL_TARGET_Z, DEFAULT_PORTAL_NAME, PORTAL_ID_PREFIX, NPC_ID_PREFIX, LAYER_TYPES, LOG_MSG, ERROR_MSG, STAMP_COPY_LAYERS } from './config.js'; // Added NPC_ID_PREFIX
import { logToConsole } from './config.js';
import { createEmptyGrid } from './gridUtils.js';


// --- Tool Implementations ---
// Note: Brush tool is simple enough that its logic (calling placeTile) can be handled
// directly in the mouse down event handler (eventHandlers.js) without a dedicated function here.

/**
 * Handles the Player Start tool action.
 * Sets the player's starting position in the map data.
 * @param {number} x - X-coordinate for player start.
 * @param {number} y - Y-coordinate for player start.
 * @param {number} z - Z-coordinate for player start.
 * @param {MapData} mapData - The current map data object.
 * @param {function} renderFn - Callback to re-render the grid.
 * @param {function} updatePlayerStartDispFn - Callback to update the player start display UI.
 */
export function handlePlayerStartTool(x, y, z, mapData, renderFn, updatePlayerStartDispFn) {
    snapshot(); // Create undo state before modification
    setPlayerStartInData(x, y, z); // Updates mapData.startPos
    if (updatePlayerStartDispFn) updatePlayerStartDispFn(mapData.startPos);
    if (renderFn) renderFn();
    logToConsole(`Player start tool used. New start: (${x},${y},Z${z})`);
}

/**
 * Handles clicks for the Portal tool.
 * If a portal exists at the click location, it's selected. Otherwise, a new portal is created.
 * @param {number} x - Clicked X-coordinate.
 * @param {number} y - Clicked Y-coordinate.
 * @param {number} z - Current editing Z-level.
 * @param {MapData} mapData - The current map data.
 * @param {object} uiState - The UI state object (to update selectedPortal).
 * @param {function} renderFn - Callback to re-render the grid.
 * @param {function} updatePortalInfoUIFn - Callback to update the portal editor UI.
 * @param {function} clearOtherSelectionsFn - Callback to clear other selections (NPC, tile).
 */
export function handlePortalToolClick(x, y, z, mapData, uiState, renderFn, updatePortalInfoUIFn, clearOtherSelectionsFn) {
    snapshot();
    const existingPortal = mapData.portals.find(p => p.x === x && p.y === y && p.z === z);
    if (existingPortal) {
        uiState.selectedPortal = existingPortal;
        logToConsole(LOG_MSG.PORTAL_TOOL_SELECTED_EXISTING(existingPortal.id, existingPortal.z));
    } else {
        const newPortalIdNum = getNextPortalIdFromData(); // Gets the next integer ID
        const newPortal = {
            id: `${PORTAL_ID_PREFIX}${newPortalIdNum}`,
            x: x, y: y, z: z,
            targetMapId: DEFAULT_PORTAL_TARGET_MAP_ID,
            targetX: DEFAULT_PORTAL_TARGET_X,
            targetY: DEFAULT_PORTAL_TARGET_Y,
            targetZ: DEFAULT_PORTAL_TARGET_Z,
            name: DEFAULT_PORTAL_NAME
        };
        addPortalToMap(newPortal); // Adds to mapData.portals
        uiState.selectedPortal = newPortal; // Select the newly created portal
        logToConsole(LOG_MSG.PORTAL_TOOL_ADDED_NEW(newPortal.id, x, y, z));
    }

    if (clearOtherSelectionsFn) clearOtherSelectionsFn(); // Clear NPC, tile selections
    if (updatePortalInfoUIFn) updatePortalInfoUIFn(uiState.selectedPortal);
    if (renderFn) renderFn(); // Update grid to show portal selection/marker
}

/**
 * Handles clicks for the Select/Inspect tool.
 * Determines if a portal, NPC, or tile was clicked and updates the UI state accordingly.
 * @param {number} x - Clicked X-coordinate.
 * @param {number} y - Clicked Y-coordinate.
 * @param {number} z - Current editing Z-level.
 * @param {MapData} mapData - The current map data.
 * @param {object} uiState - The UI state object (for updating selections).
 * @param {object} assetManager - Instance of the AssetManager for tile definitions.
 * @param {object} interactionRefs - Object containing callbacks for UI updates (updateAllEditorUIs, renderGrid, etc.).
 */
export function handleSelectInspectTool(x, y, z, mapData, uiState, assetManager, interactionRefs) {
    // Deactivate any "add" modes (e.g., if an "Add NPC" mode was active)
    // This logic might be better handled in the main event dispatcher when tools are switched.
    // if (uiState.addingNpcModeState) { ... } 

    const clickedPortal = mapData.portals.find(p => p.x === x && p.y === y && p.z === z);
    if (clickedPortal) {
        uiState.selectedPortal = clickedPortal;
        uiState.selectedNpc = null;
        uiState.selectedTileForInventory = null;
        uiState.selectedGenericTile = null;
        logToConsole(LOG_MSG.SELECT_TOOL_SELECTED_PORTAL(clickedPortal.id, clickedPortal.z));
    } else {
        const clickedNpc = mapData.npcs.find(npc => npc.mapPos?.x === x && npc.mapPos?.y === y && npc.mapPos?.z === z);
        if (clickedNpc) {
            uiState.selectedNpc = clickedNpc;
            uiState.selectedPortal = null;
            uiState.selectedTileForInventory = null;
            uiState.selectedGenericTile = null;
            logToConsole(LOG_MSG.SELECT_TOOL_SELECTED_NPC(clickedNpc.id, clickedNpc.mapPos.z));
        } else {
            // If not a portal or NPC, inspect the tile itself
            const topmostTileInfo = getTopmostTileAt(x, y, z, mapData, assetManager);
            if (topmostTileInfo) {
                const { layer, definition } = topmostTileInfo;
                uiState.selectedGenericTile = { x, y, z, layerName: layer }; // For general property editor

                if (definition.tags?.includes('container') || definition.tags?.includes('door') || definition.tags?.includes('window')) {
                    uiState.selectedTileForInventory = { x, y, z, layerName: layer }; // For inventory/lock editor
                } else {
                    uiState.selectedTileForInventory = null;
                }
            } else { // Clicked on empty space
                uiState.selectedGenericTile = null;
                uiState.selectedTileForInventory = null;
            }
            // Clear portal/NPC if a tile (or empty space) was clicked
            uiState.selectedPortal = null;
            uiState.selectedNpc = null;
        }
    }

    if (interactionRefs.updateAllEditorUIs) interactionRefs.updateAllEditorUIs();
    if (interactionRefs.renderGrid) interactionRefs.renderGrid(); // To show selection highlights
}


/**
 * Handles clicks for the NPC tool.
 * If an NPC exists at the click location, it's selected.
 * Otherwise, if a base NPC type is selected in the NPC panel, a new NPC is created.
 * @param {number} x - Clicked X-coordinate.
 * @param {number} y - Clicked Y-coordinate.
 * @param {number} z - Current editing Z-level.
 * @param {MapData} mapData - The current map data.
 * @param {object} appState - The main application state (uiStateHolder in some contexts).
 * @param {object} assetManager - Instance of the AssetManager for NPC definitions.
 * @param {object} interactionFns - Object containing callbacks like updateNpcEditorUI, renderGrid, clearOtherSelections.
 */
export function handleNpcToolClick(x, y, z, mapData, appState, assetManager, interactionFns) {
    snapshot(); // For undo functionality

    const { updateNpcEditorUI, renderGrid, clearOtherSelections } = interactionFns;

    const existingNpc = mapData.npcs.find(npc => npc.mapPos?.x === x && npc.mapPos?.y === y && npc.mapPos?.z === z);

    if (existingNpc) {
        appState.selectedNpc = existingNpc;
        logToConsole(LOG_MSG.NPC_TOOL_SELECTED_EXISTING(existingNpc.id, existingNpc.mapPos.z));
    } else {
        // Logic to place a new NPC
        const selectedBaseNpcId = document.getElementById('npcBaseTypeSelect')?.value;
        if (!selectedBaseNpcId || !assetManager.npcDefinitions || !assetManager.npcDefinitions[selectedBaseNpcId]) {
            logToConsole("NPC Tool: No base NPC type selected in the panel, or definitions missing. Cannot place new NPC.", "warn");
            // Optionally, provide user feedback via a status message
            if (interactionFns.showStatusMessage) {
                interactionFns.showStatusMessage("Select a base NPC type from the NPC panel to place a new NPC.", "warn");
            }
            appState.selectedNpc = null; // Ensure nothing is selected if placement fails
        } else {
            const baseNpcDef = assetManager.npcDefinitions[selectedBaseNpcId];
            // Deep copy the base NPC definition
            const newNpcInstance = JSON.parse(JSON.stringify(baseNpcDef));

            newNpcInstance.id = `${NPC_ID_PREFIX}${appState.nextNpcId++}`; // Assign a unique ID
            newNpcInstance.mapPos = { x, y, z };
            // Instance-specific name can be set here or default to base name, editable later
            newNpcInstance.name = newNpcInstance.name || baseNpcDef.name;
            // Ensure definitionId is stored on the instance if not already part of baseNpcDef structure
            newNpcInstance.definitionId = selectedBaseNpcId;

            // Initialize faceData for the new NPC
            newNpcInstance.faceData = {};
            if (typeof window.generateRandomFaceParams === 'function' && typeof window.generateAsciiFace === 'function') {
                window.generateRandomFaceParams(newNpcInstance.faceData);
                newNpcInstance.faceData.asciiFace = window.generateAsciiFace(newNpcInstance.faceData);
            } else {
                console.warn("Map Maker: generateRandomFaceParams or generateAsciiFace not found. New NPC will have default face data.");
                newNpcInstance.faceData = { // Basic fallback
                    headWidth: 5, headHeight: 7, eyeSize: 2, browHeight: 0, browAngle: 0, browWidth: 2,
                    noseWidth: 2, noseHeight: 2, mouthWidth: 3, mouthFullness: 1,
                    hairstyle: "short", facialHair: "none", glasses: "none",
                    eyeColor: "#000000", hairColor: "#000000", lipColor: "#FFC0CB", skinColor: "#F5DEB3",
                    asciiFace: ":)"
                };
            }
            // Initialize wieldedWeapon (though not directly part of face generation, good place for new NPC defaults)
            newNpcInstance.wieldedWeapon = "Unarmed";


            addNpcToMap(newNpcInstance); // Add to mapData.npcs
            appState.selectedNpc = newNpcInstance; // Select the newly created NPC
            logToConsole(LOG_MSG.NPC_TOOL_ADDED_NEW(newNpcInstance.id, x, y, z, selectedBaseNpcId));
        }
    }

    if (clearOtherSelections) clearOtherSelections(); // Clear portal, tile selections
    if (updateNpcEditorUI) updateNpcEditorUI(appState.selectedNpc, assetManager.npcDefinitions);
    if (renderGrid) renderGrid(); // Update grid to show NPC selection/marker
}


/**
 * Performs a 2D flood fill operation starting from a given point.
 * @param {number} startX - Starting X-coordinate.
 * @param {number} startY - Starting Y-coordinate.
 * @param {number} startZ - Starting Z-coordinate (fill is constrained to this Z-level).
 * @param {string|object} newTileBrushIdOrObject - The tile ID or object to fill with.
 * @param {MapData} mapData - The current map data.
 * @param {object} assetManager - The AssetManager instance.
 * @param {object} interactionInterface - Interface providing map context and UI renderers.
 */
export function floodFill2D(startX, startY, startZ, newTileBrushIdOrObject, mapData, assetManager, interactionInterface) {
    snapshot();
    const { ensureLayersForZ, gridWidth, gridHeight } = interactionInterface.getMapContext();
    const { renderGrid } = interactionInterface.getUIRenderers();

    // ensureLayersForZ should be called by the caller if there's a chance startZ doesn't exist.
    // For fill, we assume the Z level exists as the click happened on it.

    // Determine the tile being clicked on to get its ID and the specific layer it's on for 2D fill.
    const clickedTileInfo = getTopmostTileAt(startX, startY, startZ, mapData, assetManager);

    let oldTileIdToReplace; // This will be the base ID string of the tile to be replaced.
    let sourceLayerType;   // The specific layer (bottom or middle) where the fill will operate.

    if (clickedTileInfo) {
        oldTileIdToReplace = clickedTileInfo.baseId;
        sourceLayerType = clickedTileInfo.layer; // 2D Fill is constrained to the layer of the clicked tile.
    } else {
        // Clicked on completely empty space on this Z-level.
        oldTileIdToReplace = ""; // Target "air" for replacement.
        // When filling "air" on a 2D plane, we need to pick a layer.
        // Default to filling the "bottom" layer's emptiness. This behavior could be made configurable.
        // Or, if the newTileBrushId has a preferred layer (e.g., a "wall" for "middle"), use that.
        const newTileDef = assetManager.tilesets[(typeof newTileBrushIdOrObject === 'object' ? newTileBrushIdOrObject.tileId : newTileBrushIdOrObject)];
        sourceLayerType = newTileDef ? getLayerForTile(newTileDef) : LAYER_TYPES.BOTTOM;
        logToConsole(`Flood fill 2D: Clicked on empty space. Target layer for new tiles: ${sourceLayerType}`);
    }

    const effectiveNewBaseId = (typeof newTileBrushIdOrObject === 'object' && newTileBrushIdOrObject?.tileId)
        ? newTileBrushIdOrObject.tileId
        : newTileBrushIdOrObject;

    if (oldTileIdToReplace === effectiveNewBaseId && oldTileIdToReplace !== "") return;
    if (oldTileIdToReplace === "" && effectiveNewBaseId === "") return; // Eraser on already empty.

    const stack = [[startX, startY]];
    const visited = new Set([`${startX},${startY}`]); // Prevent re-processing cells

    while (stack.length > 0) {
        const [cx, cy] = stack.pop();

        // Get current tile on the determined sourceLayerType at these coordinates
        const currentTileDataInGrid = mapData.levels[startZ.toString()]?.[sourceLayerType]?.[cy]?.[cx];
        const effectiveCurrentIdInGrid = (typeof currentTileDataInGrid === 'object' && currentTileDataInGrid?.tileId)
            ? currentTileDataInGrid.tileId
            : (currentTileDataInGrid || ""); // Treat undefined/null as empty string for comparison with oldTileIdToReplace

        if (effectiveCurrentIdInGrid === oldTileIdToReplace) {
            placeTile(cx, cy, startZ, newTileBrushIdOrObject, mapData, ensureLayersForZ, gridWidth, gridHeight, null /* no immediate render per cell */);

            [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
                const nx = cx + dx;
                const ny = cy + dy;
                const nCoordStr = `${nx},${ny}`;
                if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight && !visited.has(nCoordStr)) {
                    const neighborTileData = mapData.levels[startZ.toString()]?.[sourceLayerType]?.[ny]?.[nx];
                    const effectiveNeighborId = (typeof neighborTileData === 'object' && neighborTileData?.tileId)
                        ? neighborTileData.tileId
                        : (neighborTileData || "");
                    if (effectiveNeighborId === oldTileIdToReplace) {
                        visited.add(nCoordStr);
                        stack.push([nx, ny]);
                    }
                }
            });
        }
    }
    if (renderGrid) renderGrid(); // Single render after all changes
    logToConsole(`Flood fill 2D completed at (${startX},${startY},Z${startZ}) replacing '${oldTileIdToReplace}' with '${effectiveNewBaseId}' on layer '${sourceLayerType}'.`);
}


/**
 * Performs a 3D flood fill operation.
 * @param {number} startX - Starting X-coordinate.
 * @param {number} startY - Starting Y-coordinate.
 * @param {number} startZ - Starting Z-coordinate.
 * @param {string|object} newTileBrushIdOrObject - Tile ID or object to fill with.
 * @param {MapData} mapData - Current map data.
 * @param {object} assetManager - AssetManager instance.
 * @param {object} interactionInterface - Interface for map context and UI renderers.
 */
export function floodFill3D(startX, startY, startZ, newTileBrushIdOrObject, mapData, assetManager, interactionInterface) {
    snapshot();
    const { ensureLayersForZ, gridWidth, gridHeight } = interactionInterface.getMapContext();
    const { renderGrid } = interactionInterface.getUIRenderers();

    const clickedTileInfo = getTopmostTileAt(startX, startY, startZ, mapData, assetManager);
    const oldTileIdToReplace = clickedTileInfo ? clickedTileInfo.baseId : "";

    const effectiveNewBaseId = (typeof newTileBrushIdOrObject === 'object' && newTileBrushIdOrObject?.tileId)
        ? newTileBrushIdOrObject.tileId
        : newTileBrushIdOrObject;

    if (oldTileIdToReplace === effectiveNewBaseId && oldTileIdToReplace !== "") return;
    if (oldTileIdToReplace === "" && effectiveNewBaseId === "") return;

    const queue = [{ x: startX, y: startY, z: startZ }];
    const visited = new Set([`${startX},${startY},${startZ}`]);

    while (queue.length > 0) {
        const { x, y, z } = queue.shift();
        const zStr = z.toString();

        if (!mapData.levels[zStr]) continue; // Don't fill into non-existent Z-levels (unless intended)
        // ensureLayersForZ(z, gridWidth, gridHeight, mapData); // Called by placeTile if needed

        let tileActionTaken = false;

        if (oldTileIdToReplace === "") { // Filling "air"
            if (!getTopmostTileAt(x, y, z, mapData, assetManager)) { // Check if cell is truly empty
                placeTile(x, y, z, newTileBrushIdOrObject, mapData, ensureLayersForZ, gridWidth, gridHeight, null);
                tileActionTaken = true;
            }
        } else { // Replacing a specific tile ID
            // In 3D fill, if oldTileIdToReplace is found on *any* layer at X,Y,Z, we replace.
            // The new tile will be placed on its correct layer by placeTile.
            // This means we might need to clear the old tile's original position(s) if it's on a different layer than the new one.
            let replacedOnCoord = false;
            for (const layerName of [LAYER_TYPES.MIDDLE, LAYER_TYPES.BOTTOM]) {
                const tileDataCurrent = mapData.levels[zStr]?.[layerName]?.[y]?.[x];
                const idCurrent = (typeof tileDataCurrent === 'object' && tileDataCurrent?.tileId) ? tileDataCurrent.tileId : tileDataCurrent;

                if (idCurrent === oldTileIdToReplace) {
                    // If erasing, placeTile with "" will clear both layers.
                    // If placing a new tile, first clear the specific spot where oldTile was found,
                    // then placeTile will put the new one on its correct layer.
                    if (effectiveNewBaseId !== "") {
                        mapData.levels[zStr][layerName][y][x] = ""; // Clear the specific spot
                    }
                    placeTile(x, y, z, newTileBrushIdOrObject, mapData, ensureLayersForZ, gridWidth, gridHeight, null);
                    replacedOnCoord = true;
                    break; // Processed this XYZ coordinate
                }
            }
            if (replacedOnCoord) tileActionTaken = true;
        }

        if (tileActionTaken) {
            const neighbors = [
                { dx: 1, dy: 0, dz: 0 }, { dx: -1, dy: 0, dz: 0 },
                { dx: 0, dy: 1, dz: 0 }, { dx: 0, dy: -1, dz: 0 },
                { dx: 0, dy: 0, dz: 1 }, { dx: 0, dy: 0, dz: -1 }
            ];
            for (const n of neighbors) {
                const nx = x + n.dx;
                const ny = y + n.dy;
                const nz = z + n.dz;
                const neighborCoordStr = `${nx},${ny},${nz}`;

                if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight &&
                    mapData.levels[nz.toString()] && // Only spread to existing Z-levels
                    !visited.has(neighborCoordStr)) {

                    let neighborMatchesCriteria = false;
                    const nzStr = nz.toString();
                    // ensureLayersForZ(nz, gridWidth, gridHeight, mapData); // ensure neighbor Z layers exist

                    if (oldTileIdToReplace === "") { // Filling air
                        if (!getTopmostTileAt(nx, ny, nz, mapData, assetManager)) neighborMatchesCriteria = true;
                    } else { // Replacing specific tile: check if any layer at neighbor has the oldTileId
                        for (const layerName of [LAYER_TYPES.MIDDLE, LAYER_TYPES.BOTTOM]) {
                            const tileDataNeighbor = mapData.levels[nzStr]?.[layerName]?.[ny]?.[nx];
                            const idInGridNeighbor = (typeof tileDataNeighbor === 'object' && tileDataNeighbor?.tileId)
                                ? tileDataNeighbor.tileId
                                : tileDataNeighbor;
                            if (idInGridNeighbor === oldTileIdToReplace) {
                                neighborMatchesCriteria = true;
                                break;
                            }
                        }
                    }
                    if (neighborMatchesCriteria) {
                        visited.add(neighborCoordStr);
                        queue.push({ x: nx, y: ny, z: nz });
                    }
                }
            }
        }
    }
    if (renderGrid) renderGrid();
    logToConsole(`Flood fill 3D completed at (${startX},${startY},Z${startZ}) replacing '${oldTileIdToReplace}' with '${effectiveNewBaseId}'.`);
}


/**
 * Draws a line of tiles.
 * @param {number} x0 - Start X of the line.
 * @param {number} y0 - Start Y of the line.
 * @param {number} z - Z-level for the line.
 * @param {number} x1 - End X of the line.
 * @param {number} y1 - End Y of the line.
 * @param {string|object} tileIdOrObject - Tile ID or object to draw with.
 * @param {MapData} mapData - Current map data.
 * @param {object} assetManager - AssetManager instance.
 * @param {object} interactionInterface - For map context and UI renderers.
 */
export function drawLine(x0, y0, z, x1, y1, tileIdOrObject, mapData, assetManager, interactionInterface, brushSize = 1) { // Added brushSize
    snapshot();
    const { ensureLayersForZ, gridWidth, gridHeight } = interactionInterface.getMapContext();
    const { renderGrid } = interactionInterface.getUIRenderers();
    const halfBrush = Math.floor(brushSize / 2);

    let currentX = x0;
    let currentY = y0;
    const dx = Math.abs(x1 - currentX);
    const dy = -Math.abs(y1 - currentY);
    const sx = currentX < x1 ? 1 : -1;
    const sy = currentY < y1 ? 1 : -1;
    let error = dx + dy;

    while (true) {
        // For each point on the line, draw a brushSize x brushSize square
        const startDrawX = currentX - halfBrush;
        const startDrawY = currentY - halfBrush;

        for (let i = 0; i < brushSize; i++) {
            for (let j = 0; j < brushSize; j++) {
                const drawX = startDrawX + j;
                const drawY = startDrawY + i;
                if (drawX >= 0 && drawX < gridWidth && drawY >= 0 && drawY < gridHeight) {
                    placeTile(drawX, drawY, z, tileIdOrObject, mapData, ensureLayersForZ, gridWidth, gridHeight, null);
                }
            }
        }

        if (currentX === x1 && currentY === y1) break;
        const e2 = 2 * error;
        if (e2 >= dy) {
            if (currentX === x1) break;
            error += dy;
            currentX += sx;
        }
        if (e2 <= dx) {
            if (currentY === y1) break;
            error += dx;
            currentY += sy;
        }
    }
    if (renderGrid) renderGrid();
    logToConsole(`Line drawn from (${x0},${y0}) to (${x1},${y1}) at Z${z}.`);
}

/**
 * Draws a filled 3D rectangle (cuboid) of tiles.
 * @param {number} x0 - Start X of the rectangle base.
 * @param {number} y0 - Start Y of the rectangle base.
 * @param {number} startZ - Starting Z-level of the cuboid.
 * @param {number} x1 - End X of the rectangle base.
 * @param {number} y1 - End Y of the rectangle base.
 * @param {number} depth - Depth of the cuboid (number of Z-levels).
 * @param {string|object} tileIdOrObject - Tile ID or object to draw with.
 * @param {MapData} mapData - Current map data.
 * @param {object} assetManager - AssetManager instance.
 * @param {object} interactionInterface - For map context and UI renderers.
 */
export function drawRect(x0, y0, startZ, x1, y1, depth, tileIdOrObject, mapData, assetManager, interactionInterface) {
    snapshot();
    const { ensureLayersForZ, gridWidth, gridHeight } = interactionInterface.getMapContext();
    const { renderGrid } = interactionInterface.getUIRenderers();

    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    for (let i = 0; i < depth; i++) {
        const currentActualZ = startZ + i;
        // ensureLayersForZ will be called by placeTile if the Z-level is new.
        // However, if we want to ensure all Z-levels for the rect exist *before* placing,
        // it could be called here: ensureLayersForZ(currentActualZ, gridWidth, gridHeight, mapData);

        for (let yy = minY; yy <= maxY; yy++) {
            for (let xx = minX; xx <= maxX; xx++) {
                if (xx >= 0 && xx < gridWidth && yy >= 0 && yy < gridHeight) { // Check bounds for X,Y
                    placeTile(xx, yy, currentActualZ, tileIdOrObject, mapData, ensureLayersForZ, gridWidth, gridHeight, null);
                }
            }
        }
    }
    if (renderGrid) renderGrid();
    logToConsole(`Rectangle/Cuboid drawn from (${minX},${minY},Z${startZ}) to (${maxX},${maxY},Z${startZ + depth - 1}).`);
}

/**
 * Defines a 3D stamp area from the current map state.
 * @param {number} x0 - Start X of the stamp area.
 * @param {number} y0 - Start Y of the stamp area.
 * @param {number} z0 - Starting Z-level of the stamp area in the map.
 * @param {number} x1 - End X of the stamp area.
 * @param {number} y1 - End Y of the stamp area.
 * @param {number} copyDepth - Number of Z-levels to include in the stamp.
 * @param {MapData} mapData - Current map data.
 * @param {object} uiState - UI state object (to store stampData3D).
 * @param {object} interactionInterface - For map context.
 */
export function defineStamp(x0, y0, z0, x1, y1, copyDepth, mapData, uiState, interactionInterface) {
    const { gridWidth, gridHeight } = interactionInterface.getMapContext();
    const stampW = Math.abs(x1 - x0) + 1;
    const stampH = Math.abs(y1 - y0) + 1;
    const mapStartX = Math.min(x0, x1);
    const mapStartY = Math.min(y0, y1);

    uiState.stampData3D = { w: stampW, h: stampH, depth: copyDepth, levels: {} };

    for (let zi = 0; zi < copyDepth; zi++) { // zi is relative Z index within the stamp (0 to depth-1)
        const sourceMapZ = z0 + zi; // Actual Z-level in the map to copy from
        const sourceMapZStr = sourceMapZ.toString();

        if (mapData.levels[sourceMapZStr]) {
            uiState.stampData3D.levels[zi] = {};
            STAMP_COPY_LAYERS.forEach(layerType => { // STAMP_COPY_LAYERS from config.js
                const sourceLayerGrid = mapData.levels[sourceMapZStr][layerType];
                if (sourceLayerGrid) {
                    uiState.stampData3D.levels[zi][layerType] = [];
                    for (let yy = 0; yy < stampH; yy++) { // yy is relative Y within the stamp
                        uiState.stampData3D.levels[zi][layerType][yy] = [];
                        for (let xx = 0; xx < stampW; xx++) { // xx is relative X within the stamp
                            const currentMapX = mapStartX + xx;
                            const currentMapY = mapStartY + yy;
                            // Check if source coordinates are within map bounds
                            if (currentMapX >= 0 && currentMapX < gridWidth && currentMapY >= 0 && currentMapY < gridHeight) {
                                const tileData = sourceLayerGrid[currentMapY]?.[currentMapX];
                                // Deep copy tile data if it's an object to prevent reference issues
                                uiState.stampData3D.levels[zi][layerType][yy][xx] = tileData ? JSON.parse(JSON.stringify(tileData)) : "";
                            } else {
                                uiState.stampData3D.levels[zi][layerType][yy][xx] = ""; // Mark as empty if source is out of bounds
                            }
                        }
                    }
                } else {
                    uiState.stampData3D.levels[zi][layerType] = createEmptyGrid(stampW, stampH, ""); // Layer doesn't exist on source
                }
            });
        } else {
            // If a Z-level in the copy range doesn't exist in the source map, create empty layers for it in the stamp
            uiState.stampData3D.levels[zi] = {};
            STAMP_COPY_LAYERS.forEach(layerType => {
                uiState.stampData3D.levels[zi][layerType] = createEmptyGrid(stampW, stampH, "");
            });
        }
    }
    logToConsole(LOG_MSG.STAMP_DEFINED_3D(uiState.stampData3D));
    // Render preview will update on next mouse move via UIManager.
}

/**
 * Applies a previously defined 3D stamp to the map.
 * @param {number} pasteBaseX - Top-left X-coordinate where the stamp will be applied.
 * @param {number} pasteBaseY - Top-left Y-coordinate where the stamp will be applied.
 * @param {number} pasteBaseZ - Starting Z-level where the stamp will be applied.
 * @param {object} stampData3D - The stamp data object (defined by defineStamp).
 * @param {MapData} mapData - Current map data.
 * @param {object} assetManager - AssetManager instance.
 * @param {object} interactionInterface - For map context and UI renderers.
 */
export function applyStamp(pasteBaseX, pasteBaseY, pasteBaseZ, stampData3D, mapData, assetManager, interactionInterface) {
    if (!stampData3D || !stampData3D.levels) {
        logToConsole("Apply Stamp: No valid stamp data available.");
        return;
    }
    snapshot();
    const { ensureLayersForZ, gridWidth, gridHeight } = interactionInterface.getMapContext();
    const { renderGrid } = interactionInterface.getUIRenderers();

    for (let zi = 0; zi < stampData3D.depth; zi++) {
        const targetZInMap = pasteBaseZ + zi;
        // ensureLayersForZ will be called by placeTile if the Z-level is new.

        if (stampData3D.levels[zi]) {
            for (const layerType of STAMP_COPY_LAYERS) { // Iterate defined layers in STAMP_COPY_LAYERS
                if (stampData3D.levels[zi][layerType]) {
                    const stampedLayerGrid = stampData3D.levels[zi][layerType];
                    for (let yy = 0; yy < stampData3D.h; yy++) {
                        for (let xx = 0; xx < stampData3D.w; xx++) {
                            const targetMapX = pasteBaseX + xx;
                            const targetMapY = pasteBaseY + yy;

                            if (targetMapX >= 0 && targetMapX < gridWidth && targetMapY >= 0 && targetMapY < gridHeight) {
                                const tileToPlace = stampedLayerGrid[yy]?.[xx];
                                // Check for undefined/null explicitly; "" is a valid "empty" tile to place from stamp.
                                if (tileToPlace !== undefined && tileToPlace !== null) {
                                    // Deep copy the tile data again for placement to ensure no shared references if stamping multiple times
                                    placeTile(targetMapX, targetMapY, targetZInMap, JSON.parse(JSON.stringify(tileToPlace)), mapData, ensureLayersForZ, gridWidth, gridHeight, null);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    if (renderGrid) renderGrid();
    logToConsole(`Stamp applied at (${pasteBaseX},${pasteBaseY},Z${pasteBaseZ}).`);
}
