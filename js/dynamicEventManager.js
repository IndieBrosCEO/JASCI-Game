// js/dynamicEventManager.js

class DynamicEventManager {
    constructor(gameState, assetManager, /* npcManager (now global) */ weatherManager, questManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.npcManager = window.npcManager; // Use the global npcManager instance
        this.weatherManager = weatherManager;
        this.questManager = questManager; // For setting global flags via quest system
        this.eventTemplates = {};
        this.lastEventCheckTick = 0;
        this.EVENT_CHECK_INTERVAL = 600; // Check for new events every ~20 minutes (600 ticks * 2s/tick = 1200s = 20m)
        // Or, based on game hours: e.g. 30 ticks/hour * 4 hours = 120 ticks. For now, fixed ticks.
        this.spawnedNpcGroups = {}; // Tracks NPCs spawned by events: { eventInstanceId: { npcGroupId: [npcInstanceId1, ...] } }
    }

    initialize() {
        if (!this.assetManager) {
            logToConsole("DynamicEventManager Error: AssetManager not available.", "error");
            return false;
        }
        const allTemplatesObject = this.assetManager.getAllDynamicEventTemplates();
        if (allTemplatesObject && Object.keys(allTemplatesObject).length > 0) {
            this.eventTemplates = allTemplatesObject; // Direct assignment
            logToConsole(`DynamicEventManager: Loaded ${Object.keys(this.eventTemplates).length} event templates.`, "info");
        } else {
            logToConsole("DynamicEventManager Error: Could not load dynamic_event_templates from AssetManager or it was empty.", "error");
            this.eventTemplates = {}; // Ensure it's an empty object if loading failed
            return false;
        }

        if (!this.gameState.activeDynamicEvents) {
            this.gameState.activeDynamicEvents = [];
        }
        this.lastEventCheckTick = this.gameState.currentTurn || 0; // Initialize with current game turn/tick
        return true;
    }

    generateUniqueEventInstanceId(templateId) {
        return `${templateId}_evtinst_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }

    // This function would be called by the main game loop or turn manager
    masterUpdate(currentTick) {
        if (currentTick - this.lastEventCheckTick >= this.EVENT_CHECK_INTERVAL) {
            this.checkForNewEvents(currentTick);
            this.lastEventCheckTick = currentTick;
        }
        this.updateActiveEvents(currentTick);
    }

    checkForNewEvents(currentTick) {
        logToConsole("DynamicEventManager: Checking for new events...", "debug");
        for (const templateId in this.eventTemplates) {
            const template = this.eventTemplates[templateId];

            // Basic frequency check (simplified)
            // TODO: Implement proper weighted random chance based on frequency ("common", "uncommon", "rare")
            let roll = Math.random();
            let chance = 0.1; // Base chance for any event per check cycle
            if (template.frequency === "common") chance = 0.25;
            else if (template.frequency === "uncommon") chance = 0.1;
            else if (template.frequency === "rare") chance = 0.05;

            if (roll > chance) continue;

            // Check player level
            if (template.minPlayerLevel && this.gameState.level < template.minPlayerLevel) {
                continue;
            }

            // Check if a similar event is already active (e.g., don't stack multiple raids of same type)
            if (this.gameState.activeDynamicEvents.some(ev => ev.templateId === templateId)) {
                // logToConsole(`Event ${templateId} skipped, an instance is already active.`, "debug");
                continue;
            }

            // Check other global conditions if defined in template
            let allGlobalConditionsMet = true;
            if (template.globalConditions && Array.isArray(template.globalConditions)) {
                for (const condition of template.globalConditions) {
                    if (condition.type === "questCompleted") {
                        if (!this.gameState.completedQuests || !this.gameState.completedQuests.includes(condition.questId)) {
                            allGlobalConditionsMet = false; break;
                        }
                    } else if (condition.type === "worldFlag") {
                        // Assuming questFlags can be used as general world state flags
                        if (!this.gameState.questFlags || this.gameState.questFlags[condition.flag] !== condition.value) {
                            allGlobalConditionsMet = false; break;
                        }
                    } else {
                        logToConsole(`${this.logPrefix} Unknown global condition type '${condition.type}' for event '${template.id}'. Skipping condition.`, "warn");
                    }
                }
            }

            if (!allGlobalConditionsMet) {
                // logToConsole(`${this.logPrefix} Event ${template.id} skipped, global conditions not met.`, "debug");
                continue;
            }

            this.triggerEvent(template, currentTick);
        }
    }

    triggerEvent(template, currentTick) {
        const instanceId = this.generateUniqueEventInstanceId(template.id);
        const newEventInstance = {
            eventInstanceId: instanceId,
            templateId: template.id,
            displayName: template.displayName,
            startTimeTicks: currentTick,
            durationTicks: template.durationTicks, // Total duration from template
            currentDurationTicks: template.durationTicks, // Countdown timer
            stateData: {}, // For storing event-specific data like spawned NPC IDs
            resolutionConditions: template.resolutionConditions, // Copy conditions
            rewardsSuccess: template.rewards_success,
            rewardsFailure: template.rewards_failure,
            cleanupActions: template.cleanupActions
        };
        this.spawnedNpcGroups[instanceId] = {};

        logToConsole(`Dynamic Event Triggered: ${template.displayName} (ID: ${instanceId}). Duration: ${template.durationTicks} ticks.`, "event");

        // Apply initial effects
        template.effects.forEach(effect => {
            this.applyEffect(newEventInstance, effect);
        });

        this.gameState.activeDynamicEvents.push(newEventInstance);
    }

    applyEffect(eventInstance, effect) {
        logToConsole(`Applying effect type "${effect.type}" for event ${eventInstance.displayName}`, "debug");
        switch (effect.type) {
            case "spawn_npcs":
                if (this.npcManager && typeof this.npcManager.spawnNpcGroupInArea === 'function') {
                    const count = typeof effect.count === 'string' ? rollDiceNotation(effect.count) : effect.count;
                    // spawnNpcGroupInArea needs to return the list of spawned NPC instance IDs
                    const spawnedIds = this.npcManager.spawnNpcGroupInArea(effect.npcGroupId, effect.areaKey, count, effect.targetFactionIdForHostility, eventInstance.eventInstanceId);
                    if (spawnedIds && spawnedIds.length > 0) {
                        if (!this.spawnedNpcGroups[eventInstance.eventInstanceId][effect.npcGroupId]) {
                            this.spawnedNpcGroups[eventInstance.eventInstanceId][effect.npcGroupId] = [];
                        }
                        this.spawnedNpcGroups[eventInstance.eventInstanceId][effect.npcGroupId].push(...spawnedIds);
                        logToConsole(`Event ${eventInstance.displayName}: Spawned ${count} NPCs for group ${effect.npcGroupId} in ${effect.areaKey}. IDs: ${spawnedIds.join(', ')}`, "event");
                    } else {
                        logToConsole(`Event ${eventInstance.displayName}: Failed to spawn NPCs for group ${effect.npcGroupId}.`, "warn");
                    }
                } else {
                    logToConsole("DynamicEventManager Error: NpcManager or spawnNpcGroupInArea not available.", "error");
                }
                break;
            case "set_global_flag":
                if (this.questManager && typeof this.questManager.setGlobalFlag === 'function') {
                    this.questManager.setGlobalFlag(effect.flag, effect.value);
                    logToConsole(`Event ${eventInstance.displayName}: Set global flag "${effect.flag}" to ${effect.value}.`, "event");
                } else {
                    logToConsole("DynamicEventManager Error: QuestManager or setGlobalFlag not available.", "error");
                }
                break;
            case "broadcast_message":
                logToConsole(`EVENT BROADCAST (${effect.channel || 'general'}): ${effect.message}`, "event-critical");
                // TODO: Show this to player via a more prominent UI notification. 
                // Currently logged prominently. A dedicated game UI manager with toast/modal capability would be needed for more.
                // The existing check for window.uiManager.showToastNotification likely refers to a mapMaker UI or a planned game UI manager.
                if (window.uiManager && typeof window.uiManager.showToastNotification === 'function') { // This uiManager might be from mapMaker or a non-existent game one
                    window.uiManager.showToastNotification(effect.message, 'event', 6000);
                }
                break;
            case "force_weather":
                if (this.weatherManager && typeof this.weatherManager.forceWeather === 'function') {
                    this.weatherManager.forceWeather(effect.weatherType, effect.intensity, eventInstance.durationTicks, effect.zone);
                    logToConsole(`Event ${eventInstance.displayName}: Forced weather to ${effect.weatherType}.`, "event");
                } else {
                    logToConsole("DynamicEventManager Error: WeatherManager or forceWeather not available.", "error");
                }
                break;
            case "apply_map_effect":
                // Placeholder: This would interact with a system managing temporary map-wide or area-specific effects
                logToConsole(`Event ${eventInstance.displayName}: Applied map effect "${effect.effectType}". (Details: ${JSON.stringify(effect)})`, "event");
                // Example: gameState.activeMapEffects.push({ eventId: eventInstance.eventInstanceId, ...effect });
                break;
            // Add more effect types: spawn_item_cache, trigger_trap_wave, etc.
            default:
                logToConsole(`DynamicEventManager Warning: Unknown effect type "${effect.type}" for event.`, "warn");
        }
    }

    updateActiveEvents(currentTick) {
        for (let i = this.gameState.activeDynamicEvents.length - 1; i >= 0; i--) {
            const event = this.gameState.activeDynamicEvents[i];
            let eventResolved = false;

            if (event.currentDurationTicks > 0) {
                event.currentDurationTicks--;
            }

            // Check resolution conditions
            for (const condition of event.resolutionConditions) {
                let conditionMet = false;
                switch (condition.type) {
                    case "npcs_defeated_in_area":
                    case "npcs_eliminated_group": // Treat similarly for now
                        const groupIds = this.spawnedNpcGroups[event.eventInstanceId]?.[condition.npcGroupId];
                        if (groupIds && groupIds.length > 0) {
                            const allDefeated = groupIds.every(npcId => {
                                const npc = this.npcManager ? this.npcManager.getNpcById(npcId) : this.gameState.npcs.find(n => n.id === npcId);
                                return !npc || npc.health?.torso?.current <= 0;
                            });
                            if (allDefeated) conditionMet = true;
                        } else if (this.spawnedNpcGroups[event.eventInstanceId] && condition.npcGroupId && !this.spawnedNpcGroups[event.eventInstanceId][condition.npcGroupId]) {
                            // If the group was supposed to spawn but didn't (e.g. spawn failed or no definition)
                            // and the condition is to defeat them, this might be an auto-success or needs careful handling.
                            // For now, if no NPCs from that group are tracked for the event, assume condition cannot be met this way unless it was optional.
                            // logToConsole(`Resolution check for ${event.displayName}: NPC group ${condition.npcGroupId} not found in spawned list for this event.`, "debug");
                        }
                        break;
                    case "timer_expires":
                        if (event.currentDurationTicks <= 0) {
                            conditionMet = true;
                        }
                        break;
                    // Add more conditions: player_reaches_location, item_used, etc.
                }

                if (conditionMet) {
                    this.resolveEvent(event.eventInstanceId, condition.outcome);
                    eventResolved = true;
                    break;
                }
            }

            if (eventResolved) {
                this.gameState.activeDynamicEvents.splice(i, 1);
            } else if (event.currentDurationTicks <= 0 && !event.resolutionConditions.some(rc => rc.type === "timer_expires")) {
                // If duration ran out AND there was no explicit "timer_expires" condition leading to success/failure,
                // assume a default neutral outcome or implicit failure.
                logToConsole(`Event ${event.displayName} (ID: ${event.eventInstanceId}) timed out without explicit timer resolution. Resolving as neutral/default.`, "info");
                this.resolveEvent(event.eventInstanceId, "timeout_neutral"); // Default outcome
                this.gameState.activeDynamicEvents.splice(i, 1);
            }
        }
    }

    resolveEvent(eventInstanceId, outcome) {
        const eventInstance = this.gameState.activeDynamicEvents.find(ev => ev.eventInstanceId === eventInstanceId) ||
            this.spawnedNpcGroups[eventInstanceId] ? { eventInstanceId, displayName: `Completed Event ${eventInstanceId}` } : null; // Fallback for already removed events if cleanup needs it

        if (!eventInstance) {
            // It might have been resolved and removed in the same tick by another condition.
            // Or, this is called for cleanup after removal.
            // Check if we still have cleanup info for it.
            const templateIdFromInstanceId = eventInstanceId.split('_evtinst_')[0];
            const templateForCleanup = this.eventTemplates[templateIdFromInstanceId];

            if (templateForCleanup && templateForCleanup.cleanupActions) {
                logToConsole(`Resolving (cleanup phase) event instance ${eventInstanceId} with outcome: ${outcome}.`, "event");
                this.performCleanup(eventInstanceId, templateForCleanup.cleanupActions);
            } else {
                logToConsole(`DynamicEventManager Error: Event instance ${eventInstanceId} not found for resolution or cleanup.`, "warn");
            }
            return;
        }

        logToConsole(`Event ${eventInstance.displayName} (ID: ${eventInstance.eventInstanceId}) resolved with outcome: ${outcome}.`, "event-success");

        // Apply rewards based on outcome
        const rewardsKey = `rewards_${outcome}`; // e.g., rewards_success, rewards_player_failure_or_good_escort
        const rewards = eventInstance[rewardsKey] || (outcome === "success" ? eventInstance.rewardsSuccess : (outcome === "failure" ? eventInstance.rewardsFailure : []));

        if (rewards && rewards.length > 0) {
            rewards.forEach(reward => {
                switch (reward.type) {
                    case "xp":
                        if (this.gameState.player && typeof this.gameState.XP === 'number') { // gameState.XP holds player XP
                            this.gameState.XP += reward.amount;
                            logToConsole(`Player awarded ${reward.amount} XP. Total XP: ${this.gameState.XP}`, "lime");
                            if (window.renderCharacterInfo) window.renderCharacterInfo();
                        }
                        break;
                    case "reputation":
                        if (this.factionManager) {
                            this.factionManager.adjustPlayerReputation(reward.factionId, reward.amount, `event_${eventInstance.templateId}_${outcome}`);
                        }
                        break;
                    case "item_pool":
                        // Placeholder: Grant items from a loot pool definition
                        logToConsole(`Player to be awarded items from pool ${reward.poolId}, ${reward.rolls} rolls. (Loot system TBD)`, "lime");
                        break;
                    // Add more reward types
                }
            });
        }

        // Perform cleanup actions
        if (eventInstance.cleanupActions) {
            this.performCleanup(eventInstance.eventInstanceId, eventInstance.cleanupActions);
        }

        // Remove event from active list (if not already done by caller loop)
        const index = this.gameState.activeDynamicEvents.findIndex(ev => ev.eventInstanceId === eventInstanceId);
        if (index > -1) {
            this.gameState.activeDynamicEvents.splice(index, 1);
        }
    }

    performCleanup(eventInstanceId, cleanupActions) {
        if (!cleanupActions || cleanupActions.length === 0) return;
        logToConsole(`Performing cleanup for event instance ${eventInstanceId}...`, "debug");

        cleanupActions.forEach(action => {
            switch (action.type) {
                case "remove_global_flag":
                    if (this.questManager && typeof this.questManager.removeGlobalFlag === 'function') { // Or set to false
                        this.questManager.removeGlobalFlag(action.flag);
                    } else if (this.questManager && typeof this.questManager.setGlobalFlag === 'function') {
                        this.questManager.setGlobalFlag(action.flag, false);
                    }
                    break;
                case "despawn_npcs_by_group":
                    const groupNpcIds = this.spawnedNpcGroups[eventInstanceId]?.[action.npcGroupId];
                    if (groupNpcIds && this.npcManager && typeof this.npcManager.despawnNpcsByIds === 'function') {
                        this.npcManager.despawnNpcsByIds(groupNpcIds);
                        logToConsole(`Cleanup: Despawned NPCs from group ${action.npcGroupId} for event ${eventInstanceId}.`, "debug");
                    }
                    delete this.spawnedNpcGroups[eventInstanceId]?.[action.npcGroupId];
                    if (this.spawnedNpcGroups[eventInstanceId] && Object.keys(this.spawnedNpcGroups[eventInstanceId]).length === 0) {
                        delete this.spawnedNpcGroups[eventInstanceId];
                    }
                    break;
                case "remove_map_effect":
                    // Placeholder: gameState.activeMapEffects = gameState.activeMapEffects.filter(eff => eff.eventId !== eventInstanceId || eff.effectType !== action.effectType);
                    logToConsole(`Cleanup: Removed map effect "${action.effectType}" for event ${eventInstanceId}.`, "debug");
                    break;
                case "restore_weather":
                    if (this.weatherManager && typeof this.weatherManager.restorePreviousWeather === 'function') {
                        this.weatherManager.restorePreviousWeather();
                    }
                    break;
            }
        });
    }
}

// Make it globally accessible or manage through a central registry
if (typeof window !== 'undefined') {
    // Depends on gameState, assetManager, potentially NpcManager, WeatherManager, QuestManager
    // Ensure these are available on window before instantiation or pass them in.
    // Initialization should happen after assetManager has loaded definitions.
    // window.dynamicEventManager = new DynamicEventManager(window.gameState, window.assetManager, window.npcManager, window.weatherManager, window.questManager);
    // Defer instantiation to main script's initialize function
}
window.DynamicEventManager = DynamicEventManager;
