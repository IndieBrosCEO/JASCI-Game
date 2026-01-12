// js/timeManager.js

const TimeManager = {
    TICKS_PER_MINUTE: 1, // How many game ticks represent one minute of in-game time
    MINUTES_PER_HOUR: 60,
    HOURS_PER_DAY: 24,

    /**
     * Advances the game time by a specified number of game ticks.
     * Updates hunger and thirst based on time passed.
     * @param {object} gameState - The global game state object.
     * @param {number} ticksToAdvance - The number of game ticks to advance. Defaults to 1.
     */
    advanceTime: function (gameState, ticksToAdvance = 1) {
        if (typeof ticksToAdvance !== 'number' || ticksToAdvance <= 0) {
            return;
        }
        const minutesToAdd = ticksToAdvance / this.TICKS_PER_MINUTE;
        this.addMinutes(gameState, minutesToAdd);
    },

    /**
     * Advances the game time by a specified number of seconds.
     * @param {object} gameState - The global game state object.
     * @param {number} seconds - The number of seconds to advance.
     */
    advanceSeconds: function (gameState, seconds) {
        if (typeof seconds !== 'number' || seconds <= 0) {
            return;
        }
        const minutesToAdd = seconds / 60;
        this.addMinutes(gameState, minutesToAdd);
    },

    /**
     * Adds minutes to the game time and handles rollovers.
     * @param {object} gameState - The global game state.
     * @param {number} minutes - The number of minutes to add.
     */
    addMinutes: function(gameState, minutes) {
        gameState.currentTime.minutes += minutes;
        this.checkTimeRollover(gameState);

        // logToConsole(`Time advanced. Current time: ${this.getClockDisplay(gameState).clockString}`, 'debug');
        if (window.updatePlayerStatusDisplay) { // Ensure UI updates after time change
            window.updatePlayerStatusDisplay();
        }
    },

    /**
     * Checks for time unit rollovers (minutes -> hours -> days).
     * @param {object} gameState - The global game state.
     */
    checkTimeRollover: function(gameState) {
        while (gameState.currentTime.minutes >= this.MINUTES_PER_HOUR) {
            gameState.currentTime.minutes -= this.MINUTES_PER_HOUR;
            gameState.currentTime.hours++;

            // Hourly updates (like hunger/thirst decrement)
            this.processHourlyNeeds(gameState);

            if (gameState.currentTime.hours >= this.HOURS_PER_DAY) {
                gameState.currentTime.hours -= this.HOURS_PER_DAY;
                // Potentially trigger daily events or resets here
                logToConsole("A new day has begun.", "lightblue");
                this.processDailyNeeds(gameState);
            }
        }
    },

    /**
     * Processes hourly needs like hunger and thirst.
     * @param {object} gameState - The global game state.
     */
    processHourlyNeeds: function (gameState) {
        // Hunger decrement (example: 1 point per hour)
        if (gameState.playerHunger > 0) {
            gameState.playerHunger--;
        } else {
            logToConsole("Player is starving!", "red");
            if (typeof window.applyHungerThirstDamage === 'function') {
                window.applyHungerThirstDamage(gameState, 1); // Apply 1 damage for starvation
            } else {
                logToConsole("applyHungerThirstDamage function not found!", "error");
            }
        }

        // Thirst decrement (example: 1 point per hour)
        if (gameState.playerThirst > 0) {
            gameState.playerThirst--;
        } else {
            logToConsole("Player is dehydrated!", "red");
            if (typeof window.applyHungerThirstDamage === 'function') {
                window.applyHungerThirstDamage(gameState, 1); // Apply 1 damage for dehydration
            } else {
                logToConsole("applyHungerThirstDamage function not found!", "error");
            }
        }
        // logToConsole(`Hourly needs updated. Hunger: ${gameState.playerHunger}, Thirst: ${gameState.playerThirst}`, 'debug');
    },

    /**
     * Processes daily needs or resets. (Placeholder for now)
     * @param {object} gameState - The global game state.
     */
    processDailyNeeds: function (gameState) {
        gameState.currentDay = (gameState.currentDay || 0) + 1;
        // Example: Heal a small amount if resting, reset daily limits for certain actions, etc.
        // logToConsole("Processing daily needs/resets. New day:", gameState.currentDay, 'debug');
    },


    /**
     * Gets a display string for the current time and its color based on time of day.
     * @param {object} gameState - The global game state.
     * @returns {object} An object { clockString: "HH:MM", color: "cssColor" }.
     */
    getClockDisplay: function (gameState) {
        const hours = gameState.currentTime.hours;
        const minutes = Math.floor(gameState.currentTime.minutes); // Ensure minutes are integer for display
        const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        const clockString = `Day ${gameState.currentDay || 1} - ${timeString}`;

        let color = "white"; // Default
        if (hours >= 5 && hours < 7) color = "lightskyblue"; // Dawn
        else if (hours >= 7 && hours < 18) color = "yellow";    // Day
        else if (hours >= 18 && hours < 20) color = "orange";   // Dusk
        else color = "lightblue"; // Night

        return { clockString, color };
    },

    /**
     * Gets display bars for hunger and thirst.
     * @param {object} gameState - The global game state.
     * @returns {object} An object { hungerBar: "string", thirstBar: "string" }.
     */
    getNeedsStatusBars: function (gameState) {
        const maxNeeds = 24; // Assuming max hunger/thirst is 24 (e.g., hours until critical)
        const hungerPercentage = (gameState.playerHunger / maxNeeds) * 100;
        const thirstPercentage = (gameState.playerThirst / maxNeeds) * 100;

        const createBar = (percentage) => {
            const barLength = 10; // Number of characters in the bar
            const filledLength = Math.round((percentage / 100) * barLength);
            return `[${'#'.repeat(filledLength)}${'-'.repeat(barLength - filledLength)}]`;
        };

        return {
            hungerBar: createBar(hungerPercentage),
            thirstBar: createBar(thirstPercentage)
        };
    },

    isDay: function (gameState) {
        const hours = gameState.currentTime.hours;
        return hours >= 6 && hours < 18; // Standard day definition
    }
};

// Make it globally accessible
window.TimeManager = TimeManager;

logToConsole("TimeManager initialized.", "blue");
