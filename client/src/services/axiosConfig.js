import axios from 'axios';
import { getAuthToken, removeAuthToken, removeUser } from '../utils/cookies';
import logger from '../utils/logger';
import API_BASE_URL from '../config';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL + '/api'  // Use the full API URL
});

// Add request interceptor to automatically add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    
    // Log request details (only in development)
    logger.dev.log(`API ${config.method.toUpperCase()} Request:`, config.url);
    
    if (token) {
      // Use Bearer token authentication header
      config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      logger.dev.log('No token found in cookies');
    }
    
    config.headers['Accept'] = 'application/json';
    config.headers['Content-Type'] = 'application/json';
    
    return config;
  },
  (error) => {
    logger.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration and parse response
api.interceptors.response.use(
  (response) => {
    // Log successful response (only in development)
    logger.dev.log(`API Response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    logger.error('API Response Error:', error.message);
    
    // Handle network errors (like ECONNRESET)
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || 
        (error.message && error.message.includes('Network Error'))) {
      logger.error('Network error detected:', error.code || error.message);
      // Don't redirect on network errors, just return the error
      return Promise.reject({
        ...error,
        isNetworkError: true,
        message: 'Network connection error. Please check your internet connection.'
      });
    }
    
    if (error.response) {
      logger.dev.log('Error Response Status:', error.response.status);
      logger.dev.log('Error Response Data:', error.response.data);
      
      if (error.response.status === 401) {
        // Token expired or invalid
        logger.dev.log('Authentication error: Token expired or invalid');
        
        // Attempt to redirect to login page if not already there
        if (window.location.pathname !== '/login') {
          logger.dev.log('Redirecting to login page...');
          removeAuthToken();
          removeUser();
          window.location.href = '/login';
        }
      }
      
      // Handle server errors (500)
      if (error.response.status >= 500) {
        logger.error('Server error detected:', error.response.status);
        // Don't redirect, just return the error with a flag
        return Promise.reject({
          ...error,
          isServerError: true,
          message: 'Server error. Please try again later.'
        });
      }
    } else if (error.request) {
      // Request was made but no response received
      logger.error('No response received from server', error.request);
    }
    
    return Promise.reject(error);
  }
);

export default api; 