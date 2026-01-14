// middlewares/wsAuth.js
const cookie = require('cookie');
const signature = require('cookie-signature');

module.exports = async (ws, req, sessionStore) => {
    try {
        // Parse cookies from the request
        const cookies = cookie.parse(req.headers.cookie || '');
        
        // Get session cookie name (usually 'connect.sid')
        const sessionCookieName = 'connect.sid';
        let sessionCookie = cookies[sessionCookieName];
        
        if (!sessionCookie) {
            ws.close(4001, 'No session cookie');
            return null;
        }
        
        // Remove 's:' prefix if present (signed cookie)
        if (sessionCookie.startsWith('s:')) {
            sessionCookie = sessionCookie.slice(2);
            const unsigned = signature.unsign(sessionCookie, process.env.SESSION_SECRET);
            if (!unsigned) {
                ws.close(4001, 'Invalid session signature');
                return null;
            }
            sessionCookie = unsigned;
        }
        
        // Get session from store
        return new Promise((resolve, reject) => {
            sessionStore.get(sessionCookie, (err, session) => {
                if (err || !session || !session.userId) {
                    ws.close(4001, 'Invalid or expired session');
                    resolve(null);
                    return;
                }
                
                // Attach user info to WebSocket connection
                ws.userId = session.userId;
                ws.username = session.username;
                console.log(`WebSocket authenticated: User ${session.userId}`);
                resolve(session);
            });
        });
    } catch (error) {
        console.error('WebSocket auth error:', error);
        ws.close(4001, 'Authentication failed');
        return null;
    }
};
