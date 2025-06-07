import { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { getUser, setUser, removeUser, getAuthToken, setAuthToken, removeAuthToken } from '../utils/cookies';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(() => getUser());
  const [token, setTokenState] = useState(() => getAuthToken());
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  // This effect runs once on mount to validate the token
  useEffect(() => {
    const validateToken = async () => {
      const storedToken = getAuthToken();
      
      if (!storedToken) {
        setTokenState(null);
        setUserState(null);
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
          userType: profileData.userType,
          username: profileData.username
        };
        
        setUser(updatedUserData);
        setUserState(updatedUserData);
        setTokenState(storedToken);
      } catch (error) {
        console.error('Token validation failed:', error);
        
        // Handle different types of errors
        if (error.response?.status === 503) {
          // Database temporarily unavailable - don't logout, just continue with stored user data
          console.log('Database temporarily unavailable, continuing with stored user data');
          const storedUser = getUser();
          if (storedUser) {
            setUserState(storedUser);
            setTokenState(storedToken);
          }
        } else if (error.response?.status === 401) {
          // Token is invalid - try to refresh
          try {
            console.log('Attempting to refresh token...');
            setRefreshing(true);
            const refreshResponse = await authService.refreshToken();
            
            if (refreshResponse?.data?.token) {
              const newToken = refreshResponse.data.token;
              setAuthToken(newToken);
              setTokenState(newToken);
              
              // Try to get profile with new token
              const newProfileResponse = await authService.getProfile();
              const newProfileData = newProfileResponse.data;
              
              const refreshedUserData = {
                id: newProfileData.id,
                firstName: newProfileData.firstName,
                lastName: newProfileData.lastName,
                email: newProfileData.email,
                userType: newProfileData.userType,
                username: newProfileData.username
              };
              
              setUser(refreshedUserData);
              setUserState(refreshedUserData);
              console.log('Token refreshed successfully');
            } else {
              throw new Error('Failed to refresh token');
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            handleLogout();
          } finally {
            setRefreshing(false);
          }
        } else {
          // Other errors - fallback to stored user data if available
          const storedUser = getUser();
          if (storedUser && storedToken) {
            console.log('Using stored user data due to network error');
            setUserState(storedUser);
            setTokenState(storedToken);
          } else {
            handleLogout();
          }
        }
      } finally {
        setInitialLoading(false);
      }
    };

    validateToken();
  }, [navigate]);

  const handleLogout = () => {
    removeAuthToken();
    removeUser();
    setUserState(null);
    setTokenState(null);

    // Only navigate to login if not on a public route
    const currentPath = window.location.pathname;
    const isPublicRoute = currentPath === '/' || 
                         currentPath.includes('/login') || 
                         currentPath.includes('/signup') || 
                         currentPath.includes('/shop') ||
                         currentPath.includes('/product/');
    
    if (!isPublicRoute) {
      navigate('/login');
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await authService.login(credentials);
      const { token: newToken, user: userData } = response.data;
      
      setAuthToken(newToken);
      setUser(userData);
      setTokenState(newToken);
      setUserState(userData);
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
    handleLogout();
    toast.success('Logged out successfully');
  };

  // Add this function to check for existing email
  const checkExistingEmail = async (email) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/check-email`, { email });
      return response.data;
    } catch (error) {
      console.error('Error checking email:', error);
      throw error;
    }
  };

  // Update the social login handlers
  const handleGoogleLogin = async (response) => {
    try {
      const { email, name, imageUrl } = response.profileObj;
      
      // Check if email already exists
      const emailCheck = await checkExistingEmail(email);
      
      if (emailCheck.exists) {
        // If email exists, check if it's a Google account
        if (!emailCheck.isGoogleAccount) {
          throw new Error('An account with this email already exists. Please use your regular login.');
        }
      }
      
      const authResponse = await axios.post(`${API_BASE_URL}/api/auth/google`, {
        email,
        name,
        imageUrl,
        googleId: response.googleId
      });
      
      handleLoginSuccess(authResponse.data);
    } catch (error) {
      handleLoginError(error);
    }
  };

  const handleFacebookLogin = async (response) => {
    try {
      const { email, name, picture } = response;
      
      // Check if email already exists
      const emailCheck = await checkExistingEmail(email);
      
      if (emailCheck.exists) {
        // If email exists, check if it's a Facebook account
        if (!emailCheck.isFacebookAccount) {
          throw new Error('An account with this email already exists. Please use your regular login.');
        }
      }
      
      const authResponse = await axios.post(`${API_BASE_URL}/api/auth/facebook`, {
        email,
        name,
        picture: picture.data.url,
        facebookId: response.id
      });
      
      handleLoginSuccess(authResponse.data);
    } catch (error) {
      handleLoginError(error);
    }
  };

  // Add error handling function
  const handleLoginError = (error) => {
    let errorMessage = 'An error occurred during login. Please try again.';
    
    if (error.response) {
      errorMessage = error.response.data.message || errorMessage;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // You can dispatch this error to your notification system
    console.error('Login error:', errorMessage);
    throw new Error(errorMessage);
  };

  const value = {
    user,
    token,
    loading,
    initialLoading,
    refreshing,
    login,
    logout,
    register,
    checkExistingEmail,
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