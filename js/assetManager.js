class AssetManager {
    constructor() {
        this.tilesets = {};
        this.itemsById = {};
        this.npcsById = {};
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
        this.tilesets = {};
        this.itemsById = {};
        this.npcsById = {};
        let tempItemsById = {};

        const definitionFiles = ['tileset.json', 'items.json', 'npcs.json', 'clothing.json']; // Added clothing.json

        for (const filename of definitionFiles) {
            const url = `/assets/definitions/${filename}?t=${Date.now()}`;
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} for ${filename}`);
                }
                const parsedJson = await response.json();

                if (filename === 'tileset.json') {
                    this.tilesets = parsedJson;
                } else if (filename === 'items.json') {
                    parsedJson.forEach(item => { tempItemsById[item.id] = item; });
                } else if (filename === 'npcs.json') {
                    this.npcsById = Object.fromEntries(parsedJson.map(npc => [npc.id, npc]));
                } else if (filename === 'clothing.json') {
                    if (Array.isArray(parsedJson)) {
                        parsedJson.forEach(item => { tempItemsById[item.id] = item; });
                    } else {
                        console.warn(`AssetManager: clothing.json for ${filename} was not an array. Skipping merge.`);
                    }
                }
                // Extend for other definition files as they are added
            } catch (error) {
                console.error(`Failed to load base definition file ${filename}:`, error);
            }
        }
        console.log("Base asset definitions loaded.");

        // Load user definitions (override/extend base definitions)
        console.log("Attempting to load user-generated definitions...");
        const userDefinitionFiles = ['tileset.json', 'items.json', 'npcs.json', 'clothing.json']; // Added clothing.json

        for (const filename of userDefinitionFiles) {
            const url = `/user_assets/definitions/${filename}?t=${Date.now()}`;
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    if (response.status === 404) {
                        console.log(`User definition file ${filename} not found, skipping.`);
                    } else {
                        throw new Error(`HTTP error! status: ${response.status} for user definition ${filename}`);
                    }
                    continue; // Skip to next file
                }
                const parsedJson = await response.json();
                console.log(`Successfully loaded user definition file ${filename}.`);

                if (filename === 'tileset.json') {
                    this.tilesets = parsedJson; // User tileset replaces base
                    console.log("User tileset.json loaded, replacing base tileset.");
                } else if (filename === 'items.json') {
                    if (Array.isArray(parsedJson)) {
                        parsedJson.forEach(item => { tempItemsById[item.id] = item; });
                        console.log("User items.json loaded, items merged/overridden.");
                    } else {
                        console.warn(`User items.json for ${filename} was not an array. Skipping merge.`);
                    }
                } else if (filename === 'npcs.json') {
                    if (Array.isArray(parsedJson)) {
                        parsedJson.forEach(npc => {
                            if (this.npcsById[npc.id]) {
                                console.warn(`AssetManager: User NPC ID ${npc.id} from npcs.json already exists. Overwriting.`);
                            }
                            this.npcsById[npc.id] = npc; // Add/override NPCs
                        });
                        console.log("User npcs.json loaded, NPCs merged/overridden.");
                    } else {
                        console.warn(`User npcs.json for ${filename} was not an array. Skipping merge.`);
                    }
                } else if (filename === 'clothing.json') {
                    if (Array.isArray(parsedJson)) {
                        parsedJson.forEach(item => { tempItemsById[item.id] = item; });
                        console.log("User clothing.json loaded, items merged/overridden into itemsById.");
                    } else {
                        console.warn(`User clothing.json for ${filename} was not an array. Skipping merge.`);
                    }
                }
                // Extend for other definition files as they are added
            } catch (error) {
                console.error(`Failed to load or process user definition file ${filename}:`, error);
            }
        }
        this.itemsById = tempItemsById;
        console.log("User-generated content definition loading complete.");
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
        return this.npcsById[npcId] || null;
    }

    async loadMap(mapId) {
        console.log(`AssetManager.loadMap: Called with mapId = "${mapId}" (Type: ${typeof mapId})`);
        let mapJsonData;
        let loadedFromPath = '';

        // Try fetching from user assets first
        const userMapPath = `/user_assets/maps/${mapId}.json?t=${Date.now()}`;
        console.log(`AssetManager.loadMap: Attempting to load user map from: ${userMapPath}`);
        try {
            const response = await fetch(userMapPath);
            if (response.ok) {
                mapJsonData = await response.json();
                loadedFromPath = userMapPath;
                console.log(`AssetManager.loadMap: User map '${mapId}' data fetched successfully from ${userMapPath}.`);
            } else if (response.status !== 404) {
                // Create an error object that includes the response status if possible
                const error = new Error(`HTTP error! status: ${response.status} for user map ${mapId} at ${userMapPath}`);
                error.response = response; // Attach response for more details in catch
                throw error;
            }
            // If 404, mapJsonData remains undefined, proceed to base path
        } catch (error) {
            console.log(`AssetManager.loadMap: User map not loaded or failed. Error: ${error.message}. Falling back to base map.`);
            // No need to re-throw, just proceed to base map loading
        }

        // Fallback to base assets if user map not found or failed to load
        if (!mapJsonData) {
            const baseMapPath = `/Maps/${mapId}.json?t=${Date.now()}`;
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

        let width = mapJsonData.width;
        let height = mapJsonData.height;

        // Infer dimensions from landscape layer if not directly available
        if ((width === undefined || height === undefined) && mapJsonData.layers && mapJsonData.layers.landscape) {
            const landscapeLayer = mapJsonData.layers.landscape;
            if (Array.isArray(landscapeLayer) && landscapeLayer.length > 0 && Array.isArray(landscapeLayer[0])) {
                height = landscapeLayer.length;
                width = landscapeLayer[0].length;
                console.log(`Map dimensions for '${mapId}' inferred from landscape layer: ${width}x${height}`);
            } else {
                console.warn(`Map dimensions could not be inferred from landscape layer for map '${mapId}'. Using 0x0.`);
                width = 0;
                height = 0;
            }
        } else if (width === undefined || height === undefined) {
            // This case handles if mapJsonData.layers or mapJsonData.layers.landscape is missing when width/height are missing
            console.warn(`Map dimensions (width/height) missing for map '${mapId}' and could not be inferred. Using 0x0.`);
            width = 0;
            height = 0;
        }

        processedMapData.dimensions = { width, height };
        processedMapData.layers = mapJsonData.layers || {}; // Ensure layers object exists
        processedMapData.portals = mapJsonData.portals || [];
        processedMapData.npcs = mapJsonData.npcs || [];
        processedMapData.container_instances = mapJsonData.container_instances || [];
        processedMapData.tileset = mapJsonData.tileset || null; // Or a default tileset ID

        this.currentMap = processedMapData;
        this.mapsById[mapId] = processedMapData; // Cache the processed map

        this._validateMapTiles(this.currentMap);

        console.log(`Map '${mapId}' processed and loaded successfully from ${loadedFromPath}. Name: ${processedMapData.name}`);
        return processedMapData; // Return processed map data
    }

    _validateMapTiles(mapData) {
        if (!mapData || !mapData.id || !mapData.layers) { // Added mapData.id check for better warning
            console.warn(`Invalid map data for validation: ${mapData ? mapData.id : 'unknown map'}`);
            return;
        }

        // Assuming this.tilesets is the direct content of 'tileset.json'
        // and it contains tile definitions where keys are tile IDs.
        // const availableTileIds = Object.keys(this.tilesets); // No longer needed directly here

        for (const layerName in mapData.layers) {
            if (mapData.layers.hasOwnProperty(layerName)) {
                const layer = mapData.layers[layerName];
                if (Array.isArray(layer)) {
                    for (let r = 0; r < layer.length; r++) {
                        const row = layer[r];
                        if (Array.isArray(row)) {
                            for (let c = 0; c < row.length; c++) {
                                const tileId = row[c];
                                // Check if tileId is defined, not null, not an empty string,
                                // and not resolvable via getTileDefinition (which checks direct and aliases)
                                if (tileId !== null && tileId !== "" && !this.getTileDefinition(tileId)) {
                                    console.warn(`Unknown tile ID: '${tileId}' in map '${mapData.id}', layer '${layerName}', at [${r},${c}] (after alias check)`);
                                }
                            }
                        }
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
        for (const npcId in this.npcsById) {
            if (this.npcsById.hasOwnProperty(npcId)) {
                const npc = this.npcsById[npcId];
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
            for (const npcId in this.npcsById) {
                if (this.npcsById.hasOwnProperty(npcId)) {
                    const npc = this.npcsById[npcId];
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