// mapMaker/mapMaker.js
"use strict";

// AssetManager is assumed to be globally available via <script src="../js/assetManager.js"></script>
// If it were a module, it would be: import AssetManager from '../js/assetManager.js';
const assetManager = new AssetManager();
// Expose assetManager globally for debugging and verification tests
window.assetManager = assetManager;

// --- Configuration and Constants ---
import {
    DEFAULT_ONION_LAYERS_BELOW,
    DEFAULT_ONION_LAYERS_ABOVE,
    LAYER_TYPES,
    DEFAULT_START_POS_Z,
    DEFAULT_MAP_NAME,
    LOG_MSG, // For direct use in this file if any, or passed via appState/context
    ERROR_MSG // For direct use in this file if any
} from './config.js';
import { logToConsole } from './config.js'; // Specific utility

// --- Data Management ---
import {
    getMapData,
    setMapData, // If needed directly by mapMaker.js, typically used by importExport
    initNewMap,
    ensureLayersForZ as ensureLayersForZInManager,
    snapshot as recordSnapshot,
    undo as performUndo,
    redo as performRedo,
    clearUndoRedoStacks
} from './mapDataManager.js';

// --- Tile Logic ---
// placeTile is used by tools, not directly usually by the main orchestrator after setup
import { initializeTileManager } from './tileManager.js';

// --- Integrated Tools ---
import { DialogueEditor } from './dialogueEditor.js';
import { QuestEditor } from './questEditor.js';

// --- UI Management ---
import {
    initializeUIManager,
    buildPalette,
    renderMergedGrid,
    resetUIForNewMap,
    populateItemSelectDropdown,
    populateNpcBaseTypeDropdown, // Added for NPC dropdown
    populateVehicleBaseTypeDropdown, // Added for Vehicle dropdown
    updatePlayerStartDisplay,
    updateGridDimensionsUI,
    updateToolButtonUI, // Needed for direct tool changes by shortcut if not fully in eventHandlers
    updatePaletteSelectionUI, // Needed for direct tile changes by shortcut
    setIntegratedTools // Added for linking tools
} from './uiManager.js';

// --- Event Handling ---
// Main event handlers are initialized, specific handlers like handleCellMouseDown are passed to UIManager
import { initializeEventHandlers, handleCellMouseDown, handleCellMouseUp, removeItemFromContainerByIndex } from './eventHandlers.js';

// Import/Export is primarily used by eventHandlers, but keep if direct calls are ever needed
// import { exportMapFile, convertAndSetLoadedMapData } from './importExport.js';


// --- Central Application State ---
// This object holds UI state, interaction context, and references needed by various modules.
const appState = {
    // Map context (dynamic parts of it)
    gridWidth: 20,
    gridHeight: 15,
    currentEditingZ: DEFAULT_START_POS_Z,

    // UI / Interaction State
    currentTool: "brush",
    currentTileId: "",
    activeTagFilters: [],

    layerVisibility: {
        [LAYER_TYPES.BOTTOM]: true,
        [LAYER_TYPES.MIDDLE]: true
    },
    onionSkinState: {
        enabled: false,
        layersBelow: DEFAULT_ONION_LAYERS_BELOW,
        layersAbove: DEFAULT_ONION_LAYERS_ABOVE
    },

    // Selections for editors
    selectedTileForInventory: null,
    selectedPortal: null,
    selectedNpc: null, // This was already here, good.
    selectedVehicle: null, // Added for vehicles
    selectedGenericTile: null,

    // Interaction states for tools
    dragStart: null,
    previewPos: null, // For stamp tool
    stampData3D: null,
    brushSize: 1, // Added for adjustable brush size
    mouseOverGridPos: null, // For brush preview

    nextPortalId: 0,
    nextNpcId: 0, // Added for unique NPC IDs

    // Method to ensure layers for Z exist, bound to mapDataManager's function
    // This provides a consistent way for modules to call this, ensuring the main mapData is used.
    ensureLayersForZ: (z, width, height, mapDataObj, force = false) => {
        // If mapDataObj is not provided, it defaults to the one from mapDataManager
        ensureLayersForZInManager(z, width, height, mapDataObj || getMapData(), force);
    },

    // Functions to trigger UI updates, passed to eventHandlers and potentially other modules
    // These will call the actual render/update functions from uiManager
    triggerFullGridRender: () => {
        renderMergedGrid(
            getMapData(), appState.currentEditingZ, appState.gridWidth, appState.gridHeight,
            appState.layerVisibility, appState.onionSkinState, appState.previewPos,
            appState.stampData3D, appState.currentTool
        );
    },
    triggerPaletteBuild: () => {
        buildPalette(appState.currentTileId, appState.activeTagFilters);
    },
    // Add other triggers as needed, e.g., for specific editor panel updates
    // This is a simplified version; a more robust system might use custom events or a state management library
};


// --- Initialization Function ---
async function initializeMapMaker() {
    logToConsole("Initializing Map Maker...");

    try {
        await assetManager.loadDefinitions();
        logToConsole(LOG_MSG.ASSETS_LOADED);
        if (!assetManager.tilesets || Object.keys(assetManager.tilesets).length === 0) {
            logToConsole(ERROR_MSG.TILE_DEF_EMPTY_ERROR);
            const errorDisp = document.getElementById('errorMessageDisplayMapMaker');
            if (errorDisp) errorDisp.textContent = ERROR_MSG.TILE_DEF_EMPTY_ERROR;
        }
        if (!assetManager.itemsById || Object.keys(assetManager.itemsById).length === 0) {
            logToConsole(ERROR_MSG.NO_ITEMS_LOADED_WARNING);
        }
    } catch (error) {
        console.error("Map Maker: Error loading asset definitions:", error);
        const errorDisp = document.getElementById('errorMessageDisplayMapMaker');
        if (errorDisp) errorDisp.textContent = ERROR_MSG.ASSET_LOAD_ERROR + " Check console.";
    }

    // Initialize appState with values from DOM
    appState.gridWidth = parseInt(document.getElementById("inputWidth")?.value, 10) || 20;
    appState.gridHeight = parseInt(document.getElementById("inputHeight")?.value, 10) || 15;
    appState.currentEditingZ = parseInt(document.getElementById("zLevelInput")?.value, 10) || DEFAULT_START_POS_Z;

    const bottomVisCheckbox = document.getElementById(`vis_${LAYER_TYPES.BOTTOM}`);
    if (bottomVisCheckbox) appState.layerVisibility[LAYER_TYPES.BOTTOM] = bottomVisCheckbox.checked;
    const middleVisCheckbox = document.getElementById(`vis_${LAYER_TYPES.MIDDLE}`);
    if (middleVisCheckbox) appState.layerVisibility[LAYER_TYPES.MIDDLE] = middleVisCheckbox.checked;

    const onionEnableCheckbox = document.getElementById('enableOnionSkinCheckbox');
    if (onionEnableCheckbox) appState.onionSkinState.enabled = onionEnableCheckbox.checked;
    const onionBelowInput = document.getElementById('onionLayersBelowInput');
    if (onionBelowInput) appState.onionSkinState.layersBelow = parseInt(onionBelowInput.value, 10) || DEFAULT_ONION_LAYERS_BELOW;
    const onionAboveInput = document.getElementById('onionLayersAboveInput');
    if (onionAboveInput) appState.onionSkinState.layersAbove = parseInt(onionAboveInput.value, 10) || DEFAULT_ONION_LAYERS_ABOVE;

    const brushSizeInput = document.getElementById('brushSizeInput');
    if (brushSizeInput) appState.brushSize = parseInt(brushSizeInput.value, 10) || 1;


    // Initialize Modules
    initializeTileManager(assetManager);

    // Initialize Integrated Tools
    const questEditor = new QuestEditor('quest-editor');
    // Load quests from AssetManager into QuestEditor
    if (assetManager.quests) {
        questEditor.setQuests(assetManager.quests);
    }

    const dialogueEditor = new DialogueEditor('dialogue-editor', questEditor);

    // Tab Switching Logic
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tool-content').forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            const targetId = button.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // Define interaction functions UIManager needs to attach to dynamic elements
    const uiInteractionDispatch = {
        handleCellMouseDown: handleCellMouseDown,
        handleCellMouseUp: handleCellMouseUp,
        removeItemFromContainer: removeItemFromContainerByIndex,
        onPaletteTileSelect: (tileId) => {
            appState.currentTileId = tileId;
            // If a tile (not eraser) is selected, switch to brush tool
            if (tileId !== "" && appState.currentTool !== "brush" && appState.currentTool !== "selectInspect" && appState.currentTool !== "portal") {
                appState.currentTool = "brush";
                updateToolButtonUI(appState.currentTool);
            }
        }
    };
    initializeUIManager(assetManager, appState, uiInteractionDispatch);
    setIntegratedTools(dialogueEditor, questEditor); // Pass tool instances to UIManager
    initializeEventHandlers(assetManager, appState); // Event Handlers will use appState

    // Initialize Map Data
    initNewMap(appState.gridWidth, appState.gridHeight, appState.currentEditingZ);
    appState.currentTileId = (assetManager.tilesets && Object.keys(assetManager.tilesets).length > 0)
        ? Object.keys(assetManager.tilesets)[0]
        : "";
    if (Object.keys(assetManager.tilesets).length === 0) {
        appState.currentTileId = ""; // Ensure eraser is selected if no tiles
    }


    // Initial UI Setup
    resetUIForNewMap(appState.gridWidth, appState.gridHeight, appState.currentEditingZ, appState.currentTool);
    updatePlayerStartDisplay(getMapData().startPos);
    updateGridDimensionsUI(appState.gridWidth, appState.gridHeight);

    populateItemSelectDropdown();
    if (assetManager.npcDefinitions) { // Ensure NPC defs are loaded before populating
        populateNpcBaseTypeDropdown(assetManager.npcDefinitions);
    } else {
        logToConsole("NPC definitions not available on assetManager at init time for dropdown.", "warn");
    }

    if (assetManager.vehicleTemplateDefinitions) {
        populateVehicleBaseTypeDropdown(assetManager.vehicleTemplateDefinitions);
    } else {
        logToConsole("Vehicle definitions not available on assetManager at init time for dropdown.", "warn");
    }
    buildPalette(appState.currentTileId, appState.activeTagFilters);

    appState.triggerFullGridRender(); // Initial render

    logToConsole("Map Maker Initialized Successfully.");
    const statusMsgElement = document.getElementById('statusMessageDisplay');
    if (statusMsgElement) {
        statusMsgElement.textContent = `Map Maker ready. Default map '${getMapData().name || DEFAULT_MAP_NAME}' created.`;
        setTimeout(() => { if (statusMsgElement.textContent.includes(getMapData().name)) statusMsgElement.textContent = ''; }, 5000);
    }
}

// --- Global Event Listener ---
window.onload = initializeMapMaker;
