import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';
import coverImage from '/cover.png';
import './SocialAuthSuccess.css';

const SocialAuthSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const cart = useCart();
  const [processingStatus, setProcessingStatus] = useState('Google Login Successful, redirecting now.');

  useEffect(() => {
    const processToken = async () => {
      try {
        // Extract token from URL params
        const queryParams = new URLSearchParams(location.search);
        const token = queryParams.get('token');
        
        if (!token) {
          console.error('No token found in URL');
          toast.error('Authentication failed: No token received');
          setProcessingStatus('No authentication token received');
          setTimeout(() => {
            navigate('/login?error=no_token');
          }, 1500);
          return;
        }

        // Store token in local storage
        localStorage.setItem('token', token);
        
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
          localStorage.setItem('user', JSON.stringify(userData));
          
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
          
          // Get the return URL from localStorage or default to home
          const returnTo = localStorage.getItem('returnTo') || '/';
          localStorage.removeItem('returnTo'); // Clean up
          
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