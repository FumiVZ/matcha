import React, { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
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

type Listener = (data: WebSocketMessage) => void;

interface WebSocketContextType {
    sendMessage: (data: any) => void;
    subscribe: (listener: Listener) => () => void;
    isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const ws = useRef<WebSocket | null>(null);
    const pingInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
    const listenersRef = useRef<Set<Listener>>(new Set());
    const [isConnected, setIsConnected] = React.useState(false);

    const sendMessage = useCallback((data: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket is not connected');
        }
    }, []);

    const subscribe = useCallback((listener: Listener) => {
        listenersRef.current.add(listener);
        return () => {
            listenersRef.current.delete(listener);
        };
    }, []);

    const location = useLocation();
    const shouldConnect = location.pathname !== '/auth' && location.pathname !== '/';

    useEffect(() => {
        if (!shouldConnect) {
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const isDev = import.meta.env.DEV;
        
        const wsUrl = isDev 
            ? 'ws://localhost:3000' 
            : `${protocol}//${window.location.host}`;

        const connect = () => {
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('WebSocket Connected');
                setIsConnected(true);
                
                pingInterval.current = setInterval(() => {
                    if (ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 30000);
            };

            ws.current.onmessage = (event) => {
                try {
                    const data: WebSocketMessage = JSON.parse(event.data);
                    
                    // Notify all listeners
                    listenersRef.current.forEach(listener => listener(data));

                    // Global handlers
                    switch (data.type) {
                        case 'welcome':
                            console.log(`WebSocket: Connected as user ${data.userId}`);
                            notify('Connected to notification server', 'info');
                            break;
                        case 'pong':
                            break;
                        case 'message':
                            if (data.from && data.content) {
                                // We could invoke a global notification here
                                // But ideally we check if it was handled by a listener?
                                // For now, we replicate existing behaviour: ALWAYS notify
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
                setIsConnected(false);
                if (pingInterval.current) {
                    clearInterval(pingInterval.current);
                }
                // Optional: Reconnect logic could go here
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket Error:', error);
            };
        };

        connect();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
            if (pingInterval.current) {
                clearInterval(pingInterval.current);
            }
        };
    }, [shouldConnect]);

    return (
        <WebSocketContext.Provider value={{ sendMessage, subscribe, isConnected }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocketContext = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocketContext must be used within a WebSocketProvider');
    }
    return context;
};
