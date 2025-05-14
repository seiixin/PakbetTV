import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';
import SocialLogin from './SocialLogin';
import './Auth.css';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const authContext = useAuth();
  const cart = useCart();
  console.log('Auth context in Login:', authContext);
  console.log('Cart context in Login:', cart);
  
  const { login } = authContext || {};
  const { mergeGuestCartWithUserCart } = cart || {};
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.email || !formData.password) {
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
      toast.success('Login successful! Welcome back!');
      // Only merge carts if the function is available
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
      setError(result.message);
      toast.error(result.message || 'Login failed');
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Sign in to your account</p>
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div style={{ position: 'relative' }}>
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
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '5px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>
        </div>
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
        
        {/* Add Social Login component */}
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