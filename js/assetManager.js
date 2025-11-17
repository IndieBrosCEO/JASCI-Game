// js/assetManager.js

class AssetManager {
    constructor() {
        this.tilesets = {};
        this.itemsById = {};
        this.npcDefinitions = {}; // Renamed from npcsById
        this.dialogues = {};
        this.fishDefinitions = {};
        this.mapsById = {};
        this.currentMap = null;
        this.mapIndexData = null; // For storing mapIndex.json content
        this.tileAliases = {
            "WW1": "WWH",     // Wood Wall Horizontal
            "WW2": "WWV",     // Wood Wall Vertical
            "WW3": "WWCTL",   // Wood Wall Corner Top-Left
            "WW4": "WWCTR",   // Wood Wall Corner Top-Right
            "WW5": "WWCBL",   // Wood Wall Corner Bottom-Left
            "WW6": "WWCBR",   // Wood Wall Corner Bottom-Right
            "WWinC1": "WinCH", // Example: Wood Window Closed Horizontal
            "WWinC2": "WinCV", // Example: Wood Window Closed Vertical
            "WD1": "WDH",     // Wood Door Horizontal (Closed)
            "WD2": "WDV",     // Wood Door Vertical (Closed)
            "MW1": "MWH",     // Metal Wall Horizontal
            "MW2": "MWV",     // Metal Wall Vertical
            "MW3": "MWCTL",   // Metal Wall Corner Top-Left
            "MW4": "MWCTR",   // Metal Wall Corner Top-Right
            "MW5": "MWCBL",   // Metal Wall Corner Bottom-Left
            "MW6": "MWCBR",   // Metal Wall Corner Bottom-Right
            "MD1": "MDH",     // Metal Door Horizontal (Closed)
            // Add any other common wall/door/window aliases observed if obvious.
            // For instance, map IDs like 'WF' (Wood Floor), 'FL' (Tile Flooring) likely map directly.
            // If they don't and are used in maps, they might need entries too,
            // but prioritize structural, impassable items for the wall-phasing bug.
            "FL": "FL", // Tile Flooring (likely direct map)
            "WF": "WF"  // Wood Flooring (likely direct map)
        };
    }

    getTileDefinition(tileIdFromMap) {
        if (!tileIdFromMap) return null;
        // Check direct match first
        if (this.tilesets[tileIdFromMap]) {
            return this.tilesets[tileIdFromMap];
        }
        // Check aliases
        const alias = this.tileAliases[tileIdFromMap];
        if (alias && this.tilesets[alias]) {
            return this.tilesets[alias];
        }
        // Optional: Log warning if tile still not found, though _validateMapTiles handles this broadly.
        // console.warn(`AssetManager.getTileDefinition: No definition found for tile ID '${tileIdFromMap}' after checking aliases.`);
        return null;
    }

    setMapIndexData(mapIndexJson) {
        if (Array.isArray(mapIndexJson)) {
            this.mapIndexData = mapIndexJson;
            console.log("AssetManager: mapIndexData has been set.");
        } else {
            console.warn("AssetManager: setMapIndexData received invalid data. Expected an array.", mapIndexJson);
            this.mapIndexData = null; // Or keep previous if preferred
        }
    }

    async loadDefinitions() {
        let tempItemsById = {};
        this.tilesets = {};
        this.itemsById = {};
        this.npcDefinitions = {};
        this.fishDefinitions = {};
        this.vehiclePartDefinitions = {};
        this.vehicleTemplateDefinitions = {};
        this.dynamicEventTemplates = {};
        this.proceduralQuestTemplates = {};
        this.trapDefinitionsData = {};
        this.constructionDefinitions = {};
        this.levelCurve = [];
        this.families = {};
        this.familyItems = new Map();
        this.legacyAliases = {};

        // Updated to load from new categorized item files
        const definitionFiles = [
            'level_curve.json',
            'tileset.json',
            'npcs.json',
            'weapons.json',
            'ammunition.json',
            'consumables.json',
            'clothing.json',
            'fish.json',
            'tools.json',
            'crafting_materials.json',
            'containers.json',
            'trap_kits.json',
            'vehicle_parts.json',
            'vehicle_templates.json',
            'dynamic_event_templates.json',
            'procedural_quest_templates.json',
            'traps.json', // Added traps.json
            'constructions.json' // Added constructions.json
        ];

        for (const filename of definitionFiles) {
            const url = `/assets/definitions/${filename}?t=${Date.now()}`;
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} for ${filename}`);
                }
                const parsedJson = await response.json();

                if (filename === 'level_curve.json') {
                    if (Array.isArray(parsedJson)) {
                        this.levelCurve = parsedJson;
                        console.log(`AssetManager: Loaded ${this.levelCurve.length} level curve entries.`);
                    } else {
                        console.warn(`AssetManager: Expected array from level_curve.json, but got ${typeof parsedJson}. Skipping file.`);
                    }
                } else if (filename === 'tileset.json') {
                    this.tilesets = parsedJson;
                    console.log("AssetManager: Base tilesets loaded:", this.tilesets);
                } else if (filename === 'npcs.json') {
                    this.npcDefinitions = Object.fromEntries(parsedJson.map(npc => [npc.id, npc]));
                } else if (filename === 'fish.json') {
                    this.fishDefinitions = parsedJson;
                } else if (filename === 'vehicle_parts.json') {
                    if (Array.isArray(parsedJson)) {
                        this.vehiclePartDefinitions = Object.fromEntries(parsedJson.map(part => [part.id, part]));
                        console.log(`AssetManager: Loaded ${Object.keys(this.vehiclePartDefinitions).length} vehicle parts.`);
                    } else {
                        console.warn(`AssetManager: Expected array from vehicle_parts.json, but got ${typeof parsedJson}. Skipping file.`);
                    }
                } else if (filename === 'vehicle_templates.json') {
                    if (Array.isArray(parsedJson)) {
                        this.vehicleTemplateDefinitions = Object.fromEntries(parsedJson.map(template => [template.id, template]));
                        console.log(`AssetManager: Loaded ${Object.keys(this.vehicleTemplateDefinitions).length} vehicle templates.`);
                    } else {
                        console.warn(`AssetManager: Expected array from vehicle_templates.json, but got ${typeof parsedJson}. Skipping file.`);
                    }
                } else if (filename === 'dynamic_event_templates.json') {
                    if (Array.isArray(parsedJson)) {
                        this.dynamicEventTemplates = Object.fromEntries(parsedJson.map(template => [template.id, template]));
                        console.log(`AssetManager: Loaded ${Object.keys(this.dynamicEventTemplates).length} dynamic event templates.`);
                    } else {
                        console.warn(`AssetManager: Expected array from dynamic_event_templates.json, but got ${typeof parsedJson}. Skipping file.`);
                    }
                } else if (filename === 'procedural_quest_templates.json') {
                    if (Array.isArray(parsedJson)) {
                        this.proceduralQuestTemplates = Object.fromEntries(parsedJson.map(template => [template.id, template]));
                        console.log(`AssetManager: Loaded ${Object.keys(this.proceduralQuestTemplates).length} procedural quest templates.`);
                    } else {
                        console.warn(`AssetManager: Expected array from procedural_quest_templates.json, but got ${typeof parsedJson}. Skipping file.`);
                    }
                } else if (filename === 'traps.json') {
                    if (typeof parsedJson === 'object' && !Array.isArray(parsedJson)) {
                        this.trapDefinitionsData = parsedJson; // Directly assign the object
                        // Optionally, validate that each trap has an 'id' matching its key, or add it if missing.
                        // For now, direct assignment is simplest if the structure is { "trap_id_1": { ... }, "trap_id_2": { ... } }
                        // And downstream code expects this.trapDefinitionsData["trap_id_1"]
                        console.log(`AssetManager: Loaded ${Object.keys(this.trapDefinitionsData).length} trap definitions from object.`);
                    } else if (Array.isArray(parsedJson)) { // Keep handling for array format if it might still occur
                        this.trapDefinitionsData = Object.fromEntries(parsedJson.map(trap => [trap.id, trap]));
                        console.log(`AssetManager: Loaded ${Object.keys(this.trapDefinitionsData).length} trap definitions from array.`);
                    } else {
                        console.warn(`AssetManager: Expected object or array from traps.json, but got ${typeof parsedJson}. Skipping file.`);
                    }
                } else if (filename === 'constructions.json') {
                    if (Array.isArray(parsedJson)) {
                        this.constructionDefinitions = Object.fromEntries(parsedJson.map(def => [def.id, def]));
                        console.log(`AssetManager: Loaded ${Object.keys(this.constructionDefinitions).length} construction definitions.`);
                    } else {
                        console.warn(`AssetManager: Expected array from constructions.json, but got ${typeof parsedJson}. Skipping file.`);
                        this.constructionDefinitions = {}; // Ensure it's an empty object on failure
                    }
                } else if (['weapons.json', 'ammunition.json', 'consumables.json', 'clothing.json', 'tools.json', 'crafting_materials.json', 'containers.json', 'trap_kits.json'].includes(filename)) {
                    // All new item files are arrays of items
                    if (Array.isArray(parsedJson)) {
                        parsedJson.forEach(item => {
                            if (tempItemsById[item.id]) { // Fixed the check to use tempItemsById
                                console.warn(`AssetManager: Duplicate item ID '${item.id}' found while loading ${filename}. Overwriting previous entry from another file.`);
                            }
                            tempItemsById[item.id] = item;
                        });
                    } else {
                        console.warn(`AssetManager: Expected array from ${filename}, but got ${typeof parsedJson}. Skipping file.`);
                    }
                }
            } catch (error) {
                console.error(`Failed to load base definition file ${filename}:`, error);
            }
        }
        console.log("Base asset definitions loaded.");
        this.itemsById = tempItemsById; // All items are now consolidated into itemsById
        console.log("AssetManager: All items loaded:", this.itemsById);

        // After loading NPCs, load their dialogue files
        const dialogueFilesToLoad = new Set();
        Object.values(this.npcDefinitions).forEach(npcDef => {
            if (npcDef.dialogueFile) {
                dialogueFilesToLoad.add(npcDef.dialogueFile);
            }
        });

        for (const filename of dialogueFilesToLoad) {
            const url = `/assets/dialogue/${filename}?t=${Date.now()}`;
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} for ${filename}`);
                }
                this.dialogues[filename] = await response.json();
                console.log(`AssetManager: Dialogue file '${filename}' loaded successfully.`);
            } catch (error) {
                console.error(`Failed to load dialogue file ${filename}:`, error);
            }
        }
    }

    getVehiclePart(partId) {
        return this.vehiclePartDefinitions[partId] || null;
    }

    getVehicleTemplate(templateId) {
        return this.vehicleTemplateDefinitions[templateId] || null;
    }

    getDynamicEventTemplate(templateId) {
        return this.dynamicEventTemplates[templateId] || null;
    }

    getAllDynamicEventTemplates() { // Added getter for all
        return this.dynamicEventTemplates; // Returns the object; could also return Object.values(this.dynamicEventTemplates) for an array
    }

    getProceduralQuestTemplate(templateId) {
        return this.proceduralQuestTemplates[templateId] || null;
    }

    getAllProceduralQuestTemplates() { // Added getter for all
        return this.proceduralQuestTemplates; // Returns the object
    }

    getTileset(tilesetId) { // tilesetId is optional, will return all tilesets if not provided
        if (tilesetId) {
            // If the structure of tilesets.json is an object with multiple named tilesets
            // return this.tilesets[tilesetId];
            // For now, assuming tileset.json is the default tileset itself or an object with an id
            if (this.tilesets && this.tilesets.id === tilesetId) {
                return this.tilesets;
            }
            // If tilesets.json is an array of tilesets, you might search by id:
            // return this.tilesets.find(ts => ts.id === tilesetId);
            return this.tilesets[tilesetId]; // Simple lookup if this.tilesets is a map of tilesets
        }
        return this.tilesets; // Returns the whole tilesets object (likely the default one)
    }

    getItem(itemId) {
        return this.itemsById[itemId] || null;
    }

    getNpc(npcId) {
        return this.npcDefinitions[npcId] || null; // Use npcDefinitions
    }

    getDialogue(dialogueId) {
        if (!this.dialogues[dialogueId]) {
            console.error(`Dialogue file with id '${dialogueId}' not found in assetManager.`);
            return null;
        }
        return this.dialogues[dialogueId];
    }

    getLevelCurve() {
        return this.levelCurve || [];
    }

    async loadData(url) {
        try {
            const response = await fetch(`${url}?t=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Failed to load data from ${url}:`, error);
            return null;
        }
    }

    getFish(fishId) {
        if (fishId) {
            return this.fishDefinitions[fishId] || null;
        }
        return this.fishDefinitions;
    }

    async loadMap(mapId) {
        console.log(`AssetManager.loadMap: Called with mapId = "${mapId}" (Type: ${typeof mapId})`);
        let mapJsonData;
        let loadedFromPath = '';

        const baseMapPath = `/assets/maps/${mapId}.json?t=${Date.now()}`;
        console.log(`AssetManager.loadMap: Attempting to load base map from: ${baseMapPath}`);
        try {
            const response = await fetch(baseMapPath);
            if (!response.ok) {
                const error = new Error(`HTTP error! status: ${response.status} for base map ${mapId} at ${baseMapPath}`);
                error.response = response;
                throw error;
            }
            mapJsonData = await response.json();
            loadedFromPath = baseMapPath;
            console.log(`AssetManager.loadMap: Base map '${mapId}' data fetched successfully from ${baseMapPath}.`);
        } catch (error) {
            console.error(`AssetManager.loadMap: Base map fetch failed for '${baseMapPath}'. Error: ${error.message}, Status: ${error.response ? error.response.status : 'N/A'}`);
            this.currentMap = null;
            return false; // Indicate failure
        }

        if (!mapJsonData) {
            console.error(`Map data for '${mapId}' could not be loaded from any path.`);
            this.currentMap = null;
            return false;
        }

        // Transform map data
        const processedMapData = { id: mapId, name: mapId }; // Default name

        if (this.mapIndexData) {
            const mapInfo = this.mapIndexData.find(m => m.id === mapId);
            if (mapInfo && mapInfo.name) {
                processedMapData.name = mapInfo.name;
            }
        }

        let width = mapJsonData.width; // Width and height are still relevant for the 2D plane of each Z-level
        let height = mapJsonData.height;

        // Infer dimensions from the first Z-level's landscape layer if not directly available
        if ((width === undefined || height === undefined) && mapJsonData.levels) {
            const firstZLevelKey = Object.keys(mapJsonData.levels)[0];
            if (firstZLevelKey && mapJsonData.levels[firstZLevelKey] && mapJsonData.levels[firstZLevelKey].landscape) {
                const landscapeLayer = mapJsonData.levels[firstZLevelKey].landscape;
                if (Array.isArray(landscapeLayer) && landscapeLayer.length > 0 && Array.isArray(landscapeLayer[0])) {
                    height = landscapeLayer.length;
                    width = landscapeLayer[0].length;
                    console.log(`Map dimensions for '${mapId}' inferred from Z-level '${firstZLevelKey}' landscape layer: ${width}x${height}`);
                } else {
                    console.warn(`Map dimensions could not be inferred for map '${mapId}' from Z-level '${firstZLevelKey}'. Using 0x0.`);
                    width = 0; height = 0;
                }
            } else {
                console.warn(`Map dimensions could not be inferred for map '${mapId}' as levels or landscape data is missing. Using 0x0.`);
                width = 0; height = 0;
            }
        } else if (width === undefined || height === undefined) {
            console.warn(`Map dimensions (width/height) missing for map '${mapId}' and could not be inferred. Using 0x0.`);
            width = 0; height = 0;
        }

        processedMapData.dimensions = { width, height }; // These are per-Z-level dimensions
        processedMapData.levels = mapJsonData.levels || {}; // Store the Z-levels structure
        processedMapData.startPos = mapJsonData.startPos || { x: 0, y: 0, z: 0 }; // Include Z in startPos

        processedMapData.portals = mapJsonData.portals || [];
        // Ensure NPCs have Z coordinate, default to 0 if missing from old map formats during transition
        processedMapData.npcs = (mapJsonData.npcs || []).map(npc => {
            // Prioritize npc.mapPos (from map maker format), then npc.pos (older/other format), then default.
            const positionData = npc.mapPos || npc.pos || { x: 0, y: 0, z: 0 };
            const finalNpc = {
                ...npc, // Spread all original properties from the map file's NPC entry
                pos: {  // Ensure the final structure uses 'pos' for consistency downstream
                    x: positionData.x !== undefined ? positionData.x : 0,
                    y: positionData.y !== undefined ? positionData.y : 0,
                    z: positionData.z !== undefined ? positionData.z : 0
                }
            };
            // Remove mapPos if it exists to avoid confusion, as 'pos' is now the standard
            if (finalNpc.hasOwnProperty('mapPos')) {
                delete finalNpc.mapPos;
            }
            return finalNpc;
        });
        processedMapData.container_instances = mapJsonData.container_instances || []; // Future: may need Z
        processedMapData.tileset = mapJsonData.tileset || null; // Or a default tileset ID

        this.currentMap = processedMapData;
        this.mapsById[mapId] = processedMapData; // Cache the processed map

        this._validateMapTiles(this.currentMap);

        console.log(`Map '${mapId}' processed and loaded successfully from ${loadedFromPath}. Name: ${processedMapData.name}`);
        return processedMapData; // Return processed map data
    }

    _validateMapTiles(mapData) {
        if (!mapData || !mapData.id || !mapData.levels) { // Check for .levels now
            console.warn(`Invalid map data for validation (missing id or levels): ${mapData ? mapData.id : 'unknown map'}`);
            return;
        }

        for (const zLevelKey in mapData.levels) {
            if (mapData.levels.hasOwnProperty(zLevelKey)) {
                const levelData = mapData.levels[zLevelKey];
                if (!levelData) {
                    console.warn(`Missing level data for Z-level '${zLevelKey}' in map '${mapData.id}'.`);
                    continue;
                }
                // Define the layers to check within each Z-level
                const layersToValidate = ['landscape', 'building', 'item', 'roof'];
                for (const layerName of layersToValidate) {
                    if (levelData.hasOwnProperty(layerName)) {
                        const layer = levelData[layerName];
                        if (Array.isArray(layer)) {
                            for (let r = 0; r < layer.length; r++) {
                                const row = layer[r];
                                if (Array.isArray(row)) {
                                    for (let c = 0; c < row.length; c++) {
                                        const tileData = row[c];
                                        // Tile data can be a string ID or an object { tileId: "ID", ... }
                                        const tileId = (typeof tileData === 'object' && tileData !== null && tileData.tileId !== undefined)
                                            ? tileData.tileId
                                            : tileData;

                                        if (tileId !== null && tileId !== "" && !this.getTileDefinition(tileId)) {
                                            console.warn(`Unknown tile ID: '${tileId}' in map '${mapData.id}', Z-level '${zLevelKey}', layer '${layerName}', at [${r},${c}] (after alias check)`);
                                        }
                                    }
                                }
                            }
                        } else if (layer !== undefined && layer !== null) {
                            console.warn(`Layer '${layerName}' in Z-level '${zLevelKey}' of map '${mapData.id}' is not an array.`);
                        }
                    } else {
                        // It's okay if a layer like 'roof' or 'item' is missing, but landscape/building should ideally be present.
                        // console.log(`Layer '${layerName}' not present in Z-level '${zLevelKey}' of map '${mapData.id}'.`);
                    }
                }
            }
        }
    }

    getMap(mapId) {
        return this.mapsById[mapId] || null;
    }

    findItemsByTag(tag) {
        if (!tag || typeof tag !== 'string') {
            console.warn("findItemsByTag: tag must be a non-empty string.");
            return [];
        }
        const lowerCaseTag = tag.toLowerCase();
        const foundItems = [];
        for (const itemId in this.itemsById) {
            if (this.itemsById.hasOwnProperty(itemId)) {
                const item = this.itemsById[itemId];
                if (item && Array.isArray(item.tags)) {
                    if (item.tags.some(t => typeof t === 'string' && t.toLowerCase() === lowerCaseTag)) {
                        foundItems.push(item);
                    }
                }
            }
        }
        return foundItems;
    }

    findNpcsByTag(tag) {
        if (!tag || typeof tag !== 'string') {
            console.warn("findNpcsByTag: tag must be a non-empty string.");
            return [];
        }
        const lowerCaseTag = tag.toLowerCase();
        const foundNpcs = [];
        for (const npcId in this.npcDefinitions) { // Use npcDefinitions
            if (this.npcDefinitions.hasOwnProperty(npcId)) {
                const npc = this.npcDefinitions[npcId];
                if (npc && Array.isArray(npc.tags)) {
                    if (npc.tags.some(t => typeof t === 'string' && t.toLowerCase() === lowerCaseTag)) {
                        foundNpcs.push(npc);
                    }
                }
            }
        }
        return foundNpcs;
    }

    findAssets(queryText, assetTypes) {
        const results = [];
        if (!queryText || typeof queryText !== 'string' || queryText.trim() === "") {
            console.warn("findAssets: queryText must be a non-empty string.");
            return results;
        }
        const lowerCaseQuery = queryText.toLowerCase();

        const searchAllTypes = !assetTypes || (Array.isArray(assetTypes) && assetTypes.length === 0);
        const typesToSearch = new Set(Array.isArray(assetTypes) ? assetTypes.map(t => t.toLowerCase()) : []);

        // Search items
        if (searchAllTypes || typesToSearch.has('item')) {
            for (const itemId in this.itemsById) {
                if (this.itemsById.hasOwnProperty(itemId)) {
                    const item = this.itemsById[itemId];
                    if (!item) continue;

                    let match = false;
                    if (item.name && typeof item.name === 'string' && item.name.toLowerCase().includes(lowerCaseQuery)) {
                        match = true;
                    }
                    if (!match && item.id && typeof item.id === 'string' && item.id.toLowerCase().includes(lowerCaseQuery)) {
                        match = true;
                    }
                    if (!match && Array.isArray(item.tags)) {
                        if (item.tags.some(tag => typeof tag === 'string' && tag.toLowerCase().includes(lowerCaseQuery))) {
                            match = true;
                        }
                    }
                    if (match) {
                        results.push(item);
                    }
                }
            }
        }

        // Search NPCs
        if (searchAllTypes || typesToSearch.has('npc')) {
            for (const npcId in this.npcDefinitions) { // Use npcDefinitions
                if (this.npcDefinitions.hasOwnProperty(npcId)) {
                    const npc = this.npcDefinitions[npcId];
                    if (!npc) continue;

                    let match = false;
                    if (npc.name && typeof npc.name === 'string' && npc.name.toLowerCase().includes(lowerCaseQuery)) {
                        match = true;
                    }
                    if (!match && npc.id && typeof npc.id === 'string' && npc.id.toLowerCase().includes(lowerCaseQuery)) {
                        match = true;
                    }
                    if (!match && Array.isArray(npc.tags)) {
                        if (npc.tags.some(tag => typeof tag === 'string' && tag.toLowerCase().includes(lowerCaseQuery))) {
                            match = true;
                        }
                    }
                    if (match) {
                        // Check if this object is already in results to prevent duplicates if searching multiple types
                        // and an object somehow got miscategorized or if IDs overlap (though not expected with current structure)
                        if (!results.includes(npc)) { // Simple check, could be more performant for very large N
                            results.push(npc);
                        }
                    }
                }
            }
        }
        // Future extension for other asset types (tilesets, maps) would go here.
        return results;
    }
}
