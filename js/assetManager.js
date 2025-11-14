class AssetManager {
    constructor() {
        this.tilesets = {};
        this.itemsById = {};
        this.npcDefinitions = {};
        this.dialogues = {};
        this.fishDefinitions = {};
        this.mapsById = {};
        this.currentMap = null;
        this.mapIndexData = null;
        this.families = {};
        this.familyItems = new Map();
        this.legacyAliases = {};
        this.tileAliases = {
            "WW1": "WWH", "WW2": "WWV", "WW3": "WWCTL", "WW4": "WWCTR", "WW5": "WWCBL", "WW6": "WWCBR",
            "WWinC1": "WinCH", "WWinC2": "WinCV", "WD1": "WDH", "WD2": "WDV",
            "MW1": "MWH", "MW2": "MWV", "MW3": "MWCTL", "MW4": "MWCTR", "MW5": "MWCBL", "MW6": "MWCBR",
            "MD1": "MDH", "FL": "FL", "WF": "WF"
        };
    }

    getTileDefinition(tileIdFromMap) {
        if (!tileIdFromMap) return null;
        if (this.tilesets[tileIdFromMap]) return this.tilesets[tileIdFromMap];
        const alias = this.tileAliases[tileIdFromMap];
        if (alias && this.tilesets[alias]) return this.tilesets[alias];
        return null;
    }

    setMapIndexData(mapIndexJson) {
        if (Array.isArray(mapIndexJson)) {
            this.mapIndexData = mapIndexJson;
            console.log("AssetManager: mapIndexData has been set.");
        } else {
            console.warn("AssetManager: setMapIndexData received invalid data.", mapIndexJson);
            this.mapIndexData = null;
        }
    }

    async loadDefinitions() {
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
        this.families = {};
        this.familyItems = new Map();
        this.legacyAliases = {};

        // Load families and aliases first
        try {
            const familiesResponse = await fetch(`/assets/definitions/families.json?t=${Date.now()}`);
            if (familiesResponse.ok) this.families = await familiesResponse.json();
        } catch (error) {
            console.error("Failed to load families.json:", error);
        }
        try {
            const aliasesResponse = await fetch(`/assets/definitions/legacy_aliases.json?t=${Date.now()}`);
            if (aliasesResponse.ok) this.legacyAliases = await aliasesResponse.json();
        } catch (error) {
            console.error("Failed to load legacy_aliases.json:", error);
        }

        const definitionFiles = [
            'tileset.json', 'npcs.json', 'weapons.json', 'ammunition.json', 'consumables.json',
            'clothing.json', 'fish.json', 'tools.json', 'crafting_materials.json', 'containers.json',
            'vehicle_parts.json', 'vehicle_templates.json', 'dynamic_event_templates.json',
            'procedural_quest_templates.json', 'traps.json', 'constructions.json'
        ];

        for (const filename of definitionFiles) {
            const url = `/assets/definitions/${filename}?t=${Date.now()}`;
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${filename}`);
                const parsedJson = await response.json();
                this._processDefinitionFile(filename, parsedJson);
            } catch (error) {
                console.error(`Failed to load base definition file ${filename}:`, error);
            }
        }
        this._buildFamilyIndexes();
        console.log("Base asset definitions loaded and indexed.");

        await this._loadDialogueFiles();
    }

    _processDefinitionFile(filename, parsedJson) {
        const handlers = {
            'tileset.json': (data) => this.tilesets = data,
            'npcs.json': (data) => this.npcDefinitions = Object.fromEntries(data.map(npc => [npc.id, npc])),
            'fish.json': (data) => this.fishDefinitions = data,
            'vehicle_parts.json': (data) => this.vehiclePartDefinitions = Object.fromEntries(data.map(part => [part.id, part])),
            'vehicle_templates.json': (data) => this.vehicleTemplateDefinitions = Object.fromEntries(data.map(template => [template.id, template])),
            'dynamic_event_templates.json': (data) => this.dynamicEventTemplates = Object.fromEntries(data.map(template => [template.id, template])),
            'procedural_quest_templates.json': (data) => this.proceduralQuestTemplates = Object.fromEntries(data.map(template => [template.id, template])),
            'traps.json': (data) => this.trapDefinitionsData = Array.isArray(data) ? Object.fromEntries(data.map(trap => [trap.id, trap])) : data,
            'constructions.json': (data) => this.constructionDefinitions = Object.fromEntries(data.map(def => [def.id, def])),
        };

        if (handlers[filename]) {
            if (Array.isArray(parsedJson) || (typeof parsedJson === 'object' && parsedJson !== null)) {
                handlers[filename](parsedJson);
            } else {
                console.warn(`AssetManager: Expected array or object from ${filename}, but got ${typeof parsedJson}.`);
            }
        } else { // Default item processing
            if (Array.isArray(parsedJson)) {
                parsedJson.forEach(item => {
                    if (this.itemsById[item.id]) {
                        console.warn(`AssetManager: Duplicate item ID '${item.id}' found while loading ${filename}. Overwriting previous entry.`);
                    }
                    this.itemsById[item.id] = item;
                });
            } else {
                console.warn(`AssetManager: Expected array from ${filename}, but got ${typeof parsedJson}.`);
            }
        }
    }

    _buildFamilyIndexes() {
        for (const item of Object.values(this.itemsById)) {
            if (item.family) {
                if (!this.familyItems.has(item.family)) {
                    this.familyItems.set(item.family, []);
                }
                this.familyItems.get(item.family).push(item.id);
            }
        }
        // Sort each family's item list for deterministic selection
        this.familyItems.forEach(items => items.sort());
    }

    async _loadDialogueFiles() {
        const dialogueFilesToLoad = new Set(Object.values(this.npcDefinitions).map(npc => npc.dialogueFile).filter(Boolean));
        for (const filename of dialogueFilesToLoad) {
            const url = `/assets/dialogue/${filename}?t=${Date.now()}`;
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${filename}`);
                this.dialogues[filename] = await response.json();
            } catch (error) {
                console.error(`Failed to load dialogue file ${filename}:`, error);
            }
        }
    }

    getVehiclePart(partId) { return this.vehiclePartDefinitions[partId] || null; }
    getVehicleTemplate(templateId) { return this.vehicleTemplateDefinitions[templateId] || null; }
    getDynamicEventTemplate(templateId) { return this.dynamicEventTemplates[templateId] || null; }
    getAllDynamicEventTemplates() { return this.dynamicEventTemplates; }
    getProceduralQuestTemplate(templateId) { return this.proceduralQuestTemplates[templateId] || null; }
    getAllProceduralQuestTemplates() { return this.proceduralQuestTemplates; }

    getTileset(tilesetId) {
        if (tilesetId) {
            if (this.tilesets && this.tilesets.id === tilesetId) return this.tilesets;
            return this.tilesets[tilesetId];
        }
        return this.tilesets;
    }

    getItem(itemId) {
        const item = this.itemsById[itemId];
        if (item) return item;

        const canonicalId = this.legacyAliases[itemId];
        if (canonicalId) {
            console.warn(`[Deprecation] Item ID "${itemId}" is deprecated. Using "${canonicalId}" instead.`);
            // Future enhancement: Make this a one-time warning per session.
            return this.itemsById[canonicalId] || null;
        }
        return null;
    }

    getNpc(npcId) { return this.npcDefinitions[npcId] || null; }

    getDialogue(dialogueId) {
        if (!this.dialogues[dialogueId]) {
            console.error(`Dialogue file with id '${dialogueId}' not found in assetManager.`);
            return null;
        }
        return this.dialogues[dialogueId];
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