import { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  // Initialize user state from localStorage on app load
  useEffect(() => {
    const checkUserAuth = () => {
      const storedToken = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (storedToken && userData) {
        setToken(storedToken);
        setUser(JSON.parse(userData));
      } else {
        setToken(null);
        setUser(null);
      }
      
      setLoading(false);
    };
    
    checkUserAuth();
  }, []);

  // Login function
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await authService.login(credentials);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      setToken(response.data.token);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authService.signup(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout function with refresh animation
  const logout = () => {
    setLoggingOut(true); // Start logout animation
    
    // Wait for 2 seconds before completing logout
    setTimeout(() => {
      // Note: We don't remove cart data here, as it's handled by CartContext
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
      setLoggingOut(false);
      navigate('/');
    }, 2000);
  };

  const value = {
    user,
    token,
    loading,
    loggingOut,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 