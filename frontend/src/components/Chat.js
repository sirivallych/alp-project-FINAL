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

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch chat history
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(
          `${config.apiBaseUrl}/chat/${recipientId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        setMessages(response.data.messages);
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
    const wsUrl = `wss://alp-therapist-main.onrender.com?token=${token}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message' && 
          (data.message.senderId === recipientId || data.message.receiverId === recipientId)) {
        setMessages(prev => [...prev, data.message]);
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
    if (!newMessage.trim()) return;

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

  if (loading) {
    return (
      <div className="chat-container">
        <div className="chat-loading">Loading messages...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-container">
        <div className="chat-error">{error}</div>
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
        {messages.map((message) => (
          <div
            key={message._id}
            className={`message ${message.senderId === localStorage.getItem('userId') ? 'sent' : 'received'}`}
          >
            <div className="message-content">
              {message.content}
            </div>
            <div className="message-time">
              {new Date(message.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
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