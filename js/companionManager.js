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
        npc.currentOrders = "follow_close"; // Legacy support

        // New granular behaviors
        npc.companionSettings = {
            followMode: 'follow',       // 'follow', 'wait'
            followDistance: 'close',    // 'close' (3), 'far' (8)
            combatMode: 'passive',      // 'passive', 'aggressive'
            combatStyle: 'melee'        // 'melee', 'ranged'
        };

        // Attempt to determine preferred combat style from stats/tags
        if (npcDef.tags && npcDef.tags.includes('ranged')) npc.companionSettings.combatStyle = 'ranged';
        else if (getSkillValue('Guns', npc) > getSkillValue('MeleeWeapons', npc)) npc.companionSettings.combatStyle = 'ranged';

        npc.loyalty = npcDef.initialLoyalty || 50; // Default loyalty or from definition
        npc.teamId = this.gameState.player.teamId; // Align team with player

        logToConsole(`${npc.name} (Team ID: ${npc.teamId}) has joined your party! Aligned with player team.`, "event-success");

        if (window.xpManager && typeof window.xpManager.awardXp === 'function') {
            const xpAmount = 50; // Example XP for recruiting a companion
            window.xpManager.awardXp(xpAmount, this.gameState);
            logToConsole(`Awarded ${xpAmount} XP for recruiting ${npc.name}.`, "lime");
        } else {
            logToConsole("xpManager not available to award XP for recruitment.", "warn");
        }

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

        // Revert teamId to original definition's teamId
        const npcDef = this.getNpcDefinition(npc.definitionId);
        if (npcDef && npcDef.teamId !== undefined) {
            npc.teamId = npcDef.teamId;
            logToConsole(`${npc.name}'s teamId reverted to ${npc.teamId} (from definition).`, "info");
        } else if (npcDef) {
            // Fallback if definition has no teamId, make them neutral civilian-like, or based on factionId
            // For simplicity, let's try to infer a general teamId from their factionId if possible
            // This is a rough fallback. Ideally, all NPC defs have a teamId.
            const defaultFactionTeam = window.factionManager?.Factions[npc.factionId?.toUpperCase()]?.defaultTeamId || 2; // Default to team 2 (e.g. neutral/generic NPC)
            npc.teamId = defaultFactionTeam;
            logToConsole(`${npc.name}'s teamId defaulted to ${npc.teamId} based on faction or general default.`, "info");
        } else {
            logToConsole(`Could not find definition for ${npc.id} to revert teamId. NPC may behave unpredictably.`, "warn");
        }

        // Clear exploration target so they pick a new one based on their reverted alignment/AI.
        if (npc.memory) {
            npc.memory.explorationTarget = null;
        }

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
            // Legacy mapping for compatibility
            if (order === "follow_close") {
                this.updateCompanionSetting(npcId, 'followMode', 'follow');
                this.updateCompanionSetting(npcId, 'followDistance', 'close');
            } else if (order === "wait_here") {
                this.updateCompanionSetting(npcId, 'followMode', 'wait');
            } else if (order === "attack_aggressively") {
                this.updateCompanionSetting(npcId, 'combatMode', 'aggressive');
            } else {
                // Set legacy property for other systems
                companion.currentOrders = order;
            }
            logToConsole(`${companion.name} legacy order set: ${order}.`, "info");
            return true;
        }
        logToConsole(`setCompanionOrder: Companion ${npcId} not found.`, "warn");
        return false;
    }

    updateCompanionSetting(npcId, setting, value) {
        const companion = this.getCompanionById(npcId);
        if (!companion) return false;

        if (!companion.companionSettings) {
            companion.companionSettings = {
                followMode: 'follow',
                followDistance: 'close',
                combatMode: 'passive',
                combatStyle: 'melee'
            };
        }

        // Loyalty Checks: Refuse dangerous/unwanted orders if loyalty is too low
        if (typeof companion.loyalty === 'number') {
            if (setting === 'combatMode' && value === 'aggressive' && companion.loyalty < 25) {
                logToConsole(`${companion.name} refuses to be aggressive! (Loyalty too low: ${companion.loyalty})`, "warn");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
                return false;
            }
            if (setting === 'followMode' && value === 'wait' && companion.loyalty < 20) {
                logToConsole(`${companion.name} refuses to stay behind! (Loyalty too low: ${companion.loyalty})`, "warn");
                if (window.audioManager) window.audioManager.playUiSound('ui_error_01.wav');
                return false;
            }
        }

        // Validation logic
        if (setting === 'combatStyle' && value === 'ranged') {
            // Check if they can use guns (e.g. not a dog)
            const npcDef = this.getNpcDefinition(companion.definitionId);
            if (npcDef && npcDef.tags && npcDef.tags.includes('animal')) {
                logToConsole(`${companion.name} cannot use ranged weapons.`, "warn");
                return false;
            }
        }

        companion.companionSettings[setting] = value;
        logToConsole(`${companion.name}: ${setting} set to ${value}.`, "info");
        if (window.audioManager) window.audioManager.playUiSound('ui_confirm_01.wav', { volume: 0.7 });
        return true;
    }

    toggleCompanionSetting(npcId, setting) {
        const companion = this.getCompanionById(npcId);
        if (!companion || !companion.companionSettings) return;

        let newValue;
        switch (setting) {
            case 'followMode':
                newValue = companion.companionSettings.followMode === 'follow' ? 'wait' : 'follow';
                break;
            case 'followDistance':
                newValue = companion.companionSettings.followDistance === 'close' ? 'far' : 'close';
                break;
            case 'combatMode':
                newValue = companion.companionSettings.combatMode === 'passive' ? 'aggressive' : 'passive';
                break;
            case 'combatStyle':
                newValue = companion.companionSettings.combatStyle === 'melee' ? 'ranged' : 'melee';
                break;
        }
        if (newValue) {
            this.updateCompanionSetting(npcId, setting, newValue);
        }
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

            if (companion.loyalty <= 5) { // Threshold for potential auto-dismissal
                logToConsole(`${companion.name}'s loyalty is critically low (${companion.loyalty}). They are leaving!`, "event-failure");
                this.dismissCompanion(npcId); // Companion leaves
                // Note: dismissCompanion itself logs the departure.
                // No need to return false from adjustLoyalty specifically because of this,
                // as the adjustment itself was successful. The consequence (leaving) is separate.
            } else if (companion.loyalty <= 15) { // Warning threshold
                logToConsole(`${companion.name} is very unhappy (Loyalty: ${companion.loyalty}) and might leave if it drops further!`, "warn");
            }
            // Note: Loyalty effects like order refusal and combat bonuses are implemented in updateCompanionSetting and CombatManager.
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
window.CompanionManager = CompanionManager;
