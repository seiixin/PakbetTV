import { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  // This effect runs once on mount to validate the token
  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (!storedToken) {
        setToken(null);
        setUser(null);
        setInitialLoading(false);
        return;
      }

      try {
        // Validate token by making a request to /auth/me
        const response = await authService.getProfile();
        const profileData = response.data;
        
        // Update user data with latest from server
        const updatedUserData = {
          id: profileData.id,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          userType: profileData.userType
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUserData));
        setToken(storedToken);
        setUser(updatedUserData);
      } catch (error) {
        console.error('Token validation failed:', error);
        
        // Check if we should try to refresh the token
        if (error.response?.status === 401) {
          try {
            console.log('Attempting to refresh token...');
            setRefreshing(true);
            const refreshResponse = await authService.refreshToken();
            
            if (refreshResponse && refreshResponse.data && refreshResponse.data.token) {
              const newToken = refreshResponse.data.token;
              localStorage.setItem('token', newToken);
              setToken(newToken);
              
              // Try to get profile with new token
              const newProfileResponse = await authService.getProfile();
              const newProfileData = newProfileResponse.data;
              
              const refreshedUserData = {
                id: newProfileData.id,
                firstName: newProfileData.firstName,
                lastName: newProfileData.lastName,
                email: newProfileData.email,
                userType: newProfileData.userType
              };
              
              localStorage.setItem('user', JSON.stringify(refreshedUserData));
              setUser(refreshedUserData);
              console.log('Token refreshed successfully');
            } else {
              throw new Error('Failed to refresh token');
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Only clear auth data if it's an auth error and refresh failed
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
            
            // Only navigate to login if we're not already there and not in a public route
            const currentPath = window.location.pathname;
            const isPublicRoute = currentPath === '/' || 
                                  currentPath.includes('/login') || 
                                  currentPath.includes('/signup') || 
                                  currentPath.includes('/shop') ||
                                  currentPath.includes('/product/');
            
            if (!isPublicRoute) {
              navigate('/login');
            }
          } finally {
            setRefreshing(false);
          }
        }
      } finally {
        setInitialLoading(false);
      }
    };

    validateToken();
  }, [navigate]);

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await authService.login(credentials);
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
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

  const logout = () => {
    // Immediately clear auth data and redirect
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    toast.success('Logged out successfully');
    navigate('/');
  };

  const value = {
    user,
    token,
    loading,
    initialLoading,
    refreshing,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {initialLoading ? (
        <div className="loading-container">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export default AuthContext; 