import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import './Auth.css';
function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const authContext = useAuth();
  const { mergeGuestCartWithUserCart } = useCart();
  console.log('Auth context in Login:', authContext);
  const { login } = authContext || {};
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (location.state?.from === '/cart') {
      setError('Please login to checkout');
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
      setLoading(false);
      return;
    }
    if (!login) {
      setError('Authentication service not available');
      setLoading(false);
      return;
    }
    const result = await login(formData);
    if (result.success) {
      setTimeout(() => {
        mergeGuestCartWithUserCart();
      }, 500); 
      const redirectPath = location.state?.from || '/';
      navigate(redirectPath);
    } else {
      setError(result.message);
      setLoading(false);
    }
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
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
            disabled={loading}
          />
        </div>
        <button 
          type="submit" 
          className="auth-button"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
        <div className="auth-redirect">
          Don't have an account?
          <Link to="/signup">Sign Up</Link>
        </div>
      </form>
    </div>
  );
}
export default Login; 