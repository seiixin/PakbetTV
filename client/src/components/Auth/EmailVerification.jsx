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
          <div className="auth-back-button">
            <Link to="/" className="back-to-home-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5"></path>
                <polyline points="12,19 5,12 12,5"></polyline>
              </svg>
              Back to Home
            </Link>
          </div>

          <div className="verification-loading-state">
            <div className="verification-icon-container">
              <div className="verification-pulse-animation">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12a8 8 0 0 1 8-8V2.5"/>
                  <circle cx="12" cy="12" r="8" opacity="0.3"/>
                </svg>
              </div>
            </div>
            <div className="verification-content">
              <h2>Verifying Your Email</h2>
              <p>Please wait while we verify your email address. This will only take a moment.</p>
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
            Back to Home
          </Link>
        </div>

        {verified && (
          <div className="verification-result-container">
            <div className="verification-icon-container success">
              <div className="verification-icon-bg">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
              </div>
            </div>
            <div className="verification-content">
              <h2>Email Verified Successfully!</h2>
              <p>Your email address has been verified. You can now log in to your account and access all features.</p>
            </div>
            <div className="verification-actions">
              <button className="auth-button" onClick={handleLoginRedirect}>
                Continue to Login
              </button>
            </div>
          </div>
        )}

        {alreadyVerified && (
          <div className="verification-result-container">
            <div className="verification-icon-container already-verified">
              <div className="verification-icon-bg">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/>
                  <circle cx="12" cy="12" r="9"/>
                </svg>
              </div>
            </div>
            <div className="verification-content">
              <h2>Email Already Verified</h2>
              <p>Your email address is already verified. You can log in to your account.</p>
            </div>
            <div className="verification-actions">
              <button className="auth-button" onClick={handleLoginRedirect}>
                Go to Login
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="verification-result-container">
            <div className="verification-icon-container error">
              <div className="verification-icon-bg">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
            </div>
            <div className="verification-content">
              <h2>Verification Failed</h2>
              <p>{error}</p>
            </div>
            <div className="verification-actions">
              <button className="auth-button secondary" onClick={handleRequestNewLink}>
                Request New Verification Link
              </button>
              <button className="auth-button" onClick={handleLoginRedirect}>
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
