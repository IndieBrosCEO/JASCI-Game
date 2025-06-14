// js/npcScheduler.js
class NpcScheduler {
    constructor(campaignMgr) {
        this.campaignManager = campaignMgr;
        // Assumes gameState will be globally available or passed to updateSchedules
        this.npcStates = new Map(); // Stores current scheduled action for NPCs: npcId -> { currentEntry, entryStartTime }
    }

    updateSchedules(currentGameState) { // Accepts gameState
        if (!this.campaignManager || !currentGameState || !this.campaignManager.getActiveCampaignNpcs()) {
            // console.warn("NpcScheduler: CampaignManager, GameState, or NPCs not available.");
            return;
        }

        const currentTime = currentGameState.currentTime;
        if (!currentTime || typeof currentTime.hours === 'undefined' || typeof currentTime.minutes === 'undefined') {
            console.warn("NpcScheduler: Current time not available in gameState or invalid format.");
            return;
        }

        const npcs = this.campaignManager.getActiveCampaignNpcs();
        if (!npcs) return;

        npcs.forEach(npc => {
            if (npc.scheduleId) {
                const scheduleData = this.campaignManager.getScheduleData(npc.scheduleId);
                if (scheduleData && scheduleData.entries) {
                    this.processNpcSchedule(npc, scheduleData, currentTime);
                }
            }
        });
    }

    processNpcSchedule(npc, scheduleData, currentTime) {
        const currentTotalMinutes = currentTime.hours * 60 + currentTime.minutes;
        let bestEntry = null;
        let bestEntryStartMinutes = -1;

        for (const entry of scheduleData.entries) {
            const entryTimeParts = entry.time.split(':');
            const entryStartMinutes = parseInt(entryTimeParts[0]) * 60 + parseInt(entryTimeParts[1]);

            if (entry.duration) {
                const durationParts = entry.duration.match(/(\d+)([hm])/);
                let durationMinutes = 0;
                if (durationParts) {
                    const value = parseInt(durationParts[1]);
                    if (durationParts[2] === 'h') durationMinutes = value * 60;
                    else if (durationParts[2] === 'm') durationMinutes = value;
                }
                // Entry is active if current time is within [entryStartMinutes, entryStartMinutes + durationMinutes)
                if (currentTotalMinutes >= entryStartMinutes && currentTotalMinutes < entryStartMinutes + durationMinutes) {
                    bestEntry = entry;
                    bestEntryStartMinutes = entryStartMinutes; // Keep track for tie-breaking (though current logic picks last valid)
                    break; // Found an active entry with duration, this is the one.
                }
            } else {
                // No duration: entry is valid if it's the latest one that has started
                if (entryStartMinutes <= currentTotalMinutes) {
                    if (!bestEntry || entryStartMinutes > bestEntryStartMinutes) {
                        bestEntry = entry;
                        bestEntryStartMinutes = entryStartMinutes;
                    }
                }
            }
        }

        // If no entry matched (e.g., current time is before any timed entry with duration, or after all entries without duration)
        // A common fallback is to take the last entry of the day if it's meant to span overnight,
        // or the entry immediately preceding the current time if none are "active with duration".
        // The current logic for "no duration" entries handles picking the latest past entry.
        // If all entries have durations and none are active, it means NPC is "between" scheduled activities.
        // For now, if bestEntry is still null, it means no specific action is scheduled.

        const currentState = this.npcStates.get(npc.id);
        if (bestEntry) {
            // Check if the action or its specific time has changed
            if (!currentState || currentState.entry.time !== bestEntry.time || currentState.entry.action !== bestEntry.action) {
                this.npcStates.set(npc.id, { entry: bestEntry, entryStartTimeMinutes: bestEntryStartMinutes });
                console.log(`NpcScheduler: NPC ${npc.name} (${npc.id}) updated to schedule entry: ${bestEntry.action} at map ${bestEntry.mapId} (waypoint ${JSON.stringify(bestEntry.waypoint)}) starting ${bestEntry.time}. Current game time: ${currentTime.hours}:${String(currentTime.minutes).padStart(2, '0')}`);
                // TODO: Trigger NPC movement to waypoint if mapId and waypoint match current NPC location.
                // TODO: If mapId differs, this implies NPC should "teleport" or be moved to that map.
                // This logic will likely be handled by a system that observes npcStates changes.
            }
        } else if (currentState) {
            this.npcStates.delete(npc.id);
            console.log(`NpcScheduler: NPC ${npc.name} (${npc.id}) has no current schedule entry. Was: ${currentState.entry.action}. Current game time: ${currentTime.hours}:${String(currentTime.minutes).padStart(2, '0')}`);
        }
    }

    getNpcCurrentScheduleAction(npcId) {
        return this.npcStates.get(npcId);
    }
}

// Global instance or passed around:
// Example: const npcScheduler = new NpcScheduler(campaignManager);
// To use: npcScheduler.updateSchedules(gameState);
