class NetworkManager {
    constructor() {
        this.socket = null;
        this.isHost = false;
        this.isConnected = false;
        this.lastStateHash = "";
    }

    connect(address) {
        if (this.isConnected) {
            console.log("Already connected.");
            return;
        }

        console.log(`Connecting to ${address}...`);
        try {
            this.socket = new WebSocket(address);

            this.socket.onopen = () => {
                console.log("Connected to server.");
                this.isConnected = true;
                if (window.logToConsole) window.logToConsole("Connected to LAN Multiplayer Server.", "success");

                // Update UI to show connected status
                const btn = document.getElementById('connectButton');
                if (btn) btn.textContent = "Connected";
                if (btn) btn.disabled = true;
            };

            this.socket.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            this.socket.onclose = () => {
                console.log("Disconnected from server.");
                this.isConnected = false;
                if (window.logToConsole) window.logToConsole("Disconnected from LAN Server.", "warning");
                 const btn = document.getElementById('connectButton');
                if (btn) btn.textContent = "Connect to LAN";
                if (btn) btn.disabled = false;
            };

            this.socket.onerror = (error) => {
                console.error("WebSocket Error:", error);
                if (window.logToConsole) window.logToConsole("Connection Error.", "error");
            };

        } catch (e) {
            console.error("Connection failed:", e);
        }
    }

    setHost(isHost) {
        this.isHost = isHost;
        const status = isHost ? "Hosting" : "Client";
        if (window.logToConsole) window.logToConsole(`Multiplayer Mode: ${status}`, "info");
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }

    broadcastState() {
        if (!this.isHost || !this.isConnected) return;

        // Optimize: Don't send if state hasn't changed?
        // For now, let's send.
        // We need to handle Circular Structures. `gameState` has circular refs in `npcs` (e.g. aggroList refs player).
        // script.js uses simple JSON.stringify for saveGame, which implies gameState IS valid JSON.
        // Wait, `processedIdempotencyKeys` is a Set. script.js mentions converting it.

        const stateToSend = this.serializeGameState();

        // Simple hash check to avoid spamming if nothing changed
        // (This is a weak check for large objects but better than nothing)
        // const currentHash = JSON.stringify(stateToSend).length; // Length as proxy for now

        this.send({
            type: 'STATE_UPDATE',
            payload: stateToSend
        });
    }

    sendInput(event) {
        if (this.isHost) return; // Host processes locally

        // We only send specific keys we care about
        this.send({
            type: 'INPUT',
            key: event.key,
            code: event.code,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey
        });
    }

    handleMessage(dataStr) {
        try {
            const msg = JSON.parse(dataStr);

            if (msg.type === 'WELCOME') {
                console.log(msg.message);
                return;
            }

            if (msg.type === 'STATE_UPDATE') {
                if (this.isHost) return; // Host ignores state updates (it is the source of truth)
                this.applyStateUpdate(msg.payload);
            }

            if (msg.type === 'INPUT') {
                if (!this.isHost) return; // Clients ignore inputs from others (Host processes them)
                this.processRemoteInput(msg);
            }

        } catch (e) {
            console.error("Error handling message:", e);
        }
    }

    serializeGameState() {
        // Based on saveGame logic in script.js
        const state = window.gameState;

        // Handle Set conversion
        const stateCopy = { ...state };
        if (stateCopy.processedIdempotencyKeys instanceof Set) {
            stateCopy.processedIdempotencyKeys = Array.from(stateCopy.processedIdempotencyKeys);
        }

        // We might want to exclude some things or include others
        return stateCopy;
    }

    applyStateUpdate(newState) {
        // Restore Set
        if (Array.isArray(newState.processedIdempotencyKeys)) {
            newState.processedIdempotencyKeys = new Set(newState.processedIdempotencyKeys);
        }

        // Apply to window.gameState
        // We use Object.assign to keep the reference to the global object same,
        // but we need to be careful about nested objects.
        // Ideally, we replace the contents.

        // Preserve some local client-only state if necessary (e.g., UI open state?)
        // For Shared Session, we WANT to sync UI state too (like inventory open).

        Object.assign(window.gameState, newState);

        // Trigger Renders
        if (window.mapRenderer) window.mapRenderer.scheduleRender();
        if (window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
        if (window.renderCharacterInfo) window.renderCharacterInfo();
        if (window.inventoryManager && window.inventoryManager.updateInventoryUI) window.inventoryManager.updateInventoryUI();
        if (window.turnManager && window.turnManager.updateTurnUI) window.turnManager.updateTurnUI();
    }

    processRemoteInput(inputMsg) {
        console.log("Processing remote input:", inputMsg.key);

        // We need to simulate the event.
        // script.js `handleKeyDown` expects an Event object.
        const mockEvent = {
            key: inputMsg.key,
            code: inputMsg.code,
            shiftKey: inputMsg.shiftKey,
            ctrlKey: inputMsg.ctrlKey,
            altKey: inputMsg.altKey,
            preventDefault: () => {},
            target: document.body // Target body to ensure it's treated as game input
        };

        // Call the global handleKeyDown
        if (window.handleKeyDown) {
            window.handleKeyDown(mockEvent);
            // After processing input, broadcast new state
            // We defer slightly to allow async ops to start/finish?
            // Most ops in handleKeyDown are synchronous or trigger synchronous state updates.
            // await actions might be tricky.

            // For now, simple broadcast after handler returns.
            this.broadcastState();
        }
    }
}

// Initialize
window.networkManager = new NetworkManager();
