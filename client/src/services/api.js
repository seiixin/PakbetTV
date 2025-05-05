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
                            originalRequest.url.includes('/auth/signup');
      
      if (!currentPath.includes('/login') && 
          !currentPath.includes('/signup') && 
          !isAuthEndpoint &&
          !isRedirectingToLogin) {
            
        isRedirectingToLogin = true;
        
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
  getProfile: () => api.get('/auth/me'),
  updateProfile: (userData) => api.put('/users/profile', userData),
  getShippingAddresses: () => api.get('/users/shipping-addresses'),
  addShippingAddress: (addressData) => api.post('/users/shipping-address', addressData),
  updateShippingAddress: (addressId, addressData) => api.put(`/users/shipping-address/${addressId}`, addressData),
  deleteShippingAddress: (addressId) => api.delete(`/users/shipping-address/${addressId}`)
};

export default api; 