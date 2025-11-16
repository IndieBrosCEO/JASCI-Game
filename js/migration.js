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

    const baseHp = { head: 5, torso: 8, leftArm: 7, rightArm: 7, leftLeg: 7, rightLeg: 7 };

    const maxHpMap = {
        [BodyParts.HEAD]: baseHp.head,
        [BodyParts.TORSO]: baseHp.torso,
        [BodyParts.LEFT_ARM]: baseHp.leftArm,
        [BodyParts.RIGHT_ARM]: baseHp.rightArm,
        [BodyParts.LEFT_LEG]: baseHp.leftLeg,
        [BodyParts.RIGHT_LEG]: baseHp.rightLeg
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
