const Time = {
    advanceTime: function (gameState) {
        gameState.currentTime.minutes += 2;
        if (gameState.currentTime.minutes >= 60) {
            const hoursToAdd = Math.floor(gameState.currentTime.minutes / 60);
            gameState.currentTime.hours += hoursToAdd;
            gameState.currentTime.minutes %= 60;
            if (gameState.currentTime.hours >= 24) {
                gameState.currentTime.hours %= 24;
            }
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
        const clockString = `╔════╗\n║${formattedTime}║\n╚════╝`;
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
