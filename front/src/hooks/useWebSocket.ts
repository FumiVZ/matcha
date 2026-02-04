import { useEffect } from 'react';
import { useWebSocketContext, type WebSocketMessage } from '../contexts/WebSocketContext';

export type { WebSocketMessage };

export function useWebSocket(onMessage?: (data: WebSocketMessage) => void) {
    const { sendMessage, subscribe } = useWebSocketContext();

    useEffect(() => {
        if (onMessage) {
            // subscribe returns the unsubscribe function
            return subscribe(onMessage);
        }
    }, [onMessage, subscribe]);

    return { sendMessage };
}
