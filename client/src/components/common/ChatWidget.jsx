import React, { useState, useRef, useEffect } from 'react';
import './ChatWidget.css';

const SocialLinks = () => (
  <div className="social-links">
    <p>You can also follow us on our social media channels:</p>
    <div className="social-icons">
      <a href="https://www.facebook.com/pakbettv" target="_blank" rel="noopener noreferrer">
        <i className="fab fa-facebook-f"></i> Facebook
      </a>
      <a href="https://www.instagram.com/pakbettv/" target="_blank" rel="noopener noreferrer">
        <i className="fab fa-instagram"></i> Instagram
      </a>
      <a href="https://www.tiktok.com/@pakbettv.com?is_from_webapp=1&sender_device=pc" target="_blank" rel="noopener noreferrer">
        <i className="fab fa-tiktok"></i> TikTok
      </a>
      <a href="https://www.youtube.com/c/PakBetTV" target="_blank" rel="noopener noreferrer">
        <i className="fab fa-youtube"></i> YouTube
      </a>
    </div>
  </div>
);

const ChatWidget = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: "Hello Ka-Pakbet! Ano po ang maipaglilingkod namin sa inyo?", 
      sender: "bot", 
      timestamp: new Date(),
      showSocial: true
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: newMessage,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    // Simulate bot response
    setTimeout(() => {
      const botMessage = {
        id: messages.length + 2,
        text: "Salamat po sa inyong mensahe! Magbabalik ang aming team sa inyo sa lalong madaling panahon.",
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="chat-widget">
      <div className="chat-header">
        <h3>Chat with Us</h3>
        <button onClick={onClose} className="close-button">×</button>
      </div>
      
      <div className="messages-container">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-content">
              {message.text}
              {message.showSocial && <SocialLinks />}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="message-input"
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWidget; 