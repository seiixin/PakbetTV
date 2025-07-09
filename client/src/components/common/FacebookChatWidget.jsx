import React, { useEffect, useRef } from 'react';
import './FacebookChatWidget.css';

const FacebookChatWidget = ({ isOpen, onClose }) => {
  const chatRef = useRef(null);

  useEffect(() => {
    // Initialize Facebook Customer Chat Plugin
    const initFacebookChat = () => {
      if (window.FB && window.FB.CustomerChat) {
        window.FB.CustomerChat.show();
        return;
      }

      // Load Facebook SDK if not already loaded
      if (!window.FB) {
        // Add Facebook SDK script
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
        script.crossOrigin = 'anonymous';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        // Initialize when script loads
        script.onload = () => {
          window.fbAsyncInit = function() {
            window.FB.init({
              appId: import.meta.env.VITE_FACEBOOK_APP_ID,
              autoLogAppEvents: true,
              xfbml: true,
              version: 'v18.0'
            });

            // Show customer chat
            if (window.FB.CustomerChat) {
              window.FB.CustomerChat.show();
            }
          };
        };
      } else {
        // FB is already loaded, just show the chat
        if (window.FB.CustomerChat) {
          window.FB.CustomerChat.show();
        }
      }
    };

    if (isOpen) {
      initFacebookChat();
    } else {
      // Hide Facebook Customer Chat when widget is closed
      if (window.FB && window.FB.CustomerChat) {
        window.FB.CustomerChat.hide();
      }
    }

    return () => {
      // Cleanup if needed
      if (!isOpen && window.FB && window.FB.CustomerChat) {
        window.FB.CustomerChat.hide();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="facebook-chat-widget">
      <div className="facebook-chat-header">
        <h3>Chat with Us on Facebook</h3>
        <button onClick={onClose} className="facebook-chat-close-button">×</button>
      </div>
      
      <div className="facebook-chat-container" ref={chatRef}>
        {/* Facebook Customer Chat will be rendered here */}
        <div 
          className="fb-customerchat"
          attribution="setup_tool"
          page_id={import.meta.env.VITE_FACEBOOK_PAGE_ID}
          theme_color="#A2201A"
          logged_in_greeting="Hello Ka-Pakbet! Ano po ang maipaglilingkod namin sa inyo?"
          logged_out_greeting="Hello Ka-Pakbet! Please log in to Facebook to start chatting with us!"
          greeting_dialog_display="fade"
          greeting_dialog_delay="0"
        >
        </div>
        
        <div className="facebook-chat-fallback">
          <p>Loading Facebook chat...</p>
          <p>If the chat doesn't load, you can also reach us at:</p>
          <div className="social-links">
            <a href="https://www.facebook.com/pakbettv" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-facebook-f"></i> Visit our Facebook Page
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacebookChatWidget; 