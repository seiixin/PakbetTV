import React from 'react';
import { FaGoogle } from 'react-icons/fa';
import { setCookie } from '../../utils/cookies';
import './SocialLogin.css';

const SocialLogin = () => {
  // Get the current domain for the callback
  const currentDomain = window.location.origin;
  
  // Construct the Google login URL with the correct callback URL
  const googleLoginUrl = `${currentDomain}/api/auth/google`;

  // Store the return URL in cookies before redirecting
  const handleGoogleLogin = (e) => {
    // Store current path or intended destination
    const returnTo = window.location.pathname === '/login' ? '/' : window.location.pathname;
    setCookie('returnTo', returnTo);
  };

  return (
    <div className="social-login">
      <div className="social-buttons">
        <a 
          href={googleLoginUrl}
          className="social-button google"
          onClick={handleGoogleLogin}
          title="Continue with Google"
        >
          <FaGoogle size={20} />
        </a>
        {/* Facebook button temporarily disabled */}
        {/* <FacebookLoginButton /> */}
      </div>
    </div>
  );
};

export default SocialLogin;