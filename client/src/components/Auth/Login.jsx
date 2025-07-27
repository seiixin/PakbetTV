import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';
import SocialLogin from './SocialLogin';
import API_BASE_URL from '../../config';
import './Auth.css';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, mergeGuestCartWithUserCart } = useAuth();
  const cart = useCart();
  console.log('Auth context in Login:', login);
  console.log('Cart context in Login:', cart);
  
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (location.state?.from === '/cart') {
      setError('Please login to checkout');
    }
    
    // Check for error params in URL (for social auth failures)
    const queryParams = new URLSearchParams(location.search);
    const errorParam = queryParams.get('error');
    if (errorParam === 'auth_failed') {
      setError('Social authentication failed. Please try again.');
    } else if (errorParam === 'no_token') {
      setError('No authentication token received. Please try again.');
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear verification state when user starts typing again
    if (needsVerification) {
      setNeedsVerification(false);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.emailOrUsername || !formData.password) {
      setError('Please fill in all fields');
      toast.error('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (!login) {
      setError('Authentication service not available');
      toast.error('Authentication service not available');
      setLoading(false);
      return;
    }

    const result = await login(formData);
    if (result.success) {
      if (mergeGuestCartWithUserCart) {
        try {
          setTimeout(() => {
            mergeGuestCartWithUserCart();
          }, 500);
        } catch (err) {
          console.error('Error merging carts:', err);
        }
      }
      
      const redirectPath = location.state?.from || '/';
      navigate(redirectPath);
    } else {
      if (result.needsVerification) {
        // Show verification required state in the form
        setNeedsVerification(true);
        setUserEmail(result.email || formData.emailOrUsername);
        setError(result.message);
        toast.error(result.message);
      } else {
        setNeedsVerification(false);
        setError(result.message);
        toast.error(result.message || 'Login failed');
      }
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleResendVerification = async () => {
    if (!userEmail) {
      toast.error('Email address not found');
      return;
    }

    setResendLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: userEmail })
      });

      const data = await response.json();

      if (response.ok) {
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
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-back-button">
          <Link to="/" className="back-to-home-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"></path>
              <polyline points="12,19 5,12 12,5"></polyline>
            </svg>
          </Link>
        </div>
        
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Sign in to your account</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="emailOrUsername">Email or Username</label>
          <input
            type="text"
            id="emailOrUsername"
            name="emailOrUsername"
            value={formData.emailOrUsername}
            onChange={handleChange}
            placeholder="Enter your email or username"
            required
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input-container">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="password-toggle-btn"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {needsVerification && (
          <div className="verification-notice">
            <p>Your account needs email verification to continue.</p>
            <button
              type="button"
              onClick={handleResendVerification}
              className="resend-verification-btn"
              disabled={resendLoading}
            >
              {resendLoading ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </div>
        )}
        
        <div className="auth-links">
          <Link to="/forgot-password" className="forgot-password-link">Forgot Password?</Link>
        </div>
        
        <button 
          type="submit" 
          className="auth-button"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
        
        <SocialLogin />
        
        <div className="auth-redirect">
          Don't have an account?
          <Link to="/signup">Sign Up</Link>
        </div>
      </form>
    </div>
  );
}

export default Login; 