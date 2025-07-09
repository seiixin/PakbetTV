import React, { useState } from 'react';
import './ChatButton.css';
import FacebookChatWidget from './FacebookChatWidget';

const ChatButton = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleChatClick = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <>
      <div className="chat-button" onClick={handleChatClick}>
        <i className={isChatOpen ? 'fas fa-chevron-down' : 'fab fa-facebook-messenger'}></i>
        <span className="chat-tooltip">{isChatOpen ? 'Close chat' : 'Chat with Facebook'}</span>
      </div>
      <FacebookChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
};

export default ChatButton; 