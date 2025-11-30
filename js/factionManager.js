/**
 * @file factionManager.js
 * Manages factions, their relationships, and NPC alignment to them.
 */

// Define Factions
const Factions = {
    PLAYER: { id: "player", name: "Player Aligned", color: "green" },
    CIVILIAN: { id: "civilian", name: "Civilian", color: "lightblue" },
    POLICE: { id: "police", name: "Police Force", color: "blue" },
    MILITIA: { id: "militia", name: "Local Militia", color: "olive" },
    BANDIT: { id: "bandit", name: "Bandits", color: "darkred" },
    SCAVENGER: { id: "scavenger", name: "Scavengers", color: "saddlebrown" },
    MUTANT: { id: "mutant", name: "Mutants", color: "darkgreen" },
    ZOMBIE: { id: "zombie", name: "Zombies", color: "lightgreen" }, // Example, adjust as needed
    CREATURE_HOSTILE: { id: "creature_hostile", name: "Hostile Creatures", color: "red" }, // e.g., Generic monsters
    CREATURE_PREDATOR: { id: "creature_predator", name: "Predators", color: "orange" }, // e.g., Mountain Lion, Rattlesnake
    CREATURE_NEUTRAL: { id: "creature_neutral", name: "Neutral Creatures", color: "gray" }, // e.g., Raccoon, Vulture
    CREATURE_PREY: { id: "creature_prey", name: "Prey Animals", color: "lightgray" }, // e.g., Deer, Quail
    INSECT_SWARM: { id: "insect_swarm", name: "Insect Swarm", color: "yellow" }, // e.g., Bees (defensive)
    // Placeholder for specific game factions from prompt
    GUARD: { id: "guard", name: "Guard Faction", color: "darkcyan" }, // From prompt
    EARTH_FIRST: { id: "earth_first", name: "Earth First", color: "forestgreen" }, // From prompt
    PD_FACTION: { id: "pd_faction", name: "PD (Specific)", color: "dodgerblue" } // From prompt, to distinguish from generic police if needed
};
window.Factions = Factions; // Make Factions globally available

// Define default faction relationships
// Possible values: "ally", "neutral", "hostile"
// Player reputation will override these for the player's interactions.
const defaultFactionRelationships = {
    [Factions.PLAYER.id]: {
        [Factions.CIVILIAN.id]: "neutral",
        [Factions.POLICE.id]: "neutral",
        [Factions.MILITIA.id]: "neutral",
        [Factions.BANDIT.id]: "hostile",
        [Factions.SCAVENGER.id]: "neutral", // Can be hostile or neutral based on player actions
        [Factions.MUTANT.id]: "hostile",
        [Factions.ZOMBIE.id]: "hostile",
        [Factions.CREATURE_HOSTILE.id]: "hostile",
        [Factions.CREATURE_PREDATOR.id]: "hostile",
        [Factions.CREATURE_NEUTRAL.id]: "neutral",
        [Factions.CREATURE_PREY.id]: "neutral",
        [Factions.INSECT_SWARM.id]: "neutral", // Hostile if provoked
        [Factions.GUARD.id]: "neutral",
        [Factions.EARTH_FIRST.id]: "neutral",
        [Factions.PD_FACTION.id]: "neutral"
    },
    [Factions.CIVILIAN.id]: {
        [Factions.POLICE.id]: "ally",
        [Factions.MILITIA.id]: "neutral",
        [Factions.BANDIT.id]: "hostile",
        [Factions.SCAVENGER.id]: "hostile",
        [Factions.MUTANT.id]: "hostile",
        [Factions.ZOMBIE.id]: "hostile",
        [Factions.CREATURE_HOSTILE.id]: "hostile",
        [Factions.CREATURE_PREDATOR.id]: "hostile",
        [Factions.GUARD.id]: "ally",
        [Factions.EARTH_FIRST.id]: "neutral",
        [Factions.PD_FACTION.id]: "ally"
    },
    [Factions.POLICE.id]: {
        [Factions.MILITIA.id]: "neutral", // Could be ally depending on context
        [Factions.BANDIT.id]: "hostile",
        [Factions.SCAVENGER.id]: "hostile",
        [Factions.MUTANT.id]: "hostile",
        [Factions.ZOMBIE.id]: "hostile",
        [Factions.GUARD.id]: "ally", // Assuming PD and Guard are aligned
        [Factions.EARTH_FIRST.id]: "neutral", // Potentially suspicious or hostile
        [Factions.PD_FACTION.id]: "ally" // Should be self!
    },
    [Factions.MILITIA.id]: {
        [Factions.BANDIT.id]: "hostile",
        [Factions.SCAVENGER.id]: "neutral",
        [Factions.MUTANT.id]: "hostile",
        [Factions.ZOMBIE.id]: "hostile",
        [Factions.GUARD.id]: "neutral",
        [Factions.EARTH_FIRST.id]: "hostile" // Example: Militia vs Eco-group
    },
    [Factions.BANDIT.id]: {
        [Factions.SCAVENGER.id]: "neutral", // Might compete or ignore
        [Factions.MUTANT.id]: "neutral", // Might ignore or fight over resources
        [Factions.ZOMBIE.id]: "hostile", // Zombies are generally hostile to all living
        [Factions.GUARD.id]: "hostile",
        [Factions.EARTH_FIRST.id]: "neutral"
    },
    [Factions.SCAVENGER.id]: {
        [Factions.MUTANT.id]: "hostile",
        [Factions.ZOMBIE.id]: "hostile",
        [Factions.GUARD.id]: "hostile",
        [Factions.EARTH_FIRST.id]: "neutral"
    },
    [Factions.MUTANT.id]: {
        [Factions.ZOMBIE.id]: "neutral" // Or hostile, depends on lore
    },
    // GUARD, EARTH_FIRST, PD_FACTION relationships with others
    [Factions.GUARD.id]: {
        [Factions.EARTH_FIRST.id]: "neutral", // Or hostile, depending on specific scenario
        [Factions.PD_FACTION.id]: "ally"
    },
    [Factions.EARTH_FIRST.id]: {
        [Factions.PD_FACTION.id]: "neutral" // Or suspicious/hostile
    },
    // Predator-Prey Relationships
    [Factions.CREATURE_PREDATOR.id]: {
        [Factions.CREATURE_PREY.id]: "hostile",
        [Factions.CREATURE_HOSTILE.id]: "neutral", // Predators might ignore monsters or fight, default neutral
        [Factions.CREATURE_NEUTRAL.id]: "neutral", // Usually ignore scavengers
        [Factions.PLAYER.id]: "hostile", // Predators attack player
        [Factions.ZOMBIE.id]: "hostile" // Zombies attack life
    },
    [Factions.CREATURE_PREY.id]: {
        [Factions.CREATURE_PREDATOR.id]: "hostile", // Fear/Flee behavior is technically a 'hostile' relation for detection
        [Factions.PLAYER.id]: "neutral" // Usually neutral/fear
    }
};

// Player reputation with factions (will be stored in gameState)
// Example structure in gameState:
// gameState.playerReputation = {
//     "police": 0, // Neutral
//     "bandit": -50, // Hostile
//     "civilian": 10 // Friendly
// };

/**
 * Gets the relationship between two factions.
 * @param {string} factionId1 - The ID of the first faction.
 * @param {string} factionId2 - The ID of the second faction.
 * @param {object} [playerReputation] - Optional player reputation object from gameState.
 * @returns {string} "ally", "neutral", or "hostile".
 */
function getFactionRelationship(factionId1, factionId2, playerReputation = {}) {
    if (factionId1 === factionId2) return "ally"; // Same faction is always ally

    // Handle player involvement specifically, as reputation overrides defaults
    if (factionId1 === Factions.PLAYER.id) {
        const rep = playerReputation[factionId2];
        if (rep !== undefined) {
            if (rep <= -50) return "hostile"; // Example thresholds
            if (rep >= 50) return "ally";
            return "neutral";
        }
        // Fall through to default if no specific player rep
    }
    if (factionId2 === Factions.PLAYER.id) {
        const rep = playerReputation[factionId1];
        if (rep !== undefined) {
            if (rep <= -50) return "hostile";
            if (rep >= 50) return "ally";
            return "neutral";
        }
        // Fall through to default
    }

    // Check default relationships (symmetric)
    if (defaultFactionRelationships[factionId1] && defaultFactionRelationships[factionId1][factionId2] !== undefined) {
        return defaultFactionRelationships[factionId1][factionId2];
    }
    if (defaultFactionRelationships[factionId2] && defaultFactionRelationships[factionId2][factionId1] !== undefined) {
        return defaultFactionRelationships[factionId2][factionId1];
    }

    // Default for unlisted relationships (e.g., two creature factions)
    // Most unlisted inter-NPC faction relationships can be neutral unless specified.
    // Specific creature interactions (predator-prey) are more complex than simple faction hate.
    if ((factionId1.startsWith("creature_") && factionId2.startsWith("creature_")) ||
        (factionId1 === Factions.ZOMBIE.id && factionId2.startsWith("creature_")) ||
        (factionId2 === Factions.ZOMBIE.id && factionId1.startsWith("creature_"))) {
        // Simple: Hostile creatures are hostile to prey animals. Zombies might be neutral to non-prey animals.
        if ((factionId1 === Factions.CREATURE_HOSTILE.id && factionId2 === Factions.CREATURE_PREY.id) ||
            (factionId2 === Factions.CREATURE_HOSTILE.id && factionId1 === Factions.CREATURE_PREY.id)) {
            return "hostile";
        }
        return "neutral"; // Default for other creature/zombie interactions
    }

    // If one is zombie and the other is living (non-creature, non-player)
    const livingFactions = [Factions.CIVILIAN.id, Factions.POLICE.id, Factions.MILITIA.id, Factions.BANDIT.id, Factions.SCAVENGER.id, Factions.MUTANT.id, Factions.GUARD.id, Factions.EARTH_FIRST.id, Factions.PD_FACTION.id];
    if (factionId1 === Factions.ZOMBIE.id && livingFactions.includes(factionId2)) return "hostile";
    if (factionId2 === Factions.ZOMBIE.id && livingFactions.includes(factionId1)) return "hostile";


    return "neutral"; // Default if no specific relationship is defined
}

/**
 * Modifies player reputation with a specific faction.
 * @param {string} factionId - The ID of the faction.
 * @param {number} amount - The amount to change the reputation by (positive or negative).
 * @param {object} gameState - The global game state object.
 */
function adjustPlayerReputation(factionId, amount, gameState) {
    if (!gameState.playerReputation) {
        gameState.playerReputation = {};
    }
    if (gameState.playerReputation[factionId] === undefined) {
        gameState.playerReputation[factionId] = 0;
    }
    gameState.playerReputation[factionId] += amount;
    // Clamp reputation if needed, e.g., between -1000 and 1000 (or other defined min/max)
    const repMin = -1000;
    const repMax = 1000;
    gameState.playerReputation[factionId] = Math.max(repMin, Math.min(repMax, gameState.playerReputation[factionId]));

    const factionName = Factions[factionId.toUpperCase()]?.name || factionId; // Use toUpperCase for safety, though current Faction keys are uppercase
    logToConsole(`Player reputation with ${factionName} changed by ${amount}. New rep: ${gameState.playerReputation[factionId]}.`, 'blue');
}


/**
 * Gets the player's current reputation score with a specific faction.
 * @param {string} factionId - The ID of the faction.
 * @param {object} gameState - The global game state.
 * @returns {number} The player's reputation score with the faction, defaults to 0 if not set.
 */
function getPlayerReputation(factionId, gameState) {
    if (gameState.playerReputation && gameState.playerReputation[factionId] !== undefined) {
        return gameState.playerReputation[factionId];
    }
    return 0; // Default to neutral if no specific reputation is tracked
}

// Define reputation thresholds for descriptive levels
const ReputationThreshold = {
    Hostile: -500,
    Unfriendly: -200,
    NeutralMin: -199, // For easier range checks if Neutral is a band
    NeutralMax: 199,
    Friendly: 200,
    Allied: 500
};


window.factionManager = {
    Factions,
    defaultFactionRelationships,
    ReputationThreshold, // Expose thresholds
    getFactionRelationship, // This existing function might need to use playerReputation and thresholds more explicitly
    adjustPlayerReputation,
    getPlayerReputation // Expose new getter
};

console.log("factionManager.js loaded and initialized.");
