// js/perkManager.js

class PerkManager {
    constructor(gameState, assetManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.activePerks = new Set();
        this.initialize();
    }

    initialize() {
        // Load perks from gameState into activePerks for quick lookup
        // gameState.perkRanks stores { "perkId": 1 }
        if (this.gameState.perkRanks) {
            for (const perkName in this.gameState.perkRanks) {
                this.activePerks.add(perkName);
            }
        }
    }

    getAvailablePerks() {
        if (!this.assetManager.perks) return {};
        // Returns the full structure: { Strength: [...], Intelligence: [...] }
        return this.assetManager.perks;
    }

    hasPerk(perkName) {
        return this.activePerks.has(perkName);
    }

    canAffordPerk() {
        return this.gameState.unspentPerkPicks > 0;
    }

    /**
     * Checks if the player meets the requirements for a perk.
     * @param {object} perkDef - The perk definition object.
     * @returns {boolean}
     */
    meetsRequirements(perkDef) {
        // Prompt: "If you want prerequisites, use Stat mod >= +1 and Skill >= 4 as simple gates."
        // "Suggested prereqs are light and optional; keep or trim as you like."
        // "Each perk below is single-tier."
        // "One-click pick with no ranks."

        // For now, I'll implement a basic check if we decide to add prereqs to the JSON later.
        // Currently, the JSON doesn't have 'prerequisites' field, implying open access within the Stat category?
        // The prompt implies perks are categorized by Stat. Maybe you need a certain stat level?
        // "Attributes [Perks] are made by the GM based on the specific player..."
        // But then "In the perk screen, show 7 columns... one row per tier of recommended level".
        // Let's assume for now: No hard prereqs other than having the point.

        // Check if already owned
        if (this.hasPerk(perkDef.name)) return false;

        return true;
    }

    unlockPerk(perkName) {
        if (!this.canAffordPerk()) {
            console.warn("Cannot unlock perk: No unspent perk picks.");
            return false;
        }

        if (this.hasPerk(perkName)) {
             console.warn(`Cannot unlock perk: ${perkName} already unlocked.`);
             return false;
        }

        // Deduct point
        this.gameState.unspentPerkPicks--;

        // Add to state
        this.gameState.perkRanks[perkName] = 1;
        this.activePerks.add(perkName);

        console.log(`Perk unlocked: ${perkName}`);

        // Apply immediate effects if any (most are passive/conditional checked elsewhere)
        this.applyPerkImmediateEffects(perkName);

        if (window.EventManager) {
            window.EventManager.dispatch('perk:unlocked', { perkName });
        }

        return true;
    }

    applyPerkImmediateEffects(perkName) {
        // Find definition
        let perkDef = null;
        const allPerks = this.getAvailablePerks();
        for (const statCat in allPerks) {
            const found = allPerks[statCat].find(p => p.name === perkName);
            if (found) {
                perkDef = found;
                break;
            }
        }

        if (!perkDef || !perkDef.effects) return;

        perkDef.effects.forEach(effect => {
            switch (effect.type) {
                case 'max_hp_bonus':
                    // "Fortified Frame" — +1 max HP to all body parts.
                    // This needs to be applied immediately and persisted.
                    // Wait, if it's a permanent max HP boost, we should update `health.max`.
                    // If we construct max HP dynamically from base + cons + perks every time, we don't need to mod state.
                    // But current system mods `max` directly on level up. So we should mod it here too.
                    const health = this.gameState.player.health;
                    if (health) {
                        for (const partKey in health) {
                            health[partKey].max += effect.value;
                            health[partKey].current += effect.value; // Heal the gain?
                        }
                    }
                    break;
                case 'inventory_slots_bonus':
                    // "Heavy Carrier" — +6 total inventory slots.
                    // Update inventory capacity.
                    if (this.gameState.inventory && this.gameState.inventory.container) {
                        this.gameState.inventory.container.maxSlots += effect.value;
                    }
                    break;
                // Other effects are likely checked at runtime (e.g., damage reduction, skill bonus)
            }
        });
    }
}

window.PerkManager = PerkManager;
