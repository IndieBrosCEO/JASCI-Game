// js/xpManager.js

class XpManager {
    constructor(gameState, assetManager) {
        this.gameState = gameState;
        this.assetManager = assetManager; // Store the assetManager
        this.levelCurve = []; // Initialize levelCurve
        this.initialize();
    }

    initialize() {
        // Get the level curve from the assetManager
        if (this.assetManager && typeof this.assetManager.getLevelCurve === 'function') {
            this.levelCurve = this.assetManager.getLevelCurve();
            if (this.levelCurve.length === 0) {
                console.warn("XpManager: Level curve is empty or not loaded by AssetManager.");
            }
        } else {
            console.error("XpManager: AssetManager not provided or getLevelCurve method is missing.");
        }
    }

    /**
     * Awards XP to the player.
     * @param {string} sourceId - The source of the XP (e.g., 'kill', 'quest_complete').
     * @param {number} amount - The amount of XP to award.
     * @param {object} [metadata={}] - Optional metadata about the XP award.
     */
    awardXp(sourceId, amount, metadata = {}) {
        if (typeof amount !== 'number' || amount <= 0) {
            return;
        }

        if (metadata.idempotencyKey) {
            if (this.gameState.processedIdempotencyKeys.has(metadata.idempotencyKey)) {
                return; // Idempotency key already processed, do not award XP again.
            }
            this.gameState.processedIdempotencyKeys.add(metadata.idempotencyKey);
        }

        const beforeXp = this.gameState.totalXp;
        this.gameState.totalXp += amount;
        const afterXp = this.gameState.totalXp;

        if (window.EventManager) {
            window.EventManager.dispatch('xp:awarded', {
                sourceId,
                amount,
                before: beforeXp,
                after: afterXp,
                metadata
            });
        }
    }

    /**
     * Sets the player's total XP to a specific amount.
     * @param {number} amount - The amount to set the total XP to.
     */
    setXp(amount) {
        if (typeof amount !== 'number' || amount < 0) {
            return;
        }

        const beforeXp = this.gameState.totalXp;
        this.gameState.totalXp = amount;
        const afterXp = this.gameState.totalXp;

        if (window.EventManager) {
            const changeAmount = afterXp - beforeXp;
            window.EventManager.dispatch('xp:awarded', {
                sourceId: 'setxp_command',
                amount: changeAmount,
                before: beforeXp,
                after: afterXp,
                metadata: {}
            });
        }
    }
}

// Expose the class to the global scope
window.XpManager = XpManager;
