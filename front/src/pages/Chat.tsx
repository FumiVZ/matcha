import React, { useState } from 'react';
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

    const users: User[] = [
        { id: 1, name: 'Alice', avatar: 'https://ui-avatars.com/api/?name=Alice&background=random', status: 'online' },
        { id: 2, name: 'Bob', avatar: 'https://ui-avatars.com/api/?name=Bob&background=random', status: 'offline' },
        { id: 3, name: 'Charlie', avatar: 'https://ui-avatars.com/api/?name=Charlie&background=random', status: 'online' },
    ];

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim()) return;
        
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