import axios from 'axios';
import API_BASE_URL from '../config'; 

// Create a custom axios instance with base URL set to '' to use the proxy setup in Vite
const api = axios.create({
  baseURL: '', 
  headers: {
    'Content-Type': 'application/json'
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
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Always use /api prefix for requests
    if (!config.url.startsWith('/api')) {
      config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
    }
    
    console.log('[Axios Interceptor] Requesting:', {
      url: config.url,
      method: config.method,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    console.error('[Axios Interceptor] Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('[Axios Interceptor] Response Error:', error.response?.status, error.config?.url);
    
    const originalRequest = error.config;

    // If the error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Check if we should try to get a new token or just logout
      const currentPath = window.location.pathname;
      const isAuthEndpoint = originalRequest.url.includes('/auth/login') || 
                            originalRequest.url.includes('/auth/signup') ||
                            originalRequest.url.includes('/auth/refresh');
      
      if (!currentPath.includes('/login') && 
          !currentPath.includes('/signup') && 
          !isAuthEndpoint &&
          !isRedirectingToLogin &&
          !isRefreshingToken) {
        
        // Try to refresh the token first
        try {
          isRefreshingToken = true;
          const refreshResponse = await authService.refreshToken();
          
          if (refreshResponse && refreshResponse.data && refreshResponse.data.token) {
            const newToken = refreshResponse.data.token;
            localStorage.setItem('token', newToken);
            
            // Update the Authorization header for the original request
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            
            // Process any pending requests with the new token
            pendingRequests.forEach(callback => callback(newToken));
            pendingRequests = [];
            
            // Retry the original request with the new token
            isRefreshingToken = false;
            return api(originalRequest);
          } else {
            throw new Error('Failed to refresh token');
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          
          isRedirectingToLogin = true;
          isRefreshingToken = false;
          
          // Clear stored auth data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Prevent page reloads from causing logout loops
          setTimeout(() => {
            window.location.href = '/login';
            isRedirectingToLogin = false;
          }, 500);
        }
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  signup: (userData) => {
    const url = '/auth/signup'; 
    console.log('[API Service] Attempting POST to:', url);
    return api.post(url, userData); 
  },
  login: (credentials) => api.post('/auth/login', credentials),
  refreshToken: () => {
    // Get the current token
    const token = localStorage.getItem('token');
    if (!token) {
      return Promise.reject(new Error('No token to refresh'));
    }
    // Send refresh token request to backend
    return api.post('/auth/refresh', { token });
  },
  getProfile: () => api.get('/auth/me'),
  updateProfile: (userData) => api.put('/users/profile', userData),
  getShippingAddresses: () => api.get('/users/shipping-addresses'),
  addShippingAddress: (addressData) => api.post('/users/shipping-address', addressData),
  updateShippingAddress: (addressId, addressData) => api.put(`/users/shipping-address/${addressId}`, addressData),
  deleteShippingAddress: (addressId) => api.delete(`/users/shipping-address/${addressId}`)
};

export default api; 