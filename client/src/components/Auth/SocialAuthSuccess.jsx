import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const SocialAuthSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const cart = useCart();
  const [processingStatus, setProcessingStatus] = useState('Processing login...');

  useEffect(() => {
    const processToken = async () => {
      // Extract token from URL params
      const queryParams = new URLSearchParams(location.search);
      const token = queryParams.get('token');
      
      if (!token) {
        setProcessingStatus('No authentication token received');
        setTimeout(() => {
          navigate('/login?error=no_token');
        }, 1500);
        return;
      }
      
      try {
        // Store token in local storage
        localStorage.setItem('token', token);
        
        // Attempt to fetch user profile with this token
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Try to merge guest cart if cart context is available
          if (cart && cart.mergeGuestCartWithUserCart) {
            try {
              setProcessingStatus('Syncing your cart...');
              setTimeout(() => {
                cart.mergeGuestCartWithUserCart();
              }, 500);
            } catch (cartError) {
              console.error('Error merging carts:', cartError);
            }
          }
          
          // Redirect to intended destination or home
          const returnTo = localStorage.getItem('returnTo') || '/';
          localStorage.removeItem('returnTo');
          
          setProcessingStatus('Login successful! Redirecting...');
          setTimeout(() => {
            navigate(returnTo);
          }, 1000);
        } else {
          throw new Error('Failed to fetch user profile');
        }
      } catch (error) {
        console.error('Error processing social login:', error);
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
      <div className="social-auth-success">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>{processingStatus}</p>
      </div>
    </div>
  );
};

export default SocialAuthSuccess; 