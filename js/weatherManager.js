// js/weatherManager.js

class WeatherManager {
    constructor(gameState, assetManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.weatherDefinitions = {};
        this.logPrefix = "[WeatherManager]";

        // Ensure gameState.currentWeather is initialized
        if (!this.gameState.currentWeather) {
            this.gameState.currentWeather = {
                type: "clear",
                intensity: 0,
                duration: 0,
                effects: [],
                nextChangeAttempt: 0
            };
            logToConsole(`${this.logPrefix} Initialized gameState.currentWeather as it was missing.`, 'orange');
        }
    }

    async initialize() {
        try {
            this.weatherDefinitions = await this.assetManager.loadData('assets/definitions/weather_types.json');
            if (Object.keys(this.weatherDefinitions).length === 0) {
                logToConsole(`${this.logPrefix} No weather definitions found or loaded.`, 'orange');
            } else {
                logToConsole(`${this.logPrefix} Initialized with ${Object.keys(this.weatherDefinitions).length} weather definitions.`, 'blue');
                // Set initial weather if not already set or if duration is 0
                if (this.gameState.currentWeather.duration <= 0) {
                    this.applyWeather("clear"); // Start with clear weather by default
                }
            }
        } catch (error) {
            logToConsole(`${this.logPrefix} Error loading weather definitions: ${error.message}`, 'red');
            this.weatherDefinitions = {};
        }
    }

    /**
     * Updates the current weather state. Called each game turn.
     */
    updateWeather() {
        if (Object.keys(this.weatherDefinitions).length === 0) return; // Not initialized

        const currentWeatherState = this.gameState.currentWeather;
        currentWeatherState.duration--;

        if (currentWeatherState.duration <= 0) {
            this.transitionToNextWeather();
        }
        // Future: Could add gradual intensity changes or other dynamic updates here.
    }

    /**
     * Transitions to a new weather state based on current weather's transition probabilities.
     */
    transitionToNextWeather() {
        const currentTypeDef = this.weatherDefinitions[this.gameState.currentWeather.type];
        if (!currentTypeDef || !currentTypeDef.transitionTo) {
            logToConsole(`${this.logPrefix} No transition data for current weather '${this.gameState.currentWeather.type}'. Defaulting to 'clear'.`, 'orange');
            this.applyWeather("clear");
            return;
        }

        const transitions = currentTypeDef.transitionTo;
        const rand = Math.random();
        let cumulativeProb = 0;
        let nextWeatherType = "clear"; // Default fallback

        for (const type in transitions) {
            cumulativeProb += transitions[type];
            if (rand <= cumulativeProb) {
                nextWeatherType = type;
                break;
            }
        }
        this.applyWeather(nextWeatherType);
    }

    /**
     * Applies a new weather type to the game state.
     * @param {string} weatherTypeId - The ID of the weather type to apply.
     */
    applyWeather(weatherTypeId) {
        const weatherDef = this.weatherDefinitions[weatherTypeId];
        if (!weatherDef) {
            logToConsole(`${this.logPrefix} Attempted to apply unknown weather type: ${weatherTypeId}. Defaulting to 'clear'.`, 'red');
            this.applyWeather("clear"); // Recursive call with 'clear' if type is unknown
            return;
        }

        const currentW = this.gameState.currentWeather;
        currentW.type = weatherTypeId;

        // Set duration
        if (weatherDef.duration && weatherDef.duration.length === 2) {
            currentW.duration = Math.floor(Math.random() * (weatherDef.duration[1] - weatherDef.duration[0] + 1)) + weatherDef.duration[0];
        } else {
            currentW.duration = 100; // Default duration if not specified
        }

        // Set intensity
        if (weatherDef.defaultIntensity && weatherDef.defaultIntensity.length === 2) {
            currentW.intensity = Math.random() * (weatherDef.defaultIntensity[1] - weatherDef.defaultIntensity[0]) + weatherDef.defaultIntensity[0];
        } else {
            currentW.intensity = (weatherTypeId === "clear") ? 0 : 0.5; // Default intensity
        }
        currentW.intensity = parseFloat(currentW.intensity.toFixed(2)); // Keep it to 2 decimal places

        // Calculate and set effects
        currentW.effects = [];
        if (weatherDef.baseEffects) {
            weatherDef.baseEffects.forEach(effectDef => {
                let value = effectDef.baseValue;
                if (weatherDef.intensityScalesEffects) {
                    value *= currentW.intensity;
                }
                // Round to reasonable precision, e.g., 1 decimal for penalties
                value = Math.round(value * 10) / 10;
                currentW.effects.push({ type: effectDef.type, value: value });
            });
        }

        logToConsole(`${this.logPrefix} Weather changed to: ${weatherDef.name} (Type: ${weatherTypeId}). Intensity: ${currentW.intensity}. Duration: ${currentW.duration} turns. Effects: ${JSON.stringify(currentW.effects)}`, 'teal');

        // Handle ambient sound
        if (window.audioManager) {
            if (currentW.ambientSoundLoop) window.audioManager.stopLoop('weather'); // Stop previous
            if (weatherDef.ambientSoundLoop) {
                window.audioManager.playLoop(weatherDef.ambientSoundLoop, 'weather', { volume: 0.3 * currentW.intensity }); // Scale volume by intensity
            }
        }

        // Trigger visual update
        if (window.mapRenderer) window.mapRenderer.scheduleRender();
    }

    /**
     * Gets the current value of a specific weather effect.
     * @param {string} effectType - The type of effect (e.g., "visibility_penalty").
     * @returns {number} The value of the effect, or 0 if not active.
     */
    getWeatherEffectValue(effectType) {
        if (this.gameState.currentWeather && this.gameState.currentWeather.effects) {
            const effect = this.gameState.currentWeather.effects.find(e => e.type === effectType);
            return effect ? effect.value : 0;
        }
        return 0;
    }
}

// Make it globally accessible (or manage through a central game object)
// window.WeatherManager = WeatherManager;

// Example instantiation (typically in your main game setup script)
// if (!window.weatherManager && window.gameState && window.assetManager) {
//     window.weatherManager = new WeatherManager(window.gameState, window.assetManager);
//     // Initialization (loading definitions) would often be async
//     // window.weatherManager.initialize().then(() => {
//     //     logToConsole("WeatherManager initialized and ready.");
//     // });
// }
