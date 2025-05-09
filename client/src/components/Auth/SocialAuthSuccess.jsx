import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const SocialAuthSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const processToken = async () => {
      // Extract token from URL params
      const queryParams = new URLSearchParams(location.search);
      const token = queryParams.get('token');
      
      if (token) {
        try {
          // Store token in local storage
          localStorage.setItem('token', token);
          
          // Update auth context
          await login(token);
          
          // Redirect to home page or intended destination
          const returnTo = localStorage.getItem('returnTo') || '/';
          localStorage.removeItem('returnTo');
          navigate(returnTo);
        } catch (error) {
          console.error('Error processing social login:', error);
          navigate('/login?error=auth_failed');
        }
      } else {
        // If no token, redirect to login
        navigate('/login?error=no_token');
      }
    };

    processToken();
  }, [location, login, navigate]);

  return (
    <div className="social-auth-success">
      <LoadingSpinner />
      <p>Processing login, please wait...</p>
    </div>
  );
};

export default SocialAuthSuccess; 