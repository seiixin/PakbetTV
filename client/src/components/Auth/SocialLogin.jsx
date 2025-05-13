import React from 'react';
import { FaGoogle } from 'react-icons/fa';
import API_BASE_URL from '../../config';
import FacebookLoginButton from './FacebookLoginButton';
import './SocialLogin.css';

const SocialLogin = () => {
  const googleLoginUrl = `${API_BASE_URL}/api/auth/google`;

  return (
    <div className="social-login-container">
      <div className="social-login-divider">
        <span>OR</span>
      </div>
      
      <div className="social-login-buttons">
        <a 
          href={googleLoginUrl}
          className="social-login-button google-login"
        >
          <FaGoogle />
          <span>Continue with Google</span>
        </a>
        
        <FacebookLoginButton />
      </div>
    </div>
  );
};

export default SocialLogin; 