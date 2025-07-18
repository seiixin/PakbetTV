import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ChatWidget.css';

const SOCIAL_MEDIA_LINKS = [
  { text: 'Facebook', url: 'https://www.facebook.com/pakbettv', icon: 'fab fa-facebook-f' },
  { text: 'Instagram', url: 'https://www.instagram.com/pakbettv/', icon: 'fab fa-instagram' },
  { text: 'TikTok', url: 'https://www.tiktok.com/@pakbettv.com?is_from_webapp=1&sender_device=pc', icon: 'fab fa-tiktok' },
  { text: 'YouTube', url: 'https://www.youtube.com/c/PakBetTV', icon: 'fab fa-youtube' },
];

const SocialLinks = () => (
  <div className="social-links">
    <p className="social-title">You can also follow us on our social media channels:</p>
    <div className="social-icons">
      {SOCIAL_MEDIA_LINKS.map((item, idx) => (
        <a key={item.text} href={item.url} target="_blank" rel="noopener noreferrer">
          <i className={item.icon}></i> {item.text}
        </a>
      ))}
    </div>
  </div>
);

const QuickOptions = ({ onOptionSelect, type }) => {
  // type: 'main', 'social', 'default'
  if (type === 'social') {
    return (
      <div className="quick-options">
        {SOCIAL_MEDIA_LINKS.map((item) => (
          <a
            key={item.text}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="option-button"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <i className={item.icon}></i> {item.text}
          </a>
        ))}
        <button className="option-button" onClick={() => onOptionSelect('main')}>Back to Main</button>
      </div>
    );
  }
  if (type === 'default') {
    return (
      <div className="quick-options">
        <button className="option-button" onClick={() => onOptionSelect('main')}>Back to Main</button>
      </div>
    );
  }
  // main options
  const options = [
    { text: "Shop Products", value: "Shop Products" },
    { text: "Book Consultation", value: "Book Consultation" },
    { text: "Track Order", value: "Track Order" },
    { text: "Check Horoscope", value: "Check Horoscope" },
    { text: "Contact Support", value: "Contact Support" },
    { text: "Social Media", value: "Social Media" }
  ];
  return (
    <div className="quick-options">
      {options.map((option, index) => (
        <button 
          key={index}
          className="option-button"
          onClick={() => onOptionSelect(option.value)}
        >
          {option.text}
        </button>
      ))}
    </div>
  );
};

// AI Response System
const getAIResponse = (message) => {
  const lowerMessage = message.toLowerCase();
  const responses = {
    order: {
      keywords: ['order', 'track', 'delivery', 'shipping'],
      response: "You can track your order in your Account page under Purchases. Here's the direct link: /account/purchases",
      link: '/account/purchases',
      type: 'main'
    },
    products: {
      keywords: ['products', 'items', 'shop', 'buy'],
      response: "Check out our wide range of products in our shop! Browse by category or view all items.",
      link: '/shop',
      type: 'main'
    },
    payment: {
      keywords: ['payment', 'pay', 'checkout', 'cod', 'cash on delivery'],
      response: "We accept various payment methods including credit cards and cash on delivery (COD). Learn more in our FAQs.",
      link: '/faqs',
      type: 'main'
    },
    consultation: {
      keywords: ['consultation', 'reading', 'fortune', 'feng shui'],
      response: "Book a consultation with Master Hanz Cua for personalized readings and Feng Shui advice.",
      link: '/consultation',
      type: 'main'
    },
    horoscope: {
      keywords: ['horoscope', 'zodiac', 'astrology'],
      response: "Check your daily horoscope and get personalized insights!",
      link: '/horoscope',
      type: 'main'
    },
    bazi: {
      keywords: ['bazi', 'calculator', 'birth chart'],
      response: "Calculate your BaZi chart using our free calculator tool!",
      link: '/bazi-calculator',
      type: 'main'
    },
    contact: {
      keywords: ['contact', 'support', 'help', 'email'],
      response: "Need direct assistance? Visit our Contact page or email us at support@pakbettv.com",
      link: '/contact',
      type: 'main'
    },
    faq: {
      keywords: ['faq', 'question', 'how to'],
      response: "Find answers to common questions in our FAQ section.",
      link: '/faqs',
      type: 'main'
    },
    social: {
      keywords: ['social'],
      response: "Here are our social media channels:",
      link: null,
      type: 'social'
    },
    main: {
      keywords: ['main'],
      response: "Back to main options. Please select an option below or type your question.",
      link: null,
      type: 'main'
    },
    default: {
      response: "Thank you for your message! Here are some helpful links:\n• Shop our products: /shop\n• Book a consultation: /consultation\n• Check your horoscope: /horoscope\n• Contact support: /contact",
      link: null,
      type: 'default'
    }
  };
  for (const [key, info] of Object.entries(responses)) {
    if (info.keywords && info.keywords.some(keyword => lowerMessage.includes(keyword))) {
      return info;
    }
  }
  return responses.default;
};

const ChatWidget = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: "Hello Ka-Pakbet! How can I assist you today? Please select an option below or type your question.", 
      sender: "bot", 
      timestamp: new Date(),
      showOptions: true,
      optionsType: 'main'
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

  const handleOptionSelect = (option) => {
    if (option === 'main') {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: "Back to main options. Please select an option below or type your question.",
        sender: "bot",
        timestamp: new Date(),
        showOptions: true,
        optionsType: 'main'
      }]);
      return;
    }
    if (option === 'social') {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: "Here are our social media channels:",
        sender: "bot",
        timestamp: new Date(),
        showOptions: true,
        optionsType: 'social'
      }]);
      return;
    }
    const userMessage = {
      id: messages.length + 1,
      text: option,
      sender: "user",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    // Get AI response
    const aiResponse = getAIResponse(option);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: aiResponse.response,
        sender: "bot",
        timestamp: new Date(),
        link: aiResponse.link,
        showOptions: true,
        optionsType: aiResponse.type || 'default'
      }]);
    }, 600);
  };

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
    // Get AI response
    const aiResponse = getAIResponse(newMessage);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: aiResponse.response,
        sender: "bot",
        timestamp: new Date(),
        link: aiResponse.link,
        showOptions: true,
        optionsType: aiResponse.type || 'default'
      }]);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="chat-widget">
      <div className="chat-header">
        <h3>Chat with Pakbet</h3>
        <button onClick={onClose} className="close-button" aria-label="Close chat">
          <i className="fas fa-times"></i>
        </button>
      </div>
      <div className="messages-container">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-content">
              {message.text}
              {message.link && (
                <div className="message-link">
                  <Link to={message.link}>Click here to visit</Link>
                </div>
              )}
              {message.showOptions && message.sender === 'bot' && (
                <QuickOptions onOptionSelect={handleOptionSelect} type={message.optionsType} />
              )}
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
          <i className="fas fa-paper-plane"></i>
        </button>
      </form>
    </div>
  );
};

export default ChatWidget; 