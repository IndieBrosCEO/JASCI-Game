// js/questManager.js
class QuestManager {
    constructor(campaignMgr, globalStateMgrInstance) {
        this.campaignManager = campaignMgr;
        this.globalStateManager = globalStateMgrInstance;
        this.activeQuests = new Map(); // questId -> { data: questData, progress: [{objectiveId, currentCount, targetCount, isComplete}, ...] }
        this.completedQuests = new Set(); // Set of completed quest IDs
    }

    // --- Quest Availability & Starting ---
    getAvailableQuestsForNpc(npcId) {
        const available = [];
        if (!this.campaignManager || !this.campaignManager.activeCampaignQuests) return available;

        for (const questId in this.campaignManager.activeCampaignQuests) {
            const quest = this.campaignManager.activeCampaignQuests[questId];
            if (quest.giverNpcId === npcId && this.canStartQuest(questId)) {
                available.push(quest);
            }
        }
        return available;
    }

    canStartQuest(questId) {
        if (this.isQuestActive(questId) || this.isQuestCompleted(questId)) {
            return false;
        }
        const questData = this.campaignManager.getQuestData(questId);
        if (!questData) return false;

        if (questData.startConditions && questData.startConditions.length > 0) {
            for (const condition of questData.startConditions) {
                if (!this.globalStateManager.evaluateCondition(condition)) {
                    console.log(`QuestManager: Start condition not met for '${questId}':`, condition);
                    return false;
                }
            }
        }
        return true; // All conditions met or no conditions
    }

    startQuest(questId) {
        if (!this.canStartQuest(questId)) {
            console.warn(`QuestManager: Cannot start quest '${questId}'. Conditions not met, already active, or completed.`);
            return false;
        }
        const questData = this.campaignManager.getQuestData(questId);
        if (!questData) {
            console.error(`QuestManager: Quest data for '${questId}' not found.`);
            return false;
        }

        const progress = questData.objectives.map(obj => ({
            objectiveId: obj.id,
            currentCount: 0, // Or other initial progress markers
            targetCount: obj.target?.count || (obj.targetItem ? 1 : 0) || (obj.targetNpcId ? 1: 0), // Simplified target count
            isComplete: false
        }));

        this.activeQuests.set(questId, { data: questData, progress: progress });
        console.log(`Quest '${questId}' (${questData.title}) started.`);
        this.globalStateManager.setFlag(`${questId}_started`, true);

        if (questData.startDialogueNode) {
            console.log(`QuestManager: Quest '${questId}' suggests starting dialogue node '${questData.startDialogueNode}' with NPC '${questData.giverNpcId}'. (External trigger needed)`);
            // Example: this.globalStateManager.processAction({ type: "startDialogue", dialogueId: questData.startDialogueNode, npcId: questData.giverNpcId }, questId);
        }

        this.updateQuestLogUI(); // Placeholder for UI update
        return true;
    }

    // --- Quest Progress & Completion ---
    // Example: updateKillCount('goblin_ears_bounty', 'collect_ears', 'goblin_scout', 1);
    updateQuestProgress(questId, objectiveId, targetIdentifier, amount = 1) {
        if (!this.isQuestActive(questId)) return;

        const questState = this.activeQuests.get(questId);
        const objectiveProgress = questState.progress.find(p => p.objectiveId === objectiveId);
        const objectiveData = questState.data.objectives.find(o => o.id === objectiveId);

        if (!objectiveProgress || !objectiveData || objectiveProgress.isComplete) return;

        // This is highly specific to objective type, needs refinement
        // For 'kill' or 'collect' type by count:
        if (objectiveData.target?.npcTypeId === targetIdentifier || objectiveData.itemToCollect?.itemId === targetIdentifier) {
             objectiveProgress.currentCount = Math.min((objectiveProgress.currentCount || 0) + amount, objectiveProgress.targetCount);
        } else if (objectiveData.targetItem?.itemId === targetIdentifier && amount === 1) { // for simple fetch
             objectiveProgress.currentCount = 1; // Mark as "has item"
        }
        // Add more logic for other types like "reach_location", "talk_to_npc"

        if (objectiveProgress.currentCount >= objectiveProgress.targetCount) {
            objectiveProgress.isComplete = true;
            console.log(`Quest '${questId}': Objective '${objectiveId}' completed.`);
            // Process onCompletionActions for this objective
            if (objectiveData.onCompletionActions && objectiveData.onCompletionActions.length > 0) {
                console.log(`QuestManager: Processing onCompletionActions for objective '${objectiveId}' of quest '${questId}'.`);
                objectiveData.onCompletionActions.forEach(action => {
                    this.globalStateManager.processAction(action, questId); // Use GSM to process actions
                });
            }
        }
        this.checkQuestCompletion(questId);
        this.updateQuestLogUI();
    }

    // Example: player picks up item 'hemlock_locket' for quest 'lost_locket_retrieve', objective 'find_locket'
    playerHasItem(questId, objectiveId, itemId) {
        // Similar to updateQuestProgress, but specifically for item acquisition
        // Sets currentCount to 1 if item matches objective's targetItem.itemId
         if (!this.isQuestActive(questId)) return;
        const questState = this.activeQuests.get(questId);
        const objectiveProgress = questState.progress.find(p => p.objectiveId === objectiveId);
        const objectiveData = questState.data.objectives.find(o => o.id === objectiveId);

        if (objectiveProgress && objectiveData && objectiveData.targetItem?.itemId === itemId && !objectiveProgress.isComplete) {
            objectiveProgress.currentCount = 1; // Mark as "has item"
            objectiveProgress.isComplete = true;
            console.log(`Quest '${questId}': Objective '${objectiveId}' (item ${itemId} acquired) completed.`);
            this.checkQuestCompletion(questId);
            this.updateQuestLogUI();
        }
    }


    checkQuestCompletion(questId) {
        if (!this.isQuestActive(questId)) return;
        const questState = this.activeQuests.get(questId);
        const allObjectivesComplete = questState.progress.every(p => p.isComplete);

        if (allObjectivesComplete) {
            // Some quests might require returning to NPC
            const requiresReturn = questState.data.objectives.some(obj => obj.targetNpcId && obj.id === questState.data.objectives[questState.data.objectives.length-1].id); // crude check if last step is talk to NPC

            if (!requiresReturn || (requiresReturn && this.checkIfPlayerIsAtQuestGiver(questState))) {
                 this.completeQuest(questId);
            } else {
                console.log(`Quest '${questId}': All objectives complete, awaiting return to NPC or final step.`);
                // Update UI to indicate "Return to X"
            }
        }
    }

    checkIfPlayerIsAtQuestGiver(questState) {
        // Placeholder: Needs info about player location and NPC location
        // For now, assume if dialogue is triggered with giver, this check passes.
        return false; // This needs more game state context
    }

    completeQuest(questId) {
        if (!this.isQuestActive(questId)) return;
        const questState = this.activeQuests.get(questId);
        console.log(`Quest '${questId}' (${questState.data.title}) COMPLETED!`);

        // Grant rewards
        if (questState.data.rewards && questState.data.rewards.length > 0) {
            questState.data.rewards.forEach(reward => {
                // Ensure reward actions have a 'type' that GSM can understand, or adapt here.
                // Example: if a reward is { "xp": 100 }, convert to { "type": "addExperience", "amount": 100 }
                let rewardAction = { ...reward };
                if (!rewardAction.type) { // Infer type if not explicit (older quest format)
                    if (rewardAction.hasOwnProperty('experience')) { rewardAction = { type: 'addExperience', amount: rewardAction.experience }; }
                    else if (rewardAction.hasOwnProperty('itemId')) { rewardAction = { type: 'giveItem', itemId: rewardAction.itemId, quantity: rewardAction.quantity || 1 }; }
                    else if (rewardAction.hasOwnProperty('currencyId')) { rewardAction = { type: 'addCurrency', currencyType: rewardAction.currencyId, amount: rewardAction.amount }; }
                    else if (rewardAction.hasOwnProperty('factionId')) { rewardAction = { type: 'adjustFactionRep', factionId: rewardAction.factionId, amount: rewardAction.amount };}
                }
                this.globalStateManager.processAction(rewardAction, questId);
            });
        }

        // Process onCompletionActions for the quest
        if (questState.data.onCompletionActions && questState.data.onCompletionActions.length > 0) {
            console.log(`QuestManager: Processing onCompletionActions for quest '${questId}'.`);
            questState.data.onCompletionActions.forEach(action => {
                this.globalStateManager.processAction(action, questId); // Use GSM to process actions
            });
        }

        this.activeQuests.delete(questId);
        this.completedQuests.add(questId);
        this.globalStateManager.setFlag(`${questId}_completed`, true);
        this.updateQuestLogUI();
    }

    // --- Status ---
    isQuestActive(questId) {
        return this.activeQuests.has(questId);
    }

    isQuestCompleted(questId) {
        return this.completedQuests.has(questId);
    }

    getQuestState(questId) { // For UI or detailed checks
        return this.activeQuests.get(questId);
    }

    isObjectiveCompleted(questId, objectiveId) {
        const questState = this.activeQuests.get(questId);
        if (!questState) return false;
        const objectiveProgress = questState.progress.find(p => p.objectiveId === objectiveId);
        return objectiveProgress ? objectiveProgress.isComplete : false;
    }

    getQuestsAwaitingTurnIn(npcId) {
        const questsReady = [];
        if (!this.activeQuests) return questsReady;

        for (const [questId, questState] of this.activeQuests.entries()) {
            if (questState.data.objectives.length === 0) continue;

            const lastObjective = questState.data.objectives[questState.data.objectives.length - 1];
            let allPreviousObjectivesComplete = true;
            for (let i = 0; i < questState.data.objectives.length - 1; i++) {
                const objectiveProgress = questState.progress.find(p => p.objectiveId === questState.data.objectives[i].id);
                if (!objectiveProgress || !objectiveProgress.isComplete) {
                    allPreviousObjectivesComplete = false;
                    break;
                }
            }

            if (lastObjective && lastObjective.type === "talk_to_npc" && lastObjective.targetNpcId === npcId && allPreviousObjectivesComplete) {
                const finalObjectiveProgress = questState.progress.find(p => p.objectiveId === lastObjective.id);
                if (finalObjectiveProgress && !finalObjectiveProgress.isComplete) {
                    questsReady.push(questState.data); // Push the full quest static data
                }
            }
        }
        return questsReady;
    }
    /* Example autoStartDialogueOnObjectiveComplete structure in quests.json:
    "autoStartDialogueOnObjectiveComplete": [
      { "objectiveId": "obj1", "dialogueId": "dialogue_after_obj1", "targetNpcId": "npc_to_talk_to" }
    ]
    */
    // This logic would be integrated into updateObjectiveStatus or checkQuestCompletion
    // when an objective is marked complete.
    // if (objectiveProgress.isComplete) {
    //    const autoDialogueConf = questState.data.autoStartDialogueOnObjectiveComplete?.find(c => c.objectiveId === objectiveId);
    //    if (autoDialogueConf) {
    //        console.log(`QuestManager: Auto-starting dialogue ${autoDialogueConf.dialogueId} for objective ${objectiveId} completion.`);
    //        this.globalStateManager.processAction({
    //            type: "startDialogue",
    //            dialogueId: autoDialogueConf.dialogueId,
    //            npcId: autoDialogueConf.targetNpcId || questState.data.giverNpcId
    //        }, questId);
    //    }
    // }


    updateQuestLogUI() {
        // Placeholder for calling a UI update function
        // console.log("QuestManager: Quest log UI update triggered.");
        if (typeof window.updateQuestLogDisplay === 'function') { // Example global function
            window.updateQuestLogDisplay(this.activeQuests, this.completedQuests);
        }
    }

    // New method to be called externally (e.g., by story beat actions)
    updateObjectiveStatus(questId, objectiveId, newStatus = "completed", amount = 1) {
        if (!this.isQuestActive(questId)) {
            console.warn(`QuestManager: Cannot update objective for inactive quest '${questId}'.`);
            return;
        }

        const questState = this.activeQuests.get(questId);
        const objectiveProgress = questState.progress.find(p => p.objectiveId === objectiveId);
        const objectiveData = questState.data.objectives.find(o => o.id === objectiveId);

        if (!objectiveProgress || !objectiveData) {
            console.warn(`QuestManager: Objective '${objectiveId}' not found for quest '${questId}'.`);
            return;
        }

        if (objectiveProgress.isComplete && newStatus !== "reset") return; // Already complete, unless resetting

        console.log(`QuestManager: Updating objective '${objectiveId}' for quest '${questId}' to status '${newStatus}'.`);

        let madeChange = false;
        if (newStatus === "completed") {
            if (!objectiveProgress.isComplete) {
                objectiveProgress.currentCount = objectiveProgress.targetCount;
                objectiveProgress.isComplete = true;
                madeChange = true;
            }
        } else if (newStatus === "increment") {
            if (objectiveProgress.currentCount < objectiveProgress.targetCount) {
                objectiveProgress.currentCount = Math.min((objectiveProgress.currentCount || 0) + amount, objectiveProgress.targetCount);
                madeChange = true;
            }
            if (objectiveProgress.currentCount >= objectiveProgress.targetCount && !objectiveProgress.isComplete) {
                objectiveProgress.isComplete = true;
                madeChange = true; // Explicitly mark true if it just got completed
            }
        } else if (newStatus === "setCount") {
            if (objectiveProgress.currentCount !== amount) {
                objectiveProgress.currentCount = Math.min(amount, objectiveProgress.targetCount);
                madeChange = true;
            }
             if (objectiveProgress.currentCount >= objectiveProgress.targetCount && !objectiveProgress.isComplete) {
                objectiveProgress.isComplete = true;
                madeChange = true; // Explicitly mark true
            }
        } else if (newStatus === "reset") {
            if (objectiveProgress.isComplete || objectiveProgress.currentCount > 0) {
                objectiveProgress.isComplete = false;
                objectiveProgress.currentCount = 0;
                madeChange = true;
                console.log(`Quest '${questId}': Objective '${objectiveId}' has been reset.`);
            }
        }
        // Add more status types as needed

        if (madeChange && objectiveProgress.isComplete) {
             console.log(`Quest '${questId}': Objective '${objectiveId}' marked as completed via external update.`);
             // Process objective-specific completion actions if any
             if (objectiveData.onCompletionActions && objectiveData.onCompletionActions.length > 0) {
                console.log(`QuestManager: Processing onCompletionActions for objective '${objectiveId}' of quest '${questId}'.`);
                objectiveData.onCompletionActions.forEach(action => this.processAction(action, questId));
            }
        }

        if (madeChange) {
            this.checkQuestCompletion(questId); // Only check if a change actually occurred
            this.updateQuestLogUI();
        }
    }

    // --- Persistence ---
    getSaveData() {
        const activeQuestsArray = [];
        this.activeQuests.forEach((questState, questId) => {
            activeQuestsArray.push({
                id: questId,
                // Only save progress; static data (title, objectives structure) comes from campaign files
                progress: questState.progress.map(p => ({
                    objectiveId: p.objectiveId,
                    currentCount: p.currentCount,
                    isComplete: p.isComplete
                }))
            });
        });
        return {
            activeQuests: activeQuestsArray,
            completedQuests: Array.from(this.completedQuests)
        };
    }

    loadSaveData(data) {
        this.activeQuests.clear();
        this.completedQuests.clear();

        if (data.completedQuests) {
            data.completedQuests.forEach(questId => this.completedQuests.add(questId));
        }

        if (data.activeQuests) {
            data.activeQuests.forEach(savedQuestState => {
                const questDataFromCampaign = this.campaignManager.getQuestData(savedQuestState.id);
                if (questDataFromCampaign) {
                    // Reconstruct progress, merging with static objective data if needed for target counts etc.
                    const liveProgress = questDataFromCampaign.objectives.map(objDef => {
                        const savedProg = savedQuestState.progress.find(p => p.objectiveId === objDef.id);
                        return {
                            objectiveId: objDef.id,
                            currentCount: savedProg ? savedProg.currentCount : 0,
                            targetCount: objDef.target?.count || (objDef.targetItem ? 1 : 0) || (objDef.targetNpcId ? 1: 0),
                            isComplete: savedProg ? savedProg.isComplete : false
                        };
                    });
                    this.activeQuests.set(savedQuestState.id, {
                        data: questDataFromCampaign,
                        progress: liveProgress
                    });
                } else {
                    console.warn(`QuestManager: Quest data for active quest ID '${savedQuestState.id}' not found in campaign files during load. Skipping.`);
                }
            });
        }
        console.log("QuestManager: Quest states restored from save data.");
        this.updateQuestLogUI();
    }
}

// Global instance or passed around
// const questManager = new QuestManager(campaignManager, globalStateManager);
