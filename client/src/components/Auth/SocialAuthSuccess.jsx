import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';
import { setAuthToken, setUser } from '../../utils/cookies';
import './SocialAuthSuccess.css';

const SocialAuthSuccess = () => {
  const [processingStatus, setProcessingStatus] = useState('Processing authentication...');
  const navigate = useNavigate();
  const location = useLocation();
  const cart = useCart();

  useEffect(() => {
    const processToken = async () => {
      try {
        // Get token from URL params
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        
        if (!token) {
          throw new Error('No token received');
        }
        
        // Store token in cookies
        setAuthToken(token);
        
        // Get the current domain
        const currentDomain = window.location.origin;
        
        // Attempt to fetch user profile with this token
        const response = await fetch(`${currentDomain}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          
          // Show success message
          toast.success('Successfully logged in!');
          
          // Try to merge guest cart if cart context is available
          if (cart && cart.mergeGuestCartWithUserCart) {
            try {
              await cart.mergeGuestCartWithUserCart();
            } catch (cartError) {
              console.error('Error merging carts:', cartError);
            }
          }
          
          // Navigate to home or previous page
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } else {
          throw new Error('Failed to fetch user profile');
        }
      } catch (error) {
        console.error('Error processing social login:', error);
        toast.error('Authentication failed. Please try again.');
        setProcessingStatus('Authentication failed');
        setTimeout(() => {
          navigate('/login?error=auth_failed');
        }, 1500);
      }
    };

    processToken();
  }, [location, navigate, cart]);

  return (
    <div className="social-auth-success-container">
      <div className="social-auth-success-content">
        <div className="spinner"></div>
        <h2>{processingStatus}</h2>
      </div>
    </div>
  );
};

export default SocialAuthSuccess; 