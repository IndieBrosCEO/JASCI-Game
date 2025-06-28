// js/npcDecisions.js

// This file will contain NPC-specific decision-making logic, like whether to take a risky fall.

/**
 * Determines if an NPC should willingly take a fall based on height, leg health, and willpower.
 * @param {object} npc - The NPC object. Must have npc.stats, npc.health.leftLeg, npc.health.rightLeg.
 * @param {number} fallHeight - The number of Z-levels the NPC would fall.
 * @returns {boolean} True if the NPC decides to take the fall, false otherwise.
 */
function npcShouldTakeFall(npc, fallHeight) {
    const logPrefix = `[NPC Fall Decision ${npc.id || npc.name || 'UnknownNPC'}]:`;

    if (fallHeight <= 0) {
        logToConsole(`${logPrefix} No fall or falling up? Height: ${fallHeight}. Allowing (no risk).`, 'grey');
        return true; // Not a fall, or falling up (which shouldn't happen here)
    }

    if (fallHeight <= 1) {
        logToConsole(`${logPrefix} Fall height is ${fallHeight} (<=1). Safe to drop.`, 'green');
        return true; // Safe to drop one level
    }

    let leftLegPercent = 0;
    if (npc.health && npc.health.leftLeg && npc.health.leftLeg.max > 0) {
        leftLegPercent = Math.max(0, npc.health.leftLeg.current) / npc.health.leftLeg.max;
    } else {
        logToConsole(`${logPrefix} Warning: NPC missing left leg health data or max HP is 0. Assuming 0% health for left leg.`, 'orange');
    }

    let rightLegPercent = 0;
    if (npc.health && npc.health.rightLeg && npc.health.rightLeg.max > 0) {
        rightLegPercent = Math.max(0, npc.health.rightLeg.current) / npc.health.rightLeg.max;
    } else {
        logToConsole(`${logPrefix} Warning: NPC missing right leg health data or max HP is 0. Assuming 0% health for right leg.`, 'orange');
    }

    const averageLegHealthPercent = (leftLegPercent + rightLegPercent) / 2;
    logToConsole(`${logPrefix} Leg Health: L=${(leftLegPercent * 100).toFixed(0)}%, R=${(rightLegPercent * 100).toFixed(0)}%, Avg=${(averageLegHealthPercent * 100).toFixed(0)}%`);

    // DC = Base + PenaltyForHeight - BonusForLegHealth
    // Base DC for a multi-level fall could be 10.
    // Height penalty: +2 per Z-level beyond the first free one.
    // Leg health bonus: Max 10 (for 100% health), min 0. (10 * averageLegHealthPercent)
    let dc = 10 + ((fallHeight - 1) * 2) - Math.floor(averageLegHealthPercent * 10);
    dc = Math.max(5, Math.min(dc, 25)); // Clamp DC between 5 and 25.

    const willpowerValue = (typeof getStatValue === 'function' && npc.stats) ? getStatValue("Willpower", npc) : 3; // Default to 3 if undefined
    // The roll is 1d20. No direct stat modifier, using raw stat value as per some RPG systems or a derived modifier.
    // For simplicity, let's assume Willpower stat itself is added or a modifier derived from it.
    // If Willpower is a score 1-10, a modifier might be (Willpower - 5).
    // Let's use Willpower stat directly as a small bonus/penalty relative to an average roll.
    // Or, more simply, use a modifier like getStatModifier if it exists.
    // The prompt said "1d20 where the dice challenge is proportionate...". It didn't specify adding willpower to the roll,
    // but it's a common mechanic. Let's assume willpower directly adds to the roll for now.
    // If `getStatModifier` is available and appropriate, that's better.
    // `getStatModifier` from utils.js is (statValue - 5) / 2, rounded down. Let's use raw Willpower value for now as a direct bonus.

    let willpowerBonus = 0;
    if (npc.stats) { // npc.stats is an object like { Strength: 5, Willpower: 3 }
        const willpowerStatObj = npc.stats.find(s => s.name === "Willpower"); // If stats is an array of objects
        if (willpowerStatObj) {
            willpowerBonus = willpowerStatObj.points || 0;
        } else if (npc.stats["Willpower"]) { // If stats is a direct key-value map
            willpowerBonus = npc.stats["Willpower"] || 0;
        } else {
            logToConsole(`${logPrefix} NPC has no Willpower stat defined in .stats. Defaulting bonus to 0.`, "orange");
        }
    } else {
        logToConsole(`${logPrefix} NPC has no .stats property. Defaulting Willpower bonus to 0.`, "orange");
    }

    // Let's adjust the willpower bonus to be a modifier like other stats for consistency.
    // (Value - 5) / 2, then round down might be too harsh for a 1-10 scale.
    // Let's just use (Willpower Points - 3) as a simple modifier for now, assuming 3 is average.
    const willpowerModifier = willpowerBonus - 3;


    const roll = (typeof rollDie === 'function') ? rollDie(20) : Math.floor(Math.random() * 20) + 1;
    const totalRoll = roll + willpowerModifier;

    const success = totalRoll >= dc;

    logToConsole(`${logPrefix} Fall Height: ${fallHeight}. Leg Health Avg: ${(averageLegHealthPercent * 100).toFixed(0)}%. Willpower: ${willpowerBonus} (Mod: ${willpowerModifier}). DC: ${dc}. Roll: ${roll} + ${willpowerModifier} = ${totalRoll}. Success: ${success}.`, success ? 'green' : 'red');

    return success;
}

// Make it globally accessible
if (typeof window !== 'undefined') {
    window.npcShouldTakeFall = npcShouldTakeFall;
}
