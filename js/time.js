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
    }
};

// For potential ES6 module usage later, though current structure is global.
// export { Time };
