const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

console.log('JASCI Multiplayer Server started on port 8080');

// Store connected clients
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);

    // Send a welcome message
    ws.send(JSON.stringify({ type: 'WELCOME', message: 'Connected to JASCI LAN Server' }));

    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            // console.log('Received:', parsedMessage.type);

            // Broadcast the message to all OTHER clients (or all, depending on strategy)
            // For shared state, typically the Host broadcasts State, and Clients broadcast Input.

            // If it's a STATE_UPDATE, broadcast to everyone except sender (Host)
            // If it's an INPUT, broadcast to everyone (Host needs it to execute, other clients might need to know?)
            // Actually, simpler: Broadcast EVERYTHING to EVERYONE ELSE.

            clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(message.toString());
                }
            });
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});
