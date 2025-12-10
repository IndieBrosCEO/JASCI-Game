// mapMaker/uiManager.js
"use strict";

import { getMapData, getPlayerStart } from './mapDataManager.js'; // For mapData access
import { LAYER_TYPES, PLAYER_START_SPRITE, PLAYER_START_COLOR, PLAYER_START_BG_COLOR, ONION_BELOW_COLOR, ONION_ABOVE_COLOR, ERROR_MSG, LOG_MSG, DEFAULT_3D_DEPTH, DEFAULT_ONION_LAYERS_BELOW, DEFAULT_ONION_LAYERS_ABOVE } from './config.js';
import { getEffectiveTileForDisplay } from './tileManager.js'; // For rendering logic
import { logToConsole } from './config.js';


// Module-level references to be set by initializeUIManager
let assetManagerInstance = null;
let uiStateHolder = null;         // Holds currentTool, currentTileId, selections, etc.
let interactionDispatcher = null; // For functions like handleCellMouseDown, handleCellMouseUp

/**
 * Initializes the UIManager with necessary references.
 * @param {object} assetManager - The global AssetManager instance.
 * @param {object} uiState - An object holding UI-related state (currentTool, selections, etc.).
 * @param {object} interactionFns - An object mapping interaction functions (e.g., handleCellMouseDown).
 */
export function initializeUIManager(assetManager, uiState, interactionFns) {
    assetManagerInstance = assetManager;
    uiStateHolder = uiState;
    interactionDispatcher = interactionFns;
    logToConsole("UIManager initialized.");
}

// --- Palette Management ---
const paletteContainer = document.getElementById("paletteContainer");

/**
 * Builds and displays the tile palette based on loaded assets and active tag filters.
 * @param {string} currentSelectedTileId - The ID of the currently selected tile in the palette.
 * @param {string[]} activeTagFilters - An array of tags to filter the palette by.
 */
export function buildPalette(currentSelectedTileId, activeTagFilters = []) {
    if (!assetManagerInstance || !uiStateHolder || !interactionDispatcher) {
        console.error("UIManager: Not fully initialized. Cannot build palette.");
        if (paletteContainer) paletteContainer.innerHTML = `<p>Error: UI Manager not initialized.</p>`;
        return;
    }
    if (!paletteContainer) {
        console.error("UIManager: paletteContainer DOM element not found.");
        return;
    }
    paletteContainer.innerHTML = ""; // Clear existing palette

    const paletteSearchInput = document.getElementById('paletteSearchInput');
    const searchTerm = paletteSearchInput ? paletteSearchInput.value.toLowerCase().trim() : "";

    const eraser = document.createElement("div");
    eraser.className = "palette-tile"; // Consistent class naming
    eraser.dataset.tileId = ""; // Eraser represented by empty string
    eraser.textContent = "✖";
    eraser.title = "Eraser (Clear Tile at X,Y,Z on all layers)";
    eraser.onclick = () => {
        uiStateHolder.currentTileId = "";
        updatePaletteSelectionUI(uiStateHolder.currentTileId);
        if (interactionDispatcher.onPaletteTileSelect) {
            interactionDispatcher.onPaletteTileSelect(""); // Notify main logic of selection
        }
    };
    paletteContainer.appendChild(eraser);

    if (assetManagerInstance.tilesets && Object.keys(assetManagerInstance.tilesets).length > 0) {
        Object.entries(assetManagerInstance.tilesets).forEach(([id, tileDef]) => {
            let matchesTagFilters = true;
            if (activeTagFilters.length > 0) {
                matchesTagFilters = activeTagFilters.every(filterTag => tileDef.tags && tileDef.tags.includes(filterTag));
            }

            let matchesSearchTerm = true;
            if (searchTerm !== "") {
                const tileNameLower = (tileDef.name || "").toLowerCase();
                const tileIdLower = id.toLowerCase();
                matchesSearchTerm = tileNameLower.includes(searchTerm) || tileIdLower.includes(searchTerm);
            }

            if (!matchesTagFilters || !matchesSearchTerm) return;

            // Optionally skip tiles that are purely for auto-tiling results (e.g., specific corner pieces not meant for direct use)
            if (tileDef.tags?.includes('auto_tile_result_only')) {
                return;
            }

            const tileElement = document.createElement("div");
            tileElement.className = "palette-tile";
            tileElement.dataset.tileId = id;
            tileElement.textContent = tileDef.sprite || '?'; // Fallback sprite
            tileElement.style.color = tileDef.color || 'black'; // Fallback color
            tileElement.title = `${tileDef.name || 'Unnamed Tile'} (${id})\nTags: ${(tileDef.tags || ['none']).join(', ')}`;
            tileElement.onclick = () => {
                uiStateHolder.currentTileId = id;
                updatePaletteSelectionUI(uiStateHolder.currentTileId);
                if (interactionDispatcher.onPaletteTileSelect) {
                    interactionDispatcher.onPaletteTileSelect(id);
                }
            };
            paletteContainer.appendChild(tileElement);
        });
    } else {
        paletteContainer.innerHTML = `<p>${ERROR_MSG.NO_TILES_LOADED}</p>`;
    }
    updatePaletteSelectionUI(currentSelectedTileId);
}

/**
 * Updates the visual selection highlight in the tile palette.
 * @param {string} currentSelectedTileId - The ID of the tile to mark as selected.
 */
export function updatePaletteSelectionUI(currentSelectedTileId) {
    document.querySelectorAll(".palette-tile").forEach(el => {
        el.classList.toggle("selected", el.dataset.tileId === currentSelectedTileId);
    });
}

// --- Grid Rendering Sub-Functions ---

/**
 * Determines the content (sprite, color, title info) of a single cell based on current Z-level tiles
 * and potentially tiles from Z-1 (for see-through effect).
 * @returns {object} An object with { sprite, color, tileNameForTitle, originalDisplayIdForTitle, appliedSolidTopRuleOnCurrentZ, isCurrentCellEffectivelyTransparent }
 */
function renderCellBaseContent(x, y, mapData, currentEditingZ, layerVisibility) {
    const zStr = currentEditingZ.toString();
    const currentLevelData = mapData.levels[zStr];

    let displayInfo = {
        sprite: ' ',
        color: '#000000',
        tileNameForTitle: 'Empty',
        originalDisplayIdForTitle: '',
        appliedSolidTopRuleOnCurrentZ: false,
        isCurrentCellEffectivelyTransparent: true // Assume transparent until proven otherwise
    };

    if (!currentLevelData) return displayInfo; // Should be caught by renderMergedGrid main check

    const tileOnMiddleRaw = layerVisibility[LAYER_TYPES.MIDDLE] && currentLevelData.middle?.[y]?.[x] ? currentLevelData.middle[y][x] : "";
    const tileOnBottomRaw = layerVisibility[LAYER_TYPES.BOTTOM] && currentLevelData.bottom?.[y]?.[x] ? currentLevelData.bottom[y][x] : "";

    const baseIdMiddle = (typeof tileOnMiddleRaw === 'object' && tileOnMiddleRaw?.tileId) ? tileOnMiddleRaw.tileId : tileOnMiddleRaw;
    const baseIdBottom = (typeof tileOnBottomRaw === 'object' && tileOnBottomRaw?.tileId) ? tileOnBottomRaw.tileId : tileOnBottomRaw;

    const defMiddle = assetManagerInstance.tilesets[baseIdMiddle];
    const defBottom = assetManagerInstance.tilesets[baseIdBottom];

    let finalTileDefOnCurrentZ = null;
    if (baseIdMiddle && defMiddle) {
        finalTileDefOnCurrentZ = defMiddle;
        displayInfo.originalDisplayIdForTitle = baseIdMiddle;
        displayInfo.tileNameForTitle = defMiddle.name || baseIdMiddle;
    } else if (baseIdBottom && defBottom) {
        finalTileDefOnCurrentZ = defBottom;
        displayInfo.originalDisplayIdForTitle = baseIdBottom;
        displayInfo.tileNameForTitle = defBottom.name || baseIdBottom;
    }

    if (finalTileDefOnCurrentZ) {
        displayInfo.isCurrentCellEffectivelyTransparent = finalTileDefOnCurrentZ.tags?.includes('transparent_floor') || finalTileDefOnCurrentZ.tags?.includes('allows_vision');
        if (finalTileDefOnCurrentZ.tags?.includes('solid_terrain_top')) {
            displayInfo.sprite = '▓';
            displayInfo.color = finalTileDefOnCurrentZ.color || '#808080';
            displayInfo.appliedSolidTopRuleOnCurrentZ = true;
            displayInfo.isCurrentCellEffectivelyTransparent = false; // Solid top overrides transparency for Z-1 view
        } else {
            displayInfo.sprite = finalTileDefOnCurrentZ.sprite || '?';
            displayInfo.color = finalTileDefOnCurrentZ.color || '#000000';
        }
    } else {
        displayInfo.isCurrentCellEffectivelyTransparent = true; // Empty is transparent
    }

    // Check Z-1 if current cell is transparent and no solid_terrain_top rule applied on current Z
    if (!displayInfo.appliedSolidTopRuleOnCurrentZ && displayInfo.isCurrentCellEffectivelyTransparent) {
        const zBelow = currentEditingZ - 1;
        const levelBelowData = mapData.levels[zBelow.toString()];
        if (levelBelowData) {
            const tileMiddleBelowRaw = layerVisibility[LAYER_TYPES.MIDDLE] && levelBelowData.middle?.[y]?.[x] ? levelBelowData.middle[y][x] : "";
            const baseIdMiddleBelow = (typeof tileMiddleBelowRaw === 'object' && tileMiddleBelowRaw?.tileId) ? tileMiddleBelowRaw.tileId : tileMiddleBelowRaw;
            const defMiddleBelow = assetManagerInstance.tilesets[baseIdMiddleBelow];

            const tileBottomBelowRaw = layerVisibility[LAYER_TYPES.BOTTOM] && levelBelowData.bottom?.[y]?.[x] ? levelBelowData.bottom[y][x] : "";
            const baseIdBottomBelow = (typeof tileBottomBelowRaw === 'object' && tileBottomBelowRaw?.tileId) ? tileBottomBelowRaw.tileId : tileBottomBelowRaw;
            const defBottomBelow = assetManagerInstance.tilesets[baseIdBottomBelow];

            let tileDefFromBelowToDisplay = null;
            let idFromBelowToDisplay = "";

            if (defMiddleBelow?.tags?.includes('solid_terrain_top')) {
                tileDefFromBelowToDisplay = defMiddleBelow;
                idFromBelowToDisplay = baseIdMiddleBelow;
            } else if (defBottomBelow?.tags?.includes('solid_terrain_top')) {
                tileDefFromBelowToDisplay = defBottomBelow;
                idFromBelowToDisplay = baseIdBottomBelow;
            }

            if (tileDefFromBelowToDisplay) {
                displayInfo.sprite = tileDefFromBelowToDisplay.sprite || '▓';
                displayInfo.color = tileDefFromBelowToDisplay.color || '#606060';
                displayInfo.tileNameForTitle = `${tileDefFromBelowToDisplay.name || idFromBelowToDisplay} (from Z${zBelow})`;
                displayInfo.originalDisplayIdForTitle = idFromBelowToDisplay;
                // This doesn't make the current cell itself solid for onion skinning from above
            }
        }
    }
    return displayInfo;
}

function applyOnionSkinning(cellElement, x, y, mapData, currentEditingZ, onionSkinState, baseDisplayInfo) {
    if (!onionSkinState.enabled) return;

    // Render Layers Below
    if (baseDisplayInfo.isCurrentCellEffectivelyTransparent && !baseDisplayInfo.appliedSolidTopRuleOnCurrentZ) {
        for (let i = 1; i <= onionSkinState.layersBelow; i++) {
            const zLayerToRender = currentEditingZ - i;
            const effectiveTileBelow = getEffectiveTileForDisplay(x, y, zLayerToRender, LAYER_TYPES.MIDDLE, LAYER_TYPES.BOTTOM, mapData);
            if (effectiveTileBelow?.definition) {
                cellElement.textContent = effectiveTileBelow.definition.sprite || '?';
                cellElement.style.color = ONION_BELOW_COLOR;
                baseDisplayInfo.tileNameForTitle += ` / Onion: ${effectiveTileBelow.definition.name || effectiveTileBelow.baseId} (Z${zLayerToRender})`;
                break;
            }
        }
    }
    // Render Layers Above (overwrites current display if tile found)
    for (let i = 1; i <= onionSkinState.layersAbove; i++) {
        const zLayerToRender = currentEditingZ + i;
        const effectiveTileAbove = getEffectiveTileForDisplay(x, y, zLayerToRender, LAYER_TYPES.MIDDLE, LAYER_TYPES.BOTTOM, mapData);
        if (effectiveTileAbove?.definition) {
            let spriteForAbove = effectiveTileAbove.definition.sprite || '?';
            if (effectiveTileAbove.definition.tags?.includes('solid_terrain_top')) {
                spriteForAbove = '▓';
            }
            cellElement.textContent = spriteForAbove;
            cellElement.style.color = ONION_ABOVE_COLOR;
            baseDisplayInfo.tileNameForTitle = `Onion: ${effectiveTileAbove.definition.name || effectiveTileAbove.baseId} (Z${zLayerToRender}) (Above)`;
            break;
        }
    }
}

function applyPlayerStartMarker(cellElement, x, y, currentEditingZ, baseDisplayInfo) {
    const playerStartPos = getPlayerStart(); // From mapDataManager
    if (playerStartPos && x === playerStartPos.x && y === playerStartPos.y && currentEditingZ === playerStartPos.z) {
        cellElement.textContent = PLAYER_START_SPRITE;
        cellElement.style.color = PLAYER_START_COLOR;
        cellElement.style.backgroundColor = PLAYER_START_BG_COLOR;
        baseDisplayInfo.tileNameForTitle = `Player Start (X:${playerStartPos.x}, Y:${playerStartPos.y}, Z:${playerStartPos.z})`;
    }
}

function applyStampPreview(cellElement, x, y, currentTool, stampData3D, previewPos) {
    if (currentTool !== "stamp" || !stampData3D || !previewPos ||
        x < previewPos.x || x >= previewPos.x + stampData3D.w ||
        y < previewPos.y || y >= previewPos.y + stampData3D.h) {
        return;
    }

    const stampRelativeX = x - previewPos.x;
    const stampRelativeY = y - previewPos.y;

    if (stampData3D.levels[0]) { // Previewing the stamp's own z=0 slice
        let tileIdToPreviewFromStamp = "";
        if (stampData3D.levels[0][LAYER_TYPES.MIDDLE]?.[stampRelativeY]?.[stampRelativeX]) {
            tileIdToPreviewFromStamp = stampData3D.levels[0][LAYER_TYPES.MIDDLE][stampRelativeY][stampRelativeX];
        } else if (stampData3D.levels[0][LAYER_TYPES.BOTTOM]?.[stampRelativeY]?.[stampRelativeX]) {
            tileIdToPreviewFromStamp = stampData3D.levels[0][LAYER_TYPES.BOTTOM][stampRelativeY][stampRelativeX];
        }

        const effectivePreviewId = (typeof tileIdToPreviewFromStamp === 'object' && tileIdToPreviewFromStamp?.tileId)
            ? tileIdToPreviewFromStamp.tileId
            : tileIdToPreviewFromStamp;

        if (effectivePreviewId && effectivePreviewId !== "") {
            const stampTileDef = assetManagerInstance.tilesets[effectivePreviewId];
            if (stampTileDef) {
                cellElement.textContent = stampTileDef.sprite || '?';
                cellElement.style.color = stampTileDef.color || '#000000';
                cellElement.classList.add("stamp-preview");
            }
        } else if (tileIdToPreviewFromStamp === "") {
            cellElement.textContent = ' ';
            cellElement.classList.add("stamp-preview");
        }
    }
}

function renderOverlays(gridContainer, mapData, currentEditingZ, selectedPortal, selectedNpc, selectedVehicle) {
    // Portals
    (mapData.portals || []).forEach(portal => {
        if (portal.z === currentEditingZ) {
            const cell = gridContainer.querySelector(`.cell[data-x='${portal.x}'][data-y='${portal.y}'][data-z='${currentEditingZ}']`);
            if (cell) {
                const portalMarker = document.createElement('div');
                portalMarker.className = 'portal-marker';
                portalMarker.textContent = 'P';
                portalMarker.title = `Portal: ${portal.name || portal.id}\nTarget: ${portal.targetMapId || 'N/A'} at (${portal.targetX},${portal.targetY},Z${portal.targetZ})`;
                if (selectedPortal?.id === portal.id) {
                    cell.classList.add('selected-portal-cell');
                }
                cell.appendChild(portalMarker);
            }
        }
    });

    // NPCs
    (mapData.npcs || []).forEach(npc => {
        if (npc.mapPos?.z === currentEditingZ) {
            const cell = gridContainer.querySelector(`.cell[data-x='${npc.mapPos.x}'][data-y='${npc.mapPos.y}'][data-z='${currentEditingZ}']`);
            if (cell) {
                const npcMarker = document.createElement('div');
                npcMarker.className = 'npc-marker';
                const npcBaseDef = assetManagerInstance.npcDefinitions?.[npc.definitionId];
                npcMarker.textContent = npc.sprite || npcBaseDef?.sprite || 'N'; // Instance sprite, then base sprite, then fallback
                npcMarker.style.color = npc.color || npcBaseDef?.color || 'purple'; // Instance color, then base color, then fallback
                npcMarker.title = `NPC: ${npc.name || npcBaseDef?.name || npc.id} (Def: ${npc.definitionId})`;
                if (selectedNpc?.id === npc.id) {
                    cell.classList.add('selected-npc-cell'); // CSS handles the outline for selected NPC
                } else {
                    cell.classList.remove('selected-npc-cell'); // Ensure it's removed if not selected
                }
                cell.appendChild(npcMarker);
            }
        }
    });

    // Vehicles
    (mapData.vehicles || []).forEach(vehicle => {
        if (vehicle.mapPos?.z === currentEditingZ) {
            const cell = gridContainer.querySelector(`.cell[data-x='${vehicle.mapPos.x}'][data-y='${vehicle.mapPos.y}'][data-z='${currentEditingZ}']`);
            if (cell) {
                const vehicleMarker = document.createElement('div');
                vehicleMarker.className = 'vehicle-marker';
                const vehicleTemplate = assetManagerInstance.vehicleTemplateDefinitions?.[vehicle.templateId];
                vehicleMarker.textContent = vehicleTemplate?.sprite || 'V';
                vehicleMarker.style.color = 'blue'; // Default color for vehicle marker? Or from template?
                // vehicleMarker.style.backgroundColor = 'rgba(0, 0, 255, 0.2)';
                vehicleMarker.title = `Vehicle: ${vehicle.name || vehicleTemplate?.name || vehicle.id} (Template: ${vehicle.templateId})`;

                if (selectedVehicle?.id === vehicle.id) {
                    cell.classList.add('selected-vehicle-cell'); // CSS needs to handle this class
                } else {
                    cell.classList.remove('selected-vehicle-cell');
                }
                cell.appendChild(vehicleMarker);
            }
        }
    });
}


// --- Grid Rendering (Main Function) ---
const gridContainer = document.getElementById("grid");

/**
 * Renders the main map grid, including tiles, player start, portals, and previews.
 * Delegates parts of the rendering to sub-functions.
 */
export function renderMergedGrid(mapData, currentEditingZ, gridWidth, gridHeight, layerVisibility, onionSkinState, previewPos, stampData3D, currentTool, brushSize, mouseOverGridPos /*, dragStart - implicitly from uiStateHolder if needed */) {
    if (!assetManagerInstance || !uiStateHolder || !interactionDispatcher || !gridContainer) {
        console.error("UIManager: Not fully initialized or gridContainer missing. Cannot render grid.");
        if (gridContainer) gridContainer.innerHTML = "<p>Error: UI Manager not initialized or grid container missing.</p>";
        return;
    }
    gridContainer.innerHTML = "";

    const currentLevelData = mapData.levels[currentEditingZ.toString()];
    if (!currentLevelData) {
        gridContainer.innerHTML = `<p class="error-message">${ERROR_MSG.NO_DATA_FOR_ZLEVEL(currentEditingZ)}</p>`;
        return;
    }

    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const cellElement = document.createElement("div");
            cellElement.className = "cell";
            cellElement.dataset.x = x;
            cellElement.dataset.y = y;
            cellElement.dataset.z = currentEditingZ;

            let cellDisplayInfo = renderCellBaseContent(x, y, mapData, currentEditingZ, layerVisibility);

            cellElement.textContent = cellDisplayInfo.sprite;
            cellElement.style.color = cellDisplayInfo.color;

            applyOnionSkinning(cellElement, x, y, mapData, currentEditingZ, onionSkinState, cellDisplayInfo);
            applyPlayerStartMarker(cellElement, x, y, currentEditingZ, cellDisplayInfo); // Modifies cell & cellDisplayInfo.title

            // Apply brush preview if applicable (before stamp, or integrate)
            if (currentTool === "brush" && (brushSize || 1) > 1 && mouseOverGridPos) {
                const halfBrush = Math.floor(brushSize / 2);
                const brushAreaStartX = mouseOverGridPos.x - halfBrush;
                const brushAreaStartY = mouseOverGridPos.y - halfBrush;
                const brushAreaEndX = brushAreaStartX + brushSize - 1;
                const brushAreaEndY = brushAreaStartY + brushSize - 1;

                if (x >= brushAreaStartX && x <= brushAreaEndX && y >= brushAreaStartY && y <= brushAreaEndY) {
                    cellElement.classList.add("brush-preview");
                }
            }

            // Apply Line Preview (if line tool active and dragging)
            // This needs to be before stamp preview if they can overlap, or handled with z-index/opacity
            if (currentTool === "line" && uiStateHolder.dragStart && mouseOverGridPos) {
                const x0 = uiStateHolder.dragStart.x;
                const y0 = uiStateHolder.dragStart.y;
                const x1 = mouseOverGridPos.x;
                const y1 = mouseOverGridPos.y;
                const currentBrushSize = brushSize || 1;
                const halfBrush = Math.floor(currentBrushSize / 2);

                // Simplified check: does this cell (x,y) fall within the bounding box of any
                // brush-sized square along the line? More accurate would be to trace the thick line.
                // For a quick preview, we can iterate the line points and mark cells.
                // This is a temporary, less performant way for preview.
                // A proper line rasterization for the preview itself might be too slow here.
                // Let's just highlight the direct line path for preview for now, not the thickness.
                // Actual drawing will be thick.

                // Simple line path for preview (not showing thickness yet for perf reasons in render)
                // To show thickness, this part needs to be more complex, iterating all cells covered by the thick line.
                // For now, let's just mark the direct line cells for the preview.
                // The actual drawLine function handles the thickness.
                let tempX = x0;
                let tempY = y0;
                const dxLine = Math.abs(x1 - tempX);
                const dyLine = -Math.abs(y1 - tempY);
                const sxLine = tempX < x1 ? 1 : -1;
                const syLine = tempY < y1 ? 1 : -1;
                let errLine = dxLine + dyLine;

                // Create a set of points on the line for quick lookup
                const linePoints = new Set();
                while (true) {
                    // For each point on the line, calculate the brush area
                    const linePointStartX = tempX - halfBrush;
                    const linePointStartY = tempY - halfBrush;
                    for (let i = 0; i < currentBrushSize; i++) {
                        for (let j = 0; j < currentBrushSize; j++) {
                            linePoints.add(`${linePointStartX + j},${linePointStartY + i}`);
                        }
                    }
                    if (tempX === x1 && tempY === y1) break;
                    const e2Line = 2 * errLine;
                    if (e2Line >= dyLine) { if (tempX === x1) break; errLine += dyLine; tempX += sxLine; }
                    if (e2Line <= dxLine) { if (tempY === y1) break; errLine += dxLine; tempY += syLine; }
                }
                if (linePoints.has(`${x},${y}`)) {
                    cellElement.classList.add("line-preview");
                }
            }

            // Apply Fill Tool Preview (simple_highlight of current cell)
            if ((currentTool === "fill" || currentTool === "fill3d") && mouseOverGridPos) {
                if (x === mouseOverGridPos.x && y === mouseOverGridPos.y) {
                    cellElement.classList.add("fill-preview");
                }
            }

            // Apply Rectangle Preview
            if (currentTool === "rect" && uiStateHolder.dragStart && mouseOverGridPos) {
                const x0 = uiStateHolder.dragStart.x;
                const y0 = uiStateHolder.dragStart.y;
                const x1 = mouseOverGridPos.x;
                const y1 = mouseOverGridPos.y;

                const minX = Math.min(x0, x1);
                const maxX = Math.max(x0, x1);
                const minY = Math.min(y0, y1);
                const maxY = Math.max(y0, y1);

                if ((x === minX || x === maxX) && (y >= minY && y <= maxY) ||
                    (y === minY || y === maxY) && (x >= minX && x <= maxX)) {
                    cellElement.classList.add("rect-preview");
                }
            }

            applyStampPreview(cellElement, x, y, currentTool, stampData3D, previewPos); // Modifies cell

            cellElement.title = cellDisplayInfo.tileNameForTitle; // Set final title

            cellElement.onmousedown = (e) => interactionDispatcher.handleCellMouseDown(e);
            cellElement.onmouseup = (e) => interactionDispatcher.handleCellMouseUp(e);
            gridContainer.appendChild(cellElement);
        }
    }
    renderOverlays(gridContainer, mapData, currentEditingZ, uiStateHolder.selectedPortal, uiStateHolder.selectedNpc, uiStateHolder.selectedVehicle);
}


// --- Player Start Display ---
/**
 * Updates the display of the player's start coordinates.
 * @param {MapPosition | undefined} startPos - The player's start position object.
 */
export function updatePlayerStartDisplay(startPos) {
    const el = (id) => document.getElementById(id);
    if (el("playerStartXDisplay")) el("playerStartXDisplay").textContent = startPos?.x ?? 'N/A';
    if (el("playerStartYDisplay")) el("playerStartYDisplay").textContent = startPos?.y ?? 'N/A';
    if (el("playerStartZDisplay")) el("playerStartZDisplay").textContent = startPos?.z ?? 'N/A';
}

// --- Tool Button UI ---
/**
 * Updates the visual state of tool buttons to reflect the currently selected tool.
 * @param {string} currentToolName - The name of the currently selected tool.
 */
export function updateToolButtonUI(currentToolName) {
    document.querySelectorAll(".toolBtn").forEach(btn => {
        btn.classList.toggle("selected", btn.dataset.tool === currentToolName);
    });
}


// --- Portal Editor UI ---
/**
 * Updates the portal editor UI elements based on the currently selected portal.
 * @param {object | null} selectedPortal - The selected portal object, or null if none.
 */
export function updateSelectedPortalInfoUI(selectedPortal) {
    const el = (id) => document.getElementById(id);
    const portalConfigDiv = el('portalConfigControls');
    const selectedInfoDiv = el('selectedPortalInfo'); // Displays basic info like ID and current position
    const removeBtn = el('removePortalBtn');

    if (!portalConfigDiv || !selectedInfoDiv || !removeBtn) {
        console.warn("UIManager: Portal editor DOM elements not found.");
        return;
    }

    const fields = {
        editingPortalId: el('editingPortalId'),
        editingPortalPos: el('editingPortalPos'),
        portalTargetMapId: el('portalTargetMapId'),
        portalToWorldNodeId: el('portalToWorldNodeId'),
        portalTargetX: el('portalTargetX'),
        portalTargetY: el('portalTargetY'),
        portalTargetZ: el('portalTargetZ'),
        portalNameInput: el('portalNameInput')
    };

    if (selectedPortal) {
        selectedInfoDiv.textContent = `Selected Portal: ${selectedPortal.name || selectedPortal.id} at (${selectedPortal.x}, ${selectedPortal.y}, Z:${selectedPortal.z})`;
        portalConfigDiv.style.display = 'block';
        removeBtn.style.display = 'inline-block'; // Or 'block'
        if (fields.editingPortalId) fields.editingPortalId.textContent = selectedPortal.id;
        if (fields.editingPortalPos) fields.editingPortalPos.textContent = `(${selectedPortal.x}, ${selectedPortal.y}, Z:${selectedPortal.z})`;
        if (fields.portalTargetMapId) fields.portalTargetMapId.value = selectedPortal.targetMapId || '';
        if (fields.portalToWorldNodeId) fields.portalToWorldNodeId.value = selectedPortal.toWorldNodeId || '';
        if (fields.portalTargetX) fields.portalTargetX.value = selectedPortal.targetX ?? '';
        if (fields.portalTargetY) fields.portalTargetY.value = selectedPortal.targetY ?? '';
        if (fields.portalTargetZ) fields.portalTargetZ.value = selectedPortal.targetZ ?? 0;
        if (fields.portalNameInput) fields.portalNameInput.value = selectedPortal.name || '';
    } else {
        selectedInfoDiv.textContent = "Selected Portal: None";
        portalConfigDiv.style.display = 'none';
        removeBtn.style.display = 'none';
        if (fields.editingPortalId) fields.editingPortalId.textContent = "N/A";
        if (fields.editingPortalPos) fields.editingPortalPos.textContent = "N/A";
        // Clear input fields
        Object.values(fields).forEach(input => {
            if (input && typeof input.value !== 'undefined') input.value = (input.type === 'number' ? 0 : '');
        });
        if (fields.portalTargetZ) fields.portalTargetZ.value = 0; // Default Z to 0
    }
}

// --- Container/Lock Editor UI ---
/**
 * Updates the UI for editing container inventory and lock properties.
 * @param {object | null} selectedTileForInventory - Object with {x,y,z,layerName} of the selected tile, or null.
 * @param {MapData | null} mapData - The current map data.
 */
export function updateContainerInventoryUI(selectedTileForInventory, mapData) {
    const controlsDiv = document.getElementById('containerInventoryControls');
    const itemListDiv = document.getElementById('itemInContainerList'); // UL or OL element
    const containerNameSpan = document.getElementById('editingContainerName');
    const containerPosSpan = document.getElementById('editingContainerPos');

    if (!controlsDiv || !itemListDiv || !containerNameSpan || !containerPosSpan) {
        console.warn("UIManager: Container editor DOM elements not found.");
        updateLockPropertiesUI(null, null, null); // Ensure lock UI is also hidden
        return;
    }
    itemListDiv.innerHTML = ''; // Clear previous items

    if (!selectedTileForInventory || !mapData || !assetManagerInstance) {
        controlsDiv.style.display = 'none';
        updateLockPropertiesUI(null, null, null);
        return;
    }

    const { x, y, z, layerName } = selectedTileForInventory;
    const tileData = mapData.levels[z.toString()]?.[layerName]?.[y]?.[x];
    const baseTileId = (typeof tileData === 'object' && tileData?.tileId) ? tileData.tileId : tileData;
    const tileDef = assetManagerInstance.tilesets[baseTileId];

    if (!tileDef) {
        controlsDiv.style.display = 'none';
        updateLockPropertiesUI(null, null, null);
        return;
    }

    const isContainer = tileDef.tags?.includes('container');
    // Doors, windows, and containers can be lockable.
    const isPotentiallyLockable = tileDef.tags?.includes('door') || tileDef.tags?.includes('window') || isContainer;

    if (!isContainer && !isPotentiallyLockable) { // If not a container AND not otherwise lockable
        controlsDiv.style.display = 'none';
        updateLockPropertiesUI(null, null, null);
        return;
    }

    controlsDiv.style.display = 'block';
    containerNameSpan.textContent = tileDef.name || baseTileId;
    containerPosSpan.textContent = `(${x}, ${y}, Z:${z}) on layer: ${layerName}`;

    const containerInventory = (isContainer && typeof tileData === 'object' && Array.isArray(tileData.containerInventory)) ? tileData.containerInventory : [];

    // Show/hide UI parts related to container-specific features
    document.getElementById('itemInContainerList').style.display = isContainer ? 'block' : 'none';
    document.getElementById('addItemToContainerForm').style.display = isContainer ? 'block' : 'none';
    const h3Title = controlsDiv.querySelector('h3[data-purpose="container-title"]');
    if (h3Title) h3Title.style.display = isContainer ? 'block' : 'none';

    if (isContainer) {
        if (containerInventory.length === 0) {
            const li = document.createElement('li');
            li.textContent = "No items in container.";
            itemListDiv.appendChild(li);
        } else {
            containerInventory.forEach((itemInstance, index) => {
                const itemDef = assetManagerInstance.itemsById[itemInstance.id];
                const li = document.createElement('li');
                li.textContent = `${itemDef?.name || itemInstance.id} (Qty: ${itemInstance.quantity}) `;
                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'Remove';
                removeBtn.className = 'button-small'; // For styling
                removeBtn.style.marginLeft = '10px';
                removeBtn.onclick = () => {
                    if (interactionDispatcher?.removeItemFromContainer) {
                        interactionDispatcher.removeItemFromContainer(index); // index is passed to eventHandler
                    }
                };
                li.appendChild(removeBtn);
                itemListDiv.appendChild(li);
            });
        }
    }
    // Always update lock properties if the tile is potentially lockable
    updateLockPropertiesUI(selectedTileForInventory, tileData, tileDef);
}

/**
 * Updates the lock properties UI section (isLocked checkbox, lockDC input).
 * @param {object | null} selectedTile - The selected tile object {x,y,z,layerName}.
 * @param {string | object | null} tileData - The actual data of the tile from mapData.
 * @param {object | null} tileDef - The definition of the tile from AssetManager.
 */
export function updateLockPropertiesUI(selectedTile, tileData, tileDef) {
    const lockControlsDiv = document.getElementById('lockControls');
    const isLockedCheckbox = document.getElementById('isLockedCheckbox');
    const lockDifficultyInput = document.getElementById('lockDifficultyInput');

    if (!lockControlsDiv || !isLockedCheckbox || !lockDifficultyInput) {
        console.warn("UIManager: Lock properties DOM elements not found.");
        return;
    }

    if (!selectedTile || !tileDef) { // No selection or definition means no lock UI
        lockControlsDiv.style.display = 'none';
        return;
    }

    const isLockable = tileDef.tags?.includes('door') || tileDef.tags?.includes('window') || tileDef.tags?.includes('container');

    if (!isLockable) {
        lockControlsDiv.style.display = 'none';
        return;
    }
    lockControlsDiv.style.display = 'block'; // Show lock controls

    // If tileData is an object, it might have lock properties.
    // If it's a string ID, it's considered not locked by default, or needs conversion to object.
    if (typeof tileData === 'object' && tileData !== null) {
        isLockedCheckbox.checked = tileData.isLocked || false;
        lockDifficultyInput.value = tileData.lockDC ?? DEFAULT_LOCK_DC; // Use configured default
        lockDifficultyInput.disabled = !isLockedCheckbox.checked;
    } else {
        isLockedCheckbox.checked = false;
        lockDifficultyInput.value = DEFAULT_LOCK_DC;
        lockDifficultyInput.disabled = true;
    }
}


// --- Tile Property Editor UI ---
/**
 * Updates the generic tile property editor UI.
 * @param {object | null} selectedGenericTile - Object with {x,y,z,layerName} of the selected tile, or null.
 * @param {MapData | null} mapData - The current map data.
 */
export function updateTilePropertyEditorUI(selectedGenericTile, mapData) {
    const el = (id) => document.getElementById(id);
    const editorDiv = el('tilePropertyEditorControls');

    if (!editorDiv) { console.warn("UIManager: Tile Property Editor DOM elements not found."); return; }

    if (!selectedGenericTile || !mapData || !assetManagerInstance) {
        editorDiv.style.display = 'none';
        return;
    }

    const fields = {
        baseIdSpan: el('selectedTileBaseId'),
        baseNameSpan: el('selectedTileBaseName'),
        baseTagsSpan: el('selectedTileBaseTags'),
        coordsSpan: el('selectedTileCoords'),
        instanceNameInput: el('tileInstanceName'),
        instanceTagsInput: el('tileInstanceTags')
    };
    // Basic check for existence of critical elements
    if (!fields.baseIdSpan || !fields.instanceNameInput) {
        console.warn("UIManager: Critical Tile Property Editor DOM elements missing.");
        editorDiv.style.display = 'none';
        return;
    }


    editorDiv.style.display = 'block';
    const { x, y, z, layerName } = selectedGenericTile;
    if (fields.coordsSpan) fields.coordsSpan.textContent = `(${x}, ${y}, Z:${z}) on layer: ${layerName}`;

    const tileData = mapData.levels[z.toString()]?.[layerName]?.[y]?.[x];
    let baseTileId = '';
    let instanceName = '';
    let instanceTagsArray = [];

    if (typeof tileData === 'object' && tileData?.tileId) {
        baseTileId = tileData.tileId;
        instanceName = tileData.instanceName || ''; // Default to empty string if not present
        instanceTagsArray = Array.isArray(tileData.instanceTags) ? tileData.instanceTags : [];
    } else if (typeof tileData === 'string' && tileData !== "") {
        baseTileId = tileData;
        // Defaults for instanceName and instanceTagsArray remain empty
    } else {
        // Invalid tile data or empty cell selected for property editing
        editorDiv.style.display = 'none';
        logToConsole("Tile Property Editor: No valid tile data to display for selection.", selectedGenericTile);
        return;
    }

    fields.baseIdSpan.textContent = baseTileId;
    const baseTileDef = assetManagerInstance.tilesets[baseTileId];

    if (baseTileDef) {
        if (fields.baseNameSpan) fields.baseNameSpan.textContent = baseTileDef.name || baseTileId;
        if (fields.baseTagsSpan) fields.baseTagsSpan.textContent = (baseTileDef.tags || ['none']).join(', ');
    } else {
        if (fields.baseNameSpan) fields.baseNameSpan.textContent = `(Definition not found for ${baseTileId})`;
        if (fields.baseTagsSpan) fields.baseTagsSpan.textContent = 'N/A';
    }

    fields.instanceNameInput.value = instanceName;
    fields.instanceTagsInput.value = instanceTagsArray.join(', ');
}

// --- Item Select Dropdown for Containers ---
/**
 * Populates the dropdown list of items available to be added to containers.
 */
export function populateItemSelectDropdown() {
    const itemSelect = document.getElementById('itemSelectForContainer');
    if (!itemSelect) { console.warn("UIManager: itemSelectForContainer DOM element not found."); return; }
    if (!assetManagerInstance) { console.error("UIManager: AssetManager not initialized. Cannot populate item select."); return; }

    itemSelect.innerHTML = ''; // Clear previous options

    if (assetManagerInstance.itemsById && Object.keys(assetManagerInstance.itemsById).length > 0) {
        const defaultOption = document.createElement('option');
        defaultOption.value = ""; // Important for validation (empty means no selection)
        defaultOption.textContent = "-- Select Item --";
        itemSelect.appendChild(defaultOption);

        for (const itemId in assetManagerInstance.itemsById) {
            const itemDef = assetManagerInstance.itemsById[itemId];
            const option = document.createElement('option');
            option.value = itemId;
            option.textContent = `${itemDef.name || itemId} (Size: ${itemDef.size ?? 1}, W: ${itemDef.weightLbs ?? 'N/A'}lbs)`;
            itemSelect.appendChild(option);
        }
    } else {
        const errorOption = document.createElement('option');
        errorOption.value = "";
        errorOption.textContent = ERROR_MSG.NO_ITEMS_LOADED_WARNING; // More descriptive
        itemSelect.appendChild(errorOption);
        const errorDisplay = document.getElementById('errorMessageDisplayMapMaker');
        if (errorDisplay) {
            errorDisplay.textContent = ERROR_MSG.ITEM_SELECTION_EMPTY_WARNING; // User-visible warning
        }
    }
}

// --- General UI Updates on Load/Init ---
/**
 * Resets various UI elements to their default states, typically for a new map.
 * @param {number} defaultGridWidth - Default width for the grid.
 * @param {number} defaultGridHeight - Default height for the grid.
 * @param {number} defaultZ - Default Z-level.
 * @param {string} defaultTool - The default tool to be selected.
 */
export function resetUIForNewMap(defaultGridWidth, defaultGridHeight, defaultZ, defaultTool) {
    const el = (id) => document.getElementById(id);
    if (el("inputWidth")) el("inputWidth").value = defaultGridWidth;
    if (el("inputHeight")) el("inputHeight").value = defaultGridHeight;
    document.documentElement.style.setProperty("--cols", defaultGridWidth);
    if (el("zLevelInput")) el("zLevelInput").value = defaultZ;

    updateToolButtonUI(defaultTool);
    // buildPalette and renderMergedGrid will be called by the main initialization logic after mapData is ready.

    // Clear selection states (assuming uiStateHolder is correctly managing these)
    if (uiStateHolder) {
        uiStateHolder.selectedTileForInventory = null;
        uiStateHolder.selectedPortal = null;
        uiStateHolder.selectedNpc = null;
        uiStateHolder.selectedVehicle = null;
        uiStateHolder.selectedGenericTile = null;
        uiStateHolder.activeTagFilters = [];
        uiStateHolder.onionSkinState = {
            enabled: false,
            layersBelow: DEFAULT_ONION_LAYERS_BELOW,
            layersAbove: DEFAULT_ONION_LAYERS_ABOVE
        };
        uiStateHolder.dragStart = null;
        uiStateHolder.previewPos = null;
        uiStateHolder.stampData3D = null;
    }
    // Update UI sections related to these cleared states
    updateContainerInventoryUI(null, getMapData()); // Pass current (empty) mapData
    updateSelectedPortalInfoUI(null);
    updateTilePropertyEditorUI(null, getMapData());
    // if (typeof updateSelectedNpcInfoUI === 'function') updateSelectedNpcInfoUI(null, getMapData());
    updateSelectedVehicleInfoUI(null, assetManagerInstance ? assetManagerInstance.vehicleTemplateDefinitions : {});

    if (el('rect3dDepthInput')) el('rect3dDepthInput').value = DEFAULT_3D_DEPTH;
    document.querySelectorAll(".tagFilterCheckbox").forEach(checkbox => checkbox.checked = false);

    const onionEnableCheckbox = el('enableOnionSkinCheckbox');
    const onionBelowInput = el('onionLayersBelowInput');
    const onionAboveInput = el('onionLayersAboveInput');
    if (onionEnableCheckbox) onionEnableCheckbox.checked = false;
    if (onionBelowInput) onionBelowInput.value = DEFAULT_ONION_LAYERS_BELOW;
    if (onionAboveInput) onionAboveInput.value = DEFAULT_ONION_LAYERS_ABOVE;

    updateMapMetadataEditorUI(getMapData()); // Update with current (newly initialized) mapData
    updateSelectedNpcInfoUI(null, assetManagerInstance ? assetManagerInstance.npcDefinitions : {}); // Reset NPC UI

    logToConsole("UI reset for new map.");
}

// --- NPC Editor UI ---
/**
 * Populates the NPC base type dropdown in the NPC configuration panel.
 * @param {object} npcDefinitions - An object where keys are NPC IDs and values are NPC definition objects.
 */
export function populateNpcBaseTypeDropdown(npcDefinitions) {
    const selectElement = document.getElementById('npcBaseTypeSelect');
    if (!selectElement) {
        console.warn("UIManager: npcBaseTypeSelect DOM element not found.");
        return;
    }
    selectElement.innerHTML = ''; // Clear existing options

    if (npcDefinitions && Object.keys(npcDefinitions).length > 0) {
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "-- Select Base NPC --";
        selectElement.appendChild(defaultOption);

        for (const npcId in npcDefinitions) {
            const npcDef = npcDefinitions[npcId];
            const option = document.createElement('option');
            option.value = npcId;
            option.textContent = `${npcDef.name || npcId} (ID: ${npcId})`;
            selectElement.appendChild(option);
        }
    } else {
        const errorOption = document.createElement('option');
        errorOption.value = "";
        errorOption.textContent = "No NPC definitions loaded.";
        selectElement.appendChild(errorOption);
        logToConsole(ERROR_MSG.NO_NPC_DEFINITIONS_LOADED || "Error: No NPC definitions loaded for dropdown.", "warn");
    }
}

// --- Vehicle Editor UI ---
/**
 * Populates the Vehicle base type dropdown in the Vehicle configuration panel.
 * @param {object} vehicleTemplates - An object where keys are Vehicle IDs and values are Vehicle template objects.
 */
export function populateVehicleBaseTypeDropdown(vehicleTemplates) {
    const selectElement = document.getElementById('vehicleBaseTypeSelect');
    if (!selectElement) {
        console.warn("UIManager: vehicleBaseTypeSelect DOM element not found.");
        return;
    }
    selectElement.innerHTML = ''; // Clear existing options

    if (vehicleTemplates && Object.keys(vehicleTemplates).length > 0) {
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "-- Select Base Vehicle --";
        selectElement.appendChild(defaultOption);

        for (const templateId in vehicleTemplates) {
            const template = vehicleTemplates[templateId];
            const option = document.createElement('option');
            option.value = templateId;
            option.textContent = `${template.name || templateId} (ID: ${templateId})`;
            selectElement.appendChild(option);
        }
    } else {
        const errorOption = document.createElement('option');
        errorOption.value = "";
        errorOption.textContent = "No Vehicle templates loaded.";
        selectElement.appendChild(errorOption);
        logToConsole("Warning: No Vehicle templates loaded for dropdown.", "warn");
    }
}

/**
 * Updates the Vehicle editor UI elements based on the currently selected Vehicle.
 * @param {object | null} selectedVehicle - The selected Vehicle object instance, or null if none.
 * @param {object} vehicleTemplates - All available Vehicle templates from assetManager.
 */
export function updateSelectedVehicleInfoUI(selectedVehicle, vehicleTemplates) {
    const el = (id) => document.getElementById(id);
    const vehicleConfigContainer = el('vehicleToolsContainer');
    const vehicleConfigControlsDiv = el('vehicleConfigControls');
    const selectedInfoDiv = el('selectedVehicleInfo');
    const removeBtn = el('removeVehicleBtn');

    if (!vehicleConfigContainer || !vehicleConfigControlsDiv || !selectedInfoDiv || !removeBtn) {
        console.warn("UIManager: Vehicle editor DOM elements not found.");
        return;
    }

    const fields = {
        editingVehicleId: el('editingVehicleId'),
        editingVehiclePos: el('editingVehiclePos'),
        vehicleBaseTypeSelect: el('vehicleBaseTypeSelect'),
        vehicleInstanceNameInput: el('vehicleInstanceNameInput')
    };

    if (fields.vehicleBaseTypeSelect && fields.vehicleBaseTypeSelect.options.length <= 1 && vehicleTemplates) {
        populateVehicleBaseTypeDropdown(vehicleTemplates);
    }

    if (uiStateHolder && uiStateHolder.currentTool === 'vehicle' && !selectedVehicle) {
        vehicleConfigContainer.style.display = 'block';
        vehicleConfigControlsDiv.style.display = 'block';
        selectedInfoDiv.textContent = "Selected Vehicle: None (Click on map to place)";
        removeBtn.style.display = 'none';

        if (fields.editingVehicleId) fields.editingVehicleId.textContent = "N/A (New)";
        if (fields.editingVehiclePos) fields.editingVehiclePos.textContent = "N/A";
        if (fields.vehicleInstanceNameInput) fields.vehicleInstanceNameInput.value = '';

    } else if (selectedVehicle) {
        vehicleConfigContainer.style.display = 'block';
        vehicleConfigControlsDiv.style.display = 'block';
        selectedInfoDiv.textContent = `Selected Vehicle: ${selectedVehicle.name || selectedVehicle.id} (Template: ${selectedVehicle.templateId}) at (${selectedVehicle.mapPos.x}, ${selectedVehicle.mapPos.y}, Z:${selectedVehicle.mapPos.z})`;
        removeBtn.style.display = 'inline-block';

        if (fields.editingVehicleId) fields.editingVehicleId.textContent = selectedVehicle.id;
        if (fields.editingVehiclePos) fields.editingVehiclePos.textContent = `(${selectedVehicle.mapPos.x}, ${selectedVehicle.mapPos.y}, Z:${selectedVehicle.mapPos.z})`;

        if (fields.vehicleBaseTypeSelect) fields.vehicleBaseTypeSelect.value = selectedVehicle.templateId || "";

        let displayName = selectedVehicle.name;
        if (!displayName && selectedVehicle.templateId && vehicleTemplates && vehicleTemplates[selectedVehicle.templateId]) {
            displayName = vehicleTemplates[selectedVehicle.templateId].name;
        }
        if (fields.vehicleInstanceNameInput) fields.vehicleInstanceNameInput.value = displayName || '';

    } else {
        vehicleConfigContainer.style.display = 'none';
        selectedInfoDiv.textContent = "Selected Vehicle: None";
        removeBtn.style.display = 'none';
        if (fields.editingVehicleId) fields.editingVehicleId.textContent = "N/A";
        if (fields.editingVehiclePos) fields.editingVehiclePos.textContent = "N/A";
        if (fields.vehicleInstanceNameInput) fields.vehicleInstanceNameInput.value = '';
        if (fields.vehicleBaseTypeSelect) fields.vehicleBaseTypeSelect.value = '';
    }
}


/**
 * Updates the NPC editor UI elements based on the currently selected NPC.
 * @param {object | null} selectedNpc - The selected NPC object instance, or null if none.
 * @param {object} baseNpcDefinitions - All available NPC base definitions from assetManager.
 */
export function updateSelectedNpcInfoUI(selectedNpc, baseNpcDefinitions) {
    const el = (id) => document.getElementById(id);
    const npcConfigContainer = el('npcToolsContainer'); // The main container for the NPC panel
    const npcConfigControlsDiv = el('npcConfigControls'); // The div with form inputs
    const selectedInfoDiv = el('selectedNpcInfo');
    const removeBtn = el('removeNpcBtn');

    if (!npcConfigContainer || !npcConfigControlsDiv || !selectedInfoDiv || !removeBtn) {
        console.warn("UIManager: NPC editor DOM elements not found.");
        return;
    }

    const fields = {
        editingNpcId: el('editingNpcId'),
        editingNpcPos: el('editingNpcPos'),
        npcBaseTypeSelect: el('npcBaseTypeSelect'),
        npcInstanceNameInput: el('npcInstanceNameInput'),
        npcBehaviorSelect: el('npcBehaviorSelect')
        // Add sprite and color inputs here if they become directly editable on instance
    };

    // Populate dropdown if it's empty and definitions are available
    // This is a bit of a safety net; ideally, it's populated once at init.
    if (fields.npcBaseTypeSelect && fields.npcBaseTypeSelect.options.length <= 1 && baseNpcDefinitions) {
        populateNpcBaseTypeDropdown(baseNpcDefinitions);
    }

    if (uiStateHolder && uiStateHolder.currentTool === 'npc' && !selectedNpc) {
        // NPC tool is active, but no NPC is selected (likely preparing to place a new one)
        npcConfigContainer.style.display = 'block';
        npcConfigControlsDiv.style.display = 'block'; // Show controls for selection
        selectedInfoDiv.textContent = "Selected NPC: None (Click on map to place)";
        removeBtn.style.display = 'none';

        if (fields.editingNpcId) fields.editingNpcId.textContent = "N/A (New)";
        if (fields.editingNpcPos) fields.editingNpcPos.textContent = "N/A";
        if (fields.npcInstanceNameInput) fields.npcInstanceNameInput.value = '';
        if (fields.npcBehaviorSelect) fields.npcBehaviorSelect.value = ''; // Reset to default
        // Base type might be pre-selected or user needs to choose
        // if (fields.npcBaseTypeSelect) fields.npcBaseTypeSelect.value = ''; // Don't reset if user picked one

    } else if (selectedNpc) {
        npcConfigContainer.style.display = 'block';
        npcConfigControlsDiv.style.display = 'block';
        selectedInfoDiv.textContent = `Selected NPC: ${selectedNpc.name || selectedNpc.id} (Base: ${selectedNpc.definitionId}) at (${selectedNpc.mapPos.x}, ${selectedNpc.mapPos.y}, Z:${selectedNpc.mapPos.z})`;
        removeBtn.style.display = 'inline-block';

        if (fields.editingNpcId) fields.editingNpcId.textContent = selectedNpc.id;
        if (fields.editingNpcPos) fields.editingNpcPos.textContent = `(${selectedNpc.mapPos.x}, ${selectedNpc.mapPos.y}, Z:${selectedNpc.mapPos.z})`;

        // Set the dropdown to the NPC's base definition type
        if (fields.npcBaseTypeSelect) fields.npcBaseTypeSelect.value = selectedNpc.definitionId || "";

        // NPC name: instance specific name if it exists, otherwise fallback to base name from definition
        let displayName = selectedNpc.name; // This should be the instance name
        if (!displayName && selectedNpc.definitionId && baseNpcDefinitions && baseNpcDefinitions[selectedNpc.definitionId]) {
            displayName = baseNpcDefinitions[selectedNpc.definitionId].name; // Fallback to base definition name
        }
        if (fields.npcInstanceNameInput) fields.npcInstanceNameInput.value = displayName || '';

        if (fields.npcBehaviorSelect) {
            fields.npcBehaviorSelect.value = selectedNpc.behavior || "";
        }

        // Face Generator UI Population
        initializeNpcFaceParamsForMapMakerUI(selectedNpc); // Ensures faceData and asciiFace exist
        populateNpcFaceUI(selectedNpc.faceData); // Populates the UI controls
        updateNpcFacePreview(selectedNpc); // Generates and displays the preview


    } else { // No NPC selected and NPC tool not active (or some other state)
        npcConfigContainer.style.display = 'none'; // Hide the whole panel
        selectedInfoDiv.textContent = "Selected NPC: None";
        removeBtn.style.display = 'none';
        if (fields.editingNpcId) fields.editingNpcId.textContent = "N/A";
        if (fields.editingNpcPos) fields.editingNpcPos.textContent = "N/A";
        if (fields.npcInstanceNameInput) fields.npcInstanceNameInput.value = '';
        if (fields.npcBaseTypeSelect) fields.npcBaseTypeSelect.value = '';
        // Clear or hide face generator UI when no NPC is selected
        const npcFacePreviewEl = el('npcFace_asciiFacePreview');
        if (npcFacePreviewEl) npcFacePreviewEl.innerHTML = '';
        // Could also clear all npcFace_ input values if desired, or just let them be.
        // For now, just clearing preview. The panel itself might be hidden if tool isn't NPC.
    }
}


/**
 * Updates the map metadata editor UI fields with values from the provided mapData.
 * @param {MapData} mapData - The map data object.
 */
export function updateMapMetadataEditorUI(mapData) {
    const el = (id) => document.getElementById(id);
    if (el("mapNameInput")) el("mapNameInput").value = mapData.name || DEFAULT_MAP_NAME; // DEFAULT_MAP_NAME from config.js
    if (el("mapDescriptionInput")) el("mapDescriptionInput").value = mapData.description || "";
    if (el("mapAuthorInput")) el("mapAuthorInput").value = mapData.author || "";
    if (el("mapCustomTagsInput")) el("mapCustomTagsInput").value = (mapData.customTags || []).join(', ');
    if (el("mapAreaIdInput")) el("mapAreaIdInput").value = mapData.areaId || "";
    if (el("mapPrimaryParentInput")) el("mapPrimaryParentInput").value = mapData.primaryParentMapId || "";
    const metadataStatus = el("metadataStatus");
    if (metadataStatus) metadataStatus.textContent = ""; // Clear any previous status
}


/**
 * Populates the NPC face generator UI controls with values from the NPC's faceData.
 * @param {object} faceData - The faceData object from an NPC.
 */
export function populateNpcFaceUI(faceData) { // Added export
    const el = (id) => document.getElementById(id);
    if (!faceData) return;
    logToConsole("populateNpcFaceUI called with skinColor: " + faceData.skinColor);

    // Sliders
    const sliders = {
        headWidth: 'npcFace_headWidthRange', headHeight: 'npcFace_headHeightRange',
        eyeSize: 'npcFace_eyeSizeRange', browHeight: 'npcFace_browHeightRange',
        browAngle: 'npcFace_browAngleRange', browWidth: 'npcFace_browWidthRange',
        noseWidth: 'npcFace_noseWidthRange', noseHeight: 'npcFace_noseHeightRange',
        mouthWidth: 'npcFace_mouthWidthRange', mouthFullness: 'npcFace_mouthFullnessRange'
    };
    for (const param in sliders) {
        if (faceData[param] !== undefined) {
            const sliderElement = el(sliders[param]);
            const valueDisplayElement = el(sliders[param].replace('Range', 'Value'));
            if (sliderElement) sliderElement.value = faceData[param];
            if (valueDisplayElement) valueDisplayElement.textContent = faceData[param];
        }
    }

    // Selects
    const selects = {
        hairstyle: 'npcFace_hairstyleSelect', facialHair: 'npcFace_facialHairSelect', glasses: 'npcFace_glassesSelect'
    };
    for (const param in selects) {
        if (faceData[param] !== undefined) {
            const selectElement = el(selects[param]);
            if (selectElement) selectElement.value = faceData[param];
        }
    }

    // Color Pickers
    const colors = {
        eyeColor: 'npcFace_eyeColorPicker', hairColor: 'npcFace_hairColorPicker',
        lipColor: 'npcFace_lipColorPicker', skinColor: 'npcFace_skinColorPicker'
    };
    for (const param in colors) {
        if (faceData[param] !== undefined) {
            const colorPickerElement = el(colors[param]);
            if (colorPickerElement) colorPickerElement.value = faceData[param];
        }
    }
}

/**
 * Reads NPC face parameters from UI, updates the NPC's faceData, and refreshes the ASCII face preview.
 * @param {object} npc - The NPC object whose face is being updated.
 */
export function updateNpcFacePreview(npc) {
    if (!npc || !assetManagerInstance) { // assetManagerInstance needed for PRESET_COLORS in generateRandomFaceParams
        console.error("NPC Face Preview: NPC object or assetManagerInstance is missing.");
        return;
    }
    if (!npc.faceData) {
        npc.faceData = {}; // Ensure faceData object exists
    }

    const faceParams = npc.faceData;
    const el = (id) => document.getElementById(id);

    // Read values from UI elements and update faceParams
    faceParams.headWidth = parseInt(el('npcFace_headWidthRange').value);
    el('npcFace_headWidthValue').textContent = faceParams.headWidth;

    faceParams.headHeight = parseInt(el('npcFace_headHeightRange').value);
    el('npcFace_headHeightValue').textContent = faceParams.headHeight;

    faceParams.eyeSize = parseInt(el('npcFace_eyeSizeRange').value);
    el('npcFace_eyeSizeValue').textContent = faceParams.eyeSize;

    faceParams.browHeight = parseInt(el('npcFace_browHeightRange').value);
    el('npcFace_browHeightValue').textContent = faceParams.browHeight;

    faceParams.browAngle = parseInt(el('npcFace_browAngleRange').value);
    el('npcFace_browAngleValue').textContent = faceParams.browAngle;

    faceParams.browWidth = parseInt(el('npcFace_browWidthRange').value);
    el('npcFace_browWidthValue').textContent = faceParams.browWidth;

    faceParams.noseWidth = parseInt(el('npcFace_noseWidthRange').value);
    el('npcFace_noseWidthValue').textContent = faceParams.noseWidth;

    faceParams.noseHeight = parseInt(el('npcFace_noseHeightRange').value);
    el('npcFace_noseHeightValue').textContent = faceParams.noseHeight;

    faceParams.mouthWidth = parseInt(el('npcFace_mouthWidthRange').value);
    el('npcFace_mouthWidthValue').textContent = faceParams.mouthWidth;

    faceParams.mouthFullness = parseInt(el('npcFace_mouthFullnessRange').value);
    el('npcFace_mouthFullnessValue').textContent = faceParams.mouthFullness;

    faceParams.hairstyle = el('npcFace_hairstyleSelect').value;
    faceParams.facialHair = el('npcFace_facialHairSelect').value;
    faceParams.glasses = el('npcFace_glassesSelect').value;

    faceParams.eyeColor = el('npcFace_eyeColorPicker').value;
    faceParams.hairColor = el('npcFace_hairColorPicker').value;
    faceParams.lipColor = el('npcFace_lipColorPicker').value;
    faceParams.skinColor = el('npcFace_skinColorPicker').value;

    // Generate ASCII face
    if (typeof window.generateAsciiFace === 'function') {
        faceParams.asciiFace = window.generateAsciiFace(faceParams);
    } else {
        console.error("generateAsciiFace function is not available.");
        faceParams.asciiFace = "Error: generateAsciiFace not found.";
    }

    // Update preview
    const previewElement = el('npcFace_asciiFacePreview');
    if (previewElement) {
        previewElement.innerHTML = faceParams.asciiFace;
    }
    // No snapshot() here, as this function only updates the preview and the in-memory appState.selectedNpc.
    // snapshot() should be called by the event handler that triggers the save of these properties if needed.
}


/**
 * Initializes or ensures face parameters for an NPC in the map maker context.
 * If faceData or its sub-properties are missing, it generates random ones.
 * Updates the npc.faceData object directly.
 * @param {object} npc - The NPC object from mapData.npcs.
 */
function initializeNpcFaceParamsForMapMakerUI(npc) {
    if (!npc) return;
    let needsFullRandom = false;
    if (!npc.faceData) {
        npc.faceData = {};
        needsFullRandom = true;
    }

    // Check for essential parameters; if any are missing, regenerate the whole set.
    const requiredParams = ['headWidth', 'hairstyle', 'skinColor', 'asciiFace']; // Sample required params
    for (const param of requiredParams) {
        if (npc.faceData[param] === undefined) {
            needsFullRandom = true;
            break;
        }
    }

    if (needsFullRandom && typeof window.generateRandomFaceParams === 'function') {
        window.generateRandomFaceParams(npc.faceData); // Populates npc.faceData
        applyZombieFaceConstraints(npc);
        logToConsole(`Initialized random face params for NPC ${npc.id || npc.name} in Map Maker.`);
    }

    // Always ensure asciiFace is generated if generateAsciiFace is available
    if (npc.faceData && typeof window.generateAsciiFace === 'function') {
        // Before generating, ensure all sub-params needed by generateAsciiFace are present.
        // generateRandomFaceParams should have set them if needsFullRandom was true.
        // If needsFullRandom was false, but asciiFace is missing, we still need to ensure sub-params.
        // This is a simplified check; ideally, validate all params required by generateAsciiFace.
        if (npc.faceData.headWidth === undefined && typeof window.generateRandomFaceParams === 'function') {
            window.generateRandomFaceParams(npc.faceData); // Re-populate if critical generation params are missing
        }
        npc.faceData.asciiFace = window.generateAsciiFace(npc.faceData);
    } else if (npc.faceData && !npc.faceData.asciiFace) {
        npc.faceData.asciiFace = ":( (preview error)";
    }
}



/**
 * Applies zombie-specific face constraints (green skin, red eyes) if the NPC is a zombie.
 * @param {object} npc - The NPC object.
 */
export function applyZombieFaceConstraints(npc) {
    if (!npc || !assetManagerInstance || !assetManagerInstance.npcDefinitions) return;
    const def = assetManagerInstance.npcDefinitions[npc.definitionId];
    if (!def) return;

    // Check if zombie
    const isZombie = (def.tags && def.tags.includes('zombie')) || (npc.definitionId && npc.definitionId.toLowerCase().includes('zombie'));

    if (isZombie && npc.faceData) {
        // Greenish skin tones
        const zombieSkins = ['#8FBC8F', '#90EE90', '#6B8E23', '#556B2F', '#778899']; // DarkSeaGreen, LightGreen, OliveDrab, DarkOliveGreen, LightSlateGray
        // Redish eye tones
        const zombieEyes = ['#FF0000', '#8B0000', '#A52A2A', '#CD5C5C']; // Red, DarkRed, Brown, IndianRed

        // Helper for random choice
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

        npc.faceData.skinColor = pick(zombieSkins);
        npc.faceData.eyeColor = pick(zombieEyes);
    }
}

/**
 * Updates UI elements based on data from a newly loaded map.
 * @param {MapData} loadedMapData - The map data that was loaded.
 * @param {number} newCurrentEditingZ - The Z-level to set as current.
 * @param {string} currentToolName - The tool that should be active.
 */
export function updateUIFromLoadedMap(loadedMapData, newCurrentEditingZ, currentToolName) {
    const el = (id) => document.getElementById(id);
    if (el("inputWidth")) el("inputWidth").value = loadedMapData.width;
    if (el("inputHeight")) el("inputHeight").value = loadedMapData.height;
    document.documentElement.style.setProperty("--cols", loadedMapData.width);
    if (el("zLevelInput")) el("zLevelInput").value = newCurrentEditingZ;

    updateMapMetadataEditorUI(loadedMapData); // Centralized call
    updatePlayerStartDisplay(loadedMapData.startPos);
    updateToolButtonUI(currentToolName);
    // buildPalette and renderMergedGrid are called by the main load function after this.

    // Clear any existing selections from a previous map state
    if (uiStateHolder) {
        uiStateHolder.selectedTileForInventory = null;
        uiStateHolder.selectedPortal = null;
        uiStateHolder.selectedNpc = null;
        uiStateHolder.selectedGenericTile = null;
        // Reset other interaction states
        uiStateHolder.dragStart = null;
        uiStateHolder.previewPos = null;
        uiStateHolder.stampData3D = null;
    }
    updateContainerInventoryUI(null, loadedMapData);
    updateSelectedPortalInfoUI(null);
    updateTilePropertyEditorUI(null, loadedMapData);
    updateSelectedNpcInfoUI(null, assetManagerInstance ? assetManagerInstance.npcDefinitions : {}); // Reset NPC UI
    logToConsole("UI updated from loaded map data.");
}

/**
 * Updates UI elements related to grid dimensions.
 * @param {number} newGridWidth - The new grid width.
 * @param {number} newGridHeight - The new grid height.
 */
export function updateGridDimensionsUI(newGridWidth, newGridHeight) {
    const el = (id) => document.getElementById(id);
    if (el("inputWidth")) el("inputWidth").value = newGridWidth;
    if (el("inputHeight")) el("inputHeight").value = newGridHeight;
    document.documentElement.style.setProperty("--cols", newGridWidth);
}

/**
 * Gets the desired depth for 3D operations from the UI input.
 * @returns {number} The depth value, defaulting to DEFAULT_3D_DEPTH if input is invalid or not found.
 */
export function getRect3DDepth() {
    const depthInput = document.getElementById("rect3dDepthInput");
    if (depthInput) {
        let depth = parseInt(depthInput.value, 10);
        if (isNaN(depth) || depth < 1) {
            depth = DEFAULT_3D_DEPTH; // Use configured default
            depthInput.value = depth; // Correct UI if invalid
        }
        return depth;
    }
    return DEFAULT_3D_DEPTH; // Default if input not found
}
