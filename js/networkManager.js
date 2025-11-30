class NetworkManager {
    constructor() {
        this.socket = null;
        this.isHost = false;
        this.isConnected = false;
        this.myClientId = null;
        this.clientEntityMap = new Map(); // clientId -> entityId
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

        // If becoming Host, ensure we have a 'players' list and the main player is in it.
        if (isHost && window.gameState) {
             if (!window.gameState.players) {
                 window.gameState.players = [];
             }
             // Ensure main player is in the list
             if (window.gameState.players.length === 0) {
                 window.gameState.players.push(window.gameState.player);
             }
             // Tag local player with ID if not already?
             if (!window.gameState.player.id) window.gameState.player.id = "host_player";
             window.gameState.player.clientId = "HOST";
        }
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }

    broadcastState() {
        if (!this.isHost || !this.isConnected) return;
        const stateToSend = this.serializeGameState();
        this.send({
            type: 'STATE_UPDATE',
            payload: stateToSend
        });
    }

    sendInput(event) {
        if (this.isHost) return; // Host processes locally

        this.send({
            type: 'INPUT',
            clientId: this.myClientId,
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
                this.myClientId = msg.clientId;
                console.log("Assigned Client ID:", this.myClientId);
                return;
            }

            if (this.isHost) {
                // HOST LOGIC
                if (msg.type === 'PLAYER_JOINED') {
                    this.handlePlayerJoin(msg.clientId);
                } else if (msg.type === 'PLAYER_LEFT') {
                    this.handlePlayerLeft(msg.clientId);
                } else if (msg.type === 'INPUT') {
                    this.processRemoteInput(msg);
                }
            } else {
                // CLIENT LOGIC
                if (msg.type === 'STATE_UPDATE') {
                    this.applyStateUpdate(msg.payload);
                } else if (msg.type === 'ASSIGN_PLAYER') {
                    this.handleAssignPlayer(msg.entityId);
                }
            }

        } catch (e) {
            console.error("Error handling message:", e);
        }
    }

    // --- Host Specific Handlers ---

    handlePlayerJoin(clientId) {
        if (!window.gameState || !window.gameState.player) return;

        console.log(`Host: Player joined ${clientId}`);
        if (window.logToConsole) window.logToConsole(`Player joined! (ID: ${clientId.substr(0,4)})`, "success");

        // Clone the host player as a template for the new player (for now)
        // Ideally, we'd have a default spawn or load a profile.
        const newPlayer = JSON.parse(JSON.stringify(window.gameState.player));

        // Customize new player
        newPlayer.id = `player_${clientId}`;
        newPlayer.name = `Player ${window.gameState.players.length + 1}`;
        newPlayer.clientId = clientId;
        // Reset specific states
        newPlayer.turnEnded = false;

        // Spawn Position: Nearby Host?
        // Simple logic: Find adjacent free tile
        const hostPos = window.gameState.player.mapPos || {x:0,y:0,z:0};
        newPlayer.mapPos = { ...hostPos, x: hostPos.x + 1 }; // Try X+1
        // (A real spawn system would be more robust)

        window.gameState.players.push(newPlayer);
        this.clientEntityMap.set(clientId, newPlayer.id);

        // Notify the client which entity is theirs
        this.send({
            type: 'ASSIGN_PLAYER',
            clientId: clientId, // Server might use this routing later, or we assume broadcast and client filters?
            // Since server broadcasts everything, we can put targetId inside
            targetClientId: clientId,
            entityId: newPlayer.id
        });

        // Broadcast new state immediately
        this.broadcastState();
    }

    handlePlayerLeft(clientId) {
        console.log(`Host: Player left ${clientId}`);
        if (window.logToConsole) window.logToConsole(`Player left (ID: ${clientId.substr(0,4)})`, "warning");

        // Remove player entity? Or turn into NPC?
        // For now, remove to prevent ghosts.
        const entityId = this.clientEntityMap.get(clientId);
        if (entityId) {
            window.gameState.players = window.gameState.players.filter(p => p.id !== entityId);
            this.clientEntityMap.delete(clientId);
            this.broadcastState();
        }
    }

    processRemoteInput(inputMsg) {
        const entityId = this.clientEntityMap.get(inputMsg.clientId);
        const entity = window.gameState.players.find(p => p.id === entityId);

        if (!entity) {
            console.warn(`Host: Received input from unknown entity for client ${inputMsg.clientId}`);
            return;
        }

        console.log(`Host: Processing input for ${entity.name} (${entity.id})`);

        // Mock Event
        const mockEvent = {
            key: inputMsg.key,
            code: inputMsg.code,
            shiftKey: inputMsg.shiftKey,
            ctrlKey: inputMsg.ctrlKey,
            altKey: inputMsg.altKey,
            preventDefault: () => {},
            target: document.body
        };

        // Call global processing logic
        // We need a way to tell the game *who* is acting.
        // We will call processInput(mockEvent, entity) which we will create in script.js
        if (window.processInput) {
            window.processInput(mockEvent, entity);
            this.broadcastState();
        }
    }

    // --- Client Specific Handlers ---

    handleAssignPlayer(entityId) {
        console.log(`Client: Assigned entity ${entityId}`);
        this.myEntityId = entityId;
        if (window.logToConsole) window.logToConsole("You have joined the game!", "success");
    }

    serializeGameState() {
        const state = window.gameState;
        const stateCopy = { ...state };
        if (stateCopy.processedIdempotencyKeys instanceof Set) {
            stateCopy.processedIdempotencyKeys = Array.from(stateCopy.processedIdempotencyKeys);
        }
        return stateCopy;
    }

    applyStateUpdate(newState) {
        if (Array.isArray(newState.processedIdempotencyKeys)) {
            newState.processedIdempotencyKeys = new Set(newState.processedIdempotencyKeys);
        }

        Object.assign(window.gameState, newState);

        // Update local player reference to point to MY assigned entity
        if (this.myEntityId && window.gameState.players) {
            const myEntity = window.gameState.players.find(p => p.id === this.myEntityId);
            if (myEntity) {
                window.gameState.player = myEntity; // Crucial: This makes the UI render MY stats
            }
        }

        // Trigger Renders
        if (window.mapRenderer) window.mapRenderer.scheduleRender();
        if (window.updatePlayerStatusDisplay) window.updatePlayerStatusDisplay();
        if (window.renderCharacterInfo) window.renderCharacterInfo();
        if (window.inventoryManager && window.inventoryManager.updateInventoryUI) window.inventoryManager.updateInventoryUI();
        if (window.turnManager && window.turnManager.updateTurnUI) window.turnManager.updateTurnUI();
    }
}

// Initialize
window.networkManager = new NetworkManager();
