import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import API_BASE_URL from '../../config';
import './Auth.css';

function ResendVerification() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setSent(true);
        toast.success(data.message || 'Verification email sent! Please check your inbox.');
      } else {
        if (response.status === 429) {
          toast.error(data.message, { autoClose: 8000 });
        } else {
          toast.error(data.message || 'Failed to send verification email');
        }
      }
    } catch (err) {
      console.error('Resend verification error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
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
            <h2>Verification Email Sent</h2>
          </div>

          <div className="verification-success">
            <div className="success-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#28a745' }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <h3>Check Your Email</h3>
            <p>We've sent a new verification email to <strong>{email}</strong></p>
            <p>Please check your inbox and click the verification link to activate your account.</p>
            
            <div className="auth-redirect">
              <Link to="/login">Back to Login</Link>
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
          <h2>Resend Verification Email</h2>
          <p>Enter your email address and we'll send you a new verification link</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address*</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Verification Email'}
          </button>
        </form>

        <div className="auth-redirect">
          Already verified? <Link to="/login">Log In</Link>
        </div>
      </div>
    </div>
  );
}

export default ResendVerification;
