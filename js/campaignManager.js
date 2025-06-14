class CampaignManager {
    constructor() {
        this.campaignsPath = 'campaigns/'; // Base path for campaigns
        this.activeCampaignId = null;
        this.activeCampaignManifest = null;
        this.activeCampaignZones = null; // New property
        this.activeCampaignWorldMap = null; // New property
        this.activeCampaignRandomEncounters = null; // New
        this.activeCampaignNpcs = null; // New: Will store a Map of NPCs by ID
        this.activeCampaignDialogues = new Map();
        this.activeCampaignSchedules = null;
        this.activeCampaignQuests = null;
        this.campaignCache = new Map(); // To cache loaded campaign manifests
        this.campaignRegistry = new Map(); // Added
        this.baseNpcTemplates = new Map(); // ADDED
        this.activeCampaignBasePath = null; // Added

        this.loadBaseNpcTemplates(); // Call new method
    }

    deepMergeNpcData(template, override) {
        const merged = { ...template }; // Start with a shallow copy of template

        for (const key in override) {
            if (override.hasOwnProperty(key)) {
                if (override[key] instanceof Object && key in template && template[key] instanceof Object && !(override[key] instanceof Array)) {
                    // Deep merge for nested objects (excluding arrays)
                    merged[key] = this.deepMergeNpcData(template[key], override[key]);
                } else if (key === 'tags' && Array.isArray(template.tags) && Array.isArray(override.tags)) {
                    // Concatenate tags and remove duplicates
                    merged[key] = [...new Set([...template.tags, ...override.tags])];
                } else if (key === 'tags' && Array.isArray(override.tags) && override.tags.length === 0) {
                    // If override provides an empty tags array, it clears template tags
                    merged[key] = [];
                }
                // For other types or if template doesn't have the key as an object, override takes precedence
                else {
                    merged[key] = override[key];
                }
            }
        }
        // Ensure the final ID is from the override (campaign-specific NPC entry)
        if (override.id) {
            merged.id = override.id;
        }
        return merged;
    }

    async loadBaseNpcTemplates() {
        const templatesPath = 'assets/definitions/base_npc_templates.json';
        try {
            const response = await fetch(templatesPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch base NPC templates: ${response.statusText} from ${templatesPath}`);
            }
            const templatesArray = await response.json();
            templatesArray.forEach(template => {
                if (template.templateId) {
                    this.baseNpcTemplates.set(template.templateId, template);
                }
            });
            console.log(`Base NPC templates loaded successfully. ${this.baseNpcTemplates.size} templates available.`);
        } catch (error) {
            console.error("Error loading base NPC templates:", error);
            // Decide if this is a fatal error or if the game can proceed without templates
        }
    }

    async listAvailableCampaigns() {
        const indexPath = 'campaigns/campaign_index.json'; // Relative to web root
        try {
            const response = await fetch(indexPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch campaign index: ${response.statusText}`);
            }
            const indexData = await response.json();
            const campaigns = indexData.availableCampaigns || [];
            campaigns.forEach(campaign => {
                this.campaignRegistry.set(campaign.id, campaign);
            });
            return campaigns;
        } catch (error) {
            console.error("Error loading campaign index:", error);
            return []; // Return empty array on error
        }
    }

    async loadCampaignManifest(campaignId) {
        if (this.campaignCache.has(campaignId)) {
            return this.campaignCache.get(campaignId);
        }

        const campaignData = this.campaignRegistry.get(campaignId);
        if (!campaignData || !campaignData.manifestPath) {
            const errorMsg = `Campaign data or manifestPath not found in registry for ID: ${campaignId}`;
            console.error(errorMsg);
            throw new Error(errorMsg); // Or return null if you prefer to handle it that way
        }

        const actualManifestPath = `${this.campaignsPath}${campaignData.manifestPath}`;
        try {
            const response = await fetch(actualManifestPath);
            if (!response.ok) {
                throw new Error(`Failed to load campaign manifest for ${campaignId} from ${actualManifestPath}: ${response.statusText}`);
            }
            const manifest = await response.json();
            this.campaignCache.set(campaignId, manifest);
            console.log(`Campaign manifest for '${campaignId}' loaded successfully from ${actualManifestPath}.`);
            return manifest;
        } catch (error) {
            console.error(`Error loading campaign manifest for ${campaignId} from ${actualManifestPath}:`, error);
            return null;
        }
    }

    async loadZoneData() {
        if (!this.activeCampaignManifest || !this.activeCampaignManifest.worldZones) {
            console.warn("No world zones file specified in campaign manifest or no active campaign.");
            this.activeCampaignZones = null;
            return;
        }

        const zoneFilePath = this.getCampaignAssetPath(this.activeCampaignManifest.worldZones);
        if (!zoneFilePath) return; // Should not happen if manifest is loaded

        try {
            const response = await fetch(zoneFilePath);
            if (!response.ok) {
                throw new Error(`Failed to load zone data: ${response.statusText}`);
            }
            this.activeCampaignZones = await response.json();
            console.log(`Zone data for '${this.activeCampaignId}' loaded successfully.`);
        } catch (error) {
            console.error(`Error loading zone data for '${this.activeCampaignId}':`, error);
            this.activeCampaignZones = null;
        }
    }

    async activateCampaign(campaignId) {
        if (this.activeCampaignId === campaignId && this.activeCampaignManifest) {
            console.warn(`Campaign '${campaignId}' is already active.`);
            return true;
        }

        // Clear previous campaign data
        this.deactivateCurrentCampaign(); // Ensures all data is reset

        const manifest = await this.loadCampaignManifest(campaignId);
        if (manifest) {
            this.activeCampaignId = campaignId;
            this.activeCampaignManifest = manifest;

            const campaignData = this.campaignRegistry.get(campaignId);
            if (campaignData && campaignData.manifestPath) {
                this.activeCampaignBasePath = campaignData.manifestPath.substring(0, campaignData.manifestPath.lastIndexOf('/') + 1);
            } else {
                // Should not happen if manifest loaded, but as a fallback:
                console.warn(`Could not determine base path for campaign ${campaignId}. Asset loading might be affected.`);
                this.activeCampaignBasePath = `${campaignId}/`; // Fallback, less ideal
            }
            console.log(`Campaign '${campaignId}' activated with base path '${this.activeCampaignBasePath}'.`);

            await this.loadZoneData(); // Load zone data
            await this.loadWorldMapData(); // Load world map data
            await this.loadRandomEncounterData(); // New call
            await this.loadNpcData(); // New call
            // await this.loadAllDialogueFiles(); // REMOVED - Dialogues are now lazy-loaded
            await this.loadScheduleData(); // New call
            await this.loadQuestData(); // New call

            console.log(`All data for campaign '${campaignId}' loaded successfully.`);
            window.dispatchEvent(new CustomEvent('campaignFullyLoaded', { detail: { campaignId: this.activeCampaignId } }));
            return true;
        }
        console.error(`Failed to activate campaign '${campaignId}'. Manifest could not be loaded.`);
        return false;
    }

    deactivateCurrentCampaign() {
        if (this.activeCampaignId) {
            console.log(`Deactivating campaign '${this.activeCampaignId}'.`);
            this.activeCampaignId = null;
            this.activeCampaignManifest = null;
            this.activeCampaignZones = null; // Clear zone data
            this.activeCampaignWorldMap = null; // Clear world map data
            this.activeCampaignRandomEncounters = null; // New
            this.activeCampaignNpcs = null;
            this.activeCampaignDialogues = new Map();
            this.activeCampaignSchedules = null;
            this.activeCampaignQuests = null;
            this.activeCampaignBasePath = null; // Reset base path
            // TODO: Add hooks or events
        }
    }

    getQuestData(questId) {
        return this.activeCampaignQuests ? this.activeCampaignQuests[questId] : null;
    }

    getScheduleData(scheduleId) {
        if (!this.activeCampaignSchedules) {
            return null;
        }
        return this.activeCampaignSchedules.get(scheduleId);
    }

    async getDialogueData(dialoguePath) {
        if (!dialoguePath) {
            console.error("getDialogueData called with null or empty dialoguePath.");
            return null;
        }

        // Try to derive an ID from path for cache checking (e.g., "dialogue/a/b.json" -> "b")
        const pathParts = dialoguePath.split('/');
        const fileName = pathParts.pop(); // Get filename.json
        const expectedDialogueId = fileName ? fileName.replace('.json', '') : null;

        if (expectedDialogueId && this.activeCampaignDialogues.has(expectedDialogueId)) {
            console.log(`CACHE_HIT: Dialogue '${expectedDialogueId}' (Path: ${dialoguePath}) found in cache.`);
            return this.activeCampaignDialogues.get(expectedDialogueId);
        }
        // Additionally, check if the path itself was used as a key (less ideal, but for robustness during transition)
        if (this.activeCampaignDialogues.has(dialoguePath)) {
            console.log(`CACHE_HIT: Dialogue '${dialoguePath}' (Path: ${dialoguePath}) found in cache (using path as key).`);
            return this.activeCampaignDialogues.get(dialoguePath);
        }

        const actualFilePath = this.getCampaignAssetPath(dialoguePath);
        if (!actualFilePath) {
            console.error(`Could not resolve campaign asset path for dialogue: ${dialoguePath}`);
            return null;
        }

        try {
            // console.log(`Fetching dialogue from: ${actualFilePath} (original path: ${dialoguePath})`);
            const response = await fetch(actualFilePath);
            if (!response.ok) {
                console.error(`FILE_LOAD_ERROR: Error loading dialogue file ${dialoguePath} (Resolved: ${actualFilePath}): ${response.statusText}`);
                return null;
            }
            const dialogueData = await response.json();

            if (dialogueData && dialogueData.id) {
                // Cache using the internal ID from the dialogue content
                this.activeCampaignDialogues.set(dialogueData.id, dialogueData);
                console.log(`FILE_LOAD: Dialogue '${dialogueData.id}' (Path: ${dialoguePath}, Resolved: ${actualFilePath}) loaded from file and cached.`);
                return dialogueData;
            } else {
                console.error(`DATA_ERROR: Dialogue file ${dialoguePath} (Resolved: ${actualFilePath}) is missing an internal 'id' field or data is invalid.`);
                return null;
            }
        } catch (error) {
            console.error(`Exception while fetching or parsing dialogue ${dialoguePath} (Resolved: ${actualFilePath}):`, error);
            return null;
        }
    }

    getActiveCampaignNpcs() { // Returns the Map of all NPCs
        return this.activeCampaignNpcs;
    }

    getNpcData(npcId) { // Returns a specific NPC object by ID
        if (!this.activeCampaignNpcs) {
            return null;
        }
        const npc = this.activeCampaignNpcs.get(npcId);
        // Inside getNpcData(npcId), before returning npc
        if (npc && (npc.id === 'fpd_nisleit' || npc.id === 'con_grayson' || npc.id === 'fallbrook_test_civilian')) {
            console.log(`TEST_NPC_DATA_RETRIEVAL for ${npc.id}: ${JSON.stringify(npc, null, 2)}`);
        }
        return npc;
    }

    getActiveCampaignRandomEncounters() {
        return this.activeCampaignRandomEncounters;
    }

    getActiveCampaignWorldMap() {
        return this.activeCampaignWorldMap;
    }

    getActiveCampaignZones() {
        return this.activeCampaignZones;
    }

    getActiveCampaignId() {
        return this.activeCampaignId;
    }

    getActiveCampaignManifest() {
        return this.activeCampaignManifest;
    }

    getCampaignAssetPath(assetRelativePath) {
        if (!this.activeCampaignId || this.activeCampaignBasePath === null) {
            console.warn('No active campaign or base path to get asset path from. ActiveCampaignID:', this.activeCampaignId, "Base Path:", this.activeCampaignBasePath);
            return null;
        }
        // Ensure assetRelativePath doesn't start with a slash if activeCampaignBasePath already ends with one.
        // And ensure there's exactly one slash between them.
        let path = `${this.campaignsPath}${this.activeCampaignBasePath}${assetRelativePath}`;
        // Simple normalization: replace // with / but not for protocol (http://)
        path = path.replace(/(?<!:)\/\//g, '/');
        return path;
    }

    async loadWorldMapData() {
        if (!this.activeCampaignManifest || !this.activeCampaignManifest.worldMap) {
            console.warn("No world map file specified in campaign manifest or no active campaign.");
            this.activeCampaignWorldMap = null;
            return;
        }

        const worldMapPath = this.getCampaignAssetPath(this.activeCampaignManifest.worldMap);
        if (!worldMapPath) return;

        try {
            const response = await fetch(worldMapPath);
            if (!response.ok) {
                throw new Error(`Failed to load world map data: ${response.statusText}`);
            }
            this.activeCampaignWorldMap = await response.json();
            console.log(`World map data for '${this.activeCampaignId}' loaded successfully.`);
        } catch (error) {
            console.error(`Error loading world map data for '${this.activeCampaignId}':`, error);
            this.activeCampaignWorldMap = null;
        }
    }

    async loadRandomEncounterData() {
        if (!this.activeCampaignManifest || !this.activeCampaignManifest.randomEncounters) {
            console.warn("No random encounters file specified in campaign manifest.");
            this.activeCampaignRandomEncounters = null;
            return;
        }
        const filePath = this.getCampaignAssetPath(this.activeCampaignManifest.randomEncounters);
        if (!filePath) {
            this.activeCampaignNpcs = new Map();
            return;
        }

        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load random encounter data: ${response.statusText}`);
            }
            this.activeCampaignRandomEncounters = await response.json();
            console.log(`Random encounter data for '${this.activeCampaignId}' loaded.`);
        } catch (error) {
            console.error(`Error loading random encounter data for '${this.activeCampaignId}':`, error);
            this.activeCampaignRandomEncounters = null;
        }
    }

    async loadNpcData() {
        if (!this.activeCampaignManifest || !this.activeCampaignManifest.npcs) {
            console.warn("No NPCs file specified in campaign manifest.");
            this.activeCampaignNpcs = new Map(); // Initialize as empty map
            return;
        }
        const filePath = this.getCampaignAssetPath(this.activeCampaignManifest.npcs);
        if (!filePath) return;

        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load NPC data: ${response.statusText}`);
            }
            const npcArray = await response.json();
            const tempNpcMap = new Map(); // Use a temporary map for processing

            for (const npcEntry of npcArray) {
                let finalNpcData = npcEntry; // Start with the entry from campaign's npcs.json

                if (npcEntry.templateId && this.baseNpcTemplates.has(npcEntry.templateId)) {
                    const template = this.baseNpcTemplates.get(npcEntry.templateId);
                    // Perform a deep merge. The ID from npcEntry should always take precedence.
                    finalNpcData = this.deepMergeNpcData(JSON.parse(JSON.stringify(template)), npcEntry); // Pass deep copy of template
                    console.log(`NPC '${npcEntry.id}' composed from template '${npcEntry.templateId}'.`);
                } else if (npcEntry.templateId) {
                    console.warn(`NPC '${npcEntry.id}' specified template '${npcEntry.templateId}', but template was not found. Using NPC data as defined in campaign file.`);
                }

                // Inside loadNpcData, after 'finalNpcData' is determined
                // and before tempNpcMap.set(finalNpcData.id, finalNpcData);
                if (finalNpcData.id === "fpd_nisleit" || finalNpcData.id === "con_grayson") {
                    console.log(`VERIFY_TEMPLATE_NPC_ID: ${finalNpcData.id}, Template Used: ${npcEntry.templateId || 'None'}`);
                    console.log(`VERIFY_TEMPLATE_NPC_NAME: ${finalNpcData.name}`);
                    console.log(`VERIFY_TEMPLATE_NPC_STATS: ${JSON.stringify(finalNpcData.stats)}`);
                    console.log(`VERIFY_TEMPLATE_NPC_SKILLS: ${JSON.stringify(finalNpcData.skills)}`);
                    console.log(`VERIFY_TEMPLATE_NPC_HEALTH: ${JSON.stringify(finalNpcData.health)}`);
                    console.log(`VERIFY_TEMPLATE_NPC_TAGS: ${JSON.stringify(finalNpcData.tags)}`);
                    console.log(`VERIFY_TEMPLATE_NPC_ACTION_POINTS: ${finalNpcData.defaultActionPoints}`);
                    console.log(`VERIFY_TEMPLATE_NPC_MOVEMENT_POINTS: ${finalNpcData.defaultMovementPoints}`);
                }

                if (finalNpcData.id) { // Ensure there's an ID to use as a key
                   tempNpcMap.set(finalNpcData.id, finalNpcData);
                } else {
                    console.error("NPC entry missing 'id'. Cannot load this NPC:", finalNpcData);
                }
            }
            this.activeCampaignNpcs = tempNpcMap; // Assign the fully processed map
            console.log(`NPC data for '${this.activeCampaignId}' loaded. Total NPCs: ${this.activeCampaignNpcs.size}.`);

        } catch (error) {
            console.error(`Error loading NPC data for '${this.activeCampaignId}':`, error);
            this.activeCampaignNpcs = new Map();
        }
    }

    // Removed loadAllDialogueFiles() method

    async loadScheduleData() {
        if (!this.activeCampaignManifest || !this.activeCampaignManifest.schedules) {
            console.warn("No schedules file specified in campaign manifest.");
            this.activeCampaignSchedules = new Map();
            return;
        }
        const filePath = this.getCampaignAssetPath(this.activeCampaignManifest.schedules);
        if (!filePath) {
            this.activeCampaignSchedules = new Map(); // Ensure it's initialized
            return;
        }

        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`Failed to load schedule data: ${response.statusText}`);
            const scheduleFileContent = await response.json();
            if (scheduleFileContent && scheduleFileContent.schedules) {
                this.activeCampaignSchedules = new Map(scheduleFileContent.schedules.map(s => [s.id, s]));
                console.log(`Schedule data for '${this.activeCampaignId}' loaded.`);
            } else {
                console.error("Schedule file is not in the expected format (missing 'schedules' array).");
                this.activeCampaignSchedules = new Map();
            }
        } catch (error) {
            console.error(`Error loading schedule data for '${this.activeCampaignId}':`, error);
            this.activeCampaignSchedules = new Map();
        }
    }

    async loadQuestData() {
        if (!this.activeCampaignManifest || !this.activeCampaignManifest.quests) {
            console.warn("No quests file specified in campaign manifest.");
            this.activeCampaignQuests = {}; // Initialize as empty object
            return;
        }
        const filePath = this.getCampaignAssetPath(this.activeCampaignManifest.quests);
        if (!filePath) {
            this.activeCampaignQuests = {}; // Ensure it's initialized
            return;
        }

        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`Failed to load quest data: ${response.statusText}`);
            const questFileContent = await response.json();
            this.activeCampaignQuests = questFileContent.quests || {};
            console.log(`Quest data for '${this.activeCampaignId}' loaded.`);
        } catch (error) {
            console.error(`Error loading quest data for '${this.activeCampaignId}':`, error);
            this.activeCampaignQuests = {};
        }
    }

    getSaveData() {
        return {
            activeCampaignId: this.activeCampaignId
        };
    }

    loadSaveData(data) {
        if (data && data.activeCampaignId) {
            this.activeCampaignId = data.activeCampaignId;
            console.log(`CampaignManager: Restored activeCampaignId to '${this.activeCampaignId}'. Activation will be handled by game initialization logic.`);
        } else {
            this.activeCampaignId = null;
        }
    }
}

// Make it a singleton or provide a global instance
window.campaignManager = new CampaignManager();
// If using modules, export it:
// export default campaignManager;
// For now, let's assume it's available globally for simplicity in a non-module script environment
