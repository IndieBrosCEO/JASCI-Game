// js/xpManager.js

const XPManager = {
    config: {
        baseXpForCR1: 50, // Base XP for a Challenge Rating 1 creature
        minXpAward: 5      // Minimum XP to award, even for CR < 1
    },

    /**
     * Calculates the XP award for defeating an entity with a given Challenge Rating (CR).
     * @param {number} cr - The Challenge Rating of the defeated entity.
     * @returns {number} The calculated XP amount.
     */
    calculateXpForKill: function (cr) {
        if (typeof cr !== 'number' || cr <= 0) {
            return this.config.minXpAward; // Award minimum XP for undefined or very low CR
        }
        // Simple linear scaling for now. Can be made more complex (e.g., exponential, table-based).
        const calculatedXp = Math.round(this.config.baseXpForCR1 * cr);
        return Math.max(this.config.minXpAward, calculatedXp);
    },

    /**
     * Awards XP to the player and handles level-up checks.
     * @param {number} amount - The amount of XP to award.
     * @param {object} gameState - The global game state.
     */
    awardXp: function (amount, gameState) {
        if (typeof amount !== 'number' || amount <= 0) {
            return;
        }

        gameState.playerXP = (gameState.playerXP || 0) + amount;
        logToConsole(`Player awarded ${amount} XP. Total XP: ${gameState.playerXP}.`, 'lime');

        // Check for level up - assumes characterManager.js and checkForLevelUp exist
        if (window.characterManager && typeof window.characterManager.checkForLevelUp === 'function') {
            // Primary mechanism: characterManager handles the actual level up logic.
            window.characterManager.checkForLevelUp(gameState);
        } else {
            // Fallback logging if characterManager or its checkForLevelUp is missing.
            // The actual leveling logic resides in characterManager.js (or Character class instance).
            // This block is just a redundant check and log, not performing the level up itself.
            const xpForNextLevel = (typeof window.characterManager?.getXPForLevel === 'function'
                ? window.characterManager.getXPForLevel(gameState.level + 1)
                : (300 * Math.pow(gameState.level, 1.5))); // Simplified fallback for XP threshold
            if (gameState.playerXP >= xpForNextLevel) {
                logToConsole("XPManager: Level up condition potentially met based on fallback check. Ensure characterManager.checkForLevelUp() is functioning.", "yellow");
            }
        }

        // Update UI if renderCharacterInfo is available
        if (typeof window.renderCharacterInfo === 'function') {
            window.renderCharacterInfo();
        }
    }
};

// Make it globally accessible
window.xpManager = XPManager;

logToConsole("XPManager initialized.", "blue");
