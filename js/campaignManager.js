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
    }

    async listAvailableCampaigns() {
        const indexPath = 'campaigns/campaign_index.json'; // Relative to web root
        try {
            const response = await fetch(indexPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch campaign index: ${response.statusText}`);
            }
            const indexData = await response.json();
            return indexData.availableCampaigns || [];
        } catch (error) {
            console.error("Error loading campaign index:", error);
            return []; // Return empty array on error
        }
    }

    async loadCampaignManifest(campaignId) {
        if (this.campaignCache.has(campaignId)) {
            return this.campaignCache.get(campaignId);
        }

        const manifestPath = `${this.campaignsPath}${campaignId}/campaign.json`;
        try {
            const response = await fetch(manifestPath);
            if (!response.ok) {
                throw new Error(`Failed to load campaign manifest for ${campaignId}: ${response.statusText}`);
            }
            const manifest = await response.json();
            this.campaignCache.set(campaignId, manifest);
            console.log(`Campaign manifest for '${campaignId}' loaded successfully.`);
            return manifest;
        } catch (error) {
            console.error(`Error loading campaign manifest for ${campaignId}:`, error);
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
            console.log(`Campaign '${campaignId}' activated.`);

            await this.loadZoneData(); // Load zone data
            await this.loadWorldMapData(); // Load world map data
            await this.loadRandomEncounterData(); // New call
            await this.loadNpcData(); // New call
            await this.loadAllDialogueFiles(); // New call
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

    getDialogueData(dialogueId) {
        if (!this.activeCampaignDialogues) {
            return null;
        }
        return this.activeCampaignDialogues.get(dialogueId);
    }

    getActiveCampaignNpcs() { // Returns the Map of all NPCs
        return this.activeCampaignNpcs;
    }

    getNpcData(npcId) { // Returns a specific NPC object by ID
        if (!this.activeCampaignNpcs) {
            return null;
        }
        return this.activeCampaignNpcs.get(npcId);
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
        if (!this.activeCampaignId) {
            console.warn('No active campaign to get asset path from.');
            return null;
        }
        return `${this.campaignsPath}${this.activeCampaignId}/${assetRelativePath}`;
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
        if (!filePath) return;

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
            this.activeCampaignNpcs = new Map(npcArray.map(npc => [npc.id, npc]));
            console.log(`NPC data for '${this.activeCampaignId}' loaded and mapped.`);
        } catch (error) {
            console.error(`Error loading NPC data for '${this.activeCampaignId}':`, error);
            this.activeCampaignNpcs = new Map(); // Initialize as empty map on error
        }
    }

    async loadAllDialogueFiles() {
        this.activeCampaignDialogues = new Map();
        if (!this.activeCampaignManifest) { // Removed NPC check, can load dialogues even if no NPCs yet
            console.warn("Cannot load dialogue files: No active campaign or manifest.");
            return;
        }

        // Load dialogues specified in NPC data
        if (this.activeCampaignNpcs) {
            for (const npc of this.activeCampaignNpcs.values()) {
                if (npc.dialogueId && !this.activeCampaignDialogues.has(npc.dialogueId)) {
                    // Assuming npc.dialogueId is like "dialogue/folder/file.json"
                    // and getCampaignAssetPath handles prepending "campaigns/{campaignId}/"
                    const dialogueFilePath = this.getCampaignAssetPath(npc.dialogueId);
                    if (!dialogueFilePath) continue;

                    try {
                        const response = await fetch(dialogueFilePath);
                        if (!response.ok) {
                            throw new Error(`Failed to load dialogue file ${npc.dialogueId}: ${response.statusText}`);
                        }
                        const dialogueData = await response.json();
                        // Use the ID from within the dialogue file as the key
                        if (dialogueData.id) {
                           this.activeCampaignDialogues.set(dialogueData.id, dialogueData);
                           console.log(`Dialogue '${dialogueData.id}' for NPC '${npc.id}' loaded successfully.`);
                        } else {
                           console.warn(`Dialogue file ${npc.dialogueId} is missing an 'id' field.`);
                        }
                    } catch (error) {
                        console.error(`Error loading dialogue file ${npc.dialogueId}:`, error);
                    }
                }
            }
        }

        // Load dialogues specified in random encounters
        if (this.activeCampaignRandomEncounters && this.activeCampaignRandomEncounters.specificEncounters) {
            for (const encounterKey in this.activeCampaignRandomEncounters.specificEncounters) {
                const encounter = this.activeCampaignRandomEncounters.specificEncounters[encounterKey];
                // Corrected path to dialogueId in encounter structure
                if (encounter.dialogue && typeof encounter.dialogue === 'string' && !this.activeCampaignDialogues.has(encounter.dialogue)) {
                     const dialoguePath = encounter.dialogue; // e.g., "dialogue/merchants/traveling_road_merchant_01.json"
                     const dialogueFilePath = this.getCampaignAssetPath(dialoguePath);
                     if (!dialogueFilePath) continue;

                     try {
                        const response = await fetch(dialogueFilePath);
                        if (!response.ok) {
                            throw new Error (`Failed to load dialogue file ${dialoguePath}: ${response.statusText}`);
                        }
                        const dialogueData = await response.json();
                        if (dialogueData.id) {
                            this.activeCampaignDialogues.set(dialogueData.id, dialogueData);
                            console.log(`Dialogue '${dialogueData.id}' for encounter '${encounterKey}' loaded successfully.`);
                        } else {
                           console.warn(`Dialogue file ${dialoguePath} for encounter '${encounterKey}' is missing an 'id' field.`);
                        }
                     } catch (error) {
                        console.error(`Error loading dialogue ${dialoguePath} for encounter '${encounterKey}':`, error);
                     }
                }
            }
        }
        // Manually load the two specific sample files if they weren't picked up via NPCs/encounters
        // This is a fallback/explicit load for the specified files in the task.
        const manualDialoguesToLoad = [
            "dialogue/aelric_default_dialogue.json",
            "dialogue/merchant_generic_greeting.json"
        ];

        for (const dialoguePath of manualDialoguesToLoad) {
            const dialogueAssetPath = this.getCampaignAssetPath(dialoguePath);
            if (!dialogueAssetPath) continue;

            // Check if already loaded to avoid errors or redundant fetches
            // We need to derive the internal ID or fetch then check. For now, let's fetch and check ID.
            // This isn't perfectly efficient as we might fetch twice if an NPC uses it.
            // A better way would be to get the internal ID first if the file is known.
            // For now, this ensures they are loaded if not referenced by an NPC that got processed.

            let potentialIdToTest = dialoguePath.split('/').pop().replace('.json', ''); // Guess ID from filename
            if (dialoguePath === "dialogue/aelric_default_dialogue.json") potentialIdToTest = "aelric_default";
            if (dialoguePath === "dialogue/merchant_generic_greeting.json") potentialIdToTest = "merchant_generic_greeting";


            if (this.activeCampaignDialogues.has(potentialIdToTest)) {
                // console.log(`Dialogue ${potentialIdToTest} (manual check) already loaded.`);
                continue;
            }

            try {
                const response = await fetch(dialogueAssetPath);
                if (!response.ok) {
                    // Don't throw error if file not found for these manual ones, they might not exist in all campaigns
                    if (response.status === 404) {
                        console.warn(`Manual dialogue file not found: ${dialoguePath}`);
                        continue;
                    }
                    throw new Error(`Failed to load manual dialogue file ${dialoguePath}: ${response.statusText}`);
                }
                const dialogueData = await response.json();
                if (dialogueData.id) {
                    if (!this.activeCampaignDialogues.has(dialogueData.id)) {
                        this.activeCampaignDialogues.set(dialogueData.id, dialogueData);
                        console.log(`Dialogue '${dialogueData.id}' (manual load) loaded successfully.`);
                    }
                } else {
                    console.warn(`Manual dialogue file ${dialoguePath} is missing an 'id' field.`);
                }
            } catch (error) {
                console.error(`Error loading manual dialogue file ${dialoguePath}:`, error);
            }
        }
    }

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
const campaignManager = new CampaignManager();
// If using modules, export it:
// export default campaignManager;
// For now, let's assume it's available globally for simplicity in a non-module script environment
