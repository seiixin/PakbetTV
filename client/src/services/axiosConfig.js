import axios from 'axios';
import { getAuthToken, removeAuthToken, removeUser } from '../utils/cookies';
import API_BASE_URL from '../config';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL + '/api'  // Use the full API URL
});

// Add request interceptor to automatically add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    
    // Log request details (remove in production)
    console.log(`API ${config.method.toUpperCase()} Request:`, config.url);
    
    if (token) {
      // Use Bearer token authentication header
      config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.log('No token found in cookies');
    }
    
    config.headers['Accept'] = 'application/json';
    config.headers['Content-Type'] = 'application/json';
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration and parse response
api.interceptors.response.use(
  (response) => {
    // Log successful response (remove in production)
    console.log(`API Response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.message);
    
    // Handle network errors (like ECONNRESET)
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || 
        (error.message && error.message.includes('Network Error'))) {
      console.error('Network error detected:', error.code || error.message);
      // Don't redirect on network errors, just return the error
      return Promise.reject({
        ...error,
        isNetworkError: true,
        message: 'Network connection error. Please check your internet connection.'
      });
    }
    
    if (error.response) {
      console.log('Error Response Status:', error.response.status);
      console.log('Error Response Data:', error.response.data);
      
      if (error.response.status === 401) {
        // Token expired or invalid
        console.log('Authentication error: Token expired or invalid');
        
        // Attempt to redirect to login page if not already there
        if (window.location.pathname !== '/login') {
          console.log('Redirecting to login page...');
          removeAuthToken();
          removeUser();
          window.location.href = '/login';
        }
      }
      
      // Handle server errors (500)
      if (error.response.status >= 500) {
        console.error('Server error detected:', error.response.status);
        // Don't redirect, just return the error with a flag
        return Promise.reject({
          ...error,
          isServerError: true,
          message: 'Server error. Please try again later.'
        });
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received from server', error.request);
    }
    
    return Promise.reject(error);
  }
);

export default api; 