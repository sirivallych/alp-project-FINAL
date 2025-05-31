import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import config from '../config';
import '../styles/Chat.css';

function Chat({ recipientId, recipientName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('token');

  // Add validation for recipientId
  useEffect(() => {
    if (!recipientId) {
      setError('Invalid recipient ID');
      setLoading(false);
      return;
    }
  }, [recipientId]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch chat history
  useEffect(() => {
    // Don't fetch if recipientId is invalid
    if (!recipientId || !token) {
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${config.apiBaseUrl}/chat/${recipientId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        setMessages(response.data.messages || []);
        setError(null); // Clear any previous errors
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError(err.response?.data?.message || 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [recipientId, token]);

  // WebSocket connection
  useEffect(() => {
    // Don't connect if recipientId or token is invalid
    if (!recipientId || !token) {
      return;
    }

    const wsUrl = `wss://alp-therapist-main.onrender.com?token=${token}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message' && 
            (data.message.senderId === recipientId || data.message.receiverId === recipientId)) {
          setMessages(prev => [...prev, data.message]);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [recipientId, token]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !recipientId || !token) return;

    try {
      const response = await axios.post(
        `${config.apiBaseUrl}/chat/${recipientId}`,
        { content: newMessage },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setMessages(prev => [...prev, response.data.message]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.message || 'Failed to send message');
    }
  };

  // Show error if no recipientId
  if (!recipientId) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <h3>Chat Error</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="chat-error">No recipient selected for chat</div>
      </div>
    );
  }

  // Show error if no token
  if (!token) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <h3>Chat Error</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="chat-error">Please log in to access chat</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <h3>Chat with {recipientName || 'Loading...'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="chat-loading">Loading messages...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <h3>Chat with {recipientName}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="chat-error">
          {error}
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginLeft: '10px', padding: '5px 10px' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Chat with {recipientName}</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((message) => {
            const currentUserId = localStorage.getItem('userId');
            const isSentByCurrentUser = currentUserId && message.senderId && 
              message.senderId.toString() === currentUserId.toString();
  
            return (
              <div
                key={message._id}
                className={`message ${isSentByCurrentUser ? 'sent' : 'received'}`}
              >
                <div className="message-content">
                  {message.content}
                </div>
                <div className="message-time">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="message-input"
        />
        <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default Chat;