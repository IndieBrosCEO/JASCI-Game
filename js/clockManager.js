class ClockManager {
    constructor(gameState) {
        this.gameState = gameState;
        // Ensure clocks storage exists in gameState
        if (!this.gameState.clocks) {
            this.gameState.clocks = {};
        }
        this.clockDefinitions = {};
    }

    /**
     * Registers a clock definition.
     * @param {string} id - Unique ID for the clock.
     * @param {object} definition - { name: string, maxSegments: number, thresholds: { [segments]: callbackOrEvent } }
     */
    registerClock(id, definition) {
        this.clockDefinitions[id] = definition;
        // Initialize state if not present
        if (!this.gameState.clocks[id]) {
            this.gameState.clocks[id] = {
                current: 0,
                max: definition.maxSegments
            };
        }
    }

    /**
     * Advances a clock by a number of segments.
     * @param {string} id - Clock ID.
     * @param {number} amount - Segments to advance (can be negative).
     */
    advanceClock(id, amount) {
        const state = this.gameState.clocks[id];
        const def = this.clockDefinitions[id];

        if (!state) {
            console.warn(`ClockManager: Clock ${id} not found in state.`);
            return;
        }

        const oldVal = state.current;
        state.current = Math.max(0, Math.min(state.max, state.current + amount));

        console.log(`ClockManager: Clock '${def ? def.name : id}' advanced from ${oldVal} to ${state.current}/${state.max}.`);

        // Check thresholds
        if (def && def.thresholds) {
            for (const [threshVal, action] of Object.entries(def.thresholds)) {
                const t = parseInt(threshVal, 10);
                if (oldVal < t && state.current >= t) {
                    this.triggerClockEvent(id, action, t);
                }
            }
        }

        if (state.current >= state.max && oldVal < state.max) {
             this.triggerClockEvent(id, "completed", state.max);
        }
    }

    triggerClockEvent(clockId, action, threshold) {
        console.log(`ClockManager: Triggering event for clock ${clockId} at threshold ${threshold}. Action:`, action);
        // This could trigger a Game Event, Quest update, or generic callback
        // For now, integrate with existing systems if possible or just log

        if (typeof action === 'string') {
            // "Event:Something" or just "Something"
            if (window.dynamicEventManager) {
                // window.dynamicEventManager.triggerEvent(action); // Hypothetical
            }
        } else if (typeof action === 'function') {
            action();
        }

        if (window.uiManager && window.uiManager.showToastNotification) {
            const def = this.clockDefinitions[clockId];
            window.uiManager.showToastNotification(`Clock Updated: ${def ? def.name : clockId}`, 'info');
        }
    }

    getClock(id) {
        return this.gameState.clocks[id];
    }

    getClockDefinition(id) {
        return this.clockDefinitions[id];
    }
}

// Expose to window
window.ClockManager = ClockManager;
