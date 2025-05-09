import axios from 'axios';

// Create a custom axios instance
const api = axios.create({
  baseURL: '/',
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

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log('[API Response]:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  async (error) => {
    console.error('[API Response Error]:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message
    });
    
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
          
          if (refreshResponse?.data?.token) {
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
  signup: (userData) => api.post('/api/auth/signup', userData),
  login: (credentials) => api.post('/api/auth/login', credentials),
  refreshToken: () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return Promise.reject(new Error('No token to refresh'));
    }
    return api.post('/api/auth/refresh', { token });
  },
  getProfile: () => api.get('/api/auth/me'),
  updateProfile: (userData) => {
    console.log('API Service - updateProfile - Sending data:', userData);
    return api.put('/api/users/profile', userData);
  },
  getShippingAddresses: () => api.get('/api/users/shipping-addresses'),
  addShippingAddress: (addressData) => api.post('/api/users/shipping-address', addressData),
  updateShippingAddress: (addressId, addressData) => api.put(`/api/users/shipping-address/${addressId}`, addressData),
  deleteShippingAddress: (addressId) => api.delete(`/api/users/shipping-address/${addressId}`)
};

export default api; 