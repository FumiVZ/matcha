import { useEffect, useRef } from 'react';
import { notify } from '../notifications/notifications';

type WebSocketMessage = {
    type: 'welcome' | 'ping' | 'pong' | 'ack' | 'error' | 'message' | 'notification';
    userId?: string;
    received?: boolean;
    message?: string;
    from?: string;
    content?: string;
    timestamp?: number;
};

export function useWebSocket() {
    const ws = useRef<WebSocket | null>(null);
    const pingInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Connect to WebSocket server
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const isDev = import.meta.env.DEV;
        
        // In dev, we might need to point to 3000 explicitly if proxy isn't handling upgrade
        const wsUrl = isDev 
            ? 'ws://localhost:3000' 
            : `${protocol}//${window.location.host}`;

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('WebSocket Connected');
            
            // Setup ping interval to keep connection alive
            pingInterval.current = setInterval(() => {
                if (ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({ type: 'ping' }));
                }
            }, 30000);
        };

        ws.current.onmessage = (event) => {
            try {
                const data: WebSocketMessage = JSON.parse(event.data);
                
                switch (data.type) {
                    case 'welcome':
                        console.log(`WebSocket: Connected as user ${data.userId}`);
                        notify('Connected to notification server', 'info');
                        break;
                    case 'pong':
                        // Alive
                        break;
                    case 'message':
                        if (data.from && data.content) {
                            notify(data.content, 'message', `Message from ${data.from}`);
                        }
                        break;
                    case 'notification':
                        if (data.content) {
                             notify(data.content, 'info', 'Notification');
                        }
                        break;
                    case 'error':
                        console.error('WebSocket error message:', data.message);
                        break;
                }
            } catch (error) {
                console.error('Error parsing WebSocket message', error);
            }
        };

        ws.current.onclose = () => {
            console.log('WebSocket Disconnected');
            if (pingInterval.current) {
                clearInterval(pingInterval.current);
            }
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };

        return () => {
            if (ws.current) {
                ws.current.close();
            }
            if (pingInterval.current) {
                clearInterval(pingInterval.current);
            }
        };
    }, []);

    const sendMessage = (to: string, content: string) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'message',
                to,
                content
            }));
        } else {
            console.warn('WebSocket is not connected');
            notify('Connection lost. Please refresh.', 'error');
        }
    };

    const sendTestNotification = () => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'test_notification'
            }));
        }
    };

    // Expose this for testing purposes, e.g. attach to window or return from hook
    // For now, let's just trigger it once on mount after a short delay for demonstration if needed,
    // or better, return it so a component can use it.
    // To strictly follow "send some test notifications from the server", 
    // I will trigger it automatically once connected for this demo.
    
    useEffect(() => {
        const timer = setTimeout(() => {
            if (ws.current?.readyState === WebSocket.OPEN) {
                console.log('Requesting test notification...');
                sendTestNotification();
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    return { sendMessage, sendTestNotification };
}
