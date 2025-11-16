/**
 * EventManager provides a centralized hub for dispatching and listening to game events.
 * It uses the browser's built-in CustomEvent system and attaches events to the document.
 */
class EventManager {
    /**
     * Dispatches a custom event.
     * @param {string} eventName - The name of the event to dispatch.
     * @param {Object} detail - The data payload to send with the event.
     */
    static dispatch(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Adds an event listener for a custom game event.
     * @param {string} eventName - The name of the event to listen for.
     * @param {Function} callback - The function to call when the event is dispatched.
     */
    static on(eventName, callback) {
        document.addEventListener(eventName, (event) => {
            callback(event.detail);
        });
    }
}

/**
 * --- Leveling and Progression Events ---
 *
 * xp:awarded
 * Fired when a character is awarded experience points.
 * @param {Object} detail - The event payload.
 * @param {string} detail.sourceId - The source of the XP (e.g., "quest_complete", "kill_tier_1").
 * @param {number} detail.amount - The amount of XP awarded.
 * @param {number} detail.totalXpBefore - The character's total XP before the award.
 * @param {number} detail.totalXpAfter - The character's total XP after the award.
 *
 * level:up
 * Fired for each level a character gains.
 * @param {Object} detail - The event payload.
 * @param {number} detail.fromLevel - The level the character was at.
 * @param {number} detail.toLevel - The new level the character has reached.
 * @param {number} detail.overflowXp - The amount of XP carried over into the new level.
 *
 * rewards:granted
 * Fired after a level up, summarizing all rewards granted for that level.
 * @param {Object} detail - The event payload.
 * @param {number} detail.level - The level for which the rewards were granted.
 * @param {number} detail.skillPoints - The number of skill points awarded.
 * @param {number} detail.statPoints - The number of stat points awarded.
 * @param {number} detail.perkPicks - The number of perk picks awarded.
 * @param {Object} detail.hpIncreases - A map of HP increases by body part.
 *
 * perk:picked
 * Fired when a player selects a new perk or a new rank of an existing perk.
 * @param {Object} detail - The event payload.
 * @param {string} detail.perkId - The ID of the perk that was picked.
 * @param {number} detail.newRank - The new rank of the perk.
 *
 * stats:allocated
 * Fired when a player allocates their unspent stat points.
 * @param {Object} detail - The event payload.
 * @param {Object} detail.allocations - A map of the stat allocations (e.g., { "Strength": 1, "Dexterity": 1 }).
 *
 * hp:increased
 * Fired specifically for HP increases that happen on level up.
 * @param {Object} detail - The event payload.
 * @param {number} detail.level - The level at which the HP increase occurred.
 * @param {number} detail.conTier - The Constitution modifier tier used for the calculation.
 * @param {Object} detail.deltasByPart - A map of the HP increases for each body part.
 */

window.EventManager = EventManager;
