const WebSocket = require('ws');
const wsAuth = require('../middlewares/wsAuth');

const clientsByUserId = new Map();

const initNotificationService = (server, sessionStore) => {
	const wss = new WebSocket.Server({ server });

	wss.on('connection', async (ws, req) => {
		console.log('New WebSocket connection');

		const session = await wsAuth(ws, req, sessionStore);
		if (!session) return; // wsAuth closes on failure

		registerClient(ws.userId, ws);
		ws.send(JSON.stringify({ type: 'welcome', userId: ws.userId }));

		ws.on('message', (message) => {
			console.log('Received:', message.toString());
			try {
				const data = JSON.parse(message.toString());

				switch (data.type) {
					case 'ping':
						ws.send(JSON.stringify({ type: 'pong' }));
						break;
					case 'message':
						ws.send(JSON.stringify({ type: 'ack', received: true }));
                        if (data.to && data.content)
                            forwardMessageToUser(ws.userId, data.to, data.content);
						break;
					default:
						ws.send(JSON.stringify({ type: 'error', message: 'Unknown type' }));
						break;
				}
			} catch (error) {
				console.error('Error parsing message:', error);
				ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
			}
		});

		ws.on('close', () => {
			removeClient(ws.userId, ws);
			console.log('WebSocket connection closed');
		});

		ws.on('error', (error) => {
			console.error('WebSocket error:', error);
		});
	});

	return wss;
};

const registerClient = (userId, ws) => {
	const existing = clientsByUserId.get(userId) || new Set();
	existing.add(ws);
	clientsByUserId.set(userId, existing);
};

const removeClient = (userId, ws) => {
	const existing = clientsByUserId.get(userId);
	if (!existing) return;
	existing.delete(ws);
	if (existing.size === 0) {
		clientsByUserId.delete(userId);
	}
};

const sendToUser = (userId, payload) => {
	const targets = clientsByUserId.get(userId);
	if (!targets || targets.size === 0) return false;

	const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
	let sent = false;

	targets.forEach((socket) => {
		if (socket.readyState === WebSocket.OPEN) {
			socket.send(message);
			sent = true;
		}
	});

	return sent;
};

const forwardMessageToUser = (fromUserId, toUserId, content) => {
    const payload = {
        type: 'message',
        from: fromUserId,
        content: content,
        timestamp: Date.now()
    };
    return sendToUser(toUserId, payload);
};

module.exports = { initNotificationService, sendToUser };
