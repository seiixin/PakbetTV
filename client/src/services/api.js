import axios from 'axios';
import { notify, handleApiError } from '../utils/notifications';
import { getAuthToken, setAuthToken, removeAuthToken, removeUser } from '../utils/cookies';
import API_BASE_URL from '../config';

// Create a custom axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Track if we're currently redirecting to login to prevent multiple redirects
let isRedirectingToLogin = false;
// Track if we're currently refreshing token
let isRefreshingToken = false;
// Store pending requests that wait for token refresh
let pendingRequests = [];

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log the request for debugging
    console.log('[API Request]:', {
      method: config.method,
      url: config.url,
      data: config.data
    });
    
    return config;
  },
  (error) => {
    console.error('[API Request Error]:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration and refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest.url.includes('/auth/');
    const currentPath = window.location.pathname;

    // If we get a 401 and we're not already refreshing the token
    if (error.response?.status === 401 && !isRefreshingToken && !isAuthEndpoint) {
      try {
        isRefreshingToken = true;
        console.log('Token expired, attempting refresh...');
        
        const refreshResponse = await authService.refreshToken();
        
        if (refreshResponse?.data?.token) {
          const newToken = refreshResponse.data.token;
          setAuthToken(newToken);
          
          // Update the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          // Retry all pending requests with new token
          pendingRequests.forEach(cb => cb(newToken));
          pendingRequests = [];
          
          // Retry the original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Clear auth data and redirect to login
        if (!isRedirectingToLogin) {
          isRedirectingToLogin = true;
          removeAuthToken();
          removeUser();
          
          // Only redirect if not on a public route
          const isPublicRoute = currentPath === '/' || 
            currentPath.includes('/login') || 
            currentPath.includes('/signup') || 
            currentPath.includes('/shop') ||
            currentPath.includes('/product/');
          
          if (!isPublicRoute) {
            notify.error('Your session has expired. Please log in again.');
            window.location.href = '/login';
          }
        }
      } finally {
        isRefreshingToken = false;
      }
    }
    
    return Promise.reject(error);
  }
);

export const authService = {
  signup: async (userData) => {
    try {
      const response = await api.post('/api/auth/signup', userData);
      notify.success('Account created successfully! Please log in.');
      return response;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  login: async (credentials) => {
    try {
      const response = await api.post('/api/auth/login', credentials);
      const { token, user } = response.data;
      setAuthToken(token);
      notify.success('Welcome back!');
      return response;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  refreshToken: async () => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No token to refresh');
    }
    return api.post('/api/auth/refresh', { token });
  },
  
  getProfile: async () => {
    try {
      return await api.get('/api/auth/me');
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  updateProfile: async (userData) => {
    try {
      const response = await api.put('/api/users/profile', userData);
      notify.success('Profile updated successfully!');
      return response;
    } catch (error) {
      if (error.response?.data?.message) {
        notify.error(error.response.data.message);
      } else {
        notify.error('Failed to update profile');
      }
      throw error;
    }
  },
  
  getShippingAddresses: async () => {
    try {
      return await api.get('/api/users/shipping-addresses');
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  addShippingAddress: async (addressData) => {
    try {
      const response = await api.post('/api/users/shipping-address', addressData);
      notify.success('Shipping address added successfully!');
      return response;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  updateShippingAddress: async (addressId, addressData) => {
    try {
      const response = await api.put(`/api/users/shipping-address/${addressId}`, addressData);
      notify.success('Shipping address updated successfully!');
      return response;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  deleteShippingAddress: async (addressId) => {
    try {
      const response = await api.delete(`/api/users/shipping-address/${addressId}`);
      notify.success('Shipping address deleted successfully!');
      return response;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  updateUsername: async (username) => {
    try {
      const response = await api.put('/api/users/update-username', { username });
      notify.success('Username updated successfully!');
      return response;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  updatePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/api/users/update-password', {
        currentPassword,
        newPassword
      });
      notify.success('Password updated successfully!');
      return response;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }
};

export default api; 