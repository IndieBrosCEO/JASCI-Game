// mapMaker/eventHandlers.js
"use strict";

// Data Management Imports
import { getMapData, snapshot, undo as undoData, redo as redoData, setPlayerStart as setPlayerStartInData, addPortalToMap, removePortalFromMap, updatePortalInMap, getNextPortalId as getNextPortalIdFromData, deleteZLevel as deleteZLevelFromData, addNpcToMap, removeNpcFromMap, getNextNpcId as getNextNpcIdFromData, addVehicleToMap, removeVehicleFromMap } from './mapDataManager.js'; // Added Vehicle data functions

// Tile Logic Imports
import { placeTile, ensureTileIsObject, getTopmostTileAt } from './tileManager.js'; // Assuming getTopmostTileAt is in tileManager

// UI Update Function Imports
import { buildPalette, updatePaletteSelectionUI, renderMergedGrid, updatePlayerStartDisplay, updateToolButtonUI, updateSelectedPortalInfoUI, updateContainerInventoryUI, updateLockPropertiesUI, updateTilePropertyEditorUI, getRect3DDepth, updateUIFromLoadedMap, populateItemSelectDropdown, updateSelectedNpcInfoUI, populateNpcBaseTypeDropdown, updateNpcFacePreview, populateNpcFaceUI, updateSelectedVehicleInfoUI, populateVehicleBaseTypeDropdown, applyZombieFaceConstraints, renderNpcHealthConfig } from './uiManager.js'; // Added applyZombieFaceConstraints

// Tool Logic Imports
import { handlePlayerStartTool, handlePortalToolClick, handleSelectInspectTool, floodFill2D, floodFill3D, drawLine, drawRect, defineStamp, applyStamp, handleNpcToolClick, handleVehicleToolClick } from './toolManager.js'; // Added handleVehicleToolClick

// Configuration and Utilities
import { LAYER_TYPES, LOG_MSG, ERROR_MSG, DEFAULT_3D_DEPTH, NPC_ID_PREFIX, VEHICLE_ID_PREFIX, DEFAULT_LOCK_DC } from './config.js'; // Added VEHICLE_ID_PREFIX
import { logToConsole } from './config.js'; // Assuming logToConsole is also in config.js or a utility module

// Import/Export Logic
import { convertAndSetLoadedMapData, exportMapFile } from './importExport.js';


// --- Module-Scoped State References (to be initialized) ---
let assetManagerInstance = null; // Reference to the global AssetManager
let appState = null;             // Holds currentTool, currentTileId, selections, grid dimensions, current Z, etc.
// This will replace individual currentUiState and mapContext type variables.

// Helper function to get the currently selected base NPC ID from the dropdown
function getSelectedBaseNpcId() {
    const selectElement = document.getElementById('npcBaseTypeSelect');
    return selectElement ? selectElement.value : null;
}

// Helper function to get the currently selected base Vehicle ID from the dropdown
function getSelectedBaseVehicleId() {
    const selectElement = document.getElementById('vehicleBaseTypeSelect');
    return selectElement ? selectElement.value : null;
}


// --- Initialization ---
/**
 * Initializes the event handling module with necessary application state and asset manager.
 * Sets up all static DOM event listeners.
 * @param {object} assetManager - The main AssetManager instance.
 * @param {object} applicationState - The central object holding UI and map context state.
 */
export function initializeEventHandlers(assetManager, applicationState) {
    assetManagerInstance = assetManager;
    appState = applicationState;

    // Grid Interaction (Mouse move/leave are on the container; mousedown/up are delegated from cells by UIManager)
    const gridContainer = document.getElementById("grid");
    if (gridContainer) {
        gridContainer.addEventListener("mousemove", handleGridMouseMove);
        gridContainer.addEventListener("mouseleave", handleGridMouseLeave);
    } else {
        console.error("EventHandlers: Grid container not found. Mouse move/leave events will not work.");
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    setupButtonEventListeners();
    logToConsole("Event handlers initialized.");
}

// --- Grid Cell Mouse Event Handlers (called by UIManager when cells are created/clicked) ---

export function handleCellMouseDown(event) {
    const x = +event.target.dataset.x;
    const y = +event.target.dataset.y;
    // Z is taken from appState.currentEditingZ
    const z = appState.currentEditingZ;
    const mapData = getMapData();

    // Common logic: Clear selections if not using a selection-type tool.
    // Note: Tools like portal, npc, vehicle handle their own partial clearing via callbacks to allow keeping their specific selection.
    if (appState.currentTool !== "selectInspect" && appState.currentTool !== "portal" && appState.currentTool !== "npc" && appState.currentTool !== "vehicle") {
        clearAllSelections(); // Helper function to clear selection states and update their UIs
    }

    // Interface for tool functions to interact with map context and UI rendering.
    const toolInteractionInterface = {
        getMapContext: () => ({
            ensureLayersForZ: appState.ensureLayersForZ, // Assuming ensureLayersForZ is part of appState or accessible via it
            gridWidth: appState.gridWidth,
            gridHeight: appState.gridHeight
        }),
        getUIRenderers: () => ({
            renderGrid: triggerFullGridRender,
            updateAllEditorUIs: triggerAllEditorUIsUpdate
        }),
        // Potentially add access to assetManagerInstance if tools need it directly, though often passed
    };

    switch (appState.currentTool) {
        case "brush":
            snapshot(); // Create undo state for the entire brush operation
            const brushSize = appState.brushSize || 1;
            const halfBrush = Math.floor(brushSize / 2); // For centering odd brushes, adjust for even if needed

            // Calculate top-left starting point for the brush
            // If brushSize is 1, startX = x, startY = y
            // If brushSize is 3, centered, startX = x - 1, startY = y - 1
            // If brushSize is 2, it will effectively be x to x+1, y to y+1 (or could be centered if preferred)
            // Let's make it so the click is the top-left for even, and center for odd.
            // Or simpler: click is always top-left of the brush square.
            // For this implementation, let's make the click the center of the brush area (or as close as possible for even sizes)
            const startDrawX = x - halfBrush;
            const startDrawY = y - halfBrush;

            let tilePlaced = false;
            for (let i = 0; i < brushSize; i++) {
                for (let j = 0; j < brushSize; j++) {
                    const currentDrawX = startDrawX + j;
                    const currentDrawY = startDrawY + i;

                    // Ensure drawing within map bounds
                    if (currentDrawX >= 0 && currentDrawX < appState.gridWidth &&
                        currentDrawY >= 0 && currentDrawY < appState.gridHeight) {
                        // Pass null for renderFn to placeTile to avoid rendering for each sub-tile
                        placeTile(currentDrawX, currentDrawY, z, appState.currentTileId, mapData, appState.ensureLayersForZ, appState.gridWidth, appState.gridHeight, null);
                        tilePlaced = true;
                    }
                }
            }

            if (tilePlaced) {
                triggerFullGridRender(); // Single render after all tiles in brush are placed

                // Auto-select for property editing if the *clicked* cell (center of brush) results in a special tile
                // This might need refinement if a multi-tile brush places different things.
                // For now, check the original clicked cell.
                const placedTileInfo = getTopmostTileAt(x, y, z, mapData, assetManagerInstance);
                if (placedTileInfo?.definition?.tags && (placedTileInfo.definition.tags.includes('container') || placedTileInfo.definition.tags.includes('door') || placedTileInfo.definition.tags.includes('window'))) {
                    appState.selectedTileForInventory = { x, y, z, layerName: placedTileInfo.layer };
                } else {
                    appState.selectedTileForInventory = null;
                }
                updateContainerInventoryUI(appState.selectedTileForInventory, mapData);
            }
            break;
        case "playerStart":
            handlePlayerStartTool(x, y, z, mapData, triggerFullGridRender, updatePlayerStartDisplay);
            break;
        case "portal":
            // Use clearSelectionsExcept to avoid clearing the portal we just selected/created
            handlePortalToolClick(x, y, z, mapData, appState, triggerFullGridRender, updateSelectedPortalInfoUI, () => clearSelectionsExcept('portal'));
            break;
        case "selectInspect":
            handleSelectInspectTool(x, y, z, mapData, appState, assetManagerInstance, toolInteractionInterface);
            break;
        case "npc": // Added NPC tool case
            // The toolInteractionInterface needs to include updateNpcEditorUI
            const npcToolInteractionInterface = {
                ...toolInteractionInterface.getUIRenderers(), // renderGrid
                updateNpcEditorUI: (npc, npcDefs) => updateSelectedNpcInfoUI(npc, npcDefs || assetManagerInstance.npcDefinitions),
                clearOtherSelections: () => clearSelectionsExcept('npc'),
                showStatusMessage: (message, type = 'info') => {
                    const statusElement = document.getElementById('mapMakerStatusMessage');
                    if (statusElement) {
                        statusElement.textContent = message;
                        // Remove old type classes, then add new one
                        statusElement.className = 'status-message-area'; // Base class
                        statusElement.classList.add(`status-${type}`); // Type specific class
                        statusElement.style.display = 'block';

                        // Clear message after a delay
                        setTimeout(() => {
                            // Only clear if the message hasn't been updated by another call
                            if (statusElement.textContent === message) {
                                statusElement.style.display = 'none';
                                statusElement.textContent = '';
                                statusElement.className = 'status-message-area';
                            }
                        }, 3000);
                    } else {
                        console.log(`MapMaker Status (${type}): ${message}`); // Fallback
                    }
                }
            };
            handleNpcToolClick(x, y, z, mapData, appState, assetManagerInstance, npcToolInteractionInterface);
            break;
        case "vehicle": // Added Vehicle tool case
            const vehicleToolInteractionInterface = {
                ...toolInteractionInterface.getUIRenderers(),
                updateVehicleEditorUI: (vehicle, vehicleDefs) => updateSelectedVehicleInfoUI(vehicle, vehicleDefs || assetManagerInstance.vehicleTemplateDefinitions),
                clearOtherSelections: () => clearSelectionsExcept('vehicle'),
                showStatusMessage: (message, type = 'info') => {
                    // Reuse same status message element logic if generic
                    const statusElement = document.getElementById('mapMakerStatusMessage');
                    if (statusElement) {
                        statusElement.textContent = message;
                        statusElement.className = 'status-message-area';
                        statusElement.classList.add(`status-${type}`);
                        statusElement.style.display = 'block';
                        setTimeout(() => {
                            if (statusElement.textContent === message) {
                                statusElement.style.display = 'none';
                                statusElement.textContent = '';
                                statusElement.className = 'status-message-area';
                            }
                        }, 3000);
                    } else {
                        console.log(`MapMaker Status (${type}): ${message}`);
                    }
                }
            };
            handleVehicleToolClick(x, y, z, mapData, appState, assetManagerInstance, vehicleToolInteractionInterface);
            break;
        case "fill":
            floodFill2D(x, y, z, appState.currentTileId, mapData, assetManagerInstance, toolInteractionInterface);
            clearAllSelections(); // Fill usually deselects
            break;
        case "fill3d":
            floodFill3D(x, y, z, appState.currentTileId, mapData, assetManagerInstance, toolInteractionInterface);
            clearAllSelections();
            break;
        case "line":
        case "rect":
        case "stamp":
            if (appState.dragStart === null) {
                appState.dragStart = { x, y, z }; // Store z for stamp copy start point
                clearAllSelections(); // Start of a drag operation usually deselects other things
            }
            break;
        default:
            logToConsole(`Warning: Unknown tool '${appState.currentTool}' activated on mousedown.`);
            snapshot(); // Fallback for unknown tools that might modify data
            break;
    }
}

export function handleCellMouseUp(event) {
    const x = +event.target.dataset.x;
    const y = +event.target.dataset.y;
    const z = appState.currentEditingZ; // For line/rect, z is currentEditingZ. For stamp apply, it's also currentEditingZ.
    const mapData = getMapData();

    const toolInteractionInterface = {
        getMapContext: () => ({ ensureLayersForZ: appState.ensureLayersForZ, gridWidth: appState.gridWidth, gridHeight: appState.gridHeight }),
        getUIRenderers: () => ({ renderGrid: triggerFullGridRender })
    };

    // Only proceed if a drag was initiated for relevant tools, or if it's a stamp application.
    if (appState.dragStart === null && appState.currentTool !== "stamp") return;

    switch (appState.currentTool) {
        case "line":
            if (appState.dragStart) { // Ensure drag was started for line
                const currentBrushSize = appState.brushSize || 1;
                drawLine(appState.dragStart.x, appState.dragStart.y, z, x, y, appState.currentTileId, mapData, assetManagerInstance, toolInteractionInterface, currentBrushSize);
            }
            break;
        case "rect":
            if (appState.dragStart) { // Ensure drag was started for rect
                const depth = getRect3DDepth(); // Assumes UIManager.getRect3DDepth() exists and is correct
                drawRect(appState.dragStart.x, appState.dragStart.y, z, x, y, depth, appState.currentTileId, mapData, assetManagerInstance, toolInteractionInterface);
            }
            break;
        case "stamp":
            const stampDepth = getRect3DDepth();
            if (!appState.stampData3D && appState.dragStart) { // Define stamp phase
                // Use appState.dragStart.z as the starting Z for copying from the map
                defineStamp(appState.dragStart.x, appState.dragStart.y, appState.dragStart.z, x, y, stampDepth, mapData, appState, toolInteractionInterface);
            } else if (appState.stampData3D) { // Apply stamp phase
                applyStamp(x, y, z, appState.stampData3D, mapData, assetManagerInstance, toolInteractionInterface);
            }
            // For stamp, dragStart is cleared after defining. Applying doesn't use dragStart in the same way.
            // If current logic is: drag to define, then click to apply, dragStart should be null for apply.
            // If it's drag to define, then drag again to position & apply on mouseup, this needs adjustment.
            // Assuming dragStart is for definition phase only here.
            break;
    }
    appState.dragStart = null; // Clear drag start for line, rect, and stamp definition.
    // Individual tool functions now call renderGrid if needed.
}

// --- Grid Container Mouse Event Handlers ---
function handleGridMouseMove(event) {
    const cell = event.target.closest(".cell");
    if (!cell) { // Mouse is over the grid container but not a specific cell
        if (appState.previewPos || appState.mouseOverGridPos) { // If there was a preview, clear it
            appState.previewPos = null;
            appState.mouseOverGridPos = null;
            triggerFullGridRender();
        }
        return;
    }

    const currentMousePos = { x: +cell.dataset.x, y: +cell.dataset.y, z: +cell.dataset.z }; // z might not be needed for brush preview

    let needsRender = false;

    // Stamp Preview Logic
    if (appState.currentTool === "stamp" && appState.stampData3D) {
        if (!appState.previewPos || appState.previewPos.x !== currentMousePos.x || appState.previewPos.y !== currentMousePos.y) {
            appState.previewPos = { x: currentMousePos.x, y: currentMousePos.y, z: currentMousePos.z }; // z from cell for consistency
            needsRender = true;
        }
        // Ensure brush preview is cleared if stamp is active
        if (appState.mouseOverGridPos) {
            appState.mouseOverGridPos = null;
            needsRender = true; // Also needs render to remove brush preview
        }
    }
    // Brush Preview Logic
    else if (appState.currentTool === "brush" && (appState.brushSize || 1) > 1) {
        if (!appState.mouseOverGridPos || appState.mouseOverGridPos.x !== currentMousePos.x || appState.mouseOverGridPos.y !== currentMousePos.y) {
            appState.mouseOverGridPos = { x: currentMousePos.x, y: currentMousePos.y };
            needsRender = true;
        }
        // Ensure stamp preview is cleared if brush is active
        if (appState.previewPos) {
            appState.previewPos = null;
            needsRender = true; // Also needs render to remove stamp preview
        }
    }
    // Line Tool Preview Logic (similar to brush, but depends on dragStart)
    else if ((appState.currentTool === "line" || appState.currentTool === "rect") && appState.dragStart) {
        if (!appState.mouseOverGridPos || appState.mouseOverGridPos.x !== currentMousePos.x || appState.mouseOverGridPos.y !== currentMousePos.y) {
            appState.mouseOverGridPos = { x: currentMousePos.x, y: currentMousePos.y };
            needsRender = true;
        }
        // Ensure other previews are cleared
        if (appState.previewPos) { // Stamp preview
            appState.previewPos = null;
            needsRender = true;
        }
        // No need to clear brush preview here as dragStart being active means brush tool isn't the one setting mouseOverGridPos for its own preview
    }
    // Fill Tools Preview Logic
    else if (appState.currentTool === "fill" || appState.currentTool === "fill3d") {
        if (!appState.mouseOverGridPos || appState.mouseOverGridPos.x !== currentMousePos.x || appState.mouseOverGridPos.y !== currentMousePos.y) {
            appState.mouseOverGridPos = { x: currentMousePos.x, y: currentMousePos.y };
            needsRender = true;
        }
        // Ensure other previews are cleared
        if (appState.previewPos) { // Stamp preview
            appState.previewPos = null;
            needsRender = true;
        }
        // dragStart is not used by fill tools, so no need to check/clear based on it.
    }
    // Clear previews if no relevant tool is active or condition met
    else {
        if (appState.previewPos) { // Stamp preview
            appState.previewPos = null;
            needsRender = true;
        }
        if (appState.mouseOverGridPos) {
            appState.mouseOverGridPos = null;
            needsRender = true;
        }
    }

    if (needsRender) {
        triggerFullGridRender();
    }
}

function handleGridMouseLeave() {
    let needsRender = false;
    if (appState.previewPos) { // For stamp
        appState.previewPos = null;
        needsRender = true;
    }
    if (appState.mouseOverGridPos) { // For brush
        appState.mouseOverGridPos = null;
        needsRender = true;
    }
    if (needsRender) {
        triggerFullGridRender();
    }
}

// --- Global Keyboard Event Handler ---
function handleGlobalKeyDown(event) {
    const mapData = getMapData(); // Get fresh mapData for undo/redo context
    // Handle Ctrl/Cmd + Z/Y for undo/redo
    if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === "z") {
            event.preventDefault();
            if (undoData((restoredMapData) => updateUIFromLoadedMap(restoredMapData, appState.currentEditingZ, appState.currentTool))) {
                triggerFullGridRender();
                triggerAllEditorUIsUpdate(); // Ensure editors reflect undone state
            }
        } else if (event.key.toLowerCase() === "y") {
            event.preventDefault();
            if (redoData((restoredMapData) => updateUIFromLoadedMap(restoredMapData, appState.currentEditingZ, appState.currentTool))) {
                triggerFullGridRender();
                triggerAllEditorUIsUpdate();
            }
        }
        return; // Don't process other shortcuts if modifier was used for undo/redo
    }

    // Tool selection shortcuts (only if not typing in an input field)
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable) {
        return;
    }

    let newTool = null;
    switch (event.key.toLowerCase()) {
        case "b": newTool = "brush"; break;
        case "f": newTool = "fill"; break;
        case "l": newTool = "line"; break;
        case "r": newTool = "rect"; break;
        case "s": newTool = "stamp"; break;
        case "p": newTool = "portal"; break;
        case "i": newTool = "selectInspect"; break;
        case "n": newTool = "npc"; break; // Added N for NPC tool
        case "e": // Eraser tile selection + brush tool
            appState.currentTileId = ""; // Select eraser tile
            updatePaletteSelectionUI(""); // Update palette UI
            newTool = "brush"; // Switch to brush tool
            break;
        case "<":
        case ",":
            if (event.key === '<' || (event.shiftKey && event.key === ',')) {
                 handleZLevelChange(-1); // Down
            }
            break;
        case ">":
        case ".":
            if (event.key === '>' || (event.shiftKey && event.key === '.')) {
                handleZLevelChange(1); // Up
            }
            break;
        case "escape":
            handleEscapeKey();
            break;
    }

    if (newTool) {
        appState.currentTool = newTool;
        updateToolButtonUI(newTool);
        // If switching to a non-selection tool, clear current selections
        if (newTool !== "selectInspect" && newTool !== "portal") {
            clearAllSelections();
        }
        logToConsole(`Tool switched to: ${newTool} via keyboard shortcut.`);
        triggerFullGridRender(); // Update grid if selection highlights changed
    }
}

function handleEscapeKey() {
    if (appState.dragStart) {
        appState.dragStart = null;
        logToConsole("Drag operation cancelled.");
        triggerFullGridRender(); // Remove any visual drag cues
    } else if (appState.selectedPortal || appState.selectedNpc || appState.selectedTileForInventory || appState.selectedGenericTile) { // selectedNpc check is implicitly handled by clearAllSelections if tool is not NPC
        clearAllSelections(); // This will call triggerAllEditorUIsUpdate, which updates NPC panel too
        if (appState.selectedNpc) { // If NPC tool is active, clearAllSelections might not clear selectedNpc
            appState.selectedNpc = null;
            updateSelectedNpcInfoUI(null, assetManagerInstance.npcDefinitions); // Explicitly update NPC UI
        }
        logToConsole("All selections cleared via Escape key.");
        triggerFullGridRender(); // Update visual selections on grid
    } else if (appState.stampData3D) {
        appState.stampData3D = null;
        appState.previewPos = null;
        logToConsole("Defined stamp data cleared via Escape key.");
        triggerFullGridRender();
    }
}


// --- Setup for Static UI Element Event Listeners ---
function setupButtonEventListeners() {
    const el = (id, event, handler) => {
        const element = document.getElementById(id);
        if (element) element.addEventListener(event, handler);
        else console.warn(`EventHandlers: Element with ID '${id}' not found for listener setup.`);
    };

    // Map Dimensions & Resize
    el("resizeBtn", "click", handleResizeButtonClick);

    // Tool Buttons (Individual listeners for specific double-click behaviors like clearing stamp)
    document.querySelectorAll(".toolBtn").forEach(btn => {
        btn.addEventListener("click", () => handleToolButtonClick(btn.dataset.tool));
    });

    // Z-Level Controls
    el("zLevelInput", "change", handleZLevelInputChange);
    el("zLevelUpBtn", "click", () => handleZLevelChange(1));
    el("zLevelDownBtn", "click", () => handleZLevelChange(-1));
    el("addZLevelBtn", "click", handleAddZLevelClick);
    el("deleteZLevelBtn", "click", handleDeleteZLevelClick);

    // Layer Visibility Toggles
    [LAYER_TYPES.BOTTOM, LAYER_TYPES.MIDDLE].forEach(layerName => {
        const visCheckbox = document.getElementById(`vis_${layerName}`);
        if (visCheckbox) {
            visCheckbox.addEventListener('change', () => {
                appState.layerVisibility[layerName] = visCheckbox.checked;
                triggerFullGridRender();
            });
            // Initialize from HTML state during appState setup, not here directly
        }
    });

    // Import/Export
    el("exportBtn", "click", handleExportMap);
    el("loadBtn", "click", () => document.getElementById("mapFileInput")?.click()); // Trigger hidden file input
    el("mapFileInput", "change", handleLoadMapFile);


    // Palette Tag Filters
    document.querySelectorAll(".tagFilterCheckbox").forEach(checkbox => {
        checkbox.addEventListener('change', handleTagFilterChange);
    });
    el('clearTagFiltersBtn', 'click', handleClearTagFilters);

    // Palette Search
    el('paletteSearchInput', 'input', handlePaletteSearchChange);
    el('clearPaletteSearchBtn', 'click', handleClearPaletteSearch);

    // Onion Skinning Controls
    el('enableOnionSkinCheckbox', 'change', handleOnionSkinEnableChange);
    el('onionLayersBelowInput', 'change', () => handleOnionSkinDepthChange('layersBelow'));
    el('onionLayersAboveInput', 'change', () => handleOnionSkinDepthChange('layersAbove'));

    // Container Inventory & Lock Properties Editor
    el('addItemToContainerBtn', 'click', handleAddItemToContainerClick);
    el('isLockedCheckbox', 'change', handleToggleLockStateClick);
    el('lockDifficultyInput', 'input', handleChangeLockDcInput);
    el('doorCodeInput', 'input', handleChangeDoorCodeInput);

    // Vehicle Properties
    el('saveVehiclePropertiesBtn', 'click', handleSaveVehiclePropertiesClick);
    el('removeVehicleBtn', 'click', handleRemoveSelectedVehicleClick);
    el('toggleVehicleConfigBtn', 'click', () => toggleSectionVisibility('vehicleConfigContent', 'toggleVehicleConfigBtn', 'Vehicle'));

    // Note: Remove item from container is handled via dynamically created buttons in UIManager.
    // Those buttons will call `interactionDispatcher.removeItemFromContainer(index)`.

    // Portal Properties Editor
    el('savePortalPropertiesBtn', 'click', handleSavePortalPropertiesClick);
    el('removePortalBtn', 'click', handleRemoveSelectedPortalClick);

    // Tile Instance Properties Editor
    el('saveTileInstancePropertiesBtn', 'click', handleSaveTileInstancePropsClick);
    el('clearTileInstancePropertiesBtn', 'click', handleClearTileInstancePropsClick);

    // Map Metadata Editor
    el('saveMapMetadataBtn', 'click', handleSaveMapMetadataClick);
    el('toggleMetadataEditorBtn', 'click', () => toggleSectionVisibility('metadataEditorContent', 'toggleMetadataEditorBtn', 'Metadata'));

    // Portal Configuration
    el('togglePortalConfigBtn', 'click', () => toggleSectionVisibility('portalConfigContent', 'togglePortalConfigBtn', 'Portals'));

    // Brush Size
    el('brushSizeInput', 'change', handleBrushSizeChange);

    // NPC Configuration Panel
    el('saveNpcPropertiesBtn', 'click', handleSaveNpcPropertiesClick);
    el('removeNpcBtn', 'click', handleRemoveSelectedNpcClick);
    el('toggleNpcConfigBtn', 'click', () => toggleSectionVisibility('npcConfigContent', 'toggleNpcConfigBtn', 'NPC'));

    // Listener for npcBaseTypeSelect to update the selected NPC's definition ID immediately
    const npcBaseTypeSelect = document.getElementById('npcBaseTypeSelect');
    if (npcBaseTypeSelect) {
        npcBaseTypeSelect.addEventListener('change', (e) => {
            if (appState.selectedNpc) {
                appState.selectedNpc.definitionId = e.target.value;
                // Note: We don't automatically randomize the face here, as that might overwrite custom work.
                // The user can click "Randomize NPC Face" to apply constraints based on the new type.
            }
        });
    }

    // --- NPC Face Generator Event Listeners ---
    const npcFaceControls = [
        'npcFace_headWidthRange', 'npcFace_headHeightRange', 'npcFace_eyeSizeRange',
        'npcFace_browHeightRange', 'npcFace_browAngleRange', 'npcFace_browWidthRange',
        'npcFace_noseWidthRange', 'npcFace_noseHeightRange', 'npcFace_mouthWidthRange',
        'npcFace_mouthFullnessRange', 'npcFace_hairstyleSelect', 'npcFace_facialHairSelect',
        'npcFace_glassesSelect', 'npcFace_eyeColorPicker', 'npcFace_hairColorPicker',
        'npcFace_lipColorPicker', 'npcFace_skinColorPicker'
    ];

    npcFaceControls.forEach(controlId => {
        const element = document.getElementById(controlId);
        if (element) {
            const eventType = (element.type === 'select-one' || element.type === 'color') ? 'change' : 'input';
            element.addEventListener(eventType, () => {
                if (appState.selectedNpc && typeof updateNpcFacePreview === 'function') { // Use imported function
                    snapshot(); // Create undo state before face modification through UI
                    updateNpcFacePreview(appState.selectedNpc); // Use imported function
                }
            });
        } else {
            // This warning can be noisy if mapMaker.html hasn't been updated yet by a previous step
            // console.warn(`NPC Face control not found for event listener: ${controlId}`);
        }
    });

    const randomizeNpcFaceButton = document.getElementById('npcFace_randomizeFaceButton');
    if (randomizeNpcFaceButton) {
        randomizeNpcFaceButton.addEventListener('click', () => {
            if (appState.selectedNpc &&
                typeof window.generateRandomFaceParams === 'function' &&
                typeof populateNpcFaceUI === 'function' &&  // Use imported function
                typeof updateNpcFacePreview === 'function') { // Use imported function
                snapshot(); // Create undo state before randomization
                window.generateRandomFaceParams(appState.selectedNpc.faceData); // Directly modify the selected NPC's faceData
                applyZombieFaceConstraints(appState.selectedNpc); // Apply constraints if zombie
                populateNpcFaceUI(appState.selectedNpc.faceData); // Update the UI controls from the new data - Use imported function
                updateNpcFacePreview(appState.selectedNpc); // Update the preview - Use imported function
                logToConsole(`Randomized face for NPC: ${appState.selectedNpc.name || appState.selectedNpc.id}`);
            } else {
                let errorReason = "No NPC selected";
                if (!appState.selectedNpc) errorReason = "No NPC selected";
                else if (typeof window.generateRandomFaceParams !== 'function') errorReason = "generateRandomFaceParams missing";
                else if (typeof populateNpcFaceUI !== 'function') errorReason = "populateNpcFaceUI missing"; // Check imported function
                else if (typeof updateNpcFacePreview !== 'function') errorReason = "updateNpcFacePreview missing"; // Check imported function
                logToConsole(`Cannot randomize NPC face: ${errorReason}.`, "warn");
            }
        });
    }

    const addHealthPartBtn = document.getElementById('addHealthPartBtn');
    if (addHealthPartBtn) {
        addHealthPartBtn.addEventListener('click', () => {
            const partNameInput = document.getElementById('newHealthPartName');
            const partMaxInput = document.getElementById('newHealthPartMax');
            const partName = partNameInput.value.trim(); // Allow spaces? Body parts are camelCase in keys usually, but user might type 'Tail'
            // For keys, we should probably camelCase it or keep as is.
            // Let's rely on exact string for now, but maybe sanitize.
            // The codebase usually uses camelCase for keys (leftArm).
            // Let's assume the user knows or we can map common names.
            // Simple approach: Use what they type as the key.
            const partMax = parseInt(partMaxInput.value, 10) || 10;

            if (!appState.selectedNpc) {
                alert("No NPC selected.");
                return;
            }
            if (!partName) {
                alert("Please enter a name for the new body part.");
                return;
            }

            // Convert display name to key (simple camelCase approximation)
            // e.g., "Left Wing" -> "leftWing", "tail" -> "tail"
            const key = partName.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
                return index === 0 ? word.toLowerCase() : word.toUpperCase();
            }).replace(/\s+/g, '');

            snapshot(); // Save state

            // Ensure npc.health exists
            if (!appState.selectedNpc.health) {
                // Should copy from base if possible, but if not, empty object
                const baseDefs = assetManagerInstance.npcDefinitions;
                const defId = appState.selectedNpc.definitionId;
                const baseHealth = (baseDefs && baseDefs[defId]) ? baseDefs[defId].health : {};
                appState.selectedNpc.health = JSON.parse(JSON.stringify(baseHealth));
            }

            if (appState.selectedNpc.health[key]) {
                alert(`Body part '${key}' already exists.`);
                return;
            }

            appState.selectedNpc.health[key] = {
                max: partMax,
                current: partMax,
                armor: 0,
                crisisTimer: 0
            };

            logToConsole(`Added health part '${key}' (Max: ${partMax}) to NPC ${appState.selectedNpc.id}`);

            // Re-render the list
            renderNpcHealthConfig(appState.selectedNpc, assetManagerInstance.npcDefinitions);

            // Clear inputs
            partNameInput.value = '';
            partMaxInput.value = 10;
        });
    }
}

// --- Generic Toggle Function ---
function toggleSectionVisibility(contentId, buttonId, sectionName) {
    const contentElement = document.getElementById(contentId);
    const buttonElement = document.getElementById(buttonId);

    if (contentElement && buttonElement) {
        const isHidden = contentElement.style.display === 'none';
        contentElement.style.display = isHidden ? '' : 'none'; // Use '' to revert to default (block, inline, etc.)
        buttonElement.textContent = isHidden ? 'Hide' : 'Show';
        logToConsole(`${sectionName} section ${isHidden ? 'shown' : 'hidden'}.`);
    } else {
        console.warn(`Toggle Error: Content ('${contentId}') or Button ('${buttonId}') not found for ${sectionName}.`);
    }
}


// --- Specific Click/Change Handlers for UI Elements ---

function handleResizeButtonClick() {
    const wInput = document.getElementById("inputWidth");
    const hInput = document.getElementById("inputHeight");
    if (!wInput || !hInput) return;

    const w = parseInt(wInput.value, 10);
    const h = parseInt(hInput.value, 10);

    if (w > 0 && h > 0 && (w !== appState.gridWidth || h !== appState.gridHeight)) {
        snapshot();
        const oldW = appState.gridWidth;
        const oldH = appState.gridHeight;
        appState.gridWidth = w;
        appState.gridHeight = h;
        document.documentElement.style.setProperty("--cols", appState.gridWidth);

        const mapData = getMapData();
        mapData.width = w;
        mapData.height = h;

        // Adjust existing Z-levels. This is a complex operation.
        // A simple approach: recreate layers, data outside new bounds is lost.
        // A better approach: copy existing data within new bounds.
        Object.keys(mapData.levels).forEach(zKey => {
            const z = parseInt(zKey, 10);
            // For simplicity, let's assume ensureLayersForZ with forceRecreate handles it
            // or a dedicated resize function is called.
            appState.ensureLayersForZ(z, w, h, mapData, true /* force recreate for resize */);
        });
        triggerFullGridRender();
        logToConsole(`Map resized from ${oldW}x${oldH} to ${w}x${h}. Layer data potentially adjusted.`);
    }
}

function handleToolButtonClick(toolName) {
    if (appState.currentTool === toolName && toolName === "stamp") {
        appState.stampData3D = null; // Double-click stamp tool to clear defined stamp
        appState.previewPos = null;
        logToConsole("Stamp data cleared by re-clicking tool button.");
        triggerFullGridRender(); // Clear preview
    }
    appState.currentTool = toolName;
    updateToolButtonUI(toolName);

    if (toolName !== "selectInspect" && toolName !== "portal" && toolName !== "npc" && toolName !== "vehicle") {
        clearAllSelections(); // This will also call updateSelectedNpcInfoUI
    } else if (toolName === "npc") {
        // When NPC tool is selected, ensure panel is visible (updateSelectedNpcInfoUI handles this based on selectedNpc)
        updateSelectedNpcInfoUI(appState.selectedNpc, assetManagerInstance.npcDefinitions);
    } else if (appState.selectedNpc && toolName !== "npc" && toolName !== "selectInspect") {
        // If switching away from NPC tool (and not to selectInspect which might keep it), clear selection
        appState.selectedNpc = null;
        updateSelectedNpcInfoUI(null, assetManagerInstance.npcDefinitions); // Hide panel
    }

    // Vehicle Tool Logic
    if (toolName === "vehicle") {
        updateSelectedVehicleInfoUI(appState.selectedVehicle, assetManagerInstance.vehicleTemplateDefinitions);
    } else if (appState.selectedVehicle && toolName !== "vehicle" && toolName !== "selectInspect") {
        appState.selectedVehicle = null;
        updateSelectedVehicleInfoUI(null, assetManagerInstance.vehicleTemplateDefinitions);
    }


    // If switching away from a tool that uses dragStart, or to a tool that clears it (like stamp)
    if ((appState.currentTool === "line" || appState.currentTool === "rect") && toolName !== appState.currentTool) {
        appState.dragStart = null;
        appState.mouseOverGridPos = null; // Clear potential line/rect preview
        triggerFullGridRender(); // Update grid to remove preview
    } else if (toolName === "stamp" && appState.dragStart) {
        appState.dragStart = null; // Stamp tool itself might use dragStart differently or clear it
        appState.mouseOverGridPos = null;
        triggerFullGridRender();
    }
    // If current tool is brush, and we switch away, mouseOverGridPos for brush is cleared by handleGridMouseMove.

    logToConsole(`Tool changed to: ${toolName}`);
}

function handleZLevelInputChange(event) {
    const newZ = parseInt(event.target.value, 10);
    if (!isNaN(newZ) && newZ !== appState.currentEditingZ) {
        appState.currentEditingZ = newZ;
        appState.ensureLayersForZ(appState.currentEditingZ, appState.gridWidth, appState.gridHeight, getMapData());
        clearAllSelectionsAndPreviews();
        triggerFullGridRender();
        logToConsole(LOG_MSG.CURRENT_Z_CHANGED(appState.currentEditingZ));
    }
}

function handleZLevelChange(delta) {
    appState.currentEditingZ += delta;
    document.getElementById("zLevelInput").value = appState.currentEditingZ; // Update input field
    appState.ensureLayersForZ(appState.currentEditingZ, appState.gridWidth, appState.gridHeight, getMapData());
    clearAllSelectionsAndPreviews();
    triggerFullGridRender();
    logToConsole(LOG_MSG.CURRENT_Z_CHANGED(appState.currentEditingZ));
}

function handleAddZLevelClick() {
    const mapData = getMapData();
    const existingZs = Object.keys(mapData.levels).map(Number);
    const defaultNewZ = existingZs.length > 0 ? Math.max(...existingZs) + 1 : 0;
    const newZStr = prompt("Enter Z-level index to add (integer):", defaultNewZ.toString());
    if (newZStr === null) return; // User cancelled
    const newZ = parseInt(newZStr, 10);

    if (isNaN(newZ)) {
        alert(ERROR_MSG.INVALID_Z_LEVEL_INPUT); return;
    }
    if (mapData.levels[newZ.toString()]) {
        alert(ERROR_MSG.Z_LEVEL_EXISTS(newZ)); return;
    }
    snapshot();
    appState.currentEditingZ = newZ;
    appState.ensureLayersForZ(newZ, appState.gridWidth, appState.gridHeight, mapData);
    document.getElementById("zLevelInput").value = appState.currentEditingZ;
    clearAllSelectionsAndPreviews();
    triggerFullGridRender();
    logToConsole(LOG_MSG.ADDED_Z_LEVEL(appState.currentEditingZ));
}

function handleDeleteZLevelClick() {
    const mapData = getMapData();
    const zToDelete = appState.currentEditingZ;
    if (Object.keys(mapData.levels).length <= 1) {
        alert(ERROR_MSG.CANNOT_DELETE_LAST_Z); return;
    }
    if (!mapData.levels[zToDelete.toString()]) {
        alert(ERROR_MSG.Z_LEVEL_DOES_NOT_EXIST(zToDelete)); return;
    }
    if (!confirm(ERROR_MSG.CONFIRM_DELETE_Z_LEVEL(zToDelete))) return;

    // deleteZLevelFromData handles snapshotting
    const result = deleteZLevelFromData(zToDelete, mapData, appState.gridWidth, appState.gridHeight);

    if (result.success) {
        appState.currentEditingZ = result.newCurrentEditingZ;
        document.getElementById("zLevelInput").value = appState.currentEditingZ;
        // Ensure the new current Z is valid and its layers exist (should be handled by deleteZLevelFromData if it creates a new default)
        appState.ensureLayersForZ(appState.currentEditingZ, appState.gridWidth, appState.gridHeight, mapData);

        // Clear selections that might have been on the deleted Z level
        if (appState.selectedPortal?.z === zToDelete) appState.selectedPortal = null;
        if (appState.selectedNpc?.mapPos?.z === zToDelete) appState.selectedNpc = null;
        if (appState.selectedTileForInventory?.z === zToDelete) appState.selectedTileForInventory = null;
        if (appState.selectedGenericTile?.z === zToDelete) appState.selectedGenericTile = null;

        clearAllSelectionsAndPreviews(); // General cleanup and UI update
        triggerFullGridRender();
    } else if (result.error) {
        alert(result.error);
    }
}

function handleExportMap() {
    const mapData = getMapData();
    mapData.width = appState.gridWidth; // Ensure mapData has latest dimensions
    mapData.height = appState.gridHeight;
    // mapData.startPos is already part of mapData and should be current.
    exportMapFile(mapData);
}

async function handleLoadMapFile(event) {
    const fileInput = event.target;
    if (!fileInput.files || fileInput.files.length === 0) {
        alert(ERROR_MSG.SELECT_JSON_FILE); return;
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const rawJson = JSON.parse(e.target.result);
            const uiUpdaters = {
                updateUIFromLoadedMap, triggerFullGridRender, triggerAllEditorUIsUpdate,
                buildPalette: () => buildPalette(appState.currentTileId, appState.activeTagFilters),
                populateItemSelectDropdown
            };
            const loadResult = await convertAndSetLoadedMapData(rawJson, assetManagerInstance, appState, uiUpdaters);

            if (loadResult.success) {
                alert(ERROR_MSG.MAP_LOADED_SUCCESS(loadResult.mapNameId, appState.currentEditingZ));
            } else {
                alert(loadResult.error || "Unknown error during map load and conversion.");
            }
        } catch (err) {
            alert(ERROR_MSG.ERROR_PARSING_MAP(err.message));
            console.error("Error parsing map file:", err);
        } finally {
            fileInput.value = ""; // Reset file input to allow reloading the same file
        }
    };
    reader.readAsText(file);
}

function handleTagFilterChange() {
    appState.activeTagFilters = Array.from(document.querySelectorAll(".tagFilterCheckbox:checked")).map(cb => cb.value);
    buildPalette(appState.currentTileId, appState.activeTagFilters); // Rebuild palette with new filters
}

function handleClearTagFilters() {
    document.querySelectorAll(".tagFilterCheckbox").forEach(checkbox => checkbox.checked = false);
    appState.activeTagFilters = [];
    buildPalette(appState.currentTileId, appState.activeTagFilters);
}

function handlePaletteSearchChange() {
    // buildPalette will read the input value directly from the DOM element
    buildPalette(appState.currentTileId, appState.activeTagFilters);
}

function handleClearPaletteSearch() {
    const searchInput = document.getElementById('paletteSearchInput');
    if (searchInput) {
        searchInput.value = ""; // Clear the input field
    }
    buildPalette(appState.currentTileId, appState.activeTagFilters); // Rebuild with empty search
}

function handleOnionSkinEnableChange(event) {
    appState.onionSkinState.enabled = event.target.checked;
    triggerFullGridRender();
}

function handleOnionSkinDepthChange(direction) { // direction is 'layersBelow' or 'layersAbove'
    const inputElement = document.getElementById(`onion${direction.charAt(0).toUpperCase() + direction.slice(1)}Input`);
    if (inputElement) {
        appState.onionSkinState[direction] = parseInt(inputElement.value, 10) || 0;
        if (appState.onionSkinState.enabled) triggerFullGridRender();
    }
}

function handleAddItemToContainerClick() {
    const mapData = getMapData();
    if (!appState.selectedTileForInventory || !mapData) {
        alert("No container tile selected."); return;
    }
    const { x, y, z, layerName } = appState.selectedTileForInventory;

    let tileData = mapData.levels[z.toString()]?.[layerName]?.[y]?.[x];
    const baseTileId = (typeof tileData === 'object' && tileData?.tileId) ? tileData.tileId : tileData;
    const tileDef = assetManagerInstance.tilesets[baseTileId];

    if (!tileDef?.tags?.includes('container')) {
        alert(ERROR_MSG.INVALID_CONTAINER_TYPE_ERROR); return;
    }

    // Ensure tileData is an object and has containerInventory array
    if (typeof tileData === 'string') {
        snapshot();
        tileData = { tileId: baseTileId, containerInventory: [] };
        mapData.levels[z.toString()][layerName][y][x] = tileData;
    } else if (typeof tileData !== 'object' || tileData === null) {
        alert(ERROR_MSG.CANNOT_ADD_ITEM_INVALID_TILE); return;
    }
    if (!Array.isArray(tileData.containerInventory)) { // Ensure it's an array
        snapshot();
        tileData.containerInventory = [];
    }

    const itemId = document.getElementById('itemSelectForContainer').value;
    const quantityInput = document.getElementById('itemQuantityForContainer');
    const quantity = parseInt(quantityInput.value, 10);

    if (!itemId || itemId === "") { alert("Please select an item."); return; }
    if (isNaN(quantity) || quantity < 1) { alert("Please enter a valid quantity (1 or more)."); return; }

    snapshot();
    const existingItem = tileData.containerInventory.find(item => item.id === itemId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        tileData.containerInventory.push({ id: itemId, quantity: quantity });
    }
    logToConsole(LOG_MSG.ADDED_ITEM_TO_CONTAINER(itemId, quantity, x, y, layerName));
    updateContainerInventoryUI(appState.selectedTileForInventory, mapData);
    quantityInput.value = 1; // Reset quantity input
}

// This function is called by buttons created dynamically in UIManager
export function removeItemFromContainerByIndex(itemIndex) {
    const mapData = getMapData();
    if (!appState.selectedTileForInventory || !mapData) return;
    const { x, y, z, layerName } = appState.selectedTileForInventory;
    let tileData = mapData.levels[z.toString()]?.[layerName]?.[y]?.[x];

    if (typeof tileData === 'object' && Array.isArray(tileData.containerInventory)) {
        snapshot();
        tileData.containerInventory.splice(itemIndex, 1);
        logToConsole(`Item at index ${itemIndex} removed from container at (${x},${y},Z${z}).`);
        updateContainerInventoryUI(appState.selectedTileForInventory, mapData);
    }
}

function handleToggleLockStateClick(event) {
    const mapData = getMapData();
    if (!appState.selectedTileForInventory || !mapData) return;
    const { x, y, z, layerName } = appState.selectedTileForInventory;

    let tileObject = ensureTileIsObject(x, y, z, layerName, mapData); // ensureTileIsObject modifies mapData
    if (!tileObject) {
        logToConsole(ERROR_MSG.INVALID_TILE_FOR_LOCK_ERROR(x, y, z));
        event.target.checked = !event.target.checked; // Revert checkbox
        return;
    }
    const tileDef = assetManagerInstance.tilesets[tileObject.tileId];
    if (!tileDef?.tags || !(tileDef.tags.includes('door') || tileDef.tags.includes('window') || tileDef.tags.includes('container'))) {
        logToConsole(ERROR_MSG.NON_LOCKABLE_TILE_ERROR(tileObject.tileId));
        event.target.checked = !event.target.checked; return;
    }

    snapshot();
    tileObject.isLocked = event.target.checked;
    if (!tileObject.isLocked) {
        delete tileObject.lockDC; // Remove DC if unlocked
    } else if (tileObject.lockDC === undefined || tileObject.lockDC === 0) {
        tileObject.lockDC = DEFAULT_LOCK_DC; // Set default DC when locking
    }
    updateLockPropertiesUI(appState.selectedTileForInventory, tileObject, tileDef);
}

function handleChangeLockDcInput(event) {
    const mapData = getMapData();
    const lockDifficultyInput = event.target;
    if (!appState.selectedTileForInventory || lockDifficultyInput.disabled || !mapData) return;
    const { x, y, z, layerName } = appState.selectedTileForInventory;

    let tileObject = ensureTileIsObject(x, y, z, layerName, mapData);
    if (!tileObject) { logToConsole(ERROR_MSG.INVALID_TILE_FOR_LOCK_ERROR(x, y, z)); return; }
    // No need to check tileDef again as it's implied by isLockedCheckbox being enabled.

    snapshot();
    tileObject.lockDC = parseInt(lockDifficultyInput.value, 10) || 0;
    logToConsole(`Lock DC for tile at (${x},${y},Z${z}) changed to ${tileObject.lockDC}.`);
}

function handleChangeDoorCodeInput(event) {
    const mapData = getMapData();
    const doorCodeInput = event.target;
    if (!appState.selectedTileForInventory || doorCodeInput.disabled || !mapData) return;
    const { x, y, z, layerName } = appState.selectedTileForInventory;

    let tileObject = ensureTileIsObject(x, y, z, layerName, mapData);
    if (!tileObject) { logToConsole(ERROR_MSG.INVALID_TILE_FOR_LOCK_ERROR(x, y, z)); return; }

    snapshot();
    const code = doorCodeInput.value.trim();
    if (code) {
        tileObject.doorCode = code;
    } else {
        delete tileObject.doorCode;
    }
    logToConsole(`Door Code for tile at (${x},${y},Z${z}) changed to ${tileObject.doorCode || '(none)'}.`);
}

function handleSavePortalPropertiesClick() {
    if (!appState.selectedPortal) { alert("No portal selected."); return; }
    snapshot();
    const portalDataUpdates = {
        targetMapId: document.getElementById('portalTargetMapId').value.trim().replace(/\.json$/i, ""),
        toWorldNodeId: document.getElementById('portalToWorldNodeId').value.trim(),
        targetX: parseInt(document.getElementById('portalTargetX').value, 10) || 0,
        targetY: parseInt(document.getElementById('portalTargetY').value, 10) || 0,
        targetZ: parseInt(document.getElementById('portalTargetZ').value, 10) || 0,
        name: document.getElementById('portalNameInput').value.trim() || ''
    };
    updatePortalInMap(appState.selectedPortal.id, portalDataUpdates); // Updates mapData
    Object.assign(appState.selectedPortal, portalDataUpdates); // Keep UI state ref in sync
    updateSelectedPortalInfoUI(appState.selectedPortal); // Refresh editor UI
    logToConsole(LOG_MSG.PORTAL_PROPS_SAVED(appState.selectedPortal.id));
}

function handleRemoveSelectedPortalClick() {
    if (!appState.selectedPortal) { alert("No portal selected to remove."); return; }
    if (!confirm(`Are you sure you want to remove portal "${appState.selectedPortal.name || appState.selectedPortal.id}"?`)) return;

    snapshot();
    removePortalFromMap(appState.selectedPortal.id); // Removes from mapData
    logToConsole(LOG_MSG.REMOVED_PORTAL(appState.selectedPortal.id));
    appState.selectedPortal = null; // Clear selection
    updateSelectedPortalInfoUI(null); // Update editor UI
    triggerFullGridRender(); // Update grid to remove portal marker
}

function handleSaveTileInstancePropsClick() {
    const mapData = getMapData();
    if (!appState.selectedGenericTile || !mapData) {
        alert(ERROR_MSG.SAVE_PROPS_NO_TILE_SELECTED); return;
    }
    const { x, y, z, layerName } = appState.selectedGenericTile;

    // ensureTileIsObject will convert string ID to object if necessary, and take a snapshot
    let tileObject = ensureTileIsObject(x, y, z, layerName, mapData);
    if (!tileObject) { // Should only happen if trying to add props to an empty cell that wasn't converted
        logToConsole(ERROR_MSG.SAVE_PROPS_NO_BASE_ID(mapData.levels[z.toString()]?.[layerName]?.[y]?.[x]));
        return;
    }
    snapshot(); // Take snapshot *after* potential conversion by ensureTileIsObject if it wasn't an object

    const newInstanceName = document.getElementById('tileInstanceName').value.trim();
    const newInstanceTagsStr = document.getElementById('tileInstanceTags').value.trim();
    const newInstanceTagsArray = newInstanceTagsStr === "" ? [] : newInstanceTagsStr.split(',').map(tag => tag.trim()).filter(Boolean);

    if (newInstanceName) tileObject.instanceName = newInstanceName;
    else delete tileObject.instanceName;

    if (newInstanceTagsArray.length > 0) tileObject.instanceTags = newInstanceTagsArray;
    else delete tileObject.instanceTags;

    // Optional: Revert to string ID if no custom properties remain AND it's not special (container/lockable)
    const { tileId, instanceName: currentInstName, instanceTags: currentInstTags, ...otherProps } = tileObject;
    const isSpecial = tileObject.hasOwnProperty('containerInventory') || tileObject.hasOwnProperty('isLocked') || tileObject.hasOwnProperty('lockDC');
    if (Object.keys(otherProps).length === 0 && !currentInstName && (!currentInstTags || currentInstTags.length === 0) && !isSpecial) {
        mapData.levels[z.toString()][layerName][y][x] = tileId; // Revert to string ID
        logToConsole(LOG_MSG.CLEARED_TILE_PROPS_REVERTED(x, y, z, layerName, tileId));
    } else {
        logToConsole(LOG_MSG.SAVED_TILE_PROPS(x, y, z, layerName, tileObject));
    }
    updateTilePropertyEditorUI(appState.selectedGenericTile, mapData); // Refresh editor
}

function handleClearTileInstancePropsClick() {
    const mapData = getMapData();
    if (!appState.selectedGenericTile || !mapData) {
        alert(ERROR_MSG.CLEAR_PROPS_NO_TILE_SELECTED); return;
    }
    const { x, y, z, layerName } = appState.selectedGenericTile;
    let tileData = mapData.levels[z.toString()]?.[layerName]?.[y]?.[x];

    if (typeof tileData === 'object' && tileData?.tileId) {
        snapshot();
        const baseTileId = tileData.tileId;
        delete tileData.instanceName;
        delete tileData.instanceTags;

        const { tileId, instanceName, instanceTags, ...otherProps } = tileData;
        const isSpecial = tileData.hasOwnProperty('containerInventory') || tileData.hasOwnProperty('isLocked') || tileData.hasOwnProperty('lockDC');
        if (Object.keys(otherProps).length === 0 && !instanceName && (!instanceTags || instanceTags.length === 0) && !isSpecial) {
            mapData.levels[z.toString()][layerName][y][x] = baseTileId;
            logToConsole(LOG_MSG.CLEARED_TILE_PROPS_REVERTED(x, y, z, layerName, baseTileId));
        } else {
            logToConsole(LOG_MSG.CLEARED_TILE_PROPS_RETAINED(x, y, z, layerName, tileData));
        }
        updateTilePropertyEditorUI(appState.selectedGenericTile, mapData);
    } else if (typeof tileData === 'string') {
        alert(ERROR_MSG.CLEAR_PROPS_NO_CUSTOM_PROPS(x, y, z, layerName));
    } else {
        alert(ERROR_MSG.CLEAR_PROPS_INVALID_DATA(tileData));
    }
}

// --- Helper Functions for Triggering UI Updates ---
/** Centralized function to trigger a full grid re-render. */
function triggerFullGridRender() {
    const mapData = getMapData();
    renderMergedGrid(
        mapData,
        appState.currentEditingZ,
        appState.gridWidth,
        appState.gridHeight,
        appState.layerVisibility,
        appState.onionSkinState,
        appState.previewPos, // For stamp tool
        appState.stampData3D,
        appState.currentTool,
        appState.brushSize, // For brush preview
        appState.mouseOverGridPos // For brush preview
    );
}

/** Centralized function to update all editor panel UIs. */
function triggerAllEditorUIsUpdate() {
    const mapData = getMapData();
    const npcDefs = assetManagerInstance ? assetManagerInstance.npcDefinitions : {};
    updateSelectedPortalInfoUI(appState.selectedPortal);
    updateContainerInventoryUI(appState.selectedTileForInventory, mapData); // Also calls updateLockPropertiesUI
    updateTilePropertyEditorUI(appState.selectedGenericTile, mapData);
    updateSelectedNpcInfoUI(appState.selectedNpc, npcDefs); // Updated to pass npcDefs
    updatePlayerStartDisplay(mapData.startPos); // Though less an "editor", it's part of selected state display
}

/** Clears all selection states and updates relevant UI parts. */
function clearAllSelections() {
    clearSelectionsExcept(null);
}

/**
 * Clears selection states except for the specified type.
 * @param {string|null} keepType - The type of selection to keep ('portal', 'npc', 'vehicle'). Null clears all.
 */
function clearSelectionsExcept(keepType) {
    if (keepType !== 'portal') appState.selectedPortal = null;

    // NPC selection is special because the tool might keep it active for placement
    if (keepType !== 'npc') {
        // Only clear selectedNpc if not actively using NPC tool (handled in tool switch) OR if explicitly asked to clear everything (keepType null)
        // Actually, if we are clearing "others", we should clear NPC unless we want to keep it.
        appState.selectedNpc = null;
    }

    if (keepType !== 'vehicle') appState.selectedVehicle = null;

    // These are usually cleared unless specific tool logic demands keeping them (e.g. inventory tool?)
    // For now, always clear these unless we added a keepType for them
    if (keepType !== 'inventory') appState.selectedTileForInventory = null;
    if (keepType !== 'generic') appState.selectedGenericTile = null;

    triggerAllEditorUIsUpdate();
}

/** Clears selections and also any active previews (like stamp preview). */
function clearAllSelectionsAndPreviews() {
    clearAllSelections();
    appState.previewPos = null;
    // Consider if stampData3D should be cleared here or only by explicit stamp tool action/escape.
    // For now, changing Z-level doesn't auto-clear defined stamp.
    // triggerFullGridRender(); // Is usually called by the function that calls this helper
}

function handleBrushSizeChange(event) {
    const newSize = parseInt(event.target.value, 10);
    if (!isNaN(newSize) && newSize >= 1 && newSize <= 10) { // Max size 10, or from input's max
        appState.brushSize = newSize;
        logToConsole(`Brush size changed to: ${newSize}`);
    } else {
        // Reset to a valid value if input is out of range or invalid
        event.target.value = appState.brushSize;
        logToConsole(`Invalid brush size input. Kept at: ${appState.brushSize}`);
    }
}

function handleSaveMapMetadataClick() {
    const mapData = getMapData();
    if (!mapData) {
        logToConsole("Error: Map data not available to save metadata.");
        const metadataStatus = document.getElementById('metadataStatus');
        if (metadataStatus) metadataStatus.textContent = "Error: Map data unavailable.";
        return;
    }

    snapshot(); // Save current state for undo

    const newName = document.getElementById('mapNameInput')?.value || mapData.name; // Keep old name if input is somehow empty
    const newDescription = document.getElementById('mapDescriptionInput')?.value || "";
    const newAuthor = document.getElementById('mapAuthorInput')?.value || "";
    const newCustomTagsRaw = document.getElementById('mapCustomTagsInput')?.value || "";
    const newCustomTags = newCustomTagsRaw === "" ? [] : newCustomTagsRaw.split(',').map(tag => tag.trim()).filter(Boolean);
    const newAreaId = document.getElementById('mapAreaIdInput')?.value.trim() || "";
    const newPrimaryParentMapId = document.getElementById('mapPrimaryParentInput')?.value.trim() || "";

    mapData.name = newName;
    mapData.description = newDescription;
    mapData.author = newAuthor;
    mapData.customTags = newCustomTags;
    mapData.areaId = newAreaId;
    mapData.primaryParentMapId = newPrimaryParentMapId;

    logToConsole("Map metadata updated in mapData object:", { name: newName, description: newDescription, author: newAuthor, customTags: newCustomTags, areaId: newAreaId, primaryParentMapId: newPrimaryParentMapId });

    const metadataStatus = document.getElementById('metadataStatus');
    if (metadataStatus) {
        metadataStatus.textContent = "Metadata saved to current map session.";
        setTimeout(() => { metadataStatus.textContent = ""; }, 3000); // Clear status after 3 seconds
    }

    // If the map name displayed elsewhere in the UI needs updating, trigger that here.
    // For example, if there's a title showing the current map name.
    // updatePlayerStartDisplay(mapData.startPos); // This also updates map name if it was part of it
    // For now, export will pick up the new name.
}


// --- NPC Panel Event Handlers ---

function handleSaveNpcPropertiesClick() {
    const mapData = getMapData();
    if (!assetManagerInstance.npcDefinitions) {
        alert(ERROR_MSG.NO_NPC_DEFINITIONS_LOADED || "NPC definitions not loaded, cannot save NPC.");
        return;
    }

    const selectedBaseId = getSelectedBaseNpcId();
    const instanceName = document.getElementById('npcInstanceNameInput')?.value.trim();
    const behavior = document.getElementById('npcBehaviorSelect')?.value;
    const dialogueId = document.getElementById('npcDialogueIdInput')?.value.trim();

    if (appState.selectedNpc) { // Editing existing NPC
        snapshot();
        const npcToUpdate = mapData.npcs.find(n => n.id === appState.selectedNpc.id);
        if (npcToUpdate) {
            npcToUpdate.name = instanceName || (assetManagerInstance.npcDefinitions[npcToUpdate.definitionId]?.name || npcToUpdate.id); // Instance name or fallback to base or ID

            if (behavior && behavior !== "") {
                npcToUpdate.behavior = behavior;
            } else {
                delete npcToUpdate.behavior; // Remove if default/empty to fallback to definition
            }

            if (dialogueId) {
                npcToUpdate.dialogueId = dialogueId;
            } else {
                delete npcToUpdate.dialogueId;
            }

            // If base type changed in UI (not standard for this simple setup, but if it were):
            // npcToUpdate.definitionId = selectedBaseId;
            // Then re-template other properties if needed, or just update sprite/color if they are also editable instance props.
            // For now, only name is directly instanced. Sprite/color will come from definitionId.

            // Example if sprite/color were instance-editable:
            // npcToUpdate.sprite = document.getElementById('npcSpriteInput')?.value || assetManagerInstance.npcDefinitions[npcToUpdate.definitionId]?.sprite;
            // npcToUpdate.color = document.getElementById('npcColorInput')?.value || assetManagerInstance.npcDefinitions[npcToUpdate.definitionId]?.color;

            logToConsole(LOG_MSG.NPC_PROPS_SAVED(npcToUpdate.id));
            appState.selectedNpc = npcToUpdate; // Ensure appState ref is the one from mapData
        } else {
            alert("Error: Selected NPC not found in map data. Cannot save.");
            return;
        }
    } else { // Placing a new NPC (This case is primarily handled by handleNpcToolClick, but save could finalize)
        // This block might be redundant if handleNpcToolClick fully creates and selects the NPC.
        // However, if the NPC tool only sets a "pending placement" state, this would be where it's finalized.
        // For now, assume handleNpcToolClick does the creation.
        // If we allow creating an NPC from the panel without a map click, this would be different.
        // For now, this primarily handles updates.
        alert("No NPC selected to save. Use the NPC tool to place an NPC first.");
        return;
    }

    updateSelectedNpcInfoUI(appState.selectedNpc, assetManagerInstance.npcDefinitions);
    triggerFullGridRender();
}

function handleRemoveSelectedNpcClick() {
    if (!appState.selectedNpc) {
        alert("No NPC selected to remove.");
        return;
    }
    if (!confirm(`Are you sure you want to remove NPC "${appState.selectedNpc.name || appState.selectedNpc.id}"?`)) {
        return;
    }

    snapshot();
    const removed = removeNpcFromMap(appState.selectedNpc.id); // Removes from mapData
    if (removed) {
        logToConsole(LOG_MSG.REMOVED_NPC(appState.selectedNpc.id));
    }
    appState.selectedNpc = null; // Clear selection
    updateSelectedNpcInfoUI(null, assetManagerInstance.npcDefinitions); // Update editor UI
    triggerFullGridRender(); // Update grid to remove NPC marker
}

// --- Vehicle Panel Event Handlers ---

function handleSaveVehiclePropertiesClick() {
    const mapData = getMapData();
    if (!assetManagerInstance.vehicleTemplateDefinitions) {
        alert("Vehicle templates not loaded, cannot save Vehicle.");
        return;
    }

    const instanceName = document.getElementById('vehicleInstanceNameInput')?.value.trim();

    if (appState.selectedVehicle) { // Editing existing Vehicle
        snapshot();
        const vehicleToUpdate = mapData.vehicles.find(v => v.id === appState.selectedVehicle.id);
        if (vehicleToUpdate) {
            vehicleToUpdate.name = instanceName || (assetManagerInstance.vehicleTemplateDefinitions[vehicleToUpdate.templateId]?.name || vehicleToUpdate.id);

            logToConsole(LOG_MSG.VEHICLE_PROPS_SAVED(vehicleToUpdate.id));
            appState.selectedVehicle = vehicleToUpdate;
        } else {
            alert("Error: Selected Vehicle not found in map data. Cannot save.");
            return;
        }
    } else {
        alert("No Vehicle selected to save. Use the Vehicle tool to place a Vehicle first.");
        return;
    }

    updateSelectedVehicleInfoUI(appState.selectedVehicle, assetManagerInstance.vehicleTemplateDefinitions);
    triggerFullGridRender();
}

function handleRemoveSelectedVehicleClick() {
    if (!appState.selectedVehicle) {
        alert("No Vehicle selected to remove.");
        return;
    }
    if (!confirm(`Are you sure you want to remove Vehicle "${appState.selectedVehicle.name || appState.selectedVehicle.id}"?`)) {
        return;
    }

    snapshot();
    const removed = removeVehicleFromMap(appState.selectedVehicle.id);
    if (removed) {
        logToConsole(LOG_MSG.REMOVED_VEHICLE(appState.selectedVehicle.id));
    }
    appState.selectedVehicle = null;
    updateSelectedVehicleInfoUI(null, assetManagerInstance.vehicleTemplateDefinitions);
    triggerFullGridRender();
}
