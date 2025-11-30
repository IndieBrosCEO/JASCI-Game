const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const wss = new WebSocket.Server({ port: 8080 });

console.log('JASCI Multiplayer Server started on port 8080');

// Store connected clients: Map<WebSocket, clientId>
const clients = new Map();

wss.on('connection', (ws) => {
    const clientId = uuidv4();
    console.log(`New client connected: ${clientId}`);
    clients.set(ws, clientId);

    // Send a welcome message with the assigned ID
    ws.send(JSON.stringify({ type: 'WELCOME', clientId: clientId, message: 'Connected to JASCI LAN Server' }));

    // Broadcast PLAYER_JOINED to all other clients (primarily for the Host)
    broadcastExcluding(ws, { type: 'PLAYER_JOINED', clientId: clientId });

    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            // Attach sender's clientId to the message for the recipient (Host) to know who sent it
            parsedMessage.senderId = clientId;

            // Broadcast the message to all OTHER clients
            // In a Host-Client model:
            // - Client sends INPUT -> Host receives (needs senderId)
            // - Host sends STATE_UPDATE -> Clients receive
            // - Host sends ASSIGN_PLAYER -> Specific Client receives (we can support targeted messages later if needed, but broadcast is fine for LAN)

            broadcastExcluding(ws, parsedMessage);

        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        clients.delete(ws);
        broadcastExcluding(ws, { type: 'PLAYER_LEFT', clientId: clientId });
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function broadcastExcluding(senderWs, data) {
    const msgString = JSON.stringify(data);
    for (const client of clients.keys()) {
        if (client !== senderWs && client.readyState === WebSocket.OPEN) {
            client.send(msgString);
        }
    }
}
