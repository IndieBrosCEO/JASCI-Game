// js/globalStateManager.js
class GlobalStateManager {
    constructor() {
        this.flags = {};
        this.variables = {};
        // These will be populated by specific managers during save/load
        this.activeQuestsState = null;
        this.completedQuestsState = null;
        this.discoveredMapNodes = [];
        // Add other states as needed
        this.discoveredMapNodes = [];
        this.playerCurrentNodeId = null;

        this.storageKeyPrefix = "jasci_gamestate_";
    }

    // --- Flag Management ---
    setFlag(flagName, value = true) {
        console.log(`GSM: Setting flag '${flagName}' to ${value}`);
        this.flags[flagName] = !!value;
    }

    isFlagSet(flagName) {
        return !!this.flags[flagName];
    }

    clearFlag(flagName) {
        console.log(`GSM: Clearing flag '${flagName}'`);
        delete this.flags[flagName];
    }

    // --- Variable Management ---
    setVariable(varName, value) {
        console.log(`GSM: Setting variable '${varName}' to`, value);
        this.variables[varName] = value;
    }

    getVariable(varName, defaultValue = null) {
        return this.variables.hasOwnProperty(varName) ? this.variables[varName] : defaultValue;
    }

    incrementVariable(varName, amount = 1) {
        const currentValue = this.getVariable(varName, 0);
        this.setVariable(varName, currentValue + amount);
    }

    // --- Action Processing ---
    // Centralized way to process actions from quests, dialogues, story beats
    processAction(action, context) { // context could be questId, npcId etc. for logging
        console.log(`GSM: Processing action:`, action, `(Context: ${context || 'N/A'})`);
        if (!action || !action.type) {
            console.warn("GSM: Invalid action received.", action);
            return;
        }

        switch (action.type) {
            case "setFlag":
                this.setFlag(action.flag, action.value !== undefined ? action.value : true);
                break;
            case "clearFlag":
                this.clearFlag(action.flag);
                break;
            case "startQuest":
                if (window.questManager && typeof window.questManager.startQuest === 'function') {
                    if (action.ifCondition) {
                        if (!this.evaluateCondition(action.ifCondition)) {
                            console.log(`GSM: Condition for starting quest '${action.questId}' not met.`);
                            return;
                        }
                    }
                    window.questManager.startQuest(action.questId);
                } else {
                    console.warn("GSM: QuestManager not found to start quest via action.");
                }
                break;
            case "updateQuestObjective":
                if (window.questManager && typeof window.questManager.updateObjectiveStatus === 'function') {
                    window.questManager.updateObjectiveStatus(action.questId, action.objectiveId, action.status || "completed", action.amount || 1);
                } else {
                    console.warn("GSM: QuestManager not found for updateQuestObjective action.");
                }
                break;
            case "giveItem":
                console.log(`GSM: Would give item ${action.itemId} x${action.quantity || 1} to player. (Inventory system needed)`);
                // Example: if(window.inventoryManager) window.inventoryManager.addItem(action.itemId, action.quantity || 1);
                break;
            case "addExperience":
                console.log(`GSM: Would give ${action.amount || 0} experience to player. (Player stats system needed)`);
                // Example: if(window.playerStatsManager) window.playerStatsManager.addExperience(action.amount || 0);
                break;
            case "adjustFactionRep":
                if (action.factionId && typeof action.amount === 'number') {
                    const repVarName = 'faction_' + action.factionId + '_rep';
                    this.incrementVariable(repVarName, action.amount);
                    console.log(`GSM: Faction ${action.factionId} reputation adjusted by ${action.amount}. New value: ${this.getVariable(repVarName)}`);
                } else {
                    console.warn("GSM: adjustFactionRep action missing factionId or amount.", action);
                }
                break;
            case "addCurrency":
                if (action.currencyType && typeof action.amount === 'number') {
                    const currencyVarName = 'currency_' + action.currencyType;
                    this.incrementVariable(currencyVarName, action.amount);
                    console.log(`GSM: Currency ${action.currencyType} adjusted by ${action.amount}. New value: ${this.getVariable(currencyVarName)}`);
                } else {
                    console.warn("GSM: addCurrency action missing currencyType or amount.", action);
                }
                break;
            case "startDialogue":
                console.log(`GSM: Would start dialogue ${action.dialogueId} with NPC ${action.npcId || context}. (DialogueManager trigger needed)`);
                // Example: if(window.dialogueManager && action.dialogueId) window.dialogueManager.startConversation(action.dialogueId, null, action.npcId || context);
                break;
            default:
                console.warn(`GSM: Unknown action type '${action.type}'`);
        }
    }

    evaluateCondition(condition) {
        if (!condition || !condition.type) return true;
        console.log("GSM: Evaluating condition:", condition);
        switch (condition.type) {
            case "flagSet": return this.isFlagSet(condition.flag);
            case "flagNotSet": return !this.isFlagSet(condition.flag);
            case "questCompleted": return window.questManager ? window.questManager.isQuestCompleted(condition.questId) : false;
            case "questNotCompleted": return window.questManager ? !window.questManager.isQuestCompleted(condition.questId) : true; // True if QM doesn't exist or quest not completed
            case "questActive": return window.questManager ? window.questManager.isQuestActive(condition.questId) : false;
            case "questNotActive": return window.questManager ? !window.questManager.isQuestActive(condition.questId) : true;
            case "questObjectiveCompleted":
                if (window.questManager && condition.questId && condition.objectiveId) {
                    return window.questManager.isObjectiveCompleted(condition.questId, condition.objectiveId);
                }
                return false;
            case "questObjectiveNotCompleted":
                if (window.questManager && condition.questId && condition.objectiveId) {
                    return !window.questManager.isObjectiveCompleted(condition.questId, condition.objectiveId);
                }
                return true;
            // TODO: Add playerChoice, variableEquals (e.g. var:faction_rep_A>10), itemPossessed etc.
            default: console.warn("GSM: Unknown condition type:", condition.type); return true;
        }
    }

    // --- Persistence ---
    gatherSaveData() {
        const saveData = {
            flags: { ...this.flags },
            variables: { ...this.variables },
            discoveredMapNodes: [...this.discoveredMapNodes],
            playerCurrentNodeId: this.playerCurrentNodeId,
            quests: window.questManager ? window.questManager.getSaveData() : {},
            campaign: window.campaignManager ? window.campaignManager.getSaveData() : {}
            // npcs: window.npcManager ? window.npcManager.getSaveData() : {}
        };
        console.log("GSM: Gathered save data:", saveData);
        return saveData;
    }

    applyLoadedData(data) {
        this.flags = data.flags || {};
        this.variables = data.variables || {};
        this.discoveredMapNodes = data.discoveredMapNodes || [];
        this.playerCurrentNodeId = data.playerCurrentNodeId || null;

        // Order might matter: campaign context might be needed for quests for example.
        // However, campaignManager.loadSaveData now just restores the ID.
        // Actual campaign activation should happen after this entire method.
        if (window.campaignManager && data.campaign) {
            window.campaignManager.loadSaveData(data.campaign);
        }
        if (window.questManager && data.quests) {
            window.questManager.loadSaveData(data.quests);
        }

        console.log("GSM: Applied loaded data. Flags, variables, and delegated states restored.");

        // It's crucial that after this, the main game script checks
        // campaignManager.getActiveCampaignId() and calls activateCampaign if an ID is set.
        // Then, a general game refresh.
        if (typeof window.refreshGameDisplay === 'function') window.refreshGameDisplay();
    }

    saveGameState(slotName = "default") {
        const fullKey = this.storageKeyPrefix + slotName;
        try {
            const dataToSave = this.gatherSaveData();
            localStorage.setItem(fullKey, JSON.stringify(dataToSave));
            console.log(`GSM: Game state saved to localStorage slot '${slotName}'.`);
        } catch (error) {
            console.error(`GSM: Error saving game state to slot '${slotName}':`, error);
        }
    }

    loadGameState(slotName = "default") {
        const fullKey = this.storageKeyPrefix + slotName;
        try {
            const savedDataString = localStorage.getItem(fullKey);
            if (savedDataString) {
                const parsedData = JSON.parse(savedDataString);
                this.applyLoadedData(parsedData);
                console.log(`GSM: Game state loaded from localStorage slot '${slotName}'.`);
                return parsedData || {}; // Return the loaded data or empty obj
            } else {
                console.log(`GSM: No save data found for slot '${slotName}'. Starting fresh.`);
                this.applyLoadedData({});
                return {}; // Return empty obj
            }
        } catch (error) {
            console.error(`GSM: Error loading game state from slot '${slotName}':`, error);
            this.applyLoadedData({});
            return {}; // Return empty obj on error
        }
    }

    deleteSaveGame(slotName = "default") {
        const fullKey = this.storageKeyPrefix + slotName;
        localStorage.removeItem(fullKey);
        console.log(`GSM: Deleted save game for slot '${slotName}'.`);
    }

    discoverMapNode(nodeId) {
        if (!this.discoveredMapNodes.includes(nodeId)) {
            this.discoveredMapNodes.push(nodeId);
            console.log(`GSM: Map node '${nodeId}' discovered.`);
        }
    }

    isMapNodeDiscovered(nodeId) {
        return this.discoveredMapNodes.includes(nodeId);
    }

    setPlayerCurrentNodeId(nodeId) {
        if (this.playerCurrentNodeId !== nodeId) {
            this.playerCurrentNodeId = nodeId;
            console.log(`GSM: Player current node ID set to '${nodeId}'.`);
            // Potentially dispatch an event here if other systems need to react immediately
            // window.dispatchEvent(new CustomEvent('playercurrentnodechanged', { detail: { nodeId: nodeId } }));
        }
    }

    getPlayerCurrentNodeId() {
        return this.playerCurrentNodeId;
    }
}

window.globalStateManager = new GlobalStateManager();
// globalStateManager.loadGameState(); // Call explicitly at game start
