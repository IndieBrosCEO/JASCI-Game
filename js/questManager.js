class QuestManager {
    constructor(gameState, assetManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.questDefinitions = {};

        // Ensure quest state exists in gameState
        if (!this.gameState.activeQuests) {
            this.gameState.activeQuests = [];
        }
        if (!this.gameState.completedQuests) {
            this.gameState.completedQuests = [];
        }

        // This should be called after assetManager loads quests
        this.loadQuests();
    }

    loadQuests() {
        if (this.assetManager.quests) {
            this.questDefinitions = this.assetManager.quests;
        }
    }

    getQuest(questId) {
        if (this.questDefinitions[questId]) {
            return this.questDefinitions[questId];
        }
        // Fallback: check if assetManager has them now (if loaded late)
        if (this.assetManager.quests && this.assetManager.quests[questId]) {
            return this.assetManager.quests[questId];
        }
        return null;
    }

    startQuest(questId) {
        const questDef = this.getQuest(questId);
        if (!questDef) {
            console.warn(`QuestManager: Quest definition not found for ${questId}`);
            return false;
        }

        // Check if already active or completed
        if (this.gameState.activeQuests.some(q => q.id === questId)) {
            console.log(`QuestManager: Quest ${questId} is already active.`);
            return false;
        }
        if (this.gameState.completedQuests.some(q => q.id === questId)) {
            console.log(`QuestManager: Quest ${questId} is already completed.`);
            return false;
        }

        const questInstance = {
            id: questId,
            title: questDef.title,
            description: questDef.description,
            objectives: JSON.parse(JSON.stringify(questDef.objectives)), // Deep copy
            status: 'active'
        };

        this.gameState.activeQuests.push(questInstance);
        console.log(`QuestManager: Started quest ${questDef.title}`);
        if (window.uiManager && window.uiManager.showToastNotification) {
            window.uiManager.showToastNotification(`Quest Started: ${questDef.title}`);
        }

        // Trigger onAccept hooks
        if (questDef.onAccept) {
            this.processQuestTrigger(questDef.onAccept);
        }

        return true;
    }

    processQuestTrigger(triggers) {
        if (!Array.isArray(triggers)) triggers = [triggers];

        triggers.forEach(trigger => {
            if (trigger.type === 'reputation_change') {
                if (window.factionManager) {
                    window.factionManager.adjustPlayerReputation(trigger.factionId, trigger.amount, this.gameState);
                }
            } else if (trigger.type === 'advance_clock') {
                if (!window.clockManager && window.ClockManager && this.gameState) {
                    window.clockManager = new window.ClockManager(this.gameState);
                }
                if (window.clockManager) {
                    window.clockManager.advanceClock(trigger.clockId, trigger.amount);
                } else {
                    console.warn("QuestManager: ClockManager not available to advance clock.");
                }
            } else if (trigger.type === 'spawn_npc') {
                if (window.npcManager) {
                    // trigger.npcId, trigger.x, trigger.y...
                    // Simplified support
                }
            }
        });
    }

    updateObjective(type, target, amount = 1, questId = null) {
        let updated = false;
        this.gameState.activeQuests.forEach(quest => {
            if (quest.status !== 'active') return;
            // If a specific questId is provided, skip others
            if (questId && quest.id !== questId) return;

            let questUpdated = false;
            quest.objectives.forEach(obj => {
                if (obj.type === type && obj.target === target && obj.current < obj.count) {
                    obj.current += amount;
                    if (obj.current > obj.count) obj.current = obj.count;
                    questUpdated = true;
                    updated = true;
                }
            });

            if (questUpdated) {
                console.log(`QuestManager: Updated progress for quest ${quest.title}`);
                this.checkQuestCompletion(quest);
            }
        });
        return updated;
    }

    checkQuestCompletion(quest) {
        const allComplete = quest.objectives.every(obj => obj.current >= obj.count);
        if (allComplete) {
            this.completeQuest(quest.id);
        }
    }

    completeQuest(questId) {
        const index = this.gameState.activeQuests.findIndex(q => q.id === questId);
        if (index === -1) return;

        const quest = this.gameState.activeQuests[index];
        const questDef = this.getQuest(questId);

        quest.status = 'completed';
        this.gameState.activeQuests.splice(index, 1);
        this.gameState.completedQuests.push(quest);

        console.log(`QuestManager: Completed quest ${quest.title}`);
        if (window.uiManager && window.uiManager.showToastNotification) {
            window.uiManager.showToastNotification(`Quest Completed: ${quest.title}`);
        }

        // Trigger onComplete hooks
        if (questDef.onComplete) {
            this.processQuestTrigger(questDef.onComplete);
        }

        // Rewards
        if (questDef && questDef.rewards) {
            this.grantRewards(questDef.rewards);
        }
    }

    grantRewards(rewards) {
        if (rewards.xp) {
            if (window.xpManager) {
                window.xpManager.awardXP(rewards.xp, "Quest Completion");
            }
        }
        if (rewards.gold) {
            // Assuming gold is tracked in gameState.player.gold or similar
            // Memory says gameState.playerGold
            this.gameState.playerGold = (this.gameState.playerGold || 0) + rewards.gold;
            console.log(`Rewarded ${rewards.gold} gold.`);
        }
        if (rewards.items) {
             if (window.inventoryManager) {
                 rewards.items.forEach(item => {
                     // item could be string id or object {id, qty}
                     if (typeof item === 'string') {
                         window.inventoryManager.addItemToInventoryById(item, 1);
                     } else {
                         window.inventoryManager.addItemToInventoryById(item.id, item.qty || 1);
                     }
                 });
             }
        }

        // New Rewards: Reputation & Clocks
        if (rewards.reputation_change) {
            // Can be array or single object
            const reps = Array.isArray(rewards.reputation_change) ? rewards.reputation_change : [rewards.reputation_change];
            if (window.factionManager) {
                reps.forEach(rep => {
                    window.factionManager.adjustPlayerReputation(rep.factionId, rep.amount, this.gameState);
                });
            }
        }

        if (rewards.advance_clock) {
            const clocks = Array.isArray(rewards.advance_clock) ? rewards.advance_clock : [rewards.advance_clock];
            if (!window.clockManager && window.ClockManager && this.gameState) {
                window.clockManager = new window.ClockManager(this.gameState);
            }
            if (window.clockManager) {
                clocks.forEach(clk => {
                    window.clockManager.advanceClock(clk.clockId, clk.ticks || clk.amount || 1);
                });
            } else {
                console.warn("QuestManager: ClockManager not available to advance clock.");
            }
        }
    }
}

// Global exposure
window.QuestManager = QuestManager;
