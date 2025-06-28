import React from 'react';
import './ChatButton.css';

const ChatButton = () => {
  const handleChatClick = () => {
    window.open('https://www.facebook.com/pakbettv', '_blank');
  };

  return (
    <div className="chat-button" onClick={handleChatClick}>
      <i className="fab fa-facebook-messenger"></i>
      <span className="chat-tooltip">Chat with us</span>
    </div>
  );
};

export default ChatButton; 