import { useEffect, useRef, useCallback } from 'react';
import { notify } from '../notifications/notifications';

export type WebSocketMessage = {
    type: 'welcome' | 'ping' | 'pong' | 'ack' | 'error' | 'message' | 'notification' | 'check_online_users' | 'online_status_result';
    userId?: string;
    received?: boolean;
    message?: string;
    from?: string;
    content?: string;
    timestamp?: number;
    userIds?: number[];
    status?: { [key: number]: 'online' | 'offline' };
    to?: string;
};

export function useWebSocket(onMessage?: (data: WebSocketMessage) => void) {
    const ws = useRef<WebSocket | null>(null);
    const pingInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

    const sendMessage = useCallback((data: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket is not connected');
        }
    }, []);

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
                
                if (onMessage) {
                    onMessage(data);
                }

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
    }, [onMessage]);

    return { sendMessage };
}
