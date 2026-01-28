import { useState, useEffect, useRef } from 'react';
import './NotificationMenu.css';
//import { useWebSocket } from '../hooks/useWebSocket';

interface Notification {
    id: number;
    type: string;
    message: string;
    created_at: string;
}

export function NotificationMenu() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Initial fetch of notifications
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await fetch('/notifications');
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        
        // Poll every minute to keep updated (alternative to WebSocket)
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Also listen to WebSocket for new notifications to update the list immediately
    /* 
       Note: The existing useWebSocket hook in this project is simple and might not expose an event emitter we can subscribe to easily 
       from here without context or modification. 
       For now, we'll rely on the polling or simple manual refresh when opening the menu.
       If you want real-time updates here, we'd need to modify useWebSocket to export a context or event bus.
    */

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    /*const handleDeleteType = async (type: string) => {
        try {
            const response = await fetch(`/notifications/${type}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                // Refresh list locally
                setNotifications(prev => prev.filter(n => n.type !== type));
            }
        } catch (error) {
            console.error('Failed to delete notifications:', error);
        }
    };*/
    
    // Toggle menu
    const toggleMenu = () => {
        if (!isOpen) {
            fetchNotifications(); // Refresh when opening
        }
        setIsOpen(!isOpen);
    };

    // Format date nicely
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    return (
        <div className="notification-container" ref={menuRef}>
            <div className="notification-bell" onClick={toggleMenu}>
                🔔
                {notifications.length > 0 && (
                    <span className="notification-badge">
                        {notifications.length > 99 ? '99+' : notifications.length}
                    </span>
                )}
            </div>

            {isOpen && (
                <div className="notification-menu">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        {notifications.length > 0 && (
                             <div className="actions">
                                {/* Example: Clear all messages */}
                                {/* In a real app you might want "Clear All" which calls delete for every distinct type or a new 'all' endpoint */}
                             </div>
                        )}
                    </div>
                
                    {loading && notifications.length === 0 ? (
                        <div className="notification-empty">Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className="notification-empty">No new notifications</div>
                    ) : (
                        <ul className="notification-list">
                            {notifications.map((notification) => (
                                <li key={notification.id} className="notification-item">
                                    <div className="notification-content">
                                        <span className={`notification-type-badge type-${notification.type}`}>
                                            {notification.type}
                                        </span>
                                        {notification.message}
                                    </div>
                                    <div className="notification-time">
                                        {formatDate(notification.created_at)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

export default NotificationMenu;
