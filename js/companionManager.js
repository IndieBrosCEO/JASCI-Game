// js/companionManager.js

class CompanionManager {
    constructor(gameState, assetManager, factionManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.factionManager = factionManager; // For reputation checks
        // Initialization of definitions is not strictly needed if assetManager handles it,
        // but could be a place to cache specific companion-related NPC defs if performance becomes an issue.
    }

    initialize() {
        if (!this.gameState.companions) {
            this.gameState.companions = [];
        }
        logToConsole("CompanionManager initialized.", "info");
    }

    getNpcInstance(npcId) {
        return this.gameState.npcs.find(npc => npc.id === npcId);
    }

    getNpcDefinition(npcDefinitionId) {
        return this.assetManager.getNpc(npcDefinitionId);
    }

    canRecruitNpc(npcId) {
        const npc = this.getNpcInstance(npcId);
        if (!npc) {
            logToConsole(`canRecruitNpc: NPC instance ${npcId} not found.`, "warn");
            return false;
        }
        const npcDef = this.getNpcDefinition(npc.definitionId);
        if (!npcDef || !npcDef.isRecruitable) {
            return false;
        }

        const reqs = npcDef.recruitmentRequirements;
        if (!reqs) return true; // No requirements means recruitable if isRecruitable is true

        // Check quest completion
        if (reqs.questCompleted && !this.gameState.completedQuests.includes(reqs.questCompleted)) {
            logToConsole(`Recruitment requirement for ${npc.name}: Quest "${reqs.questCompleted}" not completed.`, "info");
            return false;
        }

        // Check reputation
        if (reqs.reputation) {
            const playerRep = this.factionManager.getPlayerReputation(reqs.reputation.factionId); // Gets numerical score
            const requiredRepStatus = this.factionManager.getReputationStatus(reqs.reputation.level); // Converts "friendly" to numerical threshold range

            if (!playerRep || playerRep < requiredRepStatus.minThreshold) { // Simplified: assumes level means "at least this good"
                logToConsole(`Recruitment requirement for ${npc.name}: Reputation with ${reqs.reputation.factionId} not high enough (needs ${reqs.reputation.level}). Player: ${playerRep}`, "info");
                return false;
            }
        }

        // Check item (player must possess it - does NOT consume yet)
        if (reqs.item) {
            if (!window.inventoryManager || !window.inventoryManager.hasItem(reqs.item, 1)) {
                logToConsole(`Recruitment requirement for ${npc.name}: Missing item "${reqs.item}".`, "info");
                return false;
            }
        }

        // Skill check requirement will be handled in attemptRecruitNpc as it involves a roll.
        // Here, we just check if other pre-requisites are met.
        return true;
    }

    attemptRecruitNpc(npcId) {
        const npc = this.getNpcInstance(npcId);
        if (!npc) {
            logToConsole(`attemptRecruitNpc: NPC instance ${npcId} not found.`, "error");
            return { success: false, reason: "NPC not found." };
        }
        const npcDef = this.getNpcDefinition(npc.definitionId);
        if (!npcDef || !npcDef.isRecruitable) {
            return { success: false, reason: "NPC is not recruitable." };
        }
        if (this.gameState.companions.includes(npcId) || npc.isFollowingPlayer) {
            logToConsole(`${npc.name} is already a companion.`, "info");
            return { success: false, reason: "Already a companion." };
        }

        if (!this.canRecruitNpc(npcId)) { // Checks quests, reputation, basic item presence
            // canRecruitNpc already logs the specific reason
            return { success: false, reason: "Prerequisites not met (quest, reputation, or item)." };
        }

        const reqs = npcDef.recruitmentRequirements;

        // Perform skill check if required
        if (reqs && reqs.skillCheck) {
            const skillName = reqs.skillCheck.skill;
            const dc = reqs.skillCheck.dc;
            const playerSkillValue = getSkillValue(skillName, this.gameState); // Assumes getSkillValue is global
            const roll = rollDie(20); // Assumes rollDie is global
            const totalRoll = roll + getSkillModifier(skillName, this.gameState); // Assumes getSkillModifier

            logToConsole(`Attempting ${skillName} check for recruiting ${npc.name}. DC: ${dc}. Player rolled ${roll} + mod ${getSkillModifier(skillName, this.gameState)} = ${totalRoll}`, "event");
            if (totalRoll < dc) {
                logToConsole(`Recruitment skill check failed for ${npc.name}.`, "event");
                return { success: false, reason: `Skill check (${skillName} DC ${dc}) failed. Rolled ${totalRoll}.`, rollResult: { roll: roll, total: totalRoll, dc: dc, skill: skillName } };
            }
            logToConsole(`Recruitment skill check passed for ${npc.name}.`, "event-success");
        }

        // Consume item if required (AFTER skill check passes, if any)
        if (reqs && reqs.item) {
            if (window.inventoryManager && window.inventoryManager.removeItemByNameOrId(reqs.item, 1)) {
                logToConsole(`Consumed item "${reqs.item}" for recruiting ${npc.name}.`, "info");
            } else {
                logToConsole(`Failed to consume required item "${reqs.item}" for ${npc.name} (should have been checked by canRecruit). This is an issue.`, "error");
                return { success: false, reason: `Failed to consume required item ${reqs.item}.` };
            }
        }


        // Add to companions
        this.gameState.companions.push(npcId);
        npc.isFollowingPlayer = true;
        npc.currentOrders = "follow_close"; // Default order
        npc.loyalty = npcDef.initialLoyalty || 50; // Default loyalty or from definition

        // Optionally change NPC's faction relationship to player to 'ally'
        // This might be complex and depends on how factionManager handles dynamic relationships.
        // For now, this is a placeholder.
        // this.factionManager.setDirectRelationship(npc.factionId, this.gameState.player.factionId, 'ally');

        logToConsole(`${npc.name} has joined your party!`, "event-success");
        // TODO: Award XP? e.g., window.xpManager.awardXp('recruit_companion');

        // DialogueManager will handle navigating to the "recruited" dialogue node.
        return { success: true, reason: `${npc.name} recruited.` };
    }

    dismissCompanion(npcId) {
        const npc = this.getNpcInstance(npcId);
        if (!npc) {
            logToConsole(`dismissCompanion: NPC instance ${npcId} not found.`, "error");
            return false;
        }

        const companionIndex = this.gameState.companions.indexOf(npcId);
        if (companionIndex > -1) {
            this.gameState.companions.splice(companionIndex, 1);
        }

        npc.isFollowingPlayer = false;
        npc.currentOrders = null;
        // TODO: Revert NPC behavior to their default (e.g., patrol, idle, original faction behavior)
        // This might involve setting npc.behavior = npcDef.originalBehavior or similar.
        // For now, their AI in npcDecisions.js will simply not execute follower logic.

        logToConsole(`${npc.name} has left your party.`, "event");
        // DialogueManager will handle navigating to the "dismissed" dialogue node.
        return true;
    }

    getCompanionById(npcId) { // This is more of a convenience, could just use getNpcInstance
        if (this.gameState.companions.includes(npcId)) {
            return this.getNpcInstance(npcId);
        }
        return null;
    }

    setCompanionOrder(npcId, order) {
        const companion = this.getCompanionById(npcId);
        if (companion) {
            const validOrders = ["follow_close", "wait_here", "attack_aggressively", "defend_point", "scavenge_area"]; // Add more as developed
            if (validOrders.includes(order)) {
                companion.currentOrders = order;
                logToConsole(`${companion.name} new orders: ${order}.`, "info");
                // TODO: Play confirmation sound
                return true;
            } else {
                logToConsole(`Invalid order "${order}" for ${companion.name}.`, "warn");
                return false;
            }
        }
        logToConsole(`setCompanionOrder: Companion ${npcId} not found or not currently in party.`, "warn");
        return false;
    }

    adjustLoyalty(npcId, amount, reason = "") {
        const companion = this.getCompanionById(npcId);
        if (companion) {
            if (typeof companion.loyalty !== 'number') {
                companion.loyalty = 50; // Initialize if missing
            }
            companion.loyalty += amount;
            companion.loyalty = Math.max(0, Math.min(100, companion.loyalty)); // Clamp 0-100

            let logMessage = `${companion.name}'s loyalty changed by ${amount} to ${companion.loyalty}.`;
            if (reason) {
                logMessage += ` Reason: ${reason}.`;
            }
            logToConsole(logMessage, "info");

            // TODO: Implement loyalty effects (e.g., leaving if too low, bonuses if high)
            if (companion.loyalty <= 10) {
                logToConsole(`${companion.name} is very unhappy and might leave soon!`, "warn");
            }
            return true;
        }
        logToConsole(`adjustLoyalty: Companion ${npcId} not found.`, "warn");
        return false;
    }

    // Helper to check if an NPC is currently a companion
    isCompanion(npcId) {
        return this.gameState.companions.includes(npcId);
    }
}

// Make it globally accessible or manage through a central registry
if (typeof window !== 'undefined') {
    // Depends on gameState, assetManager, factionManager
    // Ensure these are available on window before instantiation or pass them in.
    // Initialization should happen after assetManager has loaded definitions.
    // window.companionManager = new CompanionManager(window.gameState, window.assetManager, window.factionManager);
    // Defer instantiation to main script's initialize function
}
