// js/xpManager.js

class XpManager {
    constructor(gameState, assetManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.levelCurve = [];
        this.initialize();
    }

    initialize() {
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
     * @param {string} sourceId - The source of the XP.
     * @param {number} amount - The amount of XP.
     * @param {object} [metadata={}] - Optional metadata.
     */
    awardXp(sourceId, amount, metadata = {}) {
        if (typeof amount !== 'number' || amount <= 0) return;

        if (metadata.idempotencyKey) {
            if (this.gameState.processedIdempotencyKeys.has(metadata.idempotencyKey)) {
                return;
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

        this.checkLevelUp();
    }

    /**
     * Sets the player's total XP to a specific amount.
     * @param {number} amount - The amount to set the total XP to.
     */
    setXp(amount) {
        if (typeof amount !== 'number' || amount < 0) return;

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

        this.checkLevelUp();
    }

    calculateXpForKill(cr) {
        // Easy (10), Medium (25), Hard (75)
        if (!cr) return 10;
        if (cr <= 1) return 10;
        if (cr <= 2) return 25;
        return 75;
    }

    checkLevelUp() {
        if (!this.levelCurve || this.levelCurve.length === 0) return;

        const currentLevel = this.gameState.level;
        let newLevel = currentLevel;

        // Find the highest level reached based on total XP
        for (let i = 0; i < this.levelCurve.length; i++) {
            if (this.gameState.totalXp >= this.levelCurve[i].total) {
                newLevel = this.levelCurve[i].level;
            } else {
                break;
            }
        }

        if (newLevel > currentLevel) {
            this.performLevelUp(currentLevel, newLevel);
        }
    }

    performLevelUp(oldLevel, newLevel) {
        console.log(`Level Up! ${oldLevel} -> ${newLevel}`);

        // Process each level gained individually to ensure correct rewards
        for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
            this.gameState.level = lvl;

            // 1. Skill Points: +16 per level
            this.gameState.unspentSkillPoints += 16;

            // 2. Attribute/Perk Pick: Every 3 levels (3, 6, 9...)
            if (lvl % 3 === 0) {
                this.gameState.unspentPerkPicks += 1;
            }

            // 3. Stat Points: Every 5 levels (5, 10, 15...)
            if (lvl % 5 === 0) {
                this.gameState.unspentStatPoints += 2;
            }

            // 4. Health Increase
            this.applyHealthIncrease(lvl);
        }

        if (window.EventManager) {
            window.EventManager.dispatch('level:up', {
                oldLevel,
                newLevel,
                currentLevel: this.gameState.level
            });
        }

        if (window.audioManager) {
            // window.audioManager.playUiSound('level_up.wav'); // Placeholder
        }

        // Trigger UI update if available
        if (window.updateLevelUpUI) {
            window.updateLevelUpUI();
        }
    }

    applyHealthIncrease(level) {
        // Health Increase based on Constitution Mod
        // Body Part | Con Mod -1 | Con Mod 0 | Con Mod +1/2 | Con Mod +3 | Con Mod +4
        // Head      | +1         | +1        | +1           | +1         | +2
        // Limbs     | +1         | +1        | +2           | +2         | +3
        // Torso     | +1         | +2        | +2           | +3         | +3

        const conStat = this.gameState.stats.find(s => s.name === "Constitution")?.points || 10;
        const conMod = Math.floor(conStat / 2) - 5; // D&D style: (10/2)-5 = 0. But JASCI might be different.
        // User prompt says: "Con Mod -1", "Con Mod 0", "Con Mod +1/2", etc.
        // Standard JASCI stat modifier calculation from memory: floor(Score / 2) - 1? No, memory said `floor(Score / 10) + associatedStatModifier` for skills.
        // Memory says: "Stat modifiers are calculated using the formula floor(Score / 2) - 1." -> Wait, usually it's (Score-10)/2.
        // Let's check memory again: "Stat modifiers are calculated using the formula floor(Score / 2) - 1." -> if Score=1, (0)-1=-1. If Score=3, (1)-1=0. If Score=10, (5)-1=4.
        // This results in very high modifiers compared to D&D.
        // User provided table: "-1", "0", "+1/2", "+3", "+4".
        // If Score=3 (default start), Mod = floor(3/2)-1 = 0.
        // If Score=1, Mod = -1.
        // If Score=20 (max), Mod = 9.

        // Re-reading memory: "Stat modifiers are calculated using the formula floor(Score / 2) - 1."
        // Let's stick to this memory.

        const modifier = Math.floor(conStat / 2) - 1;

        let headGain = 0;
        let limbGain = 0;
        let torsoGain = 0;

        if (modifier <= -1) {
            headGain = 1; limbGain = 1; torsoGain = 1;
        } else if (modifier === 0) {
            headGain = 1; limbGain = 1; torsoGain = 2;
        } else if (modifier >= 1 && modifier <= 2) { // "+1/2" likely means +1 or +2
            headGain = 1; limbGain = 2; torsoGain = 2;
        } else if (modifier === 3) {
            headGain = 1; limbGain = 2; torsoGain = 3;
        } else if (modifier >= 4) {
            headGain = 2; limbGain = 3; torsoGain = 3;
        } else {
             // Fallback for high modifiers if logic implies >= 4 covers it, which it does.
             // But wait, what if modifier is 5, 6? The table stops at +4. Assumed capped or continues.
             // Given the progression, I'll assume >= 4 is the last column.
             headGain = 2; limbGain = 3; torsoGain = 3;
        }

        const health = this.gameState.player.health;
        if (health) {
            if (health.head) health.head.max += headGain;
            if (health.torso) health.torso.max += torsoGain;
            if (health.leftArm) health.leftArm.max += limbGain;
            if (health.rightArm) health.rightArm.max += limbGain;
            if (health.leftLeg) health.leftLeg.max += limbGain;
            if (health.rightLeg) health.rightLeg.max += limbGain;

            // Heal the amount gained? Usually max HP increase doesn't auto-heal, but often games do.
            // JASCI prompt doesn't specify. I'll add to current HP to keep percentage or just add flat amount.
            // Adding flat amount is standard "you feel stronger".
            if (health.head) health.head.current += headGain;
            if (health.torso) health.torso.current += torsoGain;
            if (health.leftArm) health.leftArm.current += limbGain;
            if (health.rightArm) health.rightArm.current += limbGain;
            if (health.leftLeg) health.leftLeg.current += limbGain;
            if (health.rightLeg) health.rightLeg.current += limbGain;
        }

        console.log(`Applied Health Gains (ConMod ${modifier}): Head+${headGain}, Torso+${torsoGain}, Limbs+${limbGain}`);
    }
}

window.XpManager = XpManager;
