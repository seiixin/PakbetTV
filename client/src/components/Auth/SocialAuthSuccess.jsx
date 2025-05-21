import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';
import { setAuthToken, setUser } from '../../utils/cookies';
import coverImage from '/cover.png';
import './SocialAuthSuccess.css';

const SocialAuthSuccess = () => {
  const [processingStatus, setProcessingStatus] = useState('Processing authentication...');
  const [authLoading, setAuthLoading] = useState(true);
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
          
          // Get the return URL from cookies or default to home
          const returnTo = getCookie('returnTo') || '/';
          removeCookie('returnTo'); // Clean up
          
          setTimeout(() => {
            navigate(returnTo);
          }, 2000);
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

    if (!authLoading) {
      processToken();
    }
  }, [location, navigate, cart, authLoading]);

  return (
    <div className="social-auth-success">
      <div className="processing-status">
        <h2>{processingStatus}</h2>
      </div>
    </div>
  );
};

export default SocialAuthSuccess; 