// js/assetManager.js

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
        this.tileAliases = {
            "WW1": "WWH", "WW2": "WWV", "WW3": "WWCTL", "WW4": "WWCTR", "WW5": "WWCBL", "WW6": "WWCBR",
            "WWinC1": "WinCH", "WWinC2": "WinCV", "WD1": "WDH", "WD2": "WDV",
            "MW1": "MWH", "MW2": "MWV", "MW3": "MWCTL", "MW4": "MWCTR", "MW5": "MWCBL", "MW6": "MWCBR",
            "MD1": "MDH", "FL": "FL", "WF": "WF"
        };
        this.familyItems = new Map();
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
            console.warn("AssetManager: setMapIndexData received invalid data. Expected an array.", mapIndexJson);
            this.mapIndexData = null;
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
        this.quests = {};
        this.levelCurve = [];
        this.families = {};
        this.familyItems = new Map();
        this.legacyAliases = {};

        const definitionFiles = [
            'level_curve.json', 'tileset.json', 'water_absorption.json', 'npcs.json',
            'items/weapons.json', 'items/ammunition.json', 'items/consumables.json',
            'items/clothing.json', 'fish.json', 'items/tools.json', 'items/crafting_materials.json',
            'items/containers.json', 'items/trap_kits.json', 'items/vehicle_parts.json',
            'vehicle_templates.json', 'dynamic_event_templates.json', 'procedural_quest_templates.json',
            'items/traps.json', 'constructions.json', 'families.json', 'perks.json',
            'items/harvest_resources.json', 'loot_tables.json', 'world_graph.json', 'areas.json'
        ];

        // Parallel fetch
        const fetchPromises = definitionFiles.map(async filename => {
            const url = `/assets/definitions/${filename}`;
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${filename}`);
                const parsedJson = await response.json();
                return { filename, parsedJson };
            } catch (error) {
                console.error(`Failed to load base definition file ${filename}:`, error);
                return null;
            }
        });

        const results = await Promise.all(fetchPromises);

        for (const result of results) {
            if (!result) continue;
            const { filename, parsedJson } = result;

            if (filename === 'level_curve.json') {
                if (Array.isArray(parsedJson)) this.levelCurve = parsedJson;
            } else if (filename === 'water_absorption.json') {
                this.waterAbsorptionRules = parsedJson.mappings || [];
            } else if (filename === 'tileset.json') {
                this.tilesets = parsedJson;
                console.log("AssetManager: Base tilesets loaded:", Object.keys(this.tilesets).length);
            } else if (filename === 'npcs.json') {
                this.npcDefinitions = Object.fromEntries(parsedJson.map(npc => [npc.id, npc]));
            } else if (filename === 'fish.json') {
                this.fishDefinitions = parsedJson;
            } else if (filename === 'items/vehicle_parts.json') {
                if (Array.isArray(parsedJson)) this.vehiclePartDefinitions = Object.fromEntries(parsedJson.map(p => [p.id, p]));
            } else if (filename === 'vehicle_templates.json') {
                if (Array.isArray(parsedJson)) this.vehicleTemplateDefinitions = Object.fromEntries(parsedJson.map(t => [t.id, t]));
            } else if (filename === 'dynamic_event_templates.json') {
                if (Array.isArray(parsedJson)) this.dynamicEventTemplates = Object.fromEntries(parsedJson.map(t => [t.id, t]));
            } else if (filename === 'procedural_quest_templates.json') {
                if (Array.isArray(parsedJson)) this.proceduralQuestTemplates = Object.fromEntries(parsedJson.map(t => [t.id, t]));
            } else if (filename === 'items/traps.json') {
                if (Array.isArray(parsedJson)) {
                    this.trapDefinitionsData = Object.fromEntries(parsedJson.map(t => [t.id, t]));
                } else {
                    this.trapDefinitionsData = parsedJson;
                }
            } else if (filename === 'constructions.json') {
                if (Array.isArray(parsedJson)) this.constructionDefinitions = Object.fromEntries(parsedJson.map(d => [d.id, d]));
            } else if (filename === 'families.json') {
                this.families = parsedJson;
            } else if (filename === 'perks.json') {
                this.perks = parsedJson;
            } else if (filename === 'loot_tables.json') {
                this.lootTables = parsedJson;
            } else if (filename === 'world_graph.json') {
                this.worldGraph = parsedJson;
            } else if (filename === 'areas.json') {
                this.areas = parsedJson;
            } else if (filename.startsWith('items/')) {
                if (Array.isArray(parsedJson)) {
                    parsedJson.forEach(item => {
                        if (tempItemsById[item.id]) {
                            console.warn(`AssetManager: Duplicate item ID '${item.id}' in ${filename}. Overwriting.`);
                        }
                        tempItemsById[item.id] = item;
                    });
                }
            }
        }

        console.log("Base asset definitions loaded.");
        this.itemsById = tempItemsById;

        // Auto-generate tiles
        for (const itemId in this.itemsById) {
            const item = this.itemsById[itemId];
            if (item.sprite && !this.tilesets[itemId]) {
                this.tilesets[itemId] = {
                    sprite: item.sprite,
                    color: item.color || '#ffffff',
                    name: item.name,
                    tags: ['item', 'interactive', 'generated_from_item']
                };
                if (item.tags) {
                    item.tags.forEach(t => {
                        if (!this.tilesets[itemId].tags.includes(t)) this.tilesets[itemId].tags.push(t);
                    });
                }
            }
        }

        // Populate familyItems
        for (const itemId in this.itemsById) {
            const item = this.itemsById[itemId];
            if (item.family) {
                if (!this.familyItems.has(item.family)) this.familyItems.set(item.family, []);
                this.familyItems.get(item.family).push(item);
            }
        }

        // Load static quests
        const questsDir = '/assets/definitions/quests/';
        try {
            const indexRes = await fetch(questsDir + 'index.json');
            if (indexRes.ok) {
                const questFiles = await indexRes.json();
                if (Array.isArray(questFiles)) {
                    const questPromises = questFiles.map(async qFile => {
                        try {
                            const qRes = await fetch(questsDir + qFile);
                            if (qRes.ok) return await qRes.json();
                        } catch (e) { console.error(e); }
                        return null;
                    });
                    const questsLoaded = await Promise.all(questPromises);
                    questsLoaded.flat().forEach(quest => {
                        if (quest) {
                            if (this.quests[quest.id]) console.warn(`AssetManager: Duplicate quest ID '${quest.id}'. Overwriting.`);
                            this.quests[quest.id] = quest;
                        }
                    });
                }
            }
        } catch (e) { console.error("Error loading quests:", e); }

        // Dialogue loading
        const dialogueFilesToLoad = new Set();
        Object.values(this.npcDefinitions).forEach(def => { if (def.dialogueFile) dialogueFilesToLoad.add(def.dialogueFile); });
        dialogueFilesToLoad.add('police_find_clue_quest_give.json');

        const dialoguePromises = Array.from(dialogueFilesToLoad).map(async filename => {
            try {
                const res = await fetch(`/assets/dialogue/${filename}`);
                if (res.ok) {
                    this.dialogues[filename] = await res.json();
                }
            } catch (e) { console.error(e); }
        });
        await Promise.all(dialoguePromises);
        console.log("AssetManager: Dialogues loaded.");
    }

    getVehiclePart(partId) { return this.vehiclePartDefinitions[partId] || null; }
    getVehicleTemplate(templateId) { return this.vehicleTemplateDefinitions[templateId] || null; }
    getDynamicEventTemplate(templateId) { return this.dynamicEventTemplates[templateId] || null; }
    getAllDynamicEventTemplates() { return this.dynamicEventTemplates; }
    getProceduralQuestTemplate(templateId) { return this.proceduralQuestTemplates[templateId] || null; }
    getAllProceduralQuestTemplates() { return this.proceduralQuestTemplates; }

    getTileset(tilesetId) {
        if (tilesetId) {
            return this.tilesets[tilesetId];
        }
        return this.tilesets;
    }

    getItem(itemId) { return this.itemsById[itemId] || null; }
    getNpc(npcId) { return this.npcDefinitions[npcId] || null; }
    getDialogue(dialogueId) { return this.dialogues[dialogueId] || null; }
    getLevelCurve() { return this.levelCurve || []; }
    getFish(fishId) { return fishId ? (this.fishDefinitions[fishId] || null) : this.fishDefinitions; }

    async loadData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(response.status);
            return await response.json();
        } catch (e) {
            console.error(`Failed to load data from ${url}:`, e);
            return null;
        }
    }

    async loadMap(mapId) {
        console.log(`AssetManager.loadMap: ${mapId}`);
        // Cache Check
        if (this.mapsById[mapId]) {
            console.log(`AssetManager: Returning cached map '${mapId}'.`);
            this.currentMap = this.mapsById[mapId];
            return this.currentMap;
        }

        let mapJsonData;
        const baseMapPath = `/assets/maps/${mapId}.json`;
        try {
            const response = await fetch(baseMapPath);
            if (!response.ok) throw new Error(response.status);
            mapJsonData = await response.json();
        } catch (error) {
            console.error(`AssetManager.loadMap: Failed to load '${mapId}': ${error.message}`);
            this.currentMap = null;
            return false;
        }

        const processedMapData = { id: mapId, name: mapId };
        if (this.mapIndexData) {
            const mapInfo = this.mapIndexData.find(m => m.id === mapId);
            if (mapInfo && mapInfo.name) processedMapData.name = mapInfo.name;
        }

        // Robust dimensions check
        let width = 0;
        let height = 0;
        if (mapJsonData.levels) {
            for (const z in mapJsonData.levels) {
                const level = mapJsonData.levels[z];
                ['landscape', 'building', 'item', 'roof'].forEach(layer => {
                    if (level[layer] && Array.isArray(level[layer])) {
                        height = Math.max(height, level[layer].length);
                        if (level[layer].length > 0 && Array.isArray(level[layer][0])) {
                            width = Math.max(width, level[layer][0].length);
                        }
                    }
                });
            }
        }
        if (width === 0 && mapJsonData.width) width = mapJsonData.width;
        if (height === 0 && mapJsonData.height) height = mapJsonData.height;

        processedMapData.dimensions = { width, height };
        processedMapData.levels = mapJsonData.levels || {};
        processedMapData.startPos = mapJsonData.startPos || { x: 0, y: 0, z: 0 };

        const normalizeZ = (item) => {
            if (!item.z && item.z !== 0) item.z = 0;
            return item;
        };

        processedMapData.portals = (mapJsonData.portals || []).map(normalizeZ);
        processedMapData.traps = (mapJsonData.traps || []).map(normalizeZ);
        processedMapData.container_instances = (mapJsonData.container_instances || []).map(normalizeZ);

        processedMapData.npcs = (mapJsonData.npcs || []).map(npc => {
            const positionData = npc.mapPos || npc.pos || { x: 0, y: 0, z: 0 };
            const finalNpc = {
                ...npc,
                pos: {
                    x: positionData.x !== undefined ? positionData.x : 0,
                    y: positionData.y !== undefined ? positionData.y : 0,
                    z: positionData.z !== undefined ? positionData.z : 0
                }
            };
            // Preserve mapPos
            finalNpc.mapPos = { ...finalNpc.pos };
            return finalNpc;
        });

        processedMapData.tileset = mapJsonData.tileset || null;

        this.currentMap = processedMapData;
        this.mapsById[mapId] = processedMapData;

        this._validateMapTiles(this.currentMap);
        console.log(`Map '${mapId}' processed and cached.`);
        return processedMapData;
    }

    _validateMapTiles(mapData) {
        if (!mapData || !mapData.levels) return;
        for (const z in mapData.levels) {
            const level = mapData.levels[z];
            ['landscape', 'building', 'item', 'roof'].forEach(layerName => {
                const layer = level[layerName];
                if (Array.isArray(layer)) {
                    layer.forEach((row, r) => {
                        if (Array.isArray(row)) {
                            row.forEach((tileData, c) => {
                                const tileId = (typeof tileData === 'object' && tileData?.tileId) ? tileData.tileId : tileData;
                                if (tileId && tileId !== "" && !this.getTileDefinition(tileId)) {
                                    console.warn(`Unknown tile ID: '${tileId}' in map '${mapData.id}' at [${r},${c},${z}]`);
                                }
                            });
                        }
                    });
                }
            });
        }
    }

    findItemsByTag(tag) {
        if (!tag) return [];
        const lowerCaseTag = tag.toLowerCase();
        return Object.values(this.itemsById).filter(item => item.tags && item.tags.some(t => t.toLowerCase() === lowerCaseTag));
    }

    findItemsByFamily(family) {
        return this.familyItems.get(family) || [];
    }

    findNpcsByTag(tag) {
        if (!tag) return [];
        const lowerCaseTag = tag.toLowerCase();
        return Object.values(this.npcDefinitions).filter(npc => npc.tags && npc.tags.some(t => t.toLowerCase() === lowerCaseTag));
    }

    findAssets(queryText, assetTypes) {
        const results = [];
        if (!queryText) return results;
        const lower = queryText.toLowerCase();
        const types = new Set((assetTypes || []).map(t => t.toLowerCase()));
        const searchAll = types.size === 0;

        if (searchAll || types.has('item')) {
            Object.values(this.itemsById).forEach(item => {
                if (item.name?.toLowerCase().includes(lower) || item.id?.toLowerCase().includes(lower) || item.tags?.some(t => t.toLowerCase().includes(lower))) {
                    results.push(item);
                }
            });
        }
        if (searchAll || types.has('npc')) {
            Object.values(this.npcDefinitions).forEach(npc => {
                if (npc.name?.toLowerCase().includes(lower) || npc.id?.toLowerCase().includes(lower) || npc.tags?.some(t => t.toLowerCase().includes(lower))) {
                    results.push(npc);
                }
            });
        }
        return results;
    }
}
