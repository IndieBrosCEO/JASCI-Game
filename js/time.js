const Time = {
    advanceTime: function (gameState) {
        // Initialize new gameState properties if they don't exist
        gameState.minutesAccumulatedForHourTick = gameState.minutesAccumulatedForHourTick || 0;
        gameState.currentDay = gameState.currentDay || 1; // Kept for general day tracking

        // Ensure playerHunger and playerThirst are initialized if they don't exist,
        // though they should be part of gameState initialization.
        gameState.playerHunger = gameState.playerHunger === undefined ? 24 : gameState.playerHunger;
        gameState.playerThirst = gameState.playerThirst === undefined ? 24 : gameState.playerThirst;


        gameState.currentTime.minutes += 2;
        gameState.minutesAccumulatedForHourTick += 2;

        if (gameState.currentTime.minutes >= 60) {
            const hoursToAdd = Math.floor(gameState.currentTime.minutes / 60);
            gameState.currentTime.hours += hoursToAdd;
            gameState.currentTime.minutes %= 60;
            if (gameState.currentTime.hours >= 24) {
                gameState.currentTime.hours %= 24;
                // Increment day when clock rolls past midnight, independent of old daily tick
                gameState.currentDay = (gameState.currentDay || 1) + 1;
                logToConsole(`A new day (${gameState.currentDay}) has begun.`);
            }
        }

        if (gameState.minutesAccumulatedForHourTick >= 60) {
            gameState.playerHunger = Math.max(0, gameState.playerHunger - 1);
            gameState.playerThirst = Math.max(0, gameState.playerThirst - 1);
            logToConsole(`Hour passed. Hunger: ${gameState.playerHunger}/24, Thirst: ${gameState.playerThirst}/24`);
            gameState.minutesAccumulatedForHourTick -= 60;
        }

        // Damage checks moved here - these now run every call to Time.advanceTime
        if (gameState.playerHunger === 0) {
            if (typeof window.applyHungerThirstDamage === 'function') {
                window.applyHungerThirstDamage(gameState, 1); // Apply 1 damage for starvation
            }
            logToConsole('%cCRITICAL WARNING: PLAYER IS STARVING! Hunger at 0.', 'color: red; font-weight: bold; font-size: 14px;');
        }
        if (gameState.playerThirst === 0) {
            if (typeof window.applyHungerThirstDamage === 'function') {
                window.applyHungerThirstDamage(gameState, 1); // Apply 1 damage for dehydration
            }
            logToConsole('%cCRITICAL WARNING: PLAYER IS DEHYDRATED! Thirst at 0.', 'color: red; font-weight: bold; font-size: 14px;');
        }
    },

    getFormattedTime: function (gameState) {
        const hours = gameState.currentTime.hours.toString().padStart(2, '0');
        const minutes = gameState.currentTime.minutes.toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    },

    isDay: function (gameState) {
        const hours = gameState.currentTime.hours;
        return hours >= 6 && hours < 18;
    },

    getClockDisplay: function (gameState) {
        const formattedTime = this.getFormattedTime(gameState);
        const clockString = `║ Day ${gameState.currentDay} - ${formattedTime} ║`;
        let color;
        const hours = gameState.currentTime.hours;

        if (hours >= 0 && hours <= 5 || hours >= 18 && hours <= 23) {
            color = "lightblue";
        } else {
            color = "lightyellow"; // Default color
        }

        return { clockString: clockString, color: color };
    },

    getNeedsStatusBars: function (gameState) {
        const maxNeeds = 24; // Assuming 24 is the max for hunger and thirst

        // Hunger Bar
        const hungerPercentage = gameState.playerHunger / maxNeeds;
        const hungerFilledChars = Math.round(hungerPercentage * 10); // Create a 10-char bar
        const hungerEmptyChars = 10 - hungerFilledChars;
        const hungerBarDisplay = `[${'■'.repeat(hungerFilledChars)}${'-'.repeat(hungerEmptyChars)}] (${gameState.playerHunger}/${maxNeeds})`;

        // Thirst Bar
        const thirstPercentage = gameState.playerThirst / maxNeeds;
        const thirstFilledChars = Math.round(thirstPercentage * 10); // Create a 10-char bar
        const thirstEmptyChars = 10 - thirstFilledChars;
        const thirstBarDisplay = `[${'■'.repeat(thirstFilledChars)}${'-'.repeat(thirstEmptyChars)}] (${gameState.playerThirst}/${maxNeeds})`;

        return {
            hungerBar: hungerBarDisplay,
            thirstBar: thirstBarDisplay
        };
    },

    advanceTimeSpecific: function(hours = 0, minutes = 0, gameState) {
        if (!gameState || !gameState.currentTime) {
            console.error("Time.advanceTimeSpecific: gameState or gameState.currentTime not initialized.");
            return;
        }
        console.log(`Time: Advancing time by ${hours}h ${minutes}m from ${gameState.currentTime.hours}:${gameState.currentTime.minutes}. Day: ${gameState.currentDay}`);

        let totalMinutesToAdd = (hours * 60) + minutes;

        // Handle hunger/thirst for the elapsed time.
        // This assumes 1 unit of hunger/thirst per hour.
        let hoursPassedInt = Math.floor(totalMinutesToAdd / 60);
        if (hoursPassedInt > 0) {
            gameState.playerHunger = Math.max(0, (gameState.playerHunger || 24) - hoursPassedInt);
            gameState.playerThirst = Math.max(0, (gameState.playerThirst || 24) - hoursPassedInt);
            logToConsole(`${hoursPassedInt} hour(s) passed during travel. Hunger: ${gameState.playerHunger}/24, Thirst: ${gameState.playerThirst}/24`);
        }
        // Update minutesAccumulatedForHourTick if it's being used for partial hours towards hunger/thirst
        // gameState.minutesAccumulatedForHourTick = (gameState.minutesAccumulatedForHourTick || 0) + (totalMinutesToAdd % 60);
        // if (gameState.minutesAccumulatedForHourTick >= 60) { ... do the hourly tick ... }
        // For simplicity, the above just does full hours. Fine-tuning this might be needed.


        gameState.currentTime.minutes += totalMinutesToAdd;

        while (gameState.currentTime.minutes >= 60) {
            gameState.currentTime.hours++;
            gameState.currentTime.minutes -= 60;
        }

        while (gameState.currentTime.hours >= 24) {
            gameState.currentTime.hours -= 24;
            gameState.currentDay = (gameState.currentDay || 1) + 1;
            logToConsole(`A new day (${gameState.currentDay}) has begun.`);
        }

        logToConsole(`Time: New time is ${gameState.currentTime.hours}:${String(gameState.currentTime.minutes).padStart(2, '0')}. Day: ${gameState.currentDay}`);
        window.dispatchEvent(new CustomEvent('timeUpdated', { detail: { ...gameState.currentTime, currentDay: gameState.currentDay } }));

        if (typeof window.updateClockDisplay === 'function') {
            window.updateClockDisplay();
        }
        // Potentially trigger NPC schedule updates if they are sensitive to large time jumps
        if (window.npcScheduler && typeof window.npcScheduler.updateSchedules === 'function') {
            window.npcScheduler.updateSchedules(window.gameState);
        }
    }
};

// For potential ES6 module usage later, though current structure is global.
// export { Time };
