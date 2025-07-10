import React, { useState } from 'react';
import './ChatButton.css';
import ChatWidget from './ChatWidget';

const ChatButton = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleChatClick = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <>
      <div className="chat-button" onClick={handleChatClick}>
        <i className={isChatOpen ? 'fas fa-chevron-down' : 'fab fa-facebook-messenger'}></i>
        <span className="chat-tooltip">{isChatOpen ? 'Close chat' : 'Chat with us'}</span>
      </div>
      <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
};

export default ChatButton; 