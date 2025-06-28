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

    // Use getStatValue (from utils.js, robust for different stat structures) to get Willpower.
    // Default to a low value (e.g., 3) if stat is missing, affecting the modifier.
    const willpowerStatValue = (typeof getStatValue === 'function') ? getStatValue("Willpower", npc) : 3;
    if (typeof getStatValue !== 'function') {
        logToConsole(`${logPrefix} CRITICAL: getStatValue function not found. Willpower check will be unreliable.`, "red");
    }
    if (npc.stats && ((Array.isArray(npc.stats) && !npc.stats.find(s => s.name === "Willpower")) || (!Array.isArray(npc.stats) && !npc.stats["Willpower"]))) {
        logToConsole(`${logPrefix} NPC has no Willpower stat defined in .stats. Using default value ${willpowerStatValue} for calculation.`, "orange");
    }


    // The prompt implies a direct willpower check, not necessarily a modifier added to a roll vs. DC.
    // However, "1d20 where the dice challenge is proportionate" suggests a roll against a DC.
    // The existing DC calculation is: dc = 10 + ((fallHeight - 1) * 2) - Math.floor(averageLegHealthPercent * 10);
    // Let's use a standard stat modifier for Willpower to affect the roll.
    // getStatModifier(statName, entity) returns Math.floor(statPoints / 2) - 1. (e.g. 3 WP -> 0, 5 WP -> 1, 7 WP-> 2)
    // This seems more standard than `willpowerPoints - 3`.
    let willpowerModifier = 0;
    if (typeof getStatModifier === 'function') {
        willpowerModifier = getStatModifier("Willpower", npc);
    } else {
        logToConsole(`${logPrefix} CRITICAL: getStatModifier function not found. Willpower modifier will be 0.`, "red");
        // Fallback simple modifier if getStatModifier is missing
        willpowerModifier = Math.floor(willpowerStatValue / 2) - 1;
    }

    const roll = (typeof rollDie === 'function') ? rollDie(20) : Math.floor(Math.random() * 20) + 1;
    if (typeof rollDie !== 'function') {
        logToConsole(`${logPrefix} CRITICAL: rollDie function not found. Using Math.random.`, "red");
    }
    const totalRoll = roll + willpowerModifier;

    const success = totalRoll >= dc;

    logToConsole(`${logPrefix} Fall Height: ${fallHeight}. Leg Health Avg: ${(averageLegHealthPercent * 100).toFixed(0)}%. Willpower: ${willpowerBonus} (Mod: ${willpowerModifier}). DC: ${dc}. Roll: ${roll} + ${willpowerModifier} = ${totalRoll}. Success: ${success}.`, success ? 'green' : 'red');

    return success;
}

// Make it globally accessible
if (typeof window !== 'undefined') {
    window.npcShouldTakeFall = npcShouldTakeFall;
}
