/**
 * @file factionManager.js
 * Manages factions, their relationships, and NPC alignment to them.
 */

// Factions object will be populated from assets/definitions/factions.json
const Factions = {};
window.Factions = Factions; // Make Factions globally available

// Private storage for relationships loaded from JSON
let factionDataMap = {};

/**
 * Initializes the Faction Manager with data loaded from AssetManager.
 * @param {Array} factionsList - Array of faction objects loaded from JSON.
 */
function initializeFactions(factionsList) {
    if (!Array.isArray(factionsList)) {
        console.error("FactionManager: Invalid factions data provided.", factionsList);
        return;
    }

    factionsList.forEach(faction => {
        // Populate the public Factions object with keys derived from IDs (e.g. "player" -> Factions.PLAYER)
        // For backward compatibility and ease of access.
        const key = faction.id.toUpperCase();
        Factions[key] = {
            id: faction.id,
            name: faction.name,
            color: faction.color,
            defaultTeamId: faction.defaultTeamId
        };

        // Store the full data including relationships in our private map
        factionDataMap[faction.id] = faction;
    });

    console.log("FactionManager: Factions initialized.", Object.keys(Factions));
}

// Define reputation thresholds for descriptive levels
const ReputationThreshold = {
    Hostile: -500,
    Unfriendly: -200,
    NeutralMin: -199,
    NeutralMax: 199,
    Friendly: 200,
    Allied: 500
};

/**
 * Gets the relationship between two factions.
 * @param {string|object} actorA - The first actor (entity or faction ID).
 * @param {string|object} actorB - The second actor (entity or faction ID).
 * @param {object} [playerReputation] - Optional player reputation object from gameState.
 * @returns {string} "ally", "neutral", "hostile", "tense", "fear", "unknown".
 */
function getFactionRelationship(actorA, actorB, playerReputation = {}) {
    // Helper to extract faction ID and hidden dynamics
    const getDetails = (actor) => {
        if (typeof actor === 'string') return { id: actor, covert: null, isRevealed: false };
        return {
            id: actor.factionId,
            covert: actor.covert_faction_id || null,
            isRevealed: actor.isRevealed === true
        };
    };

    const a = getDetails(actorA);
    const b = getDetails(actorB);

    // If IDs are missing
    if (!a.id || !b.id) return "neutral";

    // 1. Self is always Ally
    if (a.id === b.id && !a.covert && !b.covert) return "ally";

    // 2. Identify the "Subjective Self" (Who is asking?)
    // This function asks: "How does A view B?"
    // If A has a covert faction, A views B based on A's TRUE faction.
    // Unless A is the Player (who usually doesn't have a covert faction in this context, but we check ID).

    let subjectFaction = a.id;
    if (a.covert) {
        subjectFaction = a.covert; // A knows their own true allegiance
    }

    // 3. Identify the "Objective Target" (Who is being viewed?)
    // How does A view B?
    // If B has a covert faction, A only knows it if B is revealed.
    // Otherwise, A sees B's public faction.

    let targetFaction = b.id;
    if (b.covert && b.isRevealed) {
        targetFaction = b.covert; // True nature revealed
    }

    // 4. Player Reputation Override
    // If A is Player, check reputation with B's perceived faction.
    if (a.id === "player") {
        const rep = playerReputation[targetFaction];
        if (rep !== undefined) {
            if (rep <= ReputationThreshold.Hostile) return "hostile";
            if (rep >= ReputationThreshold.Allied) return "ally";
            // Check other thresholds if needed, or default to matrix if neutral
        }
    }
    // If B is Player, check A's reputation with Player?
    // Usually reputation is "How Faction X likes Player".
    // So if targetFaction is "player", we check subjectFaction's opinion of player via rep?
    // The matrix usually handles "Faction -> Player".
    // But dynamic reputation:
    if (targetFaction === "player") {
        const rep = playerReputation[subjectFaction]; // Subject's opinion of player
        if (rep !== undefined) {
            if (rep <= ReputationThreshold.Hostile) return "hostile";
            if (rep >= ReputationThreshold.Allied) return "ally";
        }
    }

    // 5. Consult Matrix (Hidden & Public Relationships)
    const subjectData = factionDataMap[subjectFaction];

    if (subjectData) {
        // Ideological Lock (Hard override)
        if (subjectData.ideological_lock && Array.isArray(subjectData.ideological_lock)) {
            if (subjectData.ideological_lock.includes(targetFaction)) {
                return "enemy"; // or "hostile"
            }
        }

        // Covert Relations (Hidden internal stance)
        // If subject has a secret agenda against target, they act on that.
        if (subjectData.covert_relation && subjectData.covert_relation[targetFaction]) {
            const secretStance = subjectData.covert_relation[targetFaction];
            // Map specific covert tags to standard relationship enums for AI logic
            if (secretStance === 'disrupt' || secretStance === 'hostile') return 'hostile';
            if (secretStance === 'support' || secretStance === 'ally') return 'ally';
            if (secretStance === 'opportunism') return 'neutral'; // Or tense?
        }

        // Standard Public Matrix
        if (subjectData.relationships && subjectData.relationships[targetFaction]) {
            return subjectData.relationships[targetFaction];
        }
    }

    // 6. Default Fallbacks (if not in matrix)

    // Creature/Zombie logic preservation
    if (subjectFaction === "zombie" || targetFaction === "zombie") {
        if (subjectFaction === "zombie" && targetFaction === "zombie") return "neutral"; // Zombies don't eat each other
        return "hostile"; // Zombies hate everything else, everything hates zombies
    }

    if (subjectFaction.startsWith("creature_predator")) {
        if (targetFaction.startsWith("creature_prey") || targetFaction === "player") return "hostile";
    }

    return "neutral";
}

/**
 * Modifies player reputation with a specific faction.
 * @param {string} factionId - The ID of the faction.
 * @param {number} amount - The amount to change the reputation by.
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

    const repMin = -1000;
    const repMax = 1000;
    gameState.playerReputation[factionId] = Math.max(repMin, Math.min(repMax, gameState.playerReputation[factionId]));

    const factionName = Factions[factionId.toUpperCase()]?.name || factionId;
    if (typeof logToConsole === 'function') {
        logToConsole(`Player reputation with ${factionName} changed by ${amount}. New rep: ${gameState.playerReputation[factionId]}.`, 'blue');
    }
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
    return 0;
}

window.factionManager = {
    Factions,
    ReputationThreshold,
    initializeFactions,
    getFactionRelationship,
    adjustPlayerReputation,
    getPlayerReputation
};

console.log("factionManager.js loaded.");
