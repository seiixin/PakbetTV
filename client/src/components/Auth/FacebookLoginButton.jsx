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
      className="social-button facebook"
      onClick={handleFacebookLogin}
      title="Continue with Facebook"
    >
      <FaFacebook size={20} />
    </button>
  );
};

export default FacebookLoginButton; 