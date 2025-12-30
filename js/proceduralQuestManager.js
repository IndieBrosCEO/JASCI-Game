// js/proceduralQuestManager.js

class ProceduralQuestManager {
    constructor(gameState, assetManager, npcManagerInstance, factionManagerInstance, timeManagerInstance) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.npcManager = npcManagerInstance; // Use passed instance
        this.factionManager = factionManagerInstance; // Use passed instance
        this.timeManager = timeManagerInstance; // Use passed instance
        // this.questManager = questManager; // To add to activeQuests // questManager is not directly passed, but part of gameState
        this.mapUtils = window.mapUtils;     // Assuming mapUtils is still global for now
        this.questTemplates = {};
        // TODO: Expand with more quest types (escort, defend, explore, use item on target, etc.).
        //       This would involve new objective types, generation logic, and completion checks.
        // TODO: Deeper integration with dialogue system for quest giving/briefing/turn-in.
        //       Current system uses actions in dialogue choices. More dynamic text and NPC reactions needed.
        // TODO: Better reward generation (specific items, XP amounts based on difficulty, faction standing changes).
        //       Currently uses fixed rewards from templates.
        // Quest Tracking UI implemented (QuestLogUIManager).
        //       Currently, quests are logged to console or managed via dialogue.
        // TODO: Enhance persistence of active/completed quests, especially if target entities/items are dynamic
        //       and need specific state restoration on game load beyond what gameState serialization provides.
    }

    initialize() {
        if (!this.assetManager) {
            logToConsole("ProceduralQuestManager Error: AssetManager not available.", "error");
            return false;
        }
        if (!this.npcManager) {
            logToConsole("ProceduralQuestManager Error: NpcManager (window.npcManager) not available.", "error");
            return false;
        }
        if (!this.mapUtils) {
            logToConsole("ProceduralQuestManager Error: MapUtils (window.mapUtils) not available.", "error");
            return false;
        }

        // Use the new method/property from AssetManager
        const allQuestTemplates = this.assetManager.getAllProceduralQuestTemplates(); // This returns an object keyed by ID
        if (allQuestTemplates && Object.keys(allQuestTemplates).length > 0) {
            this.questTemplates = allQuestTemplates;
            logToConsole(`ProceduralQuestManager: Accessed ${Object.keys(this.questTemplates).length} quest templates from AssetManager.`, "info");
        } else {
            logToConsole("ProceduralQuestManager Error: Could not access procedural quest templates from AssetManager or none were loaded.", "error");
            // this.questTemplates will remain {}
        }

        if (!this.gameState.availableProceduralQuests) {
            this.gameState.availableProceduralQuests = [];
        }
        if (!this.gameState.activeQuests) { // Should exist from core quest system
            this.gameState.activeQuests = [];
        }
        return true;
    }

    generateUniqueQuestInstanceId(templateId) {
        return `procquest_${templateId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    // Called periodically by a faction representative or game event system
    generateQuestOffer(factionId) {
        if (!this.factionManager || !this.assetManager || !this.mapUtils) {
            logToConsole("PQM Error: Missing manager dependencies (faction, asset, mapUtils).", "error");
            return null;
        }

        const playerReputation = this.factionManager.getPlayerReputation(factionId, this.gameState);

        const suitableTemplates = Object.values(this.questTemplates).filter(template => {
            if (template.factionId && template.factionId !== factionId) return false;

            const minRepStatus = this.factionManager.getReputationStatus(template.minReputation || "hostile");
            const maxRepStatus = this.factionManager.getReputationStatus(template.maxReputation || "allied");

            if (playerReputation < minRepStatus.minThreshold) return false;
            if (playerReputation > maxRepStatus.maxThreshold) return false; // Assumes maxThreshold is upper bound of the status

            // Player Level Check
            if (template.minPlayerLevel && this.gameState.level < template.minPlayerLevel) return false;

            // Global Flag Check
            if (template.requiresGlobalFlag) {
                if (!this.gameState.globalFlags || !this.gameState.globalFlags[template.requiresGlobalFlag]) return false;
            }

            // Max Active Check (checks both active and available offers)
            if (template.maxActive) {
                const activeCount = (this.gameState.activeQuests || []).filter(q => q.templateId === template.id && q.status === "active").length;
                const offeredCount = (this.gameState.availableProceduralQuests || []).filter(q => q.templateId === template.id).length;
                if ((activeCount + offeredCount) >= template.maxActive) return false;
            }

            return true;
        });

        if (suitableTemplates.length === 0) {
            logToConsole(`PQM: No suitable procedural quest templates found for faction ${factionId} with current player reputation.`, "info");
            return null;
        }

        // Weighted random selection
        const totalWeight = suitableTemplates.reduce((sum, t) => sum + (t.weight || 1), 0);
        let randomRoll = Math.random() * totalWeight;
        let selectedTemplate = null;
        for (const template of suitableTemplates) {
            randomRoll -= (template.weight || 1);
            if (randomRoll <= 0) {
                selectedTemplate = template;
                break;
            }
        }
        if (!selectedTemplate) selectedTemplate = suitableTemplates[0]; // Fallback

        // Instantiate the quest
        const questInstanceId = this.generateUniqueQuestInstanceId(selectedTemplate.id);
        const generatedDetails = { ...selectedTemplate.objectiveDetails }; // Start with base details
        let finalDescription = selectedTemplate.descriptionPattern;
        let finalDisplayName = selectedTemplate.displayNamePattern;

        // Populate placeholders in details, description, and displayName
        if (generatedDetails.type === "kill_tagged_npcs_in_area") {
            generatedDetails.count = rollDiceNotationRange(generatedDetails.countRange || [1, 1]);
            const npcDefForName = this.assetManager.getNpcsByTag(generatedDetails.npcTag)[0]; // Get first matching for name
            const npcNamePlural = npcDefForName ? (npcDefForName.pluralName || `${npcDefForName.name}s`) : (generatedDetails.npcTag + "s");

            finalDescription = finalDescription.replace("{npcNamePlural}", npcNamePlural)
                .replace("{count}", generatedDetails.count)
                .replace("{factionCampLocation}", this.mapUtils.getFactionCampLocationName(factionId) || "area");
            finalDisplayName = finalDisplayName.replace("{npcNamePlural}", npcNamePlural);

            // TODO: Resolve areaKey for spawning: generatedDetails.targetArea = this.mapUtils.findArea(...)
            //       Consider proximity to quest giver, avoiding player's current location, and ensuring pathability.
            //       The current findRandomPointInAreaType is a good start but might need more constraints.
            generatedDetails.targetArea = this.mapUtils.findRandomPointInAreaType(generatedDetails.areaType, generatedDetails.areaRadius, this.mapUtils.getFactionBaseCoords(factionId));
            if (!generatedDetails.targetArea) {
                logToConsole(`PQM Error: Could not find suitable area for kill quest ${selectedTemplate.id}.`, "error");
                return null;
            }
        } else if (generatedDetails.type === "deliver_item_to_npc_at_location") {
            const itemToDeliverId = Array.isArray(generatedDetails.itemPool) ? generatedDetails.itemPool[Math.floor(Math.random() * generatedDetails.itemPool.length)] : generatedDetails.itemPool;
            const itemDef = this.assetManager.getItem(itemToDeliverId);
            generatedDetails.actualItemId = itemToDeliverId; // Store the chosen item

            // TODO: Find/designate recipient NPC and destination location
            //       Ensure NPC is essential or persistent if the quest is long.
            //       Ensure destination is reachable and makes sense for the NPC.
            //       Consider using mapUtils to find a suitable named location or dynamic point.
            const recipientNpc = this.npcManager.findNpcByTagOrId(generatedDetails.recipientNpcTag, generatedDetails.destinationAreaKey);
            const destinationLocation = this.mapUtils.getNamedLocationCoords(generatedDetails.destinationAreaKey) || this.mapUtils.findRandomPointInAreaType(generatedDetails.destinationAreaType || "any_settlement", 5, recipientNpc ? { x: recipientNpc.x, y: recipientNpc.y, z: recipientNpc.z } : null);


            if (!itemDef || !recipientNpc || !destinationLocation) {
                logToConsole(`PQM Error: Could not generate details for delivery quest ${selectedTemplate.id} (item, NPC, or location missing/unfound).`, "error");
                return null;
            }
            generatedDetails.recipientNpcId = recipientNpc.id;
            generatedDetails.destinationCoords = destinationLocation.coords || destinationLocation; // destinationLocation might be coords directly if from findRandomPoint
            generatedDetails.destinationName = destinationLocation.name || `area near ${Math.round(generatedDetails.destinationCoords.x)},${Math.round(generatedDetails.destinationCoords.y)}`;


            finalDescription = finalDescription.replace("{itemName}", itemDef.name)
                .replace("{recipientName}", recipientNpc.name)
                .replace("{destinationName}", generatedDetails.destinationName);
            finalDisplayName = finalDisplayName.replace("{itemName}", itemDef.name); // If pattern uses it
        }
        // Add more else if blocks for other quest types (scout_location, retrieve_item_from_area_or_npcs)
        // TODO: For "retrieve_item_from_area_or_npcs":
        //       - Select an appropriate item (not too common, not quest-critical elsewhere).
        //       - Determine if it's in a container, on the ground in an area, or carried by an NPC.
        //       - If NPC, ensure NPC can be spawned or exists and is not essential for other reasons.
        //       - Ensure the area is reachable and makes sense.

        const newQuestOffer = {
            questInstanceId: questInstanceId,
            templateId: selectedTemplate.id,
            factionId: factionId,
            displayName: finalDisplayName,
            description: finalDescription,
            generatedDetails: generatedDetails,
            reward: selectedTemplate.rewardBase, // Copy base rewards
            timeLimitTicks: selectedTemplate.timeLimitTicks || null,
            status: "offered",
            offerTimeTicks: this.gameState.currentTurn // Or a more precise game tick
        };

        // TODO: Check if character already has this quest or a similar one.
        // Check against active and already available (but not yet accepted) procedural quests.
        const similarQuestExists = this.gameState.activeQuests.some(q => q.templateId === newQuestOffer.templateId && q.status === "active") ||
            this.gameState.availableProceduralQuests.some(q => q.templateId === newQuestOffer.templateId);

        if (similarQuestExists) {
            logToConsole(`PQM: Similar quest (Template: ${newQuestOffer.templateId}) already active or offered. Skipping generation of new offer.`, "info");
            return null; // Don't offer a duplicate
        }

        this.gameState.availableProceduralQuests.push(newQuestOffer);
        logToConsole(`PQM: Generated quest offer "${newQuestOffer.displayName}" (ID: ${questInstanceId}) for faction ${factionId}.`, "info");
        return newQuestOffer;
    }

    acceptProceduralQuest(questInstanceId) {
        const questIndex = this.gameState.availableProceduralQuests.findIndex(q => q.questInstanceId === questInstanceId);
        if (questIndex === -1) {
            logToConsole(`PQM Error: Quest offer ${questInstanceId} not found to accept.`, "error");
            return false;
        }

        const questToActivate = this.gameState.availableProceduralQuests.splice(questIndex, 1)[0];
        questToActivate.status = "active";
        questToActivate.startTimeTicks = this.gameState.currentTurn; // Or precise game tick
        questToActivate.objectives = this.generateObjectivesList(questToActivate); // Create a user-friendly objectives list

        this.gameState.activeQuests.push(questToActivate);
        logToConsole(`PQM: Quest "${questToActivate.displayName}" (ID: ${questInstanceId}) accepted.`, "event-success");

        // Log objectives to console for basic UI feedback
        if (questToActivate.objectives && questToActivate.objectives.length > 0) {
            logToConsole(`Objectives for "${questToActivate.displayName}":`, "info");
            questToActivate.objectives.forEach((obj, index) => {
                logToConsole(`  ${index + 1}. ${obj.text} (${obj.completed ? 'Completed' : 'Pending'})`, "info");
            });
        }
        // TODO: Notify player through a more robust UI element (e.g., quest log update, toast message).
        // Currently relies on console logs and dialogue manager updates.
        if (window.uiManager) window.uiManager.showToastNotification(`Quest Accepted: ${questToActivate.displayName}`, "success");
        if (window.QuestLogUI) window.QuestLogUI.refreshQuestLog(); // Assuming a QuestLogUI exists and has this method

        // If it's a delivery quest, give the player the item
        if (questToActivate.generatedDetails.type === "deliver_item_to_npc_at_location" && questToActivate.generatedDetails.actualItemId) {
            if (window.inventoryManager && window.assetManager) {
                const itemDef = this.assetManager.getItem(questToActivate.generatedDetails.actualItemId);
                if (itemDef) {
                    const qty = questToActivate.generatedDetails.itemQuantity || 1;
                    if (window.inventoryManager.addItemToInventoryById(itemDef.id, qty)) {
                        logToConsole(`Player received ${qty}x ${itemDef.name} for delivery quest.`, "info");
                    } else {
                        logToConsole(`PQM Error: Could not give player ${itemDef.name} for delivery quest (inventory full?). Quest might be impossible.`, "error");
                    }
                }
            }
        }
        // Update Quest Log UI
        if (window.QuestLogUI) window.QuestLogUI.refreshQuestLog();
        return true;
    }

    generateObjectivesList(quest) {
        const objectives = [];
        const details = quest.generatedDetails;
        switch (details.type) {
            case "kill_tagged_npcs_in_area":
                objectives.push({
                    text: `Eliminate ${details.count} ${details.npcTag}(s) near ${this.mapUtils.getAreaDescription(details.targetArea)}.`,
                    completed: false,
                    currentCount: 0,
                    targetCount: details.count
                });
                break;
            case "deliver_item_to_npc_at_location":
                const itemDef = this.assetManager.getItem(details.actualItemId);
                const recipientNpc = this.npcManager.getNpcById(details.recipientNpcId);
                const destName = this.mapUtils.getNamedLocationName(quest.generatedDetails.destinationAreaKey) || quest.generatedDetails.destinationAreaKey;
                objectives.push({
                    text: `Deliver ${itemDef.name} to ${recipientNpc.name} at ${destName}.`,
                    completed: false
                });
                break;
            // Add more cases
        }
        return objectives;
    }


    updateProceduralQuests(currentTick) {
        for (let i = this.gameState.activeQuests.length - 1; i >= 0; i--) {
            const quest = this.gameState.activeQuests[i];
            if (quest.isProcedural && quest.timeLimitTicks && quest.status === "active") {
                const elapsedTime = currentTick - quest.startTimeTicks;
                if (elapsedTime >= quest.timeLimitTicks) {
                    logToConsole(`PQM: Timed quest "${quest.displayName}" expired!`, "event-failure");
                    this.failQuest(quest.questInstanceId, "timed_out");
                    // No splice here, failQuest handles moving it to completed
                }
            }
        }
    }

    failQuest(questInstanceId, reason = "failed") {
        const questIndex = this.gameState.activeQuests.findIndex(q => q.questInstanceId === questInstanceId);
        if (questIndex > -1) {
            const quest = this.gameState.activeQuests.splice(questIndex, 1)[0];
            quest.status = reason; // e.g., "failed", "timed_out"
            quest.completionTimeTicks = this.gameState.currentTurn;
            this.gameState.completedQuests.push(quest); // Add to completed list for record
            logToConsole(`Quest "${quest.displayName}" failed: ${reason}.`, "event-failure");

            // Apply failure penalties if any (e.g. reputation loss)
            if (quest.reward && quest.reward.reputationChangeOnFailure) {
                const repChange = quest.reward.reputationChangeOnFailure;
                const targetFactionId = repChange.factionIdSource ? quest.factionId : repChange.factionId;
                if (this.factionManager) {
                    this.factionManager.adjustPlayerReputation(targetFactionId, repChange.amount, `quest_failed_${quest.templateId}`);
                }
            }
            // Update Quest Log UI
            if (window.QuestLogUI) window.QuestLogUI.refreshQuestLog();
        }
    }


    getQuestDetails(questInstanceId) {
        let quest = this.gameState.availableProceduralQuests.find(q => q.questInstanceId === questInstanceId);
        if (quest) return quest;
        quest = this.gameState.activeQuests.find(q => q.questInstanceId === questInstanceId);
        // Could also check completedQuests if needed
        return quest;
    }

    // This would be called by questManager when a relevant game event happens (e.g. NPC killed, item acquired, area entered)
    checkObjectiveCompletion(eventData) {
        // eventData examples:
        // { type: "npc_killed", npcId: "...", npcTags: [...], coordinates: {x,y,z} }
        // { type: "item_given_to_npc", itemId: "...", recipientNpcId: "..." }
        // { type: "item_acquired", itemId: "...", quantity: X }
        // { type: "area_entered", areaId: "...", coordinates: {x,y,z} }
        // { type: "interact_with_object", objectId: "...", objectType: "..." }

        let questLogNeedsUpdate = false;
        this.gameState.activeQuests.forEach(quest => {
            if (quest.status === "active" && quest.isProcedural) { // Ensure it's a procedural quest
                const details = quest.generatedDetails;
                let objectiveCompletedThisCheck = false; // Tracks if any objective within *this* quest got completed in this check cycle

                quest.objectives.forEach(objective => {
                    if (objective.completed) return; // Skip already completed objectives

                    let currentObjectiveProgressed = false;

                    switch (details.type) {
                        case "kill_tagged_npcs_in_area":
                            if (eventData.type === "npc_killed" && eventData.npcTags.includes(details.npcTag)) {
                                // Optional: Check if killed NPC was in the targetArea if that's strict
                                // For now, any NPC with the tag counts.
                                if (objective.targetCount) { // Check if this objective is the kill count one
                                    objective.currentCount = (objective.currentCount || 0) + 1;
                                    logToConsole(`PQM: Kill objective for "${quest.displayName}" updated: ${objective.currentCount}/${objective.targetCount} ${details.npcTag}s.`, "info");
                                    if (objective.currentCount >= objective.targetCount) {
                                        objective.completed = true;
                                        objectiveCompletedThisCheck = true;
                                    }
                                    currentObjectiveProgressed = true;
                                }
                            }
                            break;
                        case "deliver_item_to_npc_at_location":
                            if (eventData.type === "item_given_to_npc" &&
                                eventData.itemId === details.actualItemId &&
                                eventData.recipientNpcId === details.recipientNpcId) {
                                // Optional: Check if player is at details.destinationCoords (or if NPC is there)
                                // This check assumes the dialogue/interaction system verifies location if necessary
                                objective.completed = true;
                                objectiveCompletedThisCheck = true;
                                currentObjectiveProgressed = true;
                                logToConsole(`PQM: Delivery objective for "${quest.displayName}" completed.`, "info");
                            }
                            break;
                        case "retrieve_item_from_area_or_npcs": // Example for a new type
                            if (eventData.type === "item_acquired" && eventData.itemId === details.targetItemId) {
                                // This is a simple version. May need to track if it's THE specific item from a location/NPC.
                                // For now, any acquisition of the item type counts.
                                objective.currentCount = (objective.currentCount || 0) + (eventData.quantity || 1);
                                if (objective.currentCount >= details.itemQuantity) {
                                    objective.completed = true;
                                    objectiveCompletedThisCheck = true;
                                }
                                currentObjectiveProgressed = true;
                                logToConsole(`PQM: Retrieve objective for "${quest.displayName}" updated: ${objective.currentCount}/${details.itemQuantity} ${details.targetItemId}s.`, "info");
                            }
                            break;
                        case "scout_location": // Example for a new type
                            if (eventData.type === "area_entered" && eventData.areaId === details.targetAreaId) {
                                // Could also check proximity to specific coordinates via eventData.coordinates
                                objective.completed = true;
                                objectiveCompletedThisCheck = true;
                                currentObjectiveProgressed = true;
                                logToConsole(`PQM: Scout objective for "${quest.displayName}" (Area: ${details.targetAreaId}) completed.`, "info");
                            }
                            break;
                        // Add more objective type checks here
                    }
                    if (currentObjectiveProgressed) questLogNeedsUpdate = true;
                });


                // After checking all objectives for *this* quest, see if the whole quest is complete
                if (objectiveCompletedThisCheck && quest.objectives.every(obj => obj.completed)) {
                    this.completeProceduralQuest(quest.questInstanceId);
                }
            }
        });

        if (questLogNeedsUpdate) {
            // Signal Quest Log UI to refresh
            if (window.QuestLogUI) window.QuestLogUI.refreshQuestLog();
        }
    }

    completeProceduralQuest(questInstanceId) {
        const questIndex = this.gameState.activeQuests.findIndex(q => q.questInstanceId === questInstanceId);
        if (questIndex > -1) {
            const quest = this.gameState.activeQuests.splice(questIndex, 1)[0];
            quest.status = "completed";
            quest.completionTimeTicks = this.gameState.currentTurn;
            this.gameState.completedQuests.push(quest); // Add to general completed list

            logToConsole(`Procedural Quest "${quest.displayName}" COMPLETED!`, "event-success");

            // Play quest completion sound/ fanfare
            if (window.audioManager) window.audioManager.playSound('quest_complete_01.wav', { volume: 0.9 });

            // Apply rewards
            // TODO: More complex reward logic (e.g., item choice, faction standing changes based on performance/difficulty).
            // Current system uses fixed rewards from the quest template.
            if (quest.reward) {
                if (quest.reward.xp) {
                    this.gameState.XP += quest.reward.xp;
                    logToConsole(`Awarded ${quest.reward.xp} XP. Total: ${this.gameState.XP}`, "lime");
                }
                if (quest.reward.gold) {
                    this.gameState.playerGold = (this.gameState.playerGold || 0) + quest.reward.gold;
                    logToConsole(`Awarded ${quest.reward.gold} gold. Total: ${this.gameState.playerGold}`, "lime");
                }
                if (quest.reward.reputationChange && this.factionManager) {
                    const repChange = quest.reward.reputationChange;
                    const targetFactionId = repChange.factionIdSource === "quest_giver_faction" ? quest.factionId : repChange.factionId;
                    this.factionManager.adjustPlayerReputation(targetFactionId, repChange.amount, `quest_completed_${quest.templateId}`);
                }
                if (quest.reward.itemPoolReward && window.inventoryManager && window.assetManager) {
                    // Placeholder: Grant one random item from the pool
                    const poolId = Array.isArray(quest.reward.itemPoolReward) ? quest.reward.itemPoolReward[Math.floor(Math.random() * quest.reward.itemPoolReward.length)] : quest.reward.itemPoolReward;
                    const itemDef = this.assetManager.getItem(poolId);
                    if (itemDef) {
                        window.inventoryManager.addItemToInventoryById(itemDef.id, 1);
                        logToConsole(`Awarded item: ${itemDef.name} from reward pool.`, "lime");
                    }
                }
            }
            if (window.renderCharacterInfo) window.renderCharacterInfo(); // For XP updates
            if (window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay(); // For gold updates
        // Update Quest Log UI explicitly here.
            if (window.QuestLogUI) window.QuestLogUI.refreshQuestLog();
            if (window.uiManager) window.uiManager.showToastNotification(`Quest Completed: ${quest.displayName}`, "success", 5000);


        }
    }

}


// Helper for dice notation like "1d4+1" or a range [min, max]
function rollDiceNotationRange(rangeOrDice) {
    if (Array.isArray(rangeOrDice) && rangeOrDice.length === 2) {
        return Math.floor(Math.random() * (rangeOrDice[1] - rangeOrDice[0] + 1)) + rangeOrDice[0];
    } else if (typeof rangeOrDice === 'string') {
        // Ensure rollDiceNotation is available globally or handle its absence
        if (typeof window.rollDiceNotation === 'function') {
            return window.rollDiceNotation(rangeOrDice);
        } else {
            console.warn(`PQM: rollDiceNotation function not found globally for dice string: ${rangeOrDice}. Defaulting to 1.`);
            return 1;
        }
    }
    // Default for invalid input or if not array/string (e.g., single number for fixed amount)
    if (typeof rangeOrDice === 'number') return rangeOrDice;
    return 1;
}


// Make it globally accessible
if (typeof window !== 'undefined') {
    // Depends on gameState, assetManager, factionManager, questManager, npcManager, mapUtils
    // Defer instantiation to main script's initialize function
    // Example in main script:
    // window.proceduralQuestManager = new ProceduralQuestManager(window.gameState, window.assetManager, window.factionManager, window.questManager);
    // npcManager and mapUtils are now expected to be globally available as window.npcManager and window.mapUtils when PQM is instantiated.
}
window.ProceduralQuestManager = ProceduralQuestManager;
