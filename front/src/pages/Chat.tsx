import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket, type WebSocketMessage } from '../hooks/useWebSocket';
import '../styles/ChatTemp.css';

interface Message {
  id: number;
  text: string;
  timestamp: Date;
  isSelf: boolean;
}

interface User {
  id: number;
  name: string;
  avatar: string;
  status: 'online' | 'offline';
}

const LiveChat = () => {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messageInput, setMessageInput] = useState('');
    // Placeholder specifically for UI design - in real app this would come from props or context
    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
        if (data.type === 'online_status_result' && data.status) {
            setUsers(prevUsers => prevUsers.map(u => {
                const newStatus = data.status![u.id] || 'offline';
                return u.status !== newStatus ? { ...u, status: newStatus } : u;
            }));
        } else if (data.type === 'message' && data.from && data.content) {
            const senderId = Number(data.from);
            // If the message is from the currently selected user, add it to messages
            if (selectedUser?.id === senderId) {
                const newMessage: Message = {
                    id: Date.now(),
                    text: data.content,
                    timestamp: new Date(),
                    isSelf: false
                };
                setMessages(prev => [...prev, newMessage]);
            } else {
                // Should probably show an indicator on the user in the list
                // For now, we rely on the main notification system
            }
        }
    }, [selectedUser]);

    const { sendMessage } = useWebSocket(handleWebSocketMessage);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/chat/getMatched');
                if (response.ok) {
                    const data = await response.json();
                    const mappedUsers: User[] = data.map((u: any) => ({
                        id: u.matched_user_id,
                        name: u.first_name || u.username,
                        avatar: u.profile_photo 
                            ? `/uploads/photos/${u.profile_photo}` 
                            : `https://ui-avatars.com/api/?name=${u.first_name || u.username}&background=random`,
                        status: 'offline' // Default to offline until checked
                    }));
                    setUsers(mappedUsers);
                }
            } catch (error) {
                console.error("Error fetching matched users:", error);
            }
        };

        fetchUsers();
    }, []);

    useEffect(() => {
        if (users.length > 0) {
            const userIds = users.map(u => u.id);
            // Small delay to ensure WS is connected if it mounts simultaneously
            const timeout = setTimeout(() => {
                 sendMessage({ type: 'check_online_users', userIds });
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [users.length, sendMessage]);

    useEffect(() => {
        const fetchMessages = async () => {
            if (!selectedUser) return;
            try {
                const response = await fetch(`/chat/getMessages/${selectedUser.id}`);
                if (response.ok) {
                    const data = await response.json();
                    const mappedMessages: Message[] = data.map((msg: any) => ({
                        id: new Date(msg.sent_at).getTime(),
                        text: msg.message,
                        timestamp: new Date(msg.sent_at),
                        isSelf: msg.sender_id !== selectedUser.id // If sender isn't the selected user, it must be me (the current user)
                    }));
                    setMessages(mappedMessages);
                }
            } catch (error) {
                console.error("Error fetching messages:", error);
            }
        };

        fetchMessages();
    }, [selectedUser]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedUser) return;
        
        // Send via WebSocket
        sendMessage({
            type: 'message',
            to: selectedUser.id,
            content: messageInput
        });

        // Optimistically add to UI
        const newMessage: Message = {
            id: Date.now(),
            text: messageInput,
            timestamp: new Date(),
            isSelf: true
        };
        
        setMessages([...messages, newMessage]);
        setMessageInput('');
    };

    return (
        <div className="chat-layout">
            <div className="chat-sidebar">
                <div className="sidebar-header">
                   <h3>Conversations</h3>
                </div>
                <div className="users-list">
                    {users.map(user => (
                        <div 
                            key={user.id} 
                            className={`user-item ${selectedUser?.id === user.id ? 'active' : ''}`}
                            onClick={() => setSelectedUser(user)}
                        >
                            <img src={user.avatar} alt={user.name} className="user-avatar" />
                            <div className="user-info">
                                <span className="user-name">{user.name}</span>
                                <span className={`user-status ${user.status}`}></span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="chat-main">
                {selectedUser ? (
                    <>
                        <header className="chat-header">
                            <div className="header-user-details">
                                <img src={selectedUser.avatar} alt={selectedUser.name} className="header-avatar" />
                                <div className="header-info">
                                    <h2>{selectedUser.name}</h2>
                                    <span className="status-text">{selectedUser.status}</span>
                                </div>
                            </div>
                        </header>
                        
                        <div className="messages-container">
                             {messages.map(msg => (
                                 <div key={msg.id} className={`message ${msg.isSelf ? 'self' : 'other'}`}>
                                     <div className="message-bubble">
                                         <p>{msg.text}</p>
                                         <span className="message-time">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                         </span>
                                     </div>
                                 </div>
                             ))}
                        </div>
                        
                        <form className="chat-input-area" onSubmit={handleSendMessage}>
                            <input 
                                type="text" 
                                placeholder="Type a message..." 
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                            />
                            <button type="submit" className="send-btn">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="no-chat-selected">
                        <div className="empty-state-content">
                            <h3>Select a conversation</h3>
                            <p>Choose a user from the sidebar to start chatting</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default LiveChat;