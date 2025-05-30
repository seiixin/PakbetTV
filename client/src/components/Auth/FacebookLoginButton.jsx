import React, { useEffect } from 'react';
import { handleFacebookLoginStatus, initiateFacebookLogin } from '../../utils/facebookSDK';
import { FaFacebook } from 'react-icons/fa';

const FacebookLoginButton = () => {
  useEffect(() => {
    // Define the callback function in the window scope
    window.checkLoginState = () => {
      window.FB.getLoginStatus((response) => {
        handleFacebookLoginStatus(response);
      });
    };
  }, []);

  const handleFacebookLogin = (e) => {
    e.preventDefault();
    initiateFacebookLogin()
      .catch(error => {
        console.error('Facebook login error:', error);
      });
  };

  return (
    <button 
      className="social-login-button facebook-login"
      onClick={handleFacebookLogin}
    >
      <FaFacebook />
      <span>Continue with Facebook</span>
    </button>
  );
};

export default FacebookLoginButton; 