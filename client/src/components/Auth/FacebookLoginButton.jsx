import React, { useEffect } from 'react';
import { handleFacebookLoginStatus } from '../../utils/facebookSDK';

const FacebookLoginButton = () => {
  useEffect(() => {
    // Define the callback function in the window scope
    window.checkLoginState = () => {
      window.FB.getLoginStatus((response) => {
        handleFacebookLoginStatus(response);
      });
    };
  }, []);

  return (
    <div className="facebook-login-button-container">
      <fb:login-button 
        scope="public_profile,email"
        onlogin="checkLoginState();"
        size="large"
        data-use-continue-as="true"
      >
      </fb:login-button>
    </div>
  );
};

export default FacebookLoginButton; 