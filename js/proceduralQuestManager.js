// js/proceduralQuestManager.js

class ProceduralQuestManager {
    constructor(gameState, assetManager, factionManager, questManager, npcManager, mapUtils) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.factionManager = factionManager;
        this.questManager = questManager; // To add to activeQuests
        this.npcManager = npcManager;     // For finding/placing NPCs
        this.mapUtils = mapUtils;         // For location-based objective generation
        this.questTemplates = {};
    }

    initialize() {
        if (!this.assetManager) {
            logToConsole("ProceduralQuestManager Error: AssetManager not available.", "error");
            return false;
        }
        const templatesData = this.assetManager.getDefinition('procedural_quest_templates');
        if (templatesData) {
            templatesData.forEach(template => {
                this.questTemplates[template.id] = template;
            });
            logToConsole(`ProceduralQuestManager: Loaded ${Object.keys(this.questTemplates).length} quest templates.`, "info");
        } else {
            logToConsole("ProceduralQuestManager Error: Could not load procedural_quest_templates.json.", "error");
            return false;
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
        return `procquest_${templateId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
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

            // TODO: Add more conditions: player level, active quests of this type, global flags
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
            const recipientNpc = this.npcManager.findNpcByTagOrId(generatedDetails.recipientNpcTag, generatedDetails.destinationAreaKey);
            const destinationLocation = this.mapUtils.getNamedLocationCoords(generatedDetails.destinationAreaKey);

            if (!itemDef || !recipientNpc || !destinationLocation) {
                logToConsole(`PQM Error: Could not generate details for delivery quest ${selectedTemplate.id} (item, NPC, or location missing).`, "error");
                return null;
            }
            generatedDetails.recipientNpcId = recipientNpc.id;
            generatedDetails.destinationCoords = destinationLocation.coords;

            finalDescription = finalDescription.replace("{itemName}", itemDef.name)
                .replace("{recipientName}", recipientNpc.name)
                .replace("{destinationName}", destinationLocation.name || generatedDetails.destinationAreaKey);
            finalDisplayName = finalDisplayName.replace("{itemName}", itemDef.name); // If pattern uses it
        }
        // Add more else if blocks for other quest types (scout_location, retrieve_item_from_area_or_npcs)

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
        // TODO: Update Quest Log UI
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
            // TODO: Update Quest Log UI
        }
    }


    getQuestDetails(questInstanceId) {
        let quest = this.gameState.availableProceduralQuests.find(q => q.questInstanceId === questInstanceId);
        if (quest) return quest;
        quest = this.gameState.activeQuests.find(q => q.questInstanceId === questInstanceId);
        // Could also check completedQuests if needed
        return quest;
    }

    // This would be called by questManager when a relevant game event happens (e.g. NPC killed)
    checkObjectiveCompletion(eventData) {
        // eventData could be { type: "npc_killed", npcId: "...", npcTags: [...] }
        // or { type: "item_delivered", itemId: "...", recipientId: "..." }
        let questLogNeedsUpdate = false;
        this.gameState.activeQuests.forEach(quest => {
            if (quest.status === "active" && quest.isProcedural) {
                const details = quest.generatedDetails;
                let objectiveCompletedThisCheck = false;

                if (details.type === "kill_tagged_npcs_in_area" && eventData.type === "npc_killed") {
                    if (eventData.npcTags.includes(details.npcTag)) {
                        // Optional: Check if killed NPC was in the targetArea if that's strict
                        const objective = quest.objectives.find(o => o.targetCount); // Assume one kill objective
                        if (objective && !objective.completed) {
                            objective.currentCount = (objective.currentCount || 0) + 1;
                            logToConsole(`PQM: Kill objective for "${quest.displayName}" updated: ${objective.currentCount}/${objective.targetCount} ${details.npcTag}s.`, "info");
                            if (objective.currentCount >= objective.targetCount) {
                                objective.completed = true;
                                objectiveCompletedThisCheck = true;
                            }
                            questLogNeedsUpdate = true;
                        }
                    }
                } else if (details.type === "deliver_item_to_npc_at_location" && eventData.type === "item_given_to_npc") {
                    if (eventData.itemId === details.actualItemId && eventData.recipientNpcId === details.recipientNpcId) {
                        // Optional: Check if player is at details.destinationCoords (or if NPC is there)
                        const objective = quest.objectives.find(o => o.text.startsWith("Deliver"));
                        if (objective && !objective.completed) {
                            objective.completed = true;
                            objectiveCompletedThisCheck = true;
                            logToConsole(`PQM: Delivery objective for "${quest.displayName}" completed.`, "info");
                            questLogNeedsUpdate = true;
                        }
                    }
                }
                // Add more objective type checks

                if (objectiveCompletedThisCheck && quest.objectives.every(obj => obj.completed)) {
                    this.completeProceduralQuest(quest.questInstanceId);
                }
            }
        });
        if (questLogNeedsUpdate) {
            // TODO: Signal Quest Log UI to refresh
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

            // Apply rewards
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
                    const targetFactionId = repChange.factionIdSource ? quest.factionId : repChange.factionId;
                    this.factionManager.adjustPlayerReputation(targetFactionId, repChange.amount, `quest_completed_${quest.templateId}`);
                }
                if (quest.reward.itemPoolReward && window.inventoryManager && window.assetManager) {
                    // Placeholder: Grant one random item from the pool
                    const poolId = Array.isArray(quest.reward.itemPoolReward) ? quest.reward.itemPoolReward[Math.floor(Math.random() * quest.reward.itemPoolReward.length)] : quest.reward.itemPoolReward;
                    // This assumes itemPoolReward is an array of item IDs or a single item ID.
                    // A real item pool system would be more complex (e.g. defined in items.json or loot_pools.json)
                    const itemDef = this.assetManager.getItem(poolId);
                    if (itemDef) {
                        window.inventoryManager.addItemToInventoryById(itemDef.id, 1);
                        logToConsole(`Awarded item: ${itemDef.name} from reward pool.`, "lime");
                    }
                }
            }
            if (window.renderCharacterInfo) window.renderCharacterInfo();
            if (window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
            // TODO: Update Quest Log UI
        }
    }

}


// Helper for dice notation like "1d4+1" or a range [min, max]
function rollDiceNotationRange(rangeOrDice) {
    if (Array.isArray(rangeOrDice) && rangeOrDice.length === 2) {
        return Math.floor(Math.random() * (rangeOrDice[1] - rangeOrDice[0] + 1)) + rangeOrDice[0];
    } else if (typeof rangeOrDice === 'string') {
        return rollDiceNotation(rangeOrDice); // Assumes global rollDiceNotation
    }
    return 1; // Default
}


// Make it globally accessible
if (typeof window !== 'undefined') {
    // Depends on gameState, assetManager, factionManager, questManager, npcManager, mapUtils
    // Defer instantiation to main script's initialize function
    // window.proceduralQuestManager = new ProceduralQuestManager(window.gameState, window.assetManager, window.factionManager, window.questManager, window.npcManager, window.mapUtils);
}
