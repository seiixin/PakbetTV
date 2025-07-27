import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import API_BASE_URL from '../../config';
import './Auth.css';

function EmailVerification() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('Invalid verification link');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify-email/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (response.ok) {
          if (data.alreadyVerified) {
            setAlreadyVerified(true);
            toast.success('Email already verified! You can log in to your account.');
          } else {
            setVerified(true);
            toast.success('Email verified successfully! You can now log in.');
          }
        } else {
          setError(data.message || 'Verification failed');
          if (data.expired) {
            toast.error('Verification link has expired. Please request a new one.');
          } else {
            toast.error(data.message || 'Verification failed');
          }
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError('Something went wrong. Please try again.');
        toast.error('Verification failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token]);

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  const handleRequestNewLink = () => {
    navigate('/resend-verification');
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-form">
          <div className="auth-header">
            <h2>Verifying Email...</h2>
            <p>Please wait while we verify your email address.</p>
          </div>
          <div className="loading-spinner">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-form">
        <div className="auth-back-button">
          <Link to="/" className="back-to-home-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"></path>
              <polyline points="12,19 5,12 12,5"></polyline>
            </svg>
          </Link>
        </div>

        <div className="auth-header">
          <h2>Email Verification</h2>
        </div>

        {verified && (
          <div className="verification-success">
            <div className="success-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#28a745' }}>
                <polyline points="20,6 9,17 4,12"></polyline>
              </svg>
            </div>
            <h3>Email Verified Successfully!</h3>
            <p>Your email address has been verified. You can now log in to your account and access all features.</p>
            <button 
              className="auth-button" 
              onClick={handleLoginRedirect}
            >
              Go to Login
            </button>
          </div>
        )}

        {alreadyVerified && (
          <div className="verification-success">
            <div className="success-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#17a2b8' }}>
                <polyline points="20,6 9,17 4,12"></polyline>
              </svg>
            </div>
            <h3>Email Already Verified</h3>
            <p>Your email address is already verified. You can log in to your account.</p>
            <button 
              className="auth-button" 
              onClick={handleLoginRedirect}
            >
              Go to Login
            </button>
          </div>
        )}

        {error && (
          <div className="verification-error">
            <div className="error-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#dc3545' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <h3>Verification Failed</h3>
            <p>{error}</p>
            <div className="error-actions">
              <button 
                className="auth-button secondary" 
                onClick={handleRequestNewLink}
              >
                Request New Verification Link
              </button>
              <button 
                className="auth-button" 
                onClick={handleLoginRedirect}
              >
                Go to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailVerification;
