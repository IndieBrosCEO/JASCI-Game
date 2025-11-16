// js/migration.js

/**
 * Calculates the baseline maximum HP for a character at level 1.
 * This function is crucial for migrating old saves that do not have HP data.
 * @param {object} characterState - The character's state, containing their stats.
 * @returns {object} A map of max HP for each body part.
 */
function calculateBaselineMaxHp(characterState) {
    // This function depends on BodyParts, which is a global constant.
    if (typeof BodyParts === 'undefined') {
        console.error("Migration Error: BodyParts global constant not found.");
        // Return a default map to prevent crashing, though this indicates a larger issue.
        return { head: 10, torso: 20, leftArm: 12, rightArm: 12, leftLeg: 14, rightLeg: 14 };
    }

    const constitutionStat = characterState.stats.find(s => s.name === "Constitution");
    const constitution = constitutionStat ? constitutionStat.points : 10; // Default to 10 if not found
    const conModifier = Math.floor((constitution - 10) / 2);

    let conTier;
    if (conModifier <= -1) conTier = 0;
    else if (conModifier === 0) conTier = 1;
    else if (conModifier >= 1 && conModifier <= 2) conTier = 2;
    else if (conModifier === 3) conTier = 3;
    else conTier = 4;

    const headGains = [1, 1, 1, 1, 2];
    const limbGains = [1, 1, 2, 2, 3];
    const torsoGains = [1, 2, 2, 3, 3];

    const baseHp = { head: 10, torso: 20, leftArm: 12, rightArm: 12, leftLeg: 14, rightLeg: 14 };

    const maxHpMap = {
        [BodyParts.HEAD]: baseHp.head + headGains[conTier],
        [BodyParts.TORSO]: baseHp.torso + torsoGains[conTier],
        [BodyParts.LEFT_ARM]: baseHp.leftArm + limbGains[conTier],
        [BodyParts.RIGHT_ARM]: baseHp.rightArm + limbGains[conTier],
        [BodyParts.LEFT_LEG]: baseHp.leftLeg + limbGains[conTier],
        [BodyParts.RIGHT_LEG]: baseHp.rightLeg + limbGains[conTier]
    };

    return maxHpMap;
}

/**
 * Migrates a loaded save data object to the latest version.
 * This function checks the saveVersion and applies necessary updates.
 * @param {object} loadedState - The game state object loaded from storage.
 * @returns {object} The migrated game state object.
 */
function migrateSaveData(loadedState) {
    if (loadedState.saveVersion === undefined) {
        console.log("Old save format (v0) detected. Migrating to v1...", "info");

        // Initialize new progression fields.
        loadedState.totalXp = loadedState.XP || 0;
        loadedState.level = 1; // All old saves start at level 1 progression.
        loadedState.unspentSkillPoints = 0;
        loadedState.unspentStatPoints = 0;
        loadedState.unspentPerkPicks = 0;
        loadedState.perkRanks = {};

        // Initialize player health if it doesn't exist.
        if (!loadedState.player) {
            loadedState.player = {};
        }
        if (!loadedState.player.health) {
            loadedState.player.health = {};
        }

        // Calculate and set baseline max HP.
        const baselineMaxHp = calculateBaselineMaxHp(loadedState);
        for (const partKey of Object.values(BodyParts)) {
            loadedState.player.health[partKey] = {
                max: baselineMaxHp[partKey],
                current: baselineMaxHp[partKey],
                // Ensure other fields are present if needed, e.g., armor
                armor: 0,
                crisisTimer: 0
            };
        }

        loadedState.saveVersion = 1;
        console.log("Save file migration to v1 complete.", "info");
    }

    // Future migrations would go here, e.g.:
    // if (loadedState.saveVersion === 1) {
    //     //... migrate to version 2
    //     loadedState.saveVersion = 2;
    // }

    return loadedState;
}

// Expose the migration function to the global scope so it can be used by script.js and tests.
window.migrateSaveData = migrateSaveData;
window.calculateBaselineMaxHp = calculateBaselineMaxHp;
